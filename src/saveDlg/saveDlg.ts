// Copies a file to user-defined destination.
//
// Usage:
//   saveDlg.js SRCFILE DSTDIR DSTNAME
//

import * as Gio from '@imports/Gio-2.0';
import * as Gtk4 from '@imports/Gtk-4.0';

import { _, init as initTranslations } from '../gettext';

function wrapCompatGFileArgument(str: string): Gio.File | string {
  switch (Gtk4.get_major_version()) {
    case 3:
      return str;
    case 4:
      return Gio.File.new_for_path(str);
  }
  throw new Error('unsupported version');
}

function getCopyDialog(app: Gtk4.Application, srcPath: string, dstDir?: string, dstName?: string): Gtk4.Dialog {
  const srcFile = Gio.File.new_for_path(srcPath);

  const dlg = new Gtk4.FileChooserDialog({
    application: app,
    action: Gtk4.FileChooserAction.SAVE,
  });

  dlg.add_button(_('_Cancel'), Gtk4.ResponseType.CANCEL);
  dlg.add_button(_('_Save'), Gtk4.ResponseType.OK);

  if (dstDir) {
    dlg.set_current_folder(wrapCompatGFileArgument(dstDir) as any);
  }

  if (dstName) {
    dlg.set_current_name(dstName);
  }

  dlg.connect('response', (_dialog, response) => {
    if (response === Gtk4.ResponseType.OK) {
      srcFile.copy(dlg.get_file(), Gio.FileCopyFlags.OVERWRITE, null, null);
    }
    dlg.close();
  });

  return dlg;
}

if (window['ARGV']) {
  initTranslations(ARGV[3]);

  const [srcPath, dstDir, dstName] = [ARGV[0], ARGV[1], ARGV[2]].map(decodeURIComponent);

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
