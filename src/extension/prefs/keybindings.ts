import * as Gtk from '@imports/Gtk-3.0';
import * as GObject from '@imports/GObject-2.0';

import { _ } from '../../gettext';

// accelerator setting based on
// https://github.com/ambrice/spatialnavigation-tastycactus.com/blob/master/prefs.js

export function getPage(settings) {
  const model = new Gtk.ListStore();

  model.set_column_types([GObject.TYPE_STRING, GObject.TYPE_STRING, GObject.TYPE_INT, GObject.TYPE_INT]);

  const bindings = [
    ['shortcut-select-area', _('Select area')],
    ['shortcut-select-window', _('Select window')],
    ['shortcut-select-desktop', _('Select whole desktop')],
  ];

  for (const [name, description] of bindings) {
    log('binding: ' + name + ' description: ' + description);
    const binding = settings.get_strv(name)[0];

    let key, mods;

    if (binding) {
      [key, mods] = Gtk.accelerator_parse(binding);
    } else {
      [key, mods] = [0, 0];
    }

    const row = model.append();

    model.set(row, [0, 1, 2, 3], [name, description, mods, key]);
  }

  const treeview = new Gtk.TreeView({
    expand: true,
    model,
  });

  let cellrend = new Gtk.CellRendererText();
  let col = new Gtk.TreeViewColumn({
    title: _('Keyboard Shortcut'),
    expand: true,
  });

  col.pack_start(cellrend, true);
  col.add_attribute(cellrend, 'text', 1);
  treeview.append_column(col);

  cellrend = new Gtk.CellRendererAccel({
    editable: true,
    accel_mode: Gtk.CellRendererAccelMode.GTK,
  });

  cellrend.connect('accel-edited', (rend, iter, key, mods) => {
    const value = Gtk.accelerator_name(key, mods);
    const [succ, iterator] = model.get_iter_from_string(iter);

    if (!succ) {
      throw new Error('Error updating keybinding');
    }

    const name = model.get_value(iterator, 0);

    model.set(iterator, [2, 3], [mods, key]);
    settings.set_strv(name, [value]);
  });

  cellrend.connect('accel-cleared', (rend, iter, _key, _mods) => {
    const [succ, iterator] = model.get_iter_from_string(iter);

    if (!succ) {
      throw new Error('Error clearing keybinding');
    }

    const name = model.get_value(iterator, 0);

    model.set(iterator, [2, 3], [0, 0]);
    settings.set_strv(name, []);
  });

  col = new Gtk.TreeViewColumn({ title: _('Modify'), min_width: 200 });

  col.pack_end(cellrend, false);
  col.add_attribute(cellrend, 'accel-mods', 2);
  col.add_attribute(cellrend, 'accel-key', 3);
  treeview.append_column(col);

  return treeview;
}
