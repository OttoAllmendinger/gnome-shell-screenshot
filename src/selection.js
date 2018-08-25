// vi: sts=2 sw=2 et

const Lang = imports.lang;
const Signals = imports.signals;
const Mainloop = imports.mainloop;

const St = imports.gi.St;
const GLib   = imports.gi.GLib;
const Shell = imports.gi.Shell;
const Meta = imports.gi.Meta;
const Clutter = imports.gi.Clutter;

const Main = imports.ui.main;


const Gettext = imports.gettext.domain('gnome-shell-screenshot');
const _ = Gettext.gettext;


const ScreenshotWindowIncludeCursor = false;
const ScreenshotWindowIncludeFrame = true;
const ScreenshotDesktopIncludeCursor = false;

const ExtensionUtils = imports.misc.extensionUtils;
const Local = ExtensionUtils.getCurrentExtension();

const Filename = Local.imports.filename.exports;
const Convenience = Local.imports.convenience.exports;


const getRectangle = (x1, y1, x2, y2) => {
  return {
    x: Math.min(x1, x2),
    y: Math.min(y1, y2),
    w: Math.abs(x1 - x2),
    h: Math.abs(y1 - y2)
  };
};


const getWindowRectangle = (win) => {
  const { x, y, width: w, height: h } = win.get_meta_window().get_frame_rect();
  return { x, y, w, h };
};


const selectWindow = (windows, px, py) => {
  const filtered = windows.filter((win) => {
    if ((win === undefined)
          || !win.visible
          || (typeof win.get_meta_window !== 'function')
    ) {
      return false;
    }
    const { x, y, w, h } = getWindowRectangle(win);
    return (
      (x <= px) && (y <= py) && ((x + w) >= px) && ((y + h) >= py)
    );
  });

  if (filtered.length === 0) {
    return;
  }

  filtered.sort((a, b) =>
    (a.get_meta_window().get_layer() <= b.get_meta_window().get_layer())
  );

  return filtered[0];
};

const callHelper = (argv, fileName, callback) => {
  argv = ['gjs', Local.path + '/auxhelper.js', '--filename', fileName, ...argv];
  // log(argv.join(' '));
  let [success, pid] = GLib.spawn_async(
    null, /* pwd */
    argv,
    null, /* envp */
    GLib.SpawnFlags.SEARCH_PATH | GLib.SpawnFlags.DO_NOT_REAP_CHILD,
    null /* child_setup */
  );
  if (!success) {
    throw new Error(`success=false`);
  }
  GLib.child_watch_add(GLib.PRIORITY_DEFAULT, pid, (pid, exitCode) => {
    if (exitCode !== 0) {
      logError(new Error(`cmd: ${argv.join(' ')} exitCode=${exitCode}`));
      return callback(new Error(`exitCode=${exitCode}`, null));
    }
    callback(null, fileName);
  });
}


const makeAreaScreenshot = ({x, y, w, h}, callback) => {
  const fileName = Filename.getTemp();
  callHelper(['--area', [x,y,w,h].join(',')], fileName, callback);
};

const makeWindowScreenshot = (callback) => {
  const fileName = Filename.getTemp();
  callHelper(['--window'], fileName, callback);
};

const makeDesktopScreenshot = (callback) => {
  const fileName = Filename.getTemp();
  callHelper(['--desktop'], fileName, callback);
};


const Capture = new Lang.Class({
  Name: "ScreenshotTool.Capture",

  _init: function () {
    this._mouseDown = false;

    this._container = new Shell.GenericContainer({
      name: 'area-selection',
      style_class: 'area-selection',
      visible:  'true',
      reactive: 'true',
      x: -10,
      y: -10
    });

    Main.uiGroup.add_actor(this._container);

    if (Main.pushModal(this._container)) {
      this._signalCapturedEvent  = global.stage.connect(
        'captured-event', this._onCaptureEvent.bind(this)
      );

      this._setCaptureCursor();
    } else {
      log("Main.pushModal() === false");
    }
  },

  _setCursorCompat: function (v) {
    if (Convenience.currentVersionGreaterEqual('3.29')) {
      global.display.set_cursor(v);
    } else {
      global.screen.set_cursor(v);
    }
  },

  _setDefaultCursor: function () {
    this._setCursorCompat(Meta.Cursor.DEFAULT);
  },

  _setCaptureCursor: function () {
    this._setCursorCompat(Meta.Cursor.CROSSHAIR);
  },

  _onCaptureEvent: function (actor, event) {
    if (event.type() === Clutter.EventType.KEY_PRESS) {
      if (event.get_key_symbol() === Clutter.Escape) {
        this.stop();
      }
    }

    this.emit("captured-event", event);
  },

  drawContainer: function ({x, y, w, h}) {
    this._container.set_position(x, y);
    this._container.set_size(w, h);
  },

  clearContainer: function () {
    this.drawContainer({x: -10, y: -10, w: 0, h: 0});
  },

  stop: function () {
    this.clearContainer();
    global.stage.disconnect(this._signalCapturedEvent);
    this._setDefaultCursor();
    Main.uiGroup.remove_actor(this._container);
    Main.popModal(this._container);
    this._container.destroy();
    this.emit("stop");
    this.disconnectAll();
  }
});

Signals.addSignalMethods(Capture.prototype);


const emitScreenshotOnSuccess = (instance) =>
  (error, fileName) => {
    if (error) {
      return instance.emit('error', error);
    }
    instance.emit('screenshot', fileName);
  }


const SelectionArea = new Lang.Class({
  Name: "ScreenshotTool.SelectionArea",

  _init: function (options) {
    this._options = options;
    this._mouseDown = false;
    this._capture = new Capture();
    this._capture.connect('captured-event', this._onEvent.bind(this));
    this._capture.connect('stop', this.emit.bind(this, 'stop'));
  },

  _onEvent: function (capture, event) {
    let type = event.type();
    let [x, y] = global.get_pointer();

    if (type === Clutter.EventType.BUTTON_PRESS) {
      [this._startX, this._startY] = [x, y];
      this._mouseDown = true;
    } else if (this._mouseDown) {
      let rect = getRectangle(this._startX, this._startY, x, y);
      if (type === Clutter.EventType.MOTION) {
        this._capture.drawContainer(rect);
      } else if (type === Clutter.EventType.BUTTON_RELEASE) {
        this._capture.stop();
        this._screenshot(rect);
      }
    }
  },

  _screenshot: function (region) {
    let fileName = Filename.getTemp();

    if ((region.w < 8) || (region.h < 8)) {
      this.emit(
        "error",
        _("selected region was too small - please select a larger area")
      );

      this.emit("stop");
      return;
    }

    const scaleFactor =
      St.ThemeContext.get_for_stage(global.stage).scale_factor;

    if (scaleFactor !== 1) {
      ['x', 'y', 'w', 'h'].forEach((key) => {
        region[key] = Math.floor(region[key] / scaleFactor);
      });
    }

    Mainloop.timeout_add(this._options.captureDelay, () => {
      makeAreaScreenshot(region, emitScreenshotOnSuccess(this))
    });
  }
});

Signals.addSignalMethods(SelectionArea.prototype);



const SelectionWindow = new Lang.Class({
  Name: "ScreenshotTool.SelectionWindow",

  _init: function (options) {
    this._options = options;
    this._windows = global.get_window_actors();
    this._capture = new Capture();
    this._capture.connect('captured-event', this._onEvent.bind(this));
    this._capture.connect('stop', this.emit.bind(this, 'stop'));
  },

  _onEvent: function (capture, event) {
    let type = event.type();
    let [x, y] = global.get_pointer();

    this._selectedWindow = selectWindow(this._windows, x, y)

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
  },

  _highlightWindow: function (win) {
    this._capture.drawContainer(getWindowRectangle(win));
  },

  _clearHighlight: function () {
    this._capture.clearContainer();
  },

  _screenshot: function (win) {
    this._capture.stop();
    Mainloop.timeout_add(this._options.captureDelay, () => {
      Main.activateWindow(win.get_meta_window());
      Mainloop.idle_add(() =>
        makeWindowScreenshot(emitScreenshotOnSuccess(this))
      );
    });
  }
});

Signals.addSignalMethods(SelectionWindow.prototype);






const SelectionDesktop = new Lang.Class({
  Name: "ScreenshotTool.SelectionDesktop",

  _init: function (options) {
    this._options = options;
    Mainloop.timeout_add(this._options.captureDelay, () => {
      makeDesktopScreenshot(emitScreenshotOnSuccess(this));
      this.emit('stop');
    });
  }
});

Signals.addSignalMethods(SelectionDesktop.prototype);


var exports = {
  SelectionArea,
  SelectionWindow,
  SelectionDesktop
};
