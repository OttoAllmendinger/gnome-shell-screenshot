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

const Path = Local.imports.path.exports;
const {dump} = Local.imports.dump.exports;
const Config = Local.imports.config.exports;
const Clipboard = Local.imports.clipboard.exports;
const Thumbnail = Local.imports.thumbnail.exports;
const Convenience = Local.imports.convenience.exports;

const NotificationIcon = 'camera-photo-symbolic';
const NotificationSourceName = 'Screenshot Tool';


const ICON_SIZE = 64;


const settings = Convenience.getSettings();

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

    b._iconBin.child.icon_size = ICON_SIZE;

    b.addAction(_("Copy"), this._onCopy.bind(this));
    b.addAction(_("Save"), this._onSave.bind(this));

    if (settings.get_boolean(Config.KeyEnableUploadImgur)) {
      if (settings.get_boolean(Config.KeyImgurAutoUpload)) {
        b.addAction(_("Uploading To Imgur..."), () => { /* noop */ });
      } else {
        b.addAction(_("Upload To Imgur"), this._onUpload.bind(this));
      }
    }
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
  },

  _onUpload: function () {
    this._screenshot.imgurStartUpload();
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
      String(message),
      { secondaryGIcon: new Gio.ThemedIcon({name: 'dialog-error'}) }
    );
  }
});
Signals.addSignalMethods(ErrorNotification.prototype);


const ImgurNotification = new Lang.Class({
  Name: "ScreenshotTool.ImgurNotification",
  Extends: MessageTray.Notification,

  _init: function (source, screenshot) {
    this.parent(source, _("Imgur Upload"));
    this.setForFeedback(true);
    this.setResident(true);

    this.connect("activated", this._onActivated.bind(this));

    this._screenshot = screenshot;

    this._upload = screenshot.imgurUpload;

    this._upload.connect("progress", (obj, bytes, total) => {
      this.update(
          _("Imgur Upload"),
          '' + Math.floor(100 * (bytes / total)) + '%'
      );
    });

    this._upload.connect("error", (obj, msg) => {
      this.update(_("Imgur Upload Failed"), msg);
    });

    this._upload.connect("done", () => {
      this.update(
        _("Imgur Upload Successful"), this._upload.responseData.link
      );
      this._updateCopyButton();
    });
  },

  _updateCopyButton: function () {
    if (!this._copyButton) {
      return;
    }
    this._copyButton.visible = this._screenshot.isImgurUploadComplete();
  },

  createBanner: function() {
    let b = this.parent();
    this._copyButton = b.addAction(_("Copy Link"), this._onCopy.bind(this));
    this._updateCopyButton();
    return b;
  },

  _onActivated: function () {
    if (this._screenshot.isImgurUploadComplete()) {
      this._screenshot.imgurOpenURL();
    } else {
      this._upload.connect("done", () => {
        this._screenshot.imgurOpenURL();
      });
    }
  },

  _onCopy: function () {
    this._screenshot.imgurCopyURL();
  },
});


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

const notifyImgurUpload = (screenshot) => {
  let source = getSource();
  let notification = new ImgurNotification(source, screenshot);
  source.notify(notification);
}

var exports = {
  notifyError,
  notifyScreenshot,
  notifyImgurUpload
};
