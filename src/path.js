// vi: sts=2 sw=2 et
const GLib = imports.gi.GLib;

const PATH_SEPARATOR = "/";

const join = (...segments) => {
  return [""].concat(segments.filter((e) => e !== "")).join(PATH_SEPARATOR);
};

const expandUserDir = (segment) => {
  switch (segment.toUpperCase()) {
  case "$PICTURES":
    return GLib.get_user_special_dir(
      GLib.UserDirectory.DIRECTORY_PICTURES
    );
  default:
    return segment;
  }
};

const expand = (path) => {
  return join.apply(null, path.split(PATH_SEPARATOR).map(expandUserDir));
};


const mkdirParents = (path) => {
  const mode = parseInt("0755", 8);
  const ret = GLib.mkdir_with_parents(path, mode);
  if (ret == -1) {
    throw new Error("error in Glib.mkdir_with_parents");
  }
}

if (window["ARGV"] && ("0" in ARGV) && ARGV[0] === "test") {
  log(expand("$PICTURES///Screenshots"));
}

var exports = {
  join,
  expand
}
