/*jshint moz:true */
// vi: sts=2 sw=2 et
//
// accelerator setting based on
// https://github.com/ambrice/spatialnavigation-tastycactus.com/blob/master/prefs.js

const Signals = imports.signals;

const Gtk = imports.gi.Gtk;
const GLib = imports.gi.GLib;
const GObject = imports.gi.GObject;

const Gettext = imports.gettext.domain("gnome-shell-screenshot");
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
  const hbox = buildHbox();

  const gtkLabel = new Gtk.Label({
    label,
    xalign: 0,
    expand: true
  });

  const gtkSwitch = new Gtk.Switch();

  gtkSwitch.connect("notify::active", (button) => {
    _settings.set_boolean(configKey, button.active);
  });

  gtkSwitch.active = _settings.get_boolean(configKey);

  hbox.add(gtkLabel);
  hbox.add(gtkSwitch);

  return {
    hbox,
    gtkLabel,
    gtkSwitch
  };
};

const bindSensitivity = (source, target) => {
  const set = () => {
    target.set_sensitive(source.active)
  };
  source.connect("notify::active", set);
  set();
}

const ScreenshotToolSettingsWidget = new GObject.Class({
  Name: "ScreenshotToolSettingsWidget",
  GTypeName: "ScreenshotToolSettingsWidget",
  Extends: Gtk.Box,

  _init(params) {
    this.parent(params);
    this._initLayout();
  },

  _initLayout() {
    const notebook = new Gtk.Notebook();

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

  _makePrefsIndicator() {
    const prefs = new Gtk.Box({
      orientation: Gtk.Orientation.VERTICAL,
      margin: 20,
      margin_top: 10,
      expand: false
    });

    let hbox;

    /* Show indicator [on|off] */

    const switchShowIndicator = buildConfigSwitch(
      _("Show Indicator"),
      Config.KeyEnableIndicator
    );

    prefs.add(switchShowIndicator.hbox, {fill: false});

    /* Show notification [on|off] */

    const switchShowNotification = buildConfigSwitch(
      _("Show Notification After Capture"),
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
      [_("Select Area"), Config.ClickActions.SELECT_AREA],
      [_("Select Window"), Config.ClickActions.SELECT_WINDOW],
      [_("Select Desktop"), Config.ClickActions.SELECT_DESKTOP],
      [_("Show Menu"), Config.ClickActions.SHOW_MENU]
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

    const [
      optionNothing,
      optionImageData,
      optionLocalPath
    ] = [
      [_("Nothing"), Config.ClipboardActions.NONE],
      [_("Image Data"), Config.ClipboardActions.SET_IMAGE_DATA],
      [_("Local Path"), Config.ClipboardActions.SET_LOCAL_PATH]
      // TODO
      // [_("Remote URL")    , Config.ClipboardActions.SET_REMOTE_URL]
    ];

    const clipboardActionDropdown = (label, { options, configKey }) => {
      hbox = buildHbox();

      const labelAutoCopy = new Gtk.Label({
        label,
        xalign: 0,
        expand: true
      });

      const currentValue = _settings.get_string(configKey);

      const comboBoxClipboardContent = this._getComboBox(
        options, GObject.TYPE_STRING, currentValue,
        (value) => _settings.set_string(configKey, value)
      );

      hbox.add(labelAutoCopy);
      hbox.add(comboBoxClipboardContent);

      prefs.add(hbox, {fill: false});
    }

    clipboardActionDropdown(
      _("Copy Button"), {
        options: [optionImageData, optionLocalPath],
        configKey: Config.KeyCopyButtonAction,
      }
    );

    clipboardActionDropdown(
      _("Auto-Copy to Clipboard"), {
        options: [optionNothing, optionImageData, optionLocalPath],
        configKey: Config.KeyClipboardAction,
      }
    );

    return prefs;
  },

  _makePrefsStorage() {
    const prefs = new Gtk.Box({
      orientation: Gtk.Orientation.VERTICAL,
      margin: 20,
      margin_top: 10,
      expand: false
    });

    let hbox;

    /* Save Screenshot [on|off] */

    const switchSaveScreenshot = buildConfigSwitch(
      _("Auto-Save Screenshot"), Config.KeySaveScreenshot
    );

    prefs.add(switchSaveScreenshot.hbox, {fill: false});


    /* Save Location [filechooser] */

    hbox = buildHbox();

    const labelSaveLocation = new Gtk.Label({
      label: _("Save Location"),
      xalign: 0,
      expand: true
    });


    const chooserSaveLocation = new Gtk.FileChooserButton({
      title: _("Select"),
      local_only: true,
    });
    chooserSaveLocation.set_action(Gtk.FileChooserAction.SELECT_FOLDER);

    try {
      const saveLocation = Path.expand(
        _settings.get_string(Config.KeySaveLocation)
      );
      chooserSaveLocation.set_filename(saveLocation);
    } catch (e) {
      logError(e);
    }
    chooserSaveLocation.connect("file-set", () => {
      const [filename, err] = GLib.filename_from_uri(
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

    const [defaultTemplate, ] =
      _settings.get_default_value(Config.KeyFilenameTemplate).get_string();

    const mockDimensions = {width: 800, height: 600};

    const labelFilenameTemplate = new Gtk.Label({
      label: _("Default Filename"),
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
      label: _("Preview"),
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
        const label = Filename.get(tpl, mockDimensions);
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

  _makePrefsUploadImgur() {
    const prefs = new Gtk.Box({
      orientation: Gtk.Orientation.VERTICAL,
      margin: 20,
      margin_top: 10,
      expand: false
    });

    /* Enable Imgur Upload [on|off] */

    const configSwitchEnable = buildConfigSwitch(
      _("Enable Imgur Upload"), Config.KeyEnableUploadImgur
    );

    prefs.add(configSwitchEnable.hbox, {fill: false});


    /* Enable Upload Notification [on|off] */
    const configSwitchEnableNotification = buildConfigSwitch(
      _("Show Upload Notification"), Config.KeyImgurEnableNotification
    );

    prefs.add(configSwitchEnableNotification.hbox, {fill: false});

    bindSensitivity(
      configSwitchEnable.gtkSwitch, configSwitchEnableNotification.gtkLabel
    );
    bindSensitivity(
      configSwitchEnable.gtkSwitch, configSwitchEnableNotification.gtkSwitch
    );



    /* Auto-Upload After Capture [on|off] */

    const configSwitchUploadOnCapture = buildConfigSwitch(
      _("Auto-Upload After Capture"), Config.KeyImgurAutoUpload
    );

    bindSensitivity(
      configSwitchEnable.gtkSwitch, configSwitchUploadOnCapture.gtkLabel
    );
    bindSensitivity(
      configSwitchEnable.gtkSwitch, configSwitchUploadOnCapture.gtkSwitch
    );

    prefs.add(configSwitchUploadOnCapture.hbox, {fill: false});

    /* Auto-Copy Link After Upload [on|off] */

    const configSwitchCopyLinkOnUpload = buildConfigSwitch(
      _("Auto-Copy Link After Upload"), Config.KeyImgurAutoCopyLink
    );

    bindSensitivity(
      configSwitchEnable.gtkSwitch, configSwitchCopyLinkOnUpload.gtkLabel
    );
    bindSensitivity(
      configSwitchEnable.gtkSwitch, configSwitchCopyLinkOnUpload.gtkSwitch
    );

    prefs.add(configSwitchCopyLinkOnUpload.hbox, {fill: false});

    /* Auto-Open Link After Upload [on|off] */

    const configSwitchOpenLinkOnUpload = buildConfigSwitch(
      _("Auto-Open Link After Upload"), Config.KeyImgurAutoOpenLink
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

  _makePrefsKeybindings() {
    const model = new Gtk.ListStore();

    model.set_column_types([
        GObject.TYPE_STRING,
        GObject.TYPE_STRING,
        GObject.TYPE_INT,
        GObject.TYPE_INT
    ]);

    const bindings = [
      ["shortcut-select-area", _("Select area")],
      ["shortcut-select-window", _("Select window")],
      ["shortcut-select-desktop", _("Select whole desktop")]
    ];

    for (const [name, description] of bindings) {
      log("binding: " + name + " description: " + description);
      const binding = _settings.get_strv(name)[0];

      let key, mods;

      if (binding) {
        [key, mods] = Gtk.accelerator_parse(binding);
      } else {
        [key, mods] = [0, 0];
      }

      const row = model.append();

      model.set(row, [0, 1, 2, 3], [name, description, mods, key]);
    }

    const treeview = new Gtk.TreeView({
        "expand": true,
        model
    });

    let cellrend = new Gtk.CellRendererText();
    let col = new Gtk.TreeViewColumn({
      "title": _("Keyboard Shortcut"),
      "expand": true
    });

    col.pack_start(cellrend, true);
    col.add_attribute(cellrend, "text", 1);
    treeview.append_column(col);

    cellrend = new Gtk.CellRendererAccel({
      "editable": true,
      "accel-mode": Gtk.CellRendererAccelMode.GTK
    });

    cellrend.connect("accel-edited", (rend, iter, key, mods) => {
      const value = Gtk.accelerator_name(key, mods);
      const [succ, iterator] = model.get_iter_from_string(iter);

      if (!succ) {
        throw new Error("Error updating keybinding");
      }

      const name = model.get_value(iterator, 0);

      model.set(iterator, [2, 3], [mods, key]);
      _settings.set_strv(name, [value]);
    });

    cellrend.connect("accel-cleared", (rend, iter, key, mods) => {
      const [succ, iterator] = model.get_iter_from_string(iter);

      if (!succ) {
        throw new Error("Error clearing keybinding");
      }

      const name = model.get_value(iterator, 0);

      model.set(iterator, [2, 3], [0, 0]);
      _settings.set_strv(name, []);
    });

    col = new Gtk.TreeViewColumn({"title": _("Modify"), min_width: 200});

    col.pack_end(cellrend, false);
    col.add_attribute(cellrend, "accel-mods", 2);
    col.add_attribute(cellrend, "accel-key", 3);
    treeview.append_column(col);

    return treeview;
  },

  _getComboBox(options, valueType, defaultValue, callback) {
    const model = new Gtk.ListStore();

    const Columns = { LABEL: 0, VALUE: 1 };

    model.set_column_types([GObject.TYPE_STRING, valueType]);

    const comboBox = new Gtk.ComboBox({model});
    const renderer = new Gtk.CellRendererText();

    comboBox.pack_start(renderer, true);
    comboBox.add_attribute(renderer, "text", 0);

    for (const [label, value] of options) {
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

    comboBox.connect("changed", (entry) => {
      const [success, iter] = comboBox.get_active_iter();

      if (!success) {
          return;
      }

      const value = model.get_value(iter, Columns.VALUE);

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
  const widget = new ScreenshotToolSettingsWidget();
  widget.show_all();

  return widget;
}
