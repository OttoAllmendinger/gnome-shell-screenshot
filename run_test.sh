#!/bin/bash

make uninstall
make && make install
dbus-run-session -- gnome-shell --nested --wayland

