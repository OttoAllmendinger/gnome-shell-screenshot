var prefs = (function (Gtk3, Gtk4, Gio, GLib, GObject) {
    'use strict';

    var ExtensionUtils = imports.misc.extensionUtils;

    var uuid = "gnome-shell-screenshot@ttll.de";
    var name = "Screenshot Tool";
    var url = "https://github.com/OttoAllmendinger/gnome-shell-screenshot/";
    var description = "Conveniently create, copy, store and upload screenshots";
    var metadata = {
    	"shell-version": [
    	"40"
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

    function getGtkVersion() {
        const v = Gtk3.get_major_version();
        if (v === 3 || v === 4) {
            return v;
        }
        throw new Error('unsupported version');
    }
    function getCompatRoot(w) {
        switch (getGtkVersion()) {
            case 3:
                return w.get_toplevel();
            case 4:
                return w.get_root();
        }
        throw new Error('unsupported version');
    }
    function getGVariantClassName(vc) {
        for (const k of Object.keys(GLib.VariantClass)) {
            if (GLib.VariantClass[k] === vc) {
                return k;
            }
        }
        throw new Error(`unknown class ${vc}`);
    }
    function getGObjectTypeFromGVariantClass(vc) {
        switch (vc) {
            case GLib.VariantClass.INT16:
            case GLib.VariantClass.INT32:
            case GLib.VariantClass.INT64:
            case GLib.VariantClass.UINT16:
            case GLib.VariantClass.UINT32:
            case GLib.VariantClass.UINT64:
                return GObject.TYPE_INT;
            case GLib.VariantClass.STRING:
                return GObject.TYPE_STRING;
        }
        throw new Error(`unsupported GVariantClass ${getGVariantClassName(vc)}`);
    }
    function wrapGVariant(v) {
        switch (typeof v) {
            case 'boolean':
                return GLib.Variant.new_boolean(v);
            case 'number':
                return GLib.Variant.new_int32(v);
            case 'string':
                return GLib.Variant.new_string(v);
        }
        throw new Error(`could not find variant fo ${typeof v}`);
    }
    function unwrapGVariant(v) {
        switch (v.classify()) {
            case GLib.VariantClass.ARRAY:
                throw new Error('not supported');
            case GLib.VariantClass.BOOLEAN:
                return v.get_boolean();
            case GLib.VariantClass.BYTE:
                return v.get_byte();
            case GLib.VariantClass.DICT_ENTRY:
                throw new Error('not supported');
            case GLib.VariantClass.DOUBLE:
                return v.get_double();
            case GLib.VariantClass.HANDLE:
                throw new Error('not supported');
            case GLib.VariantClass.MAYBE:
                throw new Error('not supported');
            case GLib.VariantClass.INT16:
                return v.get_int16();
            case GLib.VariantClass.INT32:
                return v.get_int32();
            case GLib.VariantClass.INT64:
                return v.get_int64();
            case GLib.VariantClass.VARIANT:
                throw new Error('not supported');
            case GLib.VariantClass.STRING:
                const [str] = v.get_string();
                return str;
            case GLib.VariantClass.UINT16:
                return v.get_uint16();
            case GLib.VariantClass.UINT32:
                return v.get_uint32();
            case GLib.VariantClass.UINT64:
                return v.get_uint64();
        }
    }
    function addBoxChildren(box, children) {
        children.forEach((w) => {
            switch (getGtkVersion()) {
                case 3:
                    box.add(w);
                    return;
                case 4:
                    box.append(w);
                    return;
            }
            throw new Error(`invalid gtk version ${getGtkVersion()}`);
        });
    }
    function syncSetting(settings, key, callback) {
        settings.connect('changed::' + key, () => {
            callback(unwrapGVariant(settings.get_value(key)));
        });
        callback(unwrapGVariant(settings.get_value(key)));
    }
    class PrefBuilder {
        constructor(settings, window) {
            this.settings = settings;
            this.window = window;
        }
        getValue(key) {
            return unwrapGVariant(this.settings.get_value(key));
        }
        setValue(key, value) {
            this.settings.set_value(key, wrapGVariant(value));
        }
        getDefaultValue(key) {
            const defaultValue = this.settings.get_default_value(key);
            if (defaultValue === null) {
                throw new Error();
            }
            return unwrapGVariant(defaultValue);
        }
        buildSwitch(p) {
            const w = new Gtk4.Switch();
            syncSetting(this.settings, p.settingsKey, (v) => {
                w.set_active(v);
            });
            w.connect('notify::state', () => {
                this.setValue(p.settingsKey, w.state);
            });
            return w;
        }
        buildComboBox(p) {
            const defaultValue = this.settings.get_default_value(p.settingsKey);
            if (!defaultValue) {
                throw new Error(`settings ${p.settingsKey} needs default value`);
            }
            if (!defaultValue.classify()) {
                throw new Error(`could not classify default value for ${p.settingsKey}`);
            }
            const valueType = getGObjectTypeFromGVariantClass(defaultValue.classify());
            const model = new Gtk4.ListStore();
            const Columns = { LABEL: 0, VALUE: 1 };
            model.set_column_types([GObject.TYPE_STRING, valueType]);
            const comboBox = new Gtk4.ComboBox({ model });
            const renderer = new Gtk4.CellRendererText();
            comboBox.pack_start(renderer, true);
            comboBox.add_attribute(renderer, 'text', 0);
            for (const [label, value] of p.options) {
                const iter = model.append();
                model.set(iter, [Columns.LABEL, Columns.VALUE], [label, value]);
            }
            comboBox.connect('changed', () => {
                const [success, iter] = comboBox.get_active_iter();
                if (!success) {
                    return;
                }
                const value = model.get_value(iter, Columns.VALUE);
                this.setValue(p.settingsKey, value);
            });
            const setActiveByValue = (v) => {
                const [success, iter] = model.get_iter_first();
                if (!success) {
                    return;
                }
                for (;;) {
                    if (model.get_value(iter, Columns.VALUE) === v) {
                        comboBox.set_active_iter(iter);
                    }
                    if (!model.iter_next(iter)) {
                        return;
                    }
                }
            };
            syncSetting(this.settings, p.settingsKey, (v) => {
                setActiveByValue(v);
            });
            return comboBox;
        }
        buildEntry(p) {
            const w = new Gtk4.Entry({
                hexpand: true,
                tooltip_text: p.tooltip,
                secondary_icon_name: 'document-revert',
            });
            syncSetting(this.settings, p.settingsKey, (v) => {
                if (w.text !== v) {
                    w.text = v;
                }
            });
            w.get_buffer().connect('notify::text', ({ text }) => {
                if (p.validate(text)) {
                    this.setValue(p.settingsKey, text);
                    w.get_style_context().remove_class('error');
                }
                else {
                    w.get_style_context().add_class('error');
                }
            });
            w.connect('icon-press', () => {
                w.text = this.getDefaultValue(p.settingsKey);
            });
            return w;
        }
        buildFileChooser(p) {
            const w = new Gtk4.Button();
            syncSetting(this.settings, p.settingsKey, (path) => {
                const f = Gio.File.new_for_path(expand(path));
                w.label = f.get_basename() || p.label;
            });
            w.connect('clicked', () => {
                const d = new Gtk4.FileChooserDialog({
                    title: p.label,
                    action: Gtk4.FileChooserAction.SELECT_FOLDER,
                    transient_for: getCompatRoot(w),
                    modal: true,
                });
                d.add_button(p.label, Gtk4.ResponseType.OK);
                d.add_button(_('Cancel'), Gtk4.ResponseType.CANCEL);
                d.connect('response', (_dialog, response) => {
                    if (response === Gtk4.ResponseType.OK) {
                        this.setValue(p.settingsKey, d.get_file().get_path());
                    }
                    d.close();
                });
                d.show();
            });
            return w;
        }
        buildPreview(p) {
            const w = new Gtk4.Label();
            syncSetting(this.settings, p.settingsKey, () => {
                try {
                    w.label = p.format(this.settings);
                    w.get_style_context().remove_class('error');
                }
                catch (e) {
                    w.label = 'Error';
                    w.get_style_context().add_class('error');
                }
            });
            return w;
        }
        buildPrefWidget(w) {
            switch (w.type) {
                case 'Switch':
                    return this.buildSwitch(w);
                case 'ComboBox':
                    return this.buildComboBox(w);
                case 'Entry':
                    return this.buildEntry(w);
                case 'FileChooser':
                    return this.buildFileChooser(w);
                case 'Preview':
                    return this.buildPreview(w);
            }
            throw new Error('unknown type');
        }
        buildPageRows(rows) {
            const box = new Gtk4.Box({
                orientation: Gtk4.Orientation.VERTICAL,
            });
            const gtkRows = rows.map(({ label, widget }) => {
                const hbox = new Gtk4.Box({
                    orientation: Gtk4.Orientation.HORIZONTAL,
                    margin_top: 10,
                    margin_bottom: 10,
                    margin_start: 10,
                    margin_end: 10,
                });
                addBoxChildren(hbox, [
                    new Gtk4.Label({
                        label,
                        hexpand: true,
                        xalign: 0,
                    }),
                    this.buildPrefWidget(widget),
                ]);
                return hbox;
            });
            addBoxChildren(box, gtkRows);
            function updateSensitive(settings) {
                gtkRows.forEach((gtkRow, i) => {
                    gtkRow.set_sensitive(rows[i].enable(settings));
                });
            }
            this.settings.connect('changed', () => {
                updateSensitive(this.settings);
            });
            updateSensitive(this.settings);
            return box;
        }
        buildPrefKeybindings(p) {
            const model = new Gtk4.ListStore();
            model.set_column_types([GObject.TYPE_STRING, GObject.TYPE_STRING, GObject.TYPE_INT, GObject.TYPE_INT]);
            const ColumnConfigKey = 0;
            const ColumnLabel = 1;
            const ColumnShortcutModifiers = 2;
            const ColumnShortcutKey = 3;
            for (const { label, settingsKey } of p.bindings) {
                const binding = this.settings.get_strv(settingsKey)[0];
                let key, mods;
                if (binding) {
                    switch (getGtkVersion()) {
                        case 3:
                            [key, mods] = Gtk3.accelerator_parse(binding);
                            break;
                        case 4:
                            const [success, ...parsed] = Gtk4.accelerator_parse(binding);
                            if (!success) {
                                throw new Error(`could not parse ${binding}`);
                            }
                            [key, mods] = parsed;
                    }
                }
                else {
                    [key, mods] = [0, 0];
                }
                const row = model.append();
                model.set(row, [ColumnConfigKey, ColumnLabel, ColumnShortcutModifiers, ColumnShortcutKey], [settingsKey, label, mods, key]);
            }
            const treeview = new Gtk4.TreeView({
                hexpand: true,
                vexpand: true,
                model,
            });
            {
                const cellrend = new Gtk4.CellRendererText();
                const col = new Gtk4.TreeViewColumn({
                    title: _('Keyboard Shortcut'),
                    expand: true,
                });
                col.pack_start(cellrend, true);
                col.add_attribute(cellrend, 'text', ColumnLabel);
                treeview.append_column(col);
            }
            {
                const cellrend = new Gtk4.CellRendererAccel({
                    editable: true,
                    accel_mode: Gtk4.CellRendererAccelMode.GTK,
                });
                cellrend.connect('accel-edited', (rend, path, key, mods) => {
                    const value = Gtk4.accelerator_name(key, mods);
                    const [succ, iterator] = model.get_iter_from_string(path);
                    if (!succ) {
                        throw new Error('Error updating keybinding');
                    }
                    const name = model.get_value(iterator, ColumnConfigKey);
                    model.set(iterator, [ColumnShortcutModifiers, ColumnShortcutKey], [mods, key]);
                    this.settings.set_strv(name, [value]);
                });
                cellrend.connect('accel-cleared', (rend, path) => {
                    const [succ, iterator] = model.get_iter_from_string(path);
                    if (!succ) {
                        throw new Error('Error clearing keybinding');
                    }
                    const name = model.get_value(iterator, ColumnConfigKey);
                    model.set(iterator, [ColumnShortcutModifiers, ColumnShortcutKey], [0, 0]);
                    this.settings.set_strv(name, []);
                });
                const col = new Gtk4.TreeViewColumn({ title: _('Modify'), min_width: 200 });
                col.pack_end(cellrend, false);
                col.add_attribute(cellrend, 'accel-mods', ColumnShortcutModifiers);
                col.add_attribute(cellrend, 'accel-key', ColumnShortcutKey);
                treeview.append_column(col);
            }
            return treeview;
        }
    }
    function buildPrefPages(pages, settings, window) {
        const builder = new PrefBuilder(settings, window);
        const notebook = new Gtk4.Notebook();
        pages.forEach((p) => {
            const { label } = p;
            if ('rows' in p) {
                notebook.append_page(builder.buildPageRows(p.rows), new Gtk4.Label({ label }));
            }
            if ('widget' in p) {
                notebook.append_page(builder.buildPrefKeybindings(p.widget), new Gtk4.Label({ label }));
            }
        });
        switch (getGtkVersion()) {
            case 3:
                notebook.show_all();
        }
        return notebook;
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

    function isValidTemplate(s) {
        try {
            stringFormat(s);
            return true;
        }
        catch (e) {
            return false;
        }
    }
    function parameters(v) {
        return [['f', GLib.shell_quote(v.filename), _('Filename')]];
    }
    function tooltipText() {
        return toTooltipText(parameters({ filename: '/path/to/file.png' }));
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
    function isValidTemplate$1(template) {
        try {
            stringFormat(template);
            return true;
        }
        catch (e) {
            return false;
        }
    }

    const KeyEnableIndicator = 'enable-indicator';
    const KeyEnableNotification = 'enable-notification';
    const ValueShortcutSelectArea = 'shortcut-select-area';
    const ValueShortcutSelectWindow = 'shortcut-select-window';
    const ValueShortcutSelectDesktop = 'shortcut-select-desktop';
    // See schemas/org.gnome.shell.extensions.screenshot.gschema.xml
    const KeyClickAction = 'click-action';
    const ClickActions = {
        SHOW_MENU: 'show-menu',
        SELECT_AREA: 'select-area',
        SELECT_WINDOW: 'select-window',
        SELECT_DESKTOP: 'select-desktop',
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

    function prefSwitch(settingsKey) {
        return {
            type: 'Switch',
            settingsKey,
        };
    }
    function prefComboBox(options, settingsKey) {
        return {
            type: 'ComboBox',
            options,
            settingsKey,
        };
    }
    function prefFileChooser(label, settingsKey) {
        return {
            type: 'FileChooser',
            label,
            settingsKey,
        };
    }
    function prefEntry(opts, settingsKey, validate) {
        return {
            type: 'Entry',
            settingsKey,
            tooltip: opts.tooltip,
            validate,
        };
    }
    function prefPreview(settingsKey, format) {
        return {
            type: 'Preview',
            settingsKey,
            format,
        };
    }
    function enableKey(k) {
        return function (s) {
            return s.get_boolean(k);
        };
    }
    function prefRow(label, widget, { enable = () => true } = {}) {
        return {
            label,
            widget,
            enable,
        };
    }
    function prefKeybinding(label, settingsKey) {
        return { label, settingsKey };
    }
    function prefKeybindings(bindings) {
        return {
            type: 'Keybindings',
            bindings,
        };
    }
    function prefPage(label, child) {
        if (Array.isArray(child)) {
            return { label, rows: child };
        }
        return { label, widget: child };
    }

    function getIndicatorPrefs() {
        const [optionNothing, optionImageData, optionLocalPath] = [
            [_('Nothing'), ClipboardActions.NONE],
            [_('Image Data'), ClipboardActions.SET_IMAGE_DATA],
            [_('Local Path'), ClipboardActions.SET_LOCAL_PATH],
        ];
        return [
            prefRow(_('Show Indicator'), prefSwitch(KeyEnableIndicator)),
            prefRow(_('Show Notification After Capture'), prefSwitch(KeyEnableNotification)),
            prefRow(_('Primary Button'), prefComboBox([
                [_('Select Area'), ClickActions.SELECT_AREA],
                [_('Select Window'), ClickActions.SELECT_WINDOW],
                [_('Select Desktop'), ClickActions.SELECT_DESKTOP],
                [_('Show Menu'), ClickActions.SHOW_MENU],
            ], KeyClickAction)),
            prefRow(_('Copy Button'), prefComboBox([optionImageData, optionLocalPath], KeyCopyButtonAction)),
            prefRow(_('Auto-Copy to Clipboard'), prefComboBox([optionNothing, optionImageData, optionLocalPath], KeyClipboardAction)),
        ];
    }
    function getEffectPrefs() {
        return [
            prefRow(_('Rescale'), prefComboBox([
                ['100%', 100],
                ['50%', 50],
            ], KeyEffectRescale)),
        ];
    }
    function getCommandPrefs() {
        return [
            prefRow(_('Run Command After Capture'), prefSwitch(KeyEnableRunCommand)),
            prefRow(_('Command'), prefEntry({ tooltip: tooltipText() }, KeyRunCommand, isValidTemplate), {
                enable: enableKey(KeyEnableRunCommand),
            }),
        ];
    }
    function getStoragePrefs() {
        const mockDimensions = { width: 800, height: 600 };
        return [
            prefRow(_('Auto-Save Screenshot'), prefSwitch(KeySaveScreenshot)),
            prefRow(_('Save Location'), prefFileChooser(_('Select'), KeySaveLocation), {
                enable: enableKey(KeySaveScreenshot),
            }),
            prefRow(_('Default Filename'), prefEntry({ tooltip: tooltipText$1(mockDimensions) }, KeyFilenameTemplate, isValidTemplate$1)),
            prefRow(_('Preview'), prefPreview(KeyFilenameTemplate, (settings) => {
                return get(settings.get_string(KeyFilenameTemplate), mockDimensions);
            })),
        ];
    }
    function getImgurPrefs() {
        const enableIfImgurEnabled = {
            enable: enableKey(KeyEnableUploadImgur),
        };
        return [
            prefRow(_('Enable Imgur Upload'), prefSwitch(KeyEnableUploadImgur)),
            prefRow(_('Show Upload Notification'), prefSwitch(KeyImgurEnableNotification), enableIfImgurEnabled),
            prefRow(_('Auto-Upload After Capture'), prefSwitch(KeyImgurAutoUpload), enableIfImgurEnabled),
            prefRow(_('Auto-Copy Link After Upload'), prefSwitch(KeyImgurAutoCopyLink), enableIfImgurEnabled),
            prefRow(_('Auto-Open Link After Upload'), prefSwitch(KeyImgurAutoOpenLink), enableIfImgurEnabled),
        ];
    }
    function getKeybindPrefs() {
        return prefKeybindings([
            prefKeybinding(_('Select area'), ValueShortcutSelectArea),
            prefKeybinding(_('Select window'), ValueShortcutSelectWindow),
            prefKeybinding(_('Select whole desktop'), ValueShortcutSelectDesktop),
        ]);
    }
    function getPages() {
        return [
            prefPage(_('Indicator'), getIndicatorPrefs()),
            prefPage(_('Effects'), getEffectPrefs()),
            prefPage(_('Commands'), getCommandPrefs()),
            prefPage(_('Storage'), getStoragePrefs()),
            prefPage(_('Imgur'), getImgurPrefs()),
            prefPage(_('Keybindings'), getKeybindPrefs()),
        ];
    }

    function init() {
        ExtensionUtils.initTranslations();
    }
    function buildPrefsWidget() {
        return buildPrefPages(getPages(), ExtensionUtils.getSettings(), null);
    }
    var prefs = { init, buildPrefsWidget };

    return prefs;

}(imports.gi.Gtk, imports.gi.Gtk, imports.gi.Gio, imports.gi.GLib, imports.gi.GObject));

var init = prefs.init;
var buildPrefsWidget = prefs.buildPrefsWidget;
