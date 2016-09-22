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

const Gettext = imports.gettext.domain('gnome-shell-extensions');
// const _ = Gettext.gettext;

const ExtensionUtils = imports.misc.extensionUtils;
const Local = ExtensionUtils.getCurrentExtension();

const Config = Local.imports.config;
const Path = Local.imports.path;
const Indicator = Local.imports.indicator;
const Selection = Local.imports.selection;
const Clipboard = Local.imports.clipboard;
const Notifications = Local.imports.notifications;

const Convenience = Local.imports.convenience;

// const {dump} = Local.imports.dump;

const Extension = new Lang.Class({
  Name: "ScreenshotTool",

  _init: function () {
    this.settings = Convenience.getSettings();

    this._signalSettings = [];

    this._signalSettings.push(this.settings.connect(
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
          this.settings,
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
    if (this.settings.get_boolean(Config.KeyEnableIndicator)) {
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

    if (this._indicator) {
      this._indicator.startSelection();
    }

    this._selection.connect("screenshot", this._onScreenshot.bind(this));

    this._selection.connect("error", (selection, message) => {
      Notifications.notifyError(message);
    });

    this._selection.connect("stop", () => {
      this._selection = null;

      if (this._indicator) {
        this._indicator.stopSelection();
      }
    });
  },

  _selectArea: function () {
    this._startSelection(new Selection.SelectionArea());
  },

  _selectWindow: function() {
    this._startSelection(new Selection.SelectionWindow());
  },

  _selectDesktop: function () {
    this._startSelection(new Selection.SelectionDesktop());
  },

  _onScreenshot: function (selection, filePath) {
    let clipboardAction = this.settings.get_string(Config.KeyClipboardAction);

    let image = new Gtk.Image({file: filePath});

    if (clipboardAction == Config.ClipboardActions.SET_IMAGE_DATA) {
      Clipboard.setImage(image);
    }

    let file = Gio.File.new_for_path(filePath);
    let {width, height} = image.get_pixbuf();
    let newFilename =
      "Screenshot " + String(Date()) + " " + width + "x" + height + ".png";

    let saveFile = this.settings.get_boolean(Config.KeySaveScreenshot);
    if (saveFile) {
      let dir = Path.expand(this.settings.get_string(Config.KeySaveLocation));
      let newPath = Path.join(dir, newFilename);
      let dstFile = Gio.File.new_for_path(newPath);
      file.copy(dstFile, Gio.FileCopyFlags.NONE, null, null);
      file = dstFile;
    }

    Notifications.notifyScreenshot(image, file, newFilename);
  },

  destroy: function () {
    this._destroyIndicator();
    this._unsetKeybindings();

    this._signalSettings.forEach((signal) => {
      this.settings.disconnect(signal);
    });

    this.disconnectAll();
  }
});

Signals.addSignalMethods(Extension.prototype);



let _extension;

function enable() {
  _extension = new Extension();
}

function disable() {
  _extension.destroy();
  _extension = null;
}
