import { AlertBox } from '@components/views/Alert'
import { rawdb } from '@db'
import { Theme } from '@lib/theme/ThemeManager'
import { useDrizzleStudio } from 'expo-drizzle-studio-plugin'
import { SplashScreen, Stack } from 'expo-router'
import { setOptions } from 'expo-splash-screen'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { MenuProvider } from 'react-native-popup-menu'
import * as TaskManager from 'expo-task-manager'
import { updateHealthMonitorTaskStatus } from '@lib/services/HealthMonitorTask'
import { useEffect } from 'react'
import { Logger } from '@lib/state/Logger'

SplashScreen.preventAutoHideAsync()
setOptions({
    fade: true,
    duration: 350,
})

TaskManager.getRegisteredTasksAsync().then((tasks) => {
    Logger.debug(`Registered tasks: ${JSON.stringify(tasks, null, 2)}`)
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
