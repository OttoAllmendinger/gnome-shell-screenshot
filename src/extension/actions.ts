import * as Notifications from './notifications';
import { portalScreenshot } from './screenshotPortal';
import { Rescale, Screenshot } from './screenshot';
import * as Config from './config';
import * as Commands from './commands';
import { getExtension } from './extension';

function stripPrefix(prefix: string, s: string): string {
  if (s.startsWith(prefix)) {
    return s.slice(prefix.length);
  }
  return s;
}

export function onScreenshot(filePath: string): void {
  const { settings, indicator } = getExtension();
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

export function onAction(action: string): void {
  Notifications.wrapNotifyError(async () => {
    switch (action) {
      case 'select-area':
      case 'select-desktop':
      case 'select-window':
        throw new Error('Not available for Gnome 41');
      case 'open-portal':
        const path = await portalScreenshot(await getExtension().servicePromise);
        onScreenshot(stripPrefix('file://', path));
        break;
      default:
        throw new Error('unknown action ' + action);
    }
  })();
}
