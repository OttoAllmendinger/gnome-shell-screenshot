// vi: sts=2 sw=2 et

const Lang = imports.lang;
const Signals = imports.signals;

const St = imports.gi.St;
const Shell = imports.gi.Shell;

const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;

const Gettext = imports.gettext.domain('gnome-shell-screenshot');
const _ = Gettext.gettext;

const ExtensionUtils = imports.misc.extensionUtils;
const Local = ExtensionUtils.getCurrentExtension();

const Config = Local.imports.config;


const DefaultIcon = 'camera-photo-symbolic';




const Indicator = new Lang.Class({
  Name: "ScreenshotTool.Indicator",
  Extends: PanelMenu.Button,

  _init: function (extension) {
    this.parent(null, Config.IndicatorName);

    this._extension = extension;

    this._signalSettings = [];

    this._icon = new St.Icon({
      icon_name: DefaultIcon,
      style_class: 'system-status-icon'
    });

    this.actor.add_actor(this._icon);

    this._signalSettings.push(this._extension.settings.connect(
        'changed::' + Config.KeyClickAction,
        this._updateButton.bind(this)
    ));

    this._signalButtonPressEvent = this.actor.connect(
      'button-press-event',
      this._onClick.bind(this)
    );

    this._updateButton();
  },

  _updateButton: function () {
    const action = this._clickAction =
      this._extension.settings.get_string(Config.KeyClickAction);

    if (action === 'show-menu') {
      this._enableMenu()
    } else {
      this._disableMenu();
    }
  },

  _onClick: function () {
    if (this._clickAction && (this._clickAction !== 'show-menu')) {
      this._extension.onAction(this._clickAction);
    }
  },

  _enableMenu: function () {
    // These actions can be triggered via shortcut or popup menu
    const items = [
      ["select-area", _("Select Area")],
      ["select-window", _("Select Window")],
      ["select-desktop", _("Select Desktop")]
    ];

    items.forEach(([action, title]) => {
      let item = new PopupMenu.PopupMenuItem(title);
      item.connect(
        'activate', function (action) {
          this.menu.close();
          this._extension.onAction(action);
        }.bind(this, action)
      );
      this.menu.addMenuItem(item);
    })

    this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

    // Settings can only be triggered via menu
    let settingsItem = new PopupMenu.PopupMenuItem(_('Settings'));
    settingsItem.connect('activate', () => {
      let appSys = Shell.AppSystem.get_default();
      let prefs = appSys.lookup_app('gnome-shell-extension-prefs.desktop');
      if (prefs.get_state() == prefs.SHELL_APP_STATE_RUNNING) {
        prefs.activate();
      } else {
        prefs.get_app_info().launch_uris(
          ['extension:///' + Local.metadata.uuid], null
        );
      }
    });
    this.menu.addMenuItem(settingsItem);
  },

  _disableMenu: function () {
    this.menu.removeAll();
  },

  destroy: function () {
    this.parent();
    this._signalSettings.forEach((signal) => {
      this._extension.settings.disconnect(signal);
    });
  }
});
