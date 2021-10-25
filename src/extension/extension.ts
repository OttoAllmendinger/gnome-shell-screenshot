import * as Meta from '@imports/Meta-8';
import * as Shell from '@imports/Shell-0.1';

import { SignalEmitter } from '..';
import ExtensionUtils from '../gselib/extensionUtils';

import * as Config from './config';
import * as Indicator from './indicator';
import * as Selection from './selection';
import * as Commands from './commands';
import * as Notifications from './notifications';
import { wrapNotifyError } from './notifications';
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
  private signalSettings: number[] = [];
  private indicator?: Indicator.Indicator;
  private selection?: Selection.Selection;

  constructor() {
    ExtensionUtils.initTranslations();
    (global as any).context.unsafe_mode = true;
  }

  setKeybindings(): void {
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

  unsetKeybindings(): void {
    for (const shortcut of Config.KeyShortcuts) {
      Main.wm.removeKeybinding(shortcut);
    }
  }

  createIndicator(): void {
    if (!this.indicator) {
      this.indicator = new Indicator.Indicator(this);
      Main.panel.addToStatusArea(Config.IndicatorName, this.indicator.panelButton);
    }
  }

  destroyIndicator(): void {
    if (this.indicator) {
      this.indicator.destroy();
      this.indicator = undefined;
    }
  }

  updateIndicator(): void {
    if (settings.get_boolean(Config.KeyEnableIndicator)) {
      this.createIndicator();
    } else {
      this.destroyIndicator();
    }
  }

  onAction(action: string): void {
    const dispatch = {
      'select-area': this.selectArea.bind(this),
      'select-window': this.selectWindow.bind(this),
      'select-desktop': this.selectDesktop.bind(this),
    };

    const f =
      dispatch[action] ||
      function () {
        throw new Error('unknown action: ' + action);
      };

    wrapNotifyError(f)();
  }

  startSelection(selection: Selection.Selection): void {
    if (this.selection) {
      // prevent reentry
      log('_startSelection() error: selection already in progress');
      return;
    }

    this.selection = selection;

    if (!this.selection) {
      throw new Error('selection undefined');
    }

    this.selection.connect('screenshot', (screenshot, file) => {
      try {
        this.onScreenshot(screenshot, file);
      } catch (e) {
        Notifications.notifyError(e);
      }
    });

    this.selection.connect('error', (selection, message) => {
      Notifications.notifyError(message);
    });

    this.selection.connect('stop', () => {
      this.selection = undefined;
    });
  }

  selectArea(): void {
    this.startSelection(new Selection.SelectionArea(getSelectionOptions()));
  }

  selectWindow(): void {
    this.startSelection(new Selection.SelectionWindow(getSelectionOptions()));
  }

  selectDesktop(): void {
    this.startSelection(new Selection.SelectionDesktop(getSelectionOptions()));
  }

  onScreenshot(selection: Selection.Selection, filePath: string): void {
    const effects = [new Rescale(settings.get_int(Config.KeyEffectRescale) / 100.0)];
    const screenshot = new Screenshot(filePath, effects);

    if (settings.get_boolean(Config.KeySaveScreenshot)) {
      screenshot.autosave();
    }

    screenshot.copyClipboard(settings.get_string(Config.KeyClipboardAction));

    if (settings.get_boolean(Config.KeyEnableNotification)) {
      Notifications.notifyScreenshot(screenshot);
    }

    if (this.indicator) {
      this.indicator.setScreenshot(screenshot);
    }

    const commandEnabled = settings.get_boolean(Config.KeyEnableRunCommand);
    if (commandEnabled) {
      const file = screenshot.getFinalFile();
      // Notifications.notifyCommand(Commands.getCommand(file));
      Commands.exec(settings.get_string(Config.KeyRunCommand), file)
        .then((command) => log(`command ${command} complete`))
        .catch((e) => Notifications.notifyError(e));
    }

    const imgurEnabled = settings.get_boolean(Config.KeyEnableUploadImgur);
    const imgurAutoUpload = settings.get_boolean(Config.KeyImgurAutoUpload);

    if (imgurEnabled && imgurAutoUpload) {
      screenshot.imgurStartUpload();
    }
  }

  destroy(): void {
    this.destroyIndicator();
    this.unsetKeybindings();

    this.signalSettings.forEach((signal) => {
      settings.disconnect(signal);
    });

    this.disconnectAll();
  }

  enable(): void {
    this.signalSettings.push(
      settings.connect('changed::' + Config.KeyEnableIndicator, this.updateIndicator.bind(this)),
    );
    this.updateIndicator();
    this.setKeybindings();
  }

  disable(): void {
    this.destroy();
  }
}

Signals.addSignalMethods(Extension.prototype);
