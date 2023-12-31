import Gio from '@girs/gio-2.0';

import * as Config from '../config';

import { BackendGnomeScreenshot } from './backendGnomeScreenshot';
import { BackendDeskopPortal } from './backendDeskopPortal';
import { BackendShellUI } from './backendShellUI';

export class ErrorNotImplemented extends Error {
  constructor(action: ActionName) {
    super(`action ${action} not implemented for this backend`);
  }
}

export interface ScreenshotParams {
  delaySeconds?: number;
}

export type ParamName = 'delay-seconds';

const actionNames = ['open-portal', 'select-area', 'select-window', 'select-desktop'] as const;

export type ActionName = (typeof actionNames)[number];

export function isActionName(v: string): v is ActionName {
  return actionNames.includes(v as ActionName);
}

export interface Backend {
  supportsParam(paramName: ParamName): boolean;

  supportsAction(action: ActionName): boolean;

  exec(action: ActionName, params: ScreenshotParams): Promise<string>;
}

export function getBackendName(settings: Gio.Settings): string {
  return new Config.Config(settings).getString(Config.KeyBackend);
}

export function getBackend(settings: Gio.Settings): Backend {
  const name = getBackendName(settings);
  switch (name) {
    case Config.Backends.GNOME_SCREENSHOT_CLI:
      return new BackendGnomeScreenshot();
    case Config.Backends.DESKTOP_PORTAL:
      return new BackendDeskopPortal();
    case Config.Backends.SHELL_UI:
      return new BackendShellUI();
    default:
      throw new Error(`unexpected backend ${name}`);
  }
}
