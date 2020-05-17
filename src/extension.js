// vi: sts=2 sw=2 et
//
// props to
// https://github.com/rjanja/desktop-capture
// https://github.com/DASPRiD/gnome-shell-extension-area-screenshot

const Signals = imports.signals;
const Mainloop = imports.mainloop;

const Gio = imports.gi.Gio;
const Gtk = imports.gi.Gtk;
const Meta = imports.gi.Meta;
const Shell = imports.gi.Shell;

const Main = imports.ui.main;

const Gettext = imports.gettext.domain("gnome-shell-screenshot");
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

class Screenshot {
  constructor(filePath) {
    if (!filePath) {
      throw new Error(`need argument ${filePath}`);
    }
    this.gtkImage = new Gtk.Image({file: filePath});
    this.srcFile = Gio.File.new_for_path(filePath);
    this.dstFile = null;
  }

  _nextFile() {
    const dir = Path.expand(settings.get_string(Config.KeySaveLocation));
    const filenameTemplate = settings.get_string(Config.KeyFilenameTemplate);
    const {width, height} = this.gtkImage.get_pixbuf();
    const dimensions = {width, height};
    for (var n=0; ; n++) {
      const newFilename = Filename.get(filenameTemplate, dimensions, n);
      const newPath = Path.join(dir, newFilename);
      const file = Gio.File.new_for_path(newPath);
      const exists = file.query_exists(/* cancellable */ null);
      if (!exists) {
        return file;
      }
    }
  }

  autosave() {
    const dstFile = this._nextFile();
    this.srcFile.copy(dstFile, Gio.FileCopyFlags.NONE, null, null);
    this.dstFile = dstFile;
  }

  launchOpen() {
    const context = global.create_app_launch_context(0, -1);
    const file = this.dstFile || this.srcFile;
    Gio.AppInfo.launch_default_for_uri(file.get_uri(), context);
  }

  launchSave() {
    const newFile = this._nextFile();
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
  }

  copyClipboard(action) {
    if (action === Config.ClipboardActions.NONE) {
      return;
    } else if (action === Config.ClipboardActions.SET_IMAGE_DATA) {
      return Clipboard.setImage(this.gtkImage);
    } else if (action === Config.ClipboardActions.SET_LOCAL_PATH) {
      if (this.dstFile) {
        return Clipboard.setText(this.dstFile.get_path());
      } else if (this.srcFile) {
        return Clipboard.setText(this.srcFile.get_path());
      }

      return logError(new Error("no dstFile and no srcFile"));
    }

    logError(new Error(`unknown action ${action}`));
  }

  imgurStartUpload() {
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
  }

  isImgurUploadComplete() {
    return !!(this.imgurUpload && this.imgurUpload.responseData);
  }

  imgurOpenURL() {
    if (!this.isImgurUploadComplete()) {
      logError(new Error("no completed imgur upload"));
      return;
    }
    const context = global.create_app_launch_context(0, -1);
    const uri = this.imgurUpload.responseData.link;
    if (!uri) {
      logError(new Error("no uri in responseData"));
      return;
    }
    Gio.AppInfo.launch_default_for_uri(uri, context);
  }

  imgurCopyURL() {
    if (!this.isImgurUploadComplete()) {
      logError(new Error("no completed imgur upload"));
      return;
    }
    const uri = this.imgurUpload.responseData.link;
    Clipboard.setText(uri);
  }

  imgurDelete() {
    if (!this.isImgurUploadComplete()) {
      logError(new Error("no completed imgur upload"));
      return;
    }
    this.imgurUpload.connect("deleted", () => {
      this.imgurUpload = null;
    });
    this.imgurUpload.deleteRemote();
  }
}
Signals.addSignalMethods(Screenshot.prototype);


class Extension {
  constructor() {
    this._signalSettings = [];

    this._signalSettings.push(settings.connect(
        "changed::" + Config.KeyEnableIndicator,
        this._updateIndicator.bind(this)
    ));

    this._updateIndicator();

    this._setKeybindings();
  }

  _setKeybindings() {
    const bindingMode = Shell.ActionMode.NORMAL;

    for (const shortcut of Config.KeyShortcuts) {
      Main.wm.addKeybinding(
          shortcut,
          settings,
          Meta.KeyBindingFlags.NONE,
          bindingMode,
          this.onAction.bind(this, shortcut.replace("shortcut-", ""))
      );
    }
  }

  _unsetKeybindings() {
    for (const shortcut of Config.KeyShortcuts) {
      Main.wm.removeKeybinding(shortcut);
    }
  }

  _createIndicator() {
    if (!this._indicator) {
      this._indicator = new Indicator.Indicator(this);
      Main.panel.addToStatusArea(
        Config.IndicatorName,
        this._indicator.panelButton
      );
    }
  }

  _destroyIndicator() {
    if (this._indicator) {
      this._indicator.destroy();
      this._indicator = null;
    }
  }

  _updateIndicator() {
    if (settings.get_boolean(Config.KeyEnableIndicator)) {
      this._createIndicator();
    } else {
      this._destroyIndicator();
    }
  }

  onAction(action) {
    const dispatch = {
      "select-area": this._selectArea.bind(this),
      "select-window": this._selectWindow.bind(this),
      "select-desktop": this._selectDesktop.bind(this)
    };

    const f = dispatch[action] || function() {
      throw new Error("unknown action: " + action);
    };

    try {
      f();
    } catch (ex) {
      Notifications.notifyError(ex.toString());
    }
  }

  _startSelection(selection) {
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
  }

  _selectArea() {
    this._startSelection(new Selection.SelectionArea(getSelectionOptions()));
  }

  _selectWindow() {
    this._startSelection(new Selection.SelectionWindow(getSelectionOptions()));
  }

  _selectDesktop() {
    this._startSelection(new Selection.SelectionDesktop(getSelectionOptions()));
  }

  _onScreenshot(selection, filePath) {
    const screenshot = new Screenshot(filePath);

    if (settings.get_boolean(Config.KeySaveScreenshot)) {
      screenshot.autosave();
    }

    screenshot.copyClipboard(settings.get_string(Config.KeyClipboardAction));

    if (settings.get_boolean(Config.KeyEnableNotification)) {
      Notifications.notifyScreenshot(screenshot);
    }

    if (this._indicator) {
      this._indicator.setScreenshot(screenshot);
    }

    const imgurEnabled = settings.get_boolean(Config.KeyEnableUploadImgur);
    const imgurAutoUpload = settings.get_boolean(Config.KeyImgurAutoUpload);

    if (imgurEnabled && imgurAutoUpload) {
      screenshot.imgurStartUpload();
    }
  }

  destroy() {
    this._destroyIndicator();
    this._unsetKeybindings();

    this._signalSettings.forEach((signal) => {
      settings.disconnect(signal);
    });

    this.disconnectAll();
  }
}

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
