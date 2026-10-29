import { beforeAll, expect, test } from "bun:test";
import company from "./company.json" with { type: "json" };
import { band, renderEmail } from "./email.ts";
import { pngSize } from "./png.ts";
import { siteUrl } from "./site.ts";

let files = new Map<string, string | Uint8Array>();
let html = "";
beforeAll(async () => {
  files = await renderEmail(siteUrl);
  html = files.get("signature.html") as string;
});

test("the band is drawn at twice its size in mail", () => {
  expect(pngSize(files.get("band.png") as Uint8Array)).toEqual([
    band.width * band.scale,
    band.height * band.scale,
  ]);
});

test("the signature is what mail clients keep: inline styles, no stylesheet or script", () => {
  expect(html).not.toMatch(/<style|class=|<script|<link/);
});

test("the notice and legal name come from the company facts", () => {
  expect(html).toContain(`${company.notice.en} ${company.legalName}`);
});

test("only name, title and email are left to fill in", () => {
  expect(new Set(html.match(/\{[a-z]+\}/g))).toEqual(
    new Set(["{name}", "{title}", "{email}"]),
  );
});

test("the band loads from the brand kit at its fixed address", () => {
  expect(html).toContain(`src="${siteUrl}email/band.png"`);
  expect(html).toContain(`width="${band.width}"`);
  expect(html).toContain(`height="${band.height}"`);
  expect(html).toContain('alt="Studio Cygnus"');
});
