var prefs = (function (Gtk, GObject, Gio, GLib) {
    'use strict';

    var ExtensionUtils = imports.misc.extensionUtils;

    // eslint-disable-next-line @typescript-eslint/ban-types
    function registerClass(meta, cls) {
        return GObject.registerClass(meta, cls);
    }
    function extendGObject(cls, parent) {
        return registerClass({
            Name: cls.name,
            GTypeName: cls.name,
            Extends: parent,
        }, cls);
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
    const KeyEffectRescale = 'effect-rescale';
    const KeyEnableRunCommand = 'enable-run-command';
    const KeyRunCommand = 'run-command';

    function bindSensitivity(source, target) {
        const set = () => {
            target.set_sensitive(source.active);
        };
        source.connect('notify::active', set);
        set();
    }
    function buildPage() {
        return new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            margin: 20,
            margin_top: 10,
            expand: false,
        });
    }
    function buildHbox() {
        return new Gtk.Box({
            orientation: Gtk.Orientation.HORIZONTAL,
            margin_top: 5,
            expand: false,
            hexpand: false,
            vexpand: false,
            margin_bottom: 10,
        });
    }
    function getComboBox(options, valueType, defaultValue, callback) {
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
    function buildLabel(label) {
        return new Gtk.Label({
            label,
            xalign: 0,
            expand: true,
        });
    }
    function buildConfigRow(label, widget) {
        if (typeof label === 'string') {
            return buildConfigRow(buildLabel(label), widget);
        }
        const hbox = buildHbox();
        hbox.add(label);
        hbox.add(widget);
        return hbox;
    }
    function buildConfigSwitch(settings, label, configKey) {
        const gtkSwitch = new Gtk.Switch();
        gtkSwitch.connect('notify::active', (button) => {
            settings.set_boolean(configKey, button.active);
        });
        gtkSwitch.active = settings.get_boolean(configKey);
        return {
            hbox: buildConfigRow(label, gtkSwitch),
            gtkSwitch,
        };
    }

    function getPage(settings) {
        const prefs = buildPage();
        /* Show indicator [on|off] */
        const switchShowIndicator = buildConfigSwitch(settings, _('Show Indicator'), KeyEnableIndicator);
        prefs.add(switchShowIndicator.hbox);
        /* Show notification [on|off] */
        const switchShowNotification = buildConfigSwitch(settings, _('Show Notification After Capture'), KeyEnableNotification);
        prefs.add(switchShowNotification.hbox);
        /* Default click action [dropdown] */
        const labelDefaultClickAction = _('Primary Button');
        const clickActionOptions = [
            [_('Select Area'), ClickActions.SELECT_AREA],
            [_('Select Window'), ClickActions.SELECT_WINDOW],
            [_('Select Desktop'), ClickActions.SELECT_DESKTOP],
            [_('Show Menu'), ClickActions.SHOW_MENU],
        ];
        const currentClickAction = settings.get_enum(KeyClickAction);
        const comboBoxDefaultClickAction = getComboBox(clickActionOptions, GObject.TYPE_INT, currentClickAction, (value) => settings.set_enum(KeyClickAction, value));
        prefs.add(buildConfigRow(labelDefaultClickAction, comboBoxDefaultClickAction));
        /* Clipboard Action [dropdown] */
        const [optionNothing, optionImageData, optionLocalPath] = [
            [_('Nothing'), ClipboardActions.NONE],
            [_('Image Data'), ClipboardActions.SET_IMAGE_DATA],
            [_('Local Path'), ClipboardActions.SET_LOCAL_PATH],
        ];
        const clipboardActionDropdown = (label, { options, configKey }) => {
            const currentValue = settings.get_string(configKey);
            const comboBoxClipboardContent = getComboBox(options, GObject.TYPE_STRING, currentValue, (value) => settings.set_string(configKey, value));
            prefs.add(buildConfigRow(label, comboBoxClipboardContent));
        };
        clipboardActionDropdown(_('Copy Button'), {
            options: [optionImageData, optionLocalPath],
            configKey: KeyCopyButtonAction,
        });
        clipboardActionDropdown(_('Auto-Copy to Clipboard'), {
            options: [optionNothing, optionImageData, optionLocalPath],
            configKey: KeyClipboardAction,
        });
        return prefs;
    }

    function getPage$1(settings) {
        const prefs = buildPage();
        /* Rescale [dropdown] */
        const labelRescale = _('Rescale');
        const rescaleOptions = [
            ['100%', 100],
            ['50%', 50],
        ];
        const currentRescale = settings.get_int(KeyEffectRescale);
        const comboBoxRescale = getComboBox(rescaleOptions, GObject.TYPE_INT, currentRescale, (value) => settings.set_int(KeyEffectRescale, value));
        prefs.add(buildConfigRow(labelRescale, comboBoxRescale));
        return prefs;
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

    function toTooltipText(parameters, caption = _('Parameters:')) {
        return parameters
            .reduce((arr, [key, _value, description]) => {
            arr.push(key + '\t' + description);
            return arr;
        }, [caption])
            .join('\n');
    }
    function toObject(parameters) {
        return parameters.reduce((obj, [key, value]) => {
            obj[key] = value;
            return obj;
        }, {});
    }

    const settings = ExtensionUtils.getSettings();
    function parameters(v) {
        return [['f', GLib.shell_quote(v.filename), _('Filename')]];
    }
    function tooltipText() {
        return toTooltipText(parameters({ filename: '/path/to/file.png' }));
    }

    function getPage$2(settings) {
        const prefs = buildPage();
        const configRowEnableRunCommand = buildConfigSwitch(settings, _('Run Command After Capture'), KeyEnableRunCommand);
        prefs.add(configRowEnableRunCommand.hbox);
        const entry = new Gtk.Entry({
            expand: true,
            tooltip_text: tooltipText(),
            text: settings.get_string(KeyRunCommand),
        });
        ['inserted-text', 'deleted-text'].forEach((name) => {
            entry.get_buffer().connect(name, ({ text }) => {
                settings.set_string(KeyRunCommand, text);
            });
        });
        const configRowRunCommand = buildConfigRow(_('Command'), entry);
        bindSensitivity(configRowEnableRunCommand.gtkSwitch, configRowRunCommand);
        prefs.add(configRowRunCommand);
        return prefs;
    }

    function parameters$1({ width, height }) {
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
    function tooltipText$1(vars) {
        return toTooltipText(parameters$1(vars));
    }
    function get(template, vars, n) {
        const basename = stringFormat(template, toObject(parameters$1(vars)));
        let sequence = '';
        if (n && n > 0) {
            sequence = '_' + String(n);
        }
        return basename + sequence + '.png';
    }

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

    function getPage$3(settings) {
        const prefs = buildPage();
        /* Save Screenshot [on|off] */
        const switchSaveScreenshot = buildConfigSwitch(settings, _('Auto-Save Screenshot'), KeySaveScreenshot);
        prefs.add(switchSaveScreenshot.hbox);
        /* Save Location [filechooser] */
        const labelSaveLocation = _('Save Location');
        const chooserSaveLocation = new Gtk.FileChooserButton({
            title: _('Select'),
            local_only: true,
        });
        chooserSaveLocation.set_action(Gtk.FileChooserAction.SELECT_FOLDER);
        try {
            const saveLocation = expand(settings.get_string(KeySaveLocation));
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
            settings.set_string(KeySaveLocation, filename);
        });
        const box = buildConfigRow(labelSaveLocation, chooserSaveLocation);
        bindSensitivity(switchSaveScreenshot.gtkSwitch, box);
        prefs.add(box);
        /* Filename */
        const [defaultTemplate] = settings.get_default_value(KeyFilenameTemplate).get_string();
        const mockDimensions = { width: 800, height: 600 };
        const labelFilenameTemplate = _('Default Filename');
        const inputFilenameTemplate = new Gtk.Entry({
            expand: true,
            tooltip_text: tooltipText$1(mockDimensions),
            secondary_icon_name: 'document-revert',
        });
        inputFilenameTemplate.text = settings.get_string(KeyFilenameTemplate);
        prefs.add(buildConfigRow(labelFilenameTemplate, inputFilenameTemplate));
        /* Filename Preview */
        const labelPreview = _('Preview');
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
                settings.set_string(KeyFilenameTemplate, tpl);
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
        prefs.add(buildConfigRow(labelPreview, textPreview));
        return prefs;
    }

    function getPage$4(settings) {
        const prefs = buildPage();
        /* Enable Imgur Upload [on|off] */
        const configSwitchEnable = buildConfigSwitch(settings, _('Enable Imgur Upload'), KeyEnableUploadImgur);
        prefs.add(configSwitchEnable.hbox);
        /* Enable Upload Notification [on|off] */
        const configSwitchEnableNotification = buildConfigSwitch(settings, _('Show Upload Notification'), KeyImgurEnableNotification);
        prefs.add(configSwitchEnableNotification.hbox);
        bindSensitivity(configSwitchEnable.gtkSwitch, configSwitchEnableNotification.hbox);
        /* Auto-Upload After Capture [on|off] */
        const configSwitchUploadOnCapture = buildConfigSwitch(settings, _('Auto-Upload After Capture'), KeyImgurAutoUpload);
        bindSensitivity(configSwitchEnable.gtkSwitch, configSwitchUploadOnCapture.hbox);
        prefs.add(configSwitchUploadOnCapture.hbox);
        /* Auto-Copy Link After Upload [on|off] */
        const configSwitchCopyLinkOnUpload = buildConfigSwitch(settings, _('Auto-Copy Link After Upload'), KeyImgurAutoCopyLink);
        bindSensitivity(configSwitchEnable.gtkSwitch, configSwitchCopyLinkOnUpload.hbox);
        prefs.add(configSwitchCopyLinkOnUpload.hbox);
        /* Auto-Open Link After Upload [on|off] */
        const configSwitchOpenLinkOnUpload = buildConfigSwitch(settings, _('Auto-Open Link After Upload'), KeyImgurAutoOpenLink);
        bindSensitivity(configSwitchEnable.gtkSwitch, configSwitchOpenLinkOnUpload.hbox);
        prefs.add(configSwitchOpenLinkOnUpload.hbox);
        return prefs;
    }

    // accelerator setting based on
    // https://github.com/ambrice/spatialnavigation-tastycactus.com/blob/master/prefs.js
    function getPage$5(settings) {
        const model = new Gtk.ListStore();
        model.set_column_types([GObject.TYPE_STRING, GObject.TYPE_STRING, GObject.TYPE_INT, GObject.TYPE_INT]);
        const bindings = [
            ['shortcut-select-area', _('Select area')],
            ['shortcut-select-window', _('Select window')],
            ['shortcut-select-desktop', _('Select whole desktop')],
        ];
        for (const [name, description] of bindings) {
            log('binding: ' + name + ' description: ' + description);
            const binding = settings.get_strv(name)[0];
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
            title: _('Keyboard Shortcut'),
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
            settings.set_strv(name, [value]);
        });
        cellrend.connect('accel-cleared', (rend, iter, _key, _mods) => {
            const [succ, iterator] = model.get_iter_from_string(iter);
            if (!succ) {
                throw new Error('Error clearing keybinding');
            }
            const name = model.get_value(iterator, 0);
            model.set(iterator, [2, 3], [0, 0]);
            settings.set_strv(name, []);
        });
        col = new Gtk.TreeViewColumn({ title: _('Modify'), min_width: 200 });
        col.pack_end(cellrend, false);
        col.add_attribute(cellrend, 'accel-mods', 2);
        col.add_attribute(cellrend, 'accel-key', 3);
        treeview.append_column(col);
        return treeview;
    }

    const ScreenshotToolSettingsWidget = extendGObject(class ScreenshotToolSettingsWidget extends Gtk.Box {
        _init(params) {
            super._init(params);
            const settings = ExtensionUtils.getSettings();
            const notebook = new Gtk.Notebook();
            function addPage(label, page) {
                notebook.append_page(page, new Gtk.Label({ label }));
            }
            addPage(_('Indicator'), getPage(settings));
            addPage(_('Effects'), getPage$1(settings));
            addPage(_('Commands'), getPage$2(settings));
            addPage(_('Storage'), getPage$3(settings));
            addPage(_('Imgur Upload'), getPage$4(settings));
            addPage(_('Keybindings'), getPage$5(settings));
            this.add(notebook);
        }
    }, Gtk.Box);
    function init() {
        ExtensionUtils.initTranslations();
    }
    function buildPrefsWidget() {
        const widget = new ScreenshotToolSettingsWidget();
        widget.show_all();
        return widget;
    }
    var prefs = { init, buildPrefsWidget };

    return prefs;

}(imports.gi.Gtk, imports.gi.GObject, imports.gi.Gio, imports.gi.GLib));

var init = prefs.init;
var buildPrefsWidget = prefs.buildPrefsWidget;
