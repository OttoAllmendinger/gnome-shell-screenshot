/*jshint moz:true */
const root = '/home/otto/Sync/gnome-shell-screenshot/';
imports.searchPath.unshift(root + '/src');

const Misc = imports.misc;
const Util = imports.misc.util;

const { dump } = imports.dump;

const uuid = 'gnome-shell-screenshot@ttll.de';

let ext = Misc.extensionUtils.extensions[uuid];

Util.spawn(['gjs', ext.path + '/saveDlg.js', '/tmp/lolz']);
