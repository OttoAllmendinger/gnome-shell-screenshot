import * as Gio from '@gi-types/gio2';
import * as Shell from '@gi-types/shell0';

export function openURI(uri: string): void {
  const context = Shell.Global.get().create_app_launch_context(0, -1);
  Gio.AppInfo.launch_default_for_uri(uri, context);
}
