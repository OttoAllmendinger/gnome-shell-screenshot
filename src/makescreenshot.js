#!/usr/bin/env gjs
// vi: sts=2 sw=2 et
//
//  Create screenshot using dbus interface
const Gio = imports.gi.Gio;
const System = imports.system;
const GLib   = imports.gi.GLib;
const Lang   = imports.lang;


// DEBUG
imports.searchPath.unshift("./src");
const {dump} = imports.dump;


const tempfilePattern = 'gnome-shell-screenshot-util-XXXXXX.png';

const getTemp = function () {
  let [fileHandle, fileName] = GLib.file_open_tmp(tempfilePattern);
  return fileName;
};

const ScreenshotServiceIFace = `
<node>
  <interface name="org.gnome.Shell.Screenshot">
    <method name="Screenshot">
      <arg type="b" direction="in" name="include_cursor"/>
      <arg type="b" direction="in" name="flash"/>
      <arg type="s" direction="in" name="filename"/>
      <arg type="b" direction="out" name="success"/>
      <arg type="s" direction="out" name="filename_used"/>
    </method>

    <method name="ScreenshotArea">
      <arg type="i" direction="in" name="x"/>
      <arg type="i" direction="in" name="y"/>
      <arg type="i" direction="in" name="width"/>
      <arg type="i" direction="in" name="height"/>
      <arg type="b" direction="in" name="flash"/>
      <arg type="s" direction="in" name="filename"/>
      <arg type="b" direction="out" name="success"/>
      <arg type="s" direction="out" name="filename_used"/>
    </method>
  </interface>
</node>
`;

const ScreenshotServiceProxy = Gio.DBusProxy.makeProxyWrapper(ScreenshotServiceIFace);

const getScreenshotService = () => {
  return new ScreenshotServiceProxy(
    Gio.DBus.session,
    'org.gnome.Shell.Screenshot',
    '/org/gnome/Shell/Screenshot'
  );
}

const ScreenshotDesktopIncludeCursor = false;
const ScreenshotFlash = true;

const callWithDelay = (loop, delay, func) => {
  if (delay === null) {
    return func();
  } else {
    loop.timeout_add(delay, func);
  }
};

const makeDesktopScreenshot = (callback) => {
  const fileName = getTemp();
  log('creating desktop screenshot...');
  getScreenshotService().ScreenshotRemote(
    ScreenshotDesktopIncludeCursor,
    ScreenshotFlash,
    fileName,
    (ok /*, filename (is fileName) */) => {
      if (!ok) {
        return logError('error in ScreenshotRemote: ok=false');
      }
      callback(fileName);
    }
  );
}

const makeAreaScreenshot = ({x, y, w, h}, callback) => {
  const fileName = getTemp();
  log('creating area screenshot...');
  getScreenshotService().ScreenshotAreaRemote(
    x, y, w, h, ScreenshotFlash, fileName,
    (ok /*, filename (is fileName) */) => {
      if (!ok) {
        return logError('error in makeAreaScreenshot/ScreenshotAreaRemote: ok=false');
      }
      callback(fileName);
    }
  );
};


const makeOptions = (opts) =>
  Object.keys(opts).reduce((acc, ks) => {
    ks.split(',').forEach((k) => acc[k] = opts[ks]);
    return acc;
  }, {});

const parseOptions = (params, argv) =>
  argv.reduce((acc, arg, i) => {
    if (!params[arg]) {
      throw new Error(`no such parameter ${arg}`);
    }

    const { name, isSwitch } = params[arg];
    let val;
    if (isSwitch) {
      val = true
    } else if ((i + 1) in argv) {
      val = argv[i + 1];
      delete argv[i + 1];
    } else {
      throw new Error(`no value for parameter ${arg}`);
    }

    acc[name] = val;
    return acc;
  }, {});


const main = () => {
  const opts = parseOptions(makeOptions({
    '--desktop,-d': { name: 'desktop', help: 'make desktop screenshot', isSwitch: true },
    '--area,-a'   : { name: 'area',    help: 'make area screenshot (x,y,w,h)' },
    '--delay,-t'  : { name: 'delay',   help: 'capture delay (ms)' }
  }), ARGV);
  log(dump(opts));

  const quitMainLoop = (fileName) => {
    log(`written ${fileName}`);
    imports.mainloop.quit();
  }

  let func;
  if (opts.desktop) {
    func = () => makeDesktopScreenshot(quitMainLoop);
  }
  if (opts.area) {
    const coords = opts.area.split(',').map(Number);
    if (coords.some(isNaN)) {
      throw new Error(`invalid --area coords (must be 'x,y,w,h')`);
    }
    const [x,y,w,h] = coords;
    func = () => makeAreaScreenshot({x,y,w,h}, quitMainLoop);
  }
  let delay = null;
  if (opts.delay !== undefined) {
    delay = Number(opts.delay);
  }

  if (delay === null) {
    func();
  } else {
    log('delay ' + delay);
    imports.mainloop.timeout_add(delay, func);
  }

  imports.mainloop.run();
}

main();
