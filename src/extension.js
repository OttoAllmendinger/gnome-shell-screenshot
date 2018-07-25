// vi: sts=2 sw=2 et
//
// props to
// https://github.com/rjanja/desktop-capture
// https://github.com/DASPRiD/gnome-shell-extension-area-screenshot

const Lang = imports.lang;
const Signals = imports.signals;
const Mainloop = imports.mainloop;

const Gio = imports.gi.Gio;
const Gtk = imports.gi.Gtk;
const Meta = imports.gi.Meta;
const Shell = imports.gi.Shell;

const Main = imports.ui.main;

const Gettext = imports.gettext.domain('gnome-shell-screenshot');
// const _ = Gettext.gettext;

const Util = imports.misc.util;
const ExtensionUtils = imports.misc.extensionUtils;
const Local = ExtensionUtils.getCurrentExtension();

const Config = Local.imports.config.exports;
const Path = Local.imports.path.exports;
const Indicator = Local.imports.indicator.exports;
const Selection = Local.imports.selection.exports;
const Clipboard = Local.imports.clipboard.exports;
const Notifications = Local.imports.notifications.exports;
const Filename = Local.imports.filename.exports;

const UploadImgur = Local.imports.uploadImgur.exports;

const Convenience = Local.imports.convenience.exports;

// const {dump} = Local.imports.dump;

const settings = Convenience.getSettings();

const getSelectionOptions = () => {
  const captureDelay = settings.get_int(Config.KeyCaptureDelay);
  return { captureDelay }
}

const Screenshot = new Lang.Class({
  Name: "ScreenshotTool.Screenshot",

  _init: function (filePath) {
    if (!filePath) {
      throw new Error(`need argument ${filePath}`);
    }
    this.gtkImage = new Gtk.Image({file: filePath});
    this.inClipboard = false;
    this.srcFile = Gio.File.new_for_path(filePath);
    this.dstFile = null;
  },

  _nextFile: function () {
    let dir = Path.expand(settings.get_string(Config.KeySaveLocation));
    let filenameTemplate = settings.get_string(Config.KeyFilenameTemplate);
    let {width, height} = this.gtkImage.get_pixbuf();
    let dimensions = {width: width, height: height};
    for (var n=0; ; n++) {
      let newFilename = Filename.get(filenameTemplate, dimensions, n);
      let newPath = Path.join(dir, newFilename);
      let file = Gio.File.new_for_path(newPath);
      let exists = file.query_exists(/* cancellable */ null);
      if (!exists) {
        return file;
      }
    }
  },

  autosave: function () {
    let dstFile = this._nextFile();
    this.srcFile.copy(dstFile, Gio.FileCopyFlags.NONE, null, null);
    this.dstFile = dstFile;
  },

  launchOpen: function () {
    let context = global.create_app_launch_context(0, -1);
    let file = this.dstFile || this.srcFile;
    Gio.AppInfo.launch_default_for_uri(file.get_uri(), context);
  },

  launchSave: function () {
    let newFile = this._nextFile();
    Util.spawn([
      "gjs",
      Local.path + "/saveDlg.js",
      ...[
        this.srcFile.get_path(),
        Path.expand("$PICTURES"),
        newFile.get_basename(),
        Local.dir.get_path()
      ].map(encodeURIComponent)
    ]);
  },

  copyClipboard: function () {
    Clipboard.setImage(this.gtkImage);
    this.inClipboard = true;
  },

  imgurStartUpload: function () {
    this.imgurUpload = new UploadImgur.Upload(this.srcFile);

    this.imgurUpload.connect("error", (obj, err) => {
      logError(err);
      Notifications.notifyError(String(err));
    });

    // this.imgurUpload = new Local.imports.uploadDummy.Upload();
    if (settings.get_boolean(Config.KeyImgurEnableNotification)) {
      Notifications.notifyImgurUpload(this);
    }
    this.emit("imgur-upload", this.imgurUpload);

    this.imgurUpload.connect("done", () => {
      if (settings.get_boolean(Config.KeyImgurAutoCopyLink)) {
        this.imgurCopyURL();
      }

      if (settings.get_boolean(Config.KeyImgurAutoOpenLink)) {
        this.imgurOpenURL();
      }
    });

    this.imgurUpload.start();
  },

  isImgurUploadComplete: function () {
    return !!(this.imgurUpload && this.imgurUpload.responseData);
  },

  imgurOpenURL: function () {
    if (!this.isImgurUploadComplete()) {
      logError(new Error("no completed imgur upload"));
      return;
    }
    let context = global.create_app_launch_context(0, -1);
    let uri = this.imgurUpload.responseData.link;
    if (!uri) {
      logError(new Error("no uri in responseData"));
      return;
    }
    Gio.AppInfo.launch_default_for_uri(uri, context);
  },

  imgurCopyURL: function () {
    if (!this.isImgurUploadComplete()) {
      logError(new Error("no completed imgur upload"));
      return;
    }
    let uri = this.imgurUpload.responseData.link;
    Clipboard.setText(uri);
  },

  imgurDelete: function () {
    if (!this.isImgurUploadComplete()) {
      logError(new Error("no completed imgur upload"));
      return;
    }
    this.imgurUpload.connect('deleted', () => {
      this.imgurUpload = null;
    });
    this.imgurUpload.deleteRemote();
  }
});
Signals.addSignalMethods(Screenshot.prototype);


const Extension = new Lang.Class({
  Name: "ScreenshotTool",

  _init: function () {
    this._signalSettings = [];

    this._signalSettings.push(settings.connect(
        'changed::' + Config.KeyEnableIndicator,
        this._updateIndicator.bind(this)
    ));

    this._updateIndicator();

    this._setKeybindings();
  },

  _setKeybindings: function () {
    let bindingMode = Shell.ActionMode.NORMAL;

    for (let shortcut of Config.KeyShortcuts) {
      Main.wm.addKeybinding(
          shortcut,
          settings,
          Meta.KeyBindingFlags.NONE,
          bindingMode,
          this.onAction.bind(this, shortcut.replace('shortcut-', ''))
      );
    }
  },

  _unsetKeybindings: function () {
    for (let shortcut of Config.KeyShortcuts) {
      Main.wm.removeKeybinding(shortcut);
    }
  },

  _createIndicator: function () {
    if (!this._indicator) {
      this._indicator = new Indicator.Indicator(this);
      Main.panel.addToStatusArea(Config.IndicatorName, this._indicator);
    }
  },

  _destroyIndicator: function () {
    if (this._indicator) {
      this._indicator.destroy();
      this._indicator = null;
    }
  },

  _updateIndicator: function () {
    if (settings.get_boolean(Config.KeyEnableIndicator)) {
      this._createIndicator();
    } else {
      this._destroyIndicator();
    }
  },

  onAction: function (action) {
    let dispatch = {
      'select-area': this._selectArea.bind(this),
      'select-window': this._selectWindow.bind(this),
      'select-desktop': this._selectDesktop.bind(this)
    };

    let f = dispatch[action] || function () {
      throw new Error('unknown action: ' + action);
    };

    try {
      f();
    } catch (ex) {
      Notifications.notifyError(ex.toString());
    }
  },

  _startSelection: function (selection) {
    if (this._selection) {
      // prevent reentry
      log("_startSelection() error: selection already in progress");
      return;
    }

    this._selection = selection;

    this._selection.connect("screenshot", this._onScreenshot.bind(this));

    this._selection.connect("error", (selection, message) => {
      Notifications.notifyError(message);
    });

    this._selection.connect("stop", () => {
      this._selection = null;
    });
  },

  _selectArea: function () {
    this._startSelection(new Selection.SelectionArea(getSelectionOptions()));
  },

  _selectWindow: function() {
    this._startSelection(new Selection.SelectionWindow(getSelectionOptions()));
  },

  _selectDesktop: function () {
    this._startSelection(new Selection.SelectionDesktop(getSelectionOptions()));
  },

  _onScreenshot: function (selection, filePath) {
    let screenshot = new Screenshot(filePath);
    let clipboardAction = settings.get_string(Config.KeyClipboardAction);
    if (clipboardAction == Config.ClipboardActions.SET_IMAGE_DATA) {
      screenshot.copyClipboard();
    }

    if (settings.get_boolean(Config.KeySaveScreenshot)) {
      screenshot.autosave();
    }

    if (settings.get_boolean(Config.KeyEnableNotification)) {
      Notifications.notifyScreenshot(screenshot);
    }

    if (this._indicator) {
      this._indicator.setScreenshot(screenshot);
    }

    let imgurEnabled = settings.get_boolean(Config.KeyEnableUploadImgur);
    let imgurAutoUpload = settings.get_boolean(Config.KeyImgurAutoUpload);

    if (imgurEnabled && imgurAutoUpload) {
      screenshot.imgurStartUpload();
    }
  },

  destroy: function () {
    this._destroyIndicator();
    this._unsetKeybindings();

    this._signalSettings.forEach((signal) => {
      settings.disconnect(signal);
    });

    this.disconnectAll();
  }
});

Signals.addSignalMethods(Extension.prototype);



let _extension;

function init() {
  Convenience.initTranslations();
}

function enable() {
  _extension = new Extension();
}

function disable() {
  _extension.destroy();
  _extension = null;
}
