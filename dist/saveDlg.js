import Gio from 'gi://Gio?version=2.0';
import GLib from 'gi://GLib?version=2.0';
import Gtk from 'gi://Gtk?version=4.0';
import { bindtextdomain, dgettext } from 'gettext';

let gettextFunc = null;
function initGettext(f) {
    gettextFunc = f;
}
function gettext(s) {
    if (gettextFunc) {
        return gettextFunc(s);
    }
    return s;
}
const _ = gettext;

// Copies a file to user-defined destination.
function getCopyDialog(app, srcPath, dstDir, dstName) {
    const srcFile = Gio.File.new_for_path(srcPath);
    const dlg = new Gtk.FileChooserDialog({
        application: app,
        action: Gtk.FileChooserAction.SAVE,
    });
    dlg.add_button(_('_Cancel'), Gtk.ResponseType.CANCEL);
    dlg.add_button(_('_Save'), Gtk.ResponseType.OK);
    if (dstDir) {
        const v = Gio.File.new_for_path(dstDir);
        dlg.set_current_folder(v);
    }
    if (dstName) {
        dlg.set_current_name(dstName);
    }
    dlg.connect('response', (_dialog, response) => {
        if (response === Gtk.ResponseType.OK) {
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
function main(argv) {
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
    const app = new Gtk.Application({
        application_id: 'org.gnome.GnomeShellScreenshot.SaveDialog',
        flags: Gio.ApplicationFlags.FLAGS_NONE,
    });
    app.connect('activate', () => {
        getCopyDialog(app, srcPath, dstDir, dstName).show();
    });
    app.run([]);
}
if ('ARGV' in window) {
    main(window['ARGV']);
}
