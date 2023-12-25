const root = '/home/otto/Sync/gnome-shell-screenshot/';
imports.searchPath.unshift(root + '/src');

const Gio = imports.gi.Gio;
const Gtk = imports.gi.Gtk;
const Gdk = imports.gi.Gdk;
const GdkPixbuf = imports.gi.GdkPixbuf;
const { dump } = imports.dump;

Gtk.init(null);
let iconPath = root + '/tools/tests/gnome-image.png';

let emptyPath = root + '/src/empty64.png';

let scaleSquare = (path, size) => {
  let source = GdkPixbuf.Pixbuf.new_from_file_at_size(iconPath, size, size);

  let dst = GdkPixbuf.Pixbuf.new_from_file_at_size(emptyPath, 64, 64);

  let { width, height } = source;
  let offsetX = (size - width) / 2;
  let offsetY = (size - height) / 2;

  source.composite(
    dst,
    offsetX,
    offsetY,
    width,
    height,
    offsetX,
    offsetY,
    1,
    1, // scaleX, scaleY
    GdkPixbuf.InterpType.HYPER,
    255, // overall_alpha
  );

  return dst;
};

scaleSquare(iconPath, 64).savev('scaled.png', 'png', [], []);
log('done');
