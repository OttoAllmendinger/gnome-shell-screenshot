// vi: sts=2 sw=2 et

var exports = {
  IndicatorName: "de.ttll.GnomeScreenshot",

  SettingsSchema: "org.gnome.shell.extensions.screenshot",

  KeyEnableIndicator: "enable-indicator",

  KeyEnableNotification: "enable-notification",

  KeyShortcuts: [
    "shortcut-select-area",
    "shortcut-select-window",
    "shortcut-select-desktop"
  ],


  // See schemas/org.gnome.shell.extensions.screenshot.gschema.xml
  KeyClickAction: "click-action",

  ClickActions: {
    SHOW_MENU: 0,
    SELECT_AREA: 1,
    SELECT_WINDOW: 2,
    SELECT_DESKTOP: 3
  },

  KeyCaptureDelay: "capture-delay",

  KeySaveScreenshot: "save-screenshot",

  KeySaveLocation: "save-location",

  KeyFilenameTemplate: "filename-template",

  // "Auto-Copy to Clipboard" action
  KeyClipboardAction: "clipboard-action",
  // Copy button action
  KeyCopyButtonAction: "copy-button-action",

  ClipboardActions: {
    NONE: "none",
    SET_IMAGE_DATA: "set-image-data",
    SET_LOCAL_PATH: "set-local-path",
    SET_REMOTE_URL: "set-remote-url"
  },

  KeyEnableUploadImgur: "enable-imgur",
  KeyImgurEnableNotification: "imgur-enable-notification",
  KeyImgurAutoUpload: "imgur-auto-upload",
  KeyImgurAutoCopyLink: "imgur-auto-copy-link",
  KeyImgurAutoOpenLink: "imgur-auto-open-link",
};
