import { targetShell, targetShellExt, buildPath, targetNoShell } from './gselib/rollup/rollup.base';

const targetExt = targetShell({
  input: 'src/extension/index.ts',
  output: {
    file: `${buildPath}/extension.js`,
    name: 'init',
    exports: 'default',
  },
});

const targetPrefs = targetShellExt({
  input: 'src/extension/prefs/prefs.ts',
  output: {
    file: `${buildPath}/prefs.js`,
    name: 'prefs',
    exports: 'default',
  },
});

const targetScreenshotPortalApp = targetNoShell({
  input: 'src/screenshotPortalApp.ts',
  output: {
    file: `${buildPath}/dev/screenshotPortalApp.js`,
    name: 'screenshotPortalApp',
  },
});

const targetSaveDlg = targetNoShell({
  input: 'src/saveDlg/saveDlg.ts',
  output: {
    file: `${buildPath}/saveDlg.js`,
    name: 'saveDlg',
  },
});

const targetUploadImgur = targetNoShell({
  input: 'src/extension/imgur/cli.ts',
  output: {
    file: `${buildPath}/dev/imgurCli.js`,
    name: 'imgurCli',
  },
});

export default [targetExt, targetPrefs, targetScreenshotPortalApp, targetSaveDlg, targetUploadImgur].filter((t) => {
  if (process.env.ROLLUP_BUILD_TARGETS) {
    return process.env.ROLLUP_BUILD_TARGETS.split(',').includes(t.output.name);
  } else {
    return true;
  }
});
