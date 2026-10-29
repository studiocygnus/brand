// Builds the email signature: the template in email/ with the band's address and the company's
// notice put in, and the band drawn as a PNG at twice the size it shows in mail.

import { readFile } from "node:fs/promises";
import path from "node:path";
import company from "./company.json" with { type: "json" };
import { png } from "./png.ts";

const root = path.resolve(import.meta.dir, "..");

/** The band is 440 by 60 in mail, drawn at twice that. */
export const band = { width: 440, height: 60, scale: 2 };

/**
 * `signature.html` and `band.png`, for serving under `email/` at `base`. Sent mail keeps loading
 * the band from that address, so it must not change.
 */
export async function renderEmail(
  base: string,
): Promise<Map<string, string | Uint8Array>> {
  const [template, svg] = await Promise.all([
    readFile(path.join(root, "email", "signature.template.html"), "utf8"),
    readFile(path.join(root, "email", "band.svg"), "utf8"),
  ]);
  // The template's opening comment is for this repo, not for every email sent.
  const html = template
    .replace(/^<!--[\s\S]*?-->\s*/, "")
    .replace("{band}", `${base}email/band.png`)
    .replace("{notice}", company.notice.en)
    .replace("{legalName}", company.legalName);
  return new Map<string, string | Uint8Array>([
    ["signature.html", html],
    ["band.png", png(svg, band.width * band.scale)],
  ]);
}
