imports.gi.versions.Gtk = imports.gi.GLib.getenv("GTK");

(function (GLib, Gio) {
    'use strict';

    const dump = (v, opts = { values: true, all: false }) => {
        const segments = [];
        const makeSegments = (v, objects = [], indent = 1) => {
            if (indent > 10) {
                segments.push(' ... (indent limit)');
                return;
            }
            if (segments.length > 1000) {
                segments.push(' ... (segment limit)');
                return;
            }
            if (v === null || v === undefined) {
                segments.push(String(v));
                return;
            }
            let asString;
            try {
                asString = String(v);
            }
            catch (e) {
                asString = '<???>';
            }
            const isArguments = asString === '[object Arguments]';
            let isArray = false;
            let isObject = false;
            try {
                isObject = !isArguments && v.constructor === Object;
                isArray = v.constructor === Array;
            }
            catch (e) {
                // isUnknown = true;
            }
            let keys = null;
            try {
                if (opts.all) {
                    keys = Object.getOwnPropertyNames(v);
                }
                else {
                    keys = Object.keys(v);
                }
            }
            catch (e) {
                /* noop */
            }
            const hasKeys = keys !== null;
            if (isArguments) {
                v = Array.prototype.slice.call(v);
            }
            const type = typeof v;
            const isPrimitive = v == null || (type != 'object' && type != 'function');
            if (isArray || isArguments || isObject || hasKeys) {
                if (objects.indexOf(v) >= 0) {
                    segments.push('(recursion)');
                    return;
                }
            }
            const nextObjects = objects.concat([v]);
            if (isArray || isArguments) {
                segments.push('[');
                v.forEach((x, i) => {
                    if (i > 0) {
                        segments.push(', ');
                    }
                    makeSegments(x, nextObjects, indent + 1);
                });
                segments.push(']');
            }
            else if (!isPrimitive && (isObject || hasKeys)) {
                segments.push('{ <', asString, '> ');
                let keys;
                if (opts.all) {
                    keys = Object.getOwnPropertyNames(v);
                }
                else {
                    keys = Object.keys(v);
                }
                keys.forEach((k, i) => {
                    if (i > 0) {
                        segments.push(', ');
                    }
                    segments.push(k.toString());
                    segments.push(': ');
                    if (opts.values) {
                        const props = Object.getOwnPropertyDescriptor(v, k);
                        if (props && 'value' in props) {
                            makeSegments(v[k], nextObjects, indent + 1);
                        }
                        else {
                            segments.push('(property)');
                        }
                    }
                    else {
                        segments.push('(', typeof v[k], ')');
                    }
                });
                segments.push('}');
            }
            else {
                segments.push(asString, ' (', typeof v, ')');
            }
        };
        makeSegments(v);
        return segments.join('');
    };

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
        const ifaceXml = imports.byteArray.toString(data);
        const Proxy = Gio.DBusProxy.makeProxyWrapper(ifaceXml);
        return new Promise((resolve, reject) => {
            new Proxy(connection, serviceName, objectPath, (init, err) => {
                log(dump({ init, err }));
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

}(imports.gi.GLib, imports.gi.Gio));
