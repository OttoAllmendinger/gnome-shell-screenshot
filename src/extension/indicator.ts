import St from '@girs/st-13';
import Cogl from '@girs/cogl-10';
import Clutter from '@girs/clutter-13';
import GdkPixbuf from '@girs/gdkpixbuf-2.0';

import * as PanelMenu from '@gnome-shell/ui/panelMenu';
import * as PopupMenu from '@gnome-shell/ui/popupMenu';
import * as Slider from '@gnome-shell/ui/slider';

import * as Config from './config';
import { Screenshot } from './screenshot';
import { wrapNotifyError } from './notifications';
import { onAction } from './actions';
import { getExtension } from './extension';
import { ActionName, getBackend } from './backends/backend';
import { _ } from './gettext';
import { Upload } from './imgur/Upload';

const DefaultIcon = 'camera-photo-symbolic';

function getMenu(obj: unknown): PopupMenu.PopupMenu {
  if (typeof obj === 'object' && obj && 'menu' in obj) {
    return (obj as Record<string, unknown>).menu as PopupMenu.PopupMenu;
  }
  throw new Error('could not get menu');
}

function getLabel(obj: unknown): St.Label {
  if (typeof obj === 'object' && obj && 'label' in obj) {
    return (obj as Record<string, unknown>).label as St.Label;
  }
  throw new Error('could not get label');
}

class CaptureDelayMenu extends PopupMenu.PopupMenuSection {
  private readonly slider: Slider.Slider;
  private scaleMS: number[];
  private delayValueMS: number;
  private readonly sliderItem: PopupMenu.PopupBaseMenuItem;
  private readonly delayInfoItem: PopupMenu.PopupMenuItem;

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

    this.delayValueMS = getExtension().getSettings().get_int(Config.KeyCaptureDelay);
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

  scaleToSlider(ms: number) {
    return this.scaleMS.findIndex((v) => v >= ms) / (this.scaleMS.length - 1);
  }

  sliderToScale(value: number) {
    return this.scaleMS[(value * (this.scaleMS.length - 1)) | 0];
  }

  onDragEnd(slider: Slider.Slider) {
    const newValue = this.sliderToScale(slider.value);
    if (newValue !== this.delayValueMS) {
      this.delayValueMS = newValue;
      getExtension().getSettings().set_int(Config.KeyCaptureDelay, newValue);
      this.updateDelayInfo();
    }
  }

  updateDelayInfo(): void {
    const v = this.delayValueMS;
    let text;
    if (v === 0) {
      text = _('No Capture Delay');
    } else if (v < 1000) {
      text = `${v}ms ` + _('Capture Delay');
    } else {
      text = `${v / 1000}s ` + _('Capture Delay');
    }
    getLabel(this.delayInfoItem).text = text;
  }
}

class ScreenshotSection {
  private _screenshot?: Screenshot;

  private image: PopupMenu.PopupMenuItem;
  private clear: PopupMenu.PopupMenuItem;
  private copy: PopupMenu.PopupMenuItem;
  private save: PopupMenu.PopupMenuItem;
  private imgurMenu: PopupMenu.PopupSubMenuMenuItem;
  private imgurUpload: PopupMenu.PopupMenuItem;
  private imgurOpen: PopupMenu.PopupMenuItem;
  private imgurCopyLink: PopupMenu.PopupMenuItem;
  private imgurDelete: PopupMenu.PopupMenuItem;

  constructor(menu: PopupMenu.PopupMenu) {
    this.image = new PopupMenu.PopupBaseMenuItem();
    this.image.style = 'padding: 0px;';
    this.image.x_align = Clutter.ActorAlign.CENTER;
    this.image.y_align = Clutter.ActorAlign.CENTER;

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

    getMenu(this.imgurMenu).addMenuItem(this.imgurUpload);
    getMenu(this.imgurMenu).addMenuItem(this.imgurOpen);
    getMenu(this.imgurMenu).addMenuItem(this.imgurCopyLink);
    getMenu(this.imgurMenu).addMenuItem(this.imgurDelete);

    menu.addMenuItem(this.imgurMenu);

    this.updateVisibility();
  }

  updateVisibility() {
    const visible = !!this._screenshot;

    this.image.visible = visible;
    this.clear.visible = visible;
    this.copy.visible = visible;
    this.save.visible = visible;

    const imgurEnabled = getExtension().getConfig().getBool(Config.KeyEnableUploadImgur);
    const imgurComplete = this._screenshot && this._screenshot.imgurUpload && this._screenshot.imgurUpload.response;

    this.imgurMenu.visible = visible && imgurEnabled;
    this.imgurUpload.visible = visible && imgurEnabled && !imgurComplete;
    this.imgurOpen.visible = Boolean(visible && imgurEnabled && imgurComplete);
    this.imgurCopyLink.visible = Boolean(visible && imgurEnabled && imgurComplete);
    this.imgurDelete.visible = Boolean(visible && imgurEnabled && imgurComplete);
  }

  setImage(pixbuf: GdkPixbuf.Pixbuf) {
    const content = St.ImageContent.new_with_preferred_size(pixbuf.width, pixbuf.height);
    (content as any).set_bytes(
      pixbuf.get_pixels(),
      Cogl.PixelFormat.RGBA_8888,
      pixbuf.width,
      pixbuf.height,
      pixbuf.rowstride,
    );
    const widget = new St.Widget({
      content,
      content_gravity: Clutter.ContentGravity.RESIZE_ASPECT,
      width: pixbuf.width,
      height: pixbuf.height,
    });
    if (widget.width > 200) {
      widget.width = 200;
    }
    if (widget.height > 200) {
      widget.height = 200;
    }
    this.image.remove_all_children();
    this.image.add_child(widget);
  }

  setScreenshot(screenshot: Screenshot | undefined) {
    this._screenshot = screenshot;

    if (this._screenshot) {
      this.setImage(this._screenshot.pixbuf);
      this._screenshot.on('imgur-upload', (upload: Upload) => {
        upload.on('done', () => {
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
    this.screenshot.copyClipboard(getExtension().getConfig().getString(Config.KeyCopyButtonAction));
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
  private screenshotSection: ScreenshotSection;
  private captureDelayMenu: CaptureDelayMenu;
  private actionItems: Record<ActionName, PopupMenu.PopupMenuItem>;

  public panelButton: PanelMenu.Button;

  constructor() {
    this.panelButton = new PanelMenu.Button(0, Config.IndicatorName);
    const icon = new St.Icon({
      icon_name: DefaultIcon,
      style_class: 'system-status-icon',
    });
    this.panelButton.add_actor(icon);
    this.panelButton.connect(
      'button-press-event',
      wrapNotifyError((obj, evt) => this.onClick(obj, evt as unknown as Clutter.Event)),
    );

    // These actions can be triggered via shortcut or popup menu
    const menu = this.panelButton.menu;
    const items: [ActionName, string][] = [
      ['open-portal', _('Open Portal')],
      ['select-area', _('Select Area')],
      ['select-window', _('Select Window')],
      ['select-desktop', _('Select Desktop')],
    ];

    this.actionItems = items.reduce(
      (record: Record<ActionName, PopupMenu.PopupMenuItem>, [action, title]) => {
        const item = new PopupMenu.PopupMenuItem(title);
        item.connect(
          'activate',
          wrapNotifyError(async () => {
            menu.close(/* animate */ true);
            await onAction(action);
          }),
        );
        menu.addMenuItem(item);
        return { ...record, [action]: item };
      },
      {} as Record<ActionName, PopupMenu.PopupMenuItem>,
    );

    menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

    this.captureDelayMenu = new CaptureDelayMenu();
    // FIXME: cast due to a bug in the type definitions
    menu.addMenuItem(this.captureDelayMenu as unknown as PopupMenu.PopupBaseMenuItem);

    menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

    this.screenshotSection = new ScreenshotSection(menu);

    menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

    // Settings can only be triggered via menu
    const settingsItem = new PopupMenu.PopupMenuItem(_('Settings'));
    settingsItem.connect('activate', () => {
      getExtension().openPreferences();
    });
    menu.addMenuItem(settingsItem);

    menu.connect('open-state-changed', () => {
      this.updateVisibility();
      return false;
    });
  }

  onClick(_obj: unknown, evt: Clutter.Event): void {
    // only override primary button behavior
    if (evt.get_button() !== Clutter.BUTTON_PRIMARY) {
      return;
    }

    const action = getExtension().getConfig().getString(Config.KeyClickAction);
    if (action === 'show-menu') {
      return;
    }

    this.panelButton.menu.close(/* animate */ true);
    wrapNotifyError(() => onAction(action))();
  }

  updateVisibility(): void {
    const backend = getBackend(getExtension().getSettings());
    Object.entries(this.actionItems).forEach(([actionName, item]) => {
      item.visible = backend.supportsAction(actionName as ActionName);
    });

    (this.captureDelayMenu as any).visible = backend.supportsParam('delay-seconds');

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
