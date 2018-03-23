// vi: sts=2 sw=2 et

const IndicatorName = 'de.ttll.GnomeScreenshot';

const SettingsSchema = 'org.gnome.shell.extensions.screenshot';

const KeyEnableIndicator = 'enable-indicator';

const KeyEnableNotification = 'enable-notification';

const KeyShortcuts = [
  'shortcut-select-area',
  'shortcut-select-window',
  'shortcut-select-desktop'
];


// See schemas/org.gnome.shell.extensions.screenshot.gschema.xml
const KeyClickAction = 'click-action';

const ClickActions = {
  SHOW_MENU: 0,
  SELECT_AREA: 1,
  SELECT_WINDOW: 2,
  SELECT_DESKTOP: 3
};

const KeyCaptureDelay = 'capture-delay';

const KeySaveScreenshot = 'save-screenshot';

const KeySaveLocation = 'save-location';

const KeyFilenameTemplate = 'filename-template';

// See schemas/org.gnome.shell.extensions.screenshot.gschema.xml
const KeyClipboardAction = 'clipboard-action';

const ClipboardActions = {
  NONE: "none",
  SET_IMAGE_DATA: "set-image-data",
  SET_LOCAL_PATH: "set-local-path",
  SET_REMOTE_URL: "set-remote-url"
};



const KeyEnableUploadImgur = 'enable-imgur';
const KeyImgurEnableNotification = 'imgur-enable-notification';
const KeyImgurAutoUpload = 'imgur-auto-upload';
const KeyImgurAutoCopyLink = 'imgur-auto-copy-link';
const KeyImgurAutoOpenLink = 'imgur-auto-open-link';
