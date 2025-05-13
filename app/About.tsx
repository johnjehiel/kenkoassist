import ThemedButton from '@components/buttons/ThemedButton'
import HeaderTitle from '@components/views/HeaderTitle'
import { AppSettings } from '@lib/constants/GlobalValues'
import { Logger } from '@lib/state/Logger'
import { Theme } from '@lib/theme/ThemeManager'
import appConfig from 'app.config'
import React, { useState } from 'react'
import { Image, Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useMMKVBoolean } from 'react-native-mmkv'

const About = () => {
    const styles = useStyles()
    const { spacing } = Theme.useTheme()
    const [counter, setCounter] = useState<number>(0)
    const [devMode, setDevMode] = useMMKVBoolean(AppSettings.DevMode)

    const updateCounter = () => {
        if (devMode) return
        if (counter === 6) {
            Logger.infoToast(`You have enabled dev mode.`)
            setDevMode(true)
        }
        setCounter(counter + 1)
    }

    const version = 'v' + appConfig.expo.version
    return (
        <View style={styles.container}>
            <HeaderTitle title="About" />
            <TouchableOpacity activeOpacity={0.8} onPress={updateCounter}>
                <Image source={require('../assets/images/icon.png')} style={styles.icon} />
            </TouchableOpacity>

            <Text style={styles.titleText}>KenkoAssist</Text>
            <Text style={styles.subtitleText}>
                Version {version} {devMode && '[DEV MODE]'}
            </Text>
            {devMode && (
                <ThemedButton
                    label="Disable Dev Mode"
                    variant="critical"
                    buttonStyle={{
                        marginTop: spacing.xl,
                    }}
                    onPress={() => {
                        setCounter(0)
                        setDevMode(false)
                        Logger.info('Dev mode disabled')
                    }}
                />
            )}

            <Text style={styles.body}>
            Load and run Large Language Models as personalized health assistants, entirely on your device.
            </Text>

            <Text style={styles.body}>
            All chat data and personal details stay local for maximum privacy and security. Nothing ever leaves your phone.
            </Text>

            <Text style={{ marginBottom: spacing.xl3, ...styles.body }}>
            Customize, and configure specialized chatbot “characters” tailored to your unique needs and necessities.
            </Text>

            <Text style={styles.body}>Found any issues? report them here:</Text>
            <Text style={styles.subtitleText}>(Please include your Logs!)</Text>

            <ThemedButton
                buttonStyle={{ marginTop: spacing.m }}
                variant="secondary"
                label="Github Repository"
                iconName="github"
                iconSize={20}
                onPress={() => {
                    Linking.openURL('https://github.com/johnjehiel/kenkoassist')
                }}
            />
            <Text style={{ ...styles.subtitleText, marginTop: spacing.xl3 }}>
                © Developed by John Jehiel
            </Text>
        </View>
    )
}

export default About

const useStyles = () => {
    const { color, spacing } = Theme.useTheme()

    return StyleSheet.create({
        container: {
            paddingHorizontal: spacing.xl3,
            paddingBottom: spacing.xl2,
            justifyContent: 'center',
            alignItems: 'center',
            flex: 1,
        },
        titleText: { color: color.text._100, fontSize: 32, marginTop: 16 },
        subtitleText: { color: color.text._400 },
        body: { color: color.text._100, marginTop: spacing.l, textAlign: 'center' },
        icon: {
            width: 120,
            height: 120,
            backgroundColor: 'black',
            // eslint-disable-next-line internal/enforce-spacing-values
            borderRadius: 60,
        },
    })
}