/*jshint moz:true */
// vi: sts=2 sw=2 et
//
// accelerator setting based on
// https://github.com/ambrice/spatialnavigation-tastycactus.com/blob/master/prefs.js

const Lang = imports.lang;
const Signals = imports.signals;

const Gtk = imports.gi.Gtk;
const GLib = imports.gi.GLib;
const GObject = imports.gi.GObject;

const Gettext = imports.gettext.domain('gnome-shell-screenshot');
const _ = Gettext.gettext;

const Local = imports.misc.extensionUtils.getCurrentExtension();
const Path = Local.imports.path.exports;
const Config = Local.imports.config.exports;
const Filename = Local.imports.filename.exports;
const Convenience = Local.imports.convenience.exports;



let _settings;


const buildHbox = () => {
  return new Gtk.Box({
    orientation: Gtk.Orientation.HORIZONTAL,
    margin_top: 5,
    expand: false
  });
};

const buildConfigSwitch = (label, configKey) => {
  let hbox = buildHbox();

  const gtkLabel = new Gtk.Label({
    label: label,
    xalign: 0,
    expand: true
  });

  const gtkSwitch = new Gtk.Switch();

  gtkSwitch.connect('notify::active', (button) => {
    _settings.set_boolean(configKey, button.active);
  });

  gtkSwitch.active = _settings.get_boolean(configKey);

  hbox.add(gtkLabel);
  hbox.add(gtkSwitch);

  return {
    hbox: hbox,
    gtkLabel: gtkLabel,
    gtkSwitch: gtkSwitch
  };
};

const bindSensitivity = (source, target) => {
  let set = () => {
    target.set_sensitive(source.active)
  };
  source.connect('notify::active', set);
  set();
}

const ScreenshotToolSettingsWidget = new GObject.Class({
  Name: 'ScreenshotToolSettingsWidget',
  GTypeName: 'ScreenshotToolSettingsWidget',
  Extends: Gtk.Box,

  _init: function (params) {
    this.parent(params);
    this._initLayout();
  },

  _initLayout: function () {
    let notebook = new Gtk.Notebook();

    let page, label;

    page = this._makePrefsIndicator();
    label = new Gtk.Label({label: _("Indicator")});
    notebook.append_page(page, label);

    page = this._makePrefsStorage();
    label = new Gtk.Label({label: _("Storage")});
    notebook.append_page(page, label);

    page = this._makePrefsUploadImgur();
    label = new Gtk.Label({label: _("Imgur Upload (Beta)")});
    notebook.append_page(page, label);

    page = this._makePrefsKeybindings();
    label = new Gtk.Label({label: _("Keybindings")});
    notebook.append_page(page, label);

    this.add(notebook);
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

    let switchShowIndicator = buildConfigSwitch(
      _('Show Indicator'),
      Config.KeyEnableIndicator
    );

    prefs.add(switchShowIndicator.hbox, {fill: false});

    /* Show notification [on|off] */

    let switchShowNotification = buildConfigSwitch(
      _('Show Notification After Capture'),
      Config.KeyEnableNotification
    );

    prefs.add(switchShowNotification.hbox, {fill: false});


    /* Default click action [dropdown] */

    hbox = buildHbox();

    const labelDefaultClickAction = new Gtk.Label({
      label: _("Primary Button"),
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
      (value) => _settings.set_enum(Config.KeyClickAction, value)
    );

    hbox.add(labelDefaultClickAction);
    hbox.add(comboBoxDefaultClickAction);

    prefs.add(hbox, {fill: false});


    /* Clipboard Action [dropdown] */

    hbox = buildHbox();

    const labelAutoCopy = new Gtk.Label({
      label: _('Auto-Copy to Clipboard'),
      xalign: 0,
      expand: true
    });

    const comboBoxOptions = [
      [_("Nothing")       , Config.ClipboardActions.NONE],
      [_("Image Data")    , Config.ClipboardActions.SET_IMAGE_DATA],
      // [_("Local Path")    , Config.ClipboardActions.SET_LOCAL_PATH]
      // TODO
      // [_("Remote URL")    , Config.ClipboardActions.SET_REMOTE_URL]
    ];


    const currentClipboardAction =
      _settings.get_string(Config.KeyClipboardAction);

    const comboBoxClipboardContent = this._getComboBox(
      comboBoxOptions, GObject.TYPE_STRING, currentClipboardAction,
      (value) => _settings.set_string(Config.KeyClipboardAction, value)
    );

    hbox.add(labelAutoCopy);
    hbox.add(comboBoxClipboardContent);

    prefs.add(hbox, {fill: false});

    return prefs;
  },

  _makePrefsStorage: function () {
    let prefs = new Gtk.Box({
      orientation: Gtk.Orientation.VERTICAL,
      margin: 20,
      margin_top: 10,
      expand: false
    });

    let hbox;

    /* Save Screenshot [on|off] */

    const switchSaveScreenshot = buildConfigSwitch(
      _('Auto-Save Screenshot'), Config.KeySaveScreenshot
    );

    prefs.add(switchSaveScreenshot.hbox, {fill: false});


    /* Save Location [filechooser] */

    hbox = buildHbox();

    const labelSaveLocation = new Gtk.Label({
      label: _('Save Location'),
      xalign: 0,
      expand: true
    });


    const chooserSaveLocation = new Gtk.FileChooserButton({
      title: _("Select"),
      local_only: true,
    });
    chooserSaveLocation.set_action(Gtk.FileChooserAction.SELECT_FOLDER);

    try {
      let saveLocation = Path.expand(
        _settings.get_string(Config.KeySaveLocation)
      );
      chooserSaveLocation.set_filename(saveLocation);
    } catch (e) {
      logError(e);
    }
    chooserSaveLocation.connect('file-set', () => {
      let [filename, err] = GLib.filename_from_uri(
        chooserSaveLocation.get_uri()
      );
      if (err) {
        throw new Error("can't resolve uri");
      }
      _settings.set_string(Config.KeySaveLocation, filename);
    });

    bindSensitivity(switchSaveScreenshot.gtkSwitch, labelSaveLocation);
    bindSensitivity(switchSaveScreenshot.gtkSwitch, chooserSaveLocation);

    hbox.add(labelSaveLocation);
    hbox.add(chooserSaveLocation);

    prefs.add(hbox, {fill: false});


    /* Filename */
    hbox = buildHbox();

    const [defaultTemplate,] =
      _settings.get_default_value(Config.KeyFilenameTemplate).get_string();

    const mockDimensions = {width: 800, height: 600};

    const labelFilenameTemplate = new Gtk.Label({
      label: _('Default Filename'),
      xalign: 0,
      expand: true,
    });

    const inputFilenameTemplate = new Gtk.Entry({
      expand: true,
      tooltip_text: Filename.tooltipText(mockDimensions),
      secondary_icon_name: "document-revert",
    });

    hbox.add(labelFilenameTemplate);
    hbox.add(inputFilenameTemplate);

    inputFilenameTemplate.text =
      _settings.get_string(Config.KeyFilenameTemplate);


    prefs.add(hbox, {fill: false});

    /* Filename Preview */

    hbox = buildHbox();

    const labelPreview = new Gtk.Label({
      label: _('Preview'),
      expand: true,
      xalign: 0
    });

    const textPreview = new Gtk.Label({
      xalign: 0,
    });

    const setPreview = (tpl) => {
      try {
        if (tpl == "") {
          return;
        }
        inputFilenameTemplate.get_style_context().remove_class("error");
        let label = Filename.get(tpl, mockDimensions);
        textPreview.label = label;
        _settings.set_string(Config.KeyFilenameTemplate, tpl);
      } catch (e) {
        logError(e);
        textPreview.label = "";
        inputFilenameTemplate.get_style_context().add_class("error");
      }
    }

    ["inserted-text", "deleted-text"].forEach((name) => {
      inputFilenameTemplate.get_buffer().connect(name, ({text}) => {
        setPreview(text);
      })
    })

    inputFilenameTemplate.connect("icon-press", () => {
      inputFilenameTemplate.text = defaultTemplate;
    });

    setPreview(inputFilenameTemplate.text);

    hbox.add(labelPreview);
    hbox.add(textPreview);

    prefs.add(hbox);



    return prefs;
  },

  _makePrefsUploadImgur: function () {
    let prefs = new Gtk.Box({
      orientation: Gtk.Orientation.VERTICAL,
      margin: 20,
      margin_top: 10,
      expand: false
    });

    /* Enable Imgur Upload [on|off] */

    let configSwitchEnable = buildConfigSwitch(
      _('Enable Imgur Upload'), Config.KeyEnableUploadImgur
    );

    prefs.add(configSwitchEnable.hbox, {fill: false});


    /* Enable Upload Notification [on|off] */
    let configSwitchEnableNotification = buildConfigSwitch(
      _('Show Upload Notification'), Config.KeyImgurEnableNotification
    );

    prefs.add(configSwitchEnableNotification.hbox, {fill: false});

    bindSensitivity(
      configSwitchEnable.gtkSwitch, configSwitchEnableNotification.gtkLabel
    );
    bindSensitivity(
      configSwitchEnable.gtkSwitch, configSwitchEnableNotification.gtkSwitch
    );



    /* Auto-Upload After Capture [on|off] */

    let configSwitchUploadOnCapture = buildConfigSwitch(
      _('Auto-Upload After Capture'), Config.KeyImgurAutoUpload
    );

    bindSensitivity(
      configSwitchEnable.gtkSwitch, configSwitchUploadOnCapture.gtkLabel
    );
    bindSensitivity(
      configSwitchEnable.gtkSwitch, configSwitchUploadOnCapture.gtkSwitch
    );

    prefs.add(configSwitchUploadOnCapture.hbox, {fill: false});

    /* Auto-Copy Link After Upload [on|off] */

    let configSwitchCopyLinkOnUpload = buildConfigSwitch(
      _('Auto-Copy Link After Upload'), Config.KeyImgurAutoCopyLink
    );

    bindSensitivity(
      configSwitchEnable.gtkSwitch, configSwitchCopyLinkOnUpload.gtkLabel
    );
    bindSensitivity(
      configSwitchEnable.gtkSwitch, configSwitchCopyLinkOnUpload.gtkSwitch
    );

    prefs.add(configSwitchCopyLinkOnUpload.hbox, {fill: false});

    /* Auto-Open Link After Upload [on|off] */

    let configSwitchOpenLinkOnUpload = buildConfigSwitch(
      _('Auto-Open Link After Upload'), Config.KeyImgurAutoOpenLink
    );
    bindSensitivity(
      configSwitchEnable.gtkSwitch, configSwitchOpenLinkOnUpload.gtkLabel
    );
    bindSensitivity(
      configSwitchEnable.gtkSwitch, configSwitchOpenLinkOnUpload.gtkSwitch
    );

    prefs.add(configSwitchOpenLinkOnUpload.hbox, {fill: false});


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
      ["shortcut-select-area", _("Select area")],
      ["shortcut-select-window", _("Select window")],
      ["shortcut-select-desktop", _("Select whole desktop")]
    ];

    for (let [name, description] of bindings) {
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
      'title': _('Keyboard Shortcut'),
      'expand': true
    });

    col.pack_start(cellrend, true);
    col.add_attribute(cellrend, 'text', 1);
    treeview.append_column(col);

    cellrend = new Gtk.CellRendererAccel({
      'editable': true,
      'accel-mode': Gtk.CellRendererAccelMode.GTK
    });

    cellrend.connect('accel-edited', (rend, iter, key, mods) => {
      let value = Gtk.accelerator_name(key, mods);
      let [succ, iterator] = model.get_iter_from_string(iter);

      if (!succ) {
        throw new Error("Error updating keybinding");
      }

      let name = model.get_value(iterator, 0);

      model.set(iterator, [2, 3], [mods, key]);
      _settings.set_strv(name, [value]);
    });

    cellrend.connect('accel-cleared', (rend, iter, key, mods) => {
      let [succ, iterator] = model.get_iter_from_string(iter);

      if (!succ) {
        throw new Error("Error clearing keybinding");
      }

      let name = model.get_value(iterator, 0);

      model.set(iterator, [2, 3], [0, 0]);
      _settings.set_strv(name, []);
    });

    col = new Gtk.TreeViewColumn({'title': _('Modify'), min_width: 200});

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

    for (let [label, value] of options) {
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

    comboBox.connect('changed', (entry) => {
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
  Convenience.initTranslations();
}

function buildPrefsWidget() {
  let widget = new ScreenshotToolSettingsWidget();
  widget.show_all();

  return widget;
}
