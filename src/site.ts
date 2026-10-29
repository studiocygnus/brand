// Builds the brand kit site: site/index.html with its slots filled from the tokens, the logos and
// the social images, compiled against the built theme, with the CSS and fonts inlined; and every
// logo and social image under downloads/, as SVG and as PNG.

import { readFile } from "node:fs/promises";
import path from "node:path";
import { Resvg } from "@resvg/resvg-js";
import social from "./social.json" with { type: "json" };
import { compileCss } from "./tailwind.ts";
import { fontStylesheets, palette } from "./tokens.ts";

const root = path.resolve(import.meta.dir, "..");
const source = path.join(root, "site");

export const logos = [
  "lockup-on-night",
  "lockup-on-paper",
  "wordmark-on-night",
  "wordmark-on-paper",
  "mark-on-night",
  "mark-on-paper",
] as const;

/** Logo PNGs are drawn at this many pixels per SVG unit. */
export const logoScale = 4;

type Rect = [number, number, number, number];
type Banner = (typeof social.banners)[number] & {
  avatar?: { rect: number[]; shape: string };
};

const swatch = ([name, hex]: [string, string]): string => `
          <figure class="flex flex-col gap-2">
            <div class="h-20 border border-rule bg-${name}"></div>
            <figcaption class="flex flex-col">
              <span class="font-semibold">${name}</span>
              <span class="type-label text-xs text-fg-muted">${hex}</span>
            </figcaption>
          </figure>`;

const downloadLink = (file: string, label: string): string =>
  `<a class="type-label inline-flex min-h-11 items-center border border-rule px-4 text-xs text-link hover:bg-surface" href="downloads/${file}" download>${label}</a>`;

const logo = (name: (typeof logos)[number], svg: string): string => {
  const ground = name.endsWith("night") ? "bg-night" : "bg-paper";
  const height = name.startsWith("mark") ? "h-28" : "h-14";
  return `
          <figure class="flex flex-col gap-2">
            <div class="flex h-48 items-center justify-center border border-rule ${ground}">
              ${svg.trim().replace("<svg ", `<svg class="${height} w-auto" `)}
            </div>
            <figcaption class="flex flex-wrap items-center justify-between gap-3">
              <span class="type-label text-xs text-fg-muted">${name}</span>
              <span class="flex gap-2">
                ${downloadLink(`logos/${name}.svg`, "SVG")}
                ${downloadLink(`logos/${name}.png`, "PNG")}
              </span>
            </figcaption>
          </figure>`;
};

const avatar = (): string => {
  const { width, height } = social.avatar;
  const img = (size: number) =>
    `<img class="rounded-full" src="downloads/social/avatar.svg" width="${size}" height="${size}" alt="" />`;
  return `
          <div class="flex flex-wrap items-end gap-6">
            <img class="rounded-full" src="downloads/social/avatar.svg" width="240" height="240" alt="The avatar: the Northern Cross on night, in its circle crop" />
            <div class="flex items-end gap-4 bg-paper p-4">${[96, 48, 32].map(img).join("")}</div>
            <div class="flex items-end gap-4 bg-night p-4">${[96, 48, 32].map(img).join("")}</div>
          </div>
          <div class="flex flex-wrap items-center gap-3">
            <span class="type-label text-xs text-fg-muted">avatar · ${width} × ${height}</span>
            ${downloadLink("social/avatar.png", "PNG")}
            ${downloadLink("social/avatar.svg", "SVG")}
          </div>`;
};

/** A box over the banner at `rect`, in percent of its size so it scales with the preview. */
const overlay = (
  b: Banner,
  [x, y, w, h]: Rect,
  classes: string,
  label: string,
): string => {
  const pct = (n: number, of: number) => `${((n / of) * 100).toFixed(3)}%`;
  return `
              <div data-guide class="absolute ${classes}" style="left: ${pct(x, b.width)}; top: ${pct(y, b.height)}; width: ${pct(w, b.width)}; height: ${pct(h, b.height)}">
                <span class="type-label absolute top-1 left-1 bg-night px-1.5 py-0.5 text-[10px] text-marigold">${label}</span>
              </div>`;
};

const banner = (b: Banner): string => {
  const guides = b.guides
    .map((g) =>
      overlay(
        b,
        g.rect as Rect,
        "border-2 border-dashed border-marigold",
        g.label,
      ),
    )
    .join("");
  const shape = b.avatar?.shape === "square" ? "rounded-lg" : "rounded-full";
  const cover = b.avatar
    ? overlay(
        b,
        b.avatar.rect as Rect,
        `${shape} border-2 border-dashed border-starlight`,
        "Avatar",
      )
    : "";
  return `
          <figure class="flex flex-col gap-3">
            <div class="relative overflow-hidden border border-rule">
              <img class="block h-auto w-full" src="downloads/social/banner-${b.name}.svg" width="${b.width}" height="${b.height}" alt="" />${guides}${cover}
            </div>
            <figcaption class="flex flex-wrap items-center justify-between gap-3">
              <span class="type-label text-xs text-fg-muted">${b.label} · ${b.width} × ${b.height}</span>
              <span class="flex gap-2">
                ${downloadLink(`social/banner-${b.name}.png`, "PNG")}
                ${downloadLink(`social/banner-${b.name}.svg`, "SVG")}
              </span>
            </figcaption>
          </figure>`;
};

/**
 * The @font-face rules fonts.css loads, for the latin and latin-ext subsets only (what Spanish and
 * Romanian need), with each font file inlined as a data URI.
 */
async function inlineFonts(): Promise<string> {
  const rules: string[] = [];
  for (const sheet of fontStylesheets) {
    const file = Bun.resolveSync(sheet, root);
    const css = await readFile(file, "utf8");
    for (const [rule] of css.matchAll(/@font-face\s*\{[^}]*\}/g)) {
      const font = /url\(\.\/files\/([^)]+)\)/.exec(rule)?.[1];
      if (font === undefined || !font.includes("-latin-")) continue;
      const data = await readFile(path.join(path.dirname(file), "files", font));
      rules.push(
        rule.replace(
          `./files/${font}`,
          `data:font/woff2;base64,${data.toString("base64")}`,
        ),
      );
    }
  }
  return rules.join("\n");
}

const png = (svg: string, width: number): Uint8Array =>
  new Resvg(svg, { fitTo: { mode: "width", value: width } }).render().asPng();

/** The width of an SVG's viewBox. */
export const viewBoxWidth = (svg: string): number =>
  Number(/viewBox="[\d.]+ [\d.]+ ([\d.]+) [\d.]+"/.exec(svg)?.[1]);

/** Every logo and social image, as SVG and PNG, keyed by their path under downloads/. */
async function downloads(): Promise<Map<string, string | Uint8Array>> {
  const files = new Map<string, string | Uint8Array>();
  for (const name of logos) {
    const svg = await readFile(path.join(root, "logos", `${name}.svg`), "utf8");
    files.set(`logos/${name}.svg`, svg);
    files.set(
      `logos/${name}.png`,
      png(svg, Math.round(viewBoxWidth(svg) * logoScale)),
    );
  }
  const images = [
    { name: "avatar", width: social.avatar.width },
    ...social.banners.map((b) => ({
      name: `banner-${b.name}`,
      width: b.width,
    })),
  ];
  for (const { name, width } of images) {
    const svg = await readFile(
      path.join(root, "social", `${name}.svg`),
      "utf8",
    );
    files.set(`social/${name}.svg`, svg);
    files.set(`social/${name}.png`, png(svg, width));
  }
  return files;
}

/**
 * The finished site, keyed by path. By default the CSS comes from dist/, so build that first;
 * `overrides` serves dist's stylesheets from memory instead, by import path, as the tests do.
 */
export async function renderSite(
  overrides: Record<string, string> = {},
): Promise<Map<string, string | Uint8Array>> {
  const [page, css, pkg, files] = await Promise.all([
    readFile(path.join(source, "index.html"), "utf8"),
    readFile(path.join(source, "style.css"), "utf8"),
    Bun.file(path.join(root, "package.json")).json() as Promise<{
      version: string;
    }>,
    downloads(),
  ]);
  const html = page
    .replace("<!-- sc:version -->", pkg.version)
    .replace(
      "<!-- sc:palette -->",
      Object.entries(palette).map(swatch).join(""),
    )
    .replace(
      "<!-- sc:logos -->",
      logos
        .map((name) => logo(name, files.get(`logos/${name}.svg`) as string))
        .join(""),
    )
    .replace("<!-- sc:avatar -->", avatar())
    .replace("<!-- sc:banners -->", social.banners.map(banner).join(""));
  // Every word in a class attribute, as Tailwind's own scanner would find them.
  const candidates = [...html.matchAll(/class="([^"]*)"/g)].flatMap(
    ([, classes]) => classes?.split(/\s+/).filter(Boolean) ?? [],
  );
  const [styles, fonts] = await Promise.all([
    compileCss(css, source, [...new Set(candidates)], overrides),
    inlineFonts(),
  ]);
  const site = new Map<string, string | Uint8Array>([
    [
      "index.html",
      html.replace("<!-- sc:style -->", `<style>\n${fonts}\n${styles}</style>`),
    ],
  ]);
  for (const [file, contents] of files) site.set(`downloads/${file}`, contents);
  return site;
}
