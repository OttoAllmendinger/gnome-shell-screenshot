import * as Gtk from '@imports/Gtk-3.0';
import * as GObject from '@imports/GObject-2.0';
import { Settings } from '@imports/Gio-2.0';

export function bindSensitivity(source: Gtk.Switch, target: Gtk.Widget | Gtk.Switch): void {
  const set = () => {
    target.set_sensitive(source.active);
  };
  source.connect('notify::active', set);
  set();
}

export function buildPage(): Gtk.Box {
  return new Gtk.Box({
    orientation: Gtk.Orientation.VERTICAL,
    margin: 20,
    margin_top: 10,
    expand: false,
  });
}

export function buildHbox(): Gtk.Box {
  return new Gtk.Box({
    orientation: Gtk.Orientation.HORIZONTAL,
    margin_top: 5,
    expand: false,
    hexpand: false,
    vexpand: false,
    margin_bottom: 10,
  });
}

export function getComboBox<T>(
  options: T[][],
  valueType: GObject.Type,
  defaultValue: T,
  callback: (v: T) => void,
): Gtk.ComboBox {
  const model = new Gtk.ListStore();

  const Columns = { LABEL: 0, VALUE: 1 };

  model.set_column_types([GObject.TYPE_STRING, valueType]);

  const comboBox = new Gtk.ComboBox({ model });
  const renderer = new Gtk.CellRendererText();

  comboBox.pack_start(renderer, true);
  comboBox.add_attribute(renderer, 'text', 0);

  for (const [label, value] of options) {
    let iter;

    model.set((iter = model.append()), [Columns.LABEL, Columns.VALUE], [label, value]);

    if (value === defaultValue) {
      comboBox.set_active_iter(iter);
    }
  }

  comboBox.connect('changed', (_entry) => {
    const [success, iter] = comboBox.get_active_iter();

    if (!success) {
      return;
    }

    const value = model.get_value(iter, Columns.VALUE);

    callback(value);
  });

  return comboBox;
}

export function buildLabel(label: string): Gtk.Label {
  return new Gtk.Label({
    label,
    xalign: 0,
    expand: true,
  });
}

export function buildConfigRow(label: string | Gtk.Widget, widget: Gtk.Widget): Gtk.Box {
  if (typeof label === 'string') {
    return buildConfigRow(buildLabel(label), widget);
  }
  const hbox = buildHbox();
  hbox.add(label);
  hbox.add(widget);
  return hbox;
}

export function buildConfigSwitch(
  settings: Settings,
  label: string,
  configKey: string,
): {
  hbox: Gtk.Box;
  gtkSwitch: Gtk.Switch;
} {
  const gtkSwitch = new Gtk.Switch();

  gtkSwitch.connect('notify::active', (button) => {
    settings.set_boolean(configKey, button.active);
  });

  gtkSwitch.active = settings.get_boolean(configKey);

  return {
    hbox: buildConfigRow(label, (gtkSwitch as unknown) as Gtk.Widget),
    gtkSwitch,
  };
}
