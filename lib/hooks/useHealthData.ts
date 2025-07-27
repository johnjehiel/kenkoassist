import { initialize, requestPermission, readRecords } from 'react-native-health-connect'
import { Permission, RecordType } from 'react-native-health-connect/lib/typescript/types'
import { TimeRangeFilter } from 'react-native-health-connect/lib/typescript/types/base.types'
import { useEffect, useState, useRef, useCallback } from 'react'
import { Platform } from 'react-native'
import { Logger } from '@lib/state/Logger'
import {
    testTimeSlotData_blood_glucose,
    testTimeSlotData_BP_fluctuations,
    testTimeSlotData_oxygen_saturation,
    testTimeSlotData_sleep,
    testTimeSlotData_training,
} from '@lib/constants/TestData'
import { HealthMetrics } from '@lib/state/HealthMetrics'
import { MetricCategory } from '@screens/HealthMetricsMenu/HealthMetricsWindow'

const METRICS: {
    type: RecordType
    // The 'any' type is used here for flexibility as different records have different structures.
    extract: (record: any) => number
    key: string
    operation?: 'sum' | 'average'
}[] = [
    // Already existing and correct
    { type: 'Steps', extract: (r) => r.count ?? 0, key: 'steps', operation: 'sum' },
    {
        type: 'Distance',
        extract: (r) => r.distance?.inMeters ?? 0,
        key: 'distance',
        operation: 'sum',
    },
    {
        type: 'Weight',
        extract: (r) => r.weight?.inKilograms ?? 0,
        key: 'weight',
        operation: 'average',
    },
    {
        type: 'Height',
        extract: (r) => r.height?.inMeters ?? 0,
        key: 'height',
        operation: 'average',
    },
    {
        type: 'Hydration',
        extract: (r) => r.volume?.inLiters ?? 0,
        key: 'hydration',
        operation: 'sum',
    },
    {
        type: 'BodyTemperature',
        extract: (r) => r.temperature?.inCelsius ?? 0,
        key: 'bodyTemperature',
        operation: 'average',
    },

    // Correctly defined for Systolic and Diastolic from the same record type
    {
        type: 'BloodPressure',
        extract: (r) => r.systolic?.inMillimetersOfMercury ?? 0,
        key: 'bloodPressureSystolic',
        operation: 'average',
    },
    {
        type: 'BloodPressure',
        extract: (r) => r.diastolic?.inMillimetersOfMercury ?? 0,
        key: 'bloodPressureDiastolic',
        operation: 'average',
    },

    // Cardiovascular Health
    {
        type: 'HeartRate',
        extract: (r) => r.samples[0]?.beatsPerMinute ?? 0,
        key: 'heartRate',
        operation: 'average',
    },
    {
        type: 'RestingHeartRate',
        extract: (r) => r.beatsPerMinute ?? 0,
        key: 'restingHeartRate',
        operation: 'average',
    },
    {
        type: 'HeartRateVariabilityRmssd',
        extract: (r) => r.interbeatInterval?.inMilliseconds ?? 0,
        key: 'heartRateVariability',
        operation: 'average',
    },

    // Physical Activity
    // { type: 'ActiveCaloriesBurned', extract: r => r.energy?.inKilocalories ?? 0, key: 'activeCalories', operation: 'sum' },
    {
        type: 'TotalCaloriesBurned',
        extract: (r) => r.energy?.inKilocalories ?? 0,
        key: 'totalCalories',
        operation: 'sum',
    },

    // Metabolic & Vital Signs
    {
        type: 'BasalBodyTemperature',
        extract: (r) => r.temperature?.inCelsius ?? 0,
        key: 'basalBodyTemperature',
        operation: 'average',
    },
    {
        type: 'BloodGlucose',
        extract: (r) => r.level?.inMilligramsPerDeciliter ?? 0,
        key: 'bloodGlucose',
        operation: 'average',
    },

    // Respiratory Fitness
    {
        type: 'RespiratoryRate',
        extract: (r) => r.rate ?? 0,
        key: 'respiratoryRate',
        operation: 'average',
    },
    {
        type: 'OxygenSaturation',
        extract: (r) => r.percentage ?? 0,
        key: 'oxygenSaturation',
        operation: 'average',
    },

    // Sleep & Recovery
    {
        type: 'SleepSession',
        // Calculates the duration of the sleep session in hours
        extract: (r) => {
            const start = new Date(r.startTime)
            const end = new Date(r.endTime)
            const durationInMillis = end.getTime() - start.getTime()
            return durationInMillis / (1000 * 60 * 60) // Convert milliseconds to hours
        },
        key: 'sleepSessions',
        operation: 'sum', // Summing the duration of all sleep sessions for the day
    },
]

// Interface for time-slotted health data structure
interface TimeSlotHealthData {
    [timestamp: string]: Record<string, number | null>
}

// Legacy type for compatibility (now represents 4-hour summary)
type HealthData = Record<string, number | null>

interface FetchState {
    isInitializing: boolean
    isFetching: boolean
    lastFetchAttempt: number
}

export default function useHealthData() {
    const [permissions, setPermissions] = useState<Permission[]>([])
    // This state now holds time-slotted data, not daily.
    const [timeSlotData, setTimeSlotData] = useState<TimeSlotHealthData>({})
    // This state now holds the 4-hour aggregated summary.
    const [aggregatedData, setAggregatedData] = useState<HealthData>({})
    const [isLoading, setIsLoading] = useState<boolean>(true)
    const [isRefreshing, setIsRefreshing] = useState<boolean>(false)
    const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
    const [error, setError] = useState<string | null>(null)

    const isMountedRef = useRef(true)
    const abortControllerRef = useRef<AbortController | null>(null)
    const fetchStateRef = useRef<FetchState>({
        isInitializing: false,
        isFetching: false,
        lastFetchAttempt: 0,
    })

    useEffect(() => {
        return () => {
            // Cleanup on unmount
            isMountedRef.current = false
            if (abortControllerRef.current) {
                abortControllerRef.current.abort()
            }
        }
    }, [])

    // Get unique record types (since BloodPressure is used twice)
    const getUniqueRecordTypes = useCallback((): RecordType[] => {
        const recordTypes = new Set<RecordType>()
        METRICS.forEach((m) => recordTypes.add(m.type))
        return Array.from(recordTypes)
    }, [])

    // Initialize Health Connect and request permissions
    const initializeHealthConnect = useCallback(async () => {
        if (Platform.OS !== 'android' || fetchStateRef.current.isInitializing) {
            return
        }

        fetchStateRef.current.isInitializing = true

        try {
            setError(null)

            const isInitialized = await initialize()
            if (!isInitialized) {
                throw new Error('Health Connect initialization failed')
            }

            if (!isMountedRef.current) return

            // Get unique record types to avoid duplicate permissions
            const recordTypes = getUniqueRecordTypes()

            // Assemble permissions array dynamically
            const perms: Permission[] = [
                ...recordTypes.map((type) => ({ accessType: 'read' as const, recordType: type })),
            ]

            const granted = await requestPermission(perms)

            if (!isMountedRef.current) return

            setPermissions(granted)
            Logger.info(`Health Connect permissions granted: ${granted.length}`)
        } catch (err) {
            Logger.error(`Health Connect initialization error: ${err}`)
            if (isMountedRef.current) {
                setError(err instanceof Error ? err.message : 'Unknown initialization error')
            }
        } finally {
            fetchStateRef.current.isInitializing = false
            if (isMountedRef.current) {
                setIsLoading(false)
            }
        }
    }, [getUniqueRecordTypes])

    // Initialize on mount
    useEffect(() => {
        if (Platform.OS === 'android') {
            initializeHealthConnect()
        } else {
            setIsLoading(false)
        }
    }, [initializeHealthConnect])

    const performRound = (value: number, key: string): number | null => {
        if (value <= 0) return null
        switch (key) {
            case 'steps':
            case 'heartRate':
            case 'bloodPressureSystolic':
            case 'bloodPressureDiastolic':
            case 'respiratoryRate':
                return Math.round(value) // Round to nearest integer for these metrics
            default:
                return value // Return as is for others
        }
    }

    // Helper function with proper error handling and timeout
    const readMetricSafely = useCallback(
        async (
            type: RecordType,
            extract: (record: any) => number,
            key: string,
            operation: 'sum' | 'average' | undefined,
            filter: TimeRangeFilter,
            permissions: Permission[],
            signal?: AbortSignal
        ): Promise<{
            key: string
            // This now returns values per time slot
            timeSlotValues: Record<string, number | null>
            aggregatedValue: number | null
        }> => {
            const hasRead = permissions.some(
                (p) => p.recordType === type && p.accessType === 'read'
            )
            if (!hasRead) {
                Logger.warn(`No read permission for ${type}`)
                return { key, timeSlotValues: {}, aggregatedValue: null }
            }

            try {
                // Add timeout to prevent hanging
                const timeoutPromise = new Promise<never>((_, reject) => {
                    const timeoutId = setTimeout(() => {
                        reject(new Error(`Timeout reading ${type}`))
                    }, 10000) // 10 second timeout

                    if (signal) {
                        signal.addEventListener('abort', () => {
                            clearTimeout(timeoutId)
                            reject(new Error(`Aborted reading ${type}`))
                        })
                    }
                })

                const readPromise = readRecords(type, { timeRangeFilter: filter })
                const resp = await Promise.race([readPromise, timeoutPromise])
                // console.log(`Read ${type} records:`, resp.records);

                if (signal?.aborted) {
                    throw new Error(`Aborted reading ${type}`)
                }

                // Group records by 30-minute time slots
                const recordsByTimeSlot: Record<string, any[]> = {}
                let totalValue = 0
                let recordCount = 0

                resp.records.forEach((rec) => {
                    // Extract date from record timestamp - records have different timestamp properties based on type
                    // Cast to any to access common timestamp properties
                    const record = rec as any
                    const timestamp = record.startTime || record.time || record.endTime

                    if (!timestamp) return

                    // Calculate the start of the 30-minute slot for this record
                    const slotDate = new Date(timestamp)
                    slotDate.setMinutes(Math.floor(slotDate.getMinutes() / 30) * 30, 0, 0)
                    const slotString = slotDate.toISOString()

                    if (!recordsByTimeSlot[slotString]) {
                        recordsByTimeSlot[slotString] = []
                    }

                    recordsByTimeSlot[slotString].push(rec)
                    // console.log(`Processing record for ${date}:`, rec);

                    // Also calculate total for aggregated value
                    const extracted = extract(rec)
                    if (!isNaN(extracted) && extracted > 0) {
                        totalValue += extracted
                        recordCount++
                    }
                })

                // Calculate values for each time slot based on operation type
                const timeSlotValues: Record<string, number | null> = {}
                Object.entries(recordsByTimeSlot).forEach(([slot, records]) => {
                    if (records.length === 0) {
                        timeSlotValues[slot] = null
                        return
                    }

                    const slotTotal = records.reduce((acc, rec) => {
                        const extracted = extract(rec)
                        return acc + (extracted > 0 ? extracted : 0)
                    }, 0)

                    if (slotTotal <= 0) {
                        timeSlotValues[slot] = null
                    } else if (operation === 'average') {
                        timeSlotValues[slot] = performRound(slotTotal / records.length, key)
                    } else {
                        timeSlotValues[slot] = performRound(slotTotal, key)
                    }
                })

                // Calculate aggregated value over the entire 4-hour period
                let aggregatedValue: number | null = null
                if (recordCount > 0 && totalValue > 0) {
                    aggregatedValue =
                        operation === 'average'
                            ? performRound(totalValue / recordCount, key)
                            : performRound(totalValue, key)
                }

                return {
                    key,
                    timeSlotValues,
                    aggregatedValue,
                }
            } catch (err) {
                Logger.warn(`Error reading ${type}: ${err}`)
                return { key, timeSlotValues: {}, aggregatedValue: null }
            }
        },
        []
    )

    const fetchHealthData = useCallback(
        async (testDataCategory: MetricCategory) => {
            if (testDataCategory !== 'api') {
                // --- NEW LOGIC FOR STATIC, CIRCULAR TEST DATA ---

                let testData: Record<string, Record<string, number>> = {}
                // Select the correct set of test data
                switch (testDataCategory) {
                    case 'sleep':
                        testData = testTimeSlotData_sleep
                        break
                    case 'training':
                        testData = testTimeSlotData_training
                        break
                    case 'bp':
                        testData = testTimeSlotData_BP_fluctuations
                        break
                    case 'glucose':
                        testData = testTimeSlotData_blood_glucose
                        break
                    case 'oxygen':
                        testData = testTimeSlotData_oxygen_saturation
                        break
                }
                Logger.debug(`Test data: ${JSON.stringify(testData, null, 2)}`)

                const now = new Date()
                const currentMinutes = now.getHours() * 60 + now.getMinutes()
                // Round down to the nearest 30-minute slot
                const endSlotMinutes = Math.floor(currentMinutes / 30) * 30
                Logger.debug(`currentMinutes: ${currentMinutes}, endSlotMinutes: ${endSlotMinutes}`)
                const recentSlots: TimeSlotHealthData = {}

                // Get the 8 most recent 30-minute slots (4 hours)
                for (let i = 1; i <= 8; i++) {
                    const slotMinutes = endSlotMinutes - i * 30

                    let dayOffset = 0
                    let adjustedMinutes = slotMinutes

                    // Handle wrapping around to the previous day
                    if (adjustedMinutes < 0) {
                        adjustedMinutes += 24 * 60 // Add a day's worth of minutes
                        dayOffset = -1 // It's yesterday
                    }

                    const hour = Math.floor(adjustedMinutes / 60)
                    const minute = adjustedMinutes % 60

                    // Format the key for lookup in our static testData (e.g., "14:30")
                    const lookupKey = `${hour.toString().padStart(2, '0')}:${minute
                        .toString()
                        .padStart(2, '0')}`

                    // Create a full, dynamic ISO timestamp for this slot
                    const slotDate = new Date()
                    slotDate.setDate(slotDate.getDate() + dayOffset)
                    slotDate.setHours(hour, minute, 0, 0) // Set to the precise slot time
                    const isoTimestamp = slotDate.toISOString()

                    if (testData[lookupKey]) {
                        recentSlots[isoTimestamp] = testData[lookupKey]
                    }
                }

                // --- AGGREGATION LOGIC (largely unchanged) ---
                const aggregatedSummary: HealthData = {}
                const metricTotals: Record<string, number> = {}
                const metricCounts: Record<string, number> = {}

                Object.values(recentSlots).forEach((slotData) => {
                    Object.entries(slotData).forEach(([metricKey, value]) => {
                        if (value !== null && value > 0) {
                            metricTotals[metricKey] = (metricTotals[metricKey] || 0) + value
                            metricCounts[metricKey] = (metricCounts[metricKey] || 0) + 1
                        }
                    })
                })

                Object.keys(metricTotals).forEach((metricKey) => {
                    const metricInfo = METRICS.find((m) => m.key === metricKey)
                    if (metricInfo?.operation === 'average') {
                        aggregatedSummary[metricKey] = performRound(
                            metricTotals[metricKey] / metricCounts[metricKey],
                            metricKey
                        )
                    } else {
                        // 'sum' or undefined
                        aggregatedSummary[metricKey] = performRound(
                            metricTotals[metricKey],
                            metricKey
                        )
                    }
                })

                setTimeSlotData(recentSlots)
                setAggregatedData(aggregatedSummary)
                setLastUpdated(new Date())
                setIsLoading(false)
                setIsRefreshing(false)
                return
            }

            // If not using test data, proceed with fetching from Health Connect
            if (Platform.OS !== 'android' || permissions.length === 0) {
                setIsLoading(false)
                setIsRefreshing(false)
                return
            }

            // Prevent concurrent fetches
            const now = Date.now()
            if (
                fetchStateRef.current.isFetching ||
                now - fetchStateRef.current.lastFetchAttempt < 2000
            ) {
                setIsLoading(false)
                setIsRefreshing(false)
                return
            }

            fetchStateRef.current.isFetching = true
            fetchStateRef.current.lastFetchAttempt = now

            // Cancel any previous fetch
            if (abortControllerRef.current) {
                abortControllerRef.current.abort()
            }

            // Create new abort controller
            abortControllerRef.current = new AbortController()
            const signal = abortControllerRef.current.signal

            try {
                setError(null)

                const currentDate = new Date()

                // Round down to the previous 30-minute mark
                const roundedDate = new Date(currentDate)
                roundedDate.setMinutes(Math.floor(roundedDate.getMinutes() / 30) * 30, 0, 0)

                // Calculate 4 hours before the rounded time
                const fourHoursAgo = new Date(roundedDate.getTime() - 4 * 60 * 60 * 1000)

                const filter: TimeRangeFilter = {
                    operator: 'between',
                    startTime: fourHoursAgo.toISOString(),
                    endTime: roundedDate.toISOString(),
                }

                Logger.debug(
                    `Health data time range: ${fourHoursAgo.toLocaleTimeString()} to ${roundedDate.toLocaleTimeString()}`
                )

                // Process metrics in smaller batches to reduce binding stress
                const batchSize = 5
                const results: {
                    key: string
                    timeSlotValues: Record<string, number | null>
                    aggregatedValue: number | null
                }[] = []

                // Process metrics in batches
                for (let i = 0; i < METRICS.length; i += batchSize) {
                    if (signal.aborted || !isMountedRef.current) break

                    const batch = METRICS.slice(i, i + batchSize)
                    const batchPromises = batch.map(({ type, extract, key, operation }) =>
                        readMetricSafely(type, extract, key, operation, filter, permissions, signal)
                    )

                    const batchResults = await Promise.all(batchPromises)
                    results.push(...batchResults)

                    // Small delay between batches to prevent overwhelming the binding
                    await new Promise((resolve) => setTimeout(resolve, 100))
                }

                if (signal.aborted || !isMountedRef.current) {
                    setIsLoading(false)
                    setIsRefreshing(false)
                    return
                }

                // Process time-slotted data
                const timeSlotHealthData: TimeSlotHealthData = {}
                const aggregatedHealthData: HealthData = {}

                results.forEach(({ key, timeSlotValues, aggregatedValue }) => {
                    // Store aggregated value for the 4-hour summary
                    aggregatedHealthData[key] = aggregatedValue

                    // Store time-slotted values by timestamp
                    Object.entries(timeSlotValues).forEach(([timestamp, value]) => {
                        if (!timeSlotHealthData[timestamp]) {
                            timeSlotHealthData[timestamp] = {}
                        }
                        timeSlotHealthData[timestamp][key] = value
                    })
                })

                setTimeSlotData(timeSlotHealthData)
                setAggregatedData(aggregatedHealthData)
                setLastUpdated(new Date())
            } catch (err) {
                if (!signal.aborted) {
                    Logger.error(`Health data fetch error: ${err}`)
                    if (isMountedRef.current) {
                        setError(err instanceof Error ? err.message : 'Unknown fetch error')
                    }
                }
            } finally {
                fetchStateRef.current.isFetching = false
                if (isMountedRef.current) {
                    setIsLoading(false)
                    setIsRefreshing(false)
                }
            }
        },
        [permissions, readMetricSafely]
    )

    // Initial data fetch when permissions are available
    useEffect(() => {
        if (permissions.length > 0 && !fetchStateRef.current.isFetching) {
            // Get the stored category from HealthMetrics state
            const { selectedCategory } = HealthMetrics.useHealthMetricsState.getState()
            // Use the stored category or fall back to 'sleep' if not available
            fetchHealthData(selectedCategory || 'sleep')
        }
    }, [permissions, fetchHealthData])

    // Refresh function with debouncing
    const refreshData = useCallback(
        (testDataCategory: MetricCategory) => {
            if (fetchStateRef.current.isFetching) {
                Logger.warn('Fetch already in progress, skipping refresh')
                return
            }

            setIsRefreshing(true)
            fetchHealthData(testDataCategory)
        },
        [fetchHealthData]
    )

    Logger.debug(
        `Health data: ${Object.keys(timeSlotData).length} time slot entries, ${Object.keys(aggregatedData).length} metrics loaded`
    )

    return {
        dailyData: timeSlotData,
        data: aggregatedData, // For backward compatibility (now 4-hour summary)
        permissions,
        isLoading,
        isRefreshing,
        refreshData,
        lastUpdated,
        error,
    }
}
