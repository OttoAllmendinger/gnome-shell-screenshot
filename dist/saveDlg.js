imports.gi.versions.Gtk = imports.gi.GLib.getenv("GTK");

(function (Gio, Gtk4) {
    'use strict';

    var uuid = "gnome-shell-screenshot@ttll.de";
    var name = "Screenshot Tool";
    var url = "https://github.com/OttoAllmendinger/gnome-shell-screenshot/";
    var description = "Conveniently create, copy, store and upload screenshots";
    var metadata = {
    	"shell-version": [
    	"40"
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
    function wrapCompatGFileArgument(str) {
        switch (Gtk4.get_major_version()) {
            case 3:
                return str;
            case 4:
                return Gio.File.new_for_path(str);
        }
        throw new Error('unsupported version');
    }
    function getCopyDialog(app, srcPath, dstDir, dstName) {
        const srcFile = Gio.File.new_for_path(srcPath);
        const dlg = new Gtk4.FileChooserDialog({
            application: app,
            action: Gtk4.FileChooserAction.SAVE,
        });
        dlg.add_button(_('_Cancel'), Gtk4.ResponseType.CANCEL);
        dlg.add_button(_('_Save'), Gtk4.ResponseType.OK);
        if (dstDir) {
            dlg.set_current_folder(wrapCompatGFileArgument(dstDir));
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
        init(ARGV[3]);
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

}(imports.gi.Gio, imports.gi.Gtk));
