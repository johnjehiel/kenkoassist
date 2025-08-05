import * as TaskManager from 'expo-task-manager'
import * as BackgroundTask from 'expo-background-task'
import { Logger } from '../state/Logger'
import { analyzeLatestHealthData } from './HealthAnalyzer'
import { mmkv } from '@lib/storage/MMKV'
import { AppSettings } from '@lib/constants/GlobalValues'

export const HEALTH_MONITOR_TASK = 'health-monitor-task'

TaskManager.defineTask(HEALTH_MONITOR_TASK, async () => {
    try {
        Logger.info('Health monitor task is running.')
        await analyzeLatestHealthData()
        return BackgroundTask.BackgroundTaskResult.Success
    } catch (error) {
        Logger.error(`Error in health monitor task: ${error}`)
        return BackgroundTask.BackgroundTaskResult.Failed
    }
})

export const updateHealthMonitorTaskStatus = async () => {
    const healthMetricsEnabled = mmkv.getBoolean(AppSettings.HealthMetrics)
    const healthMonitoringEnabled = mmkv.getBoolean(AppSettings.HealthMonitoring)
    const isRegistered = await TaskManager.isTaskRegisteredAsync(HEALTH_MONITOR_TASK)

    if (healthMetricsEnabled && healthMonitoringEnabled) {
        if (isRegistered) {
            Logger.info('Health monitor task already registered.')
            return
        }
        await BackgroundTask.registerTaskAsync(HEALTH_MONITOR_TASK, {
            minimumInterval: 30,
        })
        Logger.info('Health monitor task registered.')
    } else {
        if (isRegistered) {
            await BackgroundTask.unregisterTaskAsync(HEALTH_MONITOR_TASK)
            Logger.info('Health monitor task unregistered.')
        }
    }
}
