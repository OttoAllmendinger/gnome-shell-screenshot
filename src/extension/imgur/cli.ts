import Gio from '@girs/gio-2.0';
import { Upload } from './Upload';
import GLib from '@girs/glib-2.0';
import MainLoop = GLib.MainLoop;

async function main([command, arg]: string[]) {
  switch (command) {
    case 'upload':
      const f = Gio.File.new_for_path(arg);
      const u = new Upload(f);
      const signals = ['progress', 'error', 'done'];
      signals.forEach((n) => {
        u.on(n, (obj, ...args) => {
          if (n === 'error') {
            console.error(args[0]);
          } else {
            console.log({ event: n, args });
          }

          if (n === 'done') {
            console.log('responseData', u.response);
          }
        });
      });
      await u.start();
      break;
    case 'delete':
      await Upload.delete(arg);
      break;
    default:
      throw new Error('invalid command');
  }
}

if (window['ARGV']) {
  const mainloop = new MainLoop(/* context */ null, /* running */ false);
  main(window['ARGV'])
    .catch((err) => {
      console.error(err);
    })
    .finally(() => {
      mainloop.quit();
    });
  mainloop.run();
}
