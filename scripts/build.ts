// Writes the package's stylesheets to dist/. `just build` runs it.

import { mkdir } from "node:fs/promises";
import { renderFonts, renderTheme, renderVariables } from "../src/css.ts";

const dist = new URL("../dist/", import.meta.url);
await mkdir(dist, { recursive: true });
await Promise.all([
  Bun.write(new URL("variables.css", dist), renderVariables()),
  Bun.write(new URL("theme.css", dist), renderTheme()),
  Bun.write(new URL("fonts.css", dist), renderFonts()),
]);
