import * as GLib from '@imports/GLib-2.0';

export function spawnAsync(argv: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const [success, pid] = GLib.spawn_async(
      null /* pwd */,
      argv,
      null /* envp */,
      GLib.SpawnFlags.SEARCH_PATH | GLib.SpawnFlags.DO_NOT_REAP_CHILD,
      null /* child_setup */,
    );
    if (!success) {
      throw new Error('success=false');
    }
    if (pid === null) {
      throw new Error('pid === null');
    }
    GLib.child_watch_add(GLib.PRIORITY_DEFAULT, pid, (pid, exitCode) => {
      if (exitCode === 0) {
        resolve();
      } else {
        logError(new Error(`cmd: ${argv.join(' ')} exitCode=${exitCode}`));
        return reject(new Error(`exitCode=${exitCode}`));
      }
    });
  });
}
