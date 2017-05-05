// vi: sts=2 sw=2 et
const Lang = imports.lang;
const Signals = imports.signals;

const St = imports.gi.St;
const Gio = imports.gi.Gio;
const Gtk = imports.gi.Gtk;
const GdkPixbuf = imports.gi.GdkPixbuf;

const Main = imports.ui.main;
const MessageTray = imports.ui.messageTray;

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

  _title: function () {
    return _("New Screenshot");
  },

  _banner: function ({gtkImage}) {
    let {width, height} = gtkImage.get_pixbuf();
    let banner = _("Size:") + " " + width + "x" + height + ".";
    return banner;
  },

  _init: function (source, screenshot) {
    this.parent(
      source,
      this._title(),
      this._banner(screenshot),
      { gicon: Thumbnail.getIcon(screenshot.srcFile.get_path()) }
    );

    this.connect("activated", this._onActivated.bind(this));

    // makes banner expand on hover
    this.setForFeedback(true);

    this._screenshot = screenshot;
  },

  createBanner: function() {
    let b = this.parent();
    b.addAction(_("Copy"), this._onCopy.bind(this));
    b.addAction(_("Save"), this._onSave.bind(this));
    b._iconBin.child.icon_size = ICON_SIZE;
    return b;
  },

  _onActivated: function () {
    this._screenshot.launchOpen();
  },

  _onCopy: function () {
    this._screenshot.copyClipboard();
  },

  _onSave: function () {
    this._screenshot.launchSave();
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



const notifyScreenshot = (screenshot) => {
  let source = getSource();
  let notification = new Notification(source, screenshot);
  source.notify(notification);
}

const notifyError = (message) => {
  let source = getSource();
  let notification = new ErrorNotification(source, message);
  source.notify(notification);
}
