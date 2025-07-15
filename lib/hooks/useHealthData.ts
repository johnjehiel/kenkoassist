import {
  initialize,
  requestPermission,
  readRecords,
} from 'react-native-health-connect';
import { Permission, RecordType } from 'react-native-health-connect/lib/typescript/types';
import { TimeRangeFilter } from 'react-native-health-connect/lib/typescript/types/base.types';
import { useEffect, useState, useRef, useCallback } from 'react';
import { Platform } from 'react-native';
import { Logger } from '@lib/state/Logger';

// Define metrics to read and their extractors
// const METRICS: {
//   type: RecordType;
//   extract: (record: any) => number;
//   key: string;
//   operation?: 'sum' | 'average';
// }[] = [
//   { type: 'Steps', extract: r => r.count ?? 0, key: 'steps', operation: 'sum' },
//   { type: 'Distance', extract: r => r.distance?.inMeters ?? 0, key: 'distance', operation: 'sum' },
//   { type: 'TotalCaloriesBurned', extract: r => r.energy?.inKilocalories ?? 0, key: 'totalCalories' , operation: 'sum' },
//   { type: 'HeartRate', extract: r => r.beatsPerMinute ?? 0, key: 'heartRate', operation: 'average' },
//   { type: 'Weight', extract: r => r.weight?.inKilograms ?? 0, key: 'weight', operation: 'average' },
//   { type: 'Height', extract: r => r.height?.inMeters ?? 0, key: 'height', operation: 'average' },
//   { type: 'Hydration', extract: r => r.volume?.inLiters ?? 0, key: 'hydration', operation: 'sum' },
//   { type: 'BloodPressure', extract: r => r.systolic?.inMillimetersOfMercury ?? 0, key: 'bloodPressureSystolic', operation: 'average' },
//   { type: 'BloodPressure', extract: r => r.diastolic?.inMillimetersOfMercury ?? 0, key: 'bloodPressureDiastolic', operation: 'average' },
//   { type: 'BodyTemperature', extract: r => r.temperature?.inCelsius ?? 0, key: 'bodyTemperature', operation: 'average' },
//   { type: 'BasalMetabolicRate', extract: r => r.basalMetabolicRate?.inKilocaloriesPerDay ?? 0, key: 'basalMetabolicRate', operation: 'average' },
// ];


const METRICS: {
  type: RecordType;
  // The 'any' type is used here for flexibility as different records have different structures.
  extract: (record: any) => number;
  key: string;
  operation?: 'sum' | 'average';
}[] = [
  // Already existing and correct
  { type: 'Steps', extract: r => r.count ?? 0, key: 'steps', operation: 'sum' },
  { type: 'Distance', extract: r => r.distance?.inMeters ?? 0, key: 'distance', operation: 'sum' },
  { type: 'Weight', extract: r => r.weight?.inKilograms ?? 0, key: 'weight', operation: 'average' },
  { type: 'Height', extract: r => r.height?.inMeters ?? 0, key: 'height', operation: 'average' },
  { type: 'Hydration', extract: r => r.volume?.inLiters ?? 0, key: 'hydration', operation: 'sum' },
  { type: 'BodyTemperature', extract: r => r.temperature?.inCelsius ?? 0, key: 'bodyTemperature', operation: 'average' },

  // Correctly defined for Systolic and Diastolic from the same record type
  { type: 'BloodPressure', extract: r => r.systolic?.inMillimetersOfMercury ?? 0, key: 'bloodPressureSystolic', operation: 'average' },
  { type: 'BloodPressure', extract: r => r.diastolic?.inMillimetersOfMercury ?? 0, key: 'bloodPressureDiastolic', operation: 'average' },

  // --- New and Updated Definitions ---

  // Cardiovascular Health
  { type: 'HeartRate', extract: r => r.samples[0]?.beatsPerMinute ?? 0, key: 'heartRate', operation: 'average' },
  { type: 'RestingHeartRate', extract: r => r.beatsPerMinute ?? 0, key: 'restingHeartRate', operation: 'average' },
  { type: 'HeartRateVariabilityRmssd', extract: r => r.interbeatInterval?.inMilliseconds ?? 0, key: 'heartRateVariability', operation: 'average' },

  // Physical Activity
  // { type: 'ActiveCaloriesBurned', extract: r => r.energy?.inKilocalories ?? 0, key: 'activeCalories', operation: 'sum' },
  { type: 'TotalCaloriesBurned', extract: r => r.energy?.inKilocalories ?? 0, key: 'totalCalories' , operation: 'sum' },


  // Metabolic & Vital Signs
  { type: 'BasalBodyTemperature', extract: r => r.temperature?.inCelsius ?? 0, key: 'basalBodyTemperature', operation: 'average' },
  { type: 'BloodGlucose', extract: r => r.level?.inMilligramsPerDeciliter ?? 0, key: 'bloodGlucose', operation: 'average' },

  // Respiratory Fitness
  { type: 'RespiratoryRate', extract: r => r.rate ?? 0, key: 'respiratoryRate', operation: 'average' },
  { type: 'OxygenSaturation', extract: r => r.percentage ?? 0, key: 'oxygenSaturation', operation: 'average' },

  // Sleep & Recovery
  {
    type: 'SleepSession',
    // Calculates the duration of the sleep session in hours
    extract: r => {
      const start = new Date(r.startTime);
      const end = new Date(r.endTime);
      const durationInMillis = end.getTime() - start.getTime();
      return durationInMillis / (1000 * 60 * 60); // Convert milliseconds to hours
    },
    key: 'sleepSessions',
    operation: 'sum', // Summing the duration of all sleep sessions for the day
  },
];

// Interface for daily health data structure
interface DailyHealthData {
  [date: string]: Record<string, number | null>;
}

// Legacy type for compatibility
type HealthData = Record<string, number | null>;

interface FetchState {
  isInitializing: boolean;
  isFetching: boolean;
  lastFetchAttempt: number;
}

export default function useHealthData() {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [dailyData, setDailyData] = useState<DailyHealthData>({});
  const [aggregatedData, setAggregatedData] = useState<HealthData>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [error, setError] = useState<string | null>(null);
  
  const isMountedRef = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);
  const fetchStateRef = useRef<FetchState>({
    isInitializing: false,
    isFetching: false,
    lastFetchAttempt: 0
  });

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      isMountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Get unique record types (since BloodPressure is used twice)
  const getUniqueRecordTypes = useCallback((): RecordType[] => {
    const recordTypes = new Set<RecordType>();
    METRICS.forEach(m => recordTypes.add(m.type));
    return Array.from(recordTypes);
  }, []);

  // Initialize Health Connect and request permissions
  const initializeHealthConnect = useCallback(async () => {
    if (Platform.OS !== 'android' || fetchStateRef.current.isInitializing) {
      return;
    }

    fetchStateRef.current.isInitializing = true;
    
    try {
      setError(null);
      
      const isInitialized = await initialize();
      if (!isInitialized) {
        throw new Error('Health Connect initialization failed');
      }

      if (!isMountedRef.current) return;

      // Get unique record types to avoid duplicate permissions
      const recordTypes = getUniqueRecordTypes();

      // Assemble permissions array dynamically
      const perms: Permission[] = [
        ...recordTypes.map(type => ({ accessType: 'read' as const, recordType: type }))
      ];

      const granted = await requestPermission(perms);
      
      if (!isMountedRef.current) return;
      
      setPermissions(granted);
      Logger.info(`Health Connect permissions granted: ${granted.length}`);
      
    } catch (err) {
      Logger.error(`Health Connect initialization error: ${err}`);
      if (isMountedRef.current) {
        setError(err instanceof Error ? err.message : 'Unknown initialization error');
      }
    } finally {
      fetchStateRef.current.isInitializing = false;
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [getUniqueRecordTypes]);

  // Initialize on mount
  useEffect(() => {
    if (Platform.OS === 'android') {
      initializeHealthConnect();
    } else {
      setIsLoading(false);
    }
  }, [initializeHealthConnect]);

  const performRound = (value: number, key: string): number | null => {
    if (value <= 0) return null;
    switch (key) {
      case 'steps':
      case 'heartRate':
      case 'bloodPressureSystolic':
      case 'bloodPressureDiastolic':
      case 'respiratoryRate':
        return Math.round(value); // Round to nearest integer for these metrics
      default:
        return value; // Return as is for others
    }
  }

  // Helper function with proper error handling and timeout
  const readMetricSafely = useCallback(async (
    type: RecordType, 
    extract: (record: any) => number, 
    key: string,
    operation: 'sum' | 'average' | undefined,
    filter: TimeRangeFilter,
    permissions: Permission[],
    signal?: AbortSignal
  ): Promise<{ key: string; dailyValues: Record<string, number | null>; aggregatedValue: number | null }> => {
    const hasRead = permissions.some(p => p.recordType === type && p.accessType === 'read');
    if (!hasRead) {
      Logger.warn(`No read permission for ${type}`);
      return { key, dailyValues: {}, aggregatedValue: null };
    }

    try {
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise<never>((_, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error(`Timeout reading ${type}`));
        }, 10000); // 10 second timeout
        
        if (signal) {
          signal.addEventListener('abort', () => {
            clearTimeout(timeoutId);
            reject(new Error(`Aborted reading ${type}`));
          });
        }
      });

      const readPromise = readRecords(type, { timeRangeFilter: filter });
      const resp = await Promise.race([readPromise, timeoutPromise]);
      // console.log(`Read ${type} records:`, resp.records);
      
      if (signal?.aborted) {
        throw new Error(`Aborted reading ${type}`);
      }

      // Group records by date (YYYY-MM-DD)
      const recordsByDate: Record<string, any[]> = {};
      let totalValue = 0;
      let recordCount = 0;

      resp.records.forEach(rec => {
        // Extract date from record timestamp - records have different timestamp properties based on type
        // Cast to any to access common timestamp properties
        const record = rec as any;
        const timestamp = record.startTime || record.time || record.endTime;

        if (!timestamp) return;
        
        const date = new Date(timestamp);
        const dateString = date.toISOString().split('T')[0]; // YYYY-MM-DD
        
        if (!recordsByDate[dateString]) {
          recordsByDate[dateString] = [];
        }
        
        recordsByDate[dateString].push(rec);
        // console.log(`Processing record for ${date}:`, rec);
        
        // Also calculate total for aggregated value
        const extracted = extract(rec);
        if (!isNaN(extracted) && extracted > 0) {
          totalValue += extracted;
          recordCount++;
        }
      });

      // Calculate daily values based on operation type
      const dailyValues: Record<string, number | null> = {};
      Object.entries(recordsByDate).forEach(([date, records]) => {
        if (records.length === 0) {
          dailyValues[date] = null;
          return;
        }
        
        const dateTotal = records.reduce((acc, rec) => {
          const extracted = extract(rec);
          return acc + (extracted > 0 ? extracted : 0);
        }, 0);
        
        if (dateTotal <= 0) {
          dailyValues[date] = null;
        } else if (operation === 'average') {
          dailyValues[date] = performRound(dateTotal / records.length, key);
        } else {
          dailyValues[date] = performRound(dateTotal, key);
        }
      });

      // Calculate aggregated value
      let aggregatedValue: number | null = null;
      if (recordCount > 0 && totalValue > 0) {
        aggregatedValue = operation === 'average' ? 
          performRound(totalValue / recordCount, key) : 
          performRound(totalValue, key);
      }

      return { 
        key, 
        dailyValues, 
        aggregatedValue
      };
    } catch (err) {
      Logger.warn(`Error reading ${type}: ${err}`);
      return { key, dailyValues: {}, aggregatedValue: null };
    }
  }, []);

  const fetchHealthData = useCallback(async () => {
    if (Platform.OS !== 'android' || permissions.length === 0) {
      setIsLoading(false);
      setIsRefreshing(false);
      return;
    }

    // Prevent concurrent fetches
    const now = Date.now();
    if (fetchStateRef.current.isFetching || 
        (now - fetchStateRef.current.lastFetchAttempt < 2000)) {
      return;
    }

    fetchStateRef.current.isFetching = true;
    fetchStateRef.current.lastFetchAttempt = now;

    // Cancel any previous fetch
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Create new abort controller
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    try {
      setError(null);
      
      const currentDate = new Date();
      const weekAgo = new Date(currentDate.getTime() - 6 * 24 * 60 * 60 * 1000);
      const filter: TimeRangeFilter = {
        operator: 'between',
        startTime: weekAgo.toISOString(),
        endTime: currentDate.toISOString(),
      };

      // Process metrics in smaller batches to reduce binding stress
      const batchSize = 5;
      const results: { key: string; dailyValues: Record<string, number | null>; aggregatedValue: number | null }[] = [];

      // Process metrics in batches
      for (let i = 0; i < METRICS.length; i += batchSize) {
        if (signal.aborted || !isMountedRef.current) break;
        
        const batch = METRICS.slice(i, i + batchSize);
        const batchPromises = batch.map(({ type, extract, key, operation }) =>
          readMetricSafely(type, extract, key, operation, filter, permissions, signal)
        );
        
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
        
        // Small delay between batches to prevent overwhelming the binding
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      if (signal.aborted || !isMountedRef.current) return;

      // Process daily data
      const dailyHealthData: DailyHealthData = {};
      const aggregatedHealthData: HealthData = {};
      
      results.forEach(({ key, dailyValues, aggregatedValue }) => {
        // Store aggregated value for backward compatibility
        aggregatedHealthData[key] = aggregatedValue;
        
        // Store daily values by date
        Object.entries(dailyValues).forEach(([date, value]) => {
          if (!dailyHealthData[date]) {
            dailyHealthData[date] = {};
          }
          dailyHealthData[date][key] = value;
        });
      });

      // const tempDailyData = {
      //   "2025-07-09": {
      //     "sleepSessions": 7.8,
      //     "heartRate": 62,
      //     "respiratoryRate": 15,
      //     "totalCalories": 2300,
      //     "hydration": 2.5
      //   },
      //   "2025-07-10": {
      //     "sleepSessions": 7.5,
      //     "heartRate": 60,
      //     "respiratoryRate": 14,
      //     "totalCalories": 2250,
      //     "hydration": 2.4
      //   },
      //   "2025-07-11": {
      //     "sleepSessions": 4.0,
      //     "heartRate": 75,
      //     "respiratoryRate": 19,
      //     "totalCalories": 2800,
      //     "hydration": 1.0
      //   },
      //   "2025-07-12": {
      //     "sleepSessions": 5.2,
      //     "heartRate": 72,
      //     "respiratoryRate": 18,
      //     "totalCalories": 2750,
      //     "hydration": 1.2
      //   },
      //   "2025-07-13": {
      //     "sleepSessions": 4.5,
      //     "heartRate": 78,
      //     "respiratoryRate": 20,
      //     "totalCalories": 2900,
      //     "hydration": 0.8
      //   },
      //   "2025-07-14": {
      //     "sleepSessions": 5.0,
      //     "heartRate": 70,
      //     "respiratoryRate": 17,
      //     "totalCalories": 2600,
      //     "hydration": 1.5
      //   },
      //   "2025-07-15": {
      //     "sleepSessions": 6.1,
      //     "heartRate": 68,
      //     "respiratoryRate": 16,
      //     "totalCalories": 2400,
      //     "hydration": 2.0
      //   }
      // }

      // setDailyData(tempDailyData);

      console.log('Daily Health Data:', dailyHealthData);
      console.log('Aggregated Health Data:', aggregatedHealthData);

      setDailyData(dailyHealthData);
      setAggregatedData(aggregatedHealthData);
      setLastUpdated(new Date());
      
    } catch (err) {
      if (!signal.aborted) {
        Logger.error(`Health data fetch error: ${err}`);
        if (isMountedRef.current) {
          setError(err instanceof Error ? err.message : 'Unknown fetch error');
        }
      }
    } finally {
      fetchStateRef.current.isFetching = false;
      if (isMountedRef.current) {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    }
  }, [permissions, readMetricSafely]);

  // Initial data fetch when permissions are available
  useEffect(() => {
    if (permissions.length > 0 && !fetchStateRef.current.isFetching) {
      fetchHealthData();
    }
  }, [permissions, fetchHealthData]);

  // Refresh function with debouncing
  const refreshData = useCallback(() => {
    if (fetchStateRef.current.isFetching) {
      Logger.warn('Fetch already in progress, skipping refresh');
      return;
    }
    
    setIsRefreshing(true);
    fetchHealthData();
  }, [fetchHealthData]);

  Logger.debug(`Health data: ${Object.keys(dailyData).length} daily entries, ${Object.keys(aggregatedData).length} metrics loaded`);
  
  return {
    dailyData, 
    data: aggregatedData, // For backward compatibility
    permissions,
    isLoading, 
    isRefreshing, 
    refreshData,
    lastUpdated,
    error
  };
}