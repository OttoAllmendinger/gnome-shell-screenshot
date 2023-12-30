import Meta from '@girs/meta-10';
import Shell from '@girs/shell-12';
import * as Main from '@gnome-shell/ui/main';
import { Extension, ExtensionMetadata, gettext } from '@gnome-shell/extensions/extension';

import { onAction } from './actions';
import { wrapNotifyError } from './notifications';
import * as Config from './config';
import * as Indicator from './indicator';
import { ScreenshotPortalProxy, getServiceProxy } from './screenshotPortal';
import { initGettext } from './gettext';

export class GnomeShellScreenshotExtension extends Extension {
  public static instance: GnomeShellScreenshotExtension | null = null;
  public servicePromise: Promise<ScreenshotPortalProxy | void> | null = null;
  public indicator?: Indicator.Indicator;

  private readonly signalSettings: number[] = [];

  constructor(props: ExtensionMetadata) {
    super(props);
  }

  setKeybindings(): void {
    const bindingMode = Shell.ActionMode.NORMAL;

    for (const shortcut of Config.KeyShortcuts) {
      Main.wm.addKeybinding(
        shortcut,
        this.getSettings(),
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
      this.indicator = new Indicator.Indicator();
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
    if (this.getSettings().get_boolean(Config.KeyEnableIndicator)) {
      this.createIndicator();
    } else {
      this.destroyIndicator();
    }
  }

  enable(): void {
    initGettext(gettext);
    GnomeShellScreenshotExtension.instance = this;
    const path = this.dir.get_path();
    if (!path) {
      throw new Error('could not get extension path');
    }
    this.servicePromise = getServiceProxy(path).catch((err) => {
      console.error(err);
    });
    this.signalSettings.push(
      this.getSettings().connect('changed::' + Config.KeyEnableIndicator, this.updateIndicator.bind(this)),
    );
    this.updateIndicator();
    this.setKeybindings();
  }

  disable(): void {
    this.signalSettings.forEach((signal) => {
      this.getSettings().disconnect(signal);
    });
    this.servicePromise = null;

    this.destroyIndicator();
    this.unsetKeybindings();

    GnomeShellScreenshotExtension.instance = null;
  }

  getConfig(): Config.Config {
    return new Config.Config(this.getSettings());
  }
}

export function getExtension(): GnomeShellScreenshotExtension {
  if (!GnomeShellScreenshotExtension.instance) {
    throw new Error('extension is not enabled');
  }
  return GnomeShellScreenshotExtension.instance;
}
