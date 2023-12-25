import GLib from 'gi://GLib?version=2.0';
import Gio from 'gi://Gio?version=2.0';

const connection = Gio.DBus.session;
const serviceName = 'org.freedesktop.portal.Desktop';
const interfaceName = 'org.freedesktop.portal.Request';
const objectPath = '/org/freedesktop/portal/desktop';
async function getServiceProxy(extensionPath) {
    const path = extensionPath + '/org.freedesktop.portal.Screenshot.xml';
    const [ok, data] = GLib.file_get_contents(path);
    if (!ok) {
        throw new Error('could not read interface file');
    }
    const ifaceXml = new TextDecoder().decode(data);
    const Proxy = Gio.DBusProxy.makeProxyWrapper(ifaceXml);
    return new Promise((resolve, reject) => {
        new Proxy(connection, serviceName, objectPath, (init, err) => {
            if (err) {
                reject(err);
            }
            else {
                resolve(init);
            }
        });
    });
}
async function getResponseParams(requestPath) {
    return new Promise((resolve) => {
        connection.signal_subscribe(serviceName, interfaceName, 'Response', requestPath, null, Gio.DBusSignalFlags.NONE, (connection, sender, path, iface, signal, params) => {
            resolve(params);
        });
    });
}
async function portalScreenshot(service) {
    const [requestPath] = service.ScreenshotSync('', {
        interactive: GLib.Variant.new_boolean(true),
    });
    const params = await getResponseParams(requestPath);
    const [responseCode, dict] = params.deepUnpack();
    switch (responseCode) {
        case 0:
            return dict.uri.deepUnpack();
        case 1:
            throw new Error('cancelled by user');
        default:
            throw new Error(`unexpected responseCode ${responseCode}`);
    }
}

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
