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

## Icons and the manifest

`@studiocygnus/brand/icons/` has everything a site's `<head>` needs to look right in a browser tab,
on a phone's home screen and in a link preview:

| File | For |
| --- | --- |
| `favicon.ico` (16, 32, 48) and `favicon.svg` | Browser tabs, bookmarks, and anything asking for `/favicon.ico` |
| `apple-touch-icon.png` (180) | iPhone and iPad home screens |
| `icon-192.png`, `icon-512.png` | Installed web apps, `purpose: any` |
| `icon-maskable-192.png`, `icon-maskable-512.png` | Android, which crops icons to its own shape; the mark sits inside the middle 80% |
| `icon-monochrome.svg`, `icon-monochrome-512.png` | Android themed icons, tinted by the system |
| `splash/*.png` | The launch screen iOS shows while a home-screen site opens, one per iPhone and iPad size and orientation |
| `og.png` (1200 × 630) | Link previews |
| `site.webmanifest` | Installing the site as an app: the name, the colours and the icons |
| `head.html` | Every tag that wires them up |

To use them, serve the folder at `/icons/` and paste `head.html` into the `<head>`, filling in the
bracketed title, description and URLs per page. With Astro, copy it into `public/` as part of the
build, for example in `package.json`:

```json
"scripts": {
  "prebuild": "cp -r node_modules/@studiocygnus/brand/dist/icons public/icons"
}
```

The manifest's paths are relative to it, so the folder can live elsewhere: at `/brand/icons/` the
app starts at `/brand/`. It fills in what the brand decides. What describes an app's own pages is the
app's to add in its own manifest: `screenshots` (Chrome's larger install dialog), `shortcuts`,
`share_target`, `file_handlers` and `protocol_handlers`. Safari's `mask-icon` and Windows'
`browserconfig.xml` aren't shipped; current browsers use the favicon instead.

The splash screens follow the device list in `src/icons.json`. Each new iPhone or iPad size needs a
line there.

## Brand kit

<https://studiocygnus.github.io/brand/> shows the brand as `main` has it: the palette, both themes,
the type roles and the dot grid. It also has the files for people rather than code: every logo as SVG
and PNG, the avatar, and a banner for each platform with the crop guides drawn over it. The
social images are not in the package.

`just build` writes the site to `_site/` from `site/`, compiled against `dist/theme.css`, and
`.github/workflows/pages.yml` deploys it on every push to `main`.

## Working on it

The values live in `src/tokens.ts`; `just build` writes the stylesheets to `dist/`. The tests check
that every text colour meets WCAG AA on its ground in both themes, and that the theme compiles with
Tailwind. `just logos` redraws the logo SVGs, the avatar and banners in `social/` and the icon sources
in `icons/` from the fonts; the banners' sizes and safe areas are in `src/social.json`.

## Licence

The code and stylesheets are MIT. The name and logos are not: see [LICENSE](LICENSE).
