import GLib from '@girs/glib-2.0';

const PATH_SEPARATOR = '/';

export function join(...segments: string[]): string {
  return [''].concat(segments.filter((e) => e !== '')).join(PATH_SEPARATOR);
}

export function expandUserDir(segment: string): string {
  switch (segment.toUpperCase()) {
    case '$PICTURES':
      const v = GLib.get_user_special_dir(GLib.UserDirectory.DIRECTORY_PICTURES);
      if (v === null) {
        throw new Error('could not expand special dir');
      }
      return v;
    default:
      return segment;
  }
}

export function expand(path: string): string {
  return join(...path.split(PATH_SEPARATOR).map(expandUserDir));
}
