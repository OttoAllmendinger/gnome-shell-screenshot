import * as Gio from '@gi-types/gio2';
import { Upload } from './Upload';

async function main([command, arg]: string[]) {
  switch (command) {
    case 'upload':
      const f = Gio.File.new_for_path(arg);
      const u = new Upload(f);
      const signals = ['progress', 'error', 'done'];
      signals.forEach((n) => {
        u.connect(n, (obj, ...args) => {
          if (n === 'error') {
            logError(args[0]);
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
  main(window.ARGV)
    .catch((err) => {
      logError(err);
    })
    .finally(() => {
      imports.mainloop.quit('main');
    });
  imports.mainloop.run('main');
}
