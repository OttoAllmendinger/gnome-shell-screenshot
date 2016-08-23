const Gio = imports.gi.Gio;

function getSettings(schema, path) {
    const GioSSS = Gio.SettingsSchemaSource;
    let schemaSource = GioSSS.new_from_directory(path,
                                                 GioSSS.get_default(),
                                                 false);

    let schemaObj = schemaSource.lookup(schema, true);

    if (!schemaObj)
        throw new Error('Schema ' + schema + ' could not be found for extension ');

    return new Gio.Settings({ settings_schema: schemaObj });
}

let schema = "org.gnome.shell.extensions.imgur";
let path = 'src/schemas/';
let settings = getSettings(schema, path);

log(settings.get_boolean('enable-indicator'));
settings.set_boolean('enable-indicator', true);
settings.set_strv('shortcut', ['<Super>F12']);

settings.sync();
