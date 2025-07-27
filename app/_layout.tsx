import { AlertBox } from '@components/views/Alert'
import { rawdb } from '@db'
import { Theme } from '@lib/theme/ThemeManager'
import { useDrizzleStudio } from 'expo-drizzle-studio-plugin'
import { SplashScreen, Stack } from 'expo-router'
import { setOptions } from 'expo-splash-screen'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { MenuProvider } from 'react-native-popup-menu'
import * as TaskManager from 'expo-task-manager'
import * as BackgroundFetch from 'expo-background-task'
import { HEALTH_MONITOR_TASK } from '@lib/services/HealthMonitorTask'
import { useEffect } from 'react'
import { Logger } from '@lib/state/Logger'
import { AppSettings } from '@lib/constants/GlobalValues'
import { mmkv } from '@lib/storage/MMKV'

export const updateHealthMonitorTaskStatus = async () => {
    const healthMetricsEnabled = mmkv.getBoolean(AppSettings.HealthMetrics)
    const healthMonitoringEnabled = mmkv.getBoolean(AppSettings.HealthMonitoring)
    const isRegistered = await TaskManager.isTaskRegisteredAsync(HEALTH_MONITOR_TASK)

    if (healthMetricsEnabled && healthMonitoringEnabled) {
        if (isRegistered) {
            Logger.info('Health monitor task already registered.')
            return
        }
        await BackgroundFetch.registerTaskAsync(HEALTH_MONITOR_TASK, {
            minimumInterval: 30 * 60, // 30 minutes
        })
        Logger.info('Health monitor task registered.')
    } else {
        if (isRegistered) {
            await BackgroundFetch.unregisterTaskAsync(HEALTH_MONITOR_TASK)
            Logger.info('Health monitor task unregistered.')
        }
    }
}

SplashScreen.preventAutoHideAsync()
setOptions({
    fade: true,
    duration: 350,
})

const Layout = () => {
    useDrizzleStudio(rawdb)

    const { color } = Theme.useTheme()

    useEffect(() => {
        updateHealthMonitorTaskStatus()
    }, [])

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <AlertBox />
            <MenuProvider>
                <Stack
                    screenOptions={{
                        headerBackButtonDisplayMode: 'minimal',
                        headerStyle: { backgroundColor: color.neutral._100 },
                        headerTitleStyle: { color: color.text._100 },
                        headerTintColor: color.text._100,
                        contentStyle: { backgroundColor: color.neutral._100 },
                        headerShadowVisible: false,
                        headerTitleAlign: 'center',
                        statusBarBackgroundColor: color.neutral._100,
                    }}>
                    <Stack.Screen name="index" options={{ animation: 'fade' }} />
                </Stack>
            </MenuProvider>
        </GestureHandlerRootView>
    )
}

export default Layout

