import { Llama } from '@lib/engine/Local/LlamaLocal'
import { Model } from '@lib/engine/Local/Model'
import { generateResponse } from '@lib/engine/Inference'
import { useAppModeState } from '@lib/state/AppMode'
import { Characters } from '@lib/state/Characters'
import { Chats, useInference } from '@lib/state/Chat'
import { HealthMetrics } from '@lib/state/HealthMetrics'
import { Logger } from '@lib/state/Logger'
import * as Notifications from 'expo-notifications'
import { fetchAndProcessHealthData } from './HealthDataService'
import { HealthAnalysis } from '@lib/constants/SystemPrompts'

export const analyzeLatestHealthData = async () => {
    try {
        const selectedCategory = HealthMetrics.useHealthMetricsState.getState().selectedCategory
        const healthData = await fetchAndProcessHealthData(selectedCategory)
        Logger.debug(`Fetched health data: ${JSON.stringify(healthData)}`)
        if (!healthData || Object.keys(healthData.aggregatedHealthData).length === 0) {
            Logger.warn('Health data could not be fetched or is empty. Skipping analysis.')
            return
        }

        const appMode = useAppModeState.getState().appMode

        // Create or use existing character
        const charId = await Characters.createAlertBotCard()
        if (!charId) {
            Logger.error('Failed to create or retrieve character for health analysis.')
            return
        }

        await Characters.useCharacterCard.getState().setCard(charId)

        // Create a new chat for the alert bot
        const chatId = await Chats.db.mutate.createChat(charId)
        if (!chatId) {
            Logger.error('Failed to create chat for alert bot.')
            return
        }

        const now = new Date()

        // Options for a more readable date and time format
        const dateFormatOptions: Intl.DateTimeFormatOptions = {
            month: 'short',
            day: 'numeric',
        }
        const timeFormatOptions: Intl.DateTimeFormatOptions = {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
        }

        // Create the formatted strings
        const formattedDate = now.toLocaleDateString('en-US', dateFormatOptions) // e.g., "Jul 30"
        const formattedTime = now.toLocaleTimeString('en-US', timeFormatOptions) // e.g., "11:00 PM"

        // Combine into a user-friendly chat name
        const chatName = `Analysis - ${formattedDate}, ${formattedTime}`

        await Chats.db.mutate.renameChat(chatId, chatName)

        await Chats.useChatState.getState().load(chatId)

        const charName = Characters.useCharacterCard.getState().card?.name

        // add prompt as user's message to the chat
        await Chats.useChatState
            .getState()
            .addEntry(charName ?? '', true, HealthAnalysis.HealthAnalysisPrompt)
        const swipeId = await Chats.useChatState.getState().addEntry(charName ?? '', false, '')
        if (swipeId === undefined) {
            Logger.error('Failed to create a swipe entry for the alert bot.')
            return
        }

        // Loading a local model
        if (appMode === 'local') {
            const llamaState = Llama.useLlama.getState()
            if (!llamaState.model) {
                // TO DO: load a selected model if not loaded
                Logger.info('No model loaded. Loading the first available model.')
                const modelList = await Model.getModelListQuery()
                if (modelList && modelList.length > 0) {
                    await llamaState.load(modelList[0])
                } else {
                    Logger.warn('No local models found. Cannot perform local analysis.')
                    return
                }
            }
        }

        // Generate response for alert chat bot
        await generateResponse(swipeId)

        // wait for the context to get built and then clear prompt
        await new Promise((resolve) => setTimeout(resolve, 500))
        await Chats.useChatState.getState().deleteEntry(0) // Assuming the prompt is always the first message
        Logger.debug('Prompt message deleted from chat history.')

        const waitForGenerationToComplete = () => {
            // Return a new Promise. We will resolve it manually inside the subscriber.
            return new Promise<void>((resolve) => {
                // Subscribe to the store and get the unsubscribe function.
                const unsubscribe = useInference.subscribe((state) => {
                    // This callback function runs EVERY time the state in useInference changes.
                    if (!state.nowGenerating) {
                        Logger.debug('Generation has completed. Proceeding...')
                        unsubscribe() // IMPORTANT: Clean up the listener to prevent memory leaks.
                        resolve() // Resolve the promise to allow the awaited code to continue.
                    }
                })
            })
        }

        Logger.debug('Waiting for generation to complete...')
        await waitForGenerationToComplete()

        // Reload the chat state
        await Chats.useChatState.getState().load(chatId)
        let response = Chats.useChatState.getState()?.data

        // Analyze the response for anomalies
        Logger.debug(`Response data structure after reload: ${JSON.stringify(response, null, 2)}`)

        if (response && response.messages) {
            try {
                Chats.useChatState.getState().startGenerating(swipeId)

                const messagesLength = response.messages.length
                if (messagesLength === 0) {
                    Logger.error('No messages found in chat response.')
                    return
                }

                const lastMessage = response.messages[messagesLength - 1]
                if (!lastMessage || !lastMessage.swipes || lastMessage.swipes.length === 0) {
                    Logger.error('No valid swipes found in the last message.')
                    return
                }

                // Get the current swipe content
                const currentSwipe = lastMessage.swipes[lastMessage.swipe_id]
                const rawResponse = currentSwipe.swipe
                Logger.debug(`Raw AI response: ${rawResponse}`)

                if (!rawResponse) {
                    Logger.error('No response content found in the current swipe.')
                    return
                }

                // Try to parse the response as JSON
                let parsedResponse: { is_anomaly?: boolean; justification?: string } = {}
                try {
                    // Attempt to extract a JSON object from the raw response
                    const firstBraceIndex = rawResponse.lastIndexOf('{')
                    const lastBraceIndex = rawResponse.lastIndexOf('}')

                    if (firstBraceIndex !== -1 && lastBraceIndex > firstBraceIndex) {
                        const jsonString = rawResponse.substring(
                            firstBraceIndex,
                            lastBraceIndex + 1
                        )
                        parsedResponse = JSON.parse(jsonString)
                        Logger.debug(`Parsed JSON response: ${JSON.stringify(parsedResponse)}`)
                    } else {
                        // Fallback if no JSON object is found in the response
                        parsedResponse = {
                            is_anomaly: false,
                            justification: rawResponse,
                        }
                        Logger.debug(
                            'No valid JSON object found, treating entire response as justification'
                        )
                    }
                } catch (parseError) {
                    Logger.warn(`Failed to parse response as JSON: ${parseError}`)
                    // Fallback: treat the entire response as justification
                    parsedResponse = {
                        is_anomaly: false,
                        justification: rawResponse,
                    }
                }

                const { is_anomaly = false, justification = rawResponse } = parsedResponse

                // set buffer (with startGenerating() already called)
                Chats.useChatState.getState().setBuffer({ data: justification })

                Logger.info(`Health analysis complete. Anomaly detected: ${is_anomaly}`)

                // Generate Notification If anomaly detected
                if (is_anomaly) {
                    await Notifications.scheduleNotificationAsync({
                        content: {
                            title: 'Health Anomaly Detected!',
                            body: 'An anomaly has been detected in your recent health data.',
                            badge: 1,
                        },
                        trigger: null,
                    })
                    // Notifications.setBadgeCountAsync(0)
                    Logger.info('Anomaly notification sent to user.')
                }
            } catch (e) {
                Logger.error(`Failed to parse or update response: ${e}`)
                // Attempt to get raw response for debugging
                try {
                    const lastMessage = response.messages[response.messages.length - 1]
                    const currentSwipe = lastMessage?.swipes[lastMessage.swipe_id]
                    const debugResponse = currentSwipe?.swipe || 'No swipe data found'
                    Logger.error(`Raw response data: ${debugResponse}`)
                } catch (debugError) {
                    Logger.error('Could not retrieve raw response for debugging')
                }
            } finally {
                Chats.useChatState.getState().stopGenerating()
                Logger.debug('Health analysis task completed and chat state updated.')
            }
        } else {
            Logger.error('No response data found in chat state.')
        }
    } catch (error) {
        Logger.error(`Error during health data analysis: ${error}`)
    }
}
