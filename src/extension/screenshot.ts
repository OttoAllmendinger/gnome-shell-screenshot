import Gio from '@girs/gio-2.0';
import GdkPixbuf from '@girs/gdkpixbuf-2.0';

import EventEmitter from 'eventemitter3';

import * as Path from './path';
import * as Config from './config';
import * as Clipboard from './clipboard';
import * as Filename from './filename';
import * as UploadImgur from './imgur/Upload';
import * as Notifications from './notifications';
import { spawnAsync } from './spawnUtil';
import { getExtension } from './extension';
import { openURI } from './openURI';
import { _ } from './gettext';

export class ErrorInvalidSettings extends Error {
  constructor(message: string) {
    super(message);
  }
}

class ErrorAutosaveDirNotExists extends ErrorInvalidSettings {
  constructor(dir: string) {
    super(_('Auto-Save location does not exist: ' + dir));
  }
}

// export declare interface Screenshot extends SignalEmitter {}

export interface Effect {
  apply(image: GdkPixbuf.Pixbuf): GdkPixbuf.Pixbuf;
}

export class Rescale implements Effect {
  constructor(public scale: number) {
    if (Number.isNaN(scale) || scale <= 0) {
      throw new Error(`invalid argument ${scale}`);
    }
  }

  apply(pixbuf: GdkPixbuf.Pixbuf): GdkPixbuf.Pixbuf {
    if (this.scale === 1) {
      return pixbuf;
    }

    const result = pixbuf.scale_simple(
      pixbuf.get_width() * this.scale,
      pixbuf.get_height() * this.scale,
      GdkPixbuf.InterpType.BILINEAR,
    );
    if (!result) {
      throw new Error('null result');
    }

    return pixbuf;
  }
}

export class Screenshot extends EventEmitter {
  private config = getExtension().getConfig();
  public pixbuf: GdkPixbuf.Pixbuf;
  public srcFile: Gio.File;
  public dstFile: Gio.File | null;
  public imgurUpload?: UploadImgur.Upload;

  constructor(filePath: string, effects: Effect[] = []) {
    super();
    if (!filePath) {
      throw new Error(`need argument ${filePath}`);
    }

    this.pixbuf = GdkPixbuf.Pixbuf.new_from_file(filePath);
    this.pixbuf = effects.reduce((pixbuf, e) => e.apply(pixbuf), this.pixbuf);
    this.pixbuf.savev(filePath, 'png', [], []);

    this.srcFile = Gio.File.new_for_path(filePath);
    this.dstFile = null;
  }

  getSourceFilePath(): string {
    const path = this.srcFile.get_path();
    if (!path) {
      throw new Error('could not get path');
    }
    return path;
  }

  getFilename(n = 0): string {
    const filenameTemplate = this.config.getString(Config.KeyFilenameTemplate);
    const { width, height } = this.pixbuf as unknown as { width: number; height: number };
    return Filename.get(filenameTemplate, { width, height }, n);
  }

  getNextFile(): Gio.File {
    const dir = Path.expand(this.config.getString(Config.KeySaveLocation));
    const dirExists = Gio.File.new_for_path(dir).query_exists(/* cancellable */ null);
    if (!dirExists) {
      throw new ErrorAutosaveDirNotExists(dir);
    }
    for (let n = 0; ; n++) {
      const newFilename = this.getFilename(n);
      const newPath = Path.join(dir, newFilename);
      const file = Gio.File.new_for_path(newPath);
      const exists = file.query_exists(/* cancellable */ null);
      if (!exists) {
        return file;
      }
    }
  }

  autosave(): void {
    const dstFile = this.getNextFile();
    this.srcFile.copy(dstFile, Gio.FileCopyFlags.NONE, null, null);
    this.dstFile = dstFile;
  }

  getFinalFile(): Gio.File {
    return this.dstFile || this.srcFile;
  }

  getFinalFileURI(): string {
    const uri = this.getFinalFile().get_uri();
    if (!uri) {
      throw new Error('error getting file uri');
    }
    return uri;
  }

  launchOpen(): void {
    openURI(this.getFinalFileURI());
  }

  launchSave(): void {
    const args = [this.srcFile.get_path(), Path.expand('$PICTURES'), this.getFilename()].map((v): string => {
      if (typeof v === 'string' && v) {
        return encodeURIComponent(v);
      }
      throw new Error(`unexpected path component in ${args}`);
    });

    const extensionPath = getExtension().dir.get_path();
    if (!extensionPath) {
      throw new Error('could not get extension path');
    }
    spawnAsync(
      ['gjs', '--module', extensionPath + '/saveDlg.js', ...args],
      [`LOCALE_DIR=${Path.join(extensionPath, 'locale')}`],
    );
  }

  copyClipboard(action: string): void {
    if (action === Config.ClipboardActions.NONE) {
      return;
    } else if (action === Config.ClipboardActions.SET_IMAGE_DATA) {
      return Clipboard.setImage(this.pixbuf);
    } else if (action === Config.ClipboardActions.SET_LOCAL_PATH) {
      const path = this.getFinalFile().get_path();
      if (!path) {
        throw new Error('error getting file path');
      }
      return Clipboard.setText(path);
    }

    throw new Error(`unknown action ${action}`);
  }

  imgurStartUpload(): void {
    this.imgurUpload = new UploadImgur.Upload(this.srcFile);

    this.imgurUpload.on('error', (obj, err) => {
      console.error(err);
      Notifications.notifyError(String(err));
    });

    if (getExtension().getSettings().get_boolean(Config.KeyImgurEnableNotification)) {
      Notifications.notifyImgurUpload(this);
    }
    this.emit('imgur-upload', this.imgurUpload);

    this.imgurUpload.on('done', () => {
      if (getExtension().getSettings().get_boolean(Config.KeyImgurAutoCopyLink)) {
        this.imgurCopyURL();
      }

      if (getExtension().getSettings().get_boolean(Config.KeyImgurAutoOpenLink)) {
        this.imgurOpenURL();
      }
    });

    void this.imgurUpload.start();
  }

  getImgurUpload(): UploadImgur.Upload {
    if (this.imgurUpload) {
      return this.imgurUpload;
    }
    throw new Error('no imgur upload');
  }

  getImgurUploadURI(): string {
    const uri = this.getImgurUpload().response?.data.link;
    if (uri) {
      return uri;
    }
    throw new Error('no imgur link');
  }

  imgurOpenURL(): void {
    openURI(this.getImgurUploadURI());
  }

  imgurCopyURL(): void {
    Clipboard.setText(this.getImgurUploadURI());
  }

  imgurDelete() {
    this.getImgurUpload().on('deleted', () => {
      this.imgurUpload = undefined;
    });
    this.getImgurUpload().deleteRemote();
  }
}
