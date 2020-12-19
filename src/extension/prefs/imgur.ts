import * as Gtk from '@imports/Gtk-3.0';
import * as Gio from '@imports/Gio-2.0';

import { _ } from '../../gselib/gettext';

import * as Config from '../config';

import { buildPage, buildConfigSwitch, bindSensitivity } from './widgets';

export function getPage(settings: Gio.Settings): Gtk.Box {
  const prefs = buildPage();

  /* Enable Imgur Upload [on|off] */

  const configSwitchEnable = buildConfigSwitch(settings, _('Enable Imgur Upload'), Config.KeyEnableUploadImgur);

  prefs.add(configSwitchEnable.hbox);

  /* Enable Upload Notification [on|off] */
  const configSwitchEnableNotification = buildConfigSwitch(
    settings,
    _('Show Upload Notification'),
    Config.KeyImgurEnableNotification,
  );

  prefs.add(configSwitchEnableNotification.hbox);

  bindSensitivity(configSwitchEnable.gtkSwitch, configSwitchEnableNotification.hbox);

  /* Auto-Upload After Capture [on|off] */

  const configSwitchUploadOnCapture = buildConfigSwitch(
    settings,
    _('Auto-Upload After Capture'),
    Config.KeyImgurAutoUpload,
  );

  bindSensitivity(configSwitchEnable.gtkSwitch, configSwitchUploadOnCapture.hbox);

  prefs.add(configSwitchUploadOnCapture.hbox);

  /* Auto-Copy Link After Upload [on|off] */

  const configSwitchCopyLinkOnUpload = buildConfigSwitch(
    settings,
    _('Auto-Copy Link After Upload'),
    Config.KeyImgurAutoCopyLink,
  );

  bindSensitivity(configSwitchEnable.gtkSwitch, configSwitchCopyLinkOnUpload.hbox);

  prefs.add(configSwitchCopyLinkOnUpload.hbox);

  /* Auto-Open Link After Upload [on|off] */

  const configSwitchOpenLinkOnUpload = buildConfigSwitch(
    settings,
    _('Auto-Open Link After Upload'),
    Config.KeyImgurAutoOpenLink,
  );
  bindSensitivity(configSwitchEnable.gtkSwitch, configSwitchOpenLinkOnUpload.hbox);

  prefs.add(configSwitchOpenLinkOnUpload.hbox);

  return prefs;
}
