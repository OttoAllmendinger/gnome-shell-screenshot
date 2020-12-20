import * as Gtk from '@imports/Gtk-3.0';
import * as Gio from '@imports/Gio-2.0';

import { _ } from '../../gselib/gettext';

import * as Config from '../config';

import { bindSensitivity, buildConfigRow, buildConfigSwitch, buildPage } from './widgets';
import * as Commands from '../commands';

export function getPage(settings: Gio.Settings): Gtk.Box {
  const prefs = buildPage();

  const configRowEnableRunCommand = buildConfigSwitch(
    settings,
    _('Run Command After Capture'),
    Config.KeyEnableRunCommand,
  );
  prefs.add(configRowEnableRunCommand.hbox);

  const configRowRunCommand = buildConfigRow(
    _('Command'),
    new Gtk.Entry({
      expand: true,
      tooltip_text: Commands.tooltipText(),
      text: settings.get_string(Config.KeyRunCommand),
    }),
  );

  bindSensitivity(configRowEnableRunCommand.gtkSwitch, configRowRunCommand);
  prefs.add(configRowRunCommand);

  return prefs;
}
