.PHONY: all schemas zipfile lint translations

SCHEMA = org.gnome.shell.extensions.screenshot.gschema.xml

SOURCE_JAVASCRIPT=src/*js

SOURCE = $(SOURCE_JAVASCRIPT) \
		 src/vendor/*js \
		 src/stylesheet.css \
		 src/metadata.json \
		 src/empty64.png \
		 src/schemas/*

MO_FILES = src/locale/*/LC_MESSAGES/gnome-shell-screenshot.mo

ZIPFILE = gnome-shell-screenshot.zip

UUID = gnome-shell-screenshot@ttll.de
EXTENSION_PATH = $(HOME)/.local/share/gnome-shell/extensions/$(UUID)

all: archive

schemas: src/schemas/gschemas.compiled

lint:
	eslint src/*js

translations: $(MO_FILES)

archive: $(ZIPFILE)

uninstall:
	-rm -r $(EXTENSION_PATH)

install: archive
	-rm -r $(EXTENSION_PATH)
	mkdir -p $(EXTENSION_PATH)
	unzip $(ZIPFILE) -d $(EXTENSION_PATH)

src/schemas/gschemas.compiled: src/schemas/$(SCHEMA)
	glib-compile-schemas src/schemas/

src/locale/gnome-shell-screenshot.pot: $(SOURCE_JAVASCRIPT)
	xgettext -k_ -kN_ -o $@ $(sort $^)

# TODO Create new translation
#
# src/locale/%.po: src/locale/gnome-shell-screenshot.pot
# 	msginit \
# 	  --no-translator \
# 	  --input=$^ \
# 	  --output-file=$@ \
# 	  --locale=de_DE.utf8 # FIXME replace this

src/locale/%.po: src/locale/gnome-shell-screenshot.pot
	# NOTE sometimes --no-fuzzy-matching is better
	msgmerge --backup=none --update $@ $^

src/locale/%/LC_MESSAGES/gnome-shell-screenshot.mo: src/locale/%/*.po
	msgfmt $^ --output-file=$@

$(ZIPFILE): $(SOURCE) schemas
	-rm $(ZIPFILE)
	cd src && zip -r ../$(ZIPFILE) \
	   $(patsubst src/%,%,$(SOURCE)) \
	   $(patsubst src/%,%,$(MO_FILES))

prefs: install
	gnome-shell-extension-prefs $(UUID)

restart:
	gjs tools/restartShell.js
