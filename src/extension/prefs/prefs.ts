import * as Gtk from '@imports/Gtk-3.0';

import ExtensionUtils from '../../gselib/extensionUtils';
import { extendGObject } from '../../gselib/gobjectUtil';
import { _ } from '../../gselib/gettext';

import * as Indicator from './indicator';
import * as Effects from './effects';
import * as Commands from './commands';
import * as Storage from './storage';
import * as Imgur from './imgur';
import * as Keybindings from './keybindings';

const ScreenshotToolSettingsWidget = extendGObject(
  class ScreenshotToolSettingsWidget extends Gtk.Box {
    _init(params) {
      super._init(params);

      const settings = ExtensionUtils.getSettings();
      const notebook = new Gtk.Notebook();

      function addPage(label: string, page: Gtk.Widget) {
        notebook.append_page(page, new Gtk.Label({ label }));
      }

      addPage(_('Indicator'), Indicator.getPage(settings));
      addPage(_('Effects'), Effects.getPage(settings));
      addPage(_('Commands'), Commands.getPage(settings));
      addPage(_('Storage'), Storage.getPage(settings));
      addPage(_('Imgur Upload'), Imgur.getPage(settings));
      addPage(_('Keybindings'), Keybindings.getPage(settings));

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
