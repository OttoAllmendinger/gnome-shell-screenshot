import * as Gio from '@gi-types/gio2';
import * as GObject from '@gi-types/gobject2';

import ExtensionUtils, { _ } from '../gselib/extensionUtils';

import * as Config from './config';
import * as Thumbnail from './thumbnail';
import { ErrorInvalidSettings, Screenshot } from './screenshot';
import { getExtension } from './extension';
import { BackendError } from './actions';
import { openURI } from './openURI';

const Main = imports.ui.main;
const MessageTray = imports.ui.messageTray;

const NotificationIcon = 'camera-photo-symbolic';
const NotificationSourceName = 'Screenshot Tool';

const ICON_SIZE = 64;

enum ErrorActions {
  OPEN_SETTINGS,
  OPEN_HELP,
}

type MessageSource = {
  showNotification(n: unknown): void;
};

function getURI(error: string | Error): string | undefined {
  if (error instanceof BackendError) {
    return [
      'https://github.com/OttoAllmendinger/gnome-shell-screenshot/',
      `blob/master/README.md#error-backend-${error.backendName}`,
    ].join('');
  }
}

function getSource(): MessageSource {
  const source = new MessageTray.Source(NotificationSourceName, NotificationIcon);
  Main.messageTray.add(source);
  return source;
}

type GObj<X> = {
  new (...args: any[]): X;
};

function registerClass<X>(cls: GObj<X>): GObj<X> {
  return (GObject.registerClass(cls as any) as unknown) as GObj<X>;
}

const NotificationNewScreenshot = registerClass(
  class NotificationNewScreenshot extends MessageTray.Notification {
    static _title() {
      return _('New Screenshot');
    }

    static _banner(obj: Screenshot) {
      const { pixbuf } = obj;
      const { width, height } = pixbuf as any;
      return _('Size:') + ' ' + width + 'x' + height + '.';
    }

    _init(source: string, screenshot: Screenshot) {
      super._init(source, NotificationNewScreenshot._title(), NotificationNewScreenshot._banner(screenshot), {
        gicon: Thumbnail.getIcon(screenshot.srcFile.get_path()),
      });

      this.connect('activated', this._onActivated.bind(this));

      // makes banner expand on hover
      this.setForFeedback(true);

      this._screenshot = screenshot;
    }

    createBanner() {
      const b = super.createBanner();

      b._iconBin.child.icon_size = ICON_SIZE;

      b.addAction(_('Copy'), this._onCopy.bind(this));
      b.addAction(_('Save'), this._onSave.bind(this));

      const extension = getExtension();

      if (extension.settings.get_boolean(Config.KeyEnableUploadImgur)) {
        if (extension.settings.get_boolean(Config.KeyImgurAutoUpload)) {
          b.addAction(_('Uploading To Imgur...'), () => {
            /* noop */
          });
        } else {
          b.addAction(_('Upload To Imgur'), this._onUpload.bind(this));
        }
      }
      return b;
    }

    _onActivated() {
      this._screenshot.launchOpen();
    }

    _onCopy() {
      this._screenshot.copyClipboard(getExtension().settings.get_string(Config.KeyCopyButtonAction));
    }

    _onSave() {
      this._screenshot.launchSave();
    }

    _onUpload() {
      this._screenshot.imgurStartUpload();
    }
  },
);

const ErrorNotification = registerClass(
  class ErrorNotification extends MessageTray.Notification {
    buttons!: ErrorActions[];
    error!: string | Error;

    _init(source: MessageSource, error: string | Error, buttons: ErrorActions[]) {
      super._init(source, _('Error'), String(error), {
        secondaryGIcon: new Gio.ThemedIcon({ name: 'dialog-error' }),
      });

      this.buttons = buttons;
      this.error = error;
    }

    createBanner() {
      const banner = super.createBanner();

      for (const b of this.buttons!) {
        switch (b) {
          case ErrorActions.OPEN_SETTINGS:
            banner.addAction(_('Settings'), () => {
              ExtensionUtils.openPrefs();
            });
            break;
          case ErrorActions.OPEN_HELP:
            const uri = getURI(this.error);
            if (!uri) {
              return;
            }
            banner.addAction(_('Help'), () => openURI(uri));
            break;
          default:
            logError(new Error('unknown button ' + b));
        }
      }

      return banner;
    }
  },
);

const ImgurNotification = registerClass(
  class ImgurNotification extends MessageTray.Notification {
    _init(source: MessageSource, screenshot: Screenshot) {
      super._init(source, _('Imgur Upload'));

      this.setForFeedback(true);
      this.setResident(true);

      this.connect('activated', this._onActivated.bind(this));

      this._screenshot = screenshot;

      this._upload = screenshot.imgurUpload;

      this._upload.connect('progress', (obj, bytes, total) => {
        this.update(_('Imgur Upload'), '' + Math.floor(100 * (bytes / total)) + '%');
      });

      this._upload.connect('error', (obj, msg) => {
        this.update(_('Imgur Upload Failed'), msg);
      });

      this._upload.connect('done', () => {
        this.update(_('Imgur Upload Successful'), this._upload.responseData.link);
        this._updateCopyButton();
      });
    }

    _updateCopyButton() {
      if (!this._copyButton) {
        return;
      }
      this._copyButton.visible = this._screenshot.isImgurUploadComplete();
    }

    createBanner() {
      const b = super.createBanner();
      this._copyButton = b.addAction(_('Copy Link'), this._onCopy.bind(this));
      this._updateCopyButton();
      return b;
    }

    _onActivated() {
      if (this._screenshot.isImgurUploadComplete()) {
        this._screenshot.imgurOpenURL();
      } else {
        this._upload.connect('done', () => {
          this._screenshot.imgurOpenURL();
        });
      }
    }

    _onCopy() {
      this._screenshot.imgurCopyURL();
    }
  },
);

export function notifyScreenshot(screenshot: Screenshot): void {
  const source = getSource();
  const notification = new NotificationNewScreenshot(source, screenshot);
  source.showNotification(notification);
}

export function notifyError(error: string | Error): void {
  const buttons: ErrorActions[] = [];
  if (error instanceof Error) {
    if (error instanceof ErrorInvalidSettings) {
      buttons.push(ErrorActions.OPEN_SETTINGS);
    }
    if (error instanceof BackendError) {
      buttons.push(ErrorActions.OPEN_HELP);
    }
  }
  const source = getSource();
  const notification = new ErrorNotification(source, error, buttons);
  source.showNotification(notification);
}

export function notifyImgurUpload(screenshot: Screenshot): void {
  const source = getSource();
  const notification = new ImgurNotification(source, screenshot);
  source.showNotification(notification);
}

export function notifyCommand(command: string): void {
  const source = getSource();
  const notification = new MessageTray.Notification(source, _('Command'), command);
  source.showNotification(notification);
}

type F<T> = ((...args: any[]) => T) | ((...args: any[]) => Promise<T>);

export function wrapNotifyError<T>(f: F<T>): F<T> {
  return async function (...args: unknown[]) {
    try {
      return await f(...args);
    } catch (e: unknown) {
      notifyError(e as Error);
      throw e;
    }
  };
}
