import * as Gtk from '@imports/Gtk-3.0';

import ExtensionUtils from '../../gselib/extensionUtils';
import { extendGObject } from '../../gselib/gobjectUtil';
import { _ } from '../../gselib/gettext';

import * as Indicator from './indicator';
import * as Effects from './effects';
import * as Storage from './storage';
import * as Imgur from './imgur';
import * as Keybindings from './keybindings';

const ScreenshotToolSettingsWidget = extendGObject(
  class ScreenshotToolSettingsWidget extends Gtk.Box {
    _init(params) {
      super._init(params);

      const settings = ExtensionUtils.getSettings();

      const notebook = new Gtk.Notebook();

      let page, label;

      page = Indicator.getPage(settings);
      label = new Gtk.Label({ label: _('Indicator') });
      notebook.append_page(page, label);

      page = Effects.getPage(settings);
      label = new Gtk.Label({ label: _('Effects') });
      notebook.append_page(page, label);

      page = Storage.getPage(settings);
      label = new Gtk.Label({ label: _('Storage') });
      notebook.append_page(page, label);

      page = Imgur.getPage(settings);
      label = new Gtk.Label({ label: _('Imgur Upload (Beta)') });
      notebook.append_page(page, label);

      page = Keybindings.getPage(settings);
      label = new Gtk.Label({ label: _('Keybindings') });
      notebook.append_page(page, label);

      this.add(notebook);
    }
  },
  Gtk.Box,
);

function init() {
  ExtensionUtils.initTranslations();
}

function buildPrefsWidget() {
  const widget = new ScreenshotToolSettingsWidget();
  widget.show_all();

  return widget;
}

export default { init, buildPrefsWidget };
