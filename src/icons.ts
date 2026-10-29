// Builds dist/icons/: the favicon, the app icons, the iOS splash screens, the web manifest and a
// <head> snippet that wires them up, all from the sources `just logos` draws in icons/.

import { readFile } from "node:fs/promises";
import path from "node:path";
import icons from "./icons.json" with { type: "json" };
import { png, pngSize } from "./png.ts";
import social from "./social.json" with { type: "json" };
import { dark, light, palette } from "./tokens.ts";

const root = path.resolve(import.meta.dir, "..");

export type Device = (typeof icons.devices)[number];

/** The splash screen's file name, in pixels, for one orientation of a device. */
export const splashName = (d: Device, landscape: boolean): string => {
  const [w, h] = [d.width * d.ratio, d.height * d.ratio];
  return landscape ? `splash/${h}x${w}.png` : `splash/${w}x${h}.png`;
};

/** The media query iOS matches a splash screen against. device-width and -height don't swap. */
export const splashMedia = (d: Device, landscape: boolean): string =>
  `(device-width: ${d.width}px) and (device-height: ${d.height}px) and (-webkit-device-pixel-ratio: ${d.ratio}) and (orientation: ${landscape ? "landscape" : "portrait"})`;

/** An ICO holding each PNG as is, which every browser since Internet Explorer 9 reads. */
export function ico(images: Uint8Array[]): Uint8Array {
  let offset = 6 + 16 * images.length;
  const out = new Uint8Array(offset + images.reduce((n, i) => n + i.length, 0));
  const view = new DataView(out.buffer);
  view.setUint16(2, 1, true); // type: icon
  view.setUint16(4, images.length, true);
  images.forEach((image, i) => {
    const [width, height] = pngSize(image);
    const entry = 6 + 16 * i;
    view.setUint8(entry, width >= 256 ? 0 : width);
    view.setUint8(entry + 1, height >= 256 ? 0 : height);
    view.setUint16(entry + 4, 1, true); // colour planes
    view.setUint16(entry + 6, 32, true); // bits per pixel
    view.setUint32(entry + 8, image.length, true);
    view.setUint32(entry + 12, offset, true);
    out.set(image, offset);
    offset += image.length;
  });
  return out;
}

/** Night with the mark centred at 28% of the short side, `width` by `height` px. */
const splash = (mark: string, width: number, height: number): string => {
  const size = 0.28 * Math.min(width, height);
  // The mark's own width and height give way to its place on the screen.
  const nested = mark.replace(
    /<svg ([^>]*?)width="[^"]*" height="[^"]*"/,
    `<svg $1x="${(width - size) / 2}" y="${(height - size) / 2}" width="${size}" height="${size}"`,
  );
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="${width}" height="${height}" fill="${palette.night}"/>${nested}</svg>`;
};

/**
 * The manifest. Its paths are relative to where it's served, so `icons/` can sit anywhere: at
 * `/icons/` the app starts at `/`. Members that describe an app's own pages (screenshots,
 * shortcuts, share_target, file and protocol handlers) are each app's to add.
 */
export const manifest = {
  name: "Studio Cygnus",
  short_name: "Cygnus",
  description: "Small tools that do one job well.",
  lang: "en",
  dir: "ltr",
  start_url: "../",
  scope: "../",
  display: "standalone",
  orientation: "any",
  background_color: palette.night,
  theme_color: palette.night,
  categories: ["business", "productivity"],
  launch_handler: { client_mode: ["navigate-existing", "auto"] },
  prefer_related_applications: false,
  icons: [
    { src: "favicon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    {
      src: "icon-192.png",
      sizes: "192x192",
      type: "image/png",
      purpose: "any",
    },
    {
      src: "icon-512.png",
      sizes: "512x512",
      type: "image/png",
      purpose: "any",
    },
    {
      src: "icon-maskable-192.png",
      sizes: "192x192",
      type: "image/png",
      purpose: "maskable",
    },
    {
      src: "icon-maskable-512.png",
      sizes: "512x512",
      type: "image/png",
      purpose: "maskable",
    },
    {
      src: "icon-monochrome.svg",
      sizes: "any",
      type: "image/svg+xml",
      purpose: "monochrome",
    },
    {
      src: "icon-monochrome-512.png",
      sizes: "512x512",
      type: "image/png",
      purpose: "monochrome",
    },
  ],
};

export interface Page {
  title: string;
  description: string;
  /** The page's own address. */
  url: string;
  /** Where icons/ is served, absolute, for the link preview image. */
  iconsUrl: string;
}

/** Every <head> tag for the icons, the manifest and link previews, with `icons/` at `base`. */
export function renderHead(base: string, page: Page): string {
  const splashes = icons.devices.flatMap((d) =>
    [false, true].map(
      (landscape) =>
        `<link rel="apple-touch-startup-image" href="${base}${splashName(d, landscape)}" media="${splashMedia(d, landscape)}" />`,
    ),
  );
  const og = social.banners.find((b) => b.name === "og");
  return [
    `<link rel="icon" href="${base}favicon.ico" sizes="32x32" />`,
    `<link rel="icon" href="${base}favicon.svg" type="image/svg+xml" />`,
    `<link rel="apple-touch-icon" href="${base}apple-touch-icon.png" />`,
    `<link rel="manifest" href="${base}site.webmanifest" />`,
    `<meta name="theme-color" content="${dark.ground}" media="(prefers-color-scheme: dark)" />`,
    `<meta name="theme-color" content="${light.ground}" media="(prefers-color-scheme: light)" />`,
    `<meta name="application-name" content="${manifest.name}" />`,
    `<meta name="mobile-web-app-capable" content="yes" />`,
    `<meta name="apple-mobile-web-app-capable" content="yes" />`,
    `<meta name="apple-mobile-web-app-title" content="${manifest.short_name}" />`,
    `<meta name="apple-mobile-web-app-status-bar-style" content="black" />`,
    ...splashes,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="${manifest.name}" />`,
    `<meta property="og:title" content="${page.title}" />`,
    `<meta property="og:description" content="${page.description}" />`,
    `<meta property="og:url" content="${page.url}" />`,
    `<meta property="og:image" content="${page.iconsUrl}og.png" />`,
    `<meta property="og:image:width" content="${og?.width}" />`,
    `<meta property="og:image:height" content="${og?.height}" />`,
    `<meta property="og:image:alt" content="The cygnus wordmark and the Northern Cross among stars" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
  ].join("\n");
}

let rendered: Promise<Map<string, string | Uint8Array>> | undefined;

/**
 * Everything in dist/icons/, keyed by its path there. Drawing the splash screens takes seconds,
 * so it's done once per process.
 */
export const renderIcons = (): Promise<Map<string, string | Uint8Array>> =>
  (rendered ??= drawIcons());

async function drawIcons(): Promise<Map<string, string | Uint8Array>> {
  const source = async (name: string) =>
    readFile(path.join(root, "icons", `${name}.svg`), "utf8");
  const [favicon, favicon16, touch, maskable, monochrome, mark, og] =
    await Promise.all([
      source("favicon"),
      source("favicon-16"),
      source("apple-touch-icon"),
      source("maskable"),
      source("monochrome"),
      source("splash-mark"),
      readFile(path.join(root, "social", "banner-og.svg"), "utf8"),
    ]);
  const files = new Map<string, string | Uint8Array>([
    ["favicon.svg", favicon],
    [
      "favicon.ico",
      ico([png(favicon16, 16), png(favicon, 32), png(favicon, 48)]),
    ],
    ["apple-touch-icon.png", png(touch, 180)],
    ["icon-192.png", png(favicon, 192)],
    ["icon-512.png", png(favicon, 512)],
    ["icon-maskable-192.png", png(maskable, 192)],
    ["icon-maskable-512.png", png(maskable, 512)],
    ["icon-monochrome.svg", monochrome],
    ["icon-monochrome-512.png", png(monochrome, 512)],
    ["og.png", png(og, 1200)],
    ["site.webmanifest", `${JSON.stringify(manifest, null, 2)}\n`],
    [
      "head.html",
      `<!-- @studiocygnus/brand icons: serve dist/icons/ at /icons/ and paste this into <head>.
     Fill in the bracketed values for each page. -->
${renderHead("/icons/", {
  title: "[PAGE TITLE]",
  description: "[PAGE DESCRIPTION]",
  url: "[PAGE URL]",
  iconsUrl: "[SITE URL]/icons/",
})}
`,
    ],
  ]);
  for (const d of icons.devices) {
    for (const landscape of [false, true]) {
      const [w, h] = [d.width * d.ratio, d.height * d.ratio];
      const [width, height] = landscape ? [h, w] : [w, h];
      files.set(
        splashName(d, landscape),
        png(splash(mark, width, height), width),
      );
    }
  }
  return files;
}
