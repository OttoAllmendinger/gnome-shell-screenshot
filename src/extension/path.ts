import * as GLib from '@imports/GLib-2.0';

const PATH_SEPARATOR = '/';

export function join(...segments: string[]): string {
  return [''].concat(segments.filter((e) => e !== '')).join(PATH_SEPARATOR);
}

export function expandUserDir(segment: string): string {
  switch (segment.toUpperCase()) {
    case '$PICTURES':
      return GLib.get_user_special_dir(GLib.UserDirectory.DIRECTORY_PICTURES);
    default:
      return segment;
  }
}

export function expand(path: string): string {
  return join(...path.split(PATH_SEPARATOR).map(expandUserDir));
}
