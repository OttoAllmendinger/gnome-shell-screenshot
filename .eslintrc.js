module.exports = {
  "extends": "eslint:recommended",
  "env": {
    "es6": true
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
    "object-shorthand": "error",
    "space-before-function-paren": ["error", "never"],
    "prefer-const": "error",
    "no-underscore-dangle": "off",
    "brace-style": ["error"],
    "no-unused-vars": ["error", {
        "vars": "local",
        "args": "none",
        "varsIgnorePattern": "(init|enable|disable|buildPrefsWidget|[A-Z])"
    }],
    "quotes": ["error", "double"],
    "prefer-template": "off",
    "comma-spacing": "error",
    "max-len": ["error", 100]
  }
}
