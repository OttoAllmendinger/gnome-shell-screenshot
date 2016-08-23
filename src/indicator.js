// vi: sts=2 sw=2 et

const Lang = imports.lang;
const Signals = imports.signals;

const St = imports.gi.St;

const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;

const Gettext = imports.gettext.domain('gnome-shell-extensions');
const _ = Gettext.gettext;

const ExtensionUtils = imports.misc.extensionUtils;
const Local = ExtensionUtils.getCurrentExtension();

const Config = Local.imports.config;


const DefaultIcon = 'imgur-uploader-symbolic';
const HoverIcon = 'imgur-uploader-color';




const Indicator = new Lang.Class({
  Name: "ImgurUploader.Indicator",
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
    this.actor.connect('enter-event', this._hoverIcon.bind(this));
    this.actor.connect('leave-event', this._resetIcon.bind(this));

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
    const items = [
      ["select-area", _("Select Area")],
      ["select-window", _("Select Window")],
      ["select-desktop", _("Select Desktop")]
    ];

    for each (let [action, title] in items) {
      let item = new PopupMenu.PopupMenuItem(title);
      item.connect(
        'activate', function (action) {
          this.menu.close();
          this._extension.onAction(action);
        }.bind(this, action)
      );
      this.menu.addMenuItem(item);
    }
  },

  _disableMenu: function () {
    this.menu.removeAll();
  },

  startSelection: function () {
    this._selection = true;
    this._hoverIcon();
  },

  stopSelection: function () {
    this._selection = false;
    this._resetIcon();
  },

  _hoverIcon: function () {
    this._icon.icon_name = HoverIcon;
  },

  _resetIcon: function () {
    if (!this._selection) {
      this._icon.icon_name = DefaultIcon;
    }
  },

  destroy: function () {
    this.parent();
    this._signalSettings.forEach(function (signal) {
      this._extension.settings.disconnect(signal);
    }.bind(this));
  }
});
