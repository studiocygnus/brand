// Writes the package's stylesheets and icons to dist/, then the brand kit site, built from them,
// to _site/. `just build` runs it.

import { mkdir, rm } from "node:fs/promises";
import { renderFonts, renderTheme, renderVariables } from "../src/css.ts";
import { renderIcons } from "../src/icons.ts";
import { renderSite } from "../src/site.ts";

const dist = new URL("../dist/", import.meta.url);
await mkdir(dist, { recursive: true });
await Promise.all([
  Bun.write(new URL("variables.css", dist), renderVariables()),
  Bun.write(new URL("theme.css", dist), renderTheme()),
  Bun.write(new URL("fonts.css", dist), renderFonts()),
]);

const icons = await renderIcons();
await rm(new URL("icons/", dist), { recursive: true, force: true });
await Promise.all(
  [...icons].map(([file, contents]) =>
    Bun.write(new URL(`icons/${file}`, dist), contents),
  ),
);

const site = new URL("../_site/", import.meta.url);
await rm(site, { recursive: true, force: true });
const files = await renderSite({}, icons);
await Promise.all(
  [...files].map(([file, contents]) =>
    Bun.write(new URL(file, site), contents),
  ),
);
