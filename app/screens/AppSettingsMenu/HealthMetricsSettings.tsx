import ThemedSwitch from '@components/input/ThemedSwitch'
import SectionTitle from '@components/text/SectionTitle'
import { AppSettings } from '@lib/constants/GlobalValues'
import { HealthMetrics } from '@lib/state/HealthMetrics'
import React, { useEffect } from 'react'
import { View } from 'react-native'
import { useMMKVBoolean } from 'react-native-mmkv'

const HealthMetricsSettings = () => {
    const [healthMetricsToggle, setHealthMetricsToggle] = useMMKVBoolean(AppSettings.HealthMetrics)
    const { setEnabled, clearData } = HealthMetrics.useHealthMetricsState()

    // Handle toggle changes
    const handleToggleChange = (value: boolean) => {
        setHealthMetricsToggle(value)
        setEnabled(value)
        
        // Clear data when disabled
        if (!value) {
            clearData()
        }
    }

    return (
        <View style={{ rowGap: 8 }}>
            <SectionTitle>Health Metrics</SectionTitle>
            <ThemedSwitch
                label="Enable Health Metrics"
                value={healthMetricsToggle || false}
                onChangeValue={handleToggleChange}
                description="Allows the app to use your health metrics data to provide personalized chat experience"
            />
        </View>
    )
}

export default HealthMetricsSettings