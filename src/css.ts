// Turns the tokens into the three stylesheets the package ships.

import {
  dark,
  dotGrid,
  fonts,
  fontStylesheets,
  light,
  palette,
  typeRoles,
  type Theme,
  type TypeRole,
} from "./tokens.ts";

const header =
  "/* Generated from src/tokens.ts by scripts/build.ts. Don't edit. */\n";

const declarations = (vars: Record<string, string>, indent: string): string =>
  Object.entries(vars)
    .map(([name, value]) => `${indent}--sc-${name}: ${value};`)
    .join("\n");

const roles = (
  theme: Theme,
  scheme: "dark" | "light",
  indent: string,
): string =>
  `${indent}color-scheme: ${scheme};\n${declarations(theme, indent)}`;

const typeVars = (name: string, role: TypeRole): Record<string, string> => ({
  [`${name}-family`]: `var(--sc-font-${role.family})`,
  [`${name}-weight`]: String(role.weight),
  [`${name}-variation`]: role.variation ?? "normal",
  [`${name}-transform`]: role.transform ?? "none",
  [`${name}-tracking`]: role.tracking ?? "normal",
  [`${name}-leading`]: role.leading,
});

/**
 * Plain CSS variables, `--sc-*`, for any stylesheet. Dark applies by default; `data-theme="light"`
 * on any element switches it and its children to paper, and `data-theme="system"` follows the OS.
 */
export function renderVariables(): string {
  const constants = {
    ...palette,
    "font-display": fonts.display,
    "font-body": fonts.body,
    "font-mono": fonts.mono,
    ...Object.fromEntries(
      Object.entries(typeRoles).flatMap(([name, role]) =>
        Object.entries(typeVars(name, role)),
      ),
    ),
  };
  return `${header}
:root {
${declarations(constants, "  ")}
}

:root,
[data-theme="dark"] {
${roles(dark, "dark", "  ")}
}

[data-theme="light"] {
${roles(light, "light", "  ")}
}

@media (prefers-color-scheme: light) {
  [data-theme="system"] {
${roles(light, "light", "    ")}
  }
}
`;
}

const utility = (name: string): string => `@utility type-${name} {
  font-family: var(--sc-${name}-family);
  font-weight: var(--sc-${name}-weight);
  font-variation-settings: var(--sc-${name}-variation);
  text-transform: var(--sc-${name}-transform);
  letter-spacing: var(--sc-${name}-tracking);
  line-height: var(--sc-${name}-leading);
}`;

/**
 * The Tailwind v4 theme. `inline` makes utilities read the `--sc-*` variables where they are used,
 * so `data-theme` switches them on any element.
 */
export function renderTheme(): string {
  const colours = [...Object.keys(palette), ...Object.keys(dark)]
    .map((name) => `  --color-${name}: var(--sc-${name});`)
    .join("\n");
  return `${header}
@import "./variables.css";

@theme inline {
${colours}
  --font-display: var(--sc-font-display);
  --font-sans: var(--sc-font-body);
  --font-mono: var(--sc-font-mono);
}

${Object.keys(typeRoles).map(utility).join("\n\n")}

@utility bg-dot-grid {
  background-image: radial-gradient(var(--sc-dot) ${dotGrid.dot}, transparent ${dotGrid.fade});
  background-size: ${dotGrid.size} ${dotGrid.size};
}
`;
}

/** Loads the three fonts from the @fontsource-variable packages, served with the site. */
export function renderFonts(): string {
  return `${header}
${fontStylesheets.map((sheet) => `@import "${sheet}";`).join("\n")}
`;
}
