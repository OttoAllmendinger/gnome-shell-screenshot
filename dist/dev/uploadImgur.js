imports.gi.versions.Soup = "3.0";

var uploadImgur = (function (exports, Soup, Gio, GLib) {
    'use strict';

    const Signals = imports.signals;
    const clientId = 'c5c1369fb46f29e';
    const baseUrl = 'https://api.imgur.com/3/';
    function _promisify(cls, function_name, finish_function_name) {
        Gio._promisify(cls, function_name, finish_function_name);
    }
    const LocalFilePrototype = Gio.File.new_for_path('/').constructor.prototype;
    _promisify(LocalFilePrototype, 'load_bytes_async', 'load_bytes_finish');
    _promisify(Soup.Session.prototype, 'send_and_read_async');
    _promisify(Gio.OutputStream.prototype, 'write_bytes_async');
    _promisify(Gio.IOStream.prototype, 'close_async');
    _promisify(Gio.Subprocess.prototype, 'wait_check_async');
    function authMessage(message) {
        message.request_headers.append('Authorization', 'Client-ID ' + clientId);
    }
    const URL_POST_IMAGE = baseUrl + 'image';
    async function getJSONResonse(message) {
        const res = await httpSession.send_and_read_async(message, GLib.PRIORITY_DEFAULT, null);
        const data = res.get_data();
        if (!data) {
            throw new Error('no data');
        }
        return JSON.parse(imports.byteArray.toString(data));
    }
    function getMultipartFromBytes(bytes) {
        const multipart = new Soup.Multipart(Soup.FORM_MIME_TYPE_MULTIPART);
        multipart.append_form_file('image', 'image.png', 'image/png', bytes);
        return multipart;
    }
    const httpSession = new Soup.Session();
    class Upload {
        constructor(file) {
            this.file = file;
        }
        async upload(message, totalBytes) {
            authMessage(message);
            let uploadedBytes = 0;
            const signalProgress = message.connect('wrote-body-data', (message, chunkSize) => {
                uploadedBytes += chunkSize;
                this.emit('progress', uploadedBytes, totalBytes);
            });
            try {
                return await getJSONResonse(message);
            }
            finally {
                message.disconnect(signalProgress);
            }
        }
        async start() {
            try {
                const [buffer] = await this.file.load_bytes_async(null);
                this.response = await this.upload(Soup.Message.new_from_multipart(URL_POST_IMAGE, getMultipartFromBytes(buffer)), buffer.get_size());
                this.emit('done');
            }
            catch (e) {
                logError(e);
                this.emit('error', e);
            }
        }
        static async delete(deleteHash) {
            const uri = GLib.Uri.parse(`${baseUrl}/image/${deleteHash}`, GLib.UriFlags.NONE);
            const message = new Soup.Message({ method: 'DELETE', uri });
            authMessage(message);
            const { success } = await getJSONResonse(message);
            if (!success) {
                throw new Error('delete failed');
            }
        }
    }
    Signals.addSignalMethods(Upload.prototype);
    async function main([command, arg]) {
        switch (command) {
            case 'upload':
                const f = Gio.File.new_for_path(arg);
                const u = new Upload(f);
                const signals = ['progress', 'error', 'done'];
                signals.forEach((n) => {
                    u.connect(n, (obj, ...args) => {
                        if (n === 'error') {
                            logError(args[0]);
                        }
                        else {
                            console.log({ event: n, args });
                        }
                        if (n === 'done') {
                            console.log('responseData', u.response);
                        }
                    });
                });
                await u.start();
                break;
            case 'delete':
                await Upload.delete(arg);
                break;
            default:
                throw new Error('invalid command');
        }
    }
    if (window['ARGV']) {
        main(window.ARGV)
            .catch((err) => {
            logError(err);
        })
            .finally(() => {
            imports.mainloop.quit('main');
        });
        imports.mainloop.run('main');
    }

    exports.Upload = Upload;

    return exports;

}({}, imports.gi.Soup, imports.gi.Gio, imports.gi.GLib));
