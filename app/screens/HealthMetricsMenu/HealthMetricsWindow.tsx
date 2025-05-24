import { Theme } from '@lib/theme/ThemeManager'
import React, { useEffect, useMemo, useCallback } from 'react'
import { Text, View, ActivityIndicator, Platform, Alert } from 'react-native';

import ThemedButton from '@components/buttons/ThemedButton'

import useHealthData from '@lib/hooks/useHealthData'
import { HealthMetrics } from '@lib/state/HealthMetrics'
import { healthCategories, labelMap, unitsMap } from '@lib/constants/HealthMetricsData';

const HealthMetricsWindow = () => {
    const { 
        data, 
        permissions, 
        isLoading, 
        isRefreshing, 
        refreshData, 
        lastUpdated,
        error: hookError 
    } = useHealthData();
    
    const { 
        data: storedData,   
        updateData, 
        lastUpdated: storeLastUpdated,
        isEnabled,
        error: storeError,
        setError,
        clearData
    } = HealthMetrics.useHealthMetricsState();
    
    const { spacing, color, fontSize } = Theme.useTheme();

    // Consolidated useEffect for all data management
    useEffect(() => {
        if (!isEnabled) {
            clearData();
            return;
        }

        // Update store when new data arrives
        if (data && Object.keys(data).length > 0) {
            updateData(data, lastUpdated);
        }

        // Handle hook errors
        if (hookError) {
            setError(hookError);
        }
    }, [isEnabled, data, lastUpdated, hookError, updateData, setError, clearData]);

    // Use stored data if available and feature enabled, otherwise hook data
    const displayData = useMemo(() => 
        isEnabled && Object.keys(storedData).length > 0 ? storedData : data
    , [storedData, data, isEnabled]);

    const handleRefresh = useCallback(() => {
        if (!isEnabled) {
            Alert.alert(
                'Feature Disabled',
                'Health Metrics feature is disabled. Please enable it in Settings to refresh data.',
                [{ text: 'OK' }]
            );
            return;
        }
        
        // Clear errors before refreshing
        if (storeError || hookError) {
            setError(null);
        }
        
        refreshData();
    }, [refreshData, isEnabled, storeError, hookError, setError]);

    // Helper function to format metric value
    const formatMetricValue = useCallback((value: number | null, unit: string): string => {
        if (value === null || value === undefined || value < 0) return 'N/A';
        const formatted = typeof value === 'number' ? value.toFixed(2) : String(value);
        return unit ? `${formatted} ${unit}` : formatted;
    }, []);

    // Render individual metric
    const renderMetric = useCallback((metricKey: string, value: number | null) => {
        const label = labelMap[metricKey] || metricKey;
        const unit = unitsMap[metricKey] || '';
        const formattedValue = formatMetricValue(value, unit);
        
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
                }}
            >
                <Text style={{ 
                    color: color.text._300, 
                    fontSize: fontSize.m,
                    flex: 1
                }}>
                    {label}
                </Text>
                <Text style={{ 
                    color: value !== null && value > 0 ? color.text._200 : color.text._400, 
                    fontSize: fontSize.m,
                    fontWeight: '600',
                    textAlign: 'right'
                }}>
                    {formattedValue}
                </Text>
            </View>
        );
    }, [formatMetricValue, spacing, color, fontSize]);

    const renderCategory = useCallback((categoryKey: string, categoryInfo: any) => {
        const categoryMetrics = categoryInfo.metrics.filter((metricKey: string) => 
            displayData[metricKey] !== null && 
            displayData[metricKey] !== undefined && 
            displayData[metricKey] > 0
        );

        if (categoryMetrics.length === 0) return null;

        return (
            <View key={categoryKey} style={{ marginBottom: spacing.m }}>
                <View style={{ 
                    flexDirection: 'row', 
                    alignItems: 'center', 
                    marginBottom: spacing.sm,
                    paddingBottom: spacing.xs,
                    borderBottomWidth: 1,
                    borderBottomColor: color.primary._100
                }}>
                    <View style={{
                        width: 4,
                        height: 20,
                        backgroundColor: color.text._200,
                        marginRight: spacing.sm,
                        borderRadius: 2
                    }} />
                    <Text style={{ 
                        color: color.text._400, 
                        fontSize: fontSize.m,
                        fontWeight: '700',
                        flex: 1
                    }}>
                        {categoryInfo.name}
                    </Text>
                </View>

                {categoryMetrics.map((metricKey: string) => 
                    renderMetric(metricKey, displayData[metricKey])
                )}
            </View>
        );
    }, [displayData, renderMetric, spacing, color, fontSize]);

    // Early returns for different states
    if (!isEnabled) {
        return (
            <View style={{ 
                rowGap: spacing.sm, 
                alignItems: 'center',
                paddingVertical: spacing.xl 
            }}>
                <Text style={{ 
                    color: color.text._300, 
                    fontSize: fontSize.m,
                    textAlign: 'center',
                    marginBottom: spacing.m
                }}>
                    Health Metrics Feature Disabled
                </Text>
                <Text style={{ 
                    color: color.text._200, 
                    fontSize: fontSize.s,
                    textAlign: 'center',
                    paddingHorizontal: spacing.xl
                }}>
                    Enable Health Metrics in Settings to view your health data
                </Text>
            </View>
        );
    }

    if (Platform.OS !== 'android') {
        return (
            <View style={{ 
                rowGap: spacing.sm, 
                alignItems: 'center',
                paddingVertical: spacing.xl 
            }}>
                <Text style={{ 
                    color: color.text._300, 
                    fontSize: fontSize.m,
                    textAlign: 'center'
                }}>
                    Health Metrics is only available on Android devices with Health Connect
                </Text>
            </View>
        );
    }

    if (permissions.length === 0 || isLoading) {
        return (
            <View style={{ 
                rowGap: spacing.sm, 
                alignItems: 'center',
                paddingVertical: spacing.xl 
            }}>
                <ActivityIndicator size="large" color={color.primary._300} />
                <Text style={{ 
                    color: color.text._300, 
                    fontSize: fontSize.m,
                    textAlign: 'center'
                }}>
                    {permissions.length === 0 ? 'Requesting Health Permissions...' : 'Loading health data...'}
                </Text>
            </View>
        );
    }

    const currentError = storeError || hookError;
    if (currentError) {
        return (
            <View style={{ rowGap: spacing.sm }}>
                <View style={{
                    backgroundColor: color.primary._100,
                    padding: spacing.m,
                    borderRadius: 8,
                    borderLeftWidth: 4,
                    borderLeftColor: '#ef4444',
                    marginBottom: spacing.m
                }}>
                    <Text style={{ 
                        color: '#ef4444', 
                        fontSize: fontSize.m,
                        fontWeight: '600',
                        marginBottom: spacing.xs
                    }}>
                        Error Loading Health Data
                    </Text>
                    <Text style={{ 
                        color: color.text._300, 
                        fontSize: fontSize.s
                    }}>
                        {currentError}
                    </Text>
                </View>

                <ThemedButton
                    label={isRefreshing ? 'Retrying...' : 'Retry'}
                    onPress={handleRefresh} 
                    iconName="reload1"
                    disabled={isRefreshing}
                />
                
                <View style={{ paddingVertical: spacing.xl3 }} />
            </View>
        );
    }

    const hasData = Object.keys(displayData).length > 0;
    const lastUpdateTime = storeLastUpdated || (lastUpdated ? lastUpdated.toISOString() : null);

    return (
        <View style={{ rowGap: spacing.sm }}>
            
            <View style={{
                    backgroundColor: color.primary._100,
                    padding: spacing.sm,
                    borderRadius: 8
                }}>
                    <Text style={{ 
                        color: color.text._100, 
                        fontSize: fontSize.l,
                        fontWeight: '700',
                        textAlign: 'center'
                    }}>
                        Weekly Summary
                    </Text>
            </View>

            {hasData ? (
                <View style={{ paddingBottom: spacing.xs }}>
                    {Object.entries(healthCategories).map(([categoryKey, categoryInfo]) => 
                        renderCategory(categoryKey, categoryInfo)
                    )}
                </View>
            ) : (
                <View style={{
                    alignItems: 'center',
                    paddingVertical: spacing.xl2
                }}>
                    <Text style={{ 
                        color: color.text._300, 
                        fontSize: fontSize.m,
                        textAlign: 'center',
                        marginBottom: spacing.m
                    }}>
                        No health data available
                    </Text>
                    <Text style={{ 
                        color: color.text._200, 
                        fontSize: fontSize.s,
                        textAlign: 'center',
                        paddingHorizontal: spacing.xl,
                        marginBottom: spacing.m
                    }}>
                        Try refreshing to fetch your latest health metrics from Health Connect
                    </Text>
                    
                    {permissions.length > 0 && (
                        <Text style={{ 
                            color: color.text._200, 
                            fontSize: fontSize.s,
                            textAlign: 'center',
                            paddingHorizontal: spacing.xl
                        }}>
                            Make sure you have recent health data in Health Connect and that the app has the necessary permissions.
                        </Text>
                    )}
                </View>
            )}

            <View style={{ paddingVertical: spacing.xs }} />
            {lastUpdateTime && (
                <View style={{
                    backgroundColor: color.neutral._100,
                    padding: spacing.sm,
                    borderRadius: 8
                }}>
                    <Text style={{ 
                        color: color.text._400, 
                        fontSize: fontSize.s,
                        textAlign: 'center'
                    }}>
                        Last Updated: {new Date(lastUpdateTime).toLocaleString()}
                    </Text>
                </View>
            )}

            <ThemedButton
                label={isRefreshing ? 'Refreshing...' : 'Refresh'}
                onPress={handleRefresh} 
                iconName="reload1"
                disabled={isRefreshing}
            />
            
            <View style={{ paddingVertical: spacing.xl3 }} />
        </View>
    );
};

export default HealthMetricsWindow;