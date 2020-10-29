import '@imports/Gjs';

type Callback = (...v: any[]) => void;

declare interface SignalEmitter {
  emit(k: string, ...v: any[]);

  disconnectAll();

  connect(k: string, c: Callback);
}

declare global {
  const window: {
    ARGV: string[];
  };
}
