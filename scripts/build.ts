// Writes the package's stylesheets to dist/, then the brand kit site, built from them, to _site/.
// `just build` runs it.

import { mkdir, rm } from "node:fs/promises";
import { renderFonts, renderTheme, renderVariables } from "../src/css.ts";
import { renderSite } from "../src/site.ts";

const dist = new URL("../dist/", import.meta.url);
await mkdir(dist, { recursive: true });
await Promise.all([
  Bun.write(new URL("variables.css", dist), renderVariables()),
  Bun.write(new URL("theme.css", dist), renderTheme()),
  Bun.write(new URL("fonts.css", dist), renderFonts()),
]);

const site = new URL("../_site/", import.meta.url);
await rm(site, { recursive: true, force: true });
const files = await renderSite();
await Promise.all(
  [...files].map(([file, contents]) =>
    Bun.write(new URL(file, site), contents),
  ),
);
