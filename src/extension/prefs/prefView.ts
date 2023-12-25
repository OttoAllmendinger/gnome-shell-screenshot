import Gtk4 from '@girs/gtk-4.0';
import Gio from '@girs/gio-2.0';
import GLib from '@girs/glib-2.0';
import GObject from '@girs/gobject-2.0';

import * as Path from '../path';

import * as Config from '../config';

import {
  PrefComboBox,
  PrefEntry,
  PrefFileChooser,
  PrefKeybindings,
  PrefPage,
  PrefPreview,
  PrefRow,
  PrefRowWidget,
  PrefSwitch,
} from './prefModel';
import { _ } from '../gettext';

function getGVariantClassName(vc: GLib.VariantClass): string {
  for (const k of Object.keys(GLib.VariantClass)) {
    if ((GLib.VariantClass as any)[k] === vc) {
      return k;
    }
  }

  throw new Error(`unknown class ${vc}`);
}

function getGObjectTypeFromGVariantClass(vc: GLib.VariantClass): GObject.GType<number> | GObject.GType<string> {
  switch (vc) {
    case GLib.VariantClass.INT16:
    case GLib.VariantClass.INT32:
    case GLib.VariantClass.INT64:
    case GLib.VariantClass.UINT16:
    case GLib.VariantClass.UINT32:
    case GLib.VariantClass.UINT64:
      return GObject.TYPE_INT;
    case GLib.VariantClass.STRING:
      return GObject.TYPE_STRING;
  }

  throw new Error(`unsupported GVariantClass ${getGVariantClassName(vc)}`);
}

function wrapGVariant(v: any): GLib.Variant {
  switch (typeof v) {
    case 'boolean':
      return GLib.Variant.new_boolean(v);
    case 'number':
      return GLib.Variant.new_int32(v);
    case 'string':
      return GLib.Variant.new_string(v);
  }
  throw new Error(`could not find variant fo ${typeof v}`);
}

function unwrapGVariant(v: GLib.Variant): any {
  switch (v.classify()) {
    case GLib.VariantClass.ARRAY:
      throw new Error('not supported');
    case GLib.VariantClass.BOOLEAN:
      return v.get_boolean();
    case GLib.VariantClass.BYTE:
      return v.get_byte();
    case GLib.VariantClass.DICT_ENTRY:
      throw new Error('not supported');
    case GLib.VariantClass.DOUBLE:
      return v.get_double();
    case GLib.VariantClass.HANDLE:
      throw new Error('not supported');
    case GLib.VariantClass.MAYBE:
      throw new Error('not supported');
    case GLib.VariantClass.INT16:
      return v.get_int16();
    case GLib.VariantClass.INT32:
      return v.get_int32();
    case GLib.VariantClass.INT64:
      return v.get_int64();
    case GLib.VariantClass.VARIANT:
      throw new Error('not supported');
    case GLib.VariantClass.STRING:
      const [str] = v.get_string();
      return str;
    case GLib.VariantClass.UINT16:
      return v.get_uint16();
    case GLib.VariantClass.UINT32:
      return v.get_uint32();
    case GLib.VariantClass.UINT64:
      return v.get_uint64();
  }
}

function addBoxChildren(box: Gtk4.Box, children: Gtk4.Widget[]) {
  children.forEach((w) => {
    box.append(w);
  });
}

function syncSetting<T>(settings: Gio.Settings, key: string, callback: (v: T) => void) {
  settings.connect('changed::' + key, () => {
    callback(unwrapGVariant(settings.get_value(key)));
  });
  callback(unwrapGVariant(settings.get_value(key)));
}

export class PrefBuilder {
  constructor(private settings: Gio.Settings) {}

  getValue(key: string): any {
    return unwrapGVariant(this.settings.get_value(key));
  }

  setValue(key: string, value: any): void {
    this.settings.set_value(key, wrapGVariant(value));
  }

  getDefaultValue(key: string): any {
    const defaultValue = this.settings.get_default_value(key);
    if (defaultValue === null) {
      throw new Error();
    }
    return unwrapGVariant(defaultValue);
  }

  buildSwitch(p: PrefSwitch): Gtk4.Widget {
    const w = new Gtk4.Switch();
    syncSetting<boolean>(this.settings, p.settingsKey, (v) => {
      w.set_active(v);
    });
    w.connect('notify::state', () => {
      this.setValue(p.settingsKey, w.state);
    });
    return w;
  }

  buildComboBox(p: PrefComboBox): Gtk4.Widget {
    const defaultValue = this.settings.get_default_value(p.settingsKey);
    if (!defaultValue) {
      throw new Error(`settings ${p.settingsKey} needs default value`);
    }
    if (!defaultValue.classify()) {
      throw new Error(`could not classify default value for ${p.settingsKey}`);
    }
    const valueType = getGObjectTypeFromGVariantClass(defaultValue.classify());
    const model = new Gtk4.ListStore();
    const Columns = { LABEL: 0, VALUE: 1 };
    model.set_column_types([GObject.TYPE_STRING, valueType]);
    const comboBox = new Gtk4.ComboBox({ model });
    const renderer = new Gtk4.CellRendererText();
    comboBox.pack_start(renderer, true);
    comboBox.add_attribute(renderer, 'text', 0);

    for (const [label, value] of p.options) {
      const iter = model.append();
      model.set(
        iter,
        [Columns.LABEL, Columns.VALUE],
        [label as unknown as GObject.Value, value as unknown as GObject.Value],
      );
    }

    comboBox.connect('changed', () => {
      const [success, iter] = comboBox.get_active_iter();

      if (!success) {
        return;
      }

      const value = model.get_value(iter, Columns.VALUE);
      this.setValue(p.settingsKey, value);
    });

    const setActiveByValue = (v: any) => {
      const [success, iter] = model.get_iter_first();
      if (!success) {
        return;
      }
      for (;;) {
        if (model.get_value(iter, Columns.VALUE) === v) {
          comboBox.set_active_iter(iter);
        }
        if (!model.iter_next(iter)) {
          return;
        }
      }
    };

    syncSetting<string>(this.settings, p.settingsKey, (v) => {
      setActiveByValue(v);
    });

    return comboBox;
  }

  buildEntry(p: PrefEntry): Gtk4.Widget {
    const w = new Gtk4.Entry({
      hexpand: true,
      tooltip_text: p.tooltip,
      secondary_icon_name: 'document-revert',
    });

    syncSetting<string>(this.settings, p.settingsKey, (v) => {
      if (w.text !== v) {
        w.text = v;
      }
    });

    w.get_buffer().connect('notify::text', ({ text }) => {
      if (text && p.validate(text)) {
        this.setValue(p.settingsKey, text);
        w.get_style_context().remove_class('error');
      } else {
        w.get_style_context().add_class('error');
      }
    });

    w.connect('icon-press', () => {
      w.text = this.getDefaultValue(p.settingsKey);
    });

    return w;
  }

  buildFileChooser(p: PrefFileChooser): Gtk4.Widget {
    const w = new Gtk4.Button();
    syncSetting<string>(this.settings, p.settingsKey, (path) => {
      const f = Gio.File.new_for_path(Path.expand(path));
      w.label = f.get_basename() || p.label;
    });
    w.connect('clicked', () => {
      const d = new Gtk4.FileChooserDialog({
        title: p.label,
        action: Gtk4.FileChooserAction.SELECT_FOLDER,
        transient_for: w.get_root() as Gtk4.Window,
        modal: true,
      });
      d.add_button(p.label, Gtk4.ResponseType.OK);
      d.add_button(_('Cancel'), Gtk4.ResponseType.CANCEL);
      d.connect('response', (_dialog, response) => {
        if (response === Gtk4.ResponseType.OK) {
          const f = d.get_file();
          if (!f) {
            throw new Error('could not get file');
          }
          this.setValue(p.settingsKey, f.get_path());
        }
        d.close();
      });
      d.show();
    });
    return w;
  }

  buildPreview(p: PrefPreview): Gtk4.Widget {
    const w = new Gtk4.Label();
    syncSetting<string>(this.settings, p.settingsKey, () => {
      try {
        w.label = p.format(new Config.Config(this.settings));
        w.get_style_context().remove_class('error');
      } catch (e) {
        w.label = 'Error';
        w.get_style_context().add_class('error');
      }
    });
    return w;
  }

  buildPrefWidget(w: PrefRowWidget): Gtk4.Widget {
    switch (w.type) {
      case 'Switch':
        return this.buildSwitch(w);
      case 'ComboBox':
        return this.buildComboBox(w);
      case 'Entry':
        return this.buildEntry(w);
      case 'FileChooser':
        return this.buildFileChooser(w);
      case 'Preview':
        return this.buildPreview(w);
    }
    throw new Error('unknown type');
  }

  buildPageRows(rows: PrefRow[]): Gtk4.Widget {
    const box = new Gtk4.Box({
      orientation: Gtk4.Orientation.VERTICAL,
    });

    const gtkRows = rows.map(({ label, widget }) => {
      const hbox = new Gtk4.Box({
        orientation: Gtk4.Orientation.HORIZONTAL,
        margin_top: 10,
        margin_bottom: 10,
        margin_start: 10,
        margin_end: 10,
      });

      addBoxChildren(hbox, [
        new Gtk4.Label({
          label,
          hexpand: true,
          xalign: 0,
        }),
        this.buildPrefWidget(widget),
      ]);

      return hbox;
    });

    addBoxChildren(box, gtkRows);

    function updateSensitive(settings: Gio.Settings) {
      gtkRows.forEach((gtkRow, i) => {
        gtkRow.set_sensitive(rows[i].enable(settings));
      });
    }

    this.settings.connect('changed', () => {
      updateSensitive(this.settings);
    });

    updateSensitive(this.settings);

    return box;
  }

  buildPrefKeybindings(p: PrefKeybindings): Gtk4.Widget {
    const model = new Gtk4.ListStore();
    model.set_column_types([GObject.TYPE_STRING, GObject.TYPE_STRING, GObject.TYPE_INT, GObject.TYPE_INT]);

    const ColumnConfigKey = 0;
    const ColumnLabel = 1;
    const ColumnShortcutModifiers = 2;
    const ColumnShortcutKey = 3;

    for (const { label, settingsKey } of p.bindings) {
      const binding = this.settings.get_strv(settingsKey)[0];

      let key, mods;

      if (binding) {
        const [success, ...parsed] = Gtk4.accelerator_parse(binding);
        if (!success) {
          throw new Error(`could not parse ${binding}`);
        }
        [key, mods] = parsed;
      } else {
        [key, mods] = [0, 0];
      }

      const row = model.append();

      model.set(
        row,
        [ColumnConfigKey, ColumnLabel, ColumnShortcutModifiers, ColumnShortcutKey],
        [settingsKey, label, mods, key],
      );
    }

    const treeview = new Gtk4.TreeView({
      hexpand: true,
      vexpand: true,
      model,
    });

    {
      const cellrend = new Gtk4.CellRendererText();
      const col = new Gtk4.TreeViewColumn({
        title: _('Keyboard Shortcut'),
        expand: true,
      });

      col.pack_start(cellrend, true);
      col.add_attribute(cellrend, 'text', ColumnLabel);
      treeview.append_column(col);
    }

    {
      const cellrend = new Gtk4.CellRendererAccel({
        editable: true,
        accel_mode: Gtk4.CellRendererAccelMode.GTK,
      });

      cellrend.connect('accel-edited', (rend, path, key, mods) => {
        const value = Gtk4.accelerator_name(key, mods);
        const [succ, iterator] = model.get_iter_from_string(path);
        if (!succ) {
          throw new Error('Error updating keybinding');
        }

        const name = model.get_value(iterator, ColumnConfigKey);
        model.set(
          iterator,
          [ColumnShortcutModifiers, ColumnShortcutKey],
          [mods as unknown as GObject.Value, key as unknown as GObject.Value],
        );
        if (typeof name !== 'string' || typeof value !== 'string') {
          throw new Error();
        }
        this.settings.set_strv(name, [value]);
      });

      cellrend.connect('accel-cleared', (rend, path) => {
        const [succ, iterator] = model.get_iter_from_string(path);
        if (!succ) {
          throw new Error('Error clearing keybinding');
        }

        const name = model.get_value(iterator, ColumnConfigKey);
        model.set(
          iterator,
          [ColumnShortcutModifiers, ColumnShortcutKey],
          [0 as unknown as GObject.Value, 0 as unknown as GObject.Value],
        );
        if (typeof name !== 'string') {
          throw new Error();
        }
        this.settings.set_strv(name, []);
      });

      const col = new Gtk4.TreeViewColumn({ title: _('Modify'), min_width: 200 });
      col.pack_end(cellrend, false);
      col.add_attribute(cellrend, 'accel-mods', ColumnShortcutModifiers);
      col.add_attribute(cellrend, 'accel-key', ColumnShortcutKey);
      treeview.append_column(col);
    }

    return treeview as unknown as Gtk4.Widget;
  }
}

export function buildPrefPages(pages: PrefPage[], settings: Gio.Settings): Gtk4.Widget {
  const builder = new PrefBuilder(settings);
  const notebook = new Gtk4.Notebook();
  pages.forEach((p) => {
    const { label } = p;

    if ('rows' in p) {
      notebook.append_page(builder.buildPageRows(p.rows), new Gtk4.Label({ label }));
    }

    if ('widget' in p) {
      notebook.append_page(builder.buildPrefKeybindings(p.widget), new Gtk4.Label({ label }));
    }
  });

  return notebook;
}
