const versionArray = (v) => v.split(".").map(Number);

const zip = function(a, b, defaultValue) {
    if (a.length === 0 && b.length === 0) {
        return [];
    }
    const headA = (a.length > 0) ? a.shift() : defaultValue;
    const headB = (b.length > 0) ? b.shift() : defaultValue;
    return [[headA, headB]].concat(zip(a, b, defaultValue));
};

function versionEqual(a, b) {
    return zip(versionArray(a), versionArray(b), 0).reduce(
        (prev, [a, b]) => prev && (a === b)
    , true);
}

function versionGreater(a, b) {
    const diff = zip(versionArray(a), versionArray(b), 0).find(([a, b]) => a !== b);
    if (!diff) {
        return false;
    }
    const [x, y] = diff;
    return x > y;
}

function versionSmaller(a, b) {
    return (!versionEqual(a, b)) && (!versionGreater(a, b));
}

if (window["ARGV"] && ARGV[0] == "test") {
    log("zip(\"1.2.3\", \"1.2\")=" + JSON.stringify(zip(
        versionArray("1.2.3"),
        versionArray("1.2"))));
    log("versionEqual(\"1.2.3\", \"1.2\")=" + versionEqual("1.2.3", "1.2"));
    [
      ["1", "1", false],
      ["1", "1.0", false],
      ["1", "1.0.0", false],
      ["1.0", "1.0", false],
      ["1.2", "2.1", false],
      ["1.2.3", "2.1", false],
      ["2.1", "1.2", true],
      ["2.1.1", "1.2", true],
      ["1.2.1", "1.2.0", true],
      ["1.2.1", "1.2", true],
      ["1.2", "1.2.0", false],
      ["1.2", "1.2.1", false],
      ["3.32.2", "3.32", true],
      ["3.32", "3.32.2", false],
    ].forEach(([a, b, expected]) => {
        const actual = versionGreater(a, b);
        if (expected !== actual) {
            log(
                `ERROR: versionGreater("${a}", "${b}") is ${actual}, ` +
                `expected ${expected}`
            );
        }
    });
}

var exports = {
  versionEqual,
  versionGreater,
  versionSmaller
}
