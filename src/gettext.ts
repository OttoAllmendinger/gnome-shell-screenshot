import * as Gio from '@imports/Gio-2.0';

const domain = 'gnome-shell-screenshot';
export const _ = imports.gettext.domain(domain).gettext;

export function init(extensionDir) {
  const workDir = Gio.File.new_for_path(extensionDir);
  const localeDir = workDir.get_child('locale');
  if (localeDir.query_exists(null)) {
    imports.gettext.bindtextdomain(domain, localeDir.get_path());
  }
}
