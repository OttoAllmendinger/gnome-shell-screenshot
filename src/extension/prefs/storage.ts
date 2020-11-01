import * as Gtk from '@imports/Gtk-3.0';
import * as GLib from '@imports/GLib-2.0';

import { _ } from '../../gettext';

import * as Config from '../config';
import * as Filename from '../filename';
import * as Path from '../path';

import { buildConfigSwitch, bindSensitivity, buildConfigRow, buildPage } from './widgets';

export function getPage(settings) {
  const prefs = buildPage();

  /* Save Screenshot [on|off] */

  const switchSaveScreenshot = buildConfigSwitch(settings, _('Auto-Save Screenshot'), Config.KeySaveScreenshot);

  prefs.add(switchSaveScreenshot.hbox);

  /* Save Location [filechooser] */

  const labelSaveLocation = new Gtk.Label({
    label: _('Save Location'),
    xalign: 0,
    expand: true,
  });

  const chooserSaveLocation = new Gtk.FileChooserButton({
    title: _('Select'),
    local_only: true,
  });
  chooserSaveLocation.set_action(Gtk.FileChooserAction.SELECT_FOLDER);

  try {
    const saveLocation = Path.expand(settings.get_string(Config.KeySaveLocation));
    chooserSaveLocation.set_filename(saveLocation);
  } catch (e) {
    logError(e);
  }
  chooserSaveLocation.connect('file-set', () => {
    const uri = chooserSaveLocation.get_uri();
    if (!uri) {
      throw new Error();
    }
    const [filename, err] = GLib.filename_from_uri(uri);
    if (err) {
      throw new Error("can't resolve uri");
    }
    settings.set_string(Config.KeySaveLocation, filename);
  });

  bindSensitivity(switchSaveScreenshot.gtkSwitch, labelSaveLocation);
  bindSensitivity(switchSaveScreenshot.gtkSwitch, chooserSaveLocation);

  prefs.add(buildConfigRow(labelSaveLocation, chooserSaveLocation));

  /* Filename */
  const [defaultTemplate] = settings.get_default_value(Config.KeyFilenameTemplate).get_string();

  const mockDimensions = { width: 800, height: 600 };

  const labelFilenameTemplate = new Gtk.Label({
    label: _('Default Filename'),
    xalign: 0,
    expand: true,
  });

  const inputFilenameTemplate = new Gtk.Entry({
    expand: true,
    tooltip_text: Filename.tooltipText(mockDimensions),
    secondary_icon_name: 'document-revert',
  });

  inputFilenameTemplate.text = settings.get_string(Config.KeyFilenameTemplate);

  prefs.add(buildConfigRow(labelFilenameTemplate, inputFilenameTemplate));

  /* Filename Preview */

  const labelPreview = new Gtk.Label({
    label: _('Preview'),
    expand: true,
    xalign: 0,
  });

  const textPreview = new Gtk.Label({
    xalign: 0,
  });

  const setPreview = (tpl) => {
    try {
      if (tpl == '') {
        return;
      }
      inputFilenameTemplate.get_style_context().remove_class('error');
      const label = Filename.get(tpl, mockDimensions);
      textPreview.label = label;
      settings.set_string(Config.KeyFilenameTemplate, tpl);
    } catch (e) {
      logError(e);
      textPreview.label = '';
      inputFilenameTemplate.get_style_context().add_class('error');
    }
  };

  ['inserted-text', 'deleted-text'].forEach((name) => {
    inputFilenameTemplate.get_buffer().connect(name, ({ text }) => {
      setPreview(text);
    });
  });

  inputFilenameTemplate.connect('icon-press', () => {
    inputFilenameTemplate.text = defaultTemplate;
  });

  setPreview(inputFilenameTemplate.text);

  prefs.add(buildConfigRow(labelPreview, textPreview));

  return prefs;
}
