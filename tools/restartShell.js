const Gio = imports.gi.Gio;

const MyIface =
    '<node>\
    <interface name="org.gnome.Shell">\
        <method name="Eval">\
            <arg type="s" direction="in" />\
            <arg type="bs" direction="out" />\
        </method>\
    </interface>\
    </node>';

const MyProxy = Gio.DBusProxy.makeProxyWrapper(MyIface);

let instance = new MyProxy(
    Gio.DBus.session,
    'org.gnome.Shell',
    '/org/gnome/Shell'
);

instance.EvalSync("global.reexec_self()");

imports.mainloop.run("main");
