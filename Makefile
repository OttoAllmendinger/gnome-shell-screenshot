NAME = gnome-shell-screenshot
UUID = $(NAME)@ttll.de
SCHEMA = org.gnome.shell.extensions.screenshot.gschema.xml

LANGUAGES = bg cs de el fr it pl pt_BR ru tr uk zh_CN

update_dependencies:
	git submodule update --init
	make archive

-include gselib/make/gnome-shell-extension.mk

SOURCE += src/empty64.png
