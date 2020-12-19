import * as Gtk from '@imports/Gtk-3.0';
import * as GObject from '@imports/GObject-2.0';
import * as Gio from '@imports/Gio-2.0';

import { _ } from '../../gselib/gettext';

import * as Config from '../config';

import { buildConfigSwitch, getComboBox, buildConfigRow, buildPage } from './widgets';

export function getPage(settings: Gio.Settings): Gtk.Box {
  const prefs = buildPage();

  /* Show indicator [on|off] */

  const switchShowIndicator = buildConfigSwitch(settings, _('Show Indicator'), Config.KeyEnableIndicator);

  prefs.add(switchShowIndicator.hbox);

  /* Show notification [on|off] */

  const switchShowNotification = buildConfigSwitch(
    settings,
    _('Show Notification After Capture'),
    Config.KeyEnableNotification,
  );

  prefs.add(switchShowNotification.hbox);

  /* Default click action [dropdown] */

  const labelDefaultClickAction = _('Primary Button');

  const clickActionOptions = [
    [_('Select Area'), Config.ClickActions.SELECT_AREA],
    [_('Select Window'), Config.ClickActions.SELECT_WINDOW],
    [_('Select Desktop'), Config.ClickActions.SELECT_DESKTOP],
    [_('Show Menu'), Config.ClickActions.SHOW_MENU],
  ];

  const currentClickAction = settings.get_enum(Config.KeyClickAction);

  const comboBoxDefaultClickAction = getComboBox(clickActionOptions, GObject.TYPE_INT, currentClickAction, (value) =>
    settings.set_enum(Config.KeyClickAction, value as number),
  );

  prefs.add(buildConfigRow(labelDefaultClickAction, comboBoxDefaultClickAction));

  /* Clipboard Action [dropdown] */

  const [optionNothing, optionImageData, optionLocalPath] = [
    [_('Nothing'), Config.ClipboardActions.NONE],
    [_('Image Data'), Config.ClipboardActions.SET_IMAGE_DATA],
    [_('Local Path'), Config.ClipboardActions.SET_LOCAL_PATH],
    // TODO
    // [_("Remote URL")    , Config.ClipboardActions.SET_REMOTE_URL]
  ];

  const clipboardActionDropdown = (label, { options, configKey }) => {
    const currentValue = settings.get_string(configKey);

    const comboBoxClipboardContent = getComboBox(options, GObject.TYPE_STRING, currentValue, (value) =>
      settings.set_string(configKey, value),
    );

    prefs.add(buildConfigRow(label, comboBoxClipboardContent));
  };

  clipboardActionDropdown(_('Copy Button'), {
    options: [optionImageData, optionLocalPath],
    configKey: Config.KeyCopyButtonAction,
  });

  clipboardActionDropdown(_('Auto-Copy to Clipboard'), {
    options: [optionNothing, optionImageData, optionLocalPath],
    configKey: Config.KeyClipboardAction,
  });

  return prefs;
}
