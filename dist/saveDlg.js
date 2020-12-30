(function (Gio, Gtk) {
    'use strict';

    var uuid = "gnome-shell-screenshot@ttll.de";
    var name = "Screenshot Tool";
    var url = "https://github.com/OttoAllmendinger/gnome-shell-screenshot/";
    var description = "Conveniently create, copy, store and upload screenshots";
    var metadata = {
    	"shell-version": [
    	"3.32",
    	"3.34",
    	"3.36",
    	"3.38"
    ],
    	uuid: uuid,
    	name: name,
    	url: url,
    	description: description,
    	"settings-schema": "org.gnome.shell.extensions.screenshot",
    	"gettext-domain": "gnome-shell-screenshot",
    	"git-version": "_gitversion_"
    };

    const domain = metadata['gettext-domain'];
    const _ = imports.gettext.domain(domain).gettext;
    function init(extensionDir) {
        const workDir = Gio.File.new_for_path(extensionDir);
        const localeDir = workDir.get_child('locale');
        if (localeDir.query_exists(null)) {
            imports.gettext.bindtextdomain(domain, localeDir.get_path());
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
