let versionArray = function (v) v.split(".").map(Number);

let zip = function (a, b) {
    let headA = a.shift(), headB = b.shift();
    if ((headA !== undefined) || (headB !== undefined)) {
        return [[headA, headB]].concat(zip(a, b));
    } else {
        return [];
    }
};

function versionEqual(a, b) {
    return zip(versionArray(a), versionArray(b)).reduce(
        function (prev, [a, b], index) prev && (a === b)
    , true);
};

function versionGreater(a, b) {
    return (!versionEqual(a, b))
        && zip(versionArray(a), versionArray(b)).reduce(
            function (prev, [a, b], index) prev && (a >= (b || 0))
    , true);
};

function versionSmaller(a, b) {
    return (!versionEqual(a, b)) && (!versionGreater(a, b));
};

if (this['ARGV'] !== undefined) {
    // ghetto tests
    //
    log('zip("1.2.3", "1.2")=' + JSON.stringify(zip(
        versionArray("1.2.3"),
        versionArray("1.2"))));
    log('versionEqual("1.2.3", "1.2")=' + versionEqual("1.2.3", "1.2"));
    log('versionGreater("3.10.1", "3.10")=' + versionGreater("3.10.1", "3.10"));
}
