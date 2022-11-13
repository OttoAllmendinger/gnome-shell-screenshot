import { Settings } from '@gi-types/gio2';

import * as Config from '../config';

import { BackendGnomeScreenshot } from './backendGnomeScreenshot';
import { BackendDeskopPortal } from './backendDeskopPortal';

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

export type ActionName = typeof actionNames[number];

export function isActionName(v: string): v is ActionName {
  return actionNames.includes(v as ActionName);
}

export interface Backend {
  supportsParam(paramName: ParamName): boolean;

  supportsAction(action: ActionName): boolean;

  exec(action: ActionName, params: ScreenshotParams): Promise<string>;
}

export function getBackendName(settings: Settings): string {
  return settings.get_string(Config.KeyBackend);
}

export function getBackend(settings: Settings): Backend {
  const name = getBackendName(settings);
  switch (name) {
    case Config.Backends.GNOME_SCREENSHOT_CLI:
      return new BackendGnomeScreenshot();
    case Config.Backends.DESKTOP_PORTAL:
      return new BackendDeskopPortal();
    default:
      throw new Error(`unexpected backend ${name}`);
  }
}
