// vi: sts=2 sw=2 et
const Lang = imports.lang;
const Signals = imports.signals;

const St = imports.gi.St;
const Gio = imports.gi.Gio;
const Gtk = imports.gi.Gtk;
const GdkPixbuf = imports.gi.GdkPixbuf;

const Main = imports.ui.main;
const MessageTray = imports.ui.messageTray;

const Util = imports.misc.util;

const Gettext = imports.gettext.domain('gnome-shell-screenshot');
const _ = Gettext.gettext;

const ExtensionUtils = imports.misc.extensionUtils;
const Local = ExtensionUtils.getCurrentExtension();

const Path = Local.imports.path;
const {dump} = Local.imports.dump;
const Clipboard = Local.imports.clipboard;
const Thumbnail = Local.imports.thumbnail;

const NotificationIcon = 'camera-photo-symbolic';
const NotificationSourceName = 'Screenshot Tool';


const ICON_SIZE = 64;


const getSource = () => {
  let source = new MessageTray.Source(
    NotificationSourceName, NotificationIcon
  );
  Main.messageTray.add(source);
  return source;
}

const Notification = new Lang.Class({
  Name: "ScreenshotTool.Notification",
  Extends: MessageTray.Notification,

  _init: function (source, image, file, newFilename) {
    let {width, height} = image.get_pixbuf();
    this.parent(
      source,
      _("New Screenshot"),
      _("Size:") + " " + width + "x" + height,
      { gicon: Thumbnail.getIcon(file.get_path()) }
    );

    this.connect("activated", this.onActivated.bind(this));

    // makes banner expand on hover
    this.setForFeedback(true);

    this._file = file;
    this._image = image;
    this._newFilename = newFilename;
  },

  createBanner: function() {
    let b = this.parent();
    b.addAction(_("Copy"), this.onCopy.bind(this));
    b.addAction(_("Save"), this.onSave.bind(this));
    b._iconBin.child.icon_size = ICON_SIZE;
    return b;
  },

  onActivated: function () {
    let context = global.create_app_launch_context(0, -1);
    Gio.AppInfo.launch_default_for_uri(this._file.get_uri(), context);
  },

  onCopy: function () {
    Clipboard.setImage(this._image);
  },

  onSave: function () {
    Util.spawn([
      "gjs",
      Local.path + "/saveDlg.js",
      this._file.get_path(),
      Path.expand("$PICTURES"),
      this._newFilename,
      Local.dir.get_path(),
    ]);
  }
});
Signals.addSignalMethods(Notification.prototype);


const ErrorNotification = new Lang.Class({
  Name: "ScreenshotTool.ErrorNotification",
  Extends: MessageTray.Notification,

  _init: function (source, message) {
    this.parent(
      source,
      _("Error"),
      message,
      { secondaryGIcon: new Gio.ThemedIcon({name: 'dialog-error'}) }
    );
  }
});
Signals.addSignalMethods(ErrorNotification.prototype);



const notifyScreenshot = (image, file, newFilename) => {
  let source = getSource();
  let notification = new Notification(source, image, file, newFilename);
  source.notify(notification);
}

const notifyError = (message) => {
  let source = getSource();
  let notification = new ErrorNotification(source, message);
  source.notify(notification);
}
