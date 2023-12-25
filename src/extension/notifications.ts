import Gio from '@girs/gio-2.0';

import * as Config from './config';
import * as Thumbnail from './thumbnail';
import { ErrorInvalidSettings, Screenshot } from './screenshot';
import { getExtension } from './extension';
import { BackendError } from './actions';
import { openURI } from './openURI';
import * as UploadImgur from './imgur/Upload';

import * as MessageTray from '@gnome-shell/ui/messageTray';
import * as Main from '@gnome-shell/ui/main';
import { registerGObjectClass } from 'gjs';
import { _ } from './gettext';

const NotificationIcon = 'camera-photo-symbolic';
const NotificationSourceName = 'Screenshot Tool';

const ICON_SIZE = 64;

enum ErrorActions {
  OPEN_SETTINGS,
  OPEN_HELP,
}

function getURI(error: string | Error): string | undefined {
  if (error instanceof BackendError) {
    return [
      'https://github.com/OttoAllmendinger/gnome-shell-screenshot/',
      `blob/master/README.md#error-backend-${error.backendName}`,
    ].join('');
  }
}

function getSource(): MessageTray.Source {
  const source = new MessageTray.Source(NotificationSourceName, NotificationIcon);
  Main.messageTray.add(source);
  return source;
}

@registerGObjectClass
class NotificationNewScreenshot extends MessageTray.Notification {
  static _title() {
    return _('New Screenshot');
  }

  static _banner(obj: Screenshot) {
    const { pixbuf } = obj;
    const { width, height } = pixbuf as any;
    return _('Size:') + ' ' + width + 'x' + height + '.';
  }

  constructor(
    source: MessageTray.Source,
    public screenshot: Screenshot,
  ) {
    super(source, NotificationNewScreenshot._title(), NotificationNewScreenshot._banner(screenshot), {
      gicon: Thumbnail.getIcon(screenshot.getSourceFilePath()),
    });

    this.connect('activated', this._onActivated.bind(this));

    // makes banner expand on hover
    this.setForFeedback(true);
  }

  createBanner() {
    const b = super.createBanner();

    // FIXME cast
    (b as any)._iconBin.child.icon_size = ICON_SIZE;

    b.addAction(_('Copy'), this._onCopy.bind(this));
    b.addAction(_('Save'), this._onSave.bind(this));

    const extension = getExtension();

    if (extension.getSettings().get_boolean(Config.KeyEnableUploadImgur)) {
      if (extension.getSettings().get_boolean(Config.KeyImgurAutoUpload)) {
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
    this.screenshot.launchOpen();
  }

  _onCopy() {
    this.screenshot.copyClipboard(getExtension().getConfig().getString(Config.KeyCopyButtonAction));
  }

  _onSave() {
    this.screenshot.launchSave();
  }

  _onUpload() {
    this.screenshot.imgurStartUpload();
  }
}

@registerGObjectClass
class ErrorNotification extends MessageTray.Notification {
  buttons: ErrorActions[];
  error: string | Error;

  constructor(source: MessageTray.Source, error: string | Error, buttons: ErrorActions[]) {
    super(source, _('Error'), String(error), {
      secondaryGIcon: new Gio.ThemedIcon({ name: 'dialog-error' }),
    });

    this.buttons = buttons;
    this.error = error;
  }

  createBanner(): MessageTray.NotificationBanner {
    const banner = super.createBanner();

    for (const b of this.buttons) {
      switch (b) {
        case ErrorActions.OPEN_SETTINGS:
          banner.addAction(_('Settings'), () => {
            getExtension().openPreferences();
          });
          break;
        case ErrorActions.OPEN_HELP:
          const uri = getURI(this.error);
          if (!uri) {
            break;
          }
          banner.addAction(_('Help'), () => openURI(uri));
          break;
        default:
          console.error(new Error('unknown button ' + b));
      }
    }

    return banner;
  }
}

type MessageTrayButton = {
  visible: boolean;
};

@registerGObjectClass
class ImgurNotification extends MessageTray.Notification {
  upload: UploadImgur.Upload;
  copyButton?: MessageTrayButton;

  constructor(
    source: MessageTray.Source,
    public screenshot: Screenshot,
  ) {
    super(source, _('Imgur Upload'));

    this.setForFeedback(true);
    this.setResident(true);

    this.connect('activated', this._onActivated.bind(this));

    if (!screenshot.imgurUpload) {
      throw new Error('imgur upload not present');
    }
    this.upload = screenshot.imgurUpload;

    this.upload.on('progress', (obj, bytes, total) => {
      this.update(_('Imgur Upload'), '' + Math.floor(100 * (bytes / total)) + '%');
    });

    this.upload.on('error', (obj, msg) => {
      this.update(_('Imgur Upload Failed'), msg);
    });

    this.upload.on('done', () => {
      if (this.upload.response) {
        this.update(_('Imgur Upload Successful'), this.upload.response.data.link);
        this._updateCopyButton();
      }
    });
  }

  _updateCopyButton() {
    if (!this.copyButton) {
      return;
    }
    this.copyButton.visible = this.screenshot.imgurUpload?.response !== undefined;
  }

  createBanner() {
    const b = super.createBanner();
    this.copyButton = b.addAction(_('Copy Link'), this._onCopy.bind(this)) as MessageTrayButton;
    this._updateCopyButton();
    return b;
  }

  _onActivated() {
    if (this.screenshot.imgurUpload?.response) {
      this.screenshot.imgurOpenURL();
    } else {
      this.upload.on('done', () => {
        this.screenshot.imgurOpenURL();
      });
    }
  }

  _onCopy() {
    this.screenshot.imgurCopyURL();
  }
}

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
