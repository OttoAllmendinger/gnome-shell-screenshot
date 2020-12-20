import * as St from '@imports/St-1.0';
import * as Cogl from '@imports/Cogl-7';
import * as Clutter from '@imports/Clutter-7';

import { currentVersion } from '../gselib/version';
import { openPrefs } from '../gselib/openPrefs';
import { _ } from '../gselib/gettext';
import ExtensionUtils from '../gselib/extensionUtils';

import * as Config from './config';
import * as Extension from './extension';
import { Screenshot } from './screenshot';
import { wrapNotifyError } from './notifications';

const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const Slider = imports.ui.slider;

const Local = ExtensionUtils.getCurrentExtension();

const version = currentVersion();

const DefaultIcon = 'camera-photo-symbolic';

const settings = ExtensionUtils.getSettings();

// remove this when dropping support for < 3.33
const getActorCompat = (obj) => (version.greaterEqual('3.33') ? obj : obj.actor);

const getSliderSignalCompat = () => (version.greaterEqual('3.33') ? 'notify::value' : 'value-changed');

const addActorCompat = (actor, child) =>
  version.greaterEqual('3.36') ? actor.add_child(child) : actor.add(child, { expand: true });

declare interface CaptureDelayMenu extends St.Widget {}

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

  constructor(_control?) {
    super();

    this.scaleMS = this.createScale();

    this.delayValueMS = settings.get_int(Config.KeyCaptureDelay);
    this.slider = new Slider.Slider(this.scaleToSlider(this.delayValueMS));
    this.slider.connect(getSliderSignalCompat(), this.onDragEnd.bind(this));
    this.sliderItem = new PopupMenu.PopupBaseMenuItem({ activate: false });

    addActorCompat(getActorCompat(this.sliderItem), getActorCompat(this.slider));
    this.addMenuItem(this.sliderItem);

    this.delayInfoItem = new PopupMenu.PopupMenuItem('', {
      activate: false,
      hover: false,
      can_focus: false,
    });
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
      settings.set_int(Config.KeyCaptureDelay, newValue);
      this.updateDelayInfo();
    }
  }

  updateDelayInfo() {
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
}

interface PopupMenuItem extends St.BoxLayout {
  menu: {
    addMenuItem(v: St.Widget | PopupMenuItem);
  };
}

class ScreenshotSection {
  private _screenshot?: Screenshot;

  private readonly image: PopupMenuItem;
  private readonly clear: PopupMenuItem;
  private readonly copy: PopupMenuItem;
  private readonly save: PopupMenuItem;
  private readonly imgurMenu: PopupMenuItem;
  private readonly imgurUpload: PopupMenuItem;
  private readonly imgurOpen: PopupMenuItem;
  private readonly imgurCopyLink: PopupMenuItem;
  private readonly imgurDelete: PopupMenuItem;

  constructor(menu) {
    this.image = new PopupMenu.PopupBaseMenuItem();
    getActorCompat(this.image).content_gravity = Clutter.ContentGravity.RESIZE_ASPECT;

    this.clear = new PopupMenu.PopupMenuItem(_('Clear'));
    this.copy = new PopupMenu.PopupMenuItem(_('Copy'));
    this.save = new PopupMenu.PopupMenuItem(_('Save As...'));

    this.image.connect(
      'activate',
      wrapNotifyError(() => this.onImage()),
    );
    this.clear.connect(
      'activate',
      wrapNotifyError(() => this.onClear()),
    );
    this.copy.connect(
      'activate',
      wrapNotifyError(() => this.onCopy()),
    );
    this.save.connect(
      'activate',
      wrapNotifyError(() => this.onSave()),
    );

    menu.addMenuItem(this.image);
    menu.addMenuItem(this.clear);
    menu.addMenuItem(this.copy);
    menu.addMenuItem(this.save);

    // IMGUR

    menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

    this.imgurMenu = new PopupMenu.PopupSubMenuMenuItem(_('Imgur'), false);
    this.imgurUpload = new PopupMenu.PopupMenuItem(_('Upload'));
    this.imgurOpen = new PopupMenu.PopupMenuItem(_('Open Link'));
    this.imgurCopyLink = new PopupMenu.PopupMenuItem(_('Copy Link'));
    this.imgurDelete = new PopupMenu.PopupMenuItem(_('Delete'));

    this.imgurUpload.connect(
      'activate',
      wrapNotifyError(() => this.onImgurUpload()),
    );
    this.imgurOpen.connect(
      'activate',
      wrapNotifyError(() => this.onImgurOpen()),
    );
    this.imgurCopyLink.connect(
      'activate',
      wrapNotifyError(() => this.onImgurCopyLink()),
    );
    this.imgurDelete.connect(
      'activate',
      wrapNotifyError(() => this.onImgurDelete()),
    );

    this.imgurMenu.menu.addMenuItem(this.imgurUpload);
    this.imgurMenu.menu.addMenuItem(this.imgurOpen);
    this.imgurMenu.menu.addMenuItem(this.imgurCopyLink);
    this.imgurMenu.menu.addMenuItem(this.imgurDelete);

    menu.addMenuItem(this.imgurMenu);

    menu.connect('open-state-changed', () => {
      this.updateVisibility();
    });

    this.updateVisibility();
  }

  updateVisibility() {
    const visible = !!this._screenshot;

    getActorCompat(this.image).visible = visible;
    getActorCompat(this.clear).visible = visible;
    getActorCompat(this.copy).visible = visible;
    getActorCompat(this.save).visible = visible;

    const imgurEnabled = settings.get_boolean(Config.KeyEnableUploadImgur);
    const imgurComplete = this._screenshot && this._screenshot.imgurUpload && this._screenshot.imgurUpload.responseData;

    getActorCompat(this.imgurMenu).visible = visible && imgurEnabled;
    getActorCompat(this.imgurUpload).visible = visible && imgurEnabled && !imgurComplete;
    getActorCompat(this.imgurOpen).visible = visible && imgurEnabled && imgurComplete;
    getActorCompat(this.imgurCopyLink).visible = visible && imgurEnabled && imgurComplete;
    getActorCompat(this.imgurDelete).visible = visible && imgurEnabled && imgurComplete;
  }

  setImage(pixbuf) {
    const { width, height } = pixbuf;
    if (height == 0) {
      return;
    }
    const image = new Clutter.Image();
    const success = image.set_data(
      pixbuf.get_pixels(),
      pixbuf.get_has_alpha() ? Cogl.PixelFormat.RGBA_8888 : Cogl.PixelFormat.RGB_888,
      width,
      height,
      pixbuf.get_rowstride(),
    );
    if (!success) {
      throw Error('error creating Clutter.Image()');
    }

    getActorCompat(this.image).content = image;
    getActorCompat(this.image).height = 200;
  }

  setScreenshot(screenshot: Screenshot | undefined) {
    this._screenshot = screenshot;

    if (this._screenshot) {
      this.setImage(this._screenshot.gtkImage.get_pixbuf());
      this._screenshot.connect('imgur-upload', (obj, upload) => {
        upload.connect('done', (_obj, _data) => {
          this.updateVisibility();
        });
      });
    }

    this.updateVisibility();
  }

  get screenshot(): Screenshot {
    if (!this._screenshot) {
      throw new Error('screenshot not set');
    }
    return this._screenshot;
  }

  onImage() {
    this.screenshot.launchOpen();
  }

  onClear() {
    this.setScreenshot(undefined);
  }

  onCopy() {
    this.screenshot.copyClipboard(settings.get_string(Config.KeyCopyButtonAction));
  }

  onSave() {
    this.screenshot.launchSave();
  }

  onImgurUpload() {
    this.screenshot.imgurStartUpload();
  }

  onImgurOpen() {
    this.screenshot.imgurOpenURL();
  }

  onImgurCopyLink() {
    this.screenshot.imgurCopyURL();
  }

  onImgurDelete() {
    this.screenshot.imgurDelete();
  }
}

export class Indicator {
  private extension: Extension.Extension;
  private screenshotSection?: ScreenshotSection;

  public panelButton: St.Button & { menu: any };

  constructor(extension: Extension.Extension) {
    this.extension = extension;

    this.panelButton = new PanelMenu.Button(null, Config.IndicatorName);
    const icon = new St.Icon({
      icon_name: DefaultIcon,
      style_class: 'system-status-icon',
    });
    getActorCompat(this.panelButton).add_actor(icon);
    getActorCompat(this.panelButton).connect(
      'button-press-event',
      wrapNotifyError((obj, evt) => this.onClick(obj, evt)),
    );

    this.buildMenu();
  }

  onClick(_obj: unknown, evt: Clutter.Event): void {
    // only override primary button behavior
    if (evt.get_button() !== Clutter.BUTTON_PRIMARY) {
      return;
    }

    const action = settings.get_string(Config.KeyClickAction);
    if (action === 'show-menu') {
      return;
    }

    this.panelButton.menu.close();
    this.extension.onAction(action);
  }

  buildMenu(): void {
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
        this.extension.onAction(action);
      });
      menu.addMenuItem(item);
    });

    // Delay

    menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

    menu.addMenuItem(new CaptureDelayMenu());

    menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

    this.screenshotSection = new ScreenshotSection(menu);

    menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

    // Settings can only be triggered via menu
    const settingsItem = new PopupMenu.PopupMenuItem(_('Settings'));
    settingsItem.connect('activate', () => {
      openPrefs(version, Local.metadata.uuid, { shell: imports.gi.Shell });
    });
    menu.addMenuItem(settingsItem);
  }

  setScreenshot(screenshot: Screenshot): void {
    if (!this.screenshotSection) {
      throw new Error();
    }
    this.screenshotSection.setScreenshot(screenshot);
  }

  destroy(): void {
    this.panelButton.destroy();
  }
}
