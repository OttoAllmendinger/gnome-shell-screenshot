import * as Gio from '@gi-types/gio2';
import * as GdkPixbuf from '@gi-types/gdkpixbuf2';
import * as Filename from './filename';
import { getExtension } from './extension';

// width and height of thumbnail
const size = 64;

export const getIcon = (path) => {
  const emptyImagePath = getExtension().info.path + '/empty64.png';
  // creates an scaled with aspect ratio where the larger side is 64px
  const source = GdkPixbuf.Pixbuf.new_from_file_at_size(path, size, size);

  // load transparent 64x64 image
  const dst = GdkPixbuf.Pixbuf.new_from_file_at_size(emptyImagePath, size, size);

  const { width, height } = (source as unknown) as { width: number; height: number };
  const offsetX = (size - width) / 2;
  const offsetY = (size - height) / 2;

  // put smaller image on top of bigger image
  source.composite(
    dst,
    offsetX,
    offsetY,
    width,
    height,
    offsetX,
    offsetY,
    1,
    1, // scaleX, scaleY
    GdkPixbuf.InterpType.HYPER,
    255, // overall_alpha
  );

  // return as file icon
  const scaledPath = Filename.getTemp();
  dst.savev(scaledPath, 'png', [], []);
  const scaledFile = Gio.File.new_for_path(scaledPath);
  return new Gio.FileIcon({ file: scaledFile });
};
