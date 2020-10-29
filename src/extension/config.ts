export const IndicatorName = 'de.ttll.GnomeScreenshot';

export const SettingsSchema = 'org.gnome.shell.extensions.screenshot';

export const KeyEnableIndicator = 'enable-indicator';

export const KeyEnableNotification = 'enable-notification';

export const KeyShortcuts = ['shortcut-select-area', 'shortcut-select-window', 'shortcut-select-desktop'];

// See schemas/org.gnome.shell.extensions.screenshot.gschema.xml
export const KeyClickAction = 'click-action';

export const ClickActions = {
  SHOW_MENU: 0,
  SELECT_AREA: 1,
  SELECT_WINDOW: 2,
  SELECT_DESKTOP: 3,
};

export const KeyCaptureDelay = 'capture-delay';

export const KeySaveScreenshot = 'save-screenshot';

export const KeySaveLocation = 'save-location';

export const KeyFilenameTemplate = 'filename-template';

// "Auto-Copy to Clipboard" action
export const KeyClipboardAction = 'clipboard-action';
// Copy button action
export const KeyCopyButtonAction = 'copy-button-action';

export const ClipboardActions = {
  NONE: 'none',
  SET_IMAGE_DATA: 'set-image-data',
  SET_LOCAL_PATH: 'set-local-path',
  SET_REMOTE_URL: 'set-remote-url',
};

export const KeyEnableUploadImgur = 'enable-imgur';
export const KeyImgurEnableNotification = 'imgur-enable-notification';
export const KeyImgurAutoUpload = 'imgur-auto-upload';
export const KeyImgurAutoCopyLink = 'imgur-auto-copy-link';
export const KeyImgurAutoOpenLink = 'imgur-auto-open-link';
