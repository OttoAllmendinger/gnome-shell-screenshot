import StringFormat from 'string-format';

import * as Gio from '@imports/Gio-2.0';
import * as GLib from '@imports/GLib-2.0';

import { _ } from '../gselib/extensionUtils';

import { toObject, toTooltipText } from './templateParams';
import { spawnAsync } from './spawnUtil';

type CommandVars = {
  filename: string;
};

export function isValidTemplate(s: string): boolean {
  try {
    StringFormat(s);
    return true;
  } catch (e) {
    return false;
  }
}

function parameters(v: CommandVars): [string, string, string][] {
  return [['f', GLib.shell_quote(v.filename), _('Filename')]];
}

export function tooltipText(): string {
  return toTooltipText(parameters({ filename: '/path/to/file.png' }));
}

export function getCommand(runCommand: string, file: Gio.File): string {
  const filename = file.get_path();
  if (!filename) {
    throw new Error('path: null');
  }
  return StringFormat(runCommand, toObject(parameters({ filename })));
}

export async function exec(runCommand: string, file: Gio.File): Promise<string> {
  const command = getCommand(runCommand, file);
  const [ok, argv] = GLib.shell_parse_argv(command);
  if (!ok || !argv) {
    throw new Error('argv parse error command=' + command);
  }
  await spawnAsync(argv);
  return command;
}
