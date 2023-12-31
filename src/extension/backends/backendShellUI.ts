// based around Gnome-Shell `js/ui/screenshot.js` (v45.1)

import Gio from '@girs/gio-2.0';
import Shell from '@girs/shell-12';
import Cogl from '@girs/cogl-10';
import * as Screenshot from '@gnome-shell/ui/screenshot';

import { Backend, ScreenshotParams } from './backend';
import { registerGObjectClass } from '../../gjs';
import GLib from '@girs/glib-2.0';
import { getTemp } from '../filename';

Gio._promisify((Shell as any).Screenshot, 'composite_to_stream');

/**
 * Captures a screenshot from a texture, given a region, scale and optional
 * cursor data.
 *
 * @param {Cogl.Texture} texture - The texture to take the screenshot from.
 * @param {number[4]} [geometry] - The region to use: x, y, width and height.
 * @param {number} scale - The texture scale.
 * @param {object} [cursor] - Cursor data to include in the screenshot.
 * @param {Cogl.Texture} cursor.texture - The cursor texture.
 * @param {number} cursor.x - The cursor x coordinate.
 * @param {number} cursor.y - The cursor y coordinate.
 * @param {number} cursor.scale - The cursor texture scale.
 */
export async function captureScreenshot(
  texture: Cogl.Texture,
  geometry: number[] | null,
  scale: number,
  cursor: {
    texture: Cogl.Texture | null;
    x: number;
    y: number;
    scale: number;
  },
): Promise<GLib.Bytes> {
  const stream = Gio.MemoryOutputStream.new_resizable();
  const [x, y, w, h] = geometry ?? [0, 0, -1, -1];
  if (cursor === null) {
    cursor = { texture: null, x: 0, y: 0, scale: 1 };
  }

  await (Shell.Screenshot as any).composite_to_stream(
    texture,
    x,
    y,
    w,
    h,
    scale,
    cursor.texture,
    cursor.x,
    cursor.y,
    cursor.scale,
    stream,
  );

  stream.close(null);
  return stream.steal_as_bytes();
}

@registerGObjectClass
class CustomScreenshotUI extends Screenshot.ScreenshotUI {
  bytesPromise: Promise<GLib.Bytes>;
  bytesResolve?: (value: GLib.Bytes) => void;
  bytesReject?: (reason?: any) => void;
  bytesRejectClose?: (reason?: any) => void;

  constructor() {
    super();

    this.bytesPromise = new Promise((resolve, reject) => {
      this.bytesResolve = resolve;
      this.bytesReject = reject;
      this.bytesRejectClose = reject;
    });
  }

  async getScreenshotBytes(): Promise<GLib.Bytes> {
    if (this._selectionButton.checked || this._screenButton.checked) {
      const content = this._stageScreenshot.get_content();
      if (!content) {
        throw new Error('No content');
      }

      const texture = (content as any).get_texture();
      const geometry = this._getSelectedGeometry(true);

      let cursorTexture = this._cursor.content?.get_texture();
      if (!this._cursor.visible) {
        cursorTexture = null;
      }

      return captureScreenshot(texture, geometry, this._scale, {
        texture: cursorTexture ?? null,
        x: this._cursor.x * this._scale,
        y: this._cursor.y * this._scale,
        scale: this._cursorScale,
      });
    } else if (this._windowButton.checked) {
      const window = this._windowSelectors.flatMap((selector) => selector.windows()).find((win) => win.checked);
      if (!window) {
        throw new Error('No window selected');
      }

      const content = window.windowContent;
      if (!content) {
        throw new Error('No window content');
      }

      const texture = content.get_texture();

      let cursorTexture = window.getCursorTexture()?.get_texture();
      if (!this._cursor.visible) {
        cursorTexture = null;
      }

      return captureScreenshot(texture, null, window.bufferScale, {
        texture: cursorTexture ?? null,
        x: window.cursorPoint.x * window.bufferScale,
        y: window.cursorPoint.y * window.bufferScale,
        scale: this._cursorScale,
      });
    }

    throw new Error('No screenshot type selected');
  }

  async _saveScreenshot(): Promise<void> {
    this.bytesRejectClose = undefined;
    try {
      this.bytesResolve?.(await this.getScreenshotBytes());
    } catch (e) {
      this.bytesReject?.(e);
    }
  }

  close(instantly?: boolean): void {
    super.close(instantly);
    this.bytesRejectClose?.(new Error('Screenshot UI closed'));
  }
}

export class BackendShellUI implements Backend {
  supportsParam(paramName: 'delay-seconds'): boolean {
    return false;
  }

  supportsAction(action: 'open-portal' | 'select-area' | 'select-window' | 'select-desktop'): boolean {
    return action === 'open-portal';
  }

  async exec(
    action: 'open-portal' | 'select-area' | 'select-window' | 'select-desktop',
    params: ScreenshotParams,
  ): Promise<string> {
    if (action !== 'open-portal') {
      throw new Error();
    }

    const ui = new CustomScreenshotUI();
    await ui.open();
    const bytes = await ui.bytesPromise;
    const tempfile = getTemp();
    const file = Gio.File.new_for_path(tempfile);
    const stream = file.create(Gio.FileCreateFlags.NONE, null);
    stream.write_bytes(bytes, null);
    return tempfile;
  }
}
