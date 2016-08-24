module.exports = {
  "extends": "eslint:recommended",
  "env": {
    "es6": true
  },

  "ecmaFeatures": {
    "arrowFunctions": true,
    "binaryLiterals": false,
    "blockBindings": true,
    "classes": false,
    "defaultParams": true,
    "destructuring": true,
    "forOf": true,
    "generators": false,
    "modules": false,
    "objectLiteralComputedProperties": false,
    "objectLiteralDuplicateProperties": false,
    "objectLiteralShorthandMethods": false,
    "objectLiteralShorthandProperties": false,
    "octalLiterals": false,
    "regexUFlag": false,
    "regexYFlag": true,
    "spread": false,
    "superInFunctions": false,
    "templateStrings": false
  },

  "globals": {
    "global": true,
    "window": true,
    "log": true,
    "logError": true,
    "print": true,
    "printerr": true,
    "imports": true,
    "ARGV": true,
    "Me": true
  },

  "rules": {
    "no-underscore-dangle": "off",
    "brace-style": ["error"],
    "prefer-arrow-callback": ["error", { "allowNamedFunctions": true }],
    "no-unused-vars": ["error", {
        "vars": "local",
        "args": "none",
        "varsIgnorePattern": "(init|enable|disable|buildPrefsWidget|[A-Z])"
    }],
    "prefer-template": "off"
  }
}
