/**
 * Copyright (c) 2023 Donald Abrams. All rights reserved.
 * @license MIT
 */

import { ICharacterJoinerService, ICharSizeService, ICoreBrowserService, IRenderService, IThemeService } from 'browser/services/Services';
import { ITerminal } from 'browser/Types';
import { Disposable, toDisposable } from 'common/Lifecycle';
import { ICoreService, IDecorationService, IOptionsService } from 'common/services/Services';
import { ITerminalAddon, Terminal } from 'xterm';
import { SkiaRenderer } from './SkiaRenderer';
import { CanvasKitInit } from "./canvaskit";
import type { CanvasKit } from "canvaskit-wasm";

// TODO: preload fonts possible/needed? see https://github.com/chengluyu/canvaskit-editor/blob/main/src/index.ts

export class SkiaAddon extends Disposable implements ITerminalAddon {
  private _terminal?: Terminal;
  private _renderer?: SkiaRenderer;
  private _canvasKit?: CanvasKit;

  public activate(terminal: Terminal): void {
    const core = (terminal as any)._core as ITerminal;
    if (!terminal.element) {
      this.register(core.onWillOpen(() => this.activate(terminal)));
      return;
    }
    if (!this._canvasKit) {
      CanvasKitInit().then((canvasKit: CanvasKit) => {
        this._canvasKit = canvasKit;
        this.activate(terminal);
      })
      // TODO: what I can do with a caught error here?
      return;
    }

    this._terminal = terminal;
    this._renderer = this.register(new SkiaRenderer(
      terminal,
      this._canvasKit,
    ));

    const unsafeCore = core as any;
    const renderService: IRenderService = unsafeCore._renderService;
    renderService.setRenderer(this._renderer);

    this.register(toDisposable(() => {
      const renderService: IRenderService = (this._terminal as any)._core._renderService;
      renderService.setRenderer((this._terminal as any)._core._createRenderer());
      renderService.handleResize(terminal.cols, terminal.rows);
    }));
  }
}
