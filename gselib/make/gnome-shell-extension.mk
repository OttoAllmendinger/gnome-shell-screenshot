.PHONY: all schemas zipfile lint translations

ZIPFILE = $(NAME).zip

SOURCE_JAVASCRIPT=src/*js
SOURCE_JAVASCRIPT_VENDOR=src/vendor/*js

SOURCE = $(SOURCE_JAVASCRIPT) \
		 $(SOURCE_JAVASCRIPT_VENDOR) \
		 src/stylesheet.css \
		 src/metadata.json \
		 src/schemas/*

MO_FILES = src/locale/*/LC_MESSAGES/$(NAME).mo

EXTENSION_PATH = $(HOME)/.local/share/gnome-shell/extensions/$(UUID)


all: archive

translations: $(MO_FILES)

schemas: src/schemas/gschemas.compiled

lint:
	eslint src/*js

archive: $(ZIPFILE)

package:
	make lint
	make archive

uninstall:
	-rm -r $(EXTENSION_PATH)

install: archive
	-rm -r $(EXTENSION_PATH)
	mkdir -p $(EXTENSION_PATH)
	unzip $(ZIPFILE) -d $(EXTENSION_PATH)

src/schemas/gschemas.compiled: src/schemas/$(SCHEMA)
	glib-compile-schemas src/schemas/

src/locale/$(NAME).pot: $(SOURCE_JAVASCRIPT)
	xgettext -k_ -kN_ -o $@ $(sort $^)

# TODO Create new translation
#
# src/locale/%.po: src/locale/$(NAME).pot
# 	msginit \
# 	  --no-translator \
# 	  --input=$^ \
# 	  --output-file=$@ \
# 	  --locale=de_DE.utf8 # FIXME replace this

src/locale/%.po: src/locale/$(NAME).pot
	# NOTE sometimes --no-fuzzy-matching is better
	msgmerge --backup=none --update $@ $^

src/locale/%/LC_MESSAGES/$(NAME).mo: src/locale/%/*.po
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
