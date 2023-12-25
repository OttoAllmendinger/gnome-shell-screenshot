const Mainloop = imports.mainloop;
const Gio = imports.gi.Gio;

const uploadImgur = imports.uploadImgur;
const { dump } = imports.dump;

const testUploadIcon = () => {
  let filePath = 'data/icon-extensions.gnome.org.png';
  let file = Gio.File.new_for_path(filePath);
  let upload = new uploadImgur.Upload(file);
  upload.connect('progress', (obj, n, total) => {
    log('n=' + n + ' total=' + total + ' ' + n / total);
  });
  upload.connect('done', (obj, data) => {
    log('done');
    log(dump(data));
    upload.disconnectAll();
  });
  log('start()');
  upload.start();
};

testUploadIcon();
Mainloop.run('main');
