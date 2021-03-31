import * as Gtk4 from '@imports/Gtk-4.0';
import ExtensionUtils from '../../gselib/extensionUtils';

import * as prefView from './prefView';
import { getPages } from './prefPages';

function init(): void {
  ExtensionUtils.initTranslations();
}

function buildPrefsWidget(): Gtk4.Widget {
  return prefView.buildPrefPages(getPages(), ExtensionUtils.getSettings(), null as any);
}

export default { init, buildPrefsWidget };
