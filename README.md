# @studiocygnus/brand

The Studio Cygnus brand as a package: the colours, fonts and type settings as a Tailwind v4 theme
and as plain CSS variables, plus the logo files. Studio Cygnus sites, docs and tools take their look
from here.

## Install

```sh
bun add @studiocygnus/brand
```

## Use it with Tailwind CSS v4

In the stylesheet where you import Tailwind:

```css
@import "tailwindcss";
@import "@studiocygnus/brand/fonts.css";
@import "@studiocygnus/brand/theme.css";
```

That gives you:

| Utilities | What they are |
| --- | --- |
| `bg-ground`, `bg-surface`, `border-rule`, `text-fg`, `text-fg-muted` | The ground, a raised surface, rules and text, for the current theme |
| `bg-accent`, `text-on-accent`, `text-accent-fg`, `text-link`, `text-companion` | Marigold for actions and labels, steel for links |
| `bg-night`, `text-marigold`, `text-steel-ink` and the rest | The named colours, the same in both themes |
| `font-display`, `font-sans`, `font-mono` | Bricolage Grotesque, Schibsted Grotesk (the default), Martian Mono |
| `type-heading`, `type-wordmark`, `type-label` | The three type roles: loud narrow capitals, the wordmark's setting, small mono labels |
| `bg-dot-grid` | The dot-grid texture |

Dark is the default. Put `data-theme="light"` on any element to switch it and everything inside to
paper, or `data-theme="system"` to follow the visitor's setting. The theme utilities change with it;
the named colours don't.

```html
<html data-theme="system">
  <body class="bg-ground text-fg">
    <p class="type-label text-accent-fg">Studio Cygnus · B2B tools</p>
    <h1 class="type-heading text-6xl">Small tools that do one job well.</h1>
    <a class="bg-accent text-on-accent px-5 py-3" href="/tools">See the tools</a>
  </body>
</html>
```

## Use it without Tailwind

`@studiocygnus/brand/variables.css` holds the same values as `--sc-*` variables: `--sc-ground`,
`--sc-fg`, `--sc-accent`, `--sc-marigold`, `--sc-font-display`, `--sc-heading-variation` and so on,
with the same `data-theme` switch. `fonts.css` imports the font packages by name, so it needs a
bundler that resolves package imports (Vite, PostCSS with postcss-import, Lightning CSS).

## Fonts

All three fonts come from `@fontsource-variable` packages, which this package depends on, and are
served with the site rather than from Google Fonts. Each covers Spanish and Romanian. The font
files are linked relative to those packages, so the site's bundler has to copy them: Vite and Astro
(through `@tailwindcss/vite`) do, the Tailwind CLI on its own doesn't.

| Font | Role |
| --- | --- |
| Bricolage Grotesque | The wordmark (bold, regular width) and headings (extra bold, narrowest width, capitals) |
| Schibsted Grotesk | Body text and interface |
| Martian Mono | Small uppercase labels and code |

## Logos

`@studiocygnus/brand/logos/` has the mark, the wordmark and the lockup, each for a night ground
(`-on-night.svg`) and a paper ground (`-on-paper.svg`). The letters are outlines, so the files need
no fonts. Put them only on night or paper, never on a marigold or steel fill.

## Specimen

`@studiocygnus/brand/specimen.html` is one page showing the brand as this version ships it: the
palette, both themes, the type roles, the logos and the dot grid. The CSS and the fonts are inlined,
so it opens straight from disk with no network. `just build` writes it to the repo root from
`specimen/`, compiled against `dist/theme.css`.

## Working on it

The values live in `src/tokens.ts`; `just build` writes the stylesheets to `dist/`. The tests check
that every text colour meets WCAG AA on its ground in both themes, and that the theme compiles with
Tailwind. `just logos` redraws the logo SVGs from the fonts.

## Licence

The code and stylesheets are MIT. The name and logos are not: see [LICENSE](LICENSE).
