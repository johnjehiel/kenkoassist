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
const METRICS: {
  type: RecordType;
  extract: (record: any) => number;
  key: string;
  operation?: 'sum' | 'average';
}[] = [
  { type: 'Steps', extract: r => r.count ?? 0, key: 'steps', operation: 'sum' },
  { type: 'Distance', extract: r => r.distance?.inMeters ?? 0, key: 'distance', operation: 'sum' },
  { type: 'TotalCaloriesBurned', extract: r => r.energy?.inKilocalories ?? 0, key: 'totalCalories' , operation: 'sum' },
  { type: 'HeartRate', extract: r => r.beatsPerMinute ?? 0, key: 'heartRate', operation: 'average' },
  { type: 'Weight', extract: r => r.weight?.inKilograms ?? 0, key: 'weight', operation: 'average' },
  { type: 'Height', extract: r => r.height?.inMeters ?? 0, key: 'height', operation: 'average' },
  { type: 'Hydration', extract: r => r.volume?.inLiters ?? 0, key: 'hydration', operation: 'sum' },
  { type: 'BloodPressure', extract: r => r.systolic?.inMillimetersOfMercury ?? 0, key: 'bloodPressureSystolic', operation: 'average' },
  { type: 'BloodPressure', extract: r => r.diastolic?.inMillimetersOfMercury ?? 0, key: 'bloodPressureDiastolic', operation: 'average' },
  { type: 'BodyTemperature', extract: r => r.temperature?.inCelsius ?? 0, key: 'bodyTemperature', operation: 'average' },
  { type: 'BasalMetabolicRate', extract: r => r.basalMetabolicRate?.inKilocaloriesPerDay ?? 0, key: 'basalMetabolicRate', operation: 'average' },
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
  ): Promise<{ key: string; value: number | null }> => {
    const hasRead = permissions.some(p => p.recordType === type && p.accessType === 'read');
    if (!hasRead) {
      Logger.warn(`No read permission for ${type}`);
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

      if (operation === 'average') {
        const count = resp.records.length;
        return { key, value: value > 0 && count > 0 ? performRound(value / count, key) : null };
      }
      // Default to returning the sum if no operation specified
      return { key, value: value > 0 ? performRound(value, key) : null };
    } catch (err) {
      Logger.warn(`Error reading ${type}: ${err}`);
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
        const batchPromises = batch.map(({ type, extract, key, operation }) =>
          readMetricSafely(type, extract, key, operation, filter, permissions, signal)
        );
        
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
        
        // Small delay between batches to prevent overwhelming the binding
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

  Logger.debug(`Health data: ${Object.keys(data).length} metrics loaded`);
  
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