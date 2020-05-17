NAME = gnome-shell-screenshot
UUID = $(NAME)@ttll.de
SCHEMA = org.gnome.shell.extensions.screenshot.gschema.xml

LANGUAGES = bg ca cs de el es eu fr it pl pt_BR ru tr uk zh_CN

all: update_dependencies
	make archive
	
update_dependencies:
	git submodule update --init

-include gselib/make/gnome-shell-extension.mk

SOURCE += src/empty64.png
