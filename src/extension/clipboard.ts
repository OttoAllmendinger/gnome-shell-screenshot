import * as St from '@gi-types/st1';
import * as GLib from '@gi-types/glib2';
import * as GdkPixbuf from '@gi-types/gdkpixbuf2';

export function setImage(pixbuf: GdkPixbuf.Pixbuf): void {
  const [ok, buffer] = pixbuf.save_to_bufferv('png', [], []);
  if (!ok) {
    throw new Error('error in save_to_bufferv');
  }
  const bytes = GLib.Bytes.new(buffer);
  St.Clipboard.get_default().set_content(St.ClipboardType.CLIPBOARD, 'image/png', bytes);
}

export function setText(text: string): void {
  St.Clipboard.get_default().set_text(St.ClipboardType.CLIPBOARD, text);
}
