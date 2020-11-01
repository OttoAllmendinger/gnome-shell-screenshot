import * as Gtk from '@imports/Gtk-3.0';

import { _ } from '../../gettext';

import * as Config from '../config';

import { buildConfigSwitch, bindSensitivity } from './widgets';

export function getPage(settings) {
  const prefs = new Gtk.Box({
    orientation: Gtk.Orientation.VERTICAL,
    margin: 20,
    margin_top: 10,
    expand: false,
  });

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

  bindSensitivity(configSwitchEnable.gtkSwitch, configSwitchEnableNotification.gtkLabel);
  bindSensitivity(configSwitchEnable.gtkSwitch, configSwitchEnableNotification.gtkSwitch);

  /* Auto-Upload After Capture [on|off] */

  const configSwitchUploadOnCapture = buildConfigSwitch(
    settings,
    _('Auto-Upload After Capture'),
    Config.KeyImgurAutoUpload,
  );

  bindSensitivity(configSwitchEnable.gtkSwitch, configSwitchUploadOnCapture.gtkLabel);
  bindSensitivity(configSwitchEnable.gtkSwitch, configSwitchUploadOnCapture.gtkSwitch);

  prefs.add(configSwitchUploadOnCapture.hbox);

  /* Auto-Copy Link After Upload [on|off] */

  const configSwitchCopyLinkOnUpload = buildConfigSwitch(
    settings,
    _('Auto-Copy Link After Upload'),
    Config.KeyImgurAutoCopyLink,
  );

  bindSensitivity(configSwitchEnable.gtkSwitch, configSwitchCopyLinkOnUpload.gtkLabel);
  bindSensitivity(configSwitchEnable.gtkSwitch, configSwitchCopyLinkOnUpload.gtkSwitch);

  prefs.add(configSwitchCopyLinkOnUpload.hbox);

  /* Auto-Open Link After Upload [on|off] */

  const configSwitchOpenLinkOnUpload = buildConfigSwitch(
    settings,
    _('Auto-Open Link After Upload'),
    Config.KeyImgurAutoOpenLink,
  );
  bindSensitivity(configSwitchEnable.gtkSwitch, configSwitchOpenLinkOnUpload.gtkLabel);
  bindSensitivity(configSwitchEnable.gtkSwitch, configSwitchOpenLinkOnUpload.gtkSwitch);

  prefs.add(configSwitchOpenLinkOnUpload.hbox);

  return prefs;
}
