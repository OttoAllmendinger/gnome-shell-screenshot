const root = "/home/otto/Sync/gnome-shell-screenshot/";
imports.searchPath.unshift(root + "/src");

const {dump} = imports.dump;

// print(dump(window, {values: false}));
print(dump(window.imports.gi, {values: false}));
print("done");
