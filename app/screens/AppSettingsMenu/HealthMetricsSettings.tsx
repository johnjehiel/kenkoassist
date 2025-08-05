import ThemedSwitch from '@components/input/ThemedSwitch'
import SectionTitle from '@components/text/SectionTitle'
import { AppSettings } from '@lib/constants/GlobalValues'
import { HealthMetrics } from '@lib/state/HealthMetrics'
import { updateHealthMonitorTaskStatus } from '@lib/services/HealthMonitorTask'
import React from 'react'
import { View } from 'react-native'
import { useMMKVBoolean } from 'react-native-mmkv'

const HealthMetricsSettings = () => {
    const [healthMetricsToggle, setHealthMetricsToggle] = useMMKVBoolean(AppSettings.HealthMetrics)
    const [healthMonitoring, setHealthMonitoring] = useMMKVBoolean(AppSettings.HealthMonitoring)
    const { setEnabled, clearData } = HealthMetrics.useHealthMetricsState()

    // Handle health monitoring toggle changes
    const handleHealthMonitorToggle = async (value: boolean) => {
        setHealthMonitoring(value)
        await updateHealthMonitorTaskStatus()
    }
    // Handle health metrics toggle changes
    const handleHealthMetricsToggle = (value: boolean) => {
        setHealthMetricsToggle(value)
        setEnabled(value)

        // Clear data when disabled
        if (!value) {
            handleHealthMonitorToggle(false)
            clearData()
        }
    }

    return (
        <View style={{ rowGap: 8 }}>
            <SectionTitle>Health Metrics</SectionTitle>
            <ThemedSwitch
                label="Enable Health Metrics"
                value={healthMetricsToggle}
                onChangeValue={handleHealthMetricsToggle}
                description="Allows the app to use your health metrics data to provide personalized chat experience"
            />
            {healthMetricsToggle && (
                <View>
                    <ThemedSwitch
                        label="Health Monitoring"
                        value={healthMonitoring}
                        onChangeValue={handleHealthMonitorToggle}
                        description="Allows the app to monitor your health data in the background"
                    />
                </View>
            )}
        </View>
    )
}

export default HealthMetricsSettings
