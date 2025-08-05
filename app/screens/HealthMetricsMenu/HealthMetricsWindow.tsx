import { Theme } from '@lib/theme/ThemeManager'
import React, { useEffect, useMemo, useCallback, useState } from 'react'
import { Text, View, ActivityIndicator, Platform, Alert, TouchableOpacity } from 'react-native'

import ThemedButton from '@components/buttons/ThemedButton'
import DropdownSheet from '@components/input/DropdownSheet'

import useHealthData from '@lib/hooks/useHealthData'
import { HealthMetrics } from '@lib/state/HealthMetrics'
import { healthCategories, labelMap, unitsMap } from '@lib/constants/HealthMetricsData'
import { analyzeLatestHealthData } from '@lib/services/HealthAnalyzer'
import { useMMKVBoolean } from 'react-native-mmkv'
import { AppSettings } from '@lib/constants/GlobalValues'

export type MetricCategory = 'custom' | 'api'

const TEST_DATA_CATEGORIES: { id: MetricCategory; label: string }[] = [
    { id: 'custom', label: 'Custom' },
    { id: 'api', label: 'Default' },
]

const HealthMetricsWindow = () => {
    const {
        data,
        dailyData,
        permissions,
        isLoading,
        isRefreshing,
        refreshData,
        lastUpdated,
        error: hookError,
    } = useHealthData()

    const {
        data: storedData,
        dailyData: storedDailyData,
        updateData,
        lastUpdated: storeLastUpdated,
        isEnabled,
        error: storeError,
        setError,
        clearData,
        selectedCategory: storedCategory,
        setSelectedCategory,
    } = HealthMetrics.useHealthMetricsState()

    const { spacing, color, fontSize } = Theme.useTheme()

    // View mode state (daily or aggregate)
    const [viewMode, setViewMode] = useState<'daily' | 'aggregate'>('daily')

    // State for health analysis loading
    const [isAnalyzing, setIsAnalyzing] = useState(false)

    // Use stored category with fallback to 'custom'
    const [testDataCategory, setLocalTestDataCategory] = useState<MetricCategory>(
        storedCategory || 'custom'
    )

    // Sync with stored category if it changes
    useEffect(() => {
        if (storedCategory && testDataCategory !== storedCategory) {
            setLocalTestDataCategory(storedCategory)
        }
    }, [storedCategory])

    // Update both local and global state
    const setTestDataCategory = useCallback(
        (category: MetricCategory) => {
            setLocalTestDataCategory(category)
            setSelectedCategory(category)
        },
        [setSelectedCategory]
    )

    // Consolidated useEffect for all data management
    useEffect(() => {
        if (!isEnabled) {
            clearData()
            return
        }

        // Update store when new data arrives
        if (data && dailyData && Object.keys(data).length > 0) {
            updateData(data, dailyData, lastUpdated)
        }

        // Handle hook errors
        if (hookError) {
            setError(hookError)
        }
    }, [isEnabled, data, dailyData, lastUpdated, hookError, updateData, setError, clearData])

    // Update initial data fetch to use the stored category
    useEffect(() => {
        if (isEnabled && permissions.length > 0 && !isLoading && !isRefreshing) {
            refreshData(testDataCategory)
        }
    }, [isEnabled, permissions.length, refreshData, testDataCategory])

    // Use stored data if available and feature enabled, otherwise hook data
    const displayData = useMemo(
        () => (isEnabled && Object.keys(storedData).length > 0 ? storedData : data),
        [storedData, data, isEnabled]
    )

    // Use stored daily data (now time-slotted) if available and feature enabled, otherwise hook daily data
    const displayDailyData = useMemo(
        () =>
            isEnabled && Object.keys(storedDailyData || {}).length > 0
                ? storedDailyData
                : dailyData,
        [storedDailyData, dailyData, isEnabled]
    )

    // Get sorted time slots for display, renaming 'sortedDates'
    const sortedTimeSlots = useMemo(
        () =>
            Object.keys(displayDailyData || {}).sort(
                // The logic remains the same, as keys are ISO timestamps
                (a, b) => new Date(b).getTime() - new Date(a).getTime()
            ),
        [displayDailyData]
    )

    // Find the currently selected test data category object
    const selectedCategory = useMemo(
        () =>
            TEST_DATA_CATEGORIES.find((cat) => cat.id === testDataCategory) ||
            TEST_DATA_CATEGORIES[0],
        [testDataCategory]
    )

    const handleRefresh = useCallback(
        (category: MetricCategory) => {
            if (!isEnabled) {
                Alert.alert(
                    'Feature Disabled',
                    'Health Metrics feature is disabled. Please enable it in Settings to refresh data.',
                    [{ text: 'OK' }]
                )
                return
            }

            // Clear errors before refreshing
            if (storeError || hookError) {
                setError(null)
            }

            refreshData(category)
        },
        [refreshData, isEnabled, storeError, hookError, setError]
    )

    // Helper function to format metric value
    const formatMetricValue = useCallback(
        (value: number | null, unit: string, label: string): string => {
            if (value === null || value === undefined || value < 0) return 'N/A'

            const formatted =
                label === 'Steps' ||
                label === 'Heart Rate' ||
                label === 'BP Systolic' ||
                label === 'BP Diastolic' ||
                label == 'Breathing Rate'
                    ? value.toString()
                    : typeof value === 'number'
                      ? value.toFixed(2)
                      : String(value)
            return unit ? `${formatted} ${unit}` : formatted
        },
        []
    )

    // Render individual metric
    const renderMetric = useCallback(
        (metricKey: string, value: number | null) => {
            const label = labelMap[metricKey] || metricKey
            const unit = unitsMap[metricKey] || ''
            const formattedValue = formatMetricValue(value, unit, label)

            return (
                <View
                    key={metricKey}
                    style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        paddingVertical: spacing.xs,
                        paddingHorizontal: spacing.sm,
                        backgroundColor: color.primary._100,
                        borderRadius: 8,
                        marginVertical: spacing.xs / 2,
                    }}>
                    <Text
                        style={{
                            color: color.text._300,
                            fontSize: fontSize.m,
                            flex: 1,
                        }}>
                        {label}
                    </Text>
                    <Text
                        style={{
                            color: value !== null && value > 0 ? color.text._200 : color.text._400,
                            fontSize: fontSize.m,
                            fontWeight: '600',
                            textAlign: 'right',
                        }}>
                        {formattedValue}
                    </Text>
                </View>
            )
        },
        [formatMetricValue, spacing, color, fontSize]
    )

    const renderCategory = useCallback(
        (categoryKey: string, categoryInfo: any) => {
            const categoryMetrics = categoryInfo.metrics.filter(
                (metricKey: string) =>
                    displayData[metricKey] !== null &&
                    displayData[metricKey] !== undefined &&
                    displayData[metricKey] > 0
            )

            if (categoryMetrics.length === 0) return null

            return (
                <View key={categoryKey} style={{ marginBottom: spacing.m }}>
                    <Text
                        style={{
                            fontSize: fontSize.l,
                            fontWeight: 'bold',
                            color: color.text._100,
                            marginBottom: spacing.xs,
                        }}>
                        {categoryInfo.name}
                    </Text>

                    {categoryMetrics.map((metricKey: string) =>
                        renderMetric(metricKey, displayData[metricKey])
                    )}
                </View>
            )
        },
        [displayData, renderMetric, spacing, color, fontSize]
    )

    // Render metrics for a specific time slot
    const renderTimeSlotMetrics = useCallback(
        (timestamp: string) => {
            const slotData = displayDailyData?.[timestamp]
            if (!slotData) return null

            // Find metrics that have data for this day
            const availableMetrics = Object.keys(slotData).filter(
                (key) => slotData[key] !== null && slotData[key] !== undefined && slotData[key] > 0
            )

            if (availableMetrics.length === 0) return null

            // Format the time range label
            const startTime = new Date(timestamp)
            const endTime = new Date(startTime.getTime() + 30 * 60 * 1000) // 30 minutes later
            const timeFormat: Intl.DateTimeFormatOptions = {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true,
            }
            const timeRangeLabel = `${startTime.toLocaleTimeString(
                'en-US',
                timeFormat
            )} - ${endTime.toLocaleTimeString('en-US', timeFormat)}`

            // Include the date if it's not today
            const today = new Date()
            const slotDate = new Date(timestamp)
            const dateLabel =
                slotDate.toDateString() === today.toDateString()
                    ? ''
                    : slotDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

            const fullLabel = `${dateLabel} ${timeRangeLabel}`.trim()

            return (
                <View
                    key={timestamp}
                    style={{
                        marginBottom: spacing.m,
                        backgroundColor: color.primary._100,
                        borderRadius: 8,
                        padding: spacing.sm,
                    }}>
                    <Text
                        style={{
                            fontSize: fontSize.l,
                            fontWeight: 'bold',
                            color: color.text._100,
                            marginBottom: spacing.sm,
                            textAlign: 'center',
                        }}>
                        {fullLabel}
                    </Text>

                    {Object.entries(healthCategories).map(([categoryKey, categoryInfo]) => {
                        // Filter metrics in this category that have data for this day
                        const categoryMetrics = categoryInfo.metrics.filter(
                            (metricKey) =>
                                slotData[metricKey] !== null &&
                                slotData[metricKey] !== undefined &&
                                slotData[metricKey] > 0
                        )

                        if (categoryMetrics.length === 0) return null

                        return (
                            <View key={categoryKey} style={{ marginBottom: spacing.xs }}>
                                <Text
                                    style={{
                                        fontSize: fontSize.m,
                                        fontWeight: 'bold',
                                        color: color.text._100,
                                        marginBottom: spacing.xs / 2,
                                    }}>
                                    {categoryInfo.name}
                                </Text>

                                {categoryMetrics.map((metricKey) => {
                                    const value = slotData[metricKey]
                                    const label = labelMap[metricKey] || metricKey
                                    const unit = unitsMap[metricKey] || ''
                                    const formattedValue = formatMetricValue(value, unit, label)

                                    return (
                                        <View
                                            key={metricKey}
                                            style={{
                                                flexDirection: 'row',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                paddingVertical: spacing.xs / 2,
                                                paddingHorizontal: spacing.sm,
                                                backgroundColor: color.primary._100,
                                                borderRadius: 8,
                                                marginVertical: spacing.xs / 4,
                                            }}>
                                            <Text
                                                style={{
                                                    fontSize: fontSize.s,
                                                    color: color.text._100,
                                                }}>
                                                {label}
                                            </Text>
                                            <Text
                                                style={{
                                                    fontSize: fontSize.s,
                                                    fontWeight: 'bold',
                                                    color: color.text._100,
                                                }}>
                                                {formattedValue}
                                            </Text>
                                        </View>
                                    )
                                })}
                            </View>
                        )
                    })}
                </View>
            )
        },
        [displayDailyData, spacing, color, fontSize, formatMetricValue]
    )

    const handleAnalyzeHealthData = async () => {
        if (!isEnabled) {
            Alert.alert(
                'Feature Disabled',
                'Health Metrics feature is disabled. Please enable it in Settings to analyze data.',
                [{ text: 'OK' }]
            )
            return
        }

        setIsAnalyzing(true)
        try {
            await analyzeLatestHealthData()
        } catch (error) {
            Alert.alert('Analysis Failed', `Failed to analyze health data: ${error}`, [
                { text: 'OK' },
            ])
        } finally {
            setIsAnalyzing(false)
        }
    }

    // Early returns for different states
    if (!isEnabled) {
        return (
            <View
                style={{
                    rowGap: spacing.sm,
                    alignItems: 'center',
                    paddingVertical: spacing.xl,
                }}>
                <Text
                    style={{
                        color: color.text._300,
                        fontSize: fontSize.m,
                        textAlign: 'center',
                        marginBottom: spacing.m,
                    }}>
                    Health Metrics Feature Disabled
                </Text>
                <Text
                    style={{
                        color: color.text._200,
                        fontSize: fontSize.s,
                        textAlign: 'center',
                        paddingHorizontal: spacing.xl,
                    }}>
                    Enable Health Metrics in Settings to view your health data
                </Text>
            </View>
        )
    }

    if (Platform.OS !== 'android') {
        return (
            <View
                style={{
                    rowGap: spacing.sm,
                    alignItems: 'center',
                    paddingVertical: spacing.xl,
                }}>
                <Text
                    style={{
                        color: color.text._300,
                        fontSize: fontSize.m,
                        textAlign: 'center',
                    }}>
                    Health Metrics is only available on Android devices with Health Connect
                </Text>
            </View>
        )
    }

    // Loading indicator for initial data fetch
    if (permissions.length === 0 || isLoading) {
        return (
            <View
                style={{
                    rowGap: spacing.sm,
                    alignItems: 'center',
                    paddingVertical: spacing.xl,
                }}>
                <ActivityIndicator size="large" color={color.primary._300} />
                <Text
                    style={{
                        color: color.text._300,
                        fontSize: fontSize.m,
                        textAlign: 'center',
                    }}>
                    {permissions.length === 0
                        ? 'Requesting Health Permissions...'
                        : 'Loading health data...'}
                </Text>
            </View>
        )
    }

    const currentError = storeError || hookError
    if (currentError) {
        return (
            <View style={{ rowGap: spacing.sm }}>
                <View
                    style={{
                        backgroundColor: color.primary._100,
                        padding: spacing.m,
                        borderRadius: 8,
                        borderLeftWidth: 4,
                        borderLeftColor: '#ef4444',
                        marginBottom: spacing.m,
                    }}>
                    <Text
                        style={{
                            color: '#ef4444',
                            fontSize: fontSize.m,
                            fontWeight: '600',
                            marginBottom: spacing.xs,
                        }}>
                        Error Loading Health Data
                    </Text>
                    <Text
                        style={{
                            color: color.text._300,
                            fontSize: fontSize.s,
                        }}>
                        {currentError}
                    </Text>
                </View>

                <ThemedButton
                    label={isRefreshing ? 'Retrying...' : 'Retry'}
                    onPress={() => handleRefresh(testDataCategory)}
                    iconName="reload1"
                    disabled={isRefreshing}
                />

                <View style={{ paddingVertical: spacing.xl3 }} />
            </View>
        )
    }

    const hasData = Object.keys(displayData).length > 0
    const lastUpdateTime = storeLastUpdated || (lastUpdated ? lastUpdated.toISOString() : null)

    return (
        <View style={{ rowGap: spacing.sm }}>
            <View
                style={{
                    backgroundColor: color.primary._100,
                    padding: spacing.sm,
                    borderRadius: 8,
                }}>
                <Text
                    style={{
                        color: color.text._100,
                        fontSize: fontSize.l,
                        fontWeight: '700',
                        textAlign: 'center',
                    }}>
                    Health Metrics
                </Text>
            </View>

            {/* Test Data Category Selector */}
            <View
                style={{
                    backgroundColor: color.neutral._100,
                    borderRadius: 8,
                    padding: spacing.sm,
                    marginVertical: spacing.xs,
                    marginTop: spacing.l,
                }}>
                <DropdownSheet
                    data={TEST_DATA_CATEGORIES}
                    selected={selectedCategory}
                    onChangeValue={(category) => {
                        const categoryType = category.id as MetricCategory
                        setTestDataCategory(categoryType)
                        handleRefresh(categoryType)
                    }}
                    labelExtractor={(item) => item.label}
                    placeholder="Select Data"
                    modalTitle="Select Data"
                    style={{
                        backgroundColor: color.primary._100,
                        borderRadius: 8,
                    }}
                />
            </View>

            {/* Tab buttons to switch between detailed and summary views */}
            <View
                style={{
                    flexDirection: 'row',
                    backgroundColor: color.neutral._100,
                    borderRadius: 8,
                    marginVertical: spacing.xs,
                }}>
                <TouchableOpacity
                    style={{
                        flex: 1,
                        padding: spacing.sm,
                        backgroundColor: viewMode === 'daily' ? color.primary._300 : 'transparent',
                        borderRadius: 8,
                        alignItems: 'center',
                    }}
                    onPress={() => setViewMode('daily')}>
                    <Text
                        style={{
                            fontSize: fontSize.m,
                            fontWeight: viewMode === 'daily' ? 'bold' : 'normal',
                            color: viewMode === 'daily' ? color.text._900 : color.text._100,
                        }}>
                        Time Slot View
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={{
                        flex: 1,
                        padding: spacing.sm,
                        backgroundColor:
                            viewMode === 'aggregate' ? color.primary._300 : 'transparent',
                        borderRadius: 8,
                        alignItems: 'center',
                    }}
                    onPress={() => setViewMode('aggregate')}>
                    <Text
                        style={{
                            fontSize: fontSize.m,
                            fontWeight: viewMode === 'aggregate' ? 'bold' : 'normal',
                            color: viewMode === 'aggregate' ? color.text._900 : color.text._100,
                        }}>
                        4-Hour Summary
                    </Text>
                </TouchableOpacity>
            </View>

            {hasData ? (
                viewMode === 'daily' ? (
                    // Time slot metrics view
                    <View style={{ paddingBottom: spacing.xs }}>
                        {sortedTimeSlots.length > 0 ? (
                            sortedTimeSlots.map((timestamp) => renderTimeSlotMetrics(timestamp))
                        ) : (
                            <View
                                style={{
                                    alignItems: 'center',
                                    paddingVertical: spacing.xl,
                                }}>
                                <Text
                                    style={{
                                        color: color.text._300,
                                        fontSize: fontSize.m,
                                        textAlign: 'center',
                                    }}>
                                    No health metrics available for the last 4 hours.
                                </Text>
                            </View>
                        )}
                    </View>
                ) : (
                    // 4-Hour Summary (aggregate) view
                    <View style={{ paddingBottom: spacing.xs }}>
                        {Object.entries(healthCategories).map(([categoryKey, categoryInfo]) =>
                            renderCategory(categoryKey, categoryInfo)
                        )}
                    </View>
                )
            ) : (
                <View
                    style={{
                        alignItems: 'center',
                        paddingVertical: spacing.xl2,
                    }}>
                    <Text
                        style={{
                            color: color.text._300,
                            fontSize: fontSize.m,
                            textAlign: 'center',
                            marginBottom: spacing.m,
                        }}>
                        No health data available
                    </Text>
                    <Text
                        style={{
                            color: color.text._200,
                            fontSize: fontSize.s,
                            textAlign: 'center',
                            paddingHorizontal: spacing.xl,
                            marginBottom: spacing.m,
                        }}>
                        Try refreshing to fetch your latest health metrics from Health Connect
                    </Text>

                    {permissions.length > 0 && (
                        <Text
                            style={{
                                color: color.text._200,
                                fontSize: fontSize.s,
                                textAlign: 'center',
                                paddingHorizontal: spacing.xl,
                            }}>
                            Make sure you have recent health data in Health Connect and that the app
                            has the necessary permissions.
                        </Text>
                    )}
                </View>
            )}

            <View style={{ paddingVertical: spacing.xs }} />
            {lastUpdateTime && (
                <View
                    style={{
                        backgroundColor: color.neutral._100,
                        padding: spacing.sm,
                        borderRadius: 8,
                    }}>
                    <Text
                        style={{
                            color: color.text._400,
                            fontSize: fontSize.s,
                            textAlign: 'center',
                        }}>
                        Last Updated: {new Date(lastUpdateTime).toLocaleString()}
                    </Text>
                </View>
            )}

            <ThemedButton
                label={isRefreshing ? 'Refreshing...' : 'Refresh'}
                onPress={() => handleRefresh(testDataCategory)}
                iconName="reload1"
                disabled={isRefreshing}
            />

            {/* Health Analyzer section with heading */}
            <View
                style={{
                    backgroundColor: color.neutral._100,
                    borderRadius: 8,
                    padding: spacing.sm,
                    marginTop: spacing.m,
                    marginBottom: spacing.xs,
                }}>
                <Text
                    style={{
                        color: color.text._100,
                        fontSize: fontSize.m,
                        fontWeight: '600',
                        textAlign: 'center',
                        marginBottom: spacing.sm,
                    }}>
                    Health Analyzer
                </Text>
                <ThemedButton
                    label={isAnalyzing ? 'Analyzing...' : 'Analyze Health Data'}
                    onPress={handleAnalyzeHealthData}
                    iconName="search1"
                    disabled={isAnalyzing}
                />
            </View>

            <View style={{ paddingVertical: spacing.xl3 }} />
        </View>
    )
}

export default HealthMetricsWindow
