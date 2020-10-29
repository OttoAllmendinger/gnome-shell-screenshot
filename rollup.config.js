import typescript from '@rollup/plugin-typescript';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';

const buildPath = 'dist';

const globals = {
  '@imports/Gio-2.0': 'imports.gi.Gio',
  '@imports/Gdk-3.0': 'imports.gi.Gdk',
  '@imports/Gtk-3.0': 'imports.gi.Gtk',
  '@imports/GdkPixbuf-2.0': 'imports.gi.GdkPixbuf',
  '@imports/GObject-2.0': 'imports.gi.GObject',
  '@imports/GLib-2.0': 'imports.gi.GLib',
  '@imports/St-1.0': 'imports.gi.St',
  '@imports/Shell-0.1': 'imports.gi.Shell',
  '@imports/Meta-7': 'imports.gi.Meta',
  '@imports/Wnck-3.0': 'imports.gi.Wnck',
  '@imports/Cogl-7': 'imports.gi.Cogl',
  '@imports/Clutter-7': 'imports.gi.Clutter',
  '@imports/Soup-2.4': 'imports.gi.Soup',
};

const external = Object.keys(globals);

const banner = [].join('\n');

const prefsFooter = ['var init = prefs.init;', 'var buildPrefsWidget = prefs.buildPrefsWidget;'].join('\n');

const ts = typescript({ tsconfig: './tsconfig.json' });

function target({ input, output, plugins = [] }) {
  return {
    input,
    output: {
      format: 'iife',
      banner,
      globals,
      ...output,
    },
    external,
    plugins: [
      commonjs(),
      nodeResolve({
        preferBuiltins: false,
      }),
      ts,
      ...plugins,
    ],
  };
}

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
