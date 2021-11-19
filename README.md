![Screenshot](https://raw.githubusercontent.com/OttoAllmendinger/gnome-shell-screenshot/master/data/screenshot.png)

Shortcut to create screenshots that can be opened, copied to clipboard or saved
to disk.

This extension is based on
[gnome-shell-imgur](https://github.com/OttoAllmendinger/gnome-shell-imgur/).

## Installation

### Via extensions.gnome.org

The latest reviewed version can be found at
[GNOME Shell Extensions](https://extensions.gnome.org/extension/1112/screenshot-tool/)

### Via github.com

The latest development version can be installed manually with these commands:

```sh
git clone https://github.com/OttoAllmendinger/gnome-shell-screenshot.git
cd gnome-shell-screenshot
make update_dependencies
make install
```

Then go to https://extensions.gnome.org/local/ to turn on the extension or use
gnome-tweak-tool.

## Reporting a Bug

When reporting a bug, please include debugging output from `gnome-shell`.

You can capture the logs with this command:

```
journalctl --user /usr/bin/gnome-shell --follow
```

## Dev reload
```
dbus-run-session -- gnome-shell --nested --wayland
```

## Known Issues

### Gnome 41 unsafe mode

Root pf the problem: [Merge 1970](https://gitlab.gnome.org/GNOME/gnome-shell/-/merge_requests/1970)

More information about that: [ksnip issue 727](https://github.com/ksnip/ksnip/issues/727)

### Error after updating extension (Gnome-Shell 3.37 and above)

Since Gnome-Shell version `3.37.2`, extensions that are updated are unavailable
(in an error state) until the user logs out and back in again.
([See commit 6ddd43f3 in gnome-shell](https://gitlab.gnome.org/GNOME/gnome-shell/-/commit/6ddd43f36178939d0e1873a40f1cf66f26c61140))

If the error persists, please open a bug report.


### `Error: exitCode=256`


#### Firejail

When using Firejail, please add this configration:


File `/etc/firejail/gjs.local`:

```
noblacklist ${HOME}/.local/share/gnome-shell
```

([Reported here](https://github.com/OttoAllmendinger/gnome-shell-screenshot/issues/80))

#### Extension "No Flash for Clipboard Screenshots"

The extension [available here](https://extensions.gnome.org/extension/1474/no-flash-for-clipboard-screenshots/)
is known to cause problems when used together with gnome-shell-screenshot.

Please deactivate `no-flash-for-clipboard-screenshots` when using gnome-shell-screenshot.

([Reported here](https://github.com/OttoAllmendinger/gnome-shell-screenshot/issues/122))


### Clipboard stops working in Gnome 3.20

On Gnome 3.20, the clipboard stops working after the lock screen appears.

See https://github.com/OttoAllmendinger/gnome-shell-screenshot/issues/4

As a workaround, restart the shell: `Ctrl-F2` `r` `Enter`. The clipboard
should work again afterwards.


## Contributors

* https://github.com/RaphaelRochet, https://github.com/peetcamron -- French translation
* https://github.com/gsantner -- German translation
* https://github.com/pkomur, https://github.com/orschiro, https://github.com/MartinPL -- Polish translation
* https://github.com/amivaleo, https://github.com/Fastbyte01 -- Italian translation
* https://github.com/ge0rgecz -- Czech translation
* https://github.com/dirosis -- Greek translation
* https://github.com/AlexGluck, https://github.com/alex-volga -- Russian translation
* https://github.com/trinaldi -- Portuguese (Brazil) translation
* https://github.com/alex-volga -- Ukrainian translation
* https://github.com/iamhefang -- Simplified Chinese translation
* https://github.com/Mavrikant -- Turkish translation
* https://github.com/Burday -- Bulgarian translation
* https://github.com/johanbcn -- Spanish and Catalan translation
* https://github.com/ibaios -- Basque translation
* https://github.com/kudaliar032 -- Indonesian Translation

Also see contributors for
[gnome-shell-imgur](https://github.com/OttoAllmendinger/gnome-shell-imgur/).

## Tip Address

Bitcoin 3NkWgrxHmQKiNMo94zs4vDQzwwpJ4FtwRN
