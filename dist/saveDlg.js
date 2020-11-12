(function (Gio, Gtk) {
    'use strict';

    var uuid = "gnome-shell-screenshot@ttll.de";

    const _ = imports.gettext.domain(uuid).gettext;
    function init(extensionDir) {
        const workDir = Gio.File.new_for_path(extensionDir);
        const localeDir = workDir.get_child('locale');
        if (localeDir.query_exists(null)) {
            imports.gettext.bindtextdomain(uuid, localeDir.get_path());
        }
    }

    // Copies a file to user-defined destination.
    const copy = (srcPath, dstDir, dstName) => {
        if (!srcPath) {
            print('no srcPath');
            return;
        }
        const srcFile = Gio.File.new_for_path(srcPath);
        Gtk.init(null);
        const dlg = new Gtk.FileChooserDialog({ action: Gtk.FileChooserAction.SAVE });
        dlg.add_button(_('_Cancel'), Gtk.ResponseType.CANCEL);
        dlg.add_button(_('_Save'), Gtk.ResponseType.OK);
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
        const filename = dlg.get_filename();
        if (!filename) {
            throw new Error();
        }
        const dstFile = Gio.File.new_for_path(filename);
        srcFile.copy(dstFile, Gio.FileCopyFlags.OVERWRITE, null, null);
    };
    if (window['ARGV']) {
        init(ARGV[3]);
        const [srcPath, dstDir, dstName] = [ARGV[0], ARGV[1], ARGV[2]].map(decodeURIComponent);
        copy(srcPath, dstDir, dstName);
    }

}(imports.gi.Gio, imports.gi.Gtk));
