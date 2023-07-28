## xterm-addon-webgl

An addon for [xterm.js](https://github.com/xtermjs/xterm.js) that enables a skia-based renderer. Skia can be configured to use webgl or webgpu. This addon requires xterm.js v4+.

### Install

```bash
npm install --save xterm-addon-skia
```

### Usage

```ts
import { Terminal } from 'xterm';
import { SkiaAddon } from 'xterm-addon-skia';

const terminal = new Terminal();
terminal.open(element);
terminal.loadAddon(new SkiaAddon());
```

See the full [API](https://github.com/donabrams/xterm.js/blob/master/addons/xterm-addon-skia/typings/xterm-addon-skia.d.ts) for more advanced usage.


### See also

- [xterm-addon-webgl](https://www.npmjs.com/package/xterm-addon-webgl) A renderer for xterm.js that uses webGL
- [xterm-addon-canvas](https://www.npmjs.com/package/xterm-addon-canvas) A renderer for xterm.js that uses a 2d canvas that can be used as a fallback when WebGL is not available
