import * as GLib from '@imports/GLib-2.0';
import * as Gio from '@imports/Gio-2.0';
import { dump } from '../gselib/dump';

type VariantGJSUtil = GLib.Variant & {
  unpack(): unknown;
  deepUnpack(): unknown;
};

export interface ScreenshotPortalProxy {
  ScreenshotSync(parentWindow: string, options: Record<string, unknown>): [string];
}

const connection = (Gio as any).DBus.session as Gio.DBusConnection;

const serviceName = 'org.freedesktop.portal.Desktop';
const interfaceName = 'org.freedesktop.portal.Request';
const objectPath = '/org/freedesktop/portal/desktop';

interface DBusProxyCtr {
  new (
    bus: Gio.DBusConnection,
    name: string,
    objectPath: string,
    asyncCallback?: (init: unknown, error: Error) => void,
    cancellable?: unknown,
    flags?: Gio.DBusProxyFlags,
  ): ScreenshotPortalProxy;
}

export async function getServiceProxy(extensionPath: string): Promise<ScreenshotPortalProxy> {
  const path = extensionPath + '/org.freedesktop.portal.Screenshot.xml';
  const [ok, data] = GLib.file_get_contents(path);
  if (!ok) {
    throw new Error('could not read interface file');
  }
  const ifaceXml = imports.byteArray.toString(data);
  const Proxy: DBusProxyCtr = (Gio.DBusProxy as any).makeProxyWrapper(ifaceXml);
  return new Promise((resolve, reject) => {
    new Proxy(connection, serviceName, objectPath, (init, err) => {
      log(dump({ init, err }));
      if (err) {
        reject(err);
      } else {
        resolve(init as ScreenshotPortalProxy);
      }
    });
  });
}

async function getResponseParams(requestPath: string): Promise<VariantGJSUtil> {
  return new Promise((resolve) => {
    connection.signal_subscribe(
      serviceName,
      interfaceName,
      'Response',
      requestPath,
      null,
      Gio.DBusSignalFlags.NONE,
      (connection, sender, path, iface, signal, params) => {
        resolve(params as VariantGJSUtil);
      },
    );
  });
}

export async function portalScreenshot(service: ScreenshotPortalProxy): Promise<string> {
  const [requestPath] = service.ScreenshotSync('', {
    interactive: GLib.Variant.new_boolean(true),
  });
  const params = await getResponseParams(requestPath);
  const [responseCode, dict] = params.deepUnpack() as [number, { uri: VariantGJSUtil }];
  switch (responseCode) {
    case 0:
      return dict.uri.deepUnpack() as string;
    case 1:
      throw new Error('cancelled by user');
    default:
      throw new Error(`unexpected responseCode ${responseCode}`);
  }
}
