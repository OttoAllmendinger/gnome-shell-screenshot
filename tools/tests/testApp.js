const Gtk = imports.gi.Gtk;
const Gdk = imports.gi.Gdk;
log("Gtk.init()");
Gtk.init(null);
Gdk.set_program_class('test-gjsgapp');
log("new Application()")
let app = new Gtk.Application({
    application_id: 'org.gnome.Shell.GtkApplicationTest'
});
app.connect('activate', function() {
    print ("Activated");
});
app.run(null);
