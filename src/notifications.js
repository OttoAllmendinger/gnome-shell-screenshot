// vi: sts=2 sw=2 et
const Signals = imports.signals;

const St = imports.gi.St;
const Gio = imports.gi.Gio;
const Gtk = imports.gi.Gtk;
const GdkPixbuf = imports.gi.GdkPixbuf;

const Main = imports.ui.main;
const MessageTray = imports.ui.messageTray;

const Gettext = imports.gettext.domain("gnome-shell-screenshot");
const _ = Gettext.gettext;

const ExtensionUtils = imports.misc.extensionUtils;
const Local = ExtensionUtils.getCurrentExtension();

const Path = Local.imports.path.exports;
const {dump} = Local.imports.dump.exports;
const Config = Local.imports.config.exports;
const Clipboard = Local.imports.clipboard.exports;
const Thumbnail = Local.imports.thumbnail.exports;
const Convenience = Local.imports.convenience.exports;

const NotificationIcon = "camera-photo-symbolic";
const NotificationSourceName = "Screenshot Tool";


const ICON_SIZE = 64;


const settings = Convenience.getSettings();

const getSource = () => {
  const source = new MessageTray.Source(
    NotificationSourceName, NotificationIcon
  );
  Main.messageTray.add(source);
  return source;
}

class Notification extends MessageTray.Notification {
  static _title() {
    return _("New Screenshot");
  }

  static _banner({gtkImage}) {
    const {width, height} = gtkImage.get_pixbuf();
    const banner = _("Size:") + " " + width + "x" + height + ".";
    return banner;
  }

  constructor(source, screenshot) {
    super(
      source,
      Notification._title(),
      Notification._banner(screenshot),
      { gicon: Thumbnail.getIcon(screenshot.srcFile.get_path()) }
    );

    this.connect("activated", this._onActivated.bind(this));

    // makes banner expand on hover
    this.setForFeedback(true);

    this._screenshot = screenshot;
  }

  createBanner() {
    const b = super.createBanner();

    b._iconBin.child.icon_size = ICON_SIZE;

    b.addAction(_("Copy"), this._onCopy.bind(this));
    b.addAction(_("Save"), this._onSave.bind(this));

    if (settings.get_boolean(Config.KeyEnableUploadImgur)) {
      if (settings.get_boolean(Config.KeyImgurAutoUpload)) {
        b.addAction(_("Uploading To Imgur..."), () => { /* noop */ });
      } else {
        b.addAction(_("Upload To Imgur"), this._onUploadImgur.bind(this));
      }
    }

    if (settings.get_boolean(Config.KeyEnableUploadCloudApp)) {
      if (settings.get_boolean(Config.KeyCloudAppAutoUpload)) {
        b.addAction(_("Uploading To CloudApp..."), () => { /* noop */ });
      } else {
        b.addAction(_("Upload To CloudApp"), this._onUploadCloudApp.bind(this));
      }
    }

    return b;
  }

  _onActivated() {
    this._screenshot.launchOpen();
  }

  _onCopy() {
    this._screenshot.copyClipboard();
  }

  _onSave() {
    this._screenshot.launchSave();
  }

  _onUploadImgur() {
    this._screenshot.imgurStartUpload();
  }

  _onUploadCloudApp() {
    this._screenshot.cloudAppStartUpload();
  }
}
Signals.addSignalMethods(Notification.prototype);


class ErrorNotification extends MessageTray.Notification {
  constructor(source, message) {
    super(
      source,
      _("Error"),
      String(message),
      { secondaryGIcon: new Gio.ThemedIcon({name: "dialog-error"}) }
    );
  }
}
Signals.addSignalMethods(ErrorNotification.prototype);


class ImgurNotification extends MessageTray.Notification {
  constructor(source, screenshot) {
    super(source, _("Imgur Upload"));
    this.setForFeedback(true);
    this.setResident(true);

    this.connect("activated", this._onActivated.bind(this));

    this._screenshot = screenshot;

    this._upload = screenshot.imgurUpload;

    this._upload.connect("progress", (obj, bytes, total) => {
      this.update(
          _("Imgur Upload"),
          "" + Math.floor(100 * (bytes / total)) + "%"
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
  }

  _updateCopyButton() {
    if (!this._copyButton) {
      return;
    }
    this._copyButton.visible = this._screenshot.isImgurUploadComplete();
  }

  createBanner() {
    const b = super.createBanner();
    this._copyButton = b.addAction(_("Copy Link"), this._onCopy.bind(this));
    this._updateCopyButton();
    return b;
  }

  _onActivated() {
    if (this._screenshot.isImgurUploadComplete()) {
      this._screenshot.imgurOpenURL();
    } else {
      this._upload.connect("done", () => {
        this._screenshot.imgurOpenURL();
      });
    }
  }

  _onCopy() {
    this._screenshot.imgurCopyURL();
  }
}


class CloudAppNotification extends MessageTray.Notification {
  constructor(source, screenshot) {
    super(source, _("CloudApp Upload"));
    this.setForFeedback(true);
    this.setResident(true);

    this.connect("activated", this._onActivated.bind(this));

    this._screenshot = screenshot;

    this._upload = screenshot.cloudAppUpload;

    this._upload.connect("progress", (obj, bytes, total) => {
      this.update(
          _("CloudApp Upload"),
          "" + Math.floor(100 * (bytes / total)) + "%"
      );
    });

    this._upload.connect("error", (obj, msg) => {
      this.update(_("CloudApp Upload Failed"), msg);
    });

    this._upload.connect("done", () => {
      this.update(
        _("CloudApp Upload Successful"), this._upload.responseData.url
      );
      this._updateCopyButton();
    });
  }

  _updateCopyButton() {
    if (!this._copyButton) {
      return;
    }
    this._copyButton.visible = this._screenshot.isCloudAppUploadComplete();
  }

  createBanner() {
    const b = super.createBanner();
    this._copyButton = b.addAction(_("Copy Link"), this._onCopy.bind(this));
    this._updateCopyButton();
    return b;
  }

  _onActivated() {
    if (this._screenshot.isCloudAppUploadComplete()) {
      this._screenshot.cloudAppOpenURL();
    } else {
      this._upload.connect("done", () => {
        this._screenshot.cloudAppOpenURL();
      });
    }
  }

  _onCopy() {
    this._screenshot.cloudAppCopyURL();
  }
}


const notifyScreenshot = (screenshot) => {
  const source = getSource();
  const notification = new Notification(source, screenshot);
  source.notify(notification);
}

const notifyError = (message) => {
  const source = getSource();
  const notification = new ErrorNotification(source, message);
  source.notify(notification);
}

const notifyImgurUpload = (screenshot) => {
  const source = getSource();
  const notification = new ImgurNotification(source, screenshot);
  source.notify(notification);
}

const notifyCloudAppUpload = (screenshot) => {
  const source = getSource();
  const notification = new CloudAppNotification(source, screenshot);
  source.notify(notification);
}

var exports = {
  notifyError,
  notifyScreenshot,
  notifyImgurUpload,
  notifyCloudAppUpload
};