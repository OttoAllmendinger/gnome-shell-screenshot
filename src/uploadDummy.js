const Lang = imports.lang;
const Signals = imports.signals;
const Mainloop = imports.mainloop;

const Upload = new Lang.Class({
  Name: "Upload",

  _init: function (file) {
  },

  start: function () {
    const testImage = 'http://i.imgur.com/Vkapy8W.png';
    const size = 200000;
    const chunk = 1000;
    const updateMs = 100;
    let progress = 0;

    let update = Lang.bind(this, () => {
      if (progress < size) {
        this.emit("progress", (progress += chunk), size);
        Mainloop.timeout_add(updateMs, update);
      } else {
        this.responseData = {link: testImage};
        this.emit("done", this.responseData);
      }
    });

    Mainloop.idle_add(update);
  }
});

Signals.addSignalMethods(Upload.prototype);

var exports = {
  Upload
};
