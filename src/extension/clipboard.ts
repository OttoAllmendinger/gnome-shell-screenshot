import * as Gtk from '@imports/Gtk-3.0';
import * as Gdk from '@imports/Gdk-3.0';

export function getClipboard() {
  const display = Gdk.Display.get_default();
  if (!display) {
    throw new Error('could not get default display');
  }
  return Gtk.Clipboard.get_default(display);
}

export function setImage(gtkImage) {
  getClipboard().set_image(gtkImage.get_pixbuf());
}

export function setText(text) {
  getClipboard().set_text(text, -1);
}
