import { beforeAll, expect, test } from "bun:test";
import { renderTheme, renderVariables } from "./css.ts";
import { renderSpecimen } from "./specimen.ts";
import { palette } from "./tokens.ts";

// dist/ may not be built yet (CI runs the tests first), so serve its stylesheets from memory.
let page = "";
beforeAll(async () => {
  page = await renderSpecimen({
    "../dist/theme.css": renderTheme(),
    "./variables.css": renderVariables(),
  });
});

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

test("the page needs nothing outside itself", () => {
  // Anything that would fetch: stylesheets, scripts, and url() or src/href pointing off the page.
  const fetches = page.match(
    /<link\b[^>]*>|<script\s+src[^>]*>|url\((?!data:)[^)]*\)|(?:src|href)="https?:[^"]*"/g,
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
  ]) {
    expect(page).toContain(`${selector} {`);
  }
});

test("every palette colour and every logo is on the page", () => {
  for (const hex of Object.values(palette)) expect(page).toContain(hex);
  expect(page.match(/<svg class=/g)?.length).toBe(6);
});
