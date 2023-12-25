// Copies a file to user-defined destination.
//
// Usage:
//   saveDlg.js SRCFILE DSTDIR DSTNAME
//

import Gio from '@girs/gio-2.0';
import GLib from '@girs/glib-2.0';
import Gtk4 from '@girs/gtk-4.0';
import { bindtextdomain, dgettext } from '@girs/gjs/gettext';
import { _, initGettext } from '../extension/gettext';

function getCopyDialog(app: Gtk4.Application, srcPath: string, dstDir?: string, dstName?: string): Gtk4.Dialog {
  const srcFile = Gio.File.new_for_path(srcPath);

  const dlg = new Gtk4.FileChooserDialog({
    application: app,
    action: Gtk4.FileChooserAction.SAVE,
  });

  dlg.add_button(_('_Cancel'), Gtk4.ResponseType.CANCEL);
  dlg.add_button(_('_Save'), Gtk4.ResponseType.OK);

  if (dstDir) {
    const v = Gio.File.new_for_path(dstDir);
    dlg.set_current_folder(v as any);
  }

  if (dstName) {
    dlg.set_current_name(dstName);
  }

  dlg.connect('response', (_dialog, response) => {
    if (response === Gtk4.ResponseType.OK) {
      const f = dlg.get_file();
      if (!f) {
        throw new Error();
      }
      srcFile.copy(f, Gio.FileCopyFlags.OVERWRITE, null, null);
    }
    dlg.close();
  });

  return dlg;
}

function main(argv: string[]) {
  const localeDir = GLib.getenv('LOCALE_DIR');
  if (localeDir) {
    const domain = 'gnome-shell-screenshot';
    bindtextdomain(domain, localeDir);
    initGettext((s) => dgettext(domain, s));
  }

  const [srcPath, dstDir, dstName] = [argv[0], argv[1], argv[2]].map(decodeURIComponent);

  if (!srcPath) {
    throw new Error('no srcPath');
  }

  const app = new Gtk4.Application({
    application_id: 'org.gnome.GnomeShellScreenshot.SaveDialog',
    flags: Gio.ApplicationFlags.FLAGS_NONE,
  });

  app.connect('activate', () => {
    getCopyDialog(app, srcPath, dstDir, dstName).show();
  });

  app.run([]);
}

if ('ARGV' in window) {
  main(window['ARGV'] as string[]);
}
