.PHONY: all schemas zipfile lint

SCHEMA = org.gnome.shell.extensions.screenshot.gschema.xml

SOURCE = src/*.js \
		 src/vendor/*js \
		 src/stylesheet.css \
		 src/metadata.json \
		 src/empty64.png \
		 src/locale/*/LC_MESSAGES/gnome-shell-screenshot.mo \
		 src/schemas/*

ZIPFILE = gnome-shell-screenshot.zip

UUID = gnome-shell-screenshot@ttll.de
EXTENSION_PATH = $(HOME)/.local/share/gnome-shell/extensions/$(UUID)

all: archive

schemas: src/schemas/gschemas.compiled

lint:
	eslint src/*js

archive: $(ZIPFILE)

uninstall:
	-rm -r $(EXTENSION_PATH)

install: archive
	-rm -r $(EXTENSION_PATH)
	mkdir -p $(EXTENSION_PATH)
	unzip $(ZIPFILE) -d $(EXTENSION_PATH)


src/schemas/gschemas.compiled: src/schemas/$(SCHEMA)
	glib-compile-schemas src/schemas/

$(ZIPFILE): $(SOURCE) schemas
	-rm $(ZIPFILE)
	cd src && zip -r ../$(ZIPFILE) $(patsubst src/%,%,$(SOURCE))

prefs: install
	gnome-shell-extension-prefs $(UUID)

