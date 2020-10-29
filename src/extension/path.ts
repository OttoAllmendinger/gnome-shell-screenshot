import * as GLib from '@imports/GLib-2.0';

const PATH_SEPARATOR = '/';

export const join = (...segments) => {
  return [''].concat(segments.filter((e) => e !== '')).join(PATH_SEPARATOR);
};

const expandUserDir = (segment) => {
  switch (segment.toUpperCase()) {
    case '$PICTURES':
      return GLib.get_user_special_dir(GLib.UserDirectory.DIRECTORY_PICTURES);
    default:
      return segment;
  }
};

export const expand = (path) => {
  return join(...path.split(PATH_SEPARATOR).map(expandUserDir));
};
