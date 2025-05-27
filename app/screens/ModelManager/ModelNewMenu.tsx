import PopupMenu, { MenuRef } from '@components/views/PopupMenu'
import { Model } from '@lib/engine/Local/Model'
import { View } from 'react-native'

type ModelNewMenuProps = {
    modelImporting: boolean
    setModelImporting: (b: boolean) => void
}

const ModelNewMenu: React.FC<ModelNewMenuProps> = ({ modelImporting, setModelImporting }) => {

    const handleImportModel = async (menuRef: MenuRef) => {
        menuRef.current?.close()
        if (modelImporting) return
        setModelImporting(true)
        await Model.importModel()
        setModelImporting(false)
    }

    return (
        <View>
            <PopupMenu
                placement="bottom"
                icon="addfile"
                disabled={modelImporting}
                options={[
                    {
                        label: 'Copy Model Into KenkoAssist',
                        icon: 'download',
                        onPress: handleImportModel,
                    }
                ]}
            />
        </View>
    )
}

export default ModelNewMenu
