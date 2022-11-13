import * as Notifications from './notifications';
import { Rescale, Screenshot } from './screenshot';
import * as Config from './config';
import * as Commands from './commands';
import { getExtension } from './extension';
import { ErrorNotImplemented, getBackend, getBackendName, isActionName } from './backends/backend';
import { fileExists } from './filename';

export class BackendError extends Error {
  constructor(public backendName: string, public cause: Error) {
    super(`backend ${backendName}: ${cause}`);
  }
}

export async function onAction(action: string): Promise<void> {
  if (!isActionName(action)) {
    throw new Error(`invalid action ${action}`);
  }
  const { settings, indicator } = getExtension();

  const backend = getBackend(settings);
  if (!backend.supportsAction(action)) {
    throw new ErrorNotImplemented(action);
  }

  let filePath;
  try {
    filePath = await backend.exec(action, {
      delaySeconds: settings.get_int(Config.KeyCaptureDelay) / 1000,
    });
  } catch (e: unknown) {
    throw new BackendError(getBackendName(settings), e as Error);
  }

  if (!fileExists(filePath)) {
    throw new Error(`file ${filePath} does not exist`);
  }

  const effects = [new Rescale(settings.get_int(Config.KeyEffectRescale) / 100.0)];
  const screenshot = new Screenshot(filePath, effects);

  if (settings.get_boolean(Config.KeySaveScreenshot)) {
    screenshot.autosave();
  }

  screenshot.copyClipboard(settings.get_string(Config.KeyClipboardAction));

  if (settings.get_boolean(Config.KeyEnableNotification)) {
    Notifications.notifyScreenshot(screenshot);
  }

  if (indicator) {
    indicator.setScreenshot(screenshot);
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
