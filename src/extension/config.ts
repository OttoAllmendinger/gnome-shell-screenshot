import Gio from '@girs/gio-2.0';

export const KeyBackend = 'backend';

export const Backends = {
  DESKTOP_PORTAL: 'desktop-portal',
  GNOME_SCREENSHOT_CLI: 'gnome-screenshot',
};

export const IndicatorName = 'de.ttll.GnomeScreenshot';

export const SettingsSchema = 'org.gnome.shell.extensions.screenshot';

export const KeyEnableIndicator = 'enable-indicator';

export const KeyEnableNotification = 'enable-notification';

export const ValueShortcutSelectArea = 'shortcut-select-area';
export const ValueShortcutSelectWindow = 'shortcut-select-window';
export const ValueShortcutSelectDesktop = 'shortcut-select-desktop';
export const ValueShortcutOpenPortal = 'shortcut-open-portal';

export const KeyShortcuts = [
  ValueShortcutSelectArea,
  ValueShortcutSelectWindow,
  ValueShortcutSelectDesktop,
  ValueShortcutOpenPortal,
];

// See schemas/org.gnome.shell.extensions.screenshot.gschema.xml
export const KeyClickAction = 'click-action';

export const ClickActions = {
  SHOW_MENU: 'show-menu',
  SELECT_AREA: 'select-area',
  SELECT_WINDOW: 'select-window',
  SELECT_DESKTOP: 'select-desktop',
  OPEN_PORTAL: 'open-portal',
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

export const KeyEffectRescale = 'effect-rescale';

export const KeyEnableRunCommand = 'enable-run-command';
export const KeyRunCommand = 'run-command';

export class Config {
  constructor(public settings: Gio.Settings) {}
  private get<T>(key: string, f: (s: Gio.Settings) => T | null): T {
    const value = f(this.settings);
    if (value === null) {
      throw new Error(`invalid config value for ${key}`);
    }
    return value;
  }
  getString(key: string): string {
    return this.get(key, (s) => s.get_string(key));
  }

  getInt(key: string): number {
    return this.get(key, (s) => s.get_int(key));
  }

  getBool(key: string): boolean {
    return this.get(key, (s) => s.get_boolean(key));
  }
}
