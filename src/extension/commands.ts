import StringFormat from 'string-format';

import * as Gio from '@imports/Gio-2.0';
import * as GLib from '@imports/GLib-2.0';

import * as Config from './config';

import { _ } from '../gselib/gettext';

import { toObject, toTooltipText } from './templateParams';
import { spawnAsync } from './spawnUtil';
import ExtensionUtils from '../gselib/extensionUtils';

type CommandVars = {
  filename: string;
};

const settings = ExtensionUtils.getSettings();

function parameters(v: CommandVars): [string, string, string][] {
  return [['f', GLib.shell_quote(v.filename), _('Filename')]];
}

export function tooltipText(): string {
  return toTooltipText(parameters({ filename: '/path/to/file.png' }));
}

export function getCommand(file: Gio.File): string {
  const filename = file.get_path();
  if (!filename) {
    throw new Error('path: null');
  }
  return StringFormat(settings.get_string(Config.KeyRunCommand), toObject(parameters({ filename })));
}

export async function exec(file: Gio.File): Promise<string> {
  const command = getCommand(file);
  const [ok, argv] = GLib.shell_parse_argv(command);
  if (!ok || !argv) {
    throw new Error('argv parse error command=' + command);
  }
  await spawnAsync(argv);
  return command;
}
