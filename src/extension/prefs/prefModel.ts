import { Settings } from '@imports/Gio-2.0';

export type PrefSwitch = {
  type: 'Switch';
  settingsKey: string;
};

export function prefSwitch(settingsKey: string): PrefSwitch {
  return {
    type: 'Switch',
    settingsKey,
  };
}

export type PrefComboBoxOption = [label: string, value: number | string];

export type PrefComboBox = {
  type: 'ComboBox';
  options: PrefComboBoxOption[];
  settingsKey: string;
};

export function prefComboBox(options: PrefComboBoxOption[], settingsKey: string): PrefComboBox {
  return {
    type: 'ComboBox',
    options,
    settingsKey,
  };
}

export type PrefFileChooser = {
  type: 'FileChooser';
  label: string;
  settingsKey: string;
};

export function prefFileChooser(label: string, settingsKey: string): PrefFileChooser {
  return {
    type: 'FileChooser',
    label,
    settingsKey,
  };
}

export type PrefEntry = {
  type: 'Entry';
  settingsKey: string;
  tooltip?: string;
  validate(s: string): boolean;
};

export function prefEntry(
  opts: { tooltip?: string },
  settingsKey: string,
  validate: (s: string) => boolean,
): PrefEntry {
  return {
    type: 'Entry',
    settingsKey,
    tooltip: opts.tooltip,
    validate,
  };
}

export type PrefPreview = {
  type: 'Preview';
  settingsKey: string;
  format(s: Settings): string;
};

export function prefPreview(settingsKey: string, format: (v: Settings) => string): PrefPreview {
  return {
    type: 'Preview',
    settingsKey,
    format,
  };
}

export type EnableFunc = (settings: Settings) => boolean;

export function enableKey(k: string): EnableFunc {
  return function (s: Settings) {
    return s.get_boolean(k);
  };
}

export type PrefRowWidget = PrefSwitch | PrefComboBox | PrefFileChooser | PrefEntry | PrefPreview;

export type PrefRow = { label: string; widget: PrefRowWidget; enable: EnableFunc };

export function prefRow(
  label: string,
  widget: PrefRowWidget,
  { enable = () => true }: { enable?: EnableFunc } = {},
): PrefRow {
  return {
    label,
    widget,
    enable,
  };
}

export type PrefKeybinding = { label: string; settingsKey: string };

export function prefKeybinding(label: string, settingsKey: string): PrefKeybinding {
  return { label, settingsKey };
}

export type PrefKeybindings = {
  type: 'Keybindings';
  bindings: PrefKeybinding[];
};

export function prefKeybindings(bindings: PrefKeybinding[]): PrefKeybindings {
  return {
    type: 'Keybindings',
    bindings,
  };
}

export type PrefPage = { label: string; rows: PrefRow[] } | { label: string; widget: PrefKeybindings };

export function prefPage(label: string, child: PrefRow[] | PrefKeybindings): PrefPage {
  if (Array.isArray(child)) {
    return { label, rows: child };
  }

  return { label, widget: child };
}
