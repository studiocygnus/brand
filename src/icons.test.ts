import { beforeAll, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import path from "node:path";
import icons from "./icons.json" with { type: "json" };
import { manifest, renderIcons, splashMedia, splashName } from "./icons.ts";
import { pngSize } from "./png.ts";
import { palette } from "./tokens.ts";

let files = new Map<string, string | Uint8Array>();
let head = "";
beforeAll(async () => {
  files = await renderIcons();
  head = files.get("head.html") as string;
  // Drawing the splash screens takes seconds.
}, 60_000);

test("every file the manifest and head.html name is built, at the size they declare", () => {
  const shipped = JSON.parse(
    files.get("site.webmanifest") as string,
  ) as typeof manifest;
  for (const icon of shipped.icons) {
    const file = files.get(icon.src);
    expect(file).toBeDefined();
    if (icon.type === "image/png") {
      expect(pngSize(file as Uint8Array).join("x")).toBe(icon.sizes);
    } else {
      expect(icon.sizes).toBe("any");
    }
  }
  for (const [, file] of head.matchAll(/href="\/icons\/([^"]+)"/g)) {
    expect(files.has(file as string)).toBe(true);
  }
  expect(pngSize(files.get("apple-touch-icon.png") as Uint8Array)).toEqual([
    180, 180,
  ]);
  expect(pngSize(files.get("og.png") as Uint8Array)).toEqual([1200, 630]);
});

test("the manifest has every purpose and the brand's colours", () => {
  const shipped = JSON.parse(
    files.get("site.webmanifest") as string,
  ) as typeof manifest;
  expect(new Set(shipped.icons.map((i) => i.purpose))).toEqual(
    new Set(["any", "maskable", "monochrome"]),
  );
  for (const icon of shipped.icons) {
    expect(Object.keys(icon).sort()).toEqual([
      "purpose",
      "sizes",
      "src",
      "type",
    ]);
  }
  expect(shipped.theme_color).toBe(palette.night);
  expect(shipped.background_color).toBe(palette.night);
});

test("each splash screen matches its media query, in both orientations", () => {
  for (const d of icons.devices) {
    for (const landscape of [false, true]) {
      const file = splashName(d, landscape);
      const [w, h] = [d.width * d.ratio, d.height * d.ratio];
      expect(pngSize(files.get(file) as Uint8Array)).toEqual(
        landscape ? [h, w] : [w, h],
      );
      expect(head).toContain(
        `<link rel="apple-touch-startup-image" href="/icons/${file}" media="${splashMedia(d, landscape)}" />`,
      );
    }
  }
  const splashes = [...files.keys()].filter((f) => f.startsWith("splash/"));
  expect(splashes.length).toBe(2 * icons.devices.length);
});

test("favicon.ico holds PNGs at 16, 32 and 48", () => {
  const data = files.get("favicon.ico") as Uint8Array;
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  expect(view.getUint16(2, true)).toBe(1);
  expect(view.getUint16(4, true)).toBe(3);
  const sizes = [0, 1, 2].map((i) => {
    const entry = 6 + 16 * i;
    const length = view.getUint32(entry + 8, true);
    const offset = view.getUint32(entry + 12, true);
    const image = data.subarray(offset, offset + length);
    const [w, h] = pngSize(image);
    expect([view.getUint8(entry), view.getUint8(entry + 1)]).toEqual([w, h]);
    return w;
  });
  expect(sizes).toEqual([16, 32, 48]);
});

test("the icon sources are drawn without fonts", async () => {
  for (const name of [
    "favicon",
    "favicon-16",
    "apple-touch-icon",
    "maskable",
    "monochrome",
    "splash-mark",
  ]) {
    const svg = await readFile(
      path.join(import.meta.dir, "../icons", `${name}.svg`),
      "utf8",
    );
    expect(svg).not.toContain("<text");
  }
});
