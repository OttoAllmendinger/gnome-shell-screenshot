import * as Notifications from './notifications';
import { Rescale, Screenshot } from './screenshot';
import * as Config from './config';
import * as Commands from './commands';
import { getExtension } from './extension';
import { ErrorNotImplemented, getBackend, getBackendName, isActionName } from './backends/backend';
import { fileExists } from './filename';

export class BackendError extends Error {
  constructor(
    public backendName: string,
    public cause: Error,
  ) {
    super(`backend ${backendName}: ${cause}`);
  }
}

export async function onAction(action: string): Promise<void> {
  if (!isActionName(action)) {
    throw new Error(`invalid action ${action}`);
  }
  const { indicator } = getExtension();
  const settings = getExtension().getSettings();

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

  const config = getExtension().getConfig();
  const effects = [new Rescale(config.getInt(Config.KeyEffectRescale) / 100.0)];
  const screenshot = new Screenshot(filePath, effects);

  if (config.getBool(Config.KeySaveScreenshot)) {
    screenshot.autosave();
  }

  screenshot.copyClipboard(config.getString(Config.KeyClipboardAction));

  if (config.getBool(Config.KeyEnableNotification)) {
    Notifications.notifyScreenshot(screenshot);
  }

  if (indicator) {
    indicator.setScreenshot(screenshot);
  }

  const commandEnabled = config.getBool(Config.KeyEnableRunCommand);
  if (commandEnabled) {
    const file = screenshot.getFinalFile();
    Commands.exec(config.getString(Config.KeyRunCommand), file)
      .then((command) => console.log(`command ${command} complete`))
      .catch((e) => Notifications.notifyError(e));
  }

  const imgurEnabled = config.getBool(Config.KeyEnableUploadImgur);
  const imgurAutoUpload = config.getBool(Config.KeyImgurAutoUpload);

  if (imgurEnabled && imgurAutoUpload) {
    screenshot.imgurStartUpload();
  }
}
