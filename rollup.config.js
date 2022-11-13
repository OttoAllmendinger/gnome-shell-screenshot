import { target, buildPath, prefsFooter } from './gselib/rollup/rollup.base';

const targetExt = target({
  input: 'src/extension/index.ts',
  output: {
    file: `${buildPath}/extension.js`,
    name: 'init',
    exports: 'default',
  },
});

const targetPrefs = target({
  input: 'src/extension/prefs/prefs.ts',
  output: {
    file: `${buildPath}/prefs.js`,
    name: 'prefs',
    footer: prefsFooter,
    exports: 'default',
  },
});

const targetPrefApp = target({
  input: 'src/extension/prefs/app.ts',
  output: {
    file: `${buildPath}/dev/prefApp.js`,
    name: 'prefApp',
    banner: 'imports.gi.versions.Gtk = imports.gi.GLib.getenv("GTK");\n',
  },
});

const targetScreenshotPortalApp = target({
  input: 'src/screenshotPortalApp.ts',
  output: {
    file: `${buildPath}/dev/screenshotPortalApp.js`,
    name: 'screenshotPortalApp',
    banner: 'imports.gi.versions.Gtk = imports.gi.GLib.getenv("GTK");\n',
  },
});

const targetSaveDlg = target({
  input: 'src/saveDlg/saveDlg.ts',
  output: {
    file: `${buildPath}/saveDlg.js`,
    name: 'saveDlg',
    banner: 'imports.gi.versions.Gtk = imports.gi.GLib.getenv("GTK");\n',
  },
});

const targetUploadImgur = target({
  input: 'src/extension/imgur/cli.ts',
  output: {
    file: `${buildPath}/dev/imgurCli.js`,
    name: 'imgurCli',
    banner: 'imports.gi.versions.Soup = "3.0";\n',
  },
});

export default [
  targetExt,
  targetPrefs,
  targetPrefApp,
  targetScreenshotPortalApp,
  targetSaveDlg,
  targetUploadImgur,
].filter((t) => {
  if (process.env.ROLLUP_BUILD_TARGETS) {
    return process.env.ROLLUP_BUILD_TARGETS.split(',').includes(t.output.name);
  } else {
    return true;
  }
});
