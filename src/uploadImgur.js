// vi: sw=2 sts=2
const Signals = imports.signals;

const Gio = imports.gi.Gio;
const Soup = imports.gi.Soup;

const clientId = "c5c1369fb46f29e";
const baseUrl = "https://api.imgur.com/3/";

const httpSession = new Soup.SessionAsync();

const getMimetype = (file) => {
  return "image/png"; // FIXME
};

const authMessage = (soupMessage) => {
  soupMessage.request_headers.append(
    "Authorization", "Client-ID " + clientId
  );
}

const getPostMessage = (file, callback) => {
  const url = baseUrl + "image";

  file.load_contents_async(null, (f, res) => {
    let contents;

    try {
      [, contents] = f.load_contents_finish(res);
    } catch (e) {
      logError(new Error("error loading file: " + e.message));
      callback(e, null);
      return;
    }

    const buffer = Soup.Buffer.new(contents);
    const mimetype = getMimetype(file);
    const multipart = new Soup.Multipart(Soup.FORM_MIME_TYPE_MULTIPART);
    const filename = "image.png";
    multipart.append_form_file("image", filename, mimetype, buffer);

    const message = Soup.form_request_new_from_multipart(url, multipart);

    authMessage(message);

    callback(null, message);
  });
};

const httpError = (status, statusCode, responeData) => {
  return new Error("HTTP Error status=" + status +
                   " statusCode=" + statusCode +
                   " responseData=" + responeData);
};

class Upload {
  constructor(file) {
    this._file = file;
  }

  start() {
    getPostMessage(this._file, (error, message) => {
      const total = message.request_body.length;
      let uploaded = 0;

      if (error) {
        this.emit("error", error);
        return;
      }

      const signalProgress = message.connect(
        "wrote-body-data",
        (message, buffer) => {
          uploaded += buffer.length;
          this.emit("progress", uploaded, total);
        }
      );

      httpSession.queue_message(message,
        (session, {status, status_code, response_body}) => {
          if (status_code == 200) {
            const data = JSON.parse(response_body.data).data;
            this.responseData = data;
            this.emit("done", data);
          } else {
            const err = httpError(status, status_code, response_body.data);
            let errorMessage;

            try {
              errorMessage = JSON.parse(response_body.data).data.error;
            } catch (e) {
              logError(new Error(
                "failed to parse error message " + e +
                  " data=" + response_body.data
              ));
              errorMessage = response_body.data
            }

            this.emit("error", err);
          }

          message.disconnect(signalProgress);
      });
    });
  }

  deleteRemote() {
    if (!this.responseData) {
      throw new Error("no responseData");
    }
    const {deletehash} = this.responseData;
    const uri = new Soup.URI(baseUrl + "image/" + deletehash);
    const message = new Soup.Message({method: "DELETE", uri});
    authMessage(message);
    httpSession.queue_message(message,
      (session, {status, status_code, response_body}) => {
        if (status_code == 200) {
          this.emit("deleted");
        } else {
          this.emit("error", httpError(status, status_code, response_body.data));
        }
      }
    );
  }
}
Signals.addSignalMethods(Upload.prototype);

var exports = {
  Upload
};
