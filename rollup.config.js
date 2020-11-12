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

const targetAux = target({
  input: 'src/auxhelper/auxhelper.ts',
  output: {
    file: `${buildPath}/auxhelper.js`,
    name: 'auxhelper',
  },
});

const targetSaveDlg = target({
  input: 'src/saveDlg/saveDlg.ts',
  output: {
    file: `${buildPath}/saveDlg.js`,
    name: 'saveDlg',
  },
});

export default [targetExt, targetPrefs, targetAux, targetSaveDlg];
