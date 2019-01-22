// vi: sw=2 sts=2
const Lang = imports.lang;
const Signals = imports.signals;

const Gio = imports.gi.Gio;
const Soup = imports.gi.Soup;

const httpSession = new Soup.SessionAsync();

/* Encapsulates url property passed into the constructor */
const UrlFn = {
  SHARE: (data) => {
    return `https://cl.ly/${data.slug}`
  },
  CONTENT: (data) => {
    return data.content_url
  },
  DOWNLOAD: (data) => {
    return data.download_url
  }
}

const getMimetype = (file) => {
  return "image/png"; // FIXME
};

const requestFileUpload = (file, callback) => {
  const url = "https://my.cl.ly/items/new";

  const message = Soup.Message.new("GET", url);
  message.request_headers.append("Accept", "application/json");
  log(file.get_basename())
  const params = "file_name=" + file.get_basename()
  message.set_request("application/x-www-form-urlencoded",
                      Soup.MemoryUse.COPY, params)

  httpSession.queue_message(message,
    (session, {status, status_code, response_body}) => {
      let data = null
      let error = null

      try {
        data = JSON.parse(response_body.data);
      } catch (e) {
        error = e
      }

      if (status_code == 200) {
        if (!data) {
          error = "missing response data";
        } else if (data.uploads_remaining && data.uploads_remaining == 0) {
          error = "daily upload limit reached";
        } else if (data.blocked_file_type) {
          error = "blocked file type"
        }
      } else {
        error = httpError(status, status_code, response_body.data);
      }

      callback(error, data);
  });
};

const getPostMessage = (file, data, callback) => {
  const url = data.url;

  file.load_contents_async(null, (f, res) => {
    let contents;

    try {
      [, contents] = f.load_contents_finish(res);
    } catch (e) {
      logError(new Error("error loading file: " + e.message));
      callback(e, null);
      return;
    }

    if (contents.length > data.max_upload_size) {
      callback(new Error("maximum upload size exceeded"), null);
      return;
    }

    const buffer = new Soup.Buffer(contents);
    const mimetype = getMimetype(file);
    const multipart = new Soup.Multipart(Soup.FORM_MIME_TYPE_MULTIPART);

    for (const key in data.params) {
      multipart.append_form_string(key, data.params[key]);
    }

    multipart.append_form_file("file", file.get_basename(), mimetype, buffer);

    const message = Soup.form_request_new_from_multipart(url, multipart);
    message.request_headers.append("Accept", "application/json");

    callback(null, message);
  });
};

const httpError = (status, statusCode, responeData) => {
  return new Error("HTTP Error status=" + status +
                   " statusCode=" + statusCode +
                   " responseData=" + responeData);
};

class Upload {
  constructor(file, email, password, urlFn) {
    this._file = file;

    httpSession.connect(
      "authenticate",
      (session, message, auth, retrying, user_data) => {
        auth.authenticate(email, password);
      }
    );

    this._urlFn = urlFn
  }

  start() {
    requestFileUpload(this._file, (error, data) => {
      if (error) {
        this.emit("error", error)
        return
      }

      getPostMessage(this._file, data, (error, message) => {
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
              const data = JSON.parse(response_body.data)
              this.responseData = data;
              this.responseData.url = this._urlFn(data);
              this.emit("done", data);
            } else {
              const err = httpError(status, status_code, response_body.data);
              let errorMessage;

              try {
                errorMessage = JSON.parse(response_body.data);
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
    });
  }

  deleteRemote() {
    if (!this.responseData) {
      throw new Error("no responseData");
    }
    const url = this.responseData.href;
    const message = Soup.Message.new("DELETE", url);
    message.request_headers.append("Accept", "application/json");
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
  Upload,
  UrlFn
};
