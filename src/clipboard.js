const Gtk = imports.gi.Gtk;
const Gdk = imports.gi.Gdk;

const getClipboard = function() {
  return Gtk.Clipboard.get_default(Gdk.Display.get_default());
}

const setImage = function(gtkImage) {
    getClipboard().set_image(gtkImage.get_pixbuf());
}

const setText = function(text) {
    getClipboard().set_text(text, -1);
}

var exports = {
  setImage,
  setText
};
