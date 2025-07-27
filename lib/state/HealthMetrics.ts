import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { mmkvStorage } from '@lib/storage/MMKV'
import { Storage } from '@lib/enums/Storage'
import { Tokenizer } from '@lib/engine/Tokenizer'
import { healthCategories, labelMap, unitsMap } from '@lib/constants/HealthMetricsData'
import { Logger } from './Logger'
import { MetricCategory } from '@screens/HealthMetricsMenu/HealthMetricsWindow'

// Health data interface (summary for 4 hours)
interface HealthData {
    [key: string]: number | null
}

// Time-slotted health data structure
interface TimeSlotHealthData {
    [timestamp: string]: HealthData
}

// Formatted health metrics for LLM context (4-hour summary)
interface FormattedHealthMetrics {
    prompt: string
    lastUpdated: string
    categories: {
        [categoryName: string]: {
            metrics: Array<{
                name: string
                value: string
                unit: string
            }>
        }
    }
}

// Formatted TIME-SLOTTED health metrics for LLM context
interface FormattedTimeSlotHealthMetrics {
    prompt: string
    lastUpdated: string
    timeSlotData: {
        [timestamp: string]: {
            [categoryName: string]: {
                metrics: Array<{
                    name: string
                    value: string
                    unit: string
                }>
            }
        }
    }
}

// Token cache interface for health metrics
interface HealthMetricsTokenCache {
    lastUpdated: string | null
    formattedData_length: number
    formattedDailyData_length: number
}

interface HealthMetricsStateProps {
    // Raw health data from the hook
    data: HealthData
    dailyData: TimeSlotHealthData // This now holds time-slotted data

    // Formatted data ready for LLM context
    formattedData: FormattedHealthMetrics | null
    formattedDailyData: FormattedTimeSlotHealthMetrics | null // This will hold formatted time-slot data

    // Token cache for context building
    tokenCache: HealthMetricsTokenCache | null

    // Metadata
    lastUpdated: string | null
    isEnabled: boolean
    error: string | null

    // Selected category for metrics
    selectedCategory: MetricCategory

    // Actions
    updateData: (
        healthData: HealthData,
        timeSlotHealthData: TimeSlotHealthData, // Updated parameter name
        timestamp?: Date | string
    ) => void
    clearData: () => void
    setEnabled: (enabled: boolean) => void
    setError: (error: string | null) => void
    getCache: () => HealthMetricsTokenCache
    setSelectedCategory: (category: MetricCategory) => void
}

// Helper function to normalize timestamp
const normalizeTimestamp = (timestamp: Date | string): string => {
    if (typeof timestamp === 'string') {
        return timestamp
    }
    return timestamp.toISOString()
}

// NEW helper function to format time-slotted health data
const formatTimeSlotData = (
    timeSlotData: TimeSlotHealthData,
    timestamp: Date | string
): FormattedTimeSlotHealthMetrics => {
    const formattedTimeSlotData: FormattedTimeSlotHealthMetrics['timeSlotData'] = {}
    const lastUpdated = normalizeTimestamp(timestamp)

    // Process each time slot
    Object.entries(timeSlotData).forEach(([ts, slotData]) => {
        formattedTimeSlotData[ts] = {}

        // Process each category for this time slot
        Object.entries(healthCategories).forEach(([categoryKey, categoryInfo]) => {
            const categoryMetrics: Array<{ name: string; value: string; unit: string }> = []

            // Process each metric in this category
            categoryInfo.metrics.forEach((metricKey) => {
                const value = slotData[metricKey]
                if (value !== null && value !== undefined && value > 0) {
                    const label = labelMap[metricKey] || metricKey
                    const unit = unitsMap[metricKey] || ''

                    let formattedValue
                    if (
                        [
                            'Steps',
                            'Heart Rate',
                            'BP Systolic',
                            'BP Diastolic',
                            'Breathing Rate',
                        ].includes(label)
                    ) {
                        formattedValue = Math.round(value).toString()
                    } else {
                        formattedValue =
                            typeof value === 'number' ? value.toFixed(2) : String(value)
                    }

                    categoryMetrics.push({
                        name: label,
                        value: formattedValue,
                        unit,
                    })
                }
            })

            // Only add the category if it has metrics
            if (categoryMetrics.length > 0) {
                formattedTimeSlotData[ts][categoryInfo.name] = {
                    metrics: categoryMetrics,
                }
            }
        })

        // Remove time slots with no metrics
        if (Object.keys(formattedTimeSlotData[ts]).length === 0) {
            delete formattedTimeSlotData[ts]
        }
    })

    // Build the prompt text
    let prompt = `\n\nUser's Health Metrics (Past 4 Hours, in 30-minute intervals)\n\n`

    const sortedTimestamps = Object.keys(formattedTimeSlotData).sort(
        (a, b) => new Date(a).getTime() - new Date(b).getTime()
    )

    if (sortedTimestamps.length === 0) {
        return {
            prompt: 'No recent health metrics data available for the past 4 hours.',
            lastUpdated,
            timeSlotData: {},
        }
    }

    sortedTimestamps.forEach((ts) => {
        const startTime = new Date(ts)
        const endTime = new Date(startTime.getTime() + 30 * 60 * 1000)

        const timeFormat: Intl.DateTimeFormatOptions = {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
        }

        const timeRangeLabel = `${startTime.toLocaleTimeString(
            'en-US',
            timeFormat
        )} - ${endTime.toLocaleTimeString('en-US', timeFormat)}`

        prompt += `**Time Window: ${timeRangeLabel}**\n\n`

        Object.entries(formattedTimeSlotData[ts]).forEach(([categoryName, category]) => {
            prompt += `${categoryName}:\n`
            category.metrics.forEach((metric) => {
                prompt += `- ${metric.name}: ${metric.value}${
                    metric.unit ? ' ' + metric.unit : ''
                }\n`
            })
            prompt += '\n'
        })
    })

    prompt +=
        'Note: Use this recent health data contextually when relevant to user queries about their current state, health trends, patterns, or progress.'

    return {
        prompt,
        lastUpdated,
        timeSlotData: formattedTimeSlotData,
    }
}

// Helper function to format health data (now a 4-hour summary)
const formatHealthData = (data: HealthData, timestamp: Date | string): FormattedHealthMetrics => {
    const categories: FormattedHealthMetrics['categories'] = {}
    const lastUpdated = normalizeTimestamp(timestamp)

    // Process each category
    Object.entries(healthCategories).forEach(([categoryKey, categoryInfo]) => {
        const categoryMetrics: Array<{ name: string; value: string; unit: string }> = []

        categoryInfo.metrics.forEach((metricKey) => {
            const value = data[metricKey]
            if (value !== null && value !== undefined && value > 0) {
                const label = labelMap[metricKey] || metricKey
                const unit = unitsMap[metricKey] || ''
                // const formattedValue = typeof value === 'number' ? value.toFixed(2) : String(value);
                const formattedValue =
                    label === 'Steps' ||
                    label === 'Heart Rate' ||
                    label === 'BP Systolic' ||
                    label === 'BP Diastolic'
                        ? value.toString()
                        : typeof value === 'number'
                          ? value.toFixed(2)
                          : String(value)

                categoryMetrics.push({
                    name: label,
                    value: formattedValue,
                    unit,
                })
            }
        })

        if (categoryMetrics.length > 0) {
            categories[categoryInfo.name] = {
                metrics: categoryMetrics,
            }
        }
    })

    if (Object.keys(categories).length === 0) {
        return {
            prompt: 'No health metrics data available.',
            lastUpdated: lastUpdated,
            categories,
        }
    }

    let prompt = `\n\nUser's 4-Hour Health Metrics Summary (Aggregated data from the past 4 hours)\n\n`

    const Categories = Object.entries(categories)

    Categories.forEach(([categoryName, categoryData]) => {
        prompt += `**${categoryName}**:\n`
        categoryData.metrics.forEach((metric) => {
            prompt += `- ${metric.name}: ${metric.value}${metric.unit ? ' ' + metric.unit : ''}\n`
        })
        prompt += '\n'
    })

    prompt +=
        'Note: Use this health summary contextually when relevant to user queries about health, fitness, or wellness.'

    return {
        prompt: prompt,
        lastUpdated: lastUpdated,
        categories,
    }
}

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
                selectedCategory: 'sleep', // Default category

                updateData: (
                    healthData: HealthData,
                    timeSlotHealthData: TimeSlotHealthData,
                    timestamp = new Date()
                ) => {
                    const state = get()

                    // Only update if feature is enabled
                    if (!state.isEnabled) {
                        Logger.info('Health metrics feature is disabled, skipping data update')
                        return
                    }

                    const normalizedTimestamp = normalizeTimestamp(timestamp)
                    const formatted = formatHealthData(healthData, normalizedTimestamp)
                    const formattedDaily = formatTimeSlotData(
                        timeSlotHealthData,
                        normalizedTimestamp
                    )

                    Logger.debug(
                        `Health metrics data updated: ${JSON.stringify({
                            summaryMetricsCount: Object.keys(healthData).length,
                            categoriesCount: Object.keys(formatted.categories).length,
                            timeSlotsCount: Object.keys(timeSlotHealthData).length,
                            lastUpdated: normalizedTimestamp,
                        })}`
                    )

                    // Clear cache when data is updated to force recalculation
                    set({
                        data: healthData,
                        dailyData: timeSlotHealthData,
                        formattedData: formatted,
                        formattedDailyData: formattedDaily,
                        lastUpdated: normalizedTimestamp,
                        tokenCache: null,
                        error: null, // Clear any previous errors on successful update
                    })
                },

                clearData: () => {
                    Logger.info('Clearing health metrics data')
                    set({
                        data: {},
                        dailyData: {},
                        formattedData: null,
                        formattedDailyData: null,
                        lastUpdated: null,
                        tokenCache: null,
                        error: null,
                    })
                },

                setEnabled: (enabled: boolean) => {
                    const state = get()
                    Logger.info(`Health metrics feature ${enabled ? 'enabled' : 'disabled'}`)

                    set({ isEnabled: enabled })

                    // Clear data when disabled
                    if (!enabled) {
                        state.clearData()
                    }
                },

                setError: (error: string | null) => {
                    set({ error })
                },

                setSelectedCategory: (category: MetricCategory) => {
                    set({ selectedCategory: category })
                },

                getCache: (): HealthMetricsTokenCache => {
                    const state = get()
                    const cache = state.tokenCache

                    // Return existing cache if it matches current data timestamp
                    if (cache && cache.lastUpdated === state.lastUpdated) {
                        return cache
                    }

                    // If no data available, return empty cache
                    if (!state.formattedData || !state.formattedDailyData || !state.lastUpdated) {
                        const emptyCache: HealthMetricsTokenCache = {
                            lastUpdated: null,
                            formattedData_length: 0,
                            formattedDailyData_length: 0,
                        }
                        set((currentState) => ({ ...currentState, tokenCache: emptyCache }))
                        return emptyCache
                    }

                    // Calculate token counts
                    try {
                        const getTokenCount = Tokenizer.getTokenizer()
                        const formattedDataPrompt = state.formattedData.prompt
                        const formattedDailyDataPrompt = state.formattedDailyData.prompt

                        const newCache: HealthMetricsTokenCache = {
                            lastUpdated: state.lastUpdated,
                            formattedData_length: getTokenCount(formattedDataPrompt),
                            formattedDailyData_length: getTokenCount(formattedDailyDataPrompt),
                        }

                        // Update the cache in state
                        set((currentState) => ({ ...currentState, tokenCache: newCache }))
                        return newCache
                    } catch (err) {
                        Logger.error(`Failed to calculate token count: ${err}`)
                        const fallbackCache: HealthMetricsTokenCache = {
                            lastUpdated: state.lastUpdated,
                            formattedData_length: 0,
                            formattedDailyData_length: 0,
                        }
                        set((currentState) => ({ ...currentState, tokenCache: fallbackCache }))
                        return fallbackCache
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
                    selectedCategory: state.selectedCategory,
                    // Note: tokenCache is not persisted as it should be recalculated on app restart
                }),
                migrate: async (persistedState: any, version) => {
                    // Handle migration if needed in future versions
                },
            }
        )
    )
}
