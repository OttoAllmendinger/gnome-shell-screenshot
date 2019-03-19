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

const domain = "gnome-shell-screenshot";
const Gettext = imports.gettext;
const _ = Gettext.domain(domain).gettext;

const copy = (srcPath, dstDir, dstName) => {
  if (!srcPath) {
    print("no srcPath");
    return;
  }
  const srcFile = Gio.File.new_for_path(srcPath);

  Gtk.init(null, null);

  const dlg = new Gtk.FileChooserDialog({ action: Gtk.FileChooserAction.SAVE });

  dlg.add_button( _("_Cancel"), Gtk.ResponseType.CANCEL);
  dlg.add_button( _("_Save"), Gtk.ResponseType.OK);

  dlg.set_do_overwrite_confirmation(true);

  if (dstDir) {
    const dstDirFile = Gio.File.new_for_path(dstDir);
    dlg.set_current_folder_file(dstDirFile);
  }

  if (dstName) {
    dlg.set_current_name(dstName);
  }

  if (dlg.run() !== Gtk.ResponseType.OK) {
      return;
  }

  const dstFile = Gio.File.new_for_path(dlg.get_filename());
  srcFile.copy(dstFile, Gio.FileCopyFlags.OVERWRITE, null, null);
}

if (window["ARGV"]) {

  const workDir = Gio.File.new_for_path(ARGV[3]);
  const localeDir = workDir.get_child("locale");
  if (localeDir.query_exists(null))
    Gettext.bindtextdomain(domain, localeDir.get_path());

  copy(...[ARGV[0], ARGV[1], ARGV[2]].map(decodeURIComponent));
}
