/**
 * Copyright (c) 2023 Donald Abrams. All rights reserved.
 * @license MIT
 */

import { ICharacterJoinerService, ICharSizeService, ICoreBrowserService, IRenderService, IThemeService } from 'browser/services/Services';
import { ITerminal } from 'browser/Types';
import { Disposable, toDisposable } from 'common/Lifecycle';
import { IBufferService, ICoreService, IDecorationService, IOptionsService } from 'common/services/Services';
import { ITerminalAddon, Terminal } from 'xterm';
import { SkiaRenderer } from './SkiaRenderer';
import { CanvasKitInit } from "./canvaskit";
import type { CanvasKit, FontMgr, Typeface } from "canvaskit-wasm";

// TODO: preload fonts possible/needed? see https://github.com/chengluyu/canvaskit-editor/blob/main/src/index.ts
//export const fontUrl = "https://fonts.gstatic.com/s/firacode/v21/uU9eCBsR6Z2vfE9aq3bL0fxyUs4tcw4W_D1sJVD7NuzlojwUKQ.woff2"
//export const fontName = "Fira Code Light"

export const fontUrl = "/dist/ErbosDraco.ttf"
export const fontName = "Erbos Draco 1st Open NBD"

export class SkiaAddon extends Disposable implements ITerminalAddon {
  private _terminal?: Terminal;
  private _renderer?: SkiaRenderer;
  private _canvasKit?: CanvasKit;
  private _typeface?: Typeface;
  private _fontMgr?: FontMgr;

  public activate(terminal: Terminal): void {
    const core = (terminal as any)._core as ITerminal;
    if (!terminal.element) {
      this.register(core.onWillOpen(() => this.activate(terminal)));
      return;
    }
    if (!this._canvasKit || !this._typeface || !this._fontMgr) {
      // TODO: wcandillon did the hard work, now wait for https://github.com/Shopify/react-native-skia/pull/1717/files
      // to merge, waiting on chrome release process (expected mid august)
      // will be ready when `FontMgr.matchFamilyStyle` is released on  https://skia.googlesource.com/skia/+/refs/heads/main/modules/canvaskit/CHANGELOG.md)
      const fontArrayBuffer: Promise<ArrayBuffer> = fetch(fontUrl).then((response) => response.arrayBuffer());
      const init: Promise<CanvasKit> = CanvasKitInit();
      Promise.all([init, fontArrayBuffer]).then(([canvasKit, fontArrayBuffer]: [CanvasKit, ArrayBuffer]) => {
        this._canvasKit = canvasKit;
        const fontArrayBufferCopy = fontArrayBuffer.slice(0);
        const typeface = canvasKit.Typeface.MakeFreeTypeFaceFromData(fontArrayBuffer)!;
        const fontMgr = canvasKit.FontMgr.FromData(fontArrayBufferCopy);
        if (!typeface || !fontMgr) {
          throw new Error("cannot create typeface (likely problem loading font)");
        }
        this._typeface = typeface;
        this._fontMgr = fontMgr;
        this.activate(terminal);
      })
      // TODO: what I can do with a caught error here?
      return;
    }

    // TODO: consider typing these and avoiding this `any`
    const unsafeCore = core as any;
    const coreBrowserService: ICoreBrowserService = unsafeCore._coreBrowserService;
    const charSizeService: ICharSizeService = unsafeCore._charSizeService;
    const renderService: IRenderService = unsafeCore._renderService;
    const optionsService: IOptionsService = core.optionsService;
    const bufferService: IBufferService = unsafeCore._bufferService;

    this._terminal = terminal;
    this._renderer = this.register(new SkiaRenderer(
      terminal,
      this._canvasKit,
      this._typeface,
      this._fontMgr,
      coreBrowserService,
      charSizeService,
      optionsService,
      bufferService,
      fontName,
    ));
    renderService.setRenderer(this._renderer);

    this.register(toDisposable(() => {
      const renderService: IRenderService = (this._terminal as any)._core._renderService;
      renderService.setRenderer((this._terminal as any)._core._createRenderer());
      renderService.handleResize(terminal.cols, terminal.rows);
    }));
  }
}
