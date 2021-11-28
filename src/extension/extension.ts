import * as Meta from '@imports/Meta-8';
import * as Shell from '@imports/Shell-0.1';

import { SignalEmitter } from '..';
import ExtensionUtils from '../gselib/extensionUtils';

import * as Config from './config';
import * as Indicator from './indicator';
import * as Commands from './commands';
import * as Notifications from './notifications';
import { Rescale, Screenshot } from './screenshot';
import { ScreenshotPortalProxy, portalScreenshot, getServiceProxy } from './screenshotPortal';

const Signals = imports.signals;
const Main = imports.ui.main;

const settings = ExtensionUtils.getSettings();

function stripPrefix(prefix: string, s: string): string {
  if (s.startsWith(prefix)) {
    return s.slice(prefix.length);
  }
  return s;
}

export declare interface Extension extends SignalEmitter {}

export class Extension {
  private readonly servicePromise: Promise<ScreenshotPortalProxy>;
  private signalSettings: number[] = [];
  private indicator?: Indicator.Indicator;

  constructor() {
    ExtensionUtils.initTranslations();
    this.servicePromise = getServiceProxy(ExtensionUtils.getCurrentExtension().path);
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
    Notifications.wrapNotifyError(async () => {
      switch (action) {
        case 'select-area':
        case 'select-desktop':
        case 'select-window':
          throw new Error('Not available for Gnome 41');
        case 'open-portal':
          const path = await portalScreenshot(await this.servicePromise);
          this.onScreenshot(stripPrefix('file://', path));
          break;
        default:
          throw new Error('unknown action ' + action);
      }
    })();
  }

  onScreenshot(filePath: string): void {
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
