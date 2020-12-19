import * as Gtk from '@imports/Gtk-3.0';
import * as Gio from '@imports/Gio-2.0';
import * as GObject from '@imports/GObject-2.0';

import { _ } from '../../gselib/gettext';

import * as Config from '../config';

import { getComboBox, buildConfigRow, buildPage } from './widgets';

export function getPage(settings: Gio.Settings): Gtk.Box {
  const prefs = buildPage();

  /* Rescale [dropdown] */

  const labelRescale = _('Rescale');

  const rescaleOptions = [
    ['100%', 100],
    ['50%', 50],
  ];

  const currentRescale = settings.get_int(Config.KeyEffectRescale);

  const comboBoxRescale = getComboBox(rescaleOptions, GObject.TYPE_INT, currentRescale, (value) =>
    settings.set_int(Config.KeyEffectRescale, value as number),
  );

  prefs.add(buildConfigRow(labelRescale, comboBoxRescale));

  return prefs;
}
