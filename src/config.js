/*jshint moz:true */
// vi: sts=2 sw=2 et

const IndicatorName = 'de.ttll.ImgurUploader';

const SettingsSchema = 'org.gnome.shell.extensions.imgur';

const KeyEnableIndicator = 'enable-indicator';
const KeyClickAction = 'click-action';
const KeyCopyClipboard = 'copy-clipboard';
const KeyKeepFile = 'keep-file';
const KeyShortcuts = [
  'shortcut-select-area',
  'shortcut-select-window',
  'shortcut-select-desktop'
];

const ClickActions = {
  SHOW_MENU: 0,
  SELECT_AREA: 1,
  SELECT_WINDOW: 2,
  SELECT_DESKTOP: 3
};

