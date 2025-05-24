import {
  initialize,
  requestPermission,
  readRecords,
} from 'react-native-health-connect';
import { Permission, RecordType } from 'react-native-health-connect/lib/typescript/types';
import { TimeRangeFilter } from 'react-native-health-connect/lib/typescript/types/base.types';
import { useEffect, useState, useRef, useCallback } from 'react';
import { Platform } from 'react-native';

// Define metrics to read and their extractors
const METRICS: {
  type: RecordType;
  extract: (record: any) => number;
  key: string;
}[] = [
  { type: 'Steps', extract: r => r.count ?? 0, key: 'steps' },
  { type: 'Distance', extract: r => r.distance?.inMeters ?? 0, key: 'distance' },
  // { type: 'FloorsClimbed', extract: r => r.floors ?? 0, key: 'floorsClimbed' },
  { type: 'ActiveCaloriesBurned', extract: r => r.energy?.inKilocalories ?? 0, key: 'activeCalories' },
  { type: 'TotalCaloriesBurned', extract: r => r.energy?.inKilocalories ?? 0, key: 'totalCalories' },
  { type: 'HeartRate', extract: r => r.beatsPerMinute ?? 0, key: 'heartRate' },
  // { type: 'RestingHeartRate', extract: r => r.beatsPerMinute ?? 0, key: 'restingHeartRate' },
  // { type: 'HeartRateVariabilityRmssd', extract: r => r.heartRateVariabilityMillis ?? 0, key: 'heartRateVariability' },
  { type: 'Weight', extract: r => r.weight?.inKilograms ?? 0, key: 'weight' },
  { type: 'Height', extract: r => r.height?.inMeters ?? 0, key: 'height' },
  // { type: 'BodyFat', extract: r => r.percentage ?? 0, key: 'bodyFat' },
  { type: 'Hydration', extract: r => r.volume?.inLiters ?? 0, key: 'hydration' },
  // { type: 'BoneMass', extract: r => r.mass?.inKilograms ?? 0, key: 'boneMass' },
  // { type: 'LeanBodyMass', extract: r => r.mass?.inKilograms ?? 0, key: 'leanBodyMass' },
  // { type: 'BodyWaterMass', extract: r => r.mass?.inKilograms ?? 0, key: 'bodyWaterMass' },
  // { type: 'BloodGlucose', extract: r => r.level?.inMilligramsPerDeciliter ?? 0, key: 'bloodGlucose' },
  { type: 'BloodPressure', extract: r => r.systolic?.inMillimetersOfMercury ?? 0, key: 'bloodPressureSystolic' },
  { type: 'BloodPressure', extract: r => r.diastolic?.inMillimetersOfMercury ?? 0, key: 'bloodPressureDiastolic' },
  { type: 'BodyTemperature', extract: r => r.temperature?.inCelsius ?? 0, key: 'bodyTemperature' },
  // { type: 'BasalBodyTemperature', extract: r => r.temperature?.inCelsius ?? 0, key: 'basalBodyTemperature' },
  { type: 'BasalMetabolicRate', extract: r => r.basalMetabolicRate?.inKilocaloriesPerDay ?? 0, key: 'basalMetabolicRate' },
  // { type: 'Vo2Max', extract: r => r.vo2MillilitersPerMinuteKilogram ?? 0, key: 'vo2Max' },
  { type: 'RespiratoryRate', extract: r => r.rate ?? 0, key: 'respiratoryRate' },
  // { type: 'OxygenSaturation', extract: r => r.percentage ?? 0, key: 'oxygenSaturation' },
  // { type: 'Power', extract: r => r.power?.inWatts ?? 0, key: 'power' },
  // { type: 'Speed', extract: r => r.speed?.inMetersPerSecond ?? 0, key: 'speed' },
  // { type: 'StepsCadence', extract: r => r.rate ?? 0, key: 'stepsCadence' },
  // { type: 'CyclingPedalingCadence', extract: r => r.rate ?? 0, key: 'cyclingCadence' },
  // { type: 'ElevationGained', extract: r => r.elevation?.inMeters ?? 0, key: 'elevationGained' },
  // { type: 'WheelchairPushes', extract: r => r.count ?? 0, key: 'wheelchairPushes' },
];

// Session types
const SESSION_TYPES: { type: RecordType; key: string }[] = [
  { type: 'ExerciseSession', key: 'exerciseSessions' },
  { type: 'SleepSession', key: 'sleepSessions' },
  // { type: 'SexualActivity', key: 'sexualActivity' },
  // { type: 'MenstruationPeriod', key: 'menstruationPeriods' },
  // { type: 'CervicalMucus', key: 'cervicalMucus' },
  // { type: 'OvulationTest', key: 'ovulationTest' }
];

type HealthData = Record<string, number | null>;

interface FetchState {
  isInitializing: boolean;
  isFetching: boolean;
  lastFetchAttempt: number;
}

export default function useHealthData() {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [data, setData] = useState<HealthData>({});
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
    SESSION_TYPES.forEach(s => recordTypes.add(s.type));
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
      console.log('Health Connect permissions granted:', granted.length);
      
    } catch (err) {
      console.error('Health Connect initialization error:', err);
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

  // Helper function with proper error handling and timeout
  const readMetricSafely = useCallback(async (
    type: RecordType, 
    extract: (record: any) => number, 
    key: string,
    filter: TimeRangeFilter,
    permissions: Permission[],
    signal?: AbortSignal
  ): Promise<{ key: string; value: number | null }> => {
    const hasRead = permissions.some(p => p.recordType === type && p.accessType === 'read');
    if (!hasRead) {
      console.warn(`No read permission for ${type}`);
      return { key, value: null };
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
      
      if (signal?.aborted) {
        throw new Error(`Aborted reading ${type}`);
      }

      const value = resp.records.reduce((acc, rec) => {
        const extracted = extract(rec);
        return acc + (extracted > 0 ? extracted : 0);
      }, 0);
      
      return { key, value: value > 0 ? value : null };
    } catch (err) {
      console.warn(`Error reading ${type}:`, err);
      return { key, value: null };
    }
  }, []);

  // Helper function for session counts with timeout
  const readSessionSafely = useCallback(async (
    type: RecordType, 
    key: string,
    filter: TimeRangeFilter,
    permissions: Permission[],
    signal?: AbortSignal
  ): Promise<{ key: string; value: number | null }> => {
    const hasRead = permissions.some(p => p.recordType === type && p.accessType === 'read');
    if (!hasRead) {
      return { key, value: null };
    }

    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error(`Timeout reading ${type}`));
        }, 10000);
        
        if (signal) {
          signal.addEventListener('abort', () => {
            clearTimeout(timeoutId);
            reject(new Error(`Aborted reading ${type}`));
          });
        }
      });

      const readPromise = readRecords(type, { timeRangeFilter: filter });
      const resp = await Promise.race([readPromise, timeoutPromise]);
      
      if (signal?.aborted) {
        throw new Error(`Aborted reading ${type}`);
      }

      return { key, value: resp.records.length > 0 ? resp.records.length : null };
    } catch (err) {
      console.warn(`Error reading ${type}:`, err);
      return { key, value: null };
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
      const weekAgo = new Date(currentDate.getTime() - 7 * 24 * 60 * 60 * 1000);
      const filter: TimeRangeFilter = {
        operator: 'between',
        startTime: weekAgo.toISOString(),
        endTime: currentDate.toISOString(),
      };

      // Process metrics in smaller batches to reduce binding stress
      const batchSize = 5;
      const results: { key: string; value: number | null }[] = [];

      // Process metrics in batches
      for (let i = 0; i < METRICS.length; i += batchSize) {
        if (signal.aborted || !isMountedRef.current) break;
        
        const batch = METRICS.slice(i, i + batchSize);
        const batchPromises = batch.map(({ type, extract, key }) =>
          readMetricSafely(type, extract, key, filter, permissions, signal)
        );
        
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
        
        // Small delay between batches to prevent overwhelming the binding
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Process sessions in batches
      for (let i = 0; i < SESSION_TYPES.length; i += batchSize) {
        if (signal.aborted || !isMountedRef.current) break;
        
        const batch = SESSION_TYPES.slice(i, i + batchSize);
        const batchPromises = batch.map(({ type, key }) =>
          readSessionSafely(type, key, filter, permissions, signal)
        );
        
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
        
        // Small delay between batches
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      if (signal.aborted || !isMountedRef.current) return;

      // Convert results to data object
      const healthData: HealthData = {};
      results.forEach(({ key, value }) => {
        healthData[key] = value;
      });

      setData(healthData);
      setLastUpdated(new Date());
      
    } catch (err) {
      if (!signal.aborted) {
        console.error('Health data fetch error:', err);
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
  }, [permissions, readMetricSafely, readSessionSafely]);

  // Initial data fetch when permissions are available
  useEffect(() => {
    if (permissions.length > 0 && !fetchStateRef.current.isFetching) {
      fetchHealthData();
    }
  }, [permissions, fetchHealthData]);

  // Refresh function with debouncing
  const refreshData = useCallback(() => {
    if (fetchStateRef.current.isFetching) {
      console.log('Fetch already in progress, skipping refresh');
      return;
    }
    
    setIsRefreshing(true);
    fetchHealthData();
  }, [fetchHealthData]);

  console.log('Health data:', Object.keys(data).length, 'metrics loaded');
  
  return { 
    data, 
    permissions, 
    isLoading, 
    isRefreshing, 
    refreshData,
    lastUpdated,
    error
  };
}