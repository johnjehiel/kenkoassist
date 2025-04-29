import Drawer from '@components/views/Drawer'
import HeaderButton from '@components/views/HeaderButton'
import HeaderTitle from '@components/views/HeaderTitle'
import { SafeAreaView } from 'react-native'

import SettingsDrawer from '../SettingsDrawer'

const CharacterMenu = () => {
    const { showDrawer } = Drawer.useDrawerState((state) => ({
        showDrawer: state.values?.[Drawer.ID.SETTINGS],
    }))

    return (
        <Drawer.Gesture
            config={[
                { drawerID: Drawer.ID.SETTINGS, openDirection: 'right', closeDirection: 'left' },
            ]}>
            <SafeAreaView
                style={{
                    flex: 1,
                    flexDirection: 'row',
                }}>
                <HeaderTitle title='KenkoAssist' />
                <HeaderButton headerLeft={() => <Drawer.Button drawerID={Drawer.ID.SETTINGS} />} />

                <SettingsDrawer />
            </SafeAreaView>
        </Drawer.Gesture>
    )
}

export default CharacterMenu
