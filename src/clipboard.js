/*jshint moz:true */
const St = imports.gi.St;

function set (string) {
  St.Clipboard.get_default().set_text(St.ClipboardType.PRIMARY, string);
  St.Clipboard.get_default().set_text(St.ClipboardType.CLIPBOARD, string);
}
