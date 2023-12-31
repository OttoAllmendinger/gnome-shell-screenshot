import St from '@girs/st-13';
import Cogl from '@girs/cogl-10';
import Clutter from '@girs/clutter-13';

export type Cursor = {
  texture: Cogl.Texture | null;
  x: number;
  y: number;
  scale: number;
  visible: boolean;
  content?: St.Actor;
};

export class ScreenshotUI {
  open(): Promise<void>;
  close(instantly?: boolean): void;
  _getSelectedGeometry(v: boolean): [number, number, number, number];

  _windowSelectors: {
    windows(): Clutter.Window[];
  }[];

  _cursor: Cursor;
  _cursorScale: number;
  _scale: number;

  _selectionButton: St.Button;
  _screenButton: St.Button;
  _windowButton: St.Button;

  _closeButton: St.Button;

  _stageScreenshot: St.Widget;

  _saveScreenshot(): Promise<void>;
}

export function showScreenshotUI(): void;
