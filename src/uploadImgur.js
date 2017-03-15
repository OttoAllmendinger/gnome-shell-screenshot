// vi: sw=2 sts=2
const Lang = imports.lang;
const Signals = imports.signals;
const Mainloop = imports.mainloop;

const Gio = imports.gi.Gio;
const Soup = imports.gi.Soup;

const clientId = "c5c1369fb46f29e";
const baseUrl = "https://api.imgur.com/3/";

const httpSession = new Soup.SessionAsync();

const getMimetype = (file) => {
  return 'image/png'; // FIXME
};

const getPostMessage = (file, callback) => {
  let url = this.baseUrl + "image";

  file.load_contents_async(null, (f, res) => {
    let contents;

    try {
      [, contents] = f.load_contents_finish(res);
    } catch (e) {
      log("error loading file: " + e.message);
      callback(e, null);
      return;
    }

    let buffer = new Soup.Buffer(contents, contents.length);
    let mimetype = this._getMimetype(file);
    let multipart = new Soup.Multipart(Soup.FORM_MIME_TYPE_MULTIPART);
    multipart.append_form_file('image', file, mimetype, buffer);

    let message = Soup.form_request_new_from_multipart(url, multipart);

    message.request_headers.append(
      "Authorization", "Client-ID " + clientId
    );

    callback(null, message);
  });
};


const Upload = new Lang.Class({
  _init: function (file) {
    this._file = file;
  },

  start: function () {
    getPostMessage(this._file, (error, message) => {
      let total = message.request_body.length;
      let uploaded = 0;

      if (error) {
        this.emit("error", error);
        return;
      }

      let signalProgress = message.connect(
        "wrote-body-data",
        (message, buffer) => {
          uploaded += buffer.length;
          this.emit("progress", uploaded, total);
        }
      );

      httpSession.queue_message(message,
        (session, {status_code, response_body}) => {
          if (status_code == 200) {
            this.emit('done', JSON.parse(response_body.data).data);
          } else {
            logError(new Error(
              'getJSON error status code: ' + status_code +
              ' data: ' + response_body.data
            ));

            let errorMessage;

            try {
              errorMessage = JSON.parse(response_body.data).data.error;
            } catch (e) {
              logError(new Error("failed to parse error message " + e));
              errorMessage = response_body.data
            }

            this.emit(
              'error',
              "HTTP " + status_code + " - " + errorMessage
            );
          }

          message.disconnect(signalProgress);
      });
    });
  }
});
Signals.addSignalMethods(Upload);
