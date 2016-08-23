/*jshint moz:true */
// vi: sts=2 sw=2 et
//
// accelerator setting based on
// https://github.com/ambrice/spatialnavigation-tastycactus.com/blob/master/prefs.js

const Lang = imports.lang;
const Signals = imports.signals;

const Gtk = imports.gi.Gtk;
// const Gio = imports.gi.Gio;
const GObject = imports.gi.GObject;

const Gettext = imports.gettext.domain('gnome-shell-extensions');
const _ = Gettext.gettext;

const Local = imports.misc.extensionUtils.getCurrentExtension();
const Config = Local.imports.config;
const Convenience = Local.imports.convenience;



let _settings;


const buildHbox = function () {
  return new Gtk.Box({
    orientation: Gtk.Orientation.HORIZONTAL,
    margin_top: 5,
    expand: false
  });
};

const ImgurSettingsWidget = new GObject.Class({
  Name: 'ImgurSettingsWidget',
  GTypeName: 'ImgurSettingsWidget',
  Extends: Gtk.Box,

  _init: function (params) {
    this.parent(params);
    this._initLayout();
  },

  _initLayout: function () {
    this._notebook = new Gtk.Notebook();

    let label;

    this._prefsIndicator = this._makePrefsIndicator();
    label = new Gtk.Label({label: _("Indicator")});
    this._notebook.append_page(this._prefsIndicator, label);

    this._prefsDefaultActions = this._makePrefsDefaultActions();
    label = new Gtk.Label({label: _("Default Actions")});
    this._notebook.append_page(this._prefsDefaultActions, label);

    this._prefsKeybindings = this._makePrefsKeybindings();
    label = new Gtk.Label({label: _("Keybindings")});
    this._notebook.append_page(this._prefsKeybindings, label);

    this.add(this._notebook);
  },

  _makePrefsIndicator: function () {
    let prefs = new Gtk.Box({
      orientation: Gtk.Orientation.VERTICAL,
      margin: 20,
      margin_top: 10,
      expand: false
    });

    let hbox;

    /* Show indicator [on|off] */

    hbox = buildHbox();

    const labelShowIndicator = new Gtk.Label({
      label: _('Show indicator'),
      xalign: 0,
      expand: true
    });

    const switchShowIndicator = new Gtk.Switch();

    switchShowIndicator.connect('notify::active', function (button) {
      _settings.set_boolean(Config.KeyEnableIndicator, button.active);
    }.bind(this));

    switchShowIndicator.active = _settings.get_boolean(
        Config.KeyEnableIndicator
    );

    hbox.add(labelShowIndicator);
    hbox.add(switchShowIndicator);

    prefs.add(hbox, {fill: false});


    /* Default click action [dropdown] */

    hbox = buildHbox();

    const labelDefaultClickAction = new Gtk.Label({
      label: _('Default click action'),
      xalign: 0,
      expand: true
    });

    const clickActionOptions = [
      [_("Select Area")     , Config.ClickActions.SELECT_AREA],
      [_("Select Window")   , Config.ClickActions.SELECT_WINDOW],
      [_("Select Desktop")  , Config.ClickActions.SELECT_DESKTOP],
      [_("Show Menu")       , Config.ClickActions.SHOW_MENU]
    ];

    const currentClickAction = _settings.get_enum(Config.KeyClickAction);

    const comboBoxDefaultClickAction = this._getComboBox(
      clickActionOptions, GObject.TYPE_INT, currentClickAction,
      function (value) _settings.set_enum(Config.KeyClickAction, value)
    );

    hbox.add(labelDefaultClickAction);
    hbox.add(comboBoxDefaultClickAction);

    prefs.add(hbox, {fill: false});

    return prefs;
  },

  _makePrefsDefaultActions: function () {
    let prefs = new Gtk.Box({
      orientation: Gtk.Orientation.VERTICAL,
      margin: 20,
      margin_top: 10,
      expand: false
    });

    /* Copy link to clipboard [on|off] */

    hbox = buildHbox();

    const labelCopyClipboard = new Gtk.Label({
      label: _('Copy URL to clipboard'),
      xalign: 0,
      expand: true
    });

    const switchCopyClipboard = new Gtk.Switch();

    switchCopyClipboard.connect('notify::active', function (button) {
      _settings.set_boolean(Config.KeyCopyClipboard, button.active);
    }.bind(this));

    switchCopyClipboard.active = _settings.get_boolean(
        Config.KeyCopyClipboard
    );

    hbox.add(labelCopyClipboard);
    hbox.add(switchCopyClipboard);

    prefs.add(hbox, {fill: false});

    /* Keep file [on|off] */

    hbox = buildHbox();

    const labelKeepFile = new Gtk.Label({
      label: _('Keep Saved File'),
      xalign: 0,
      expand: true
    });

    const switchKeepFile = new Gtk.Switch();

    switchKeepFile.connect('notify::active', function (button) {
      _settings.set_boolean(Config.KeyKeepFile, button.active);
    }.bind(this));

    switchKeepFile.active = _settings.get_boolean(
        Config.KeyKeepFile
    );

    hbox.add(labelKeepFile);
    hbox.add(switchKeepFile);

    prefs.add(hbox, {fill: false});


    /* Save Location [filechooser] */

    hbox = buildHbox();

    const labelSaveLocation = new Gtk.Label({
      label: _('Save location'),
      xalign: 0,
      expand: true
    });


    const chooserSaveLocation = new Gtk.FileChooserButton({
      title: _("Select")
    });
    chooserSaveLocation.set_action(Gtk.FileChooserAction.SELECT_FOLDER);

    chooserSaveLocation.set_filename(_settings.get_string('save-location'));
    chooserSaveLocation.connect('file-set', function() {
      _settings.set_string(
        'save-location',
        chooserSaveLocation.get_current_folder()
      );
    }.bind(this));

    const _setSensitivity = function () {
      var sensitive = _settings.get_boolean(Config.KeyKeepFile);
      labelSaveLocation.set_sensitive(sensitive);
      chooserSaveLocation.set_sensitive(sensitive);
    };

    switchKeepFile.connect('notify::active', _setSensitivity);
    _setSensitivity();

    hbox.add(labelSaveLocation);
    hbox.add(chooserSaveLocation);

    prefs.add(hbox, {fill: false});

    return prefs;
  },

  _makePrefsKeybindings: function () {
    let model = new Gtk.ListStore();

    model.set_column_types([
        GObject.TYPE_STRING,
        GObject.TYPE_STRING,
        GObject.TYPE_INT,
        GObject.TYPE_INT
    ]);

    let bindings = [
      ["shortcut-select-area", "Select area"],
      ["shortcut-select-window", "Select window"],
      ["shortcut-select-desktop", "Select whole desktop"]
    ];

    for each (let [name, description] in bindings) {
      log("binding: " + name + " description: " + description);
      let binding = _settings.get_strv(name)[0];

      let key, mods;

      if (binding) {
        [key, mods] = Gtk.accelerator_parse(binding);
      } else {
        [key, mods] = [0, 0];
      }

      let row = model.append();

      model.set(row, [0, 1, 2, 3], [name, description, mods, key]);
    }

    let treeview = new Gtk.TreeView({
        'expand': true,
        'model': model
    });

    let cellrend = new Gtk.CellRendererText();
    let col = new Gtk.TreeViewColumn({
      'title': 'Keyboard Shortcut',
       'expand': true
    });

    col.pack_start(cellrend, true);
    col.add_attribute(cellrend, 'text', 1);
    treeview.append_column(col);

    cellrend = new Gtk.CellRendererAccel({
      'editable': true,
      'accel-mode': Gtk.CellRendererAccelMode.GTK
    });

    cellrend.connect('accel-edited', function(rend, iter, key, mods) {
      let value = Gtk.accelerator_name(key, mods);
      let [succ, iterator] = model.get_iter_from_string(iter);

      if (!succ) {
        throw new Error("Error updating keybinding");
      }

      let name = model.get_value(iterator, 0);

      model.set(iterator, [2, 3], [mods, key]);
      _settings.set_strv(name, [value]);
    });

    cellrend.connect('accel-cleared', function(rend, iter, key, mods) {
      let [succ, iterator] = model.get_iter_from_string(iter);

      if (!succ) {
        throw new Error("Error clearing keybinding");
      }

      let name = model.get_value(iterator, 0);

      model.set(iterator, [2, 3], [0, 0]);
      _settings.set_strv(name, []);
    });

    col = new Gtk.TreeViewColumn({'title': 'Modify', min_width: 200});

    col.pack_end(cellrend, false);
    col.add_attribute(cellrend, 'accel-mods', 2);
    col.add_attribute(cellrend, 'accel-key', 3);
    treeview.append_column(col);

    return treeview;
  },

  _getComboBox: function (options, valueType, defaultValue, callback) {
    let model = new Gtk.ListStore();

    let Columns = { LABEL: 0, VALUE: 1 };

    model.set_column_types([GObject.TYPE_STRING, valueType]);

    let comboBox = new Gtk.ComboBox({model: model});
    let renderer = new Gtk.CellRendererText();

    comboBox.pack_start(renderer, true);
    comboBox.add_attribute(renderer, 'text', 0);

    for each (let [label, value] in options) {
      let iter;

      model.set(
          iter = model.append(),
          [Columns.LABEL, Columns.VALUE],
          [label, value]
      );

      if (value === defaultValue) {
          comboBox.set_active_iter(iter);
      }
    }

    comboBox.connect('changed', function (entry) {
      let [success, iter] = comboBox.get_active_iter();

      if (!success) {
          return;
      }

      let value = model.get_value(iter, Columns.VALUE);

      callback(value);
    });

    return comboBox;
  }
});

function init() {
  _settings = Convenience.getSettings();
}

function buildPrefsWidget() {
  let widget = new ImgurSettingsWidget();
  widget.show_all();

  return widget;
}
