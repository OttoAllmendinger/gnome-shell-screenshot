// vi: sts=2 sw=2 et

const Lang = imports.lang;
const Signals = imports.signals;

const St = imports.gi.St;
const Cogl = imports.gi.Cogl;
const Shell = imports.gi.Shell;
const Clutter = imports.gi.Clutter;

const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const Slider = imports.ui.slider;

const Gettext = imports.gettext.domain('gnome-shell-screenshot');
const _ = Gettext.gettext;

const ExtensionUtils = imports.misc.extensionUtils;
const Local = ExtensionUtils.getCurrentExtension();

const Config = Local.imports.config.exports;
const Convenience = Local.imports.convenience.exports;

const { dump } = Local.imports.dump.exports;


const DefaultIcon = 'camera-photo-symbolic';


const settings = Convenience.getSettings();

const CaptureDelayMenu = new Lang.Class({
  Name: 'CaptureDelayMenu',
  Extends: PopupMenu.PopupMenuSection,

  createScale: function () {
    let scale = [0];
    for (let p = 1; p < 4; p ++) {
      for (let x = 1; x <= 10; x += 1) {
        scale.push(x * Math.pow(10, p));
      }
    }
    return scale;
  },

  _init: function(control) {
    this.parent();

    this.scaleMS = this.createScale();

    this.delayValueMS = settings.get_int(Config.KeyCaptureDelay);
    this.slider = new Slider.Slider(this.scaleToSlider(this.delayValueMS));
    this.slider.connect('value-changed', this.onDragEnd.bind(this));
    this.sliderItem = new PopupMenu.PopupBaseMenuItem({ activate: false });
    this.sliderItem.actor.add(this.slider.actor, { expand: true });
    this.addMenuItem(this.sliderItem);

    this.delayInfoItem = new PopupMenu.PopupMenuItem(
      '', { activate: false, hover: false, can_focus: false }
    );
    this.addMenuItem(this.delayInfoItem)

    this.updateDelayInfo();
  },

  scaleToSlider: function (ms) {
    return this.scaleMS.findIndex((v) => v >= ms) / (this.scaleMS.length-1);
  },

  sliderToScale: function (value) {
    return this.scaleMS[(value * (this.scaleMS.length-1)) | 0];
  },

  onDragEnd: function(slider, value, property) {
    const newValue = this.sliderToScale(value);
    if (newValue !== this.delayValueMS) {
      this.delayValueMS = newValue;
      settings.set_int(Config.KeyCaptureDelay, newValue);
      this.updateDelayInfo();
    }
  },

  updateDelayInfo: function() {
    const v = this.delayValueMS;
    let text;
    if (v === 0) {
      text = _('No Capture Delay');
    } else if (v < 1000) {
      text = `${v}ms ` + _('Capture Delay');
    } else {
      text = `${v / 1000}s ` + _('Capture Delay');
    }
    this.delayInfoItem.label.text = text;
  }
});

const ScreenshotSection = new Lang.Class({
  Name: "ScreenshotTool.ScreenshotSection",

  _init: function (menu) {
    this._screenshot = null;

    this._image = new PopupMenu.PopupBaseMenuItem();
    this._image.actor.content_gravity =
      Clutter.ContentGravity.RESIZE_ASPECT;

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

    menu.connect("open-state-changed", () => {
      this._updateVisibility();
    });

    this._updateVisibility();
  },

  _updateVisibility: function () {
    let visible = !!this._screenshot;

    this._image.actor.visible = visible;
    this._clear.actor.visible = visible;
    this._copy.actor.visible = visible;
    this._save.actor.visible = visible;

    let imgurEnabled = settings.get_boolean(Config.KeyEnableUploadImgur);
    let imgurComplete =
        this._screenshot &&
        this._screenshot.imgurUpload &&
        this._screenshot.imgurUpload.responseData;

    this._imgurMenu.actor.visible =
      visible && imgurEnabled;
    this._imgurUpload.actor.visible =
      visible && imgurEnabled && !imgurComplete;
    this._imgurOpen.actor.visible =
      visible && imgurEnabled && imgurComplete;
    this._imgurCopyLink.actor.visible =
      visible && imgurEnabled && imgurComplete;
    this._imgurDelete.actor.visible =
      visible && imgurEnabled && imgurComplete;
  },

  _setImage: function (pixbuf) {
    let {width, height} = pixbuf;
    if (height == 0) {
      return;
    }
    let image = new Clutter.Image();
    let success = image.set_data(
      pixbuf.get_pixels(),
      pixbuf.get_has_alpha()
        ? Cogl.PixelFormat.RGBA_8888
        : Cogl.PixelFormat.RGB_888,
      width,
      height,
      pixbuf.get_rowstride()
    );
    if (!success) {
      throw Error("error creating Clutter.Image()");
    }

    this._image.actor.content = image;
    this._image.actor.height = 200;
  },

  setScreenshot: function (screenshot) {
    this._screenshot = screenshot;

    if (screenshot) {
      this._setImage(screenshot.gtkImage.get_pixbuf());
      this._screenshot.connect("imgur-upload", (obj, upload) => {
        upload.connect("done", (obj, data) => {
          this._updateVisibility();
        });
      });
    }

    this._updateVisibility();
  },

  _onImage: function () {
    this._screenshot.launchOpen();
  },

  _onClear: function () {
    this.setScreenshot(null);
  },

  _onCopy: function () {
    this._screenshot.copyClipboard();
  },

  _onSave: function () {
    this._screenshot.launchSave();
  },

  _onImgurUpload: function () {
    this._screenshot.imgurStartUpload();
  },

  _onImgurOpen: function () {
    this._screenshot.imgurOpenURL();
  },

  _onImgurCopyLink: function () {
    this._screenshot.imgurCopyURL();
  },

  _onImgurDelete: function () {
    this._screenshot.imgurDelete();
  }
})



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
    this.actor.connect('button-press-event', this._onClick.bind(this));

    this._buildMenu();
  },

  _onClick: function (obj, evt) {
    // only override primary button behavior
    if (evt.get_button() !== Clutter.BUTTON_PRIMARY) {
      return;
    }

    let action = settings.get_string(Config.KeyClickAction);
    if (action === 'show-menu') {
      return;
    }

    this.menu.close();
    this._extension.onAction(action);
  },

  _buildMenu: function () {
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


    // Delay

    this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

    this.menu.addMenuItem(new CaptureDelayMenu());

    this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

    this._screenshotSection = new ScreenshotSection(this.menu);

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

  setScreenshot: function (screenshot) {
    this._screenshotSection.setScreenshot(screenshot);
  },

  destroy: function () {
    this.parent();
    this._signalSettings.forEach((signal) => {
      settings.disconnect(signal);
    });
  }
});

var exports = {
  Indicator
};
