import { Settings, File } from '@imports/Gio-2.0';
import '@imports/Gjs';

type Callback = (...v: any[]) => void;

declare interface SignalEmitter {
  emit(k: string, ...v: any[]);

  disconnectAll();

  connect(k: string, c: Callback);
}

interface ExtensionUtils {
  initTranslations(): void;
  getSettings(): Settings;
  getCurrentExtension(): {
    path: string;
    metadata: any;
    dir: File;
  };
}

declare global {
  const window: {
    ARGV: string[];
  };
}
