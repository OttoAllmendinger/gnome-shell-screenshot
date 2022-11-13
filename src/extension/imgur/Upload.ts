import * as Soup from '@gi-types/soup3';
import * as Gio from '@gi-types/gio2';
import * as GLib from '@gi-types/glib2';
import { UriFlags } from '@gi-types/glib2';

import { SignalEmitter } from '../../index';
import { ImgurResponseData } from './ImgurResponseData';

const Signals = imports.signals;

const clientId = 'c5c1369fb46f29e';
const baseUrl = 'https://api.imgur.com/3/';

function _promisify(cls: any, function_name: string, finish_function_name?: string) {
  Gio._promisify(cls, function_name, finish_function_name as string);
}

const LocalFilePrototype = Gio.File.new_for_path('/').constructor.prototype;
_promisify(LocalFilePrototype, 'load_bytes_async', 'load_bytes_finish');

_promisify(Soup.Session.prototype, 'send_and_read_async');
_promisify(Gio.OutputStream.prototype, 'write_bytes_async');
_promisify(Gio.IOStream.prototype, 'close_async');
_promisify(Gio.Subprocess.prototype, 'wait_check_async');

function authMessage(message: Soup.Message): void {
  message.request_headers.append('Authorization', 'Client-ID ' + clientId);
}

const URL_POST_IMAGE = baseUrl + 'image';

async function getJSONResonse<T>(message: Soup.Message): Promise<T> {
  const res = await httpSession.send_and_read_async(message, GLib.PRIORITY_DEFAULT, null);
  const data = res.get_data();
  if (!data) {
    throw new Error('no data');
  }
  return JSON.parse(imports.byteArray.toString(data));
}

function getMultipartFromBytes(bytes: GLib.Bytes): Soup.Multipart {
  const multipart = new Soup.Multipart(Soup.FORM_MIME_TYPE_MULTIPART);
  multipart.append_form_file('image', 'image.png', 'image/png', bytes);
  return multipart;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface Upload extends SignalEmitter {}

const httpSession = new Soup.Session();

export class Upload {
  public response?: ImgurResponseData;

  constructor(private file: Gio.File) {}

  async upload(message: Soup.Message, totalBytes: number): Promise<ImgurResponseData> {
    authMessage(message);
    let uploadedBytes = 0;

    const signalProgress = message.connect('wrote-body-data', (message, chunkSize) => {
      uploadedBytes += chunkSize;
      this.emit('progress', uploadedBytes, totalBytes);
    });

    try {
      return await getJSONResonse(message);
    } finally {
      message.disconnect(signalProgress);
    }
  }

  async start(): Promise<void> {
    try {
      const [buffer] = await this.file.load_bytes_async(null);
      this.response = await this.upload(
        Soup.Message.new_from_multipart(URL_POST_IMAGE, getMultipartFromBytes(buffer)),
        buffer.get_size(),
      );
      this.emit('done');
    } catch (e: unknown) {
      logError(e);
      this.emit('error', e as Error);
    }
  }

  static async delete(deleteHash: string): Promise<void> {
    const uri = GLib.Uri.parse(`${baseUrl}/image/${deleteHash}`, UriFlags.NONE);
    const message = new Soup.Message({ method: 'DELETE', uri });
    authMessage(message);
    const { success } = await getJSONResonse<{ success: boolean }>(message);
    if (!success) {
      throw new Error('delete failed');
    }
  }

  async deleteRemote(): Promise<void> {
    if (this.response) {
      await Upload.delete(this.response.data.deletehash);
    }
  }
}

Signals.addSignalMethods(Upload.prototype);
