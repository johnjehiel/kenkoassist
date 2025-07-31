import { initialize, requestPermission, readRecords } from 'react-native-health-connect'
import { Permission, RecordType } from 'react-native-health-connect/lib/typescript/types'
import { TimeRangeFilter } from 'react-native-health-connect/lib/typescript/types/base.types'
import { Platform } from 'react-native'
import { Logger } from '@lib/state/Logger'
import { customHealthData } from '@lib/constants/TestData'
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

const getUniqueRecordTypes = (): RecordType[] => {
    const recordTypes = new Set<RecordType>()
    METRICS.forEach((m) => recordTypes.add(m.type))
    return Array.from(recordTypes)
}

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

const readMetricSafely = async (
    type: RecordType,
    extract: (record: any) => number,
    key: string,
    operation: 'sum' | 'average' | undefined,
    filter: TimeRangeFilter,
    permissions: Permission[],
    signal?: AbortSignal
): Promise<{
    key: string
    timeSlotValues: Record<string, number | null>
    aggregatedValue: number | null
}> => {
    const hasRead = permissions.some((p) => p.recordType === type && p.accessType === 'read')
    if (!hasRead) {
        Logger.warn(`No read permission for ${type}`)
        return { key, timeSlotValues: {}, aggregatedValue: null }
    }

    try {
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

        if (signal?.aborted) {
            throw new Error(`Aborted reading ${type}`)
        }

        const recordsByTimeSlot: Record<string, any[]> = {}
        let totalValue = 0
        let recordCount = 0

        resp.records.forEach((rec) => {
            const record = rec as any
            const timestamp = record.startTime || record.time || record.endTime

            if (!timestamp) return

            const slotDate = new Date(timestamp)
            slotDate.setMinutes(Math.floor(slotDate.getMinutes() / 30) * 30, 0, 0)
            const slotString = slotDate.toISOString()

            if (!recordsByTimeSlot[slotString]) {
                recordsByTimeSlot[slotString] = []
            }

            recordsByTimeSlot[slotString].push(rec)

            const extracted = extract(rec)
            if (!isNaN(extracted) && extracted > 0) {
                totalValue += extracted
                recordCount++
            }
        })

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
}

export const fetchAndProcessHealthData = async (selectedCategory: MetricCategory) => {
    if (selectedCategory !== 'api') {
        // --- Logic for static test data ---
        let testData: Record<string, Record<string, number>> = customHealthData

        const now = new Date()
        Logger.debug(`Current time: ${now.toISOString()}`)
        const currentMinutes = now.getHours() * 60 + now.getMinutes()
        const endSlotMinutes = Math.floor(currentMinutes / 30) * 30
        const recentSlots: Record<string, Record<string, number | null>> = {}

        for (let i = 1; i <= 8; i++) {
            const slotMinutes = endSlotMinutes - i * 30
            let dayOffset = 0
            let adjustedMinutes = slotMinutes

            if (adjustedMinutes < 0) {
                adjustedMinutes += 24 * 60
                dayOffset = -1
            }

            const hour = Math.floor(adjustedMinutes / 60)
            const minute = adjustedMinutes % 60
            const lookupKey = `${hour.toString().padStart(2, '0')}:${minute
                .toString()
                .padStart(2, '0')}`
            const slotDate = new Date()
            slotDate.setDate(slotDate.getDate() + dayOffset)
            slotDate.setHours(hour, minute, 0, 0)
            const isoTimestamp = slotDate.toISOString()

            if (testData[lookupKey]) {
                recentSlots[isoTimestamp] = testData[lookupKey]
            }
        }

        const aggregatedSummary: Record<string, number | null> = {}
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
                aggregatedSummary[metricKey] = performRound(metricTotals[metricKey], metricKey)
            }
        })

        return { timeSlotHealthData: recentSlots, aggregatedHealthData: aggregatedSummary }
    }

    // --- Existing logic for Health Connect API ---
    if (Platform.OS !== 'android') {
        return null
    }

    try {
        const isInitialized = await initialize()
        if (!isInitialized) {
            throw new Error('Health Connect initialization failed')
        }

        const recordTypes = getUniqueRecordTypes()
        const perms: Permission[] = recordTypes.map((type) => ({
            accessType: 'read',
            recordType: type,
        }))
        const granted = await requestPermission(perms)

        if (granted.length === 0) {
            Logger.warn('No Health Connect permissions granted.')
            return null
        }

        const currentDate = new Date()
        const roundedDate = new Date(currentDate)
        roundedDate.setMinutes(Math.floor(roundedDate.getMinutes() / 30) * 30, 0, 0)
        const fourHoursAgo = new Date(roundedDate.getTime() - 4 * 60 * 60 * 1000)

        const filter: TimeRangeFilter = {
            operator: 'between',
            startTime: fourHoursAgo.toISOString(),
            endTime: roundedDate.toISOString(),
        }

        const batchSize = 5
        const results: {
            key: string
            timeSlotValues: Record<string, number | null>
            aggregatedValue: number | null
        }[] = []

        for (let i = 0; i < METRICS.length; i += batchSize) {
            const batch = METRICS.slice(i, i + batchSize)
            const batchPromises = batch.map(({ type, extract, key, operation }) =>
                readMetricSafely(type, extract, key, operation, filter, granted)
            )

            const batchResults = await Promise.all(batchPromises)
            results.push(...batchResults)
            await new Promise((resolve) => setTimeout(resolve, 100))
        }

        const timeSlotHealthData: Record<string, Record<string, number | null>> = {}
        const aggregatedHealthData: Record<string, number | null> = {}

        results.forEach(({ key, timeSlotValues, aggregatedValue }) => {
            aggregatedHealthData[key] = aggregatedValue
            Object.entries(timeSlotValues).forEach(([timestamp, value]) => {
                if (!timeSlotHealthData[timestamp]) {
                    timeSlotHealthData[timestamp] = {}
                }
                timeSlotHealthData[timestamp][key] = value
            })
        })

        return { timeSlotHealthData, aggregatedHealthData }
    } catch (err) {
        Logger.error(`Health data fetch error in service: ${err}`)
        return null
    }
}
