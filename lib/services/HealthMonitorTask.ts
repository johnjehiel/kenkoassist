import * as TaskManager from 'expo-task-manager'
import * as BackgroundTask from 'expo-background-task'
import { Logger } from '../state/Logger'
import { analyzeLatestHealthData } from './HealthAnalyzer'

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
