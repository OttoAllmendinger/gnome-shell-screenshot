#!/usr/bin/gjs

const Lang = imports.lang;
const Gdk = imports.gi.Gdk;
const Gtk = imports.gi.Gtk;

const Application = new Lang.Class({
  //A Class requires an explicit Name parameter. This is the Class Name.
  Name: 'Application',

  //create the application
  _init: function () {
    this.application = new Gtk.Application();

    //connect to 'activate' and 'startup' signals to handlers.
    this.application.connect('activate', Lang.bind(this, this._onActivate));
    this.application.connect('startup', Lang.bind(this, this._onStartup));
  },

  //create the UI
  _buildUI: function () {
    this._window = new Gtk.ApplicationWindow({ application: this.application, title: 'Hello World!' });
    this._window.set_default_size(200, 200);
    this.label = new Gtk.Label({ label: 'Hello World' });
    this._window.add(this.label);
  },

  //handler for 'activate' signal
  _onActivate: function () {
    //show the window and all child widgets
    this._window.show_all();
  },

  //handler for 'startup' signal
  _onStartup: function () {
    this._buildUI();
    let display = Gdk.Display.get_default();
    let clipboard = Gtk.Clipboard.get_default(display);
    let image = new Gtk.Image({ file: 'tools/gnome-image.png' });
    let pixbuf = image.get_pixbuf();
    clipboard.set_image(pixbuf);
  },
});

//run the application
let app = new Application();
app.application.run(ARGV);
