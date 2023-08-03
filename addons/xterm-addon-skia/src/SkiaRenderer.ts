/// <reference types="@webgpu/types" />

/**
 * Copyright (c) 2023 Donald Abrams. All rights reserved.
 * @license MIT
 */
import { IRenderDimensions, IRenderer, IRequestRedrawEvent, ITextureAtlas } from 'browser/renderer/shared/Types';
import { ICoreBrowserService, ICharSizeService } from 'browser/services/Services';

import { createRenderDimensions } from 'browser/renderer/shared/RendererUtils';
import { IEvent } from 'common/EventEmitter';
import { IDisposable } from 'common/Types';
import { Terminal } from 'xterm';
import { ITerminal } from 'browser/Types';
import type { Canvas, CanvasKit, Surface, Typeface } from "canvaskit-wasm";
import { IBufferService, IOptionsService } from 'common/services/Services';

const disposableStub: IDisposable = { dispose: () => {} };

export class SkiaRenderer implements IRenderer {
  private _devicePixelRatio: number = 0;
  private _canvas: HTMLCanvasElement;
  private _surface: Surface;
  private _core: ITerminal;
  public readonly dimensions: IRenderDimensions = createRenderDimensions();

  constructor(
      private readonly _terminal: Terminal,
      private readonly _canvasKit: CanvasKit,
      private readonly _typeface: Typeface,
      private readonly _coreBrowserService: ICoreBrowserService,
      private readonly _charSizeService: ICharSizeService,
      private readonly _optionsService: IOptionsService,
      private readonly _bufferService: IBufferService) {
    this._core = (this._terminal as any)._core as ITerminal;

    // setup initial canvas element
    this._canvas = document.createElement('canvas');
    // abuse handleDevicePixelRatioChange to setup _canvas appropriately
    this.handleDevicePixelRatioChange();
    this._core.screenElement!.appendChild(this._canvas);

    // TODO: try MakeGPUCanvasSurface after this works initially
    const surface = this._canvasKit.MakeWebGLCanvasSurface(this._canvas);
    if (surface === null) {
      throw new Error("cannot make the canvas surface");
    }
    this._surface = surface;
    //this._surface.drawOnce(this.drawTestFrame.bind(this));
  }

  private drawTestFrame(canvas: Canvas) {
    canvas.scale(this._devicePixelRatio, this._devicePixelRatio);
    canvas.clear(this._canvasKit.Color(255, 255, 255, 1.0));

    // rectangle
    const paint_rec = new this._canvasKit.Paint();
    paint_rec.setColor(this._canvasKit.Color(128, 128, 128, 0.95));
    paint_rec.setStyle(this._canvasKit.PaintStyle.Stroke);
    paint_rec.setAntiAlias(true);
    const shape_rec = this._canvasKit.RRectXY(this._canvasKit.LTRBRect(10, 60, 210, 260), 25, 15);
    canvas.drawRRect(shape_rec, paint_rec);

    // text
    const color_txt = this._canvasKit.Color(10, 10, 10, 0.95)
    const paint_txt = new this._canvasKit.Paint();
    paint_txt.setColor(color_txt);
    paint_txt.setStyle(this._canvasKit.PaintStyle.Stroke);
    paint_txt.setAntiAlias(true);
    const font = new this._canvasKit.Font(this._typeface, 24);
    canvas.drawText("Hello World", 200, 200, paint_txt, font);
    // cache checker
    console.log(`just latin set`);
  }

  /**
   * Fires when the renderer is requesting to be redrawn on the next animation
   * frame but is _not_ a result of content changing (eg. selection changes).
   */
  get onRequestRedraw(): IEvent<IRequestRedrawEvent> {
    return (listener: ((redrawEvent: IRequestRedrawEvent) => void) ) => disposableStub;
  }

  dispose() {}
  public handleDevicePixelRatioChange(): void {
    console.log({
      "handleDevicePixelRatioChange": 1,
      "this._coreBrowserService.dpr": this._coreBrowserService.dpr,
      "this._devicePixelRatio": this._devicePixelRatio,
    });
    // If the device pixel ratio changed, the char atlas needs to be regenerated
    // and the terminal needs to refreshed
    if (this._devicePixelRatio !== this._coreBrowserService.dpr) {
       this._devicePixelRatio = this._coreBrowserService.dpr;
       this.handleResize(this._terminal.cols, this._terminal.rows);
    }
  }
  handleCharSizeChanged() {}
  handleBlur() {};
  handleFocus() {};
  handleSelectionChanged(start: [number, number] | undefined, end: [number, number] | undefined, columnSelectMode: boolean) {};
  handleCursorMove() {};
  clear() {};
  renderRows(start: number, end: number) {
    const newLines = this.getLinesToRender(start, end);
    this.naiveDraw(start, end, newLines);
  };

  private terminalContent: string[] = [];

  private naiveDraw(start: number, end:number, replacements: string[]) {
    this.terminalContent.splice(start, end-start+1, ...replacements);
    console.log({"naiveDraw": this.terminalContent});
    this._surface.requestAnimationFrame(this.drawTerminalContent.bind(this));
  }
  private drawTerminalContent(canvas: Canvas) {
    canvas.clear(this._canvasKit.Color(255, 255, 255, 1.0));
    const color_txt = this._canvasKit.Color(10, 10, 10, 0.95)
    const paint_txt = new this._canvasKit.Paint();
    paint_txt.setColor(color_txt);
    paint_txt.setStyle(this._canvasKit.PaintStyle.Stroke);
    paint_txt.setAntiAlias(true);
    const font = new this._canvasKit.Font(this._typeface, 24);
    const row_height = this._charSizeService.height;
    for (let row = 0, height = 0; row <= this.terminalContent.length; row++, height+= row_height) {
      if (this.terminalContent[row] && this.terminalContent[row].length) {
        canvas.drawText(this.terminalContent[row], 0, height, paint_txt, font);
      }
    }
  }

  private getLinesToRender(start: number, end: number) {
    const offset = this._bufferService.buffer.ydisp;
    const b_start = offset + start;
    const b_end = offset + end;
    const toRender = [];
    for (let row = b_start; row <= b_end; row++) {
      const line = this._bufferService.buffer.lines.get(row);
      toRender.push(!line || line.length === 0 ? "" : line.translateToString(true));
    }
    console.log({"getLinesToRender": `${start}-${end}`, dimensions: this.dimensions, offset, toRender});
    return toRender;
  }
  
  // TODO: "emit the refresh event after rendering rows to the screen."

  // TODO: should I clear whatever Skia uses as a glyph cache here?
  clearTextureAtlas() {};

  public handleResize(cols: number, rows: number): void {
    // Update character and canvas dimensions
    this._updateDimensions();

    // Resize the canvas
    this._canvas.width = this.dimensions.device.canvas.width;
    this._canvas.height = this.dimensions.device.canvas.height;
    this._canvas.style.width = `${this.dimensions.css.canvas.width}px`;
    this._canvas.style.height = `${this.dimensions.css.canvas.height}px`;

    // Resize the screen
    this._core.screenElement!.style.width = `${this.dimensions.css.canvas.width}px`;
    this._core.screenElement!.style.height = `${this.dimensions.css.canvas.height}px`;

    // TODO: force a rerender/paint
  }

  /**
   * Recalculates the character and canvas dimensions.
   */
  private _updateDimensions(): void {
    console.log({
      "_updateDimensions": 1,
      "_charSizeService.width": !this._charSizeService.width,
      "_charSizeService.height": !this._charSizeService.height,
    });
    // Perform a new measure if the CharMeasure dimensions are not yet available
    if (!this._charSizeService.width || !this._charSizeService.height) {
      return;
    }

    // Calculate the device character width. Width is floored as it must be drawn to an integer grid
    // in order for the char atlas glyphs to not be blurry.
    this.dimensions.device.char.width = Math.floor(this._charSizeService.width * this._devicePixelRatio);

    // Calculate the device character height. Height is ceiled in case devicePixelRatio is a
    // floating point number in order to ensure there is enough space to draw the character to the
    // cell.
    this.dimensions.device.char.height = Math.ceil(this._charSizeService.height * this._devicePixelRatio);

    // Calculate the device cell height, if lineHeight is _not_ 1, the resulting value will be
    // floored since lineHeight can never be lower then 1, this guarentees the device cell height
    // will always be larger than device char height.
    this.dimensions.device.cell.height = Math.floor(this.dimensions.device.char.height * this._optionsService.rawOptions.lineHeight);

    // Calculate the y offset within a cell that glyph should draw at in order for it to be centered
    // correctly within the cell.
    this.dimensions.device.char.top = this._optionsService.rawOptions.lineHeight === 1 ? 0 : Math.round((this.dimensions.device.cell.height - this.dimensions.device.char.height) / 2);

    // Calculate the device cell width, taking the letterSpacing into account.
    this.dimensions.device.cell.width = this.dimensions.device.char.width + Math.round(this._optionsService.rawOptions.letterSpacing);

    // Calculate the x offset with a cell that text should draw from in order for it to be centered
    // correctly within the cell.
    this.dimensions.device.char.left = Math.floor(this._optionsService.rawOptions.letterSpacing / 2);

    // Recalculate the canvas dimensions, the device dimensions define the actual number of pixel in
    // the canvas
    this.dimensions.device.canvas.height = this._terminal.rows * this.dimensions.device.cell.height;
    this.dimensions.device.canvas.width = this._terminal.cols * this.dimensions.device.cell.width;

    // The the size of the canvas on the page. It's important that this rounds to nearest integer
    // and not ceils as browsers often have floating point precision issues where
    // `window.devicePixelRatio` ends up being something like `1.100000023841858` for example, when
    // it's actually 1.1. Ceiling may causes blurriness as the backing canvas image is 1 pixel too
    // large for the canvas element size.
    this.dimensions.css.canvas.height = Math.round(this.dimensions.device.canvas.height / this._devicePixelRatio);
    this.dimensions.css.canvas.width = Math.round(this.dimensions.device.canvas.width / this._devicePixelRatio);

    // Get the CSS dimensions of an individual cell. This needs to be derived from the calculated
    // device pixel canvas value above. CharMeasure.width/height by itself is insufficient when the
    // page is not at 100% zoom level as CharMeasure is measured in CSS pixels, but the actual char
    // size on the canvas can differ.
    this.dimensions.css.cell.height = this.dimensions.device.cell.height / this._devicePixelRatio;
    this.dimensions.css.cell.width = this.dimensions.device.cell.width / this._devicePixelRatio;
  }
}

