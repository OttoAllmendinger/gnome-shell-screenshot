import * as Gio from '@gi-types/gio2';
import * as GLib from '@gi-types/glib2';

import * as Gtk4 from '@gi-types/gtk4';

import { getPages } from './prefPages';
import * as prefView from './prefView';

const GioSSS = Gio.SettingsSchemaSource;

function getSettingsSchema(): Gio.SettingsSchema {
  // Expect USER extensions to have a schemas/ subfolder, otherwise assume a
  // SYSTEM extension that has been installed in the same prefix as the shell
  const schema = 'org.gnome.shell.extensions.screenshot';
  const schemaPath = GLib.getenv('SCHEMA_DIR') || './res/schemas';
  const schemaDir = Gio.File.new_for_path(schemaPath);
  if (!schemaDir || !schemaDir.query_exists(null)) {
    throw new Error(`${schemaPath} does not exist`);
  }
  const schemaSource = GioSSS.new_from_directory(schemaDir.get_path()!, GioSSS.get_default(), false);
  const schemaObj = schemaSource.lookup(schema, true);
  if (!schemaObj) {
    throw new Error(`could not lookup ${schema}`);
  }

  return schemaObj;
}

function getSettings(): Gio.Settings {
  const schema = getSettingsSchema();
  const settings = new Gio.Settings({ settings_schema: schema });

  if (GLib.getenv('RESET') === '1') {
    schema.list_keys().forEach((k) => {
      log(`reset ${k}`);
      settings.reset(k);
    });
  }

  return settings;
}

class PrefsAppWindow {
  constructor(private app: Gtk4.Application) {}

  getWindow(): Gtk4.Window {
    const windowConfig = {
      application: this.app,
      default_height: 600,
      default_width: 800,
    };
    let window;
    switch ((imports.gi as any).versions.Gtk) {
      case '4.0':
        window = new Gtk4.ApplicationWindow(windowConfig as any);
        window.set_child(prefView.buildPrefPages(getPages(), getSettings(), window));
        break;
      default:
        throw new Error('not supported');
    }

    return window;
  }
}

const application = new Gtk4.Application({
  application_id: 'org.gnome.GnomeShellScreenshot.PrefsTestApp',
  flags: Gio.ApplicationFlags.FLAGS_NONE,
});

application.connect('activate', (app) => {
  let activeWindow = app.active_window;

  if (!activeWindow) {
    const imageViewerWindow = new PrefsAppWindow(app);
    activeWindow = imageViewerWindow.getWindow();
  }

  activeWindow.present();
});

application.run(null);
