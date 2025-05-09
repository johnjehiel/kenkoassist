import Drawer from '@components/views/Drawer'
import { AppSettings } from '@lib/constants/GlobalValues'
import { Theme } from '@lib/theme/ThemeManager'
import appConfig from 'app.config'
import { Text, View } from 'react-native'
import { useMMKVBoolean } from 'react-native-mmkv'

import UserInfo from './UserInfo'
import RouteList from './RouteList'

const SettingsDrawer = () => {
    const { color, spacing } = Theme.useTheme()

    const [devMode, _] = useMMKVBoolean(AppSettings.DevMode)
    return (
        <Drawer.Body
            drawerID={Drawer.ID.SETTINGS}
            drawerStyle={{
                width: '60%',
                paddingBottom: spacing.xl2,
            }}>
            <UserInfo />
            <RouteList />
            <Text
                style={{
                    alignSelf: 'center',
                    color: color.text._300,
                    marginTop: spacing.l,
                    marginBottom: spacing.xl2,
                }}>
                {__DEV__ && 'DEV BUILD\t'}
                {devMode && 'DEV MODE\t'}
                {'v' + appConfig.expo.version}
            </Text>
        </Drawer.Body>
    )
}

export default SettingsDrawer
