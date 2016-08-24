#!/usr/bin/env gjs
// vi: sts=2 sw=2 et
//
// Copies a file to user-defined destination.
//
// Usage:
//   saveDlg.js SRCFILE DSTDIR DSTNAME
//
//
const Gio = imports.gi.Gio;
const Gtk = imports.gi.Gtk;

const copy = (srcPath, dstDir, dstName) => {
  if (!srcPath) {
    print("no srcPath");
    return;
  }
  let srcFile = Gio.File.new_for_path(srcPath);

  Gtk.init(null, null);

  let dlg = new Gtk.FileChooserDialog({ action: Gtk.FileChooserAction.SAVE });

  dlg.add_button("_Cancel", Gtk.ResponseType.CANCEL);
  dlg.add_button("_Save", Gtk.ResponseType.OK);

  if (dstDir) {
    let dstDirFile = Gio.File.new_for_path(dstDir);
    dlg.set_current_folder_file(dstDirFile);
  }

  if (dstName) {
    dlg.set_current_name(dstName);
  }

  if (dlg.run() !== Gtk.ResponseType.OK) {
      return;
  }

  let dstFile = Gio.File.new_for_path(dlg.get_filename());
  srcFile.copy(dstFile, Gio.FileCopyFlags.NONE, null, null);
}

if (window["ARGV"]) {
  copy(ARGV[0], ARGV[1], ARGV[2])
}
