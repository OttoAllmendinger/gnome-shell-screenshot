// props to
// https://github.com/rjanja/desktop-capture
// https://github.com/DASPRiD/gnome-shell-extension-area-screenshot

import * as Gio from '@imports/Gio-2.0';
import * as Gtk from '@imports/Gtk-3.0';
import * as Meta from '@imports/Meta-7';
import * as Shell from '@imports/Shell-0.1';

import * as Config from './config';
import * as Path from './path';
import * as Indicator from './indicator';
import * as Selection from './selection';
import * as Clipboard from './clipboard';
import * as Notifications from './notifications';
import * as Filename from './filename';
import * as UploadImgur from './uploadImgur';
import * as Convenience from './convenience';

import { Upload } from './uploadImgur';
import { SignalEmitter } from '..';

const Signals = imports.signals;
const Main = imports.ui.main;

const Util = imports.misc.util;
const Local = imports.misc.extensionUtils.getCurrentExtension();

const settings = Convenience.getSettings();

const getSelectionOptions = () => {
  const captureDelay = settings.get_int(Config.KeyCaptureDelay);
  return { captureDelay };
};

export declare interface Screenshot extends SignalEmitter {}

export class Screenshot {
  public gtkImage: Gtk.Image;
  public srcFile: Gio.File;
  public dstFile: Gio.File | null;
  public imgurUpload?: Upload;

  constructor(filePath) {
    if (!filePath) {
      throw new Error(`need argument ${filePath}`);
    }
    this.gtkImage = new Gtk.Image({ file: filePath });
    this.srcFile = Gio.File.new_for_path(filePath);
    this.dstFile = null;
  }

  _nextFile() {
    const dir = Path.expand(settings.get_string(Config.KeySaveLocation));
    const filenameTemplate = settings.get_string(Config.KeyFilenameTemplate);
    const { width, height } = (this.gtkImage.get_pixbuf() as unknown) as { width: number; height: number };
    const dimensions = { width, height };
    for (let n = 0; ; n++) {
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
    const context = Shell.Global.get().create_app_launch_context(0, -1);
    const file = this.dstFile || this.srcFile;
    Gio.AppInfo.launch_default_for_uri(file.get_uri(), context);
  }

  launchSave() {
    const newFile = this._nextFile();
    Util.spawn([
      'gjs',
      Local.path + '/saveDlg.js',
      ...[this.srcFile.get_path(), Path.expand('$PICTURES'), newFile.get_basename(), Local.dir.get_path()].map(
        encodeURIComponent,
      ),
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

      return logError(new Error('no dstFile and no srcFile'));
    }

    logError(new Error(`unknown action ${action}`));
  }

  imgurStartUpload() {
    this.imgurUpload = new UploadImgur.Upload(this.srcFile);

    this.imgurUpload.connect('error', (obj, err) => {
      logError(err);
      Notifications.notifyError(String(err));
    });

    if (settings.get_boolean(Config.KeyImgurEnableNotification)) {
      Notifications.notifyImgurUpload(this);
    }
    this.emit('imgur-upload', this.imgurUpload);

    this.imgurUpload.connect('done', () => {
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
      logError(new Error('no completed imgur upload'));
      return;
    }
    const context = Shell.Global.get().create_app_launch_context(0, -1);
    const uri = this.imgurUpload!.responseData.link;
    if (!uri) {
      logError(new Error('no uri in responseData'));
      return;
    }
    Gio.AppInfo.launch_default_for_uri(uri, context);
  }

  imgurCopyURL() {
    if (!this.isImgurUploadComplete()) {
      logError(new Error('no completed imgur upload'));
      return;
    }
    const uri = this.imgurUpload!.responseData.link;
    Clipboard.setText(uri);
  }

  imgurDelete() {
    if (!this.isImgurUploadComplete()) {
      logError(new Error('no completed imgur upload'));
      return;
    }
    this.imgurUpload!.connect('deleted', () => {
      this.imgurUpload = undefined;
    });
    this.imgurUpload!.deleteRemote();
  }
}

Signals.addSignalMethods(Screenshot.prototype);

export declare interface Extension extends SignalEmitter {}

export class Extension {
  private _signalSettings: number[] = [];
  private _indicator?: Indicator.Indicator;
  private _selection?: Selection.Selection;

  constructor() {
    Convenience.initTranslations();
  }

  _setKeybindings() {
    const bindingMode = Shell.ActionMode.NORMAL;

    for (const shortcut of Config.KeyShortcuts) {
      Main.wm.addKeybinding(
        shortcut,
        settings,
        Meta.KeyBindingFlags.NONE,
        bindingMode,
        this.onAction.bind(this, shortcut.replace('shortcut-', '')),
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
      Main.panel.addToStatusArea(Config.IndicatorName, this._indicator.panelButton);
    }
  }

  _destroyIndicator() {
    if (this._indicator) {
      this._indicator.destroy();
      this._indicator = undefined;
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
      'select-area': this._selectArea.bind(this),
      'select-window': this._selectWindow.bind(this),
      'select-desktop': this._selectDesktop.bind(this),
    };

    const f =
      dispatch[action] ||
      function () {
        throw new Error('unknown action: ' + action);
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
      log('_startSelection() error: selection already in progress');
      return;
    }

    this._selection = selection;

    if (!this._selection) {
      throw new Error('selection undefined');
    }

    this._selection.connect('screenshot', this._onScreenshot.bind(this));

    this._selection.connect('error', (selection, message) => {
      Notifications.notifyError(message);
    });

    this._selection.connect('stop', () => {
      this._selection = undefined;
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

  enable() {
    this._signalSettings.push(
      settings.connect('changed::' + Config.KeyEnableIndicator, this._updateIndicator.bind(this)),
    );
    this._updateIndicator();
    this._setKeybindings();
  }

  disable() {
    this.destroy();
  }
}

Signals.addSignalMethods(Extension.prototype);
