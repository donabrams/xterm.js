import type { CanvasKit } from "canvaskit-wasm";
import initialize from "canvaskit-wasm";
import * as all from "canvaskit-wasm";

type P = typeof initialize;
const typedInit: P = all as any;

export function CanvasKitInit(): Promise<CanvasKit> {
  return typedInit({ locateFile: (file) => {
    // TODO: I'd love to return a blob here instead and inline it 
    // rather than needing another HTTP call, even for the demo
    return "dist/" + file;
  }});
}