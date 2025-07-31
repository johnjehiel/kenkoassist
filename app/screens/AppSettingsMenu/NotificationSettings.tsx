import ThemedSwitch from '@components/input/ThemedSwitch'
import SectionTitle from '@components/text/SectionTitle'
import { AppSettings } from '@lib/constants/GlobalValues'
import { registerForPushNotificationsAsync } from '@lib/notifications/Notifications'
import React from 'react'
import { View } from 'react-native'
import { useMMKVBoolean } from 'react-native-mmkv'

const NotificationSettings = () => {
    const [notificationToggle, setNotificationToggle] = useMMKVBoolean(
        AppSettings.Notification
    )
    const [notificationSound, setNotificationSound] = useMMKVBoolean(
        AppSettings.PlayNotificationSound
    )
    // const [notificationVibrate, setNotificationVibrate] = useMMKVBoolean(
    //     AppSettings.VibrateNotification
    // )
    const [NotifyOnComplete, setNotifyOnComplete] = useMMKVBoolean(
        AppSettings.NotifyOnComplete
    )
    const [showNotificationText, setShowNotificationText] = useMMKVBoolean(
        AppSettings.ShowNotificationText
    )

    return (
        <View>
            <SectionTitle>Notifications</SectionTitle>
            <ThemedSwitch
                label="Enable Notifications"
                value={notificationToggle}
                onChangeValue={async (value) => {
                    if (!value) {
                        setNotificationToggle(false)
                        setNotificationSound(false)
                        // setNotificationVibrate(false)
                        setNotifyOnComplete(false)
                        setShowNotificationText(false)
                        return
                    }

                    const granted = await registerForPushNotificationsAsync()
                    if (granted) {
                        setNotificationToggle(true)
                    }
                }}
                description="Sends notifications when the app is in the background"
            />
            {notificationToggle && (
                <View>
                    <ThemedSwitch
                        label="Notification Sound"
                        value={notificationSound}
                        onChangeValue={setNotificationSound}
                        description=""
                    />
                    
                    {/* <ThemedSwitch
                        label="Notification Vibration"
                        value={notificationVibrate}
                        onChangeValue={setNotificationVibrate}
                        description=""
                    /> */}
                    <ThemedSwitch
                        label="Notify On Response Completion"
                        value={NotifyOnComplete}
                        onChangeValue={(value) =>{
                            if (!value) {
                                setNotifyOnComplete(false)
                                setShowNotificationText(false)
                                return
                            }
                            setNotifyOnComplete(true)
                        }}
                        description="Sends a notification when the model finishes generating a response"
                    />
                    {
                        NotifyOnComplete &&
                        <ThemedSwitch
                            label="Show Text In Notification"
                            value={showNotificationText}
                            onChangeValue={setShowNotificationText}
                            description="Shows generated messages in notifications"
                        />
                    }
                </View>
            )}
        </View>
    )
}

export default NotificationSettings