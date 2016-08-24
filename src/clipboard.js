const Gtk = imports.gi.Gtk;
const Gdk = imports.gi.Gdk;

// Not static because there were issues with stale handles for some reason
const clipboard = Gtk.Clipboard.get_default(Gdk.Display.get_default());

const setImage = function (gtkImage) {
    clipboard.set_image(gtkImage.get_pixbuf());
}

const setText = function (text) {
    clipboard.set_text(text, -1);
}
