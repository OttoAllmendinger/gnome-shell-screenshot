var init = (function (Meta, Shell, St, Cogl, Clutter, GLib, Gio, GObject, GdkPixbuf, Gtk, Gdk, Soup) {
    'use strict';

    var ExtensionUtils = imports.misc.extensionUtils;

    const IndicatorName = 'de.ttll.GnomeScreenshot';
    const KeyEnableIndicator = 'enable-indicator';
    const KeyEnableNotification = 'enable-notification';
    const KeyShortcuts = ['shortcut-select-area', 'shortcut-select-window', 'shortcut-select-desktop'];
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

    function versionArray(v) {
        return v.split('.').map(Number);
    }
    function zip(a, b, defaultValue) {
        if (a.length === 0 && b.length === 0) {
            return [];
        }
        const headA = a.length > 0 ? a.shift() : defaultValue;
        const headB = b.length > 0 ? b.shift() : defaultValue;
        return [[headA, headB]].concat(zip(a, b, defaultValue));
    }
    function versionEqual(a, b) {
        return zip(versionArray(a), versionArray(b), 0).reduce((prev, [a, b]) => prev && a === b, true);
    }
    function versionGreater(a, b) {
        const diff = zip(versionArray(a), versionArray(b), 0).find(([a, b]) => a !== b);
        if (!diff) {
            return false;
        }
        const [x, y] = diff;
        return x > y;
    }
    function versionSmaller(a, b) {
        return !versionEqual(a, b) && !versionGreater(a, b);
    }
    function currentVersion() {
        return new Version(imports.misc.config.PACKAGE_VERSION);
    }
    class Version {
        constructor(packageVersion) {
            this.packageVersion = packageVersion;
        }
        equal(v) {
            return versionEqual(this.packageVersion, v);
        }
        greater(v) {
            return versionGreater(this.packageVersion, v);
        }
        smaller(v) {
            return versionSmaller(this.packageVersion, v);
        }
        greaterEqual(v) {
            return this.equal(v) || this.greater(v);
        }
        smallerEqual(v) {
            return this.equal(v) || this.smaller(v);
        }
    }

    /**
     * This works for < 3.36
     */
    function openPrefsAppSystem(uuid, params = {}) {
        const shell = params.shell;
        if (!shell) {
            throw new Error('must provide shell');
        }
        const appSys = shell.AppSystem.get_default();
        const appId = 'gnome-shell-extension-prefs.desktop';
        const prefs = appSys.lookup_app(appId);
        if (!prefs) {
            logError(new Error('could not find prefs app'));
            return;
        }
        if (prefs.get_state() == Shell.AppState.RUNNING) {
            prefs.activate();
        }
        else {
            prefs.get_app_info().launch_uris(['extension:///' + uuid], null);
        }
    }
    /**
     * Works for >= 3.36, maybe earlier
     */
    function openPrefsUtilSpawn(uuid) {
        const Util = imports.misc.util;
        Util.spawn(['gnome-extensions', 'prefs', uuid]);
    }
    function openPrefs(version, uuid, params = {}) {
        if (version.greaterEqual('3.36')) {
            return openPrefsUtilSpawn(uuid);
        }
        return openPrefsAppSystem(uuid, params);
    }
    if ('ARGV' in window) {
        if ('0' in window.ARGV) {
            openPrefsAppSystem(window.ARGV[0]);
        }
    }

    var uuid = "gnome-shell-screenshot@ttll.de";
    var name = "Screenshot Tool";
    var url = "https://github.com/OttoAllmendinger/gnome-shell-screenshot/";
    var description = "Conveniently create, copy, store and upload screenshots";
    var metadata = {
    	"shell-version": [
    	"3.32",
    	"3.34",
    	"3.36",
    	"3.38"
    ],
    	uuid: uuid,
    	name: name,
    	url: url,
    	description: description,
    	"settings-schema": "org.gnome.shell.extensions.screenshot",
    	"gettext-domain": "gnome-shell-screenshot",
    	"git-version": "_gitversion_"
    };

    const domain = metadata['gettext-domain'];
    const _ = imports.gettext.domain(domain).gettext;

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

    function toObject(parameters) {
        return parameters.reduce((obj, [key, value]) => {
            obj[key] = value;
            return obj;
        }, {});
    }

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
            ['N', _('Screenshot'), _('Screenshot (literal)')],
            ['Y', now.getFullYear(), _('Year')],
            ['m', pad(now.getMonth() + 1), _('Month')],
            ['d', pad(now.getDate()), _('Day')],
            ['H', pad(now.getHours()), _('Hour')],
            ['M', pad(now.getMinutes()), _('Minute')],
            ['S', pad(now.getSeconds()), _('Second')],
            ['w', width, _('Width')],
            ['h', height, _('Height')],
            ['hn', hostname, _('Hostname')],
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
    const tempfilePattern = 'gnome-shell-screenshot-XXXXXX.png';
    function getTemp() {
        const [, fileName] = GLib.file_open_tmp(tempfilePattern);
        return fileName;
    }

    const Local = ExtensionUtils.getCurrentExtension();
    // width and height of thumbnail
    const size = 64;
    const emptyImagePath = Local.path + '/empty64.png';
    const getIcon = (path) => {
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

    const PATH_SEPARATOR = '/';
    const join = (...segments) => {
        return [''].concat(segments.filter((e) => e !== '')).join(PATH_SEPARATOR);
    };
    const expandUserDir = (segment) => {
        switch (segment.toUpperCase()) {
            case '$PICTURES':
                return GLib.get_user_special_dir(GLib.UserDirectory.DIRECTORY_PICTURES);
            default:
                return segment;
        }
    };
    const expand = (path) => {
        return join(...path.split(PATH_SEPARATOR).map(expandUserDir));
    };

    function getClipboard() {
        const display = Gdk.Display.get_default();
        if (!display) {
            throw new Error('could not get default display');
        }
        return Gtk.Clipboard.get_default(display);
    }
    function setImage(gtkImage) {
        getClipboard().set_image(gtkImage.get_pixbuf());
    }
    function setText(text) {
        getClipboard().set_text(text, -1);
    }

    const Signals = imports.signals;
    const clientId = 'c5c1369fb46f29e';
    const baseUrl = 'https://api.imgur.com/3/';
    const httpSession = new Soup.SessionAsync();
    const getMimetype = (_file) => {
        return 'image/png'; // FIXME
    };
    const authMessage = (soupMessage) => {
        soupMessage.request_headers.append('Authorization', 'Client-ID ' + clientId);
    };
    const getPostMessage = (file, callback) => {
        const url = baseUrl + 'image';
        file.load_contents_async(null, (f, res) => {
            let contents;
            try {
                [, contents] = f.load_contents_finish(res);
            }
            catch (e) {
                logError(new Error('error loading file: ' + e.message));
                callback(e, null);
                return;
            }
            const buffer = Soup.Buffer.new(contents);
            const mimetype = getMimetype();
            const multipart = new Soup.Multipart(Soup.FORM_MIME_TYPE_MULTIPART);
            const filename = 'image.png';
            multipart.append_form_file('image', filename, mimetype, buffer);
            const message = Soup.form_request_new_from_multipart(url, multipart);
            authMessage(message);
            callback(null, message);
        });
    };
    const httpError = (reasonPhrase, statusCode, responeData) => {
        return new Error('HTTP Error status=' + reasonPhrase + ' statusCode=' + statusCode + ' responseData=' + responeData);
    };
    class Upload {
        constructor(file) {
            this._file = file;
        }
        start() {
            getPostMessage(this._file, (error, message) => {
                const total = message.request_body.length;
                let uploaded = 0;
                if (error) {
                    this.emit('error', error);
                    return;
                }
                const signalProgress = message.connect('wrote-body-data', (message, buffer) => {
                    uploaded += buffer.length;
                    this.emit('progress', uploaded, total);
                });
                httpSession.queue_message(message, (session, { reason_phrase, status_code, response_body }) => {
                    if (status_code == 200) {
                        const data = JSON.parse(response_body.data).data;
                        this.responseData = data;
                        this.emit('done', data);
                    }
                    else {
                        const err = httpError(reason_phrase, status_code, response_body.data);
                        try {
                            err.errorMessage = JSON.parse(response_body.data).data.error;
                        }
                        catch (e) {
                            logError(new Error('failed to parse error message ' + e + ' data=' + response_body.data));
                            err.errorMessage = response_body.data;
                        }
                        this.emit('error', err);
                    }
                    message.disconnect(signalProgress);
                });
            });
        }
        deleteRemote() {
            if (!this.responseData) {
                throw new Error('no responseData');
            }
            const { deletehash } = this.responseData;
            const uri = new Soup.URI(baseUrl + 'image/' + deletehash);
            const message = new Soup.Message({ method: 'DELETE', uri });
            authMessage(message);
            httpSession.queue_message(message, (session, { reason_phrase, status_code, response_body }) => {
                if (status_code == 200) {
                    this.emit('deleted');
                }
                else {
                    this.emit('error', httpError(reason_phrase, status_code, response_body.data));
                }
            });
        }
    }
    Signals.addSignalMethods(Upload.prototype);

    const Signals$1 = imports.signals;
    const Util = imports.misc.util;
    const Local$1 = ExtensionUtils.getCurrentExtension();
    const settings = ExtensionUtils.getSettings();
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
        constructor(scale) {
            this.scale = scale;
            if (Number.isNaN(scale) || scale <= 0) {
                throw new Error(`invalid argument ${scale}`);
            }
        }
        apply(image) {
            if (this.scale === 1) {
                return;
            }
            const newPixbuf = image.pixbuf.scale_simple(image.pixbuf.get_width() * this.scale, image.pixbuf.get_height() * this.scale, GdkPixbuf.InterpType.BILINEAR);
            image.set_from_pixbuf(newPixbuf);
        }
    }
    class Screenshot {
        constructor(filePath, effects = []) {
            if (!filePath) {
                throw new Error(`need argument ${filePath}`);
            }
            this.gtkImage = new Gtk.Image({ file: filePath });
            effects.forEach((e) => e.apply(this.gtkImage));
            this.gtkImage.pixbuf.savev(filePath, 'png', [], []);
            this.srcFile = Gio.File.new_for_path(filePath);
            this.dstFile = null;
        }
        getFilename(n = 0) {
            const filenameTemplate = settings.get_string(KeyFilenameTemplate);
            const { width, height } = this.gtkImage.get_pixbuf();
            return get(filenameTemplate, { width, height }, n);
        }
        getNextFile() {
            const dir = expand(settings.get_string(KeySaveLocation));
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
        launchOpen() {
            const context = Shell.Global.get().create_app_launch_context(0, -1);
            Gio.AppInfo.launch_default_for_uri(this.getFinalFile().get_uri(), context);
        }
        launchSave() {
            const pathComponents = [
                this.srcFile.get_path(),
                expand('$PICTURES'),
                this.getFilename(),
                Local$1.dir.get_path(),
            ];
            pathComponents.forEach((v) => {
                if (!v) {
                    throw new Error(`unexpected path component in ${pathComponents}`);
                }
            });
            Util.spawn(['gjs', Local$1.path + '/saveDlg.js', ...pathComponents.map(encodeURIComponent)]);
        }
        copyClipboard(action) {
            if (action === ClipboardActions.NONE) {
                return;
            }
            else if (action === ClipboardActions.SET_IMAGE_DATA) {
                return setImage(this.gtkImage);
            }
            else if (action === ClipboardActions.SET_LOCAL_PATH) {
                return setText(this.getFinalFile().get_path());
            }
            throw new Error(`unknown action ${action}`);
        }
        imgurStartUpload() {
            this.imgurUpload = new Upload(this.srcFile);
            this.imgurUpload.connect('error', (obj, err) => {
                logError(err);
                notifyError(String(err));
            });
            if (settings.get_boolean(KeyImgurEnableNotification)) {
                notifyImgurUpload(this);
            }
            this.emit('imgur-upload', this.imgurUpload);
            this.imgurUpload.connect('done', () => {
                if (settings.get_boolean(KeyImgurAutoCopyLink)) {
                    this.imgurCopyURL();
                }
                if (settings.get_boolean(KeyImgurAutoOpenLink)) {
                    this.imgurOpenURL();
                }
            });
            this.imgurUpload.start();
        }
        isImgurUploadComplete() {
            return !!(this.imgurUpload && this.imgurUpload.responseData);
        }
        imgurOpenURL() {
            if (!this.isImgurUploadComplete()) {
                throw new Error('no completed imgur upload');
            }
            const context = Shell.Global.get().create_app_launch_context(0, -1);
            const uri = this.imgurUpload.responseData.link;
            if (!uri) {
                throw new Error('no uri in responseData');
            }
            Gio.AppInfo.launch_default_for_uri(uri, context);
        }
        imgurCopyURL() {
            if (!this.isImgurUploadComplete()) {
                throw new Error('no completed imgur upload');
            }
            const uri = this.imgurUpload.responseData.link;
            setText(uri);
        }
        imgurDelete() {
            if (!this.isImgurUploadComplete()) {
                throw new Error('no completed imgur upload');
            }
            this.imgurUpload.connect('deleted', () => {
                this.imgurUpload = undefined;
            });
            this.imgurUpload.deleteRemote();
        }
    }
    Signals$1.addSignalMethods(Screenshot.prototype);

    const Signals$2 = imports.signals;
    const Main = imports.ui.main;
    const MessageTray = imports.ui.messageTray;
    const version = currentVersion();
    const NotificationIcon = 'camera-photo-symbolic';
    const NotificationSourceName = 'Screenshot Tool';
    const ICON_SIZE = 64;
    const settings$1 = ExtensionUtils.getSettings();
    var ErrorActions;
    (function (ErrorActions) {
        ErrorActions[ErrorActions["OPEN_SETTINGS"] = 0] = "OPEN_SETTINGS";
    })(ErrorActions || (ErrorActions = {}));
    const getSource = () => {
        const source = new MessageTray.Source(NotificationSourceName, NotificationIcon);
        Main.messageTray.add(source);
        return source;
    };
    const registerClassCompat = (cls) => {
        if (version.greaterEqual('3.36')) {
            return GObject.registerClass(cls);
        }
        else {
            Signals$2.addSignalMethods(cls.prototype);
            return cls;
        }
    };
    const showNotificationCompat = (source, notification) => {
        if (version.greaterEqual('3.36')) {
            return source.showNotification(notification);
        }
        else {
            return source.notify(notification);
        }
    };
    const NotificationNewScreenshot = registerClassCompat(class NotificationNewScreenshot extends MessageTray.Notification {
        static _title() {
            return _('New Screenshot');
        }
        static _banner(obj) {
            const { gtkImage } = obj;
            const { width, height } = gtkImage.get_pixbuf();
            const banner = _('Size:') + ' ' + width + 'x' + height + '.';
            return banner;
        }
        static ctrArgs(source, screenshot) {
            return [
                source,
                NotificationNewScreenshot._title(),
                NotificationNewScreenshot._banner(screenshot),
                { gicon: getIcon(screenshot.srcFile.get_path()) },
            ];
        }
        constructor(source, screenshot) {
            super(...NotificationNewScreenshot.ctrArgs(source, screenshot));
            this.initCompat(source, screenshot);
        }
        _init(source, screenshot) {
            super._init(...NotificationNewScreenshot.ctrArgs(source, screenshot));
            this.initCompat(source, screenshot);
        }
        initCompat(source, screenshot) {
            this.connect('activated', this._onActivated.bind(this));
            // makes banner expand on hover
            this.setForFeedback(true);
            this._screenshot = screenshot;
        }
        createBanner() {
            const b = super.createBanner();
            b._iconBin.child.icon_size = ICON_SIZE;
            b.addAction(_('Copy'), this._onCopy.bind(this));
            b.addAction(_('Save'), this._onSave.bind(this));
            if (settings$1.get_boolean(KeyEnableUploadImgur)) {
                if (settings$1.get_boolean(KeyImgurAutoUpload)) {
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
            this._screenshot.launchOpen();
        }
        _onCopy() {
            this._screenshot.copyClipboard(settings$1.get_string(KeyCopyButtonAction));
        }
        _onSave() {
            this._screenshot.launchSave();
        }
        _onUpload() {
            this._screenshot.imgurStartUpload();
        }
    });
    const ErrorNotification = registerClassCompat(class ErrorNotification extends MessageTray.Notification {
        constructor(source, message, buttons) {
            super(...ErrorNotification.ctrArgs(source, message));
            this.initCompat(message, buttons);
        }
        static ctrArgs(source, message) {
            return [source, _('Error'), String(message), { secondaryGIcon: new Gio.ThemedIcon({ name: 'dialog-error' }) }];
        }
        _init(source, message, buttons) {
            super._init(...ErrorNotification.ctrArgs(source, message));
            this.initCompat(message, buttons);
        }
        initCompat(_message, buttons) {
            this.buttons = buttons;
        }
        createBanner() {
            const banner = super.createBanner();
            for (const b of this.buttons) {
                switch (b) {
                    case ErrorActions.OPEN_SETTINGS:
                        banner.addAction(_('Settings'), () => {
                            openPrefs(version, uuid, { shell: imports.gi.Shell });
                        });
                        break;
                    default:
                        logError(new Error('unknown button ' + b));
                }
            }
            return banner;
        }
    });
    const ImgurNotification = registerClassCompat(class ImgurNotification extends MessageTray.Notification {
        constructor(source, screenshot) {
            super(source, _('Imgur Upload'));
            this.initCompat(source, screenshot);
        }
        _init(source, screenshot) {
            super._init(source, _('Imgur Upload'));
            this.initCompat(source, screenshot);
        }
        initCompat(source, screenshot) {
            this.setForFeedback(true);
            this.setResident(true);
            this.connect('activated', this._onActivated.bind(this));
            this._screenshot = screenshot;
            this._upload = screenshot.imgurUpload;
            this._upload.connect('progress', (obj, bytes, total) => {
                this.update(_('Imgur Upload'), '' + Math.floor(100 * (bytes / total)) + '%');
            });
            this._upload.connect('error', (obj, msg) => {
                this.update(_('Imgur Upload Failed'), msg);
            });
            this._upload.connect('done', () => {
                this.update(_('Imgur Upload Successful'), this._upload.responseData.link);
                this._updateCopyButton();
            });
        }
        _updateCopyButton() {
            if (!this._copyButton) {
                return;
            }
            this._copyButton.visible = this._screenshot.isImgurUploadComplete();
        }
        createBanner() {
            const b = super.createBanner();
            this._copyButton = b.addAction(_('Copy Link'), this._onCopy.bind(this));
            this._updateCopyButton();
            return b;
        }
        _onActivated() {
            if (this._screenshot.isImgurUploadComplete()) {
                this._screenshot.imgurOpenURL();
            }
            else {
                this._upload.connect('done', () => {
                    this._screenshot.imgurOpenURL();
                });
            }
        }
        _onCopy() {
            this._screenshot.imgurCopyURL();
        }
    });
    function notifyScreenshot(screenshot) {
        const source = getSource();
        const notification = new NotificationNewScreenshot(source, screenshot);
        showNotificationCompat(source, notification);
    }
    function notifyError(error) {
        const buttons = [];
        if (error instanceof Error) {
            if (error instanceof ErrorInvalidSettings) {
                buttons.push(ErrorActions.OPEN_SETTINGS);
            }
        }
        const source = getSource();
        const notification = new ErrorNotification(source, error, buttons);
        showNotificationCompat(source, notification);
    }
    function notifyImgurUpload(screenshot) {
        const source = getSource();
        const notification = new ImgurNotification(source, screenshot);
        showNotificationCompat(source, notification);
    }
    function wrapNotifyError(f) {
        return function (...args) {
            try {
                return f(...args);
            }
            catch (e) {
                notifyError(e);
                throw e;
            }
        };
    }

    const PanelMenu = imports.ui.panelMenu;
    const PopupMenu = imports.ui.popupMenu;
    const Slider = imports.ui.slider;
    const Local$2 = ExtensionUtils.getCurrentExtension();
    const version$1 = currentVersion();
    const DefaultIcon = 'camera-photo-symbolic';
    const settings$2 = ExtensionUtils.getSettings();
    // remove this when dropping support for < 3.33
    const getActorCompat = (obj) => (version$1.greaterEqual('3.33') ? obj : obj.actor);
    const getSliderSignalCompat = () => (version$1.greaterEqual('3.33') ? 'notify::value' : 'value-changed');
    const addActorCompat = (actor, child) => version$1.greaterEqual('3.36') ? actor.add_child(child) : actor.add(child, { expand: true });
    class CaptureDelayMenu extends PopupMenu.PopupMenuSection {
        createScale() {
            const scale = [0];
            for (let p = 1; p < 4; p++) {
                for (let x = 1; x <= 10; x += 1) {
                    scale.push(x * Math.pow(10, p));
                }
            }
            return scale;
        }
        constructor(_control) {
            super();
            this.scaleMS = this.createScale();
            this.delayValueMS = settings$2.get_int(KeyCaptureDelay);
            this.slider = new Slider.Slider(this.scaleToSlider(this.delayValueMS));
            this.slider.connect(getSliderSignalCompat(), this.onDragEnd.bind(this));
            this.sliderItem = new PopupMenu.PopupBaseMenuItem({ activate: false });
            addActorCompat(getActorCompat(this.sliderItem), getActorCompat(this.slider));
            this.addMenuItem(this.sliderItem);
            this.delayInfoItem = new PopupMenu.PopupMenuItem('', {
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
                settings$2.set_int(KeyCaptureDelay, newValue);
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
            this.delayInfoItem.label.text = text;
        }
    }
    class ScreenshotSection {
        constructor(menu) {
            this.image = new PopupMenu.PopupBaseMenuItem();
            getActorCompat(this.image).content_gravity = Clutter.ContentGravity.RESIZE_ASPECT;
            this.clear = new PopupMenu.PopupMenuItem(_('Clear'));
            this.copy = new PopupMenu.PopupMenuItem(_('Copy'));
            this.save = new PopupMenu.PopupMenuItem(_('Save As...'));
            this.image.connect('activate', wrapNotifyError(() => this.onImage()));
            this.clear.connect('activate', wrapNotifyError(() => this.onClear()));
            this.copy.connect('activate', wrapNotifyError(() => this.onCopy()));
            this.save.connect('activate', wrapNotifyError(() => this.onSave()));
            menu.addMenuItem(this.image);
            menu.addMenuItem(this.clear);
            menu.addMenuItem(this.copy);
            menu.addMenuItem(this.save);
            // IMGUR
            menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
            this.imgurMenu = new PopupMenu.PopupSubMenuMenuItem(_('Imgur'), false);
            this.imgurUpload = new PopupMenu.PopupMenuItem(_('Upload'));
            this.imgurOpen = new PopupMenu.PopupMenuItem(_('Open Link'));
            this.imgurCopyLink = new PopupMenu.PopupMenuItem(_('Copy Link'));
            this.imgurDelete = new PopupMenu.PopupMenuItem(_('Delete'));
            this.imgurUpload.connect('activate', wrapNotifyError(() => this.onImgurUpload()));
            this.imgurOpen.connect('activate', wrapNotifyError(() => this.onImgurOpen()));
            this.imgurCopyLink.connect('activate', wrapNotifyError(() => this.onImgurCopyLink()));
            this.imgurDelete.connect('activate', wrapNotifyError(() => this.onImgurDelete()));
            this.imgurMenu.menu.addMenuItem(this.imgurUpload);
            this.imgurMenu.menu.addMenuItem(this.imgurOpen);
            this.imgurMenu.menu.addMenuItem(this.imgurCopyLink);
            this.imgurMenu.menu.addMenuItem(this.imgurDelete);
            menu.addMenuItem(this.imgurMenu);
            menu.connect('open-state-changed', () => {
                this.updateVisibility();
            });
            this.updateVisibility();
        }
        updateVisibility() {
            const visible = !!this._screenshot;
            getActorCompat(this.image).visible = visible;
            getActorCompat(this.clear).visible = visible;
            getActorCompat(this.copy).visible = visible;
            getActorCompat(this.save).visible = visible;
            const imgurEnabled = settings$2.get_boolean(KeyEnableUploadImgur);
            const imgurComplete = this._screenshot && this._screenshot.imgurUpload && this._screenshot.imgurUpload.responseData;
            getActorCompat(this.imgurMenu).visible = visible && imgurEnabled;
            getActorCompat(this.imgurUpload).visible = visible && imgurEnabled && !imgurComplete;
            getActorCompat(this.imgurOpen).visible = visible && imgurEnabled && imgurComplete;
            getActorCompat(this.imgurCopyLink).visible = visible && imgurEnabled && imgurComplete;
            getActorCompat(this.imgurDelete).visible = visible && imgurEnabled && imgurComplete;
        }
        setImage(pixbuf) {
            const { width, height } = pixbuf;
            if (height == 0) {
                return;
            }
            const image = new Clutter.Image();
            const success = image.set_data(pixbuf.get_pixels(), pixbuf.get_has_alpha() ? Cogl.PixelFormat.RGBA_8888 : Cogl.PixelFormat.RGB_888, width, height, pixbuf.get_rowstride());
            if (!success) {
                throw Error('error creating Clutter.Image()');
            }
            getActorCompat(this.image).content = image;
            getActorCompat(this.image).height = 200;
        }
        setScreenshot(screenshot) {
            this._screenshot = screenshot;
            if (this._screenshot) {
                this.setImage(this._screenshot.gtkImage.get_pixbuf());
                this._screenshot.connect('imgur-upload', (obj, upload) => {
                    upload.connect('done', (_obj, _data) => {
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
            this.screenshot.copyClipboard(settings$2.get_string(KeyCopyButtonAction));
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
        constructor(extension) {
            this.extension = extension;
            this.panelButton = new PanelMenu.Button(null, IndicatorName);
            const icon = new St.Icon({
                icon_name: DefaultIcon,
                style_class: 'system-status-icon',
            });
            getActorCompat(this.panelButton).add_actor(icon);
            getActorCompat(this.panelButton).connect('button-press-event', wrapNotifyError((obj, evt) => this.onClick(obj, evt)));
            this.buildMenu();
        }
        onClick(_obj, evt) {
            // only override primary button behavior
            if (evt.get_button() !== Clutter.BUTTON_PRIMARY) {
                return;
            }
            const action = settings$2.get_string(KeyClickAction);
            if (action === 'show-menu') {
                return;
            }
            this.panelButton.menu.close();
            this.extension.onAction(action);
        }
        buildMenu() {
            // These actions can be triggered via shortcut or popup menu
            const menu = this.panelButton.menu;
            const items = [
                ['select-area', _('Select Area')],
                ['select-window', _('Select Window')],
                ['select-desktop', _('Select Desktop')],
            ];
            items.forEach(([action, title]) => {
                const item = new PopupMenu.PopupMenuItem(title);
                item.connect('activate', () => {
                    menu.close();
                    this.extension.onAction(action);
                });
                menu.addMenuItem(item);
            });
            // Delay
            menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
            menu.addMenuItem(new CaptureDelayMenu());
            menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
            this.screenshotSection = new ScreenshotSection(menu);
            menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
            // Settings can only be triggered via menu
            const settingsItem = new PopupMenu.PopupMenuItem(_('Settings'));
            settingsItem.connect('activate', () => {
                openPrefs(version$1, Local$2.metadata.uuid, { shell: imports.gi.Shell });
            });
            menu.addMenuItem(settingsItem);
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

    function spawnAsync(argv) {
        return new Promise((resolve, reject) => {
            const [success, pid] = GLib.spawn_async(null /* pwd */, argv, null /* envp */, GLib.SpawnFlags.SEARCH_PATH | GLib.SpawnFlags.DO_NOT_REAP_CHILD, null /* child_setup */);
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
                    logError(new Error(`cmd: ${argv.join(' ')} exitCode=${exitCode}`));
                    return reject(new Error(`exitCode=${exitCode}`));
                }
            });
        });
    }

    const Signals$3 = imports.signals;
    const Mainloop = imports.mainloop;
    const Main$1 = imports.ui.main;
    const Local$3 = ExtensionUtils.getCurrentExtension();
    const version$2 = currentVersion();
    const shellGlobal = Shell.Global.get();
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
    const callHelper = (argv, fileName, callback) => {
        argv = ['gjs', Local$3.path + '/auxhelper.js', '--filename', fileName, ...argv];
        spawnAsync(argv)
            .catch((err) => callback(err, null))
            .then(() => callback(null, fileName));
    };
    const makeAreaScreenshot = ({ x, y, w, h }, callback) => {
        const fileName = getTemp();
        callHelper(['--area', [x, y, w, h].join(',')], fileName, callback);
    };
    const makeWindowScreenshot = (callback) => {
        const fileName = getTemp();
        callHelper(['--window'], fileName, callback);
    };
    const makeDesktopScreenshot = (callback) => {
        const fileName = getTemp();
        callHelper(['--desktop'], fileName, callback);
    };
    class Capture {
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
            Main$1.uiGroup.add_actor(this._container);
            if (Main$1.pushModal(this._container)) {
                this._signalCapturedEvent = shellGlobal.stage.connect('captured-event', this._onCaptureEvent.bind(this));
                this._setCaptureCursor();
            }
            else {
                log('Main.pushModal() === false');
            }
        }
        _setCursorCompat(v) {
            if (version$2.greaterEqual('3.29')) {
                shellGlobal.display.set_cursor(v);
            }
            else {
                shellGlobal.screen.set_cursor(v);
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
            Main$1.uiGroup.remove_actor(this._container);
            Main$1.popModal(this._container);
            this._container.destroy();
            this.emit('stop');
            this.disconnectAll();
        }
    }
    Signals$3.addSignalMethods(Capture.prototype);
    const emitScreenshotOnSuccess = (instance) => (error, fileName) => {
        if (error) {
            return instance.emit('error', error);
        }
        instance.emit('screenshot', fileName);
    };
    class SelectionArea {
        constructor(options) {
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
            }
            else if (this._mouseDown) {
                const rect = getRectangle(this._startX, this._startY, x, y);
                if (type === Clutter.EventType.MOTION) {
                    this._capture.drawContainer(rect);
                }
                else if (type === Clutter.EventType.BUTTON_RELEASE) {
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
    Signals$3.addSignalMethods(SelectionArea.prototype);
    class SelectionWindow {
        constructor(options) {
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
            }
            else {
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
                Main$1.activateWindow(win.get_meta_window());
                Mainloop.idle_add(() => makeWindowScreenshot(emitScreenshotOnSuccess(this)));
            });
        }
    }
    Signals$3.addSignalMethods(SelectionWindow.prototype);
    class SelectionDesktop {
        constructor(options) {
            this._options = options;
            Mainloop.timeout_add(this._options.captureDelay, () => {
                makeDesktopScreenshot(emitScreenshotOnSuccess(this));
                this.emit('stop');
            });
        }
    }
    Signals$3.addSignalMethods(SelectionDesktop.prototype);

    const settings$3 = ExtensionUtils.getSettings();
    function parameters$1(v) {
        return [['f', GLib.shell_quote(v.filename), _('Filename')]];
    }
    function getCommand(file) {
        const filename = file.get_path();
        if (!filename) {
            throw new Error('path: null');
        }
        return stringFormat(settings$3.get_string(KeyRunCommand), toObject(parameters$1({ filename })));
    }
    async function exec(file) {
        const command = getCommand(file);
        const [ok, argv] = GLib.shell_parse_argv(command);
        if (!ok || !argv) {
            throw new Error('argv parse error command=' + command);
        }
        await spawnAsync(argv);
        return command;
    }

    // props to
    const Signals$4 = imports.signals;
    const Main$2 = imports.ui.main;
    const settings$4 = ExtensionUtils.getSettings();
    const getSelectionOptions = () => {
        const captureDelay = settings$4.get_int(KeyCaptureDelay);
        return { captureDelay };
    };
    class Extension {
        constructor() {
            this.signalSettings = [];
            ExtensionUtils.initTranslations();
        }
        setKeybindings() {
            const bindingMode = Shell.ActionMode.NORMAL;
            for (const shortcut of KeyShortcuts) {
                Main$2.wm.addKeybinding(shortcut, settings$4, Meta.KeyBindingFlags.NONE, bindingMode, this.onAction.bind(this, shortcut.replace('shortcut-', '')));
            }
        }
        unsetKeybindings() {
            for (const shortcut of KeyShortcuts) {
                Main$2.wm.removeKeybinding(shortcut);
            }
        }
        createIndicator() {
            if (!this.indicator) {
                this.indicator = new Indicator(this);
                Main$2.panel.addToStatusArea(IndicatorName, this.indicator.panelButton);
            }
        }
        destroyIndicator() {
            if (this.indicator) {
                this.indicator.destroy();
                this.indicator = undefined;
            }
        }
        updateIndicator() {
            if (settings$4.get_boolean(KeyEnableIndicator)) {
                this.createIndicator();
            }
            else {
                this.destroyIndicator();
            }
        }
        onAction(action) {
            const dispatch = {
                'select-area': this.selectArea.bind(this),
                'select-window': this.selectWindow.bind(this),
                'select-desktop': this.selectDesktop.bind(this),
            };
            const f = dispatch[action] ||
                function () {
                    throw new Error('unknown action: ' + action);
                };
            wrapNotifyError(f)();
        }
        startSelection(selection) {
            if (this.selection) {
                // prevent reentry
                log('_startSelection() error: selection already in progress');
                return;
            }
            this.selection = selection;
            if (!this.selection) {
                throw new Error('selection undefined');
            }
            this.selection.connect('screenshot', (screenshot, file) => {
                try {
                    this.onScreenshot(screenshot, file);
                }
                catch (e) {
                    notifyError(e);
                }
            });
            this.selection.connect('error', (selection, message) => {
                notifyError(message);
            });
            this.selection.connect('stop', () => {
                this.selection = undefined;
            });
        }
        selectArea() {
            this.startSelection(new SelectionArea(getSelectionOptions()));
        }
        selectWindow() {
            this.startSelection(new SelectionWindow(getSelectionOptions()));
        }
        selectDesktop() {
            this.startSelection(new SelectionDesktop(getSelectionOptions()));
        }
        onScreenshot(selection, filePath) {
            const effects = [new Rescale(settings$4.get_int(KeyEffectRescale) / 100.0)];
            const screenshot = new Screenshot(filePath, effects);
            if (settings$4.get_boolean(KeySaveScreenshot)) {
                screenshot.autosave();
            }
            screenshot.copyClipboard(settings$4.get_string(KeyClipboardAction));
            if (settings$4.get_boolean(KeyEnableNotification)) {
                notifyScreenshot(screenshot);
            }
            if (this.indicator) {
                this.indicator.setScreenshot(screenshot);
            }
            const commandEnabled = settings$4.get_boolean(KeyEnableRunCommand);
            if (commandEnabled) {
                const file = screenshot.getFinalFile();
                // Notifications.notifyCommand(Commands.getCommand(file));
                exec(file)
                    .then((command) => log(`command ${command} complete`))
                    .catch((e) => notifyError(e));
            }
            const imgurEnabled = settings$4.get_boolean(KeyEnableUploadImgur);
            const imgurAutoUpload = settings$4.get_boolean(KeyImgurAutoUpload);
            if (imgurEnabled && imgurAutoUpload) {
                screenshot.imgurStartUpload();
            }
        }
        destroy() {
            this.destroyIndicator();
            this.unsetKeybindings();
            this.signalSettings.forEach((signal) => {
                settings$4.disconnect(signal);
            });
            this.disconnectAll();
        }
        enable() {
            this.signalSettings.push(settings$4.connect('changed::' + KeyEnableIndicator, this.updateIndicator.bind(this)));
            this.updateIndicator();
            this.setKeybindings();
        }
        disable() {
            this.destroy();
        }
    }
    Signals$4.addSignalMethods(Extension.prototype);

    function index () {
        return new Extension();
    }

    return index;

}(imports.gi.Meta, imports.gi.Shell, imports.gi.St, imports.gi.Cogl, imports.gi.Clutter, imports.gi.GLib, imports.gi.Gio, imports.gi.GObject, imports.gi.GdkPixbuf, imports.gi.Gtk, imports.gi.Gdk, imports.gi.Soup));
