import * as GLib from '@imports/GLib-2.0';
import * as StringFormat from '../vendor/stringformat';

import { _ } from '../gselib/gettext';

const parameters = ({ width, height }) => {
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
};

export const tooltipText = (dim) => {
  const head = [_('Parameters:')];
  return parameters(dim)
    .reduce((arr, [key, _value, description]) => {
      arr.push(key + '\t' + description);
      return arr;
    }, head)
    .join('\n');
};

export const get = (template, dim, n?) => {
  const vars = parameters(dim).reduce((obj, [key, value]) => {
    obj[key] = value;
    return obj;
  }, {});
  const basename = StringFormat.format(template, vars);
  let sequence = '';
  if (n > 0) {
    sequence = '_' + String(n);
  }
  return basename + sequence + '.png';
};

const tempfilePattern = 'gnome-shell-screenshot-XXXXXX.png';

export const getTemp = function () {
  const [, fileName] = GLib.file_open_tmp(tempfilePattern);
  return fileName;
};
