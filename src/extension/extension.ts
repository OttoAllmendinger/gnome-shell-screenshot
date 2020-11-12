// props to
// https://github.com/rjanja/desktop-capture
// https://github.com/DASPRiD/gnome-shell-extension-area-screenshot

import * as Meta from '@imports/Meta-7';
import * as Shell from '@imports/Shell-0.1';

import { SignalEmitter } from '..';
import ExtensionUtils from '../gselib/extensionUtils';

import * as Config from './config';
import * as Indicator from './indicator';
import * as Selection from './selection';
import * as Notifications from './notifications';
import { Rescale, Screenshot } from './screenshot';

const Signals = imports.signals;
const Main = imports.ui.main;

const settings = ExtensionUtils.getSettings();

const getSelectionOptions = () => {
  const captureDelay = settings.get_int(Config.KeyCaptureDelay);
  return { captureDelay };
};

export declare interface Extension extends SignalEmitter {}

export class Extension {
  private _signalSettings: number[] = [];
  private _indicator?: Indicator.Indicator;
  private _selection?: Selection.Selection;

  constructor() {
    ExtensionUtils.initTranslations();
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

  _startSelection(selection: Selection.Selection) {
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

  _onScreenshot(selection: Selection.Selection, filePath: string) {
    const effects = [new Rescale(settings.get_int(Config.KeyEffectRescale) / 100.0)];
    const screenshot = new Screenshot(filePath, effects);

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
