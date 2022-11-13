import * as GLib from '@gi-types/glib2';

import { getServiceProxy, portalScreenshot } from './extension/screenshotPortal';

if (window['ARGV']) {
  const loop = GLib.MainLoop.new(null, false);
  (async () => {
    await portalScreenshot(await getServiceProxy('./res/'));
  })()
    .then(() => console.log('done'))
    .catch((err) => console.error(err))
    .finally(() => loop.quit());
  loop.run();
}
