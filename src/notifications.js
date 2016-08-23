/*jshint moz:true */
const Lang = imports.lang;

const Gio = imports.gi.Gio;

const Main = imports.ui.main;
const MessageTray = imports.ui.messageTray;

const Gettext = imports.gettext.domain('gnome-shell-extensions');
const _ = Gettext.gettext;

const ExtensionUtils = imports.misc.extensionUtils;
const Local = ExtensionUtils.getCurrentExtension();

const NotificationIcon = 'imgur-uploader-color';
const NotificationSourceName = 'ImgurUploader';
const Convenience = Local.imports.convenience;
const Clipboard = Local.imports.clipboard;


const NotificationService = new Lang.Class({
  Name: "ImgurUploader.NotificationService",

  _init: function () {
    this._notificationSource = new MessageTray.Source(
      NotificationSourceName, NotificationIcon
    );
    this._notifications = [];
  },

  make: function () {
    let n = new MessageTray.Notification(
        this._notificationSource, _("Upload")
    );

    Main.messageTray.add(this._notificationSource);
    this._notificationSource.notify(n);
    return n;
  },

  setProgress: function (notification, bytes, total) {
    notification.update(
        _("Upload"),
        '' + Math.floor(100 * (bytes / total)) + '%'
    );
  },

  setFinished: function (notification, url) {
    notification.setResident(true);

    notification.update(_("Upload Complete"), url);

    notification.addAction(_("Copy Link"), function () {
      Clipboard.set(url);
    });

    this._notificationSource.notify(notification);
  },

  setError: function (notification, error) {
    notification.setResident(true);

    notification.update(
        _("Error"),
        error,
        { secondaryGIcon: new Gio.ThemedIcon({name: 'dialog-error'}) }
    );

    this._notificationSource.notify(notification);
  }
});

