/*jshint moz:true */
const root = "/home/otto/Sync/gnome-shell-screenshot/";
const rootSrc = root + "/src";

if (imports.searchPath.indexOf(rootSrc) <= 0) {
    imports.searchPath.unshift(rootSrc);
}

const St = imports.gi.St;
const Gio = imports.gi.Gio;
const Gtk = imports.gi.Gtk;
const Gdk = imports.gi.Gdk;
const GdkPixbuf = imports.gi.GdkPixbuf;

const Lang = imports.lang;
const Main = imports.ui.main;
const Signals = imports.signals;
const Mainloop = imports.mainloop;
const MessageTray = imports.ui.messageTray;

const NotificationIcon = 'camera-photo-symbolic';
const NotificationSourceName = 'Screenshot Tool Test';

const {dump} = imports.dump;

const ClipboardN = new Lang.Class({
    Name: "ClipboardN",
    Extends: MessageTray.Notification,

    _init: function (source, title, icon, file) {
        this.parent(
            source,
            "New Screenshot",
            "title",
            { gicon: icon }
        );
        this.setForFeedback(true);
        this.setResident(true);
        // this._file = file;
    },

    createBanner: function() {
        let n = this.parent();
        /*
        n.addAction("Copy", () => log("copy"));
        n.addAction("Open", () => log("open"));
        n._iconBin.child.icon_size = 64;
        */
        return n;
    }
});
Signals.addSignalMethods(ClipboardN.prototype);

const getScaledIcon = (path) => {
    let scaledPixbuf = GdkPixbuf.Pixbuf.new_from_file_at_size(path, 64, 64)
    let scaledPath = path + ".scaled";
    scaledPixbuf.savev(scaledPath, "png", [], []);
    let scaledFile = Gio.File.new_for_path(scaledPath);
    return new Gio.FileIcon({ file: scaledFile });
}

let showTestN = (src, title) => {
    let iconPath = root + "/tools/tests/gnome-image.png";
    let file = null;
    let n = new ClipboardN(src, title, getScaledIcon(iconPath), file);
    n.connect("activated", () => log("activated"));
    src.notify(n);
}

const test = () => {
    Main.messageTray.getSources().forEach((s) => s.destroy());
    const notificationSource = new MessageTray.Source(
        NotificationSourceName, NotificationIcon
    );
    Main.messageTray.add(notificationSource);

    Mainloop.timeout_add_seconds(0, () => showTestN(notificationSource, "n1"))
    log("done");
};

test();
