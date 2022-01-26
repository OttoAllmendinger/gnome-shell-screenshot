var init = (function (Meta, Shell, Gio, GObject, GdkPixbuf, GLib, Gtk, St, Soup, Clutter, Cogl) {
    'use strict';

    const extensionUtils = imports.misc.extensionUtils;
    if (!extensionUtils.gettext) {
        // backport from v41
        // https://gitlab.gnome.org/GNOME/gnome-shell/-/blob/1deb13e1aaabfd04b2641976a224b6fc2be3b9ec/js/misc/extensionUtils.js#L117
        const domain = extensionUtils.getCurrentExtension().metadata['gettext-domain'];
        extensionUtils.initTranslations(domain);
        const gettextForDomain = imports.gettext.domain(domain);
        if (gettextForDomain.gettext) {
            Object.assign(extensionUtils, gettextForDomain);
        }
        else {
            logError(new Error(`could create gettextForDomain domain=${domain}`));
        }
    }
    const _ = extensionUtils.gettext;

    const KeyBackend = 'backend';
    const Backends = {
        DESKTOP_PORTAL: 'desktop-portal',
        GNOME_SCREENSHOT_CLI: 'gnome-screenshot',
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
        const emptyImagePath = getExtension().info.path + '/empty64.png';
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
    function join(...segments) {
        return [''].concat(segments.filter((e) => e !== '')).join(PATH_SEPARATOR);
    }
    function expandUserDir(segment) {
        switch (segment.toUpperCase()) {
            case '$PICTURES':
                return GLib.get_user_special_dir(GLib.UserDirectory.DIRECTORY_PICTURES);
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

    const Signals = imports.signals;
    const clientId = 'c5c1369fb46f29e';
    const baseUrl = 'https://api.imgur.com/3/';
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
            this.httpSession = new Soup.SessionAsync();
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
                this.httpSession.queue_message(message, (session, { reason_phrase, status_code, response_body }) => {
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
            this.httpSession.queue_message(message, (session, { reason_phrase, status_code, response_body }) => {
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
                    logError(new Error(`cmd: ${argv.join(' ')} exitCode=${exitCode}`));
                    return reject(new Error(`exitCode=${exitCode}`));
                }
            });
        });
    }

    function openURI(uri) {
        const context = Shell.Global.get().create_app_launch_context(0, -1);
        Gio.AppInfo.launch_default_for_uri(uri, context);
    }

    const Signals$1 = imports.signals;
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
    class Screenshot {
        constructor(filePath, effects = []) {
            if (!filePath) {
                throw new Error(`need argument ${filePath}`);
            }
            this.pixbuf = GdkPixbuf.Pixbuf.new_from_file(filePath);
            this.pixbuf = effects.reduce((pixbuf, e) => e.apply(pixbuf), this.pixbuf);
            this.pixbuf.savev(filePath, 'png', [], []);
            this.srcFile = Gio.File.new_for_path(filePath);
            this.dstFile = null;
        }
        getFilename(n = 0) {
            const filenameTemplate = getExtension().settings.get_string(KeyFilenameTemplate);
            const { width, height } = this.pixbuf;
            return get(filenameTemplate, { width, height }, n);
        }
        getNextFile() {
            const dir = expand(getExtension().settings.get_string(KeySaveLocation));
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
            openURI(this.getFinalFile().get_uri());
        }
        launchSave() {
            const pathComponents = [
                this.srcFile.get_path(),
                expand('$PICTURES'),
                this.getFilename(),
                getExtension().info.dir.get_path(),
            ];
            pathComponents.forEach((v) => {
                if (!v) {
                    throw new Error(`unexpected path component in ${pathComponents}`);
                }
            });
            let gtkVersionString;
            switch (Gtk.get_major_version()) {
                case 3:
                    gtkVersionString = '3.0';
                    break;
                case 4:
                    gtkVersionString = '4.0';
                    break;
            }
            spawnAsync(['gjs', getExtension().info.path + '/saveDlg.js', ...pathComponents.map(encodeURIComponent)], ['GTK=' + gtkVersionString]);
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
            this.imgurUpload.connect('error', (obj, err) => {
                logError(err);
                notifyError(String(err));
            });
            if (getExtension().settings.get_boolean(KeyImgurEnableNotification)) {
                notifyImgurUpload(this);
            }
            this.emit('imgur-upload', this.imgurUpload);
            this.imgurUpload.connect('done', () => {
                if (getExtension().settings.get_boolean(KeyImgurAutoCopyLink)) {
                    this.imgurCopyURL();
                }
                if (getExtension().settings.get_boolean(KeyImgurAutoOpenLink)) {
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
            const uri = this.imgurUpload.responseData.link;
            if (!uri) {
                throw new Error('no uri in responseData');
            }
            openURI(this.getFinalFile().get_uri());
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

    const Main = imports.ui.main;
    const MessageTray = imports.ui.messageTray;
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
        const source = new MessageTray.Source(NotificationSourceName, NotificationIcon);
        Main.messageTray.add(source);
        return source;
    }
    function registerClass(cls) {
        return GObject.registerClass(cls);
    }
    const NotificationNewScreenshot = registerClass(class NotificationNewScreenshot extends MessageTray.Notification {
        static _title() {
            return _('New Screenshot');
        }
        static _banner(obj) {
            const { pixbuf } = obj;
            const { width, height } = pixbuf;
            return _('Size:') + ' ' + width + 'x' + height + '.';
        }
        _init(source, screenshot) {
            super._init(source, NotificationNewScreenshot._title(), NotificationNewScreenshot._banner(screenshot), {
                gicon: getIcon(screenshot.srcFile.get_path()),
            });
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
            const extension = getExtension();
            if (extension.settings.get_boolean(KeyEnableUploadImgur)) {
                if (extension.settings.get_boolean(KeyImgurAutoUpload)) {
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
            this._screenshot.copyClipboard(getExtension().settings.get_string(KeyCopyButtonAction));
        }
        _onSave() {
            this._screenshot.launchSave();
        }
        _onUpload() {
            this._screenshot.imgurStartUpload();
        }
    });
    const ErrorNotification = registerClass(class ErrorNotification extends MessageTray.Notification {
        _init(source, error, buttons) {
            super._init(source, _('Error'), String(error), {
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
                            extensionUtils.openPrefs();
                        });
                        break;
                    case ErrorActions.OPEN_HELP:
                        const uri = getURI(this.error);
                        if (!uri) {
                            return;
                        }
                        banner.addAction(_('Help'), () => openURI(uri));
                        break;
                    default:
                        logError(new Error('unknown button ' + b));
                }
            }
            return banner;
        }
    });
    const ImgurNotification = registerClass(class ImgurNotification extends MessageTray.Notification {
        _init(source, screenshot) {
            super._init(source, _('Imgur Upload'));
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
        constructor() {
            this.pressEsc = false;
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
    CaptureKeys.stage = Shell.Global.get().stage;
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
        const ifaceXml = imports.byteArray.toString(data);
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
            return stripPrefix('file://', await portalScreenshot(await getExtension().servicePromise));
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
        return settings.get_string(KeyBackend);
    }
    function getBackend(settings) {
        const name = getBackendName(settings);
        switch (name) {
            case Backends.GNOME_SCREENSHOT_CLI:
                return new BackendGnomeScreenshot();
            case Backends.DESKTOP_PORTAL:
                return new BackendDeskopPortal();
            default:
                throw new Error(`unexpected backend ${name}`);
        }
    }

    class BackendError extends Error {
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
        const { settings, indicator } = getExtension();
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
        const effects = [new Rescale(settings.get_int(KeyEffectRescale) / 100.0)];
        const screenshot = new Screenshot(filePath, effects);
        if (settings.get_boolean(KeySaveScreenshot)) {
            screenshot.autosave();
        }
        screenshot.copyClipboard(settings.get_string(KeyClipboardAction));
        if (settings.get_boolean(KeyEnableNotification)) {
            notifyScreenshot(screenshot);
        }
        if (indicator) {
            indicator.setScreenshot(screenshot);
        }
        const commandEnabled = settings.get_boolean(KeyEnableRunCommand);
        if (commandEnabled) {
            const file = screenshot.getFinalFile();
            // Notifications.notifyCommand(Commands.getCommand(file));
            exec(settings.get_string(KeyRunCommand), file)
                .then((command) => log(`command ${command} complete`))
                .catch((e) => notifyError(e));
        }
        const imgurEnabled = settings.get_boolean(KeyEnableUploadImgur);
        const imgurAutoUpload = settings.get_boolean(KeyImgurAutoUpload);
        if (imgurEnabled && imgurAutoUpload) {
            screenshot.imgurStartUpload();
        }
    }

    const PanelMenu = imports.ui.panelMenu;
    const PopupMenu = imports.ui.popupMenu;
    const Slider = imports.ui.slider;
    const DefaultIcon = 'camera-photo-symbolic';
    class CaptureDelayMenu extends PopupMenu.PopupMenuSection {
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
            this.delayValueMS = getExtension().settings.get_int(KeyCaptureDelay);
            this.slider = new Slider.Slider(this.scaleToSlider(this.delayValueMS));
            this.slider.connect('notify::value', this.onDragEnd.bind(this));
            this.sliderItem = new PopupMenu.PopupBaseMenuItem({ activate: false });
            this.sliderItem.add_child(this.slider);
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
                getExtension().settings.set_int(KeyCaptureDelay, newValue);
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
            this.image.content_gravity = Clutter.ContentGravity.RESIZE_ASPECT;
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
            this.updateVisibility();
        }
        updateVisibility() {
            const visible = !!this._screenshot;
            this.image.visible = visible;
            this.clear.visible = visible;
            this.copy.visible = visible;
            this.save.visible = visible;
            const imgurEnabled = getExtension().settings.get_boolean(KeyEnableUploadImgur);
            const imgurComplete = this._screenshot && this._screenshot.imgurUpload && this._screenshot.imgurUpload.responseData;
            this.imgurMenu.visible = visible && imgurEnabled;
            this.imgurUpload.visible = visible && imgurEnabled && !imgurComplete;
            this.imgurOpen.visible = visible && imgurEnabled && imgurComplete;
            this.imgurCopyLink.visible = visible && imgurEnabled && imgurComplete;
            this.imgurDelete.visible = visible && imgurEnabled && imgurComplete;
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
            this.image.content = image;
            this.image.height = 200;
        }
        setScreenshot(screenshot) {
            this._screenshot = screenshot;
            if (this._screenshot) {
                this.setImage(this._screenshot.pixbuf);
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
            this.screenshot.copyClipboard(getExtension().settings.get_string(KeyCopyButtonAction));
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
            this.panelButton.add_actor(icon);
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
                const item = new PopupMenu.PopupMenuItem(title);
                item.connect('activate', wrapNotifyError(async () => {
                    menu.close();
                    await onAction(action);
                }));
                menu.addMenuItem(item);
                return Object.assign(Object.assign({}, record), { [action]: item });
            }, {});
            menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
            menu.addMenuItem((this.captureDelayMenu = new CaptureDelayMenu()));
            menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
            this.screenshotSection = new ScreenshotSection(menu);
            menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
            // Settings can only be triggered via menu
            const settingsItem = new PopupMenu.PopupMenuItem(_('Settings'));
            settingsItem.connect('activate', () => {
                extensionUtils.openPrefs();
            });
            menu.addMenuItem(settingsItem);
            menu.connect('open-state-changed', () => {
                this.updateVisibility();
            });
        }
        onClick(_obj, evt) {
            // only override primary button behavior
            if (evt.get_button() !== Clutter.BUTTON_PRIMARY) {
                return;
            }
            const action = getExtension().settings.get_string(KeyClickAction);
            if (action === 'show-menu') {
                return;
            }
            this.panelButton.menu.close();
            wrapNotifyError(async () => onAction(action))();
        }
        updateVisibility() {
            const backend = getBackend(this.extension.settings);
            Object.entries(this.actionItems).forEach(([actionName, item]) => {
                item.visible = backend.supportsAction(actionName);
            });
            this.captureDelayMenu.visible = backend.supportsParam('delay-seconds');
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

    const Signals$2 = imports.signals;
    const Main$1 = imports.ui.main;
    class Extension {
        constructor() {
            this.signalSettings = [];
            this.settings = extensionUtils.getSettings();
            this.info = extensionUtils.getCurrentExtension();
            this.servicePromise = getServiceProxy(this.info.path);
            this.signalSettings.push(this.settings.connect('changed::' + KeyEnableIndicator, this.updateIndicator.bind(this)));
        }
        setKeybindings() {
            const bindingMode = Shell.ActionMode.NORMAL;
            for (const shortcut of KeyShortcuts) {
                Main$1.wm.addKeybinding(shortcut, this.settings, Meta.KeyBindingFlags.NONE, bindingMode, wrapNotifyError(() => onAction(shortcut.replace('shortcut-', ''))));
            }
        }
        unsetKeybindings() {
            for (const shortcut of KeyShortcuts) {
                Main$1.wm.removeKeybinding(shortcut);
            }
        }
        createIndicator() {
            if (!this.indicator) {
                this.indicator = new Indicator(this);
                Main$1.panel.addToStatusArea(IndicatorName, this.indicator.panelButton);
            }
        }
        destroyIndicator() {
            if (this.indicator) {
                this.indicator.destroy();
                this.indicator = undefined;
            }
        }
        updateIndicator() {
            if (this.settings.get_boolean(KeyEnableIndicator)) {
                this.createIndicator();
            }
            else {
                this.destroyIndicator();
            }
        }
        disable() {
            this.signalSettings.forEach((signal) => {
                this.settings.disconnect(signal);
            });
            this.disconnectAll();
        }
    }
    Signals$2.addSignalMethods(Extension.prototype);
    let extension;
    function getExtension() {
        if (!extension) {
            throw new Error('extension is not enabled');
        }
        return extension;
    }
    function enable() {
        extension = new Extension();
        extension.updateIndicator();
        extension.setKeybindings();
    }
    function disable() {
        if (extension) {
            extension.disable();
            extension.destroyIndicator();
            extension.unsetKeybindings();
            extension = null;
        }
    }

    function init() {
        extensionUtils.initTranslations();
        return { enable, disable };
    }

    return init;

}(imports.gi.Meta, imports.gi.Shell, imports.gi.Gio, imports.gi.GObject, imports.gi.GdkPixbuf, imports.gi.GLib, imports.gi.Gtk, imports.gi.St, imports.gi.Soup, imports.gi.Clutter, imports.gi.Cogl));
