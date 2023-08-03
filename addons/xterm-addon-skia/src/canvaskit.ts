import type { CanvasKit } from "canvaskit-wasm";
import initialize from "canvaskit-wasm";
// TODO: use production not profiling build
import * as all from "canvaskit-wasm/bin/profiling/canvaskit.js";

type P = typeof initialize;
const typedInit: P = all as any;

export function CanvasKitInit(): Promise<CanvasKit> {
  return typedInit({ locateFile: (file) => {
    // TODO: I'd love to return a blob here instead and inline it 
    // rather than needing another HTTP call, even for the demo
    return "dist/" + file;
  }});
}