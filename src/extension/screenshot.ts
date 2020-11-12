import * as Gio from '@imports/Gio-2.0';
import * as Gtk from '@imports/Gtk-3.0';
import * as Shell from '@imports/Shell-0.1';
import { InterpType } from '@imports/GdkPixbuf-2.0';

import { SignalEmitter } from '..';

import * as Path from './path';
import * as Config from './config';
import * as Clipboard from './clipboard';
import * as Filename from './filename';
import * as UploadImgur from './uploadImgur';
import * as Notifications from './notifications';
import ExtensionUtils from '../gselib/extensionUtils';

const Signals = imports.signals;

const Util = imports.misc.util;
const Local = ExtensionUtils.getCurrentExtension();

const settings = ExtensionUtils.getSettings();

export declare interface Screenshot extends SignalEmitter {}

export interface Effect {
  apply(image: Gtk.Image): void;
}

export class Rescale implements Effect {
  constructor(public scale: number) {
    if (Number.isNaN(scale) || scale <= 0) {
      throw new Error(`invalid argument ${scale}`);
    }
  }

  apply(image: Gtk.Image): void {
    if (this.scale === 1) {
      return;
    }

    const newPixbuf = image.pixbuf.scale_simple(
      image.pixbuf.get_width() * this.scale,
      image.pixbuf.get_height() * this.scale,
      InterpType.BILINEAR,
    );

    image.set_from_pixbuf(newPixbuf);
  }
}

export class Screenshot {
  public gtkImage: Gtk.Image;
  public srcFile: Gio.File;
  public dstFile: Gio.File | null;
  public imgurUpload?: UploadImgur.Upload;

  constructor(filePath: string, effects: Effect[] = []) {
    if (!filePath) {
      throw new Error(`need argument ${filePath}`);
    }

    this.gtkImage = new Gtk.Image({ file: filePath });
    effects.forEach((e) => e.apply(this.gtkImage));
    this.gtkImage.pixbuf.savev(filePath, 'png', [], []);

    this.srcFile = Gio.File.new_for_path(filePath);
    this.dstFile = null;
  }

  _nextFile() {
    const dir = Path.expand(settings.get_string(Config.KeySaveLocation));
    const filenameTemplate = settings.get_string(Config.KeyFilenameTemplate);
    const { width, height } = (this.gtkImage.get_pixbuf() as unknown) as { width: number; height: number };
    const dimensions = { width, height };
    for (let n = 0; ; n++) {
      const newFilename = Filename.get(filenameTemplate, dimensions, n);
      const newPath = Path.join(dir, newFilename);
      const file = Gio.File.new_for_path(newPath);
      const exists = file.query_exists(/* cancellable */ null);
      if (!exists) {
        return file;
      }
    }
  }

  autosave() {
    const dstFile = this._nextFile();
    this.srcFile.copy(dstFile, Gio.FileCopyFlags.NONE, null, null);
    this.dstFile = dstFile;
  }

  launchOpen() {
    const context = Shell.Global.get().create_app_launch_context(0, -1);
    const file = this.dstFile || this.srcFile;
    Gio.AppInfo.launch_default_for_uri(file.get_uri(), context);
  }

  launchSave() {
    const newFile = this._nextFile();
    const pathComponents = [
      this.srcFile.get_path(),
      Path.expand('$PICTURES'),
      newFile.get_basename(),
      Local.dir.get_path(),
    ] as string[];
    pathComponents.forEach((v) => {
      if (!v) {
        throw new Error(`unexpected path component in ${pathComponents}`);
      }
    });
    Util.spawn(['gjs', Local.path + '/saveDlg.js', ...pathComponents.map(encodeURIComponent)]);
  }

  copyClipboard(action) {
    if (action === Config.ClipboardActions.NONE) {
      return;
    } else if (action === Config.ClipboardActions.SET_IMAGE_DATA) {
      return Clipboard.setImage(this.gtkImage);
    } else if (action === Config.ClipboardActions.SET_LOCAL_PATH) {
      if (this.dstFile) {
        return Clipboard.setText(this.dstFile.get_path());
      } else if (this.srcFile) {
        return Clipboard.setText(this.srcFile.get_path());
      }

      return logError(new Error('no dstFile and no srcFile'));
    }

    logError(new Error(`unknown action ${action}`));
  }

  imgurStartUpload() {
    this.imgurUpload = new UploadImgur.Upload(this.srcFile);

    this.imgurUpload.connect('error', (obj, err) => {
      logError(err);
      Notifications.notifyError(String(err));
    });

    if (settings.get_boolean(Config.KeyImgurEnableNotification)) {
      Notifications.notifyImgurUpload(this);
    }
    this.emit('imgur-upload', this.imgurUpload);

    this.imgurUpload.connect('done', () => {
      if (settings.get_boolean(Config.KeyImgurAutoCopyLink)) {
        this.imgurCopyURL();
      }

      if (settings.get_boolean(Config.KeyImgurAutoOpenLink)) {
        this.imgurOpenURL();
      }
    });

    this.imgurUpload.start();
  }

  isImgurUploadComplete() {
    return !!(this.imgurUpload && this.imgurUpload.responseData);
  }

  imgurOpenURL() {
    if (!this.isImgurUploadComplete()) {
      logError(new Error('no completed imgur upload'));
      return;
    }
    const context = Shell.Global.get().create_app_launch_context(0, -1);
    const uri = this.imgurUpload!.responseData.link;
    if (!uri) {
      logError(new Error('no uri in responseData'));
      return;
    }
    Gio.AppInfo.launch_default_for_uri(uri, context);
  }

  imgurCopyURL() {
    if (!this.isImgurUploadComplete()) {
      logError(new Error('no completed imgur upload'));
      return;
    }
    const uri = this.imgurUpload!.responseData.link;
    Clipboard.setText(uri);
  }

  imgurDelete() {
    if (!this.isImgurUploadComplete()) {
      logError(new Error('no completed imgur upload'));
      return;
    }
    this.imgurUpload!.connect('deleted', () => {
      this.imgurUpload = undefined;
    });
    this.imgurUpload!.deleteRemote();
  }
}

Signals.addSignalMethods(Screenshot.prototype);
