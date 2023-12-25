import Adw from '@girs/adw-1';
import { ExtensionPreferences } from '@gnome-shell/extensions/prefs';

import * as prefView from './prefView';
import { getPages } from './prefPages';
import { initGettext } from '../gettext';

export default class GnomeShellScreenshotSettings extends ExtensionPreferences {
  constructor(metadata) {
    super(metadata);

    initGettext(this.gettext.bind(this));
  }

  fillPreferencesWindow(window: Adw.PreferencesWindow): void {
    const page = new Adw.PreferencesPage();
    const group = new Adw.PreferencesGroup();
    const settings = this.getSettings();
    group.add(prefView.buildPrefPages(getPages(), settings));
    page.add(group);
    window.add(page);
    window.width_request = 800;
  }
}
