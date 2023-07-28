import type { CanvasKit } from "canvaskit-wasm";
import * as all from "canvaskit-wasm";

const initialize = all.default;

export function CanvasKitInit(): Promise<CanvasKit> {
  return initialize({ locateFile: () => "canvaskit.wasm" });
}