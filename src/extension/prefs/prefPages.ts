import * as Commands from '../commands';
import * as Filename from '../filename';

import * as Config from '../config';

import {
  enableKey,
  prefComboBox,
  PrefComboBoxOption,
  prefEntry,
  prefFileChooser,
  prefKeybinding,
  prefKeybindings,
  PrefKeybindings,
  PrefPage,
  prefPage,
  prefPreview,
  PrefRow,
  prefRow,
  prefSwitch,
} from './prefModel';
import { _ } from '../gettext';

function getBackendPrefs(): PrefRow[] {
  const comboBoxOptions: PrefComboBoxOption[] = [
    [_('gnome-screenshot'), Config.Backends.GNOME_SCREENSHOT_CLI],
    [_('Desktop Portal'), Config.Backends.DESKTOP_PORTAL],
    [_('Shell UI'), Config.Backends.SHELL_UI],
  ];

  return [prefRow(_('Backend'), prefComboBox(comboBoxOptions, Config.KeyBackend))];
}

function getIndicatorPrefs(): PrefRow[] {
  const [optionNothing, optionImageData, optionLocalPath] = [
    [_('Nothing'), Config.ClipboardActions.NONE],
    [_('Image Data'), Config.ClipboardActions.SET_IMAGE_DATA],
    [_('Local Path'), Config.ClipboardActions.SET_LOCAL_PATH],
    // TODO
    // [_("Remote URL")    , Config.ClipboardActions.SET_REMOTE_URL]
  ] as PrefComboBoxOption[];

  return [
    prefRow(_('Show Indicator'), prefSwitch(Config.KeyEnableIndicator)),
    prefRow(_('Show Notification After Capture'), prefSwitch(Config.KeyEnableNotification)),
    prefRow(
      _('Primary Button'),
      prefComboBox(
        [
          [_('Select Area'), Config.ClickActions.SELECT_AREA],
          [_('Select Window'), Config.ClickActions.SELECT_WINDOW],
          [_('Select Desktop'), Config.ClickActions.SELECT_DESKTOP],
          [_('Open Portal'), Config.ClickActions.OPEN_PORTAL],
          [_('Show Menu'), Config.ClickActions.SHOW_MENU],
        ],
        Config.KeyClickAction,
      ),
    ),
    prefRow(_('Copy Button'), prefComboBox([optionImageData, optionLocalPath], Config.KeyCopyButtonAction)),
    prefRow(
      _('Auto-Copy to Clipboard'),
      prefComboBox([optionNothing, optionImageData, optionLocalPath], Config.KeyClipboardAction),
    ),
  ];
}

function getEffectPrefs(): PrefRow[] {
  return [
    prefRow(
      _('Rescale'),
      prefComboBox(
        [
          ['100%', 100],
          ['50%', 50],
        ],
        Config.KeyEffectRescale,
      ),
    ),
  ];
}

function getCommandPrefs(): PrefRow[] {
  return [
    prefRow(_('Run Command After Capture'), prefSwitch(Config.KeyEnableRunCommand)),
    prefRow(
      _('Command'),
      prefEntry({ tooltip: Commands.tooltipText() }, Config.KeyRunCommand, Commands.isValidTemplate),
      {
        enable: enableKey(Config.KeyEnableRunCommand),
      },
    ),
  ];
}

function getStoragePrefs(): PrefRow[] {
  const mockDimensions = { width: 800, height: 600 };

  return [
    prefRow(_('Auto-Save Screenshot'), prefSwitch(Config.KeySaveScreenshot)),
    prefRow(_('Save Location'), prefFileChooser(_('Select'), Config.KeySaveLocation), {
      enable: enableKey(Config.KeySaveScreenshot),
    }),
    prefRow(
      _('Default Filename'),
      prefEntry(
        { tooltip: Filename.tooltipText(mockDimensions) },
        Config.KeyFilenameTemplate,
        Filename.isValidTemplate,
      ),
    ),
    prefRow(
      _('Preview'),
      prefPreview(Config.KeyFilenameTemplate, (config: Config.Config) => {
        return Filename.get(config.getString(Config.KeyFilenameTemplate), mockDimensions);
      }),
    ),
  ];
}

function getImgurPrefs(): PrefRow[] {
  const enableIfImgurEnabled = {
    enable: enableKey(Config.KeyEnableUploadImgur),
  };
  return [
    prefRow(_('Enable Imgur Upload'), prefSwitch(Config.KeyEnableUploadImgur)),
    prefRow(_('Show Upload Notification'), prefSwitch(Config.KeyImgurEnableNotification), enableIfImgurEnabled),
    prefRow(_('Auto-Upload After Capture'), prefSwitch(Config.KeyImgurAutoUpload), enableIfImgurEnabled),
    prefRow(_('Auto-Copy Link After Upload'), prefSwitch(Config.KeyImgurAutoCopyLink), enableIfImgurEnabled),
    prefRow(_('Auto-Open Link After Upload'), prefSwitch(Config.KeyImgurAutoOpenLink), enableIfImgurEnabled),
  ];
}

function getKeybindPrefs(): PrefKeybindings {
  return prefKeybindings([
    prefKeybinding(_('Select area'), Config.ValueShortcutSelectArea),
    prefKeybinding(_('Select window'), Config.ValueShortcutSelectWindow),
    prefKeybinding(_('Select whole desktop'), Config.ValueShortcutSelectDesktop),
    prefKeybinding(_('Open portal'), Config.ValueShortcutOpenPortal),
  ]);
}

export function getPages(): PrefPage[] {
  return [
    prefPage(_('Indicator'), getIndicatorPrefs()),
    prefPage(_('Effects'), getEffectPrefs()),
    prefPage(_('Commands'), getCommandPrefs()),
    prefPage(_('Storage'), getStoragePrefs()),
    prefPage(_('Imgur'), getImgurPrefs()),
    prefPage(_('Keybindings'), getKeybindPrefs()),
    prefPage(_('Backend'), getBackendPrefs()),
  ];
}
