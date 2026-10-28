import { expect, test } from "bun:test";
import { renderFonts, renderTheme, renderVariables } from "./css.ts";
import { compileCss } from "./tailwind.ts";
import { palette } from "./tokens.ts";

// Compile the theme the way a site would import it, with the stylesheets rendered in memory.
const tailwind = (candidates: string[]): Promise<string> =>
  compileCss(
    '@import "tailwindcss";\n@import "./theme.css";',
    import.meta.dir,
    candidates,
    { "./theme.css": renderTheme(), "./variables.css": renderVariables() },
  );

test("every colour becomes a Tailwind utility that reads the --sc variable", async () => {
  const css = await tailwind([
    "bg-ground",
    "text-fg",
    "text-accent-fg",
    "border-rule",
    "text-marigold-ink",
  ]);
  expect(css).toContain("background-color: var(--sc-ground)");
  expect(css).toContain("color: var(--sc-fg)");
  expect(css).toContain("color: var(--sc-accent-fg)");
  expect(css).toContain("border-color: var(--sc-rule)");
  expect(css).toContain("color: var(--sc-marigold-ink)");
});

test("the type roles and the dot grid are utilities", async () => {
  const css = await tailwind([
    "type-heading",
    "type-label",
    "bg-dot-grid",
    "font-display",
  ]);
  expect(css).toContain("font-variation-settings: var(--sc-heading-variation)");
  expect(css).toContain("letter-spacing: var(--sc-label-tracking)");
  expect(css).toContain("background-size: 16px 16px");
  expect(css).toContain("font-family: var(--sc-font-display)");
});

test("body text defaults to Schibsted Grotesk", async () => {
  expect(await tailwind([])).toContain(
    "--default-font-family: var(--sc-font-body)",
  );
});

test("the variables define every palette colour and switch roles by data-theme", () => {
  const css = renderVariables();
  for (const [name, hex] of Object.entries(palette))
    expect(css).toContain(`--sc-${name}: ${hex};`);
  expect(css).toContain(
    '[data-theme="light"] {\n  color-scheme: light;\n  --sc-ground: #F3F4F7;',
  );
  expect(css).toContain(
    '@media (prefers-color-scheme: light) {\n  [data-theme="system"]',
  );
});

test("fonts load from the @fontsource-variable packages that exist", async () => {
  const imports = [...renderFonts().matchAll(/@import "([^"]+)";/g)].map(
    (m) => m[1] ?? "",
  );
  expect(imports.length).toBe(4);
  for (const sheet of imports)
    expect(
      await Bun.file(Bun.resolveSync(sheet, import.meta.dir)).exists(),
    ).toBe(true);
});
