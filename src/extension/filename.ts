import * as GLib from '@imports/GLib-2.0';
import StringFormat from 'string-format';

import { _ } from '../gselib/gettext';
import { TemplateParam, toObject, toTooltipText } from './templateParams';

type FilenameVars = { width: number; height: number };

function parameters({ width, height }: FilenameVars): TemplateParam[] {
  const now = new Date();
  const hostname = GLib.get_host_name();

  const padZero = (s, n) => {
    if (String(s).length < n) {
      return padZero('0' + s, n);
    } else {
      return s;
    }
  };

  const pad = (s) => padZero(s, 2);

  return [
    ['N', _('Screenshot'), _('Screenshot (literal)')],
    ['Y', now.getFullYear(), _('Year')],
    ['m', pad(now.getMonth() + 1), _('Month')],
    ['d', pad(now.getDate()), _('Day')],
    ['H', pad(now.getHours()), _('Hour')],
    ['M', pad(now.getMinutes()), _('Minute')],
    ['S', pad(now.getSeconds()), _('Second')],
    ['w', width, _('Width')],
    ['h', height, _('Height')],
    ['hn', hostname, _('Hostname')],
  ];
}

export function tooltipText(vars: FilenameVars): string {
  return toTooltipText(parameters(vars));
}

export function get(template: string, vars: FilenameVars, n?: number): string {
  const basename = StringFormat(template, toObject(parameters(vars)));
  let sequence = '';
  if (n && n > 0) {
    sequence = '_' + String(n);
  }
  return basename + sequence + '.png';
}

export function isValidTemplate(template: string): boolean {
  try {
    StringFormat(template);
    return true;
  } catch (e) {
    return false;
  }
}

const tempfilePattern = 'gnome-shell-screenshot-XXXXXX.png';

export function getTemp(): string {
  const [, fileName] = GLib.file_open_tmp(tempfilePattern);
  return fileName;
}
