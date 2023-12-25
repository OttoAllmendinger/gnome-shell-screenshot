import Shell from '@girs/shell-12';
import Clutter from '@girs/clutter-13';

import { ActionName, Backend, ErrorNotImplemented, ParamName, ScreenshotParams } from './backend';
import { spawnAsync } from '../spawnUtil';
import { getTemp, fileExists } from '../filename';
import { _ } from '../gettext';

/*

Usage:
  gnome-screenshot [OPTION…]

Help Options:
  -h, --help                     Show help options
  --help-all                     Show all help options
  --help-gapplication            Show GApplication options
  --help-gtk                     Show GTK+ Options

Application Options:
  -c, --clipboard                Send the grab directly to the clipboard
  -w, --window                   Grab a window instead of the entire screen
  -a, --area                     Grab an area of the screen instead of the entire screen
  -b, --include-border           Include the window border with the screenshot. This option is deprecated and window border is always included
  -B, --remove-border            Remove the window border from the screenshot. This option is deprecated and window border is always included
  -p, --include-pointer          Include the pointer with the screenshot
  -d, --delay=seconds            Take screenshot after specified delay [in seconds]
  -e, --border-effect=effect     Effect to add to the border (‘shadow’, ‘border’, ‘vintage’ or ‘none’). Note: This option is deprecated and is assumed to be ‘none’
  -i, --interactive              Interactively set options
  -f, --file=filename            Save screenshot directly to this file
  --version                      Print version information and exit
  --display=DISPLAY              X display to use

 */

class CaptureKeys {
  static stage = Shell.Global.get().stage;

  signal: number;
  pressEsc = false;

  constructor() {
    this.signal = CaptureKeys.stage.connect('captured-event', (obj, event) => {
      if (event.type() === Clutter.EventType.KEY_PRESS && event.get_key_symbol() === Clutter.KEY_Escape) {
        this.pressEsc = true;
      }

      return false;
    });
  }

  stop() {
    if (this.signal) {
      CaptureKeys.stage.disconnect(this.signal);
    }
  }
}

export class BackendGnomeScreenshot implements Backend {
  supportsParam(paramName: ParamName): boolean {
    return paramName === 'delay-seconds';
  }

  supportsAction(action: ActionName): boolean {
    switch (action) {
      case 'select-area':
      case 'select-window':
      case 'select-desktop':
        return true;
      default:
        return false;
    }
  }

  async exec(action: ActionName, params: ScreenshotParams): Promise<string> {
    if (!Number.isInteger(params.delaySeconds)) {
      throw new Error(`delaySeconds must be integer, got ${params.delaySeconds}`);
    }

    const tempfile = getTemp();
    const args = ['gnome-screenshot', `--delay=${params.delaySeconds}`, `--file=${tempfile}`];
    switch (action) {
      case 'select-area':
        args.push('--area');
        break;
      case 'select-window':
        args.push('--window');
        break;
      case 'select-desktop':
        // default
        break;
      default:
        throw new ErrorNotImplemented(action);
    }

    const captureKeys = new CaptureKeys();

    try {
      await spawnAsync(args);
    } finally {
      captureKeys.stop();
    }

    if (!fileExists(tempfile)) {
      if (captureKeys.pressEsc) {
        throw new Error(_('Selection aborted.'));
      }

      throw new Error(_('Output file does not exist.'));
    }

    return tempfile;
  }
}
