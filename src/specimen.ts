// Builds specimen.html: specimen/index.html with its slots filled from the tokens and logos,
// compiled against the built theme, and the CSS and fonts inlined so the page opens on its own.

import { readFile } from "node:fs/promises";
import path from "node:path";
import { compileCss } from "./tailwind.ts";
import { fontStylesheets, palette } from "./tokens.ts";

const root = path.resolve(import.meta.dir, "..");
const source = path.join(root, "specimen");

const logos = [
  "lockup-on-night",
  "lockup-on-paper",
  "wordmark-on-night",
  "wordmark-on-paper",
  "mark-on-night",
  "mark-on-paper",
] as const;

const swatch = ([name, hex]: [string, string]): string => `
          <figure class="flex flex-col gap-2">
            <div class="h-20 border border-rule bg-${name}"></div>
            <figcaption class="flex flex-col">
              <span class="font-semibold">${name}</span>
              <span class="type-label text-xs text-fg-muted">${hex}</span>
            </figcaption>
          </figure>`;

const logo = async (name: (typeof logos)[number]): Promise<string> => {
  const svg = await readFile(path.join(root, "logos", `${name}.svg`), "utf8");
  const ground = name.endsWith("night") ? "bg-night" : "bg-paper";
  const height = name.startsWith("mark") ? "h-28" : "h-14";
  return `
          <figure class="flex flex-col gap-2">
            <div class="flex h-48 items-center justify-center border border-rule ${ground}">
              ${svg.trim().replace("<svg ", `<svg class="${height} w-auto" `)}
            </div>
            <figcaption class="type-label text-xs text-fg-muted">logos/${name}.svg</figcaption>
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

/**
 * The finished page. By default the CSS comes from dist/, so build that first; `overrides` serves
 * dist's stylesheets from memory instead, by import path, as the tests do.
 */
export async function renderSpecimen(
  overrides: Record<string, string> = {},
): Promise<string> {
  const [page, css, pkg] = await Promise.all([
    readFile(path.join(source, "index.html"), "utf8"),
    readFile(path.join(source, "style.css"), "utf8"),
    Bun.file(path.join(root, "package.json")).json() as Promise<{
      version: string;
    }>,
  ]);
  const html = page
    .replace("<!-- sc:version -->", pkg.version)
    .replace(
      "<!-- sc:palette -->",
      Object.entries(palette).map(swatch).join(""),
    )
    .replace(
      "<!-- sc:logos -->",
      (await Promise.all(logos.map(logo))).join(""),
    );
  // Every word in a class attribute, as Tailwind's own scanner would find them.
  const candidates = [...html.matchAll(/class="([^"]*)"/g)].flatMap(
    ([, classes]) => classes?.split(/\s+/).filter(Boolean) ?? [],
  );
  const [styles, fonts] = await Promise.all([
    compileCss(css, source, [...new Set(candidates)], overrides),
    inlineFonts(),
  ]);
  return html.replace(
    "<!-- sc:style -->",
    `<style>\n${fonts}\n${styles}</style>`,
  );
}
