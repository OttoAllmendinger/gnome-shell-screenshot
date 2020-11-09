var init = (function (Gio, Gtk, Meta, Shell, GLib, St, Cogl, Clutter, Gdk, GObject, GdkPixbuf, Soup) {
    'use strict';

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

    const versionArray = (v) => v.split('.').map(Number);
    const zip = function (a, b, defaultValue) {
        if (a.length === 0 && b.length === 0) {
            return [];
        }
        const headA = a.length > 0 ? a.shift() : defaultValue;
        const headB = b.length > 0 ? b.shift() : defaultValue;
        return [[headA, headB]].concat(zip(a, b, defaultValue));
    };
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
    if (window['ARGV'] && ARGV[0] == 'test') {
        log('zip("1.2.3", "1.2")=' + JSON.stringify(zip(versionArray('1.2.3'), versionArray('1.2'))));
        log('versionEqual("1.2.3", "1.2")=' + versionEqual('1.2.3', '1.2'));
        [
            ['1', '1', false],
            ['1', '1.0', false],
            ['1', '1.0.0', false],
            ['1.0', '1.0', false],
            ['1.2', '2.1', false],
            ['1.2.3', '2.1', false],
            ['2.1', '1.2', true],
            ['2.1.1', '1.2', true],
            ['1.2.1', '1.2.0', true],
            ['1.2.1', '1.2', true],
            ['1.2', '1.2.0', false],
            ['1.2', '1.2.1', false],
            ['3.32.2', '3.32', true],
            ['3.32', '3.32.2', false],
        ].forEach(([a, b, expected]) => {
            const actual = versionGreater(a, b);
            if (expected !== actual) {
                log(`ERROR: versionGreater("${a}", "${b}") is ${actual}, ` + `expected ${expected}`);
            }
        });
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

    /* -*- mode: js -*- */
    const Gettext = imports.gettext;
    const ExtensionUtils = imports.misc.extensionUtils;
    /**
     * initTranslations:
     * @domain: (optional): the gettext domain to use
     *
     * Initialize Gettext to load translations from extensionsdir/locale.
     * If @domain is not provided, it will be taken from metadata['gettext-domain']
     */
    function initTranslations(domain) {
        const extension = ExtensionUtils.getCurrentExtension();
        domain = domain || extension.metadata['gettext-domain'];
        // check if this extension was built with "make zip-file", and thus
        // has the locale files in a subfolder
        // otherwise assume that extension has been installed in the
        // same prefix as gnome-shell
        const localeDir = extension.dir.get_child('locale');
        if (localeDir.query_exists(null))
            Gettext.bindtextdomain(domain, localeDir.get_path());
        else
            logError('could not init translations: locale folder does not exist');
    }
    /**
     * getSettings:
     * @schema: (optional): the GSettings schema id
     *
     * Builds and return a GSettings schema for @schema, using schema files
     * in extensionsdir/schemas. If @schema is not provided, it is taken from
     * metadata['settings-schema'].
     */
    function getSettings(schema) {
        const extension = ExtensionUtils.getCurrentExtension();
        schema = schema || extension.metadata['settings-schema'];
        const GioSSS = Gio.SettingsSchemaSource;
        // check if this extension was built with "make zip-file", and thus
        // has the schema files in a subfolder
        // otherwise assume that extension has been installed in the
        // same prefix as gnome-shell (and therefore schemas are available
        // in the standard folders)
        const schemaDir = extension.dir.get_child('schemas');
        let schemaSource;
        if (schemaDir.query_exists(null))
            schemaSource = GioSSS.new_from_directory(schemaDir.get_path(), GioSSS.get_default(), false);
        else
            schemaSource = GioSSS.get_default();
        const schemaObj = schemaSource.lookup(schema, true);
        if (!schemaObj)
            throw new Error('Schema ' +
                schema +
                ' could not be found for extension ' +
                extension.metadata.uuid +
                '. Please check your installation.');
        return new Gio.Settings({ settings_schema: schemaObj });
    }

    const PanelMenu = imports.ui.panelMenu;
    const PopupMenu = imports.ui.popupMenu;
    const Slider = imports.ui.slider;
    const Gettext$1 = imports.gettext.domain('gnome-shell-screenshot');
    const _ = Gettext$1.gettext;
    const Local = imports.misc.extensionUtils.getCurrentExtension();
    const version = currentVersion();
    const DefaultIcon = 'camera-photo-symbolic';
    const settings = getSettings();
    // remove this when dropping support for < 3.33
    const getActorCompat = (obj) => (version.greaterEqual('3.33') ? obj : obj.actor);
    const getSliderSignalCompat = () => (version.greaterEqual('3.33') ? 'notify::value' : 'value-changed');
    const addActorCompat = (actor, child) => version.greaterEqual('3.36') ? actor.add_child(child) : actor.add(child, { expand: true });
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
            this.delayValueMS = settings.get_int(KeyCaptureDelay);
            this.slider = new Slider.Slider(this.scaleToSlider(this.delayValueMS));
            this.slider.connect(getSliderSignalCompat(), this.onDragEnd.bind(this));
            this.sliderItem = new PopupMenu.PopupBaseMenuItem({ activate: false });
            addActorCompat(getActorCompat(this.sliderItem), getActorCompat(this.slider));
            this.addMenuItem(this.sliderItem);
            this.delayInfoItem = new PopupMenu.PopupMenuItem('', { activate: false, hover: false, can_focus: false });
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
                settings.set_int(KeyCaptureDelay, newValue);
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
            this._image = new PopupMenu.PopupBaseMenuItem();
            getActorCompat(this._image).content_gravity = Clutter.ContentGravity.RESIZE_ASPECT;
            this._clear = new PopupMenu.PopupMenuItem(_('Clear'));
            this._copy = new PopupMenu.PopupMenuItem(_('Copy'));
            this._save = new PopupMenu.PopupMenuItem(_('Save As...'));
            this._image.connect('activate', this._onImage.bind(this));
            this._clear.connect('activate', this._onClear.bind(this));
            this._copy.connect('activate', this._onCopy.bind(this));
            this._save.connect('activate', this._onSave.bind(this));
            menu.addMenuItem(this._image);
            menu.addMenuItem(this._clear);
            menu.addMenuItem(this._copy);
            menu.addMenuItem(this._save);
            // IMGUR
            menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
            this._imgurMenu = new PopupMenu.PopupSubMenuMenuItem(_('Imgur'), false);
            this._imgurUpload = new PopupMenu.PopupMenuItem(_('Upload'));
            this._imgurOpen = new PopupMenu.PopupMenuItem(_('Open Link'));
            this._imgurCopyLink = new PopupMenu.PopupMenuItem(_('Copy Link'));
            this._imgurDelete = new PopupMenu.PopupMenuItem(_('Delete'));
            this._imgurUpload.connect('activate', this._onImgurUpload.bind(this));
            this._imgurOpen.connect('activate', this._onImgurOpen.bind(this));
            this._imgurCopyLink.connect('activate', this._onImgurCopyLink.bind(this));
            this._imgurDelete.connect('activate', this._onImgurDelete.bind(this));
            this._imgurMenu.menu.addMenuItem(this._imgurUpload);
            this._imgurMenu.menu.addMenuItem(this._imgurOpen);
            this._imgurMenu.menu.addMenuItem(this._imgurCopyLink);
            this._imgurMenu.menu.addMenuItem(this._imgurDelete);
            menu.addMenuItem(this._imgurMenu);
            menu.connect('open-state-changed', () => {
                this._updateVisibility();
            });
            this._updateVisibility();
        }
        _updateVisibility() {
            const visible = !!this._screenshot;
            getActorCompat(this._image).visible = visible;
            getActorCompat(this._clear).visible = visible;
            getActorCompat(this._copy).visible = visible;
            getActorCompat(this._save).visible = visible;
            const imgurEnabled = settings.get_boolean(KeyEnableUploadImgur);
            const imgurComplete = this._screenshot && this._screenshot.imgurUpload && this._screenshot.imgurUpload.responseData;
            getActorCompat(this._imgurMenu).visible = visible && imgurEnabled;
            getActorCompat(this._imgurUpload).visible = visible && imgurEnabled && !imgurComplete;
            getActorCompat(this._imgurOpen).visible = visible && imgurEnabled && imgurComplete;
            getActorCompat(this._imgurCopyLink).visible = visible && imgurEnabled && imgurComplete;
            getActorCompat(this._imgurDelete).visible = visible && imgurEnabled && imgurComplete;
        }
        _setImage(pixbuf) {
            const { width, height } = pixbuf;
            if (height == 0) {
                return;
            }
            const image = new Clutter.Image();
            const success = image.set_data(pixbuf.get_pixels(), pixbuf.get_has_alpha() ? Cogl.PixelFormat.RGBA_8888 : Cogl.PixelFormat.RGB_888, width, height, pixbuf.get_rowstride());
            if (!success) {
                throw Error('error creating Clutter.Image()');
            }
            getActorCompat(this._image).content = image;
            getActorCompat(this._image).height = 200;
        }
        setScreenshot(screenshot) {
            this._screenshot = screenshot;
            if (this._screenshot) {
                this._setImage(this._screenshot.gtkImage.get_pixbuf());
                this._screenshot.connect('imgur-upload', (obj, upload) => {
                    upload.connect('done', (_obj, _data) => {
                        this._updateVisibility();
                    });
                });
            }
            this._updateVisibility();
        }
        _onImage() {
            if (!this._screenshot) {
                throw new Error();
            }
            this._screenshot.launchOpen();
        }
        _onClear() {
            this.setScreenshot(undefined);
        }
        _onCopy() {
            if (!this._screenshot) {
                throw new Error();
            }
            this._screenshot.copyClipboard(settings.get_string(KeyCopyButtonAction));
        }
        _onSave() {
            if (!this._screenshot) {
                throw new Error();
            }
            this._screenshot.launchSave();
        }
        _onImgurUpload() {
            if (!this._screenshot) {
                throw new Error();
            }
            this._screenshot.imgurStartUpload();
        }
        _onImgurOpen() {
            if (!this._screenshot) {
                throw new Error();
            }
            this._screenshot.imgurOpenURL();
        }
        _onImgurCopyLink() {
            if (!this._screenshot) {
                throw new Error();
            }
            this._screenshot.imgurCopyURL();
        }
        _onImgurDelete() {
            if (!this._screenshot) {
                throw new Error();
            }
            this._screenshot.imgurDelete();
        }
    }
    class Indicator {
        constructor(extension) {
            this._extension = extension;
            this.panelButton = new PanelMenu.Button(null, IndicatorName);
            const icon = new St.Icon({
                icon_name: DefaultIcon,
                style_class: 'system-status-icon',
            });
            getActorCompat(this.panelButton).add_actor(icon);
            getActorCompat(this.panelButton).connect('button-press-event', this._onClick.bind(this));
            this._buildMenu();
        }
        _onClick(obj, evt) {
            // only override primary button behavior
            if (evt.get_button() !== Clutter.BUTTON_PRIMARY) {
                return;
            }
            const action = settings.get_string(KeyClickAction);
            if (action === 'show-menu') {
                return;
            }
            this.panelButton.menu.close();
            this._extension.onAction(action);
        }
        _buildMenu() {
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
                    this._extension.onAction(action);
                });
                menu.addMenuItem(item);
            });
            // Delay
            menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
            menu.addMenuItem(new CaptureDelayMenu());
            menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
            this._screenshotSection = new ScreenshotSection(menu);
            menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
            // Settings can only be triggered via menu
            const settingsItem = new PopupMenu.PopupMenuItem(_('Settings'));
            settingsItem.connect('activate', () => {
                openPrefs(version, Local.metadata.uuid, { shell: imports.gi.Shell });
            });
            menu.addMenuItem(settingsItem);
        }
        setScreenshot(screenshot) {
            if (!this._screenshotSection) {
                throw new Error();
            }
            this._screenshotSection.setScreenshot(screenshot);
        }
        destroy() {
            this.panelButton.destroy();
        }
    }

    /* global define, module */

    //  ValueError :: String -> Error
    var ValueError = function (message) {
      var err = new Error(message);
      err.name = 'ValueError';
      return err;
    };

    //  defaultTo :: a,a? -> a
    var defaultTo = function (x, y) {
      return y == null ? x : y;
    };

    // NOTE
    // this works around inconsistencies in the Regex implementations
    // of different gjs versions
    var isEmptyString = function (string) {
      return (string == "") || (string == null);
    };

    //  create :: Object -> String,*... -> String
    var create = function (transformers) {
      return function (template) {
        var args = Array.prototype.slice.call(arguments, 1);
        var idx = 0;
        var state = 'UNDEFINED';

        return template.replace(
          /([{}])\1|[{](.*?)(?:!(.+?))?[}]/g,
          function (match, literal, key, xf) {
            if (!isEmptyString(literal)) {
              return literal;
            }
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
            var value = defaultTo('', lookup(args, key.split('.')));

            if (isEmptyString(xf)) {
              return value;
            } else if (Object.prototype.hasOwnProperty.call(transformers, xf)) {
              return transformers[xf](value);
            } else {
              throw ValueError('no transformer named "' + xf + '"');
            }
          }
        );
      };
    };

    var lookup = function (obj, path) {
      if (!/^\d+$/.test(path[0])) {
        path = ['0'].concat(path);
      }
      for (var idx = 0; idx < path.length; idx += 1) {
        var key = path[idx];
        obj = typeof obj[key] === 'function' ? obj[key]() : obj[key];
      }
      return obj;
    };

    //  format :: String,*... -> String
    const format = create({});

    //  format.create :: Object -> String,*... -> String
    format.create = create;

    //  format.extend :: Object,Object -> ()
    format.extend = function (prototype, transformers) {
      var $format = create(transformers);
      prototype.format = function () {
        var args = Array.prototype.slice.call(arguments);
        args.unshift(this);
        return $format.apply(global, args);
      };
    };

    const Gettext$2 = imports.gettext.domain('gnome-shell-screenshot');
    const _$1 = Gettext$2.gettext;
    const parameters = ({ width, height }) => {
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
    };
    const get = (template, dim, n) => {
        const vars = parameters(dim).reduce((obj, [key, value]) => {
            obj[key] = value;
            return obj;
        }, {});
        const basename = format(template, vars);
        let sequence = '';
        if (n > 0) {
            sequence = '_' + String(n);
        }
        return basename + sequence + '.png';
    };
    const tempfilePattern = 'gnome-shell-screenshot-XXXXXX.png';
    const getTemp = function () {
        const [, fileName] = GLib.file_open_tmp(tempfilePattern);
        return fileName;
    };

    const Signals = imports.signals;
    const Mainloop = imports.mainloop;
    const Main = imports.ui.main;
    const Gettext$3 = imports.gettext.domain('gnome-shell-screenshot');
    const _$2 = Gettext$3.gettext;
    const ExtensionUtils$1 = imports.misc.extensionUtils;
    const Local$1 = ExtensionUtils$1.getCurrentExtension();
    const version$1 = currentVersion();
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
        argv = ['gjs', Local$1.path + '/auxhelper.js', '--filename', fileName, ...argv];
        // log(argv.join(' '));
        const [success, pid] = GLib.spawn_async(null /* pwd */, argv, null /* envp */, GLib.SpawnFlags.SEARCH_PATH | GLib.SpawnFlags.DO_NOT_REAP_CHILD, null /* child_setup */);
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
            Main.uiGroup.add_actor(this._container);
            if (Main.pushModal(this._container)) {
                this._signalCapturedEvent = shellGlobal.stage.connect('captured-event', this._onCaptureEvent.bind(this));
                this._setCaptureCursor();
            }
            else {
                log('Main.pushModal() === false');
            }
        }
        _setCursorCompat(v) {
            if (version$1.greaterEqual('3.29')) {
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
            Main.uiGroup.remove_actor(this._container);
            Main.popModal(this._container);
            this._container.destroy();
            this.emit('stop');
            this.disconnectAll();
        }
    }
    Signals.addSignalMethods(Capture.prototype);
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
                this.emit('error', _$2('selected region was too small - please select a larger area'));
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
                Main.activateWindow(win.get_meta_window());
                Mainloop.idle_add(() => makeWindowScreenshot(emitScreenshotOnSuccess(this)));
            });
        }
    }
    Signals.addSignalMethods(SelectionWindow.prototype);
    class SelectionDesktop {
        constructor(options) {
            this._options = options;
            Mainloop.timeout_add(this._options.captureDelay, () => {
                makeDesktopScreenshot(emitScreenshotOnSuccess(this));
                this.emit('stop');
            });
        }
    }
    Signals.addSignalMethods(SelectionDesktop.prototype);

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

    const ExtensionUtils$2 = imports.misc.extensionUtils;
    const Local$2 = ExtensionUtils$2.getCurrentExtension();
    // width and height of thumbnail
    const size = 64;
    const emptyImagePath = Local$2.path + '/empty64.png';
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

    const Signals$1 = imports.signals;
    const Main$1 = imports.ui.main;
    const MessageTray = imports.ui.messageTray;
    const Gettext$4 = imports.gettext.domain('gnome-shell-screenshot');
    const _$3 = Gettext$4.gettext;
    const version$2 = currentVersion();
    const NotificationIcon = 'camera-photo-symbolic';
    const NotificationSourceName = 'Screenshot Tool';
    const ICON_SIZE = 64;
    const settings$1 = getSettings();
    const getSource = () => {
        const source = new MessageTray.Source(NotificationSourceName, NotificationIcon);
        Main$1.messageTray.add(source);
        return source;
    };
    const registerClassCompat = (cls) => {
        if (version$2.greaterEqual('3.36')) {
            return GObject.registerClass(cls);
        }
        else {
            Signals$1.addSignalMethods(cls.prototype);
            return cls;
        }
    };
    const showNotificationCompat = (source, notification) => {
        if (version$2.greaterEqual('3.36')) {
            return source.showNotification(notification);
        }
        else {
            return source.notify(notification);
        }
    };
    const Notification = registerClassCompat(class Notification extends MessageTray.Notification {
        static _title() {
            return _$3('New Screenshot');
        }
        static _banner(obj) {
            const { gtkImage } = obj;
            const { width, height } = gtkImage.get_pixbuf();
            const banner = _$3('Size:') + ' ' + width + 'x' + height + '.';
            return banner;
        }
        static ctrArgs(source, screenshot) {
            return [
                source,
                Notification._title(),
                Notification._banner(screenshot),
                { gicon: getIcon(screenshot.srcFile.get_path()) },
            ];
        }
        constructor(source, screenshot) {
            super(...Notification.ctrArgs(source, screenshot));
            this.initCompat(source, screenshot);
        }
        _init(source, screenshot) {
            super._init(...Notification.ctrArgs(source, screenshot));
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
            b.addAction(_$3('Copy'), this._onCopy.bind(this));
            b.addAction(_$3('Save'), this._onSave.bind(this));
            if (settings$1.get_boolean(KeyEnableUploadImgur)) {
                if (settings$1.get_boolean(KeyImgurAutoUpload)) {
                    b.addAction(_$3('Uploading To Imgur...'), () => {
                        /* noop */
                    });
                }
                else {
                    b.addAction(_$3('Upload To Imgur'), this._onUpload.bind(this));
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
        static ctrArgs(source, message) {
            return [source, _$3('Error'), String(message), { secondaryGIcon: new Gio.ThemedIcon({ name: 'dialog-error' }) }];
        }
        constructor(source, message) {
            super(...ErrorNotification.ctrArgs(source, message));
        }
        _init(source, message) {
            super._init(...ErrorNotification.ctrArgs(source, message));
        }
    });
    const ImgurNotification = registerClassCompat(class ImgurNotification extends MessageTray.Notification {
        constructor(source, screenshot) {
            super(source, _$3('Imgur Upload'));
            this.initCompat(source, screenshot);
        }
        _init(source, screenshot) {
            super._init(source, _$3('Imgur Upload'));
            this.initCompat(source, screenshot);
        }
        initCompat(source, screenshot) {
            this.setForFeedback(true);
            this.setResident(true);
            this.connect('activated', this._onActivated.bind(this));
            this._screenshot = screenshot;
            this._upload = screenshot.imgurUpload;
            this._upload.connect('progress', (obj, bytes, total) => {
                this.update(_$3('Imgur Upload'), '' + Math.floor(100 * (bytes / total)) + '%');
            });
            this._upload.connect('error', (obj, msg) => {
                this.update(_$3('Imgur Upload Failed'), msg);
            });
            this._upload.connect('done', () => {
                this.update(_$3('Imgur Upload Successful'), this._upload.responseData.link);
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
            this._copyButton = b.addAction(_$3('Copy Link'), this._onCopy.bind(this));
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
    const notifyScreenshot = (screenshot) => {
        const source = getSource();
        const notification = new Notification(source, screenshot);
        showNotificationCompat(source, notification);
    };
    const notifyError = (message) => {
        const source = getSource();
        const notification = new ErrorNotification(source, message);
        showNotificationCompat(source, notification);
    };
    const notifyImgurUpload = (screenshot) => {
        const source = getSource();
        const notification = new ImgurNotification(source, screenshot);
        showNotificationCompat(source, notification);
    };

    const Signals$2 = imports.signals;
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
    Signals$2.addSignalMethods(Upload.prototype);

    // props to
    const Signals$3 = imports.signals;
    const Main$2 = imports.ui.main;
    const Util = imports.misc.util;
    const Local$3 = imports.misc.extensionUtils.getCurrentExtension();
    const settings$2 = getSettings();
    const getSelectionOptions = () => {
        const captureDelay = settings$2.get_int(KeyCaptureDelay);
        return { captureDelay };
    };
    class Screenshot {
        constructor(filePath) {
            if (!filePath) {
                throw new Error(`need argument ${filePath}`);
            }
            this.gtkImage = new Gtk.Image({ file: filePath });
            this.srcFile = Gio.File.new_for_path(filePath);
            this.dstFile = null;
        }
        _nextFile() {
            const dir = expand(settings$2.get_string(KeySaveLocation));
            const filenameTemplate = settings$2.get_string(KeyFilenameTemplate);
            const { width, height } = this.gtkImage.get_pixbuf();
            const dimensions = { width, height };
            for (let n = 0;; n++) {
                const newFilename = get(filenameTemplate, dimensions, n);
                const newPath = join(dir, newFilename);
                const file = Gio.File.new_for_path(newPath);
                const exists = file.query_exists(/* cancellable */ null);
                if (!exists) {
                    return file;
                }
            }
        }
        autosave() {
            const dstFile = this._nextFile();
            this.srcFile.copy(dstFile, Gio.FileCopyFlags.NONE, null, null);
            this.dstFile = dstFile;
        }
        launchOpen() {
            const context = Shell.Global.get().create_app_launch_context(0, -1);
            const file = this.dstFile || this.srcFile;
            Gio.AppInfo.launch_default_for_uri(file.get_uri(), context);
        }
        launchSave() {
            const newFile = this._nextFile();
            Util.spawn([
                'gjs',
                Local$3.path + '/saveDlg.js',
                ...[this.srcFile.get_path(), expand('$PICTURES'), newFile.get_basename(), Local$3.dir.get_path()].map(encodeURIComponent),
            ]);
        }
        copyClipboard(action) {
            if (action === ClipboardActions.NONE) {
                return;
            }
            else if (action === ClipboardActions.SET_IMAGE_DATA) {
                return setImage(this.gtkImage);
            }
            else if (action === ClipboardActions.SET_LOCAL_PATH) {
                if (this.dstFile) {
                    return setText(this.dstFile.get_path());
                }
                else if (this.srcFile) {
                    return setText(this.srcFile.get_path());
                }
                return logError(new Error('no dstFile and no srcFile'));
            }
            logError(new Error(`unknown action ${action}`));
        }
        imgurStartUpload() {
            this.imgurUpload = new Upload(this.srcFile);
            this.imgurUpload.connect('error', (obj, err) => {
                logError(err);
                notifyError(String(err));
            });
            if (settings$2.get_boolean(KeyImgurEnableNotification)) {
                notifyImgurUpload(this);
            }
            this.emit('imgur-upload', this.imgurUpload);
            this.imgurUpload.connect('done', () => {
                if (settings$2.get_boolean(KeyImgurAutoCopyLink)) {
                    this.imgurCopyURL();
                }
                if (settings$2.get_boolean(KeyImgurAutoOpenLink)) {
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
                logError(new Error('no completed imgur upload'));
                return;
            }
            const context = Shell.Global.get().create_app_launch_context(0, -1);
            const uri = this.imgurUpload.responseData.link;
            if (!uri) {
                logError(new Error('no uri in responseData'));
                return;
            }
            Gio.AppInfo.launch_default_for_uri(uri, context);
        }
        imgurCopyURL() {
            if (!this.isImgurUploadComplete()) {
                logError(new Error('no completed imgur upload'));
                return;
            }
            const uri = this.imgurUpload.responseData.link;
            setText(uri);
        }
        imgurDelete() {
            if (!this.isImgurUploadComplete()) {
                logError(new Error('no completed imgur upload'));
                return;
            }
            this.imgurUpload.connect('deleted', () => {
                this.imgurUpload = undefined;
            });
            this.imgurUpload.deleteRemote();
        }
    }
    Signals$3.addSignalMethods(Screenshot.prototype);
    class Extension {
        constructor() {
            this._signalSettings = [];
            initTranslations();
        }
        _setKeybindings() {
            const bindingMode = Shell.ActionMode.NORMAL;
            for (const shortcut of KeyShortcuts) {
                Main$2.wm.addKeybinding(shortcut, settings$2, Meta.KeyBindingFlags.NONE, bindingMode, this.onAction.bind(this, shortcut.replace('shortcut-', '')));
            }
        }
        _unsetKeybindings() {
            for (const shortcut of KeyShortcuts) {
                Main$2.wm.removeKeybinding(shortcut);
            }
        }
        _createIndicator() {
            if (!this._indicator) {
                this._indicator = new Indicator(this);
                Main$2.panel.addToStatusArea(IndicatorName, this._indicator.panelButton);
            }
        }
        _destroyIndicator() {
            if (this._indicator) {
                this._indicator.destroy();
                this._indicator = undefined;
            }
        }
        _updateIndicator() {
            if (settings$2.get_boolean(KeyEnableIndicator)) {
                this._createIndicator();
            }
            else {
                this._destroyIndicator();
            }
        }
        onAction(action) {
            const dispatch = {
                'select-area': this._selectArea.bind(this),
                'select-window': this._selectWindow.bind(this),
                'select-desktop': this._selectDesktop.bind(this),
            };
            const f = dispatch[action] ||
                function () {
                    throw new Error('unknown action: ' + action);
                };
            try {
                f();
            }
            catch (ex) {
                notifyError(ex.toString());
            }
        }
        _startSelection(selection) {
            if (this._selection) {
                // prevent reentry
                log('_startSelection() error: selection already in progress');
                return;
            }
            this._selection = selection;
            if (!this._selection) {
                throw new Error('selection undefined');
            }
            this._selection.connect('screenshot', this._onScreenshot.bind(this));
            this._selection.connect('error', (selection, message) => {
                notifyError(message);
            });
            this._selection.connect('stop', () => {
                this._selection = undefined;
            });
        }
        _selectArea() {
            this._startSelection(new SelectionArea(getSelectionOptions()));
        }
        _selectWindow() {
            this._startSelection(new SelectionWindow(getSelectionOptions()));
        }
        _selectDesktop() {
            this._startSelection(new SelectionDesktop(getSelectionOptions()));
        }
        _onScreenshot(selection, filePath) {
            const screenshot = new Screenshot(filePath);
            if (settings$2.get_boolean(KeySaveScreenshot)) {
                screenshot.autosave();
            }
            screenshot.copyClipboard(settings$2.get_string(KeyClipboardAction));
            if (settings$2.get_boolean(KeyEnableNotification)) {
                notifyScreenshot(screenshot);
            }
            if (this._indicator) {
                this._indicator.setScreenshot(screenshot);
            }
            const imgurEnabled = settings$2.get_boolean(KeyEnableUploadImgur);
            const imgurAutoUpload = settings$2.get_boolean(KeyImgurAutoUpload);
            if (imgurEnabled && imgurAutoUpload) {
                screenshot.imgurStartUpload();
            }
        }
        destroy() {
            this._destroyIndicator();
            this._unsetKeybindings();
            this._signalSettings.forEach((signal) => {
                settings$2.disconnect(signal);
            });
            this.disconnectAll();
        }
        enable() {
            this._signalSettings.push(settings$2.connect('changed::' + KeyEnableIndicator, this._updateIndicator.bind(this)));
            this._updateIndicator();
            this._setKeybindings();
        }
        disable() {
            this.destroy();
        }
    }
    Signals$3.addSignalMethods(Extension.prototype);

    function index () {
        return new Extension();
    }

    return index;

}(imports.gi.Gio, imports.gi.Gtk, imports.gi.Meta, imports.gi.Shell, imports.gi.GLib, imports.gi.St, imports.gi.Cogl, imports.gi.Clutter, imports.gi.Gdk, imports.gi.GObject, imports.gi.GdkPixbuf, imports.gi.Soup));
