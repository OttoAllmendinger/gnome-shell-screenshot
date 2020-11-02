import * as Gtk from '@imports/Gtk-3.0';
import * as GObject from '@imports/GObject-2.0';

import { _ } from '../../gettext';

import * as Config from '../config';

import { getComboBox, buildConfigRow, buildPage } from './widgets';

export function getPage(settings) {
  const prefs = buildPage();

  /* Rescale [dropdown] */

  const labelRescale = new Gtk.Label({
    label: _('Rescale'),
    xalign: 0,
    expand: true,
  });

  const rescaleOptions = [
    ['100%', 100],
    ['50%', 50],
  ];

  const currentRescale = settings.get_int(Config.KeyEffectRescale);

  const comboBoxRescale = getComboBox(rescaleOptions, GObject.TYPE_INT, currentRescale, (value) =>
    settings.set_int(Config.KeyEffectRescale, value),
  );

  prefs.add(buildConfigRow(labelRescale, comboBoxRescale));

  return prefs;
}
