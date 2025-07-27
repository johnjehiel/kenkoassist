import * as TaskManager from 'expo-task-manager'
import * as BackgroundTask from 'expo-background-task'
import { Logger } from '../state/Logger'

export const HEALTH_MONITOR_TASK = 'health-monitor-task'

TaskManager.defineTask(HEALTH_MONITOR_TASK, async () => {
    try {
        Logger.info('Health monitor task is running.')
        // The core logic will be called from here in a later step.
        // For now, we just log that the task has been executed.
        return BackgroundTask.BackgroundTaskResult.Success
    } catch (error) {
        Logger.error(`Error in health monitor task: ${error}`)
        return BackgroundTask.BackgroundTaskResult.Failed
    }
})
