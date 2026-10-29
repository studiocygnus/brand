// Builds the brand kit site: site/index.html with its slots filled from the tokens, the logos,
// the social images and the icons, compiled against the built theme, with the CSS and fonts
// inlined; every logo and social image under downloads/, as SVG and as PNG; and dist/icons/ under
// icons/, which the page itself uses.

import { readFile } from "node:fs/promises";
import path from "node:path";
import { renderEmail } from "./email.ts";
import icons from "./icons.json" with { type: "json" };
import { renderHead, renderIcons, splashName } from "./icons.ts";
import { png } from "./png.ts";
import social from "./social.json" with { type: "json" };
import { compileCss } from "./tailwind.ts";
import { fontStylesheets, palette } from "./tokens.ts";

const root = path.resolve(import.meta.dir, "..");
const source = path.join(root, "site");

/** Where GitHub Pages serves the site. */
export const siteUrl = "https://studiocygnus.github.io/brand/";

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

const iconLink = (file: string, label: string): string =>
  `<a class="type-label inline-flex min-h-11 items-center border border-rule px-4 text-xs text-link hover:bg-surface" href="icons/${file}" download>${label}</a>`;

const tab = (ground: string, tabGround: string, text: string): string => `
            <div class="flex flex-col pt-2 pl-2 ${ground}">
              <div class="flex h-9 w-56 items-center gap-2 rounded-t-lg px-3 ${tabGround}">
                <img src="icons/favicon.ico" width="16" height="16" alt="" />
                <span class="text-xs ${text}">Studio Cygnus</span>
              </div>
            </div>`;

const iconsSection = (): string => {
  const files = [
    ["favicon.ico", "favicon.ico · 16, 32, 48"],
    ["favicon.svg", "favicon.svg"],
    ["apple-touch-icon.png", "apple-touch-icon.png · 180"],
    ["icon-192.png", "icon-192.png"],
    ["icon-512.png", "icon-512.png"],
    ["icon-maskable-192.png", "icon-maskable-192.png"],
    ["icon-maskable-512.png", "icon-maskable-512.png"],
    ["icon-monochrome.svg", "icon-monochrome.svg"],
    ["icon-monochrome-512.png", "icon-monochrome-512.png"],
    ["og.png", "og.png · 1200 × 630"],
    ["site.webmanifest", "site.webmanifest"],
    ["head.html", "head.html"],
  ];
  const splashes = icons.devices.flatMap((d) =>
    [false, true].map((landscape) => {
      const file = splashName(d, landscape);
      return `<li>${iconLink(file, `${file.slice("splash/".length, -".png".length)} · ${d.name}, ${landscape ? "landscape" : "portrait"}`)}</li>`;
    }),
  );
  return `
          <div class="grid gap-4 md:grid-cols-2">
            ${tab("bg-[#DEE1E6]", "bg-white", "text-[#1F1F1F]")}
            ${tab("bg-[#202124]", "bg-[#35363A]", "text-[#E8EAED]")}
          </div>
          <div class="flex flex-wrap items-end gap-8">
            <figure class="flex flex-col items-start gap-2">
              <div class="flex items-end gap-4">
                <img src="icons/favicon.svg" width="48" height="48" alt="" />
                <img src="icons/favicon.svg" width="32" height="32" alt="" />
                <img src="icons/favicon.ico" width="16" height="16" alt="" />
              </div>
              <figcaption class="type-label text-xs text-fg-muted">Favicon · 48 · 32 · 16</figcaption>
            </figure>
            <figure class="flex flex-col items-start gap-2">
              <img class="rounded-[22.5%]" src="icons/apple-touch-icon.png" width="90" height="90" alt="" />
              <figcaption class="type-label text-xs text-fg-muted">iPhone</figcaption>
            </figure>
            <figure class="flex flex-col items-start gap-2">
              <img class="rounded-full" src="icons/icon-maskable-192.png" width="90" height="90" alt="" />
              <figcaption class="type-label text-xs text-fg-muted">Android</figcaption>
            </figure>
            <figure class="flex flex-col items-start gap-2">
              <div class="flex size-[90px] items-center justify-center rounded-full bg-steel-ink">
                <img src="icons/icon-monochrome.svg" width="90" height="90" alt="" />
              </div>
              <figcaption class="type-label text-xs text-fg-muted">Android, themed</figcaption>
            </figure>
          </div>
          <div class="flex flex-wrap gap-2">
            ${files.map(([file, label]) => iconLink(file as string, label as string)).join("\n            ")}
          </div>
          <details class="flex flex-col gap-3">
            <summary class="type-label min-h-11 cursor-pointer text-xs text-fg-muted">iOS splash screens · ${splashes.length}</summary>
            <ul class="flex flex-wrap gap-2 pt-3">
              ${splashes.join("\n              ")}
            </ul>
          </details>`;
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
 * `iconFiles` is dist/icons/ as `renderIcons()` makes it, when the caller already has it.
 */
export async function renderSite(
  overrides: Record<string, string> = {},
  iconFiles?: Map<string, string | Uint8Array>,
): Promise<Map<string, string | Uint8Array>> {
  const [page, css, pkg, files, iconMap, email] = await Promise.all([
    readFile(path.join(source, "index.html"), "utf8"),
    readFile(path.join(source, "style.css"), "utf8"),
    Bun.file(path.join(root, "package.json")).json() as Promise<{
      version: string;
    }>,
    downloads(),
    iconFiles ?? renderIcons(),
    renderEmail(siteUrl),
  ]);
  const head = renderHead("icons/", {
    title: "Studio Cygnus brand kit",
    description:
      "The Studio Cygnus brand: colours, type, logos, the avatar, banners and icons.",
    url: siteUrl,
    iconsUrl: `${siteUrl}icons/`,
  });
  const html = page
    .replace("<!-- sc:head -->", head)
    .replace("<!-- sc:icons -->", iconsSection())
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
  for (const [file, contents] of iconMap) site.set(`icons/${file}`, contents);
  // The signature's files, at the fixed addresses sent mail loads them from.
  for (const [file, contents] of email) site.set(`email/${file}`, contents);
  return site;
}
