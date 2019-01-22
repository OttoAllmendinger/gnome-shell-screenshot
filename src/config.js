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

  // See schemas/org.gnome.shell.extensions.screenshot.gschema.xml
  KeyClipboardAction: "clipboard-action",

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

  KeyEnableUploadCloudApp: "enable-cloud-app",
  KeyCloudAppEmail: "cloud-app-email",
  KeyCloudAppPassword: "cloud-app-password",
  // See schemas/org.gnome.shell.extensions.screenshot.gschema.xml
  KeyCloudAppLink: "cloud-app-link",
  KeyCloudAppEnableNotification: "cloud-app-enable-notification",
  KeyCloudAppAutoUpload: "cloud-app-auto-upload",
  KeyCloudAppAutoCopyLink: "cloud-app-auto-copy-link",
  KeyCloudAppAutoOpenLink: "cloud-app-auto-open-link",

  CloudAppLinks: {
    SHARE_LINK: "share-link",
    DIRECT_LINK: "direct-link",
    DOWNLOAD_LINK: "download-link"
  },
};
