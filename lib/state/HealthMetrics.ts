import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { mmkvStorage } from '@lib/storage/MMKV'
import { Storage } from '@lib/enums/Storage'
import { Tokenizer } from '@lib/engine/Tokenizer'
import { healthCategories, labelMap, unitsMap } from '@lib/constants/HealthMetricsData'
import { Logger } from './Logger'

// Health data interface matching the useHealthData hook
interface HealthData {
  [key: string]: number | null;
}

// Daily health data structure
interface DailyHealthData {
  [date: string]: HealthData;
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

// Formatted daily health metrics for LLM context
interface FormattedDailyHealthMetrics {
  prompt: string;
  lastUpdated: string;
  dailyData: {
    [date: string]: {
      [categoryName: string]: {
        metrics: Array<{
          name: string;
          value: string;
          unit: string;
        }>;
      };
    };
  };
}

// Token cache interface for health metrics
interface HealthMetricsTokenCache {
  lastUpdated: string | null;
  formattedData_length: number;
  formattedDailyData_length: number;
}

interface HealthMetricsStateProps {
  // Raw health data from the hook
  data: HealthData;
  dailyData: DailyHealthData;
  
  // Formatted data ready for LLM context
  formattedData: FormattedHealthMetrics | null;
  formattedDailyData: FormattedDailyHealthMetrics | null;
  
  // Token cache for context building
  tokenCache: HealthMetricsTokenCache | null;
  
  // Metadata
  lastUpdated: string | null;
  isEnabled: boolean;
  error: string | null;
  
  // Actions
  updateData: (healthData: HealthData, dailyHealthData: DailyHealthData, timestamp?: Date | string) => void;
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

// Helper function to format daily health data
const formatDailyHealthData = (
  dailyData: DailyHealthData, 
  timestamp: Date | string
): FormattedDailyHealthMetrics => {
  const formattedDailyData: FormattedDailyHealthMetrics['dailyData'] = {};
  const lastUpdated = normalizeTimestamp(timestamp);
  
  // Process each date
  Object.entries(dailyData).forEach(([date, dayData]) => {
    formattedDailyData[date] = {};
    
    // Process each category for this date
    Object.entries(healthCategories).forEach(([categoryKey, categoryInfo]) => {
      const categoryMetrics: Array<{name: string; value: string; unit: string}> = [];
      
      // Process each metric in this category
      categoryInfo.metrics.forEach(metricKey => {
        const value = dayData[metricKey];
        if (value !== null && value !== undefined && value > 0) {
          const label = labelMap[metricKey] || metricKey;
          const unit = unitsMap[metricKey] || '';
          
          // Format the value appropriately (similar to formatHealthData)
          let formattedValue;
          if (label === 'Steps' || label === 'Heart Rate' || label === 'BP Systolic' || label === 'BP Diastolic' || label === 'Breathing Rate') {
            formattedValue = Math.round(value).toString();
          } else {
            formattedValue = typeof value === 'number' ? value.toFixed(2) : String(value);
          }
          
          categoryMetrics.push({
            name: label,
            value: formattedValue,
            unit
          });
        }
      });
      
      // Only add the category if it has metrics
      if (categoryMetrics.length > 0) {
        formattedDailyData[date][categoryInfo.name] = {
          metrics: categoryMetrics
        };
      }
    });
    
    // Remove dates with no metrics
    if (Object.keys(formattedDailyData[date]).length === 0) {
      delete formattedDailyData[date];
    }
  });

  // Build the prompt text
  let prompt = `\n\nUser's Daily Health Metrics (Past 7 days)\n\n`;
  
  const sortedDates = Object.keys(formattedDailyData).sort();
  
  if (sortedDates.length === 0) {
    return {
      prompt: "No daily health metrics data available.",
      lastUpdated,
      dailyData: {}
    };
  }
  
  sortedDates.forEach(date => {
    // Get the date object for comparison
    const dateObj = new Date(date);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    // Check if this date is today or yesterday
    const isToday = dateObj.toDateString() === today.toDateString();
    const isYesterday = dateObj.toDateString() === yesterday.toDateString();
    
    // Format the date and add the label if needed
    const formattedDate = dateObj.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    
    let dateLabel = formattedDate;
    if (isToday) {
      dateLabel += " (Today)";
    } else if (isYesterday) {
      dateLabel += " (Yesterday)";
    }
    
    prompt += `**${dateLabel}**\n\n`;
    
    Object.entries(formattedDailyData[date]).forEach(([categoryName, category]) => {
      prompt += `${categoryName}:\n`;
      category.metrics.forEach(metric => {
        prompt += `- ${metric.name}: ${metric.value}${metric.unit ? ' ' + metric.unit : ''}\n`;
      });
      prompt += '\n';
    });
    
    prompt += '\n';
  });
  
  prompt += "Note: Use this daily health data contextually when relevant to user queries about health trends, patterns, or progress.";
  
  return {
    prompt,
    lastUpdated,
    dailyData: formattedDailyData
  };
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
        // const formattedValue = typeof value === 'number' ? value.toFixed(2) : String(value);
        const formattedValue = (label === 'Steps' || label === 'Heart Rate' || label === 'BP Systolic' || label === 'BP Diastolic') ?
            value.toString() : ((typeof value === 'number') ? 
            value.toFixed(2) : String(value));
        
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
  
  let prompt = `\n\nUser's Weekly Health Metrics Summary (Data from the past 7 days)\n\n`;
  
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
        dailyData: {},
        formattedData: null,
        formattedDailyData: null,
        tokenCache: null,
        lastUpdated: null,
        isEnabled: false,
        error: null,

        updateData: (healthData: HealthData, dailyHealthData: DailyHealthData, timestamp = new Date()) => {
          const state = get();
          
          // Only update if feature is enabled
          if (!state.isEnabled) {
            Logger.info('Health metrics feature is disabled, skipping data update');
            return;
          }

          const normalizedTimestamp = normalizeTimestamp(timestamp);
          const formatted = formatHealthData(healthData, normalizedTimestamp);
          const formattedDaily = formatDailyHealthData(dailyHealthData, normalizedTimestamp);
          
          Logger.debug(`Health metrics data updated: ${JSON.stringify({
            metricsCount: Object.keys(healthData).length,
            categoriesCount: Object.keys(formatted.categories).length,
            daysCount: Object.keys(dailyHealthData).length,
            lastUpdated: normalizedTimestamp
          })}`);
          
          // Clear cache when data is updated to force recalculation
          set({
            data: healthData,
            dailyData: dailyHealthData,
            formattedData: formatted,
            formattedDailyData: formattedDaily,
            lastUpdated: normalizedTimestamp,
            tokenCache: null,
            error: null, // Clear any previous errors on successful update
          });
        },

        clearData: () => {
          Logger.info('Clearing health metrics data');
          set({
            data: {},
            dailyData: {},
            formattedData: null,
            formattedDailyData: null,
            lastUpdated: null,
            tokenCache: null,
            error: null,
          });
        },

        setEnabled: (enabled: boolean) => {
          const state = get();
          Logger.info(`Health metrics feature ${enabled ? 'enabled' : 'disabled'}`);
          
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
          if (!state.formattedData || !state.formattedDailyData || !state.lastUpdated) {
            const emptyCache: HealthMetricsTokenCache = {
              lastUpdated: null,
              formattedData_length: 0,
              formattedDailyData_length: 0
            };
            set((currentState) => ({ ...currentState, tokenCache: emptyCache }));
            return emptyCache;
          }

          // Calculate token counts
          try {
            const getTokenCount = Tokenizer.getTokenizer();
            const formattedDataPrompt = state.formattedData.prompt;
            const formattedDailyDataPrompt = state.formattedDailyData.prompt;

            const newCache: HealthMetricsTokenCache = {
              lastUpdated: state.lastUpdated,
              formattedData_length: getTokenCount(formattedDataPrompt),
              formattedDailyData_length: getTokenCount(formattedDailyDataPrompt)
            };

            // Update the cache in state
            set((currentState) => ({ ...currentState, tokenCache: newCache }));
            return newCache;
          } catch (err) {
            Logger.error(`Failed to calculate token count: ${err}`);
            const fallbackCache: HealthMetricsTokenCache = {
              lastUpdated: state.lastUpdated,
              formattedData_length: 0,
              formattedDailyData_length: 0
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
          dailyData: state.dailyData,
          formattedData: state.formattedData,
          formattedDailyData: state.formattedDailyData,
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