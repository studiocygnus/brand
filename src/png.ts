// PNG rendering and reading, for the site's downloads and the icons.

import { Resvg } from "@resvg/resvg-js";

/** `svg` drawn as a PNG `width` pixels wide. The SVGs have no text, so no fonts are needed. */
export const png = (svg: string, width: number): Uint8Array =>
  new Resvg(svg, { fitTo: { mode: "width", value: width } }).render().asPng();

/** Width and height from a PNG's IHDR chunk. */
export const pngSize = (data: Uint8Array): [number, number] => {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  return [view.getUint32(16), view.getUint32(20)];
};
