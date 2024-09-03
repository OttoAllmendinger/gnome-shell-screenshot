import Meta from 'gi://Meta';
import Shell from 'gi://Shell';
import { messageTray, wm, panel } from 'resource:///org/gnome/shell/ui/main.js';
import { Extension, gettext as gettext$1 } from 'resource:///org/gnome/shell/extensions/extension.js';
import Gio from 'gi://Gio';
import GdkPixbuf from 'gi://GdkPixbuf';
import GLib from 'gi://GLib';
import St from 'gi://St';
import Soup from 'gi://Soup';
import { Notification, Source } from 'resource:///org/gnome/shell/ui/messageTray.js';
import GObject from 'gi://GObject';
import Clutter from 'gi://Clutter';
import { ScreenshotUI } from 'resource:///org/gnome/shell/ui/screenshot.js';
import Cogl from 'gi://Cogl';
import { Button } from 'resource:///org/gnome/shell/ui/panelMenu.js';
import { PopupMenuItem, PopupSeparatorMenuItem, PopupMenuSection, PopupBaseMenuItem, PopupSubMenuMenuItem } from 'resource:///org/gnome/shell/ui/popupMenu.js';
import { Slider } from 'resource:///org/gnome/shell/ui/slider.js';

/******************************************************************************
Copyright (c) Microsoft Corporation.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
***************************************************************************** */

function __decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}

var _SuppressedError = typeof SuppressedError === "function" ? SuppressedError : function (error, suppressed, message) {
    var e = new Error(message);
    return e.name = "SuppressedError", e.error = error, e.suppressed = suppressed, e;
};

const KeyBackend = 'backend';
const Backends = {
    DESKTOP_PORTAL: 'desktop-portal',
    GNOME_SCREENSHOT_CLI: 'gnome-screenshot',
    SHELL_UI: 'shell-ui',
};
const IndicatorName = 'de.ttll.GnomeScreenshot';
const KeyEnableIndicator = 'enable-indicator';
const KeyEnableNotification = 'enable-notification';
const ValueShortcutSelectArea = 'shortcut-select-area';
const ValueShortcutSelectWindow = 'shortcut-select-window';
const ValueShortcutSelectDesktop = 'shortcut-select-desktop';
const ValueShortcutOpenPortal = 'shortcut-open-portal';
const KeyShortcuts = [
    ValueShortcutSelectArea,
    ValueShortcutSelectWindow,
    ValueShortcutSelectDesktop,
    ValueShortcutOpenPortal,
];
// See schemas/org.gnome.shell.extensions.screenshot.gschema.xml
const KeyClickAction = 'click-action';
const KeyCaptureDelay = 'capture-delay';
const KeySaveScreenshot = 'save-screenshot';
const KeySaveLocation = 'save-location';
const KeyFilenameTemplate = 'filename-template';
// "Auto-Copy to Clipboard" action
const KeyClipboardAction = 'clipboard-action';
// Copy button action
const KeyCopyButtonAction = 'copy-button-action';
const ClipboardActions = {
    NONE: 'none',
    SET_IMAGE_DATA: 'set-image-data',
    SET_LOCAL_PATH: 'set-local-path',
    SET_REMOTE_URL: 'set-remote-url',
};
const KeyEnableUploadImgur = 'enable-imgur';
const KeyImgurEnableNotification = 'imgur-enable-notification';
const KeyImgurAutoUpload = 'imgur-auto-upload';
const KeyImgurAutoCopyLink = 'imgur-auto-copy-link';
const KeyImgurAutoOpenLink = 'imgur-auto-open-link';
const KeyEffectRescale = 'effect-rescale';
const KeyEnableRunCommand = 'enable-run-command';
const KeyRunCommand = 'run-command';
class Config {
    settings;
    constructor(settings) {
        this.settings = settings;
    }
    get(key, f) {
        const value = f(this.settings);
        if (value === null) {
            throw new Error(`invalid config value for ${key}`);
        }
        return value;
    }
    getString(key) {
        return this.get(key, (s) => s.get_string(key));
    }
    getInt(key) {
        return this.get(key, (s) => s.get_int(key));
    }
    getBool(key) {
        return this.get(key, (s) => s.get_boolean(key));
    }
}

var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

function createCommonjsModule(fn, basedir, module) {
	return module = {
		path: basedir,
		exports: {},
		require: function (path, base) {
			return commonjsRequire(path, (base === undefined || base === null) ? module.path : base);
		}
	}, fn(module, module.exports), module.exports;
}

function commonjsRequire () {
	throw new Error('Dynamic requires are not currently supported by @rollup/plugin-commonjs');
}

var stringFormat = createCommonjsModule(function (module) {
void function(global) {

  //  ValueError :: String -> Error
  function ValueError(message) {
    var err = new Error(message);
    err.name = 'ValueError';
    return err;
  }

  //  create :: Object -> String,*... -> String
  function create(transformers) {
    return function(template) {
      var args = Array.prototype.slice.call(arguments, 1);
      var idx = 0;
      var state = 'UNDEFINED';

      return template.replace(
        /([{}])\1|[{](.*?)(?:!(.+?))?[}]/g,
        function(match, literal, _key, xf) {
          if (literal != null) {
            return literal;
          }
          var key = _key;
          if (key.length > 0) {
            if (state === 'IMPLICIT') {
              throw ValueError('cannot switch from ' +
                               'implicit to explicit numbering');
            }
            state = 'EXPLICIT';
          } else {
            if (state === 'EXPLICIT') {
              throw ValueError('cannot switch from ' +
                               'explicit to implicit numbering');
            }
            state = 'IMPLICIT';
            key = String(idx);
            idx += 1;
          }

          //  1.  Split the key into a lookup path.
          //  2.  If the first path component is not an index, prepend '0'.
          //  3.  Reduce the lookup path to a single result. If the lookup
          //      succeeds the result is a singleton array containing the
          //      value at the lookup path; otherwise the result is [].
          //  4.  Unwrap the result by reducing with '' as the default value.
          var path = key.split('.');
          var value = (/^\d+$/.test(path[0]) ? path : ['0'].concat(path))
            .reduce(function(maybe, key) {
              return maybe.reduce(function(_, x) {
                return x != null && key in Object(x) ?
                  [typeof x[key] === 'function' ? x[key]() : x[key]] :
                  [];
              }, []);
            }, [args])
            .reduce(function(_, x) { return x; }, '');

          if (xf == null) {
            return value;
          } else if (Object.prototype.hasOwnProperty.call(transformers, xf)) {
            return transformers[xf](value);
          } else {
            throw ValueError('no transformer named "' + xf + '"');
          }
        }
      );
    };
  }

  //  format :: String,*... -> String
  var format = create({});

  //  format.create :: Object -> String,*... -> String
  format.create = create;

  //  format.extend :: Object,Object -> ()
  format.extend = function(prototype, transformers) {
    var $format = create(transformers);
    prototype.format = function() {
      var args = Array.prototype.slice.call(arguments);
      args.unshift(this);
      return $format.apply(global, args);
    };
  };

  /* istanbul ignore else */
  {
    module.exports = format;
  }

}.call(commonjsGlobal, commonjsGlobal);
});

let gettextFunc = null;
function initGettext(f) {
    gettextFunc = f;
}
function gettext(s) {
    if (gettextFunc) {
        return gettextFunc(s);
    }
    return s;
}
const _ = gettext;

function toObject(parameters) {
    return parameters.reduce((obj, [key, value]) => {
        obj[key] = value;
        return obj;
    }, {});
}

const _$1 = (s) => s;
function parameters({ width, height }) {
    const now = new Date();
    const hostname = GLib.get_host_name();
    const padZero = (s, n) => {
        if (String(s).length < n) {
            return padZero('0' + s, n);
        }
        else {
            return s;
        }
    };
    const pad = (s) => padZero(s, 2);
    return [
        ['N', _$1('Screenshot'), _$1('Screenshot (literal)')],
        ['Y', now.getFullYear(), _$1('Year')],
        ['m', pad(now.getMonth() + 1), _$1('Month')],
        ['d', pad(now.getDate()), _$1('Day')],
        ['H', pad(now.getHours()), _$1('Hour')],
        ['M', pad(now.getMinutes()), _$1('Minute')],
        ['S', pad(now.getSeconds()), _$1('Second')],
        ['w', width, _$1('Width')],
        ['h', height, _$1('Height')],
        ['hn', hostname, _$1('Hostname')],
    ];
}
function get(template, vars, n) {
    const basename = stringFormat(template, toObject(parameters(vars)));
    let sequence = '';
    if (n && n > 0) {
        sequence = '_' + String(n);
    }
    return basename + sequence + '.png';
}
function getTemp() {
    const tempDir = GLib.get_tmp_dir();
    const rnd = (0 | (Math.random() * (1 << 30))).toString(36);
    return `${tempDir}/gnome-shell-screenshot-${rnd}.png`;
}
function fileExists(path) {
    return GLib.file_test(path, GLib.FileTest.EXISTS);
}

// width and height of thumbnail
const size = 64;
const getIcon = (path) => {
    const extensionPath = getExtension().dir.get_path();
    if (!extensionPath) {
        throw new Error('extension path is null');
    }
    const emptyImagePath = `${extensionPath}/empty64.png`;
    // creates an scaled with aspect ratio where the larger side is 64px
    const source = GdkPixbuf.Pixbuf.new_from_file_at_size(path, size, size);
    // load transparent 64x64 image
    const dst = GdkPixbuf.Pixbuf.new_from_file_at_size(emptyImagePath, size, size);
    const { width, height } = source;
    const offsetX = (size - width) / 2;
    const offsetY = (size - height) / 2;
    // put smaller image on top of bigger image
    source.composite(dst, offsetX, offsetY, width, height, offsetX, offsetY, 1, 1, // scaleX, scaleY
    GdkPixbuf.InterpType.HYPER, 255);
    // return as file icon
    const scaledPath = getTemp();
    dst.savev(scaledPath, 'png', [], []);
    const scaledFile = Gio.File.new_for_path(scaledPath);
    return new Gio.FileIcon({ file: scaledFile });
};

var eventemitter3 = createCommonjsModule(function (module) {

var has = Object.prototype.hasOwnProperty
  , prefix = '~';

/**
 * Constructor to create a storage for our `EE` objects.
 * An `Events` instance is a plain object whose properties are event names.
 *
 * @constructor
 * @private
 */
function Events() {}

//
// We try to not inherit from `Object.prototype`. In some engines creating an
// instance in this way is faster than calling `Object.create(null)` directly.
// If `Object.create(null)` is not supported we prefix the event names with a
// character to make sure that the built-in object properties are not
// overridden or used as an attack vector.
//
if (Object.create) {
  Events.prototype = Object.create(null);

  //
  // This hack is needed because the `__proto__` property is still inherited in
  // some old browsers like Android 4, iPhone 5.1, Opera 11 and Safari 5.
  //
  if (!new Events().__proto__) prefix = false;
}

/**
 * Representation of a single event listener.
 *
 * @param {Function} fn The listener function.
 * @param {*} context The context to invoke the listener with.
 * @param {Boolean} [once=false] Specify if the listener is a one-time listener.
 * @constructor
 * @private
 */
function EE(fn, context, once) {
  this.fn = fn;
  this.context = context;
  this.once = once || false;
}

/**
 * Add a listener for a given event.
 *
 * @param {EventEmitter} emitter Reference to the `EventEmitter` instance.
 * @param {(String|Symbol)} event The event name.
 * @param {Function} fn The listener function.
 * @param {*} context The context to invoke the listener with.
 * @param {Boolean} once Specify if the listener is a one-time listener.
 * @returns {EventEmitter}
 * @private
 */
function addListener(emitter, event, fn, context, once) {
  if (typeof fn !== 'function') {
    throw new TypeError('The listener must be a function');
  }

  var listener = new EE(fn, context || emitter, once)
    , evt = prefix ? prefix + event : event;

  if (!emitter._events[evt]) emitter._events[evt] = listener, emitter._eventsCount++;
  else if (!emitter._events[evt].fn) emitter._events[evt].push(listener);
  else emitter._events[evt] = [emitter._events[evt], listener];

  return emitter;
}

/**
 * Clear event by name.
 *
 * @param {EventEmitter} emitter Reference to the `EventEmitter` instance.
 * @param {(String|Symbol)} evt The Event name.
 * @private
 */
function clearEvent(emitter, evt) {
  if (--emitter._eventsCount === 0) emitter._events = new Events();
  else delete emitter._events[evt];
}

/**
 * Minimal `EventEmitter` interface that is molded against the Node.js
 * `EventEmitter` interface.
 *
 * @constructor
 * @public
 */
function EventEmitter() {
  this._events = new Events();
  this._eventsCount = 0;
}

/**
 * Return an array listing the events for which the emitter has registered
 * listeners.
 *
 * @returns {Array}
 * @public
 */
EventEmitter.prototype.eventNames = function eventNames() {
  var names = []
    , events
    , name;

  if (this._eventsCount === 0) return names;

  for (name in (events = this._events)) {
    if (has.call(events, name)) names.push(prefix ? name.slice(1) : name);
  }

  if (Object.getOwnPropertySymbols) {
    return names.concat(Object.getOwnPropertySymbols(events));
  }

  return names;
};

/**
 * Return the listeners registered for a given event.
 *
 * @param {(String|Symbol)} event The event name.
 * @returns {Array} The registered listeners.
 * @public
 */
EventEmitter.prototype.listeners = function listeners(event) {
  var evt = prefix ? prefix + event : event
    , handlers = this._events[evt];

  if (!handlers) return [];
  if (handlers.fn) return [handlers.fn];

  for (var i = 0, l = handlers.length, ee = new Array(l); i < l; i++) {
    ee[i] = handlers[i].fn;
  }

  return ee;
};

/**
 * Return the number of listeners listening to a given event.
 *
 * @param {(String|Symbol)} event The event name.
 * @returns {Number} The number of listeners.
 * @public
 */
EventEmitter.prototype.listenerCount = function listenerCount(event) {
  var evt = prefix ? prefix + event : event
    , listeners = this._events[evt];

  if (!listeners) return 0;
  if (listeners.fn) return 1;
  return listeners.length;
};

/**
 * Calls each of the listeners registered for a given event.
 *
 * @param {(String|Symbol)} event The event name.
 * @returns {Boolean} `true` if the event had listeners, else `false`.
 * @public
 */
EventEmitter.prototype.emit = function emit(event, a1, a2, a3, a4, a5) {
  var evt = prefix ? prefix + event : event;

  if (!this._events[evt]) return false;

  var listeners = this._events[evt]
    , len = arguments.length
    , args
    , i;

  if (listeners.fn) {
    if (listeners.once) this.removeListener(event, listeners.fn, undefined, true);

    switch (len) {
      case 1: return listeners.fn.call(listeners.context), true;
      case 2: return listeners.fn.call(listeners.context, a1), true;
      case 3: return listeners.fn.call(listeners.context, a1, a2), true;
      case 4: return listeners.fn.call(listeners.context, a1, a2, a3), true;
      case 5: return listeners.fn.call(listeners.context, a1, a2, a3, a4), true;
      case 6: return listeners.fn.call(listeners.context, a1, a2, a3, a4, a5), true;
    }

    for (i = 1, args = new Array(len -1); i < len; i++) {
      args[i - 1] = arguments[i];
    }

    listeners.fn.apply(listeners.context, args);
  } else {
    var length = listeners.length
      , j;

    for (i = 0; i < length; i++) {
      if (listeners[i].once) this.removeListener(event, listeners[i].fn, undefined, true);

      switch (len) {
        case 1: listeners[i].fn.call(listeners[i].context); break;
        case 2: listeners[i].fn.call(listeners[i].context, a1); break;
        case 3: listeners[i].fn.call(listeners[i].context, a1, a2); break;
        case 4: listeners[i].fn.call(listeners[i].context, a1, a2, a3); break;
        default:
          if (!args) for (j = 1, args = new Array(len -1); j < len; j++) {
            args[j - 1] = arguments[j];
          }

          listeners[i].fn.apply(listeners[i].context, args);
      }
    }
  }

  return true;
};

/**
 * Add a listener for a given event.
 *
 * @param {(String|Symbol)} event The event name.
 * @param {Function} fn The listener function.
 * @param {*} [context=this] The context to invoke the listener with.
 * @returns {EventEmitter} `this`.
 * @public
 */
EventEmitter.prototype.on = function on(event, fn, context) {
  return addListener(this, event, fn, context, false);
};

/**
 * Add a one-time listener for a given event.
 *
 * @param {(String|Symbol)} event The event name.
 * @param {Function} fn The listener function.
 * @param {*} [context=this] The context to invoke the listener with.
 * @returns {EventEmitter} `this`.
 * @public
 */
EventEmitter.prototype.once = function once(event, fn, context) {
  return addListener(this, event, fn, context, true);
};

/**
 * Remove the listeners of a given event.
 *
 * @param {(String|Symbol)} event The event name.
 * @param {Function} fn Only remove the listeners that match this function.
 * @param {*} context Only remove the listeners that have this context.
 * @param {Boolean} once Only remove one-time listeners.
 * @returns {EventEmitter} `this`.
 * @public
 */
EventEmitter.prototype.removeListener = function removeListener(event, fn, context, once) {
  var evt = prefix ? prefix + event : event;

  if (!this._events[evt]) return this;
  if (!fn) {
    clearEvent(this, evt);
    return this;
  }

  var listeners = this._events[evt];

  if (listeners.fn) {
    if (
      listeners.fn === fn &&
      (!once || listeners.once) &&
      (!context || listeners.context === context)
    ) {
      clearEvent(this, evt);
    }
  } else {
    for (var i = 0, events = [], length = listeners.length; i < length; i++) {
      if (
        listeners[i].fn !== fn ||
        (once && !listeners[i].once) ||
        (context && listeners[i].context !== context)
      ) {
        events.push(listeners[i]);
      }
    }

    //
    // Reset the array, or remove it completely if we have no more listeners.
    //
    if (events.length) this._events[evt] = events.length === 1 ? events[0] : events;
    else clearEvent(this, evt);
  }

  return this;
};

/**
 * Remove all listeners, or those of the specified event.
 *
 * @param {(String|Symbol)} [event] The event name.
 * @returns {EventEmitter} `this`.
 * @public
 */
EventEmitter.prototype.removeAllListeners = function removeAllListeners(event) {
  var evt;

  if (event) {
    evt = prefix ? prefix + event : event;
    if (this._events[evt]) clearEvent(this, evt);
  } else {
    this._events = new Events();
    this._eventsCount = 0;
  }

  return this;
};

//
// Alias methods names because people roll like that.
//
EventEmitter.prototype.off = EventEmitter.prototype.removeListener;
EventEmitter.prototype.addListener = EventEmitter.prototype.on;

//
// Expose the prefix.
//
EventEmitter.prefixed = prefix;

//
// Allow `EventEmitter` to be imported as module namespace.
//
EventEmitter.EventEmitter = EventEmitter;

//
// Expose the module.
//
{
  module.exports = EventEmitter;
}
});

const PATH_SEPARATOR = '/';
function join(...segments) {
    return [''].concat(segments.filter((e) => e !== '')).join(PATH_SEPARATOR);
}
function expandUserDir(segment) {
    switch (segment.toUpperCase()) {
        case '$PICTURES':
            const v = GLib.get_user_special_dir(GLib.UserDirectory.DIRECTORY_PICTURES);
            if (v === null) {
                throw new Error('could not expand special dir');
            }
            return v;
        default:
            return segment;
    }
}
function expand(path) {
    return join(...path.split(PATH_SEPARATOR).map(expandUserDir));
}

function setImage(pixbuf) {
    const [ok, buffer] = pixbuf.save_to_bufferv('png', [], []);
    if (!ok) {
        throw new Error('error in save_to_bufferv');
    }
    const bytes = GLib.Bytes.new(buffer);
    St.Clipboard.get_default().set_content(St.ClipboardType.CLIPBOARD, 'image/png', bytes);
}
function setText(text) {
    St.Clipboard.get_default().set_text(St.ClipboardType.CLIPBOARD, text);
}

const clientId = 'c5c1369fb46f29e';
const baseUrl = 'https://api.imgur.com/3/';
function _promisify(cls, function_name, finish_function_name) {
    Gio._promisify(cls, function_name, finish_function_name);
}
const LocalFilePrototype = Gio.File.new_for_path('/').constructor.prototype;
_promisify(LocalFilePrototype, 'load_contents_async', 'load_contents_finish');
_promisify(Soup.Session.prototype, 'send_and_read_async');
function authMessage(message) {
    message.request_headers.append('Authorization', 'Client-ID ' + clientId);
}
const URL_POST_IMAGE = baseUrl + 'image';
async function getJSONResonse(message) {
    const res = await httpSession.send_and_read_async(message, GLib.PRIORITY_DEFAULT, null);
    const data = res.get_data();
    if (!data) {
        throw new Error('no data');
    }
    return JSON.parse(new TextDecoder().decode(data));
}
function getMultipartFromBytes(bytes) {
    const multipart = new Soup.Multipart(Soup.FORM_MIME_TYPE_MULTIPART);
    multipart.append_form_file('image', 'image.png', 'image/png', bytes);
    return multipart;
}
const httpSession = new Soup.Session();
class Upload extends eventemitter3 {
    file;
    response;
    constructor(file) {
        super();
        this.file = file;
    }
    async upload(message, totalBytes) {
        authMessage(message);
        let uploadedBytes = 0;
        const signalProgress = message.connect('wrote-body-data', (message, chunkSize) => {
            uploadedBytes += chunkSize;
            this.emit('progress', uploadedBytes, totalBytes);
        });
        try {
            return await getJSONResonse(message);
        }
        finally {
            message.disconnect(signalProgress);
        }
    }
    async start() {
        try {
            const [content] = await this.file.load_contents_async(null);
            const glibBytes = new GLib.Bytes(content);
            this.response = await this.upload(Soup.Message.new_from_multipart(URL_POST_IMAGE, getMultipartFromBytes(glibBytes)), glibBytes.get_size());
            this.emit('done');
        }
        catch (e) {
            console.error(e);
            this.emit('error', e);
        }
    }
    static async delete(deleteHash) {
        const uri = GLib.Uri.parse(`${baseUrl}/image/${deleteHash}`, GLib.UriFlags.NONE);
        const message = new Soup.Message({ method: 'DELETE', uri });
        authMessage(message);
        const { success } = await getJSONResonse(message);
        if (!success) {
            throw new Error('delete failed');
        }
    }
    async deleteRemote() {
        if (this.response) {
            await Upload.delete(this.response.data.deletehash);
        }
        this.emit('deleted');
    }
}

function getEnvArray(override) {
    return [
        ...GLib.listenv()
            .filter((key) => !override.some((e) => e.startsWith(`${key}=`)))
            .map((key) => `${key}=${GLib.getenv(key)}`),
        ...override,
    ];
}
function spawnAsync(argv, env = null) {
    return new Promise((resolve, reject) => {
        const [success, pid] = GLib.spawn_async(null /* pwd */, argv, env === null ? null : getEnvArray(env), GLib.SpawnFlags.SEARCH_PATH | GLib.SpawnFlags.DO_NOT_REAP_CHILD, null /* child_setup */);
        if (!success) {
            throw new Error('success=false');
        }
        if (pid === null) {
            throw new Error('pid === null');
        }
        GLib.child_watch_add(GLib.PRIORITY_DEFAULT, pid, (pid, exitCode) => {
            if (exitCode === 0) {
                resolve();
            }
            else {
                console.error(new Error(`cmd: ${argv.join(' ')} exitCode=${exitCode}`));
                return reject(new Error(`exitCode=${exitCode}`));
            }
        });
    });
}

function openURI(uri) {
    const context = Shell.Global.get().create_app_launch_context(/* timestamp */ 0, /* workspace (current) */ -1);
    Gio.AppInfo.launch_default_for_uri(uri, context);
}

class ErrorInvalidSettings extends Error {
    constructor(message) {
        super(message);
    }
}
class ErrorAutosaveDirNotExists extends ErrorInvalidSettings {
    constructor(dir) {
        super(_('Auto-Save location does not exist: ' + dir));
    }
}
class Rescale {
    scale;
    constructor(scale) {
        this.scale = scale;
        if (Number.isNaN(scale) || scale <= 0) {
            throw new Error(`invalid argument ${scale}`);
        }
    }
    apply(pixbuf) {
        if (this.scale === 1) {
            return pixbuf;
        }
        const result = pixbuf.scale_simple(pixbuf.get_width() * this.scale, pixbuf.get_height() * this.scale, GdkPixbuf.InterpType.BILINEAR);
        if (!result) {
            throw new Error('null result');
        }
        return pixbuf;
    }
}
class Screenshot extends eventemitter3 {
    config = getExtension().getConfig();
    pixbuf;
    srcFile;
    dstFile;
    imgurUpload;
    constructor(filePath, effects = []) {
        super();
        if (!filePath) {
            throw new Error(`need argument ${filePath}`);
        }
        this.pixbuf = GdkPixbuf.Pixbuf.new_from_file(filePath);
        this.pixbuf = effects.reduce((pixbuf, e) => e.apply(pixbuf), this.pixbuf);
        this.pixbuf.savev(filePath, 'png', [], []);
        this.srcFile = Gio.File.new_for_path(filePath);
        this.dstFile = null;
    }
    getSourceFilePath() {
        const path = this.srcFile.get_path();
        if (!path) {
            throw new Error('could not get path');
        }
        return path;
    }
    getFilename(n = 0) {
        const filenameTemplate = this.config.getString(KeyFilenameTemplate);
        const { width, height } = this.pixbuf;
        return get(filenameTemplate, { width, height }, n);
    }
    getNextFile() {
        const dir = expand(this.config.getString(KeySaveLocation));
        const dirExists = Gio.File.new_for_path(dir).query_exists(/* cancellable */ null);
        if (!dirExists) {
            throw new ErrorAutosaveDirNotExists(dir);
        }
        for (let n = 0;; n++) {
            const newFilename = this.getFilename(n);
            const newPath = join(dir, newFilename);
            const file = Gio.File.new_for_path(newPath);
            const exists = file.query_exists(/* cancellable */ null);
            if (!exists) {
                return file;
            }
        }
    }
    autosave() {
        const dstFile = this.getNextFile();
        this.srcFile.copy(dstFile, Gio.FileCopyFlags.NONE, null, null);
        this.dstFile = dstFile;
    }
    getFinalFile() {
        return this.dstFile || this.srcFile;
    }
    getFinalFileURI() {
        const uri = this.getFinalFile().get_uri();
        if (!uri) {
            throw new Error('error getting file uri');
        }
        return uri;
    }
    launchOpen() {
        openURI(this.getFinalFileURI());
    }
    launchSave() {
        const args = [this.srcFile.get_path(), expand('$PICTURES'), this.getFilename()].map((v) => {
            if (typeof v === 'string' && v) {
                return encodeURIComponent(v);
            }
            throw new Error(`unexpected path component in ${args}`);
        });
        const extensionPath = getExtension().dir.get_path();
        if (!extensionPath) {
            throw new Error('could not get extension path');
        }
        spawnAsync(['gjs', '--module', extensionPath + '/saveDlg.js', ...args], [`LOCALE_DIR=${join(extensionPath, 'locale')}`]);
    }
    copyClipboard(action) {
        if (action === ClipboardActions.NONE) {
            return;
        }
        else if (action === ClipboardActions.SET_IMAGE_DATA) {
            return setImage(this.pixbuf);
        }
        else if (action === ClipboardActions.SET_LOCAL_PATH) {
            const path = this.getFinalFile().get_path();
            if (!path) {
                throw new Error('error getting file path');
            }
            return setText(path);
        }
        throw new Error(`unknown action ${action}`);
    }
    imgurStartUpload() {
        this.imgurUpload = new Upload(this.srcFile);
        this.imgurUpload.on('error', (obj, err) => {
            console.error(err);
            notifyError(String(err));
        });
        if (getExtension().getSettings().get_boolean(KeyImgurEnableNotification)) {
            notifyImgurUpload(this);
        }
        this.emit('imgur-upload', this.imgurUpload);
        this.imgurUpload.on('done', () => {
            if (getExtension().getSettings().get_boolean(KeyImgurAutoCopyLink)) {
                this.imgurCopyURL();
            }
            if (getExtension().getSettings().get_boolean(KeyImgurAutoOpenLink)) {
                this.imgurOpenURL();
            }
        });
        void this.imgurUpload.start();
    }
    getImgurUpload() {
        if (this.imgurUpload) {
            return this.imgurUpload;
        }
        throw new Error('no imgur upload');
    }
    getImgurUploadURI() {
        const uri = this.getImgurUpload().response?.data.link;
        if (uri) {
            return uri;
        }
        throw new Error('no imgur link');
    }
    imgurOpenURL() {
        openURI(this.getImgurUploadURI());
    }
    imgurCopyURL() {
        setText(this.getImgurUploadURI());
    }
    imgurDelete() {
        this.getImgurUpload().on('deleted', () => {
            this.imgurUpload = undefined;
        });
        this.getImgurUpload().deleteRemote();
    }
}

// Taken from https://github.com/material-shell/material-shell/blob/main/src/utils/gjs.ts
/// Decorator function to call `GObject.registerClass` with the given class.
/// Use like
/// ```
/// @registerGObjectClass
/// export class MyThing extends GObject.Object { ... }
/// ```
function registerGObjectClass(target) {
    // Note that we use 'hasOwnProperty' because otherwise we would get inherited meta infos.
    // This would be bad because we would inherit the GObjectName too, which is supposed to be unique.
    if (Object.prototype.hasOwnProperty.call(target, 'metaInfo')) {
        // eslint-disable-next-line
        // @ts-ignore
        // eslint-disable-next-line
        return GObject.registerClass(target.metaInfo, target);
    }
    else {
        // eslint-disable-next-line
        // @ts-ignore
        return GObject.registerClass(target);
    }
}

var NotificationNewScreenshot_1;
const NotificationIcon = 'camera-photo-symbolic';
const NotificationSourceName = 'Screenshot Tool';
const ICON_SIZE = 64;
var ErrorActions;
(function (ErrorActions) {
    ErrorActions[ErrorActions["OPEN_SETTINGS"] = 0] = "OPEN_SETTINGS";
    ErrorActions[ErrorActions["OPEN_HELP"] = 1] = "OPEN_HELP";
})(ErrorActions || (ErrorActions = {}));
function getURI(error) {
    if (error instanceof BackendError) {
        return [
            'https://github.com/OttoAllmendinger/gnome-shell-screenshot/',
            `blob/master/README.md#error-backend-${error.backendName}`,
        ].join('');
    }
}
function getSource() {
    const source = new Source(NotificationSourceName, NotificationIcon);
    messageTray.add(source);
    return source;
}
let NotificationNewScreenshot = NotificationNewScreenshot_1 = class NotificationNewScreenshot extends Notification {
    screenshot;
    static _title() {
        return _('New Screenshot');
    }
    static _banner(obj) {
        const { pixbuf } = obj;
        const { width, height } = pixbuf;
        return _('Size:') + ' ' + width + 'x' + height + '.';
    }
    constructor(source, screenshot) {
        super(source, NotificationNewScreenshot_1._title(), NotificationNewScreenshot_1._banner(screenshot), {
            gicon: getIcon(screenshot.getSourceFilePath()),
        });
        this.screenshot = screenshot;
        this.connect('activated', this._onActivated.bind(this));
        // makes banner expand on hover
        this.setForFeedback(true);
    }
    createBanner() {
        const b = super.createBanner();
        // FIXME cast
        b._iconBin.child.icon_size = ICON_SIZE;
        b.addAction(_('Copy'), this._onCopy.bind(this));
        b.addAction(_('Save'), this._onSave.bind(this));
        const extension = getExtension();
        if (extension.getSettings().get_boolean(KeyEnableUploadImgur)) {
            if (extension.getSettings().get_boolean(KeyImgurAutoUpload)) {
                b.addAction(_('Uploading To Imgur...'), () => {
                    /* noop */
                });
            }
            else {
                b.addAction(_('Upload To Imgur'), this._onUpload.bind(this));
            }
        }
        return b;
    }
    _onActivated() {
        this.screenshot.launchOpen();
    }
    _onCopy() {
        this.screenshot.copyClipboard(getExtension().getConfig().getString(KeyCopyButtonAction));
    }
    _onSave() {
        this.screenshot.launchSave();
    }
    _onUpload() {
        this.screenshot.imgurStartUpload();
    }
};
NotificationNewScreenshot = NotificationNewScreenshot_1 = __decorate([
    registerGObjectClass
], NotificationNewScreenshot);
let ErrorNotification = class ErrorNotification extends Notification {
    buttons;
    error;
    constructor(source, error, buttons) {
        super(source, _('Error'), String(error), {
            secondaryGIcon: new Gio.ThemedIcon({ name: 'dialog-error' }),
        });
        this.buttons = buttons;
        this.error = error;
    }
    createBanner() {
        const banner = super.createBanner();
        for (const b of this.buttons) {
            switch (b) {
                case ErrorActions.OPEN_SETTINGS:
                    banner.addAction(_('Settings'), () => {
                        getExtension().openPreferences();
                    });
                    break;
                case ErrorActions.OPEN_HELP:
                    const uri = getURI(this.error);
                    if (!uri) {
                        break;
                    }
                    banner.addAction(_('Help'), () => openURI(uri));
                    break;
                default:
                    console.error(new Error('unknown button ' + b));
            }
        }
        return banner;
    }
};
ErrorNotification = __decorate([
    registerGObjectClass
], ErrorNotification);
let ImgurNotification = class ImgurNotification extends Notification {
    screenshot;
    upload;
    copyButton;
    constructor(source, screenshot) {
        super(source, _('Imgur Upload'));
        this.screenshot = screenshot;
        this.setForFeedback(true);
        this.setResident(true);
        this.connect('activated', this._onActivated.bind(this));
        if (!screenshot.imgurUpload) {
            throw new Error('imgur upload not present');
        }
        this.upload = screenshot.imgurUpload;
        this.upload.on('progress', (bytes, total) => {
            this.update(_('Imgur Upload'), '' + Math.floor(100 * (bytes / total)) + '%');
        });
        this.upload.on('error', (obj, msg) => {
            this.update(_('Imgur Upload Failed'), msg);
        });
        this.upload.on('done', () => {
            if (this.upload.response) {
                this.update(_('Imgur Upload Successful'), this.upload.response.data.link);
                this._updateCopyButton();
            }
        });
    }
    _updateCopyButton() {
        if (!this.copyButton) {
            return;
        }
        this.copyButton.visible = this.screenshot.imgurUpload?.response !== undefined;
    }
    createBanner() {
        const b = super.createBanner();
        this.copyButton = b.addAction(_('Copy Link'), this._onCopy.bind(this));
        this._updateCopyButton();
        return b;
    }
    _onActivated() {
        if (this.screenshot.imgurUpload?.response) {
            this.screenshot.imgurOpenURL();
        }
        else {
            this.upload.on('done', () => {
                this.screenshot.imgurOpenURL();
            });
        }
    }
    _onCopy() {
        this.screenshot.imgurCopyURL();
    }
};
ImgurNotification = __decorate([
    registerGObjectClass
], ImgurNotification);
function notifyScreenshot(screenshot) {
    const source = getSource();
    const notification = new NotificationNewScreenshot(source, screenshot);
    source.showNotification(notification);
}
function notifyError(error) {
    const buttons = [];
    if (error instanceof Error) {
        if (error instanceof ErrorInvalidSettings) {
            buttons.push(ErrorActions.OPEN_SETTINGS);
        }
        if (error instanceof BackendError) {
            buttons.push(ErrorActions.OPEN_HELP);
        }
    }
    const source = getSource();
    const notification = new ErrorNotification(source, error, buttons);
    source.showNotification(notification);
}
function notifyImgurUpload(screenshot) {
    const source = getSource();
    const notification = new ImgurNotification(source, screenshot);
    source.showNotification(notification);
}
function wrapNotifyError(f) {
    return async function (...args) {
        try {
            return await f(...args);
        }
        catch (e) {
            notifyError(e);
            throw e;
        }
    };
}

function parameters$1(v) {
    return [['f', GLib.shell_quote(v.filename), _('Filename')]];
}
function getCommand(runCommand, file) {
    const filename = file.get_path();
    if (!filename) {
        throw new Error('path: null');
    }
    return stringFormat(runCommand, toObject(parameters$1({ filename })));
}
async function exec(runCommand, file) {
    const command = getCommand(runCommand, file);
    const [ok, argv] = GLib.shell_parse_argv(command);
    if (!ok || !argv) {
        throw new Error('argv parse error command=' + command);
    }
    await spawnAsync(argv);
    return command;
}

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
    signal;
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
class BackendGnomeScreenshot {
    supportsParam(paramName) {
        return paramName === 'delay-seconds';
    }
    supportsAction(action) {
        switch (action) {
            case 'select-area':
            case 'select-window':
            case 'select-desktop':
                return true;
            default:
                return false;
        }
    }
    async exec(action, params) {
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
        }
        finally {
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

const connection = Gio.DBus.session;
const serviceName = 'org.freedesktop.portal.Desktop';
const interfaceName = 'org.freedesktop.portal.Request';
const objectPath = '/org/freedesktop/portal/desktop';
async function getServiceProxy(extensionPath) {
    const path = extensionPath + '/org.freedesktop.portal.Screenshot.xml';
    const [ok, data] = GLib.file_get_contents(path);
    if (!ok) {
        throw new Error('could not read interface file');
    }
    const ifaceXml = new TextDecoder().decode(data);
    const Proxy = Gio.DBusProxy.makeProxyWrapper(ifaceXml);
    return new Promise((resolve, reject) => {
        new Proxy(connection, serviceName, objectPath, (init, err) => {
            if (err) {
                reject(err);
            }
            else {
                resolve(init);
            }
        });
    });
}
async function getResponseParams(requestPath) {
    return new Promise((resolve) => {
        connection.signal_subscribe(serviceName, interfaceName, 'Response', requestPath, null, Gio.DBusSignalFlags.NONE, (connection, sender, path, iface, signal, params) => {
            resolve(params);
        });
    });
}
async function portalScreenshot(service) {
    const [requestPath] = service.ScreenshotSync('', {
        interactive: GLib.Variant.new_boolean(true),
    });
    const params = await getResponseParams(requestPath);
    const [responseCode, dict] = params.deepUnpack();
    switch (responseCode) {
        case 0:
            return dict.uri.deepUnpack();
        case 1:
            throw new Error('cancelled by user');
        default:
            throw new Error(`unexpected responseCode ${responseCode}`);
    }
}

function stripPrefix(prefix, s) {
    if (s.startsWith(prefix)) {
        return s.slice(prefix.length);
    }
    return s;
}
class BackendDeskopPortal {
    supportsAction(action) {
        return action === 'open-portal';
    }
    supportsParam(_) {
        return false;
    }
    async exec(action, _) {
        if (action !== 'open-portal') {
            throw new ErrorNotImplemented(action);
        }
        const service = await getExtension().servicePromise;
        if (!service) {
            throw new Error('no service');
        }
        return stripPrefix('file://', await portalScreenshot(service));
    }
}

// based around Gnome-Shell `js/ui/screenshot.js` (v45.1)
Gio._promisify(Shell.Screenshot, 'composite_to_stream');
/**
 * Captures a screenshot from a texture, given a region, scale and optional
 * cursor data.
 *
 * @param {Cogl.Texture} texture - The texture to take the screenshot from.
 * @param {number[4]} [geometry] - The region to use: x, y, width and height.
 * @param {number} scale - The texture scale.
 * @param {object} [cursor] - Cursor data to include in the screenshot.
 * @param {Cogl.Texture} cursor.texture - The cursor texture.
 * @param {number} cursor.x - The cursor x coordinate.
 * @param {number} cursor.y - The cursor y coordinate.
 * @param {number} cursor.scale - The cursor texture scale.
 */
async function captureScreenshot(texture, geometry, scale, cursor) {
    const stream = Gio.MemoryOutputStream.new_resizable();
    const [x, y, w, h] = geometry ?? [0, 0, -1, -1];
    if (cursor === null) {
        cursor = { texture: null, x: 0, y: 0, scale: 1 };
    }
    await Shell.Screenshot.composite_to_stream(texture, x, y, w, h, scale, cursor.texture, cursor.x, cursor.y, cursor.scale, stream);
    stream.close(null);
    return stream.steal_as_bytes();
}
let CustomScreenshotUI = class CustomScreenshotUI extends ScreenshotUI {
    bytesPromise;
    bytesResolve;
    bytesReject;
    bytesRejectClose;
    constructor() {
        super();
        this.bytesPromise = new Promise((resolve, reject) => {
            this.bytesResolve = resolve;
            this.bytesReject = reject;
            this.bytesRejectClose = reject;
        });
    }
    async getScreenshotBytes() {
        if (this._selectionButton.checked || this._screenButton.checked) {
            const content = this._stageScreenshot.get_content();
            if (!content) {
                throw new Error('No content');
            }
            const texture = content.get_texture();
            const geometry = this._getSelectedGeometry(true);
            let cursorTexture = this._cursor.content?.get_texture();
            if (!this._cursor.visible) {
                cursorTexture = null;
            }
            return captureScreenshot(texture, geometry, this._scale, {
                texture: cursorTexture ?? null,
                x: this._cursor.x * this._scale,
                y: this._cursor.y * this._scale,
                scale: this._cursorScale,
            });
        }
        else if (this._windowButton.checked) {
            const window = this._windowSelectors.flatMap((selector) => selector.windows()).find((win) => win.checked);
            if (!window) {
                throw new Error('No window selected');
            }
            const content = window.windowContent;
            if (!content) {
                throw new Error('No window content');
            }
            const texture = content.get_texture();
            let cursorTexture = window.getCursorTexture()?.get_texture();
            if (!this._cursor.visible) {
                cursorTexture = null;
            }
            return captureScreenshot(texture, null, window.bufferScale, {
                texture: cursorTexture ?? null,
                x: window.cursorPoint.x * window.bufferScale,
                y: window.cursorPoint.y * window.bufferScale,
                scale: this._cursorScale,
            });
        }
        throw new Error('No screenshot type selected');
    }
    async _saveScreenshot() {
        this.bytesRejectClose = undefined;
        try {
            this.bytesResolve?.(await this.getScreenshotBytes());
        }
        catch (e) {
            this.bytesReject?.(e);
        }
    }
    close(instantly) {
        super.close(instantly);
        this.bytesRejectClose?.(new Error('Screenshot UI closed'));
    }
};
CustomScreenshotUI = __decorate([
    registerGObjectClass
], CustomScreenshotUI);
class BackendShellUI {
    supportsParam(paramName) {
        return false;
    }
    supportsAction(action) {
        return action === 'open-portal';
    }
    async exec(action, params) {
        if (action !== 'open-portal') {
            throw new Error();
        }
        const ui = new CustomScreenshotUI();
        await ui.open();
        const bytes = await ui.bytesPromise;
        const tempfile = getTemp();
        const file = Gio.File.new_for_path(tempfile);
        const stream = file.create(Gio.FileCreateFlags.NONE, null);
        stream.write_bytes(bytes, null);
        return tempfile;
    }
}

class ErrorNotImplemented extends Error {
    constructor(action) {
        super(`action ${action} not implemented for this backend`);
    }
}
const actionNames = ['open-portal', 'select-area', 'select-window', 'select-desktop'];
function isActionName(v) {
    return actionNames.includes(v);
}
function getBackendName(settings) {
    return new Config(settings).getString(KeyBackend);
}
function getBackend(settings) {
    const name = getBackendName(settings);
    switch (name) {
        case Backends.GNOME_SCREENSHOT_CLI:
            return new BackendGnomeScreenshot();
        case Backends.DESKTOP_PORTAL:
            return new BackendDeskopPortal();
        case Backends.SHELL_UI:
            return new BackendShellUI();
        default:
            throw new Error(`unexpected backend ${name}`);
    }
}

class BackendError extends Error {
    backendName;
    cause;
    constructor(backendName, cause) {
        super(`backend ${backendName}: ${cause}`);
        this.backendName = backendName;
        this.cause = cause;
    }
}
async function onAction(action) {
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
            delaySeconds: settings.get_int(KeyCaptureDelay) / 1000,
        });
    }
    catch (e) {
        throw new BackendError(getBackendName(settings), e);
    }
    if (!fileExists(filePath)) {
        throw new Error(`file ${filePath} does not exist`);
    }
    const config = getExtension().getConfig();
    const effects = [new Rescale(config.getInt(KeyEffectRescale) / 100.0)];
    const screenshot = new Screenshot(filePath, effects);
    if (config.getBool(KeySaveScreenshot)) {
        screenshot.autosave();
    }
    screenshot.copyClipboard(config.getString(KeyClipboardAction));
    if (config.getBool(KeyEnableNotification)) {
        notifyScreenshot(screenshot);
    }
    if (indicator) {
        indicator.setScreenshot(screenshot);
    }
    const commandEnabled = config.getBool(KeyEnableRunCommand);
    if (commandEnabled) {
        const file = screenshot.getFinalFile();
        exec(config.getString(KeyRunCommand), file)
            .then((command) => console.log(`command ${command} complete`))
            .catch((e) => notifyError(e));
    }
    const imgurEnabled = config.getBool(KeyEnableUploadImgur);
    const imgurAutoUpload = config.getBool(KeyImgurAutoUpload);
    if (imgurEnabled && imgurAutoUpload) {
        screenshot.imgurStartUpload();
    }
}

const DefaultIcon = 'camera-photo-symbolic';
function getMenu(obj) {
    if (typeof obj === 'object' && obj && 'menu' in obj) {
        return obj.menu;
    }
    throw new Error('could not get menu');
}
function getLabel(obj) {
    if (typeof obj === 'object' && obj && 'label' in obj) {
        return obj.label;
    }
    throw new Error('could not get label');
}
class CaptureDelayMenu extends PopupMenuSection {
    slider;
    scaleMS;
    delayValueMS;
    sliderItem;
    delayInfoItem;
    createScale() {
        const scale = [0];
        for (let x = 1; x <= 10; x += 1) {
            scale.push(x * 1000);
        }
        return scale;
    }
    constructor(_control) {
        super();
        this.scaleMS = this.createScale();
        this.delayValueMS = getExtension().getSettings().get_int(KeyCaptureDelay);
        this.slider = new Slider(this.scaleToSlider(this.delayValueMS));
        this.slider.connect('notify::value', this.onDragEnd.bind(this));
        this.sliderItem = new PopupBaseMenuItem({ activate: false });
        this.sliderItem.add_child(this.slider);
        this.addMenuItem(this.sliderItem);
        this.delayInfoItem = new PopupMenuItem('', {
            activate: false,
            hover: false,
            can_focus: false,
        });
        this.addMenuItem(this.delayInfoItem);
        this.updateDelayInfo();
    }
    scaleToSlider(ms) {
        return this.scaleMS.findIndex((v) => v >= ms) / (this.scaleMS.length - 1);
    }
    sliderToScale(value) {
        return this.scaleMS[(value * (this.scaleMS.length - 1)) | 0];
    }
    onDragEnd(slider) {
        const newValue = this.sliderToScale(slider.value);
        if (newValue !== this.delayValueMS) {
            this.delayValueMS = newValue;
            getExtension().getSettings().set_int(KeyCaptureDelay, newValue);
            this.updateDelayInfo();
        }
    }
    updateDelayInfo() {
        const v = this.delayValueMS;
        let text;
        if (v === 0) {
            text = _('No Capture Delay');
        }
        else if (v < 1000) {
            text = `${v}ms ` + _('Capture Delay');
        }
        else {
            text = `${v / 1000}s ` + _('Capture Delay');
        }
        getLabel(this.delayInfoItem).text = text;
    }
    set visible(visible) {
        this.actor.visible = visible;
        this.box.visible = visible;
    }
}
class ScreenshotSection {
    _screenshot;
    image;
    clear;
    copy;
    save;
    imgurMenu;
    imgurUpload;
    imgurOpen;
    imgurCopyLink;
    imgurDelete;
    constructor(menu) {
        this.image = new PopupBaseMenuItem();
        this.image.style = 'padding: 0px;';
        this.image.x_align = Clutter.ActorAlign.CENTER;
        this.image.y_align = Clutter.ActorAlign.CENTER;
        this.clear = new PopupMenuItem(_('Clear'));
        this.copy = new PopupMenuItem(_('Copy'));
        this.save = new PopupMenuItem(_('Save As...'));
        this.image.connect('activate', wrapNotifyError(() => this.onImage()));
        this.clear.connect('activate', wrapNotifyError(() => this.onClear()));
        this.copy.connect('activate', wrapNotifyError(() => this.onCopy()));
        this.save.connect('activate', wrapNotifyError(() => this.onSave()));
        menu.addMenuItem(this.image);
        menu.addMenuItem(this.clear);
        menu.addMenuItem(this.copy);
        menu.addMenuItem(this.save);
        // IMGUR
        menu.addMenuItem(new PopupSeparatorMenuItem());
        this.imgurMenu = new PopupSubMenuMenuItem(_('Imgur'), false);
        this.imgurUpload = new PopupMenuItem(_('Upload'));
        this.imgurOpen = new PopupMenuItem(_('Open Link'));
        this.imgurCopyLink = new PopupMenuItem(_('Copy Link'));
        this.imgurDelete = new PopupMenuItem(_('Delete'));
        this.imgurUpload.connect('activate', wrapNotifyError(() => this.onImgurUpload()));
        this.imgurOpen.connect('activate', wrapNotifyError(() => this.onImgurOpen()));
        this.imgurCopyLink.connect('activate', wrapNotifyError(() => this.onImgurCopyLink()));
        this.imgurDelete.connect('activate', wrapNotifyError(() => this.onImgurDelete()));
        getMenu(this.imgurMenu).addMenuItem(this.imgurUpload);
        getMenu(this.imgurMenu).addMenuItem(this.imgurOpen);
        getMenu(this.imgurMenu).addMenuItem(this.imgurCopyLink);
        getMenu(this.imgurMenu).addMenuItem(this.imgurDelete);
        menu.addMenuItem(this.imgurMenu);
        this.updateVisibility();
    }
    updateVisibility() {
        const visible = !!this._screenshot;
        this.image.visible = visible;
        this.clear.visible = visible;
        this.copy.visible = visible;
        this.save.visible = visible;
        const imgurEnabled = getExtension().getConfig().getBool(KeyEnableUploadImgur);
        const imgurComplete = this._screenshot && this._screenshot.imgurUpload && this._screenshot.imgurUpload.response;
        this.imgurMenu.visible = visible && imgurEnabled;
        this.imgurUpload.visible = visible && imgurEnabled && !imgurComplete;
        this.imgurOpen.visible = Boolean(visible && imgurEnabled && imgurComplete);
        this.imgurCopyLink.visible = Boolean(visible && imgurEnabled && imgurComplete);
        this.imgurDelete.visible = Boolean(visible && imgurEnabled && imgurComplete);
    }
    setImage(pixbuf) {
        const content = St.ImageContent.new_with_preferred_size(pixbuf.width, pixbuf.height);
        content.set_bytes(pixbuf.get_pixels(), Cogl.PixelFormat.RGBA_8888, pixbuf.width, pixbuf.height, pixbuf.rowstride);
        const widget = new St.Widget({
            content,
            content_gravity: Clutter.ContentGravity.RESIZE_ASPECT,
            width: pixbuf.width,
            height: pixbuf.height,
        });
        if (widget.width > 200) {
            widget.width = 200;
        }
        if (widget.height > 200) {
            widget.height = 200;
        }
        this.image.remove_all_children();
        this.image.add_child(widget);
    }
    setScreenshot(screenshot) {
        this._screenshot = screenshot;
        if (this._screenshot) {
            this.setImage(this._screenshot.pixbuf);
            this._screenshot.on('imgur-upload', (upload) => {
                upload.on('done', () => {
                    this.updateVisibility();
                });
            });
        }
        this.updateVisibility();
    }
    get screenshot() {
        if (!this._screenshot) {
            throw new Error('screenshot not set');
        }
        return this._screenshot;
    }
    onImage() {
        this.screenshot.launchOpen();
    }
    onClear() {
        this.setScreenshot(undefined);
    }
    onCopy() {
        this.screenshot.copyClipboard(getExtension().getConfig().getString(KeyCopyButtonAction));
    }
    onSave() {
        this.screenshot.launchSave();
    }
    onImgurUpload() {
        this.screenshot.imgurStartUpload();
    }
    onImgurOpen() {
        this.screenshot.imgurOpenURL();
    }
    onImgurCopyLink() {
        this.screenshot.imgurCopyURL();
    }
    onImgurDelete() {
        this.screenshot.imgurDelete();
    }
}
class Indicator {
    screenshotSection;
    captureDelayMenu;
    actionItems;
    panelButton;
    constructor() {
        this.panelButton = new Button(0, IndicatorName);
        const icon = new St.Icon({
            icon_name: DefaultIcon,
            style_class: 'system-status-icon',
        });
        this.panelButton.add_child(icon);
        this.panelButton.connect('button-press-event', wrapNotifyError((obj, evt) => this.onClick(obj, evt)));
        // These actions can be triggered via shortcut or popup menu
        const menu = this.panelButton.menu;
        const items = [
            ['open-portal', _('Open Portal')],
            ['select-area', _('Select Area')],
            ['select-window', _('Select Window')],
            ['select-desktop', _('Select Desktop')],
        ];
        this.actionItems = items.reduce((record, [action, title]) => {
            const item = new PopupMenuItem(title);
            item.connect('activate', wrapNotifyError(async () => {
                menu.close(/* animate */ true);
                await onAction(action);
            }));
            menu.addMenuItem(item);
            return { ...record, [action]: item };
        }, {});
        menu.addMenuItem(new PopupSeparatorMenuItem());
        this.captureDelayMenu = [
            new CaptureDelayMenu(),
            new PopupSeparatorMenuItem(),
        ];
        this.captureDelayMenu.forEach((i) => {
            menu.addMenuItem(i);
        });
        this.screenshotSection = new ScreenshotSection(menu);
        menu.addMenuItem(new PopupSeparatorMenuItem());
        // Settings can only be triggered via menu
        const settingsItem = new PopupMenuItem(_('Settings'));
        settingsItem.connect('activate', () => {
            getExtension().openPreferences();
        });
        menu.addMenuItem(settingsItem);
        menu.connect('open-state-changed', () => {
            this.updateVisibility();
            return false;
        });
    }
    onClick(_obj, evt) {
        // only override primary button behavior
        if (evt.get_button() !== Clutter.BUTTON_PRIMARY) {
            return;
        }
        const action = getExtension().getConfig().getString(KeyClickAction);
        if (action === 'show-menu') {
            return;
        }
        this.panelButton.menu.close(/* animate */ true);
        wrapNotifyError(() => onAction(action))();
    }
    updateVisibility() {
        const backend = getBackend(getExtension().getSettings());
        Object.entries(this.actionItems).forEach(([actionName, item]) => {
            item.visible = backend.supportsAction(actionName);
        });
        this.captureDelayMenu.forEach((i) => {
            i.visible = backend.supportsParam('delay-seconds');
        });
        this.screenshotSection.updateVisibility();
    }
    setScreenshot(screenshot) {
        if (!this.screenshotSection) {
            throw new Error();
        }
        this.screenshotSection.setScreenshot(screenshot);
    }
    destroy() {
        this.panelButton.destroy();
    }
}

class GnomeShellScreenshotExtension extends Extension {
    static instance = null;
    servicePromise = null;
    indicator;
    signalSettings = [];
    constructor(props) {
        super(props);
    }
    setKeybindings() {
        const bindingMode = Shell.ActionMode.NORMAL;
        for (const shortcut of KeyShortcuts) {
            wm.addKeybinding(shortcut, this.getSettings(), Meta.KeyBindingFlags.NONE, bindingMode, wrapNotifyError(() => onAction(shortcut.replace('shortcut-', ''))));
        }
    }
    unsetKeybindings() {
        for (const shortcut of KeyShortcuts) {
            wm.removeKeybinding(shortcut);
        }
    }
    createIndicator() {
        if (!this.indicator) {
            this.indicator = new Indicator();
            panel.addToStatusArea(IndicatorName, this.indicator.panelButton);
        }
    }
    destroyIndicator() {
        if (this.indicator) {
            this.indicator.destroy();
            this.indicator = undefined;
        }
    }
    updateIndicator() {
        if (this.getSettings().get_boolean(KeyEnableIndicator)) {
            this.createIndicator();
        }
        else {
            this.destroyIndicator();
        }
    }
    enable() {
        initGettext(gettext$1);
        GnomeShellScreenshotExtension.instance = this;
        const path = this.dir.get_path();
        if (!path) {
            throw new Error('could not get extension path');
        }
        this.servicePromise = getServiceProxy(path).catch((err) => {
            console.error(err);
        });
        this.signalSettings.push(this.getSettings().connect('changed::' + KeyEnableIndicator, this.updateIndicator.bind(this)));
        this.updateIndicator();
        this.setKeybindings();
    }
    disable() {
        this.signalSettings.forEach((signal) => {
            this.getSettings().disconnect(signal);
        });
        this.servicePromise = null;
        this.destroyIndicator();
        this.unsetKeybindings();
        GnomeShellScreenshotExtension.instance = null;
    }
    getConfig() {
        return new Config(this.getSettings());
    }
}
function getExtension() {
    if (!GnomeShellScreenshotExtension.instance) {
        throw new Error('extension is not enabled');
    }
    return GnomeShellScreenshotExtension.instance;
}

export default GnomeShellScreenshotExtension;
