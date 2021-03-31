import * as Gtk3 from '@imports/Gtk-3.0';
import * as Gtk4 from '@imports/Gtk-4.0';
import * as Gio from '@imports/Gio-2.0';
import * as GLib from '@imports/GLib-2.0';
import { VariantClass } from '@imports/GLib-2.0';
import * as GObject from '@imports/GObject-2.0';

import { _ } from '../../gselib/gettext';

import * as Path from '../path';

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

type GtkVersion = 3 | 4;

function getGtkVersion(): GtkVersion {
  const v = Gtk3.get_major_version();
  if (v === 3 || v === 4) {
    return v;
  }
  throw new Error('unsupported version');
}

function getCompatRoot(w: Gtk4.Widget): Gtk4.Window {
  switch (getGtkVersion()) {
    case 3:
      return (((w as unknown) as Gtk3.Widget).get_toplevel() as unknown) as Gtk4.Window;
    case 4:
      return w.get_root() as Gtk4.Window;
  }
  throw new Error('unsupported version');
}

function getGVariantClassName(vc: GLib.VariantClass): string {
  for (const k of Object.keys(GLib.VariantClass)) {
    if ((GLib.VariantClass as any)[k] === vc) {
      return k;
    }
  }

  throw new Error(`unknown class ${vc}`);
}

function getGObjectTypeFromGVariantClass(vc: GLib.VariantClass): GObject.Type {
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
    case VariantClass.ARRAY:
      throw new Error('not supported');
    case VariantClass.BOOLEAN:
      return v.get_boolean();
    case VariantClass.BYTE:
      return v.get_byte();
    case VariantClass.DICT_ENTRY:
      throw new Error('not supported');
    case VariantClass.DOUBLE:
      return v.get_double();
    case VariantClass.HANDLE:
      throw new Error('not supported');
    case VariantClass.MAYBE:
      throw new Error('not supported');
    case GLib.VariantClass.INT16:
      return v.get_int16();
    case GLib.VariantClass.INT32:
      return v.get_int32();
    case GLib.VariantClass.INT64:
      return v.get_int64();
    case VariantClass.VARIANT:
      throw new Error('not supported');
    case VariantClass.STRING:
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
    switch (getGtkVersion()) {
      case 3:
        ((box as unknown) as Gtk3.Box).add((w as unknown) as Gtk3.Widget);
        return;
      case 4:
        box.append(w);
        return;
    }

    throw new Error(`invalid gtk version ${getGtkVersion()}`);
  });
}

function syncSetting<T>(settings: Gio.Settings, key: string, callback: (v: T) => void) {
  settings.connect('changed::' + key, () => {
    callback(unwrapGVariant(settings.get_value(key)));
  });
  callback(unwrapGVariant(settings.get_value(key)));
}

export class PrefBuilder {
  constructor(private settings: Gio.Settings, private window: Gtk4.Window) {}

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
    const valueType = getGObjectTypeFromGVariantClass(defaultValue.classify()!);
    const model = new Gtk4.ListStore();
    const Columns = { LABEL: 0, VALUE: 1 };
    model.set_column_types([GObject.TYPE_STRING, valueType]);
    const comboBox = new Gtk4.ComboBox({ model });
    const renderer = new Gtk4.CellRendererText();
    comboBox.pack_start(renderer, true);
    comboBox.add_attribute(renderer, 'text', 0);

    for (const [label, value] of p.options) {
      const iter = model.append();
      model.set(iter, [Columns.LABEL, Columns.VALUE], [label, value]);
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
      if (p.validate(text)) {
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
        transient_for: getCompatRoot(w),
        modal: true,
      });
      d.add_button(p.label, Gtk4.ResponseType.OK);
      d.add_button(_('Cancel'), Gtk4.ResponseType.CANCEL);
      d.connect('response', (_dialog, response) => {
        if (response === Gtk4.ResponseType.OK) {
          this.setValue(p.settingsKey, d.get_file().get_path());
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
        w.label = p.format(this.settings);
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
        switch (getGtkVersion()) {
          case 3:
            [key, mods] = Gtk3.accelerator_parse(binding);
            break;
          case 4:
            const [success, ...parsed] = Gtk4.accelerator_parse(binding);
            if (!success) {
              throw new Error(`could not parse ${binding}`);
            }
            [key, mods] = parsed;
        }
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
        model.set(iterator, [ColumnShortcutModifiers, ColumnShortcutKey], [mods, key]);
        this.settings.set_strv(name, [value]);
      });

      cellrend.connect('accel-cleared', (rend, path) => {
        const [succ, iterator] = model.get_iter_from_string(path);
        if (!succ) {
          throw new Error('Error clearing keybinding');
        }

        const name = model.get_value(iterator, ColumnConfigKey);
        model.set(iterator, [ColumnShortcutModifiers, ColumnShortcutKey], [0, 0]);
        this.settings.set_strv(name, []);
      });

      const col = new Gtk4.TreeViewColumn({ title: _('Modify'), min_width: 200 });
      col.pack_end(cellrend, false);
      col.add_attribute(cellrend, 'accel-mods', ColumnShortcutModifiers);
      col.add_attribute(cellrend, 'accel-key', ColumnShortcutKey);
      treeview.append_column(col);
    }

    return (treeview as unknown) as Gtk4.Widget;
  }
}

export function buildPrefPages(pages: PrefPage[], settings: Gio.Settings, window: Gtk4.Window): Gtk4.Widget {
  const builder = new PrefBuilder(settings, window);
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

  switch (getGtkVersion()) {
    case 3:
      ((notebook as unknown) as Gtk3.Notebook).show_all();
  }

  return notebook;
}
