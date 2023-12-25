import Soup from '@girs/soup-3.0';
import Gio from '@girs/gio-2.0';
import GLib from '@girs/glib-2.0';

import EventEmitter from 'eventemitter3';

import { ImgurResponseData } from './ImgurResponseData';

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
  return JSON.parse(new TextDecoder().decode(data));
}

function getMultipartFromBytes(bytes: GLib.Bytes): Soup.Multipart {
  const multipart = new Soup.Multipart(Soup.FORM_MIME_TYPE_MULTIPART);
  multipart.append_form_file('image', 'image.png', 'image/png', bytes);
  return multipart;
}

const httpSession = new Soup.Session();

export class Upload extends EventEmitter {
  public response?: ImgurResponseData;

  constructor(private file: Gio.File) {
    super();
  }

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
      const [content] = await this.file.load_contents_async(null);
      const glibBytes = new GLib.Bytes(content);
      this.response = await this.upload(
        Soup.Message.new_from_multipart(URL_POST_IMAGE, getMultipartFromBytes(glibBytes)),
        glibBytes.get_size(),
      );
      this.emit('done');
    } catch (e: unknown) {
      console.error(e);
      this.emit('error', e as Error);
    }
  }

  static async delete(deleteHash: string): Promise<void> {
    const uri = GLib.Uri.parse(`${baseUrl}/image/${deleteHash}`, GLib.UriFlags.NONE);
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
