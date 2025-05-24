export const enum Global {
    CpuFeatures = 'cpufeatures',
}

export enum AppSettings {
    DevMode = 'devmode',
    DarkMode = 'darkmode',
    AnimateEditor = 'animateeditor',
    CreateFirstMes = 'createfirstmes',
    ChatOnStartup = 'chatonstartup',
    AutoLoadLocal = 'autoloadlocal',
    AutoScroll = 'autoscroll',
    SendOnEnter = 'sendonenter',
    SaveLocalKV = 'savelocalkv',
    PrintContext = 'printcontext',
    CreateDefaultCard = 'createdefaultcard',
    BypassContextLength = 'bypasscontextlength',
    NotifyOnComplete = 'notifyOnComplete',
    PlayNotificationSound = 'notifySound',
    VibrateNotification = 'notifyvibrate',
    ShowNotificationText = 'shownotificationtext',
    LocallyAuthenticateUser = 'localauthuser',
    UnlockOrientation = 'unlockorientation',
    UseLegacyAPI = 'uselegacyapi',
    ShowModelInChat = 'showmodelinchat',
    ShowTags = 'showtags',
    UseModelTemplate = 'useModelTemplate',
    ShowTokenPerSecond = 'showtokenpersecond',
    AutoLoadUser = 'autoloaduser',
    HealthMetrics = 'healthmetrics',
}

/**
 * Default settings on first install
 */
export const AppSettingsDefault: Record<AppSettings, boolean> = {
    [AppSettings.AnimateEditor]: true,
    [AppSettings.AutoLoadLocal]: true,
    [AppSettings.AutoScroll]: true,
    [AppSettings.ChatOnStartup]: false,
    [AppSettings.CreateFirstMes]: false,
    [AppSettings.DarkMode]: true,
    [AppSettings.DevMode]: false,
    [AppSettings.SendOnEnter]: false,
    [AppSettings.SaveLocalKV]: false,
    [AppSettings.PrintContext]: false,
    [AppSettings.CreateDefaultCard]: true,
    [AppSettings.BypassContextLength]: false,
    [AppSettings.NotifyOnComplete]: false,
    [AppSettings.PlayNotificationSound]: false,
    [AppSettings.VibrateNotification]: false,
    [AppSettings.LocallyAuthenticateUser]: false,
    [AppSettings.ShowNotificationText]: false,
    [AppSettings.UnlockOrientation]: false,
    [AppSettings.UseLegacyAPI]: false,
    [AppSettings.ShowModelInChat]: false,
    [AppSettings.ShowTags]: false,
    [AppSettings.UseModelTemplate]: true,
    [AppSettings.ShowTokenPerSecond]: false,
    [AppSettings.AutoLoadUser]: true,
    [AppSettings.HealthMetrics]: false,
}

export const CLAUDE_VERSION = '2023-06-01'
