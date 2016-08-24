// LD_LIBRARY_PATH=/usr/lib64/gnome-shell/ gjs --js-version 1.8 --include-path=/usr/share/gnome-shell/js
(function() {
  // Teach typelib location path to gi.
  const GIRepository = imports.gi.GIRepository;
  ['mutter', 'gnome-shell', 'gnome-bluetooth', 'gnome-games'].forEach(function(path) {
    GIRepository.Repository.prepend_search_path('/usr/lib/' + path);
  });
})();

const St = imports.gi.St;
const Shell = imports.gi.Shell;
const Lang = imports.lang;
const Main = imports.ui.main;

let appSys = Shell.AppSystem.get_default();
