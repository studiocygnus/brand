// The brand's values. Everything the package ships as CSS is generated from this file by
// scripts/build.ts; the reasons behind each value are in the brand book.

/** The named colours. Night and ink are the same colour under the name each theme uses. */
export const palette = {
  night: "#0B0E1A",
  deep: "#141A2E",
  orbit: "#26304D",
  starlight: "#E9ECF5",
  haze: "#8A93AD",
  marigold: "#E88E11",
  steel: "#789AB9",
  paper: "#F3F4F7",
  ink: "#0B0E1A",
  graphite: "#4F5870",
  "marigold-ink": "#9A5700",
  "steel-ink": "#456A8E",
  "steel-paper": "#5D7FA3",
} as const;

export type Role =
  | "ground"
  | "surface"
  | "rule"
  | "dot"
  | "fg"
  | "fg-muted"
  | "accent"
  | "on-accent"
  | "accent-fg"
  | "link"
  | "companion";

export type Theme = Record<Role, string>;

/** Dark is the default theme: the night sky. */
export const dark: Theme = {
  ground: palette.night,
  surface: palette.deep,
  rule: palette.orbit,
  dot: "#1A2138",
  fg: palette.starlight,
  "fg-muted": palette.haze,
  accent: palette.marigold,
  "on-accent": palette.night,
  "accent-fg": palette.marigold,
  link: palette.steel,
  companion: palette.steel,
};

/** Paper. Marigold and steel are too light for text on it, so text uses their ink versions. */
export const light: Theme = {
  ground: palette.paper,
  surface: "#E8EAF0",
  rule: "#D5D9E3",
  dot: "#DADDE6",
  fg: palette.ink,
  "fg-muted": palette.graphite,
  accent: palette.marigold,
  "on-accent": palette.ink,
  "accent-fg": palette["marigold-ink"],
  link: palette["steel-ink"],
  companion: palette["steel-paper"],
};

/** Text roles and the grounds they sit on; each pair must meet WCAG AA (4.5:1) in both themes. */
export const textPairs: readonly (readonly [text: Role, ground: Role])[] = [
  ["fg", "ground"],
  ["fg", "surface"],
  ["fg-muted", "ground"],
  ["fg-muted", "surface"],
  ["accent-fg", "ground"],
  ["accent-fg", "surface"],
  ["link", "ground"],
  ["link", "surface"],
  ["on-accent", "accent"],
];

export const fonts = {
  display:
    "'Bricolage Grotesque Variable', 'Bricolage Grotesque', 'Arial Narrow', sans-serif",
  body: "'Schibsted Grotesk Variable', 'Schibsted Grotesk', ui-sans-serif, system-ui, sans-serif",
  mono: "'Martian Mono Variable', 'Martian Mono', ui-monospace, monospace",
} as const;

/** The @fontsource-variable stylesheets that load the fonts, with every axis the type roles use. */
export const fontStylesheets = [
  "@fontsource-variable/bricolage-grotesque/standard.css",
  "@fontsource-variable/schibsted-grotesk/index.css",
  "@fontsource-variable/schibsted-grotesk/wght-italic.css",
  "@fontsource-variable/martian-mono/standard.css",
] as const;

export interface TypeRole {
  family: keyof typeof fonts;
  weight: number;
  variation?: string;
  transform?: "uppercase";
  tracking?: string;
  leading: string;
}

export const typeRoles = {
  // Bricolage's narrowest width, extra bold, in capitals: the loud side.
  heading: {
    family: "display",
    weight: 800,
    variation: "'wdth' 75, 'opsz' 96",
    transform: "uppercase",
    leading: "0.95",
  },
  // Bricolage's regular width, bold, tight: the relaxed side. For setting the name in text;
  // the logo files are the wordmark itself.
  wordmark: {
    family: "display",
    weight: 700,
    variation: "'wdth' 100, 'opsz' 96",
    tracking: "-0.045em",
    leading: "1",
  },
  label: {
    family: "mono",
    weight: 400,
    transform: "uppercase",
    tracking: "0.1em",
    leading: "1.4",
  },
} as const satisfies Record<string, TypeRole>;

/** The dot-grid texture: one dot of the `dot` colour every 16px. */
export const dotGrid = { size: "16px", dot: "1px", fade: "1.4px" } as const;
