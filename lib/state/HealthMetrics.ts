import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { mmkv, mmkvStorage } from '@lib/storage/MMKV'
import { Storage } from '@lib/enums/Storage'
import { AppSettings } from '@lib/constants/GlobalValues'
import { Tokenizer } from '@lib/engine/Tokenizer'
import { healthCategories, labelMap, unitsMap } from '@lib/constants/HealthMetricsData'

// Health data interface matching the useHealthData hook
interface HealthData {
  [key: string]: number | null;
}

// Formatted health metrics for LLM context
interface FormattedHealthMetrics {
  prompt: string;
  lastUpdated: string;
  categories: {
    [categoryName: string]: {
      metrics: Array<{
        name: string;
        value: string;
        unit: string;
      }>;
    };
  };
}

// Token cache interface for health metrics
interface HealthMetricsTokenCache {
  lastUpdated: string | null;
  formattedData_length: number;
}

interface HealthMetricsStateProps {
  // Raw health data from the hook
  data: HealthData;
  
  // Formatted data ready for LLM context
  formattedData: FormattedHealthMetrics | null;
  
  // Token cache for context building
  tokenCache: HealthMetricsTokenCache | null;
  
  // Metadata
  lastUpdated: string | null;
  isEnabled: boolean;
  error: string | null;
  
  // Actions
  updateData: (healthData: HealthData, timestamp?: Date | string) => void;
  clearData: () => void;
  setEnabled: (enabled: boolean) => void;
  setError: (error: string | null) => void;
  getCache: () => HealthMetricsTokenCache;
}

// Helper function to normalize timestamp
const normalizeTimestamp = (timestamp: Date | string): string => {
  if (typeof timestamp === 'string') {
    return timestamp;
  }
  return timestamp.toISOString();
};

// Helper function to format health data
const formatHealthData = (data: HealthData, timestamp: Date | string): FormattedHealthMetrics => {
  const categories: FormattedHealthMetrics['categories'] = {};
  const lastUpdated = normalizeTimestamp(timestamp);

  // Process each category
  Object.entries(healthCategories).forEach(([categoryKey, categoryInfo]) => {
    const categoryMetrics: Array<{name: string; value: string; unit: string}> = [];
    
    categoryInfo.metrics.forEach(metricKey => {
      const value = data[metricKey];
      if (value !== null && value !== undefined && value > 0) {
        const label = labelMap[metricKey] || metricKey;
        const unit = unitsMap[metricKey] || '';
        const formattedValue = typeof value === 'number' ? value.toFixed(2) : String(value);
        
        categoryMetrics.push({
          name: label,
          value: formattedValue,
          unit
        });
      }
    });
    
    if (categoryMetrics.length > 0) {
      categories[categoryInfo.name] = {
        metrics: categoryMetrics
      };
    }
  });

  if (Object.keys(categories).length === 0) {
    return {
      prompt: "No health metrics data available.",
      lastUpdated: lastUpdated,
      categories
    };
  }
  
  let prompt = `\n\nUser Health Metrics Last Week (Last Updated: ${new Date(lastUpdated).toLocaleDateString()})\n\n`;
  
  const Categories = Object.entries(categories);
  
  Categories.forEach(([categoryName, categoryData]) => {
    prompt += `**${categoryName}**:\n`;
    categoryData.metrics.forEach(metric => {
      prompt += `- ${metric.name}: ${metric.value}${metric.unit ? ' ' + metric.unit : ''}\n`;
    });
    prompt += '\n';
  });
  
  prompt += "Note: Use this health data contextually when relevant to user queries about health, fitness, or wellness.";
  
  return {
    prompt: prompt,
    lastUpdated: lastUpdated,
    categories
  };
};

export namespace HealthMetrics {
  export const useHealthMetricsState = create<HealthMetricsStateProps>()(
    persist(
      (set, get) => ({
        data: {},
        formattedData: null,
        tokenCache: null,
        lastUpdated: null,
        isEnabled: false,
        error: null,

        updateData: (healthData: HealthData, timestamp = new Date()) => {
          const state = get();
          
          // Only update if feature is enabled
          if (!state.isEnabled) {
            console.log('Health metrics feature is disabled, skipping data update');
            return;
          }

          const normalizedTimestamp = normalizeTimestamp(timestamp);
          const formatted = formatHealthData(healthData, normalizedTimestamp);
          
          console.log("Health metrics data updated:", {
            metricsCount: Object.keys(healthData).length,
            categoriesCount: Object.keys(formatted.categories).length,
            lastUpdated: normalizedTimestamp
          });
          
          // Clear cache when data is updated to force recalculation
          set({
            data: healthData,
            formattedData: formatted,
            lastUpdated: normalizedTimestamp,
            tokenCache: null,
            error: null, // Clear any previous errors on successful update
          });
        },

        clearData: () => {
          console.log('Clearing health metrics data');
          set({
            data: {},
            formattedData: null,
            lastUpdated: null,
            tokenCache: null,
            error: null,
          });
        },

        setEnabled: (enabled: boolean) => {
          const state = get();
          console.log(`Health metrics feature ${enabled ? 'enabled' : 'disabled'}`);
          
          set({ isEnabled: enabled });
          
          // Clear data when disabled
          if (!enabled) {
            state.clearData();
          }
        },

        setError: (error: string | null) => {
          set({ error });
        },

        getCache: (): HealthMetricsTokenCache => {
          const state = get();
          const cache = state.tokenCache;
          
          // Return existing cache if it matches current data timestamp
          if (cache && cache.lastUpdated === state.lastUpdated) {
            return cache;
          }

          // If no data available, return empty cache
          if (!state.formattedData || !state.lastUpdated) {
            const emptyCache: HealthMetricsTokenCache = {
              lastUpdated: null,
              formattedData_length: 0
            };
            set((currentState) => ({ ...currentState, tokenCache: emptyCache }));
            return emptyCache;
          }

          // Calculate token counts
          try {
            const getTokenCount = Tokenizer.getTokenizer();
            const formattedDataPrompt = state.formattedData.prompt;

            const newCache: HealthMetricsTokenCache = {
              lastUpdated: state.lastUpdated,
              formattedData_length: getTokenCount(formattedDataPrompt),
            };

            // Update the cache in state
            set((currentState) => ({ ...currentState, tokenCache: newCache }));
            return newCache;
          } catch (err) {
            console.error('Failed to calculate token count:', err);
            const fallbackCache: HealthMetricsTokenCache = {
              lastUpdated: state.lastUpdated,
              formattedData_length: 0
            };
            set((currentState) => ({ ...currentState, tokenCache: fallbackCache }));
            return fallbackCache;
          }
        },
      }),
      {
        name: Storage.HealthMetrics,
        storage: createJSONStorage(() => mmkvStorage),
        version: 1,
        partialize: (state) => ({
          data: state.data,
          formattedData: state.formattedData,
          lastUpdated: state.lastUpdated,
          isEnabled: state.isEnabled,
          error: state.error,
          // Note: tokenCache is not persisted as it should be recalculated on app restart
        }),
        migrate: async (persistedState: any, version) => {
          // Handle migration if needed in future versions
        },
      }
    )
  );
}