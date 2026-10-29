import { beforeAll, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { renderTheme, renderVariables } from "./css.ts";
import { pngSize } from "./png.ts";
import { logoScale, logos, renderSite, viewBoxWidth } from "./site.ts";
import social from "./social.json" with { type: "json" };
import { palette } from "./tokens.ts";

// dist/ may not be built yet (CI runs the tests first), so serve its stylesheets from memory.
let site = new Map<string, string | Uint8Array>();
let page = "";
beforeAll(async () => {
  site = await renderSite({
    "../dist/theme.css": renderTheme(),
    "./variables.css": renderVariables(),
  });
  page = site.get("index.html") as string;
  // Drawing the icons' splash screens takes seconds.
}, 60_000);

test("the three fonts are inlined, latin and latin-ext only", () => {
  for (const family of [
    "Bricolage Grotesque",
    "Schibsted Grotesk",
    "Martian Mono",
  ]) {
    expect(page).toContain(`font-family: '${family} Variable'`);
  }
  expect(page).toContain("data:font/woff2;base64,");
  expect(page).not.toContain("url(./files/");
  expect(page).not.toMatch(/vietnamese|cyrillic|greek/);
});

test("the page fetches nothing from another site", () => {
  // Anything that would fetch from elsewhere: stylesheets, scripts, and url() or src/href
  // pointing off the site. The icons' <link>s point into the site's own icons/.
  const fetches = page.match(
    /<link\b[^>]*rel="stylesheet"[^>]*>|<link\b[^>]*href="(?!icons\/)[^"]*"[^>]*>|<script\s+src[^>]*>|url\((?!data:)[^)]*\)|(?:src|href)="(?:https?:)?\/\/[^"]*"/g,
  );
  expect(fetches).toBeNull();
  expect(page).not.toContain("<!-- sc:");
});

test("the CSS covers the theme's utilities the page uses", () => {
  for (const selector of [
    ".bg-ground",
    ".type-heading",
    ".bg-dot-grid",
    ".text-accent-fg",
    ".bg-marigold",
    ".border-marigold",
  ]) {
    expect(page).toContain(`${selector} {`);
  }
});

test("every palette colour and every logo is on the page", () => {
  for (const hex of Object.values(palette)) expect(page).toContain(hex);
  expect(page.match(/<svg class=/g)?.length).toBe(logos.length);
});

test("every file the page links or shows is built, and every file built is linked", () => {
  const used = new Set(
    [...page.matchAll(/(?:href|src)="((?:downloads|icons)\/[^"]+)"/g)].map(
      ([, file]) => file,
    ),
  );
  for (const file of used) expect(site.has(file as string)).toBe(true);
  // email/ is for mail, not the page.
  const files = [...site.keys()].filter(
    (file) => file !== "index.html" && !file.startsWith("email/"),
  );
  expect(files.filter((file) => file.startsWith("downloads/")).length).toBe(
    2 * (logos.length + 1 + social.banners.length),
  );
  for (const file of files) expect(used.has(file)).toBe(true);
});

test("the social PNGs are the size each platform asks for", () => {
  expect(
    pngSize(site.get("downloads/social/avatar.png") as Uint8Array),
  ).toEqual([social.avatar.width, social.avatar.height]);
  for (const b of social.banners) {
    expect(
      pngSize(site.get(`downloads/social/banner-${b.name}.png`) as Uint8Array),
    ).toEqual([b.width, b.height]);
  }
});

test("the logo PNGs are drawn at four times their SVG size", () => {
  for (const name of logos) {
    const svg = site.get(`downloads/logos/${name}.svg`) as string;
    const [width] = pngSize(
      site.get(`downloads/logos/${name}.png`) as Uint8Array,
    );
    expect(width).toBe(Math.round(viewBoxWidth(svg) * logoScale));
  }
});

test("the social SVGs match src/social.json and are drawn without fonts", async () => {
  const images = [
    { name: "avatar", ...social.avatar },
    ...social.banners.map((b) => ({ ...b, name: `banner-${b.name}` })),
  ];
  for (const { name, width, height } of images) {
    const svg = await readFile(
      path.join(import.meta.dir, "../social", `${name}.svg`),
      "utf8",
    );
    expect(svg).toContain(`viewBox="0 0 ${width} ${height}"`);
    expect(svg).not.toContain("<text");
  }
});
