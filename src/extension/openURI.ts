import Gio from '@girs/gio-2.0';
import Shell from '@girs/shell-12';

export function openURI(uri: string): void {
  const context = Shell.Global.get().create_app_launch_context(/* timestamp */ 0, /* workspace (current) */ -1);
  Gio.AppInfo.launch_default_for_uri(uri, context);
}
