// Compiles a stylesheet with Tailwind CSS v4 for a known list of class names.

import { readFile } from "node:fs/promises";
import path from "node:path";
import { compile } from "tailwindcss";

/**
 * Compiles `css`, resolving its imports from `base`, and returns the CSS for `candidates`.
 * `overrides` serves stylesheets from memory by import path instead of reading them from disk.
 */
export async function compileCss(
  css: string,
  base: string,
  candidates: string[],
  overrides: Record<string, string> = {},
): Promise<string> {
  const compiler = await compile(css, {
    base,
    loadStylesheet: async (id, from) => {
      const content = overrides[id];
      if (content !== undefined) return { path: id, base: from, content };
      const file =
        id === "tailwindcss"
          ? Bun.resolveSync("tailwindcss/index.css", from)
          : path.resolve(from, id);
      return {
        path: file,
        base: path.dirname(file),
        content: await readFile(file, "utf8"),
      };
    },
  });
  return compiler.build(candidates);
}
