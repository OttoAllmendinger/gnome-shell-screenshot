// vi: sts=2 sw=2 et
const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;

imports.searchPath.unshift('./src');

const { dump } = imports.dump;

const MyIface =
  '\
  <node>\
  <interface name="org.gnome.Shell">\
    <method name="Eval">\
      <arg type="s" direction="in" />\
      <arg type="bs" direction="out" />\
    </method>\
  </interface>\
  </node>';

const MyProxy = Gio.DBusProxy.makeProxyWrapper(MyIface);

const instance = new MyProxy(Gio.DBus.session, 'org.gnome.Shell', '/org/gnome/Shell');

const shellEval = (code) => {
  if (typeof code !== typeof '') {
    throw 'code is not string';
  }
  let [success, message] = instance.EvalSync(code);
  if (success) {
    log('success');
  } else {
    log('error: ' + message);
  }
};

const prelude = 'log("prelude")';

if (window['ARGV']) {
  const filename = ARGV[0];
  const file = Gio.file_new_for_path(filename);
  const loop = GLib.MainLoop.new(null, false);
  file.load_contents_async(null, (f, res) => {
    try {
      let content = file.load_contents_finish(res)[1].toString();
      shellEval(prelude + '\n' + content);
    } catch (e) {
      log('error: ' + e);
    }
    loop.quit();
  });
  loop.run();
}
