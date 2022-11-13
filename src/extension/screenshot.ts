import * as Gio from '@gi-types/gio2';
import * as GdkPixbuf from '@gi-types/gdkpixbuf2';
import * as Gtk from '@gi-types/gtk4';
import { InterpType } from '@gi-types/gdkpixbuf2';

import { SignalEmitter } from '..';
import { _ } from '../gselib/extensionUtils';

import * as Path from './path';
import * as Config from './config';
import * as Clipboard from './clipboard';
import * as Filename from './filename';
import * as UploadImgur from './imgur/Upload';
import * as Notifications from './notifications';
import { spawnAsync } from './spawnUtil';
import { getExtension } from './extension';
import { openURI } from './openURI';

const Signals = imports.signals;

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

export declare interface Screenshot extends SignalEmitter {}

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
      InterpType.BILINEAR,
    );
    if (!result) {
      throw new Error('null result');
    }

    return pixbuf;
  }
}

export class Screenshot {
  public pixbuf: GdkPixbuf.Pixbuf;
  public srcFile: Gio.File;
  public dstFile: Gio.File | null;
  public imgurUpload?: UploadImgur.Upload;

  constructor(filePath: string, effects: Effect[] = []) {
    if (!filePath) {
      throw new Error(`need argument ${filePath}`);
    }

    this.pixbuf = GdkPixbuf.Pixbuf.new_from_file(filePath);
    this.pixbuf = effects.reduce((pixbuf, e) => e.apply(pixbuf), this.pixbuf);
    this.pixbuf.savev(filePath, 'png', [], []);

    this.srcFile = Gio.File.new_for_path(filePath);
    this.dstFile = null;
  }

  getFilename(n = 0): string {
    const filenameTemplate = getExtension().settings.get_string(Config.KeyFilenameTemplate);
    const { width, height } = (this.pixbuf as unknown) as { width: number; height: number };
    return Filename.get(filenameTemplate, { width, height }, n);
  }

  getNextFile(): Gio.File {
    const dir = Path.expand(getExtension().settings.get_string(Config.KeySaveLocation));
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

  launchOpen(): void {
    openURI(this.getFinalFile().get_uri());
  }

  launchSave(): void {
    const pathComponents = [
      this.srcFile.get_path(),
      Path.expand('$PICTURES'),
      this.getFilename(),
      getExtension().info.dir.get_path(),
    ] as string[];
    pathComponents.forEach((v) => {
      if (!v) {
        throw new Error(`unexpected path component in ${pathComponents}`);
      }
    });

    let gtkVersionString;
    switch (Gtk.get_major_version()) {
      case 3:
        gtkVersionString = '3.0';
        break;
      case 4:
        gtkVersionString = '4.0';
        break;
    }

    spawnAsync(
      ['gjs', getExtension().info.path + '/saveDlg.js', ...pathComponents.map(encodeURIComponent)],
      ['GTK=' + gtkVersionString],
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

    this.imgurUpload.connect('error', (obj, err) => {
      logError(err);
      Notifications.notifyError(String(err));
    });

    if (getExtension().settings.get_boolean(Config.KeyImgurEnableNotification)) {
      Notifications.notifyImgurUpload(this);
    }
    this.emit('imgur-upload', this.imgurUpload);

    this.imgurUpload.connect('done', () => {
      if (getExtension().settings.get_boolean(Config.KeyImgurAutoCopyLink)) {
        this.imgurCopyURL();
      }

      if (getExtension().settings.get_boolean(Config.KeyImgurAutoOpenLink)) {
        this.imgurOpenURL();
      }
    });

    this.imgurUpload.start();
  }

  isImgurUploadComplete(): boolean {
    return !!(this.imgurUpload && this.imgurUpload.response);
  }

  imgurOpenURL(): void {
    if (!this.isImgurUploadComplete()) {
      throw new Error('no completed imgur upload');
    }
    const uri = this.imgurUpload!.response?.data.link;
    if (!uri) {
      throw new Error('no uri in responseData');
    }
    openURI(this.getFinalFile().get_uri());
  }

  imgurCopyURL(): void {
    if (!this.isImgurUploadComplete()) {
      throw new Error('no completed imgur upload');
    }
    const uri = this.imgurUpload!.response!.data.link;
    Clipboard.setText(uri);
  }

  imgurDelete() {
    if (!this.isImgurUploadComplete()) {
      throw new Error('no completed imgur upload');
    }
    this.imgurUpload!.connect('deleted', () => {
      this.imgurUpload = undefined;
    });
    this.imgurUpload!.deleteRemote();
  }
}

Signals.addSignalMethods(Screenshot.prototype);
