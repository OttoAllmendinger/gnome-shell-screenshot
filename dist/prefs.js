var prefs = (function (Gtk, GLib, GObject, Gio) {
    'use strict';

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

    const KeyEnableIndicator = 'enable-indicator';
    const KeyEnableNotification = 'enable-notification';
    // See schemas/org.gnome.shell.extensions.screenshot.gschema.xml
    const KeyClickAction = 'click-action';
    const ClickActions = {
        SHOW_MENU: 0,
        SELECT_AREA: 1,
        SELECT_WINDOW: 2,
        SELECT_DESKTOP: 3,
    };
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

    const Gettext = imports.gettext.domain('gnome-shell-screenshot');
    const _ = Gettext.gettext;
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
    };
    const tooltipText = (dim) => {
        const head = [_('Parameters:')];
        return parameters(dim)
            .reduce((arr, [key, _value, description]) => {
            arr.push(key + '\t' + description);
            return arr;
        }, head)
            .join('\n');
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

    /* -*- mode: js -*- */
    const Gettext$1 = imports.gettext;
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
            Gettext$1.bindtextdomain(domain, localeDir.get_path());
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

    // accelerator setting based on
    const Gettext$2 = imports.gettext.domain('gnome-shell-screenshot');
    const _$1 = Gettext$2.gettext;
    let _settings;
    const buildHbox = () => {
        return new Gtk.Box({
            orientation: Gtk.Orientation.HORIZONTAL,
            margin_top: 5,
            expand: false,
        });
    };
    const buildConfigSwitch = (label, configKey) => {
        const hbox = buildHbox();
        const gtkLabel = new Gtk.Label({
            label,
            xalign: 0,
            expand: true,
        });
        const gtkSwitch = new Gtk.Switch();
        gtkSwitch.connect('notify::active', (button) => {
            _settings.set_boolean(configKey, button.active);
        });
        gtkSwitch.active = _settings.get_boolean(configKey);
        hbox.add(gtkLabel);
        hbox.add(gtkSwitch);
        return {
            hbox,
            gtkLabel,
            gtkSwitch,
        };
    };
    const bindSensitivity = (source, target) => {
        const set = () => {
            target.set_sensitive(source.active);
        };
        source.connect('notify::active', set);
        set();
    };
    class BaseScreenshotToolSettingsWidget extends Gtk.Box {
        _init(params) {
            super._init(params);
            this._initLayout();
        }
        _initLayout() {
            const notebook = new Gtk.Notebook();
            let page, label;
            page = this._makePrefsIndicator();
            label = new Gtk.Label({ label: _$1('Indicator') });
            notebook.append_page(page, label);
            page = this._makePrefsStorage();
            label = new Gtk.Label({ label: _$1('Storage') });
            notebook.append_page(page, label);
            page = this._makePrefsUploadImgur();
            label = new Gtk.Label({ label: _$1('Imgur Upload (Beta)') });
            notebook.append_page(page, label);
            page = this._makePrefsKeybindings();
            label = new Gtk.Label({ label: _$1('Keybindings') });
            notebook.append_page(page, label);
            this.add(notebook);
        }
        _makePrefsIndicator() {
            const prefs = new Gtk.Box({
                orientation: Gtk.Orientation.VERTICAL,
                margin: 20,
                margin_top: 10,
                expand: false,
            });
            let hbox;
            /* Show indicator [on|off] */
            const switchShowIndicator = buildConfigSwitch(_$1('Show Indicator'), KeyEnableIndicator);
            prefs.add(switchShowIndicator.hbox);
            /* Show notification [on|off] */
            const switchShowNotification = buildConfigSwitch(_$1('Show Notification After Capture'), KeyEnableNotification);
            prefs.add(switchShowNotification.hbox);
            /* Default click action [dropdown] */
            hbox = buildHbox();
            const labelDefaultClickAction = new Gtk.Label({
                label: _$1('Primary Button'),
                xalign: 0,
                expand: true,
            });
            const clickActionOptions = [
                [_$1('Select Area'), ClickActions.SELECT_AREA],
                [_$1('Select Window'), ClickActions.SELECT_WINDOW],
                [_$1('Select Desktop'), ClickActions.SELECT_DESKTOP],
                [_$1('Show Menu'), ClickActions.SHOW_MENU],
            ];
            const currentClickAction = _settings.get_enum(KeyClickAction);
            const comboBoxDefaultClickAction = this._getComboBox(clickActionOptions, GObject.TYPE_INT, currentClickAction, (value) => _settings.set_enum(KeyClickAction, value));
            hbox.add(labelDefaultClickAction);
            hbox.add(comboBoxDefaultClickAction);
            prefs.add(hbox);
            /* Clipboard Action [dropdown] */
            const [optionNothing, optionImageData, optionLocalPath] = [
                [_$1('Nothing'), ClipboardActions.NONE],
                [_$1('Image Data'), ClipboardActions.SET_IMAGE_DATA],
                [_$1('Local Path'), ClipboardActions.SET_LOCAL_PATH],
            ];
            const clipboardActionDropdown = (label, { options, configKey }) => {
                hbox = buildHbox();
                const labelAutoCopy = new Gtk.Label({
                    label,
                    xalign: 0,
                    expand: true,
                });
                const currentValue = _settings.get_string(configKey);
                const comboBoxClipboardContent = this._getComboBox(options, GObject.TYPE_STRING, currentValue, (value) => _settings.set_string(configKey, value));
                hbox.add(labelAutoCopy);
                hbox.add(comboBoxClipboardContent);
                prefs.add(hbox);
            };
            clipboardActionDropdown(_$1('Copy Button'), {
                options: [optionImageData, optionLocalPath],
                configKey: KeyCopyButtonAction,
            });
            clipboardActionDropdown(_$1('Auto-Copy to Clipboard'), {
                options: [optionNothing, optionImageData, optionLocalPath],
                configKey: KeyClipboardAction,
            });
            return prefs;
        }
        _makePrefsStorage() {
            const prefs = new Gtk.Box({
                orientation: Gtk.Orientation.VERTICAL,
                margin: 20,
                margin_top: 10,
                expand: false,
            });
            let hbox;
            /* Save Screenshot [on|off] */
            const switchSaveScreenshot = buildConfigSwitch(_$1('Auto-Save Screenshot'), KeySaveScreenshot);
            prefs.add(switchSaveScreenshot.hbox);
            /* Save Location [filechooser] */
            hbox = buildHbox();
            const labelSaveLocation = new Gtk.Label({
                label: _$1('Save Location'),
                xalign: 0,
                expand: true,
            });
            const chooserSaveLocation = new Gtk.FileChooserButton({
                title: _$1('Select'),
                local_only: true,
            });
            chooserSaveLocation.set_action(Gtk.FileChooserAction.SELECT_FOLDER);
            try {
                const saveLocation = expand(_settings.get_string(KeySaveLocation));
                chooserSaveLocation.set_filename(saveLocation);
            }
            catch (e) {
                logError(e);
            }
            chooserSaveLocation.connect('file-set', () => {
                const uri = chooserSaveLocation.get_uri();
                if (!uri) {
                    throw new Error();
                }
                const [filename, err] = GLib.filename_from_uri(uri);
                if (err) {
                    throw new Error("can't resolve uri");
                }
                _settings.set_string(KeySaveLocation, filename);
            });
            bindSensitivity(switchSaveScreenshot.gtkSwitch, labelSaveLocation);
            bindSensitivity(switchSaveScreenshot.gtkSwitch, chooserSaveLocation);
            hbox.add(labelSaveLocation);
            hbox.add(chooserSaveLocation);
            prefs.add(hbox);
            /* Filename */
            hbox = buildHbox();
            const [defaultTemplate] = _settings.get_default_value(KeyFilenameTemplate).get_string();
            const mockDimensions = { width: 800, height: 600 };
            const labelFilenameTemplate = new Gtk.Label({
                label: _$1('Default Filename'),
                xalign: 0,
                expand: true,
            });
            const inputFilenameTemplate = new Gtk.Entry({
                expand: true,
                tooltip_text: tooltipText(mockDimensions),
                secondary_icon_name: 'document-revert',
            });
            hbox.add(labelFilenameTemplate);
            hbox.add(inputFilenameTemplate);
            inputFilenameTemplate.text = _settings.get_string(KeyFilenameTemplate);
            prefs.add(hbox);
            /* Filename Preview */
            hbox = buildHbox();
            const labelPreview = new Gtk.Label({
                label: _$1('Preview'),
                expand: true,
                xalign: 0,
            });
            const textPreview = new Gtk.Label({
                xalign: 0,
            });
            const setPreview = (tpl) => {
                try {
                    if (tpl == '') {
                        return;
                    }
                    inputFilenameTemplate.get_style_context().remove_class('error');
                    const label = get(tpl, mockDimensions);
                    textPreview.label = label;
                    _settings.set_string(KeyFilenameTemplate, tpl);
                }
                catch (e) {
                    logError(e);
                    textPreview.label = '';
                    inputFilenameTemplate.get_style_context().add_class('error');
                }
            };
            ['inserted-text', 'deleted-text'].forEach((name) => {
                inputFilenameTemplate.get_buffer().connect(name, ({ text }) => {
                    setPreview(text);
                });
            });
            inputFilenameTemplate.connect('icon-press', () => {
                inputFilenameTemplate.text = defaultTemplate;
            });
            setPreview(inputFilenameTemplate.text);
            hbox.add(labelPreview);
            hbox.add(textPreview);
            prefs.add(hbox);
            return prefs;
        }
        _makePrefsUploadImgur() {
            const prefs = new Gtk.Box({
                orientation: Gtk.Orientation.VERTICAL,
                margin: 20,
                margin_top: 10,
                expand: false,
            });
            /* Enable Imgur Upload [on|off] */
            const configSwitchEnable = buildConfigSwitch(_$1('Enable Imgur Upload'), KeyEnableUploadImgur);
            prefs.add(configSwitchEnable.hbox);
            /* Enable Upload Notification [on|off] */
            const configSwitchEnableNotification = buildConfigSwitch(_$1('Show Upload Notification'), KeyImgurEnableNotification);
            prefs.add(configSwitchEnableNotification.hbox);
            bindSensitivity(configSwitchEnable.gtkSwitch, configSwitchEnableNotification.gtkLabel);
            bindSensitivity(configSwitchEnable.gtkSwitch, configSwitchEnableNotification.gtkSwitch);
            /* Auto-Upload After Capture [on|off] */
            const configSwitchUploadOnCapture = buildConfigSwitch(_$1('Auto-Upload After Capture'), KeyImgurAutoUpload);
            bindSensitivity(configSwitchEnable.gtkSwitch, configSwitchUploadOnCapture.gtkLabel);
            bindSensitivity(configSwitchEnable.gtkSwitch, configSwitchUploadOnCapture.gtkSwitch);
            prefs.add(configSwitchUploadOnCapture.hbox);
            /* Auto-Copy Link After Upload [on|off] */
            const configSwitchCopyLinkOnUpload = buildConfigSwitch(_$1('Auto-Copy Link After Upload'), KeyImgurAutoCopyLink);
            bindSensitivity(configSwitchEnable.gtkSwitch, configSwitchCopyLinkOnUpload.gtkLabel);
            bindSensitivity(configSwitchEnable.gtkSwitch, configSwitchCopyLinkOnUpload.gtkSwitch);
            prefs.add(configSwitchCopyLinkOnUpload.hbox);
            /* Auto-Open Link After Upload [on|off] */
            const configSwitchOpenLinkOnUpload = buildConfigSwitch(_$1('Auto-Open Link After Upload'), KeyImgurAutoOpenLink);
            bindSensitivity(configSwitchEnable.gtkSwitch, configSwitchOpenLinkOnUpload.gtkLabel);
            bindSensitivity(configSwitchEnable.gtkSwitch, configSwitchOpenLinkOnUpload.gtkSwitch);
            prefs.add(configSwitchOpenLinkOnUpload.hbox);
            return prefs;
        }
        _makePrefsKeybindings() {
            const model = new Gtk.ListStore();
            model.set_column_types([GObject.TYPE_STRING, GObject.TYPE_STRING, GObject.TYPE_INT, GObject.TYPE_INT]);
            const bindings = [
                ['shortcut-select-area', _$1('Select area')],
                ['shortcut-select-window', _$1('Select window')],
                ['shortcut-select-desktop', _$1('Select whole desktop')],
            ];
            for (const [name, description] of bindings) {
                log('binding: ' + name + ' description: ' + description);
                const binding = _settings.get_strv(name)[0];
                let key, mods;
                if (binding) {
                    [key, mods] = Gtk.accelerator_parse(binding);
                }
                else {
                    [key, mods] = [0, 0];
                }
                const row = model.append();
                model.set(row, [0, 1, 2, 3], [name, description, mods, key]);
            }
            const treeview = new Gtk.TreeView({
                expand: true,
                model,
            });
            let cellrend = new Gtk.CellRendererText();
            let col = new Gtk.TreeViewColumn({
                title: _$1('Keyboard Shortcut'),
                expand: true,
            });
            col.pack_start(cellrend, true);
            col.add_attribute(cellrend, 'text', 1);
            treeview.append_column(col);
            cellrend = new Gtk.CellRendererAccel({
                editable: true,
                accel_mode: Gtk.CellRendererAccelMode.GTK,
            });
            cellrend.connect('accel-edited', (rend, iter, key, mods) => {
                const value = Gtk.accelerator_name(key, mods);
                const [succ, iterator] = model.get_iter_from_string(iter);
                if (!succ) {
                    throw new Error('Error updating keybinding');
                }
                const name = model.get_value(iterator, 0);
                model.set(iterator, [2, 3], [mods, key]);
                _settings.set_strv(name, [value]);
            });
            cellrend.connect('accel-cleared', (rend, iter, _key, _mods) => {
                const [succ, iterator] = model.get_iter_from_string(iter);
                if (!succ) {
                    throw new Error('Error clearing keybinding');
                }
                const name = model.get_value(iterator, 0);
                model.set(iterator, [2, 3], [0, 0]);
                _settings.set_strv(name, []);
            });
            col = new Gtk.TreeViewColumn({ title: _$1('Modify'), min_width: 200 });
            col.pack_end(cellrend, false);
            col.add_attribute(cellrend, 'accel-mods', 2);
            col.add_attribute(cellrend, 'accel-key', 3);
            treeview.append_column(col);
            return treeview;
        }
        _getComboBox(options, valueType, defaultValue, callback) {
            const model = new Gtk.ListStore();
            const Columns = { LABEL: 0, VALUE: 1 };
            model.set_column_types([GObject.TYPE_STRING, valueType]);
            const comboBox = new Gtk.ComboBox({ model });
            const renderer = new Gtk.CellRendererText();
            comboBox.pack_start(renderer, true);
            comboBox.add_attribute(renderer, 'text', 0);
            for (const [label, value] of options) {
                let iter;
                model.set((iter = model.append()), [Columns.LABEL, Columns.VALUE], [label, value]);
                if (value === defaultValue) {
                    comboBox.set_active_iter(iter);
                }
            }
            comboBox.connect('changed', (_entry) => {
                const [success, iter] = comboBox.get_active_iter();
                if (!success) {
                    return;
                }
                const value = model.get_value(iter, Columns.VALUE);
                callback(value);
            });
            return comboBox;
        }
    }
    const ScreenshotToolSettingsWidget = GObject.registerClass({
        Name: 'ScreenshotToolSettingsWidget',
        GTypeName: 'ScreenshotToolSettingsWidget',
        Extends: Gtk.Box,
    }, BaseScreenshotToolSettingsWidget);
    function init() {
        _settings = getSettings();
        initTranslations();
    }
    function buildPrefsWidget() {
        const widget = new ScreenshotToolSettingsWidget();
        widget.show_all();
        return widget;
    }
    var prefs = { init, buildPrefsWidget };

    return prefs;

}(imports.gi.Gtk, imports.gi.GLib, imports.gi.GObject, imports.gi.Gio));
var init = prefs.init;
var buildPrefsWidget = prefs.buildPrefsWidget;
