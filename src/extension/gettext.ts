type GettextFunc = (s: string) => string;

let gettextFunc: GettextFunc | null = null;

export function initGettext(f: GettextFunc) {
  gettextFunc = f;
}

export function gettext(s: string): string {
  if (gettextFunc) {
    return gettextFunc(s);
  }
  return s;
}

export const _ = gettext;
