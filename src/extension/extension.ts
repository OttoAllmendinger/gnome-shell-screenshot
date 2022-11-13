import * as Meta from '@gi-types/meta8';
import * as Shell from '@gi-types/shell0';
import { Settings } from '@gi-types/gio2';

import { SignalEmitter } from '..';
import { onAction } from './actions';
import { wrapNotifyError } from './notifications';
import * as Config from './config';
import * as Indicator from './indicator';
import { ScreenshotPortalProxy, getServiceProxy } from './screenshotPortal';
import ExtensionUtils, { ExtensionInfo } from '../gselib/extensionUtils';

const Signals = imports.signals;
const Main = imports.ui.main;

export declare interface Extension extends SignalEmitter {}

export class Extension {
  public readonly settings: Settings;
  public readonly info: ExtensionInfo;
  public readonly servicePromise: Promise<ScreenshotPortalProxy>;
  public indicator?: Indicator.Indicator;

  private readonly signalSettings: number[] = [];

  constructor() {
    this.settings = ExtensionUtils.getSettings();
    this.info = ExtensionUtils.getCurrentExtension();
    this.servicePromise = getServiceProxy(this.info.path);
    this.signalSettings.push(
      this.settings.connect('changed::' + Config.KeyEnableIndicator, this.updateIndicator.bind(this)),
    );
  }

  setKeybindings(): void {
    const bindingMode = Shell.ActionMode.NORMAL;

    for (const shortcut of Config.KeyShortcuts) {
      Main.wm.addKeybinding(
        shortcut,
        this.settings,
        Meta.KeyBindingFlags.NONE,
        bindingMode,
        wrapNotifyError(() => onAction(shortcut.replace('shortcut-', ''))),
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
    if (this.settings.get_boolean(Config.KeyEnableIndicator)) {
      this.createIndicator();
    } else {
      this.destroyIndicator();
    }
  }

  disable(): void {
    this.signalSettings.forEach((signal) => {
      this.settings.disconnect(signal);
    });

    this.disconnectAll();
  }
}

Signals.addSignalMethods(Extension.prototype);

let extension: Extension | null;

export function getExtension() {
  if (!extension) {
    throw new Error('extension is not enabled');
  }
  return extension;
}

export function enable() {
  extension = new Extension();
  extension.updateIndicator();
  extension.setKeybindings();
}

export function disable() {
  if (extension) {
    extension.disable();
    extension.destroyIndicator();
    extension.unsetKeybindings();
    extension = null;
  }
}
