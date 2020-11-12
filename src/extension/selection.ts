import * as St from '@imports/St-1.0';
import * as GLib from '@imports/GLib-2.0';
import * as Meta from '@imports/Meta-7';
import * as Clutter from '@imports/Clutter-7';
import * as Shell from '@imports/Shell-0.1';

import { SignalEmitter } from '..';

import { currentVersion } from '../gselib/version';
import ExtensionUtils from '../gselib/extensionUtils';
import { _ } from '../gselib/gettext';

import * as Filename from './filename';

const Signals = imports.signals;
const Mainloop = imports.mainloop;

const Main = imports.ui.main;

const Local = ExtensionUtils.getCurrentExtension();

const version = currentVersion();

type ScreenshotCallback = (error: Error | null, fileName: string | null) => void;

const shellGlobal: Shell.Global = Shell.Global.get();

const getRectangle = (x1, y1, x2, y2) => {
  return {
    x: Math.min(x1, x2),
    y: Math.min(y1, y2),
    w: Math.abs(x1 - x2),
    h: Math.abs(y1 - y2),
  };
};

const getWindowRectangle = (win) => {
  const { x, y, width: w, height: h } = win.get_meta_window().get_frame_rect();
  return { x, y, w, h };
};

const selectWindow = (windows, px, py) => {
  const filtered = windows.filter((win) => {
    if (win === undefined || !win.visible || typeof win.get_meta_window !== 'function') {
      return false;
    }
    const { x, y, w, h } = getWindowRectangle(win);
    return x <= px && y <= py && x + w >= px && y + h >= py;
  });

  if (filtered.length === 0) {
    return;
  }

  filtered.sort((a, b) => a.get_meta_window().get_layer() <= b.get_meta_window().get_layer());

  return filtered[0];
};

const callHelper = (argv, fileName, callback: ScreenshotCallback) => {
  argv = ['gjs', Local.path + '/auxhelper.js', '--filename', fileName, ...argv];
  // log(argv.join(' '));
  const [success, pid] = GLib.spawn_async(
    null /* pwd */,
    argv,
    null /* envp */,
    GLib.SpawnFlags.SEARCH_PATH | GLib.SpawnFlags.DO_NOT_REAP_CHILD,
    null /* child_setup */,
  );
  if (!success) {
    throw new Error('success=false');
  }
  if (pid === null) {
    throw new Error('pid === null');
  }
  GLib.child_watch_add(GLib.PRIORITY_DEFAULT, pid, (pid, exitCode) => {
    if (exitCode !== 0) {
      logError(new Error(`cmd: ${argv.join(' ')} exitCode=${exitCode}`));
      return callback(new Error(`exitCode=${exitCode}`), null);
    }
    callback(null, fileName);
  });
};

const makeAreaScreenshot = ({ x, y, w, h }, callback) => {
  const fileName = Filename.getTemp();
  callHelper(['--area', [x, y, w, h].join(',')], fileName, callback);
};

const makeWindowScreenshot = (callback) => {
  const fileName = Filename.getTemp();
  callHelper(['--window'], fileName, callback);
};

const makeDesktopScreenshot = (callback) => {
  const fileName = Filename.getTemp();
  callHelper(['--desktop'], fileName, callback);
};

interface SelectionOptions {
  captureDelay: number;
}

declare interface Capture extends SignalEmitter {}

class Capture {
  private _mouseDown: boolean;
  private _container: St.Widget;
  private _signalCapturedEvent?: number;

  constructor() {
    this._mouseDown = false;

    this._container = new St.Widget({
      name: 'area-selection',
      style_class: 'area-selection',
      visible: true,
      reactive: true,
      x: -10,
      y: -10,
    });

    Main.uiGroup.add_actor(this._container);

    if (Main.pushModal(this._container)) {
      this._signalCapturedEvent = shellGlobal.stage.connect('captured-event', this._onCaptureEvent.bind(this));

      this._setCaptureCursor();
    } else {
      log('Main.pushModal() === false');
    }
  }

  _setCursorCompat(v) {
    if (version.greaterEqual('3.29')) {
      shellGlobal.display.set_cursor(v);
    } else {
      (shellGlobal as any).screen.set_cursor(v);
    }
  }

  _setDefaultCursor() {
    this._setCursorCompat(Meta.Cursor.DEFAULT);
  }

  _setCaptureCursor() {
    this._setCursorCompat(Meta.Cursor.CROSSHAIR);
  }

  _onCaptureEvent(actor, event) {
    if (event.type() === Clutter.EventType.KEY_PRESS) {
      if (event.get_key_symbol() === Clutter.KEY_Escape) {
        this.stop();
      }
    }

    this.emit('captured-event', event);
  }

  drawContainer({ x, y, w, h }) {
    this._container.set_position(x, y);
    this._container.set_size(w, h);
  }

  clearContainer() {
    this.drawContainer({ x: -10, y: -10, w: 0, h: 0 });
  }

  stop() {
    this.clearContainer();
    if (this._signalCapturedEvent !== undefined) {
      shellGlobal.stage.disconnect(this._signalCapturedEvent);
    }
    this._setDefaultCursor();
    Main.uiGroup.remove_actor(this._container);
    Main.popModal(this._container);
    this._container.destroy();
    this.emit('stop');
    this.disconnectAll();
  }
}

Signals.addSignalMethods(Capture.prototype);

const emitScreenshotOnSuccess = (instance): ScreenshotCallback => (error, fileName) => {
  if (error) {
    return instance.emit('error', error);
  }
  instance.emit('screenshot', fileName);
};

export declare interface SelectionArea extends SignalEmitter {}

export class SelectionArea {
  private _options: SelectionOptions;
  private _mouseDown: boolean;
  private _capture: Capture;
  private _startX?: number;
  private _startY?: number;

  constructor(options: SelectionOptions) {
    this._options = options;
    this._mouseDown = false;
    this._capture = new Capture();
    this._capture.connect('captured-event', this._onEvent.bind(this));
    this._capture.connect('stop', this.emit.bind(this, 'stop'));
  }

  _onEvent(capture, event) {
    const type = event.type();
    const [x, y] = shellGlobal.get_pointer();

    if (type === Clutter.EventType.BUTTON_PRESS) {
      [this._startX, this._startY] = [x, y];
      this._mouseDown = true;
    } else if (this._mouseDown) {
      const rect = getRectangle(this._startX, this._startY, x, y);
      if (type === Clutter.EventType.MOTION) {
        this._capture.drawContainer(rect);
      } else if (type === Clutter.EventType.BUTTON_RELEASE) {
        this._capture.stop();
        this._screenshot(rect);
      }
    }
  }

  _screenshot(region) {
    if (region.w < 8 || region.h < 8) {
      this.emit('error', _('selected region was too small - please select a larger area'));

      this.emit('stop');
      return;
    }

    const scaleFactor = St.ThemeContext.get_for_stage(Shell.Global.get().stage.get_stage()).scale_factor;

    if (scaleFactor !== 1) {
      ['x', 'y', 'w', 'h'].forEach((key) => {
        region[key] = Math.floor(region[key] / scaleFactor);
      });
    }

    Mainloop.timeout_add(this._options.captureDelay, () => {
      makeAreaScreenshot(region, emitScreenshotOnSuccess(this));
    });
  }
}

Signals.addSignalMethods(SelectionArea.prototype);

export declare interface SelectionWindow extends SignalEmitter {}

export class SelectionWindow {
  private _options: SelectionOptions;
  private _windows: Meta.WindowActor[];
  private _capture: Capture;
  private _selectedWindow: undefined | any;

  constructor(options: SelectionOptions) {
    this._options = options;
    this._windows = shellGlobal.get_window_actors();
    this._capture = new Capture();
    this._capture.connect('captured-event', this._onEvent.bind(this));
    this._capture.connect('stop', this.emit.bind(this, 'stop'));
  }

  _onEvent(capture, event) {
    const type = event.type();
    const [x, y] = shellGlobal.get_pointer();

    this._selectedWindow = selectWindow(this._windows, x, y);

    if (this._selectedWindow) {
      this._highlightWindow(this._selectedWindow);
    } else {
      this._clearHighlight();
    }

    if (type === Clutter.EventType.BUTTON_PRESS) {
      if (this._selectedWindow) {
        this._screenshot(this._selectedWindow);
      }
    }
  }

  _highlightWindow(win) {
    this._capture.drawContainer(getWindowRectangle(win));
  }

  _clearHighlight() {
    this._capture.clearContainer();
  }

  _screenshot(win) {
    this._capture.stop();
    Mainloop.timeout_add(this._options.captureDelay, () => {
      Main.activateWindow(win.get_meta_window());
      Mainloop.idle_add(() => makeWindowScreenshot(emitScreenshotOnSuccess(this)));
    });
  }
}

Signals.addSignalMethods(SelectionWindow.prototype);

export declare interface SelectionDesktop extends SignalEmitter {}

export class SelectionDesktop {
  private _options: SelectionOptions;

  constructor(options: SelectionOptions) {
    this._options = options;
    Mainloop.timeout_add(this._options.captureDelay, () => {
      makeDesktopScreenshot(emitScreenshotOnSuccess(this));
      this.emit('stop');
    });
  }
}

Signals.addSignalMethods(SelectionDesktop.prototype);

export type Selection = SelectionArea | SelectionWindow | SelectionDesktop;
