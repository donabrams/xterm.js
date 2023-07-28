/// <reference types="@webgpu/types" />

/**
 * Copyright (c) 2023 Donald Abrams. All rights reserved.
 * @license MIT
 */
import { IRenderDimensions, IRenderer, IRequestRedrawEvent, ITextureAtlas } from 'browser/renderer/shared/Types';
import { createRenderDimensions } from 'browser/renderer/shared/RendererUtils';
import { IEvent } from 'common/EventEmitter';
import { IDisposable } from 'common/Types';
// TODO: I'd rather exclusively use ITerminal but it's too convoluted currently
import { Terminal } from 'xterm';
import { ITerminal } from 'browser/Types';
import type { CanvasKit, Surface } from "canvaskit-wasm";

const disposableStub: IDisposable = { dispose: () => {} };

export class SkiaRenderer implements IRenderer {
  private _devicePixelRatio: number = 2
  private _canvas: HTMLCanvasElement;
  private _canvasKit: CanvasKit;
  private _surface: Surface;
  public readonly dimensions: IRenderDimensions = createRenderDimensions();

  constructor(terminal: Terminal, canvasKit: CanvasKit) {
    this._canvasKit = canvasKit;
    // TODO: update _devicePixelRatio via _coreBrowserService.dpr
    this._canvas = document.createElement('canvas');
    // TODO: use real dimensions here
    this._canvas.width = 400;
    this._canvas.height = 400;
    this._canvas.style.width = `400px`;
    this._canvas.style.height = `400px`;

    const core = (terminal as any)._core as ITerminal;
    core.screenElement!.appendChild(this._canvas);

    // TODO: try MakeGPUCanvasSurface after this works initially
    const surface = canvasKit.MakeWebGLCanvasSurface(this._canvas);
    if (surface === null) {
      throw new Error("cannot make the canvas surface");
    }
    this._surface = surface;
    this.drawFrame();
  }

  private drawFrame() {
    const skcanvas = this._surface.getCanvas();
    skcanvas.scale(this._devicePixelRatio, this._devicePixelRatio);
    skcanvas.clear(this._canvasKit.Color(255, 0, 0, 0.5));
    this._surface.flush();
  }

  /**
   * Fires when the renderer is requesting to be redrawn on the next animation
   * frame but is _not_ a result of content changing (eg. selection changes).
   */
  get onRequestRedraw(): IEvent<IRequestRedrawEvent> {
    return (listener: ((redrawEvent: IRequestRedrawEvent) => void) ) => disposableStub;
  }

  dispose() {}
  handleDevicePixelRatioChange(): void {
    // If the device pixel ratio changed, the char atlas needs to be regenerated
    // and the terminal needs to refreshed
    // if (this._devicePixelRatio !== this._coreBrowserService.dpr) {
    //   this._devicePixelRatio = this._coreBrowserService.dpr;
    //   this.handleResize(this._terminal.cols, this._terminal.rows);
    // }
  }
  handleResize(cols: number, rows: number) {}
  handleCharSizeChanged() {}
  handleBlur() {};
  handleFocus() {};
  handleSelectionChanged(start: [number, number] | undefined, end: [number, number] | undefined, columnSelectMode: boolean) {};
  handleCursorMove() {};
  clear() {};
  renderRows(start: number, end: number) {};
  // TODO: should I clear whatever Skia uses as a char cache here?
  clearTextureAtlas() {};
}

