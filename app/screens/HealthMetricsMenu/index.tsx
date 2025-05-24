import HeaderTitle from '@components/views/HeaderTitle'
import { Theme } from '@lib/theme/ThemeManager'
import { AppSettings } from '@lib/constants/GlobalValues'
import React from 'react'
import { ScrollView, View } from 'react-native'
import { mmkv } from '@lib/storage/MMKV'

import HealthMetricsWindow from './HealthMetricsWindow'
import EnableHealthMetrics from './EnableHealthMetrics'

const HealthMetricsMenu = () => {
    
    const { spacing } = Theme.useTheme()

    return (
        <ScrollView
            style={{
                marginVertical: spacing.xl2,
                paddingHorizontal: spacing.xl2,
                paddingBottom: spacing.xl3,
            }}
            contentContainerStyle={{ rowGap: spacing.sm }}>
            <HeaderTitle title="Health Metrics Menu" />
            
            
            {mmkv.getBoolean(AppSettings.HealthMetrics) ? 
                <HealthMetricsWindow /> :
                <EnableHealthMetrics /> }

            <View style={{ paddingVertical: spacing.xl3 }} />
        </ScrollView>
    )
}

export default HealthMetricsMenu