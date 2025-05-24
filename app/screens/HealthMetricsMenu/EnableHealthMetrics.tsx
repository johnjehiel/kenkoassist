import { Theme } from '@lib/theme/ThemeManager'
import React from 'react'
import { View, Text } from 'react-native'

import ThemedButton from '@components/buttons/ThemedButton'
import { useRouter } from 'expo-router'


const HealthMetricsWindow = () => {

    const { color, spacing, fontSize } = Theme.useTheme()

    const router = useRouter()

    return (
        <View style={{ rowGap: spacing.m, alignItems: 'center' }}>

            <Text style={{ color: color.text._400, fontSize: fontSize.m , textAlign: 'center', paddingHorizontal: spacing.xl2, paddingVertical: spacing.sm }}>
                Please go to settings and enable Health Metrics to continue
            </Text>

            <ThemedButton 
                label="Go to Settings" 
                onPress={() => router.replace('/screens/AppSettingsMenu')} 
                iconName="setting" 
            />

            <View style={{ paddingVertical: spacing.xl3 }} />
        </ View>
    )
}

export default HealthMetricsWindow