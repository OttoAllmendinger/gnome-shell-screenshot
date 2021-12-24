import * as St from '@imports/St-1.0';
import * as Cogl from '@imports/Cogl-8';
import * as Clutter from '@imports/Clutter-8';

import ExtensionUtils, { _ } from '../gselib/extensionUtils';

import * as Config from './config';
import * as Extension from './extension';
import { Screenshot } from './screenshot';
import { wrapNotifyError } from './notifications';
import { onAction } from './actions';
import { getExtension } from './extension';
import { ActionName, getBackend } from './backends/backend';

const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const Slider = imports.ui.slider;

const DefaultIcon = 'camera-photo-symbolic';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare interface CaptureDelayMenu extends St.Widget {}

class CaptureDelayMenu extends PopupMenu.PopupMenuSection {
  createScale() {
    const scale = [0];
    for (let x = 1; x <= 10; x += 1) {
      scale.push(x * 1000);
    }
    return scale;
  }

  constructor(_control?) {
    super();

    this.scaleMS = this.createScale();

    this.delayValueMS = getExtension().settings.get_int(Config.KeyCaptureDelay);
    this.slider = new Slider.Slider(this.scaleToSlider(this.delayValueMS));
    this.slider.connect('notify::value', this.onDragEnd.bind(this));
    this.sliderItem = new PopupMenu.PopupBaseMenuItem({ activate: false });

    this.sliderItem.add_child(this.slider);
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
      getExtension().settings.set_int(Config.KeyCaptureDelay, newValue);
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
    this.image.content_gravity = Clutter.ContentGravity.RESIZE_ASPECT;

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

    this.updateVisibility();
  }

  updateVisibility() {
    const visible = !!this._screenshot;

    this.image.visible = visible;
    this.clear.visible = visible;
    this.copy.visible = visible;
    this.save.visible = visible;

    const imgurEnabled = getExtension().settings.get_boolean(Config.KeyEnableUploadImgur);
    const imgurComplete = this._screenshot && this._screenshot.imgurUpload && this._screenshot.imgurUpload.responseData;

    this.imgurMenu.visible = visible && imgurEnabled;
    this.imgurUpload.visible = visible && imgurEnabled && !imgurComplete;
    this.imgurOpen.visible = visible && imgurEnabled && imgurComplete;
    this.imgurCopyLink.visible = visible && imgurEnabled && imgurComplete;
    this.imgurDelete.visible = visible && imgurEnabled && imgurComplete;
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

    this.image.content = image;
    this.image.height = 200;
  }

  setScreenshot(screenshot: Screenshot | undefined) {
    this._screenshot = screenshot;

    if (this._screenshot) {
      this.setImage(this._screenshot.pixbuf);
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
    this.screenshot.copyClipboard(getExtension().settings.get_string(Config.KeyCopyButtonAction));
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
  private screenshotSection: ScreenshotSection;
  private captureDelayMenu: CaptureDelayMenu;
  private actionItems: Record<ActionName, PopupMenuItem>;

  public panelButton: St.Button & { menu: any };

  constructor(extension: Extension.Extension) {
    this.extension = extension;

    this.panelButton = new PanelMenu.Button(null, Config.IndicatorName);
    const icon = new St.Icon({
      icon_name: DefaultIcon,
      style_class: 'system-status-icon',
    });
    this.panelButton.add_actor(icon);
    this.panelButton.connect(
      'button-press-event',
      wrapNotifyError((obj, evt) => this.onClick(obj, (evt as unknown) as Clutter.Event)),
    );

    // These actions can be triggered via shortcut or popup menu
    const menu = this.panelButton.menu;
    const items: [ActionName, string][] = [
      ['open-portal', _('Open Portal')],
      ['select-area', _('Select Area')],
      ['select-window', _('Select Window')],
      ['select-desktop', _('Select Desktop')],
    ];

    this.actionItems = items.reduce((record: Record<ActionName, PopupMenuItem>, [action, title]) => {
      const item = new PopupMenu.PopupMenuItem(title);
      item.connect(
        'activate',
        wrapNotifyError(async () => {
          menu.close();
          await onAction(action);
        }),
      );
      menu.addMenuItem(item);
      return { ...record, [action]: item };
    }, {} as Record<ActionName, PopupMenuItem>);

    menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

    menu.addMenuItem((this.captureDelayMenu = new CaptureDelayMenu()));

    menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

    this.screenshotSection = new ScreenshotSection(menu);

    menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

    // Settings can only be triggered via menu
    const settingsItem = new PopupMenu.PopupMenuItem(_('Settings'));
    settingsItem.connect('activate', () => {
      ExtensionUtils.openPrefs();
    });
    menu.addMenuItem(settingsItem);

    menu.connect('open-state-changed', () => {
      this.updateVisibility();
    });
  }

  onClick(_obj: unknown, evt: Clutter.Event): void {
    // only override primary button behavior
    if (evt.get_button() !== Clutter.BUTTON_PRIMARY) {
      return;
    }

    const action = getExtension().settings.get_string(Config.KeyClickAction);
    if (action === 'show-menu') {
      return;
    }

    this.panelButton.menu.close();
    wrapNotifyError(async () => onAction(action));
  }

  updateVisibility(): void {
    const backend = getBackend(this.extension.settings);
    Object.entries(this.actionItems).forEach(([actionName, item]) => {
      item.visible = backend.supportsAction(actionName as ActionName);
    });

    this.captureDelayMenu.visible = backend.supportsParam('delay-seconds');

    this.screenshotSection.updateVisibility();
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
