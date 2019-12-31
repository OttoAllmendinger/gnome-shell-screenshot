NAME = gnome-shell-screenshot
UUID = $(NAME)@ttll.de
SCHEMA = org.gnome.shell.extensions.screenshot.gschema.xml

include gselib/make/gnome-shell-extension.mk

SOURCE += src/empty64.png
