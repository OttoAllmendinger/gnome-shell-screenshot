import * as Gio from '@imports/Gio-2.0';
import * as Shell from '@imports/Shell-0.1';

export function openURI(uri: string): void {
  const context = Shell.Global.get().create_app_launch_context(0, -1);
  Gio.AppInfo.launch_default_for_uri(uri, context);
}
