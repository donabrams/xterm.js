/**
 * Copyright (c) 2023 Donald Abrams. All rights reserved.
 * @license MIT
 */

import { Terminal, ITerminalAddon } from 'xterm';

declare module 'xterm-addon-skia' {
  /**
   * An xterm.js addon that provides a skia renderer
   */
  export class SkiaAddon implements ITerminalAddon {

    constructor();

    /**
     * Activates the addon.
     * @param terminal The terminal the addon is being loaded in.
     */
    public activate(terminal: Terminal): void;

    /**
     * Disposes the addon.
     */
    public dispose(): void;

  }
}
