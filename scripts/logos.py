# /// script
# requires-python = ">=3.12"
# dependencies = ["fonttools[woff]==4.68.0", "uharfbuzz==0.57.0"]
# ///
"""Draw the logo SVGs in logos/, the social images in social/, the icon sources in icons/ and
the email signature's band in email/, with the text as outlines so they need no fonts.

`just logos` runs it. It reproduces the final identity board's layout: the mark's geometry, and
the wordmark and lockup as the browser set them, using the fonts from node_modules. The social
images follow the social board on the identity canvas, at the sizes in src/social.json. The icons
are the avatar's mark; src/icons.ts turns them into the favicon, app icons and splash screens.
"""

import io
import json
import random
from pathlib import Path

import uharfbuzz as hb
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

ROOT = Path(__file__).resolve().parent.parent
FONTS = ROOT / "node_modules/@fontsource-variable"
OUT = ROOT / "logos"
SOCIAL = ROOT / "social"
ICONS = ROOT / "icons"
EMAIL = ROOT / "email"

NIGHT = "#0B0E1A"
STARLIGHT = "#E9ECF5"
HAZE = "#8A93AD"
GRAPHITE = "#4F5870"
MARIGOLD = "#E88E11"
STEEL = "#789AB9"
STEEL_PAPER = "#5D7FA3"

# Colours per ground: stars and letters, Albireo's companion, the "STUDIO" label.
GROUNDS = {
    "night": (STARLIGHT, STEEL, HAZE),
    "paper": (NIGHT, STEEL_PAPER, GRAPHITE),
}

# The mark gets heavier as it gets smaller: stars, line width, line opacity, Albireo's pair.
MARK_WEIGHTS = {
    "medium": ((6, 5, 4, 4.4), 1.6, 0.55, ((53, 90, 4.4), (61.5, 87.5, 3))),
    "small": ((7, 6, 5, 5.4), 2.0, 0.55, ((53, 90, 5.2), (63, 87, 3.6))),
    "avatar": ((9, 8, 7, 7.4), 3.5, 0.6, ((53, 90, 7.5), (66, 86, 5))),
    # At 16px a unit is about a seventh of a pixel: brighter lines, and Albireo's pair larger and
    # a pixel apart so gold and blue stay two dots.
    "favicon-16": ((10, 9, 8, 8.4), 5, 0.75, ((52, 90, 10), (76, 84, 7))),
}
LINES = [(46, 10, 50, 38), (50, 38, 56, 90), (16, 30, 50, 38), (50, 38, 84, 50)]
STARS = [(46, 10), (50, 38), (16, 30), (84, 50)]
PAD = 2
# The social images are drawn for screens at twice CSS pixels: star sizes and counts follow it.
DENSITY = 2


def num(v):
    return f"{v:.2f}".rstrip("0").rstrip(".")


class Face:
    """A variable font fixed at one instance, shaped with HarfBuzz."""

    def __init__(self, path, axes):
        font = instantiateVariableFont(TTFont(path), axes)
        font.flavor = None
        buf = io.BytesIO()
        font.save(buf)
        self.data = buf.getvalue()
        self.font = TTFont(io.BytesIO(self.data))
        upem = self.font["head"].unitsPerEm
        # Chromium's line metrics: typo metrics when USE_TYPO_METRICS is set, hhea otherwise.
        os2 = self.font["OS/2"]
        if os2.fsSelection & (1 << 7):
            self.ascent, self.descent = os2.sTypoAscender / upem, -os2.sTypoDescender / upem
        else:
            self.ascent, self.descent = self.font["hhea"].ascent / upem, -self.font["hhea"].descent / upem

    def baseline(self, size, leading):
        """Baseline position from the top of a line box `leading` times `size` high."""
        return (leading * size - (self.ascent + self.descent) * size) / 2 + self.ascent * size

    def outline(self, text, size, tracking):
        """SVG path for `text` at `size` px with CSS letter-spacing `tracking` (em), baseline at y=0.

        Returns the path, the advance width (with the trailing spacing, as CSS adds it) and the
        ink bounds (x0, y0, x1, y1) in SVG space.
        """
        buf = hb.Buffer()
        buf.add_str(text)
        buf.guess_segment_properties()
        # CSS turns optional ligatures off once letter-spacing is set.
        hb.shape(hb.Font(hb.Face(self.data)), buf, {"liga": False, "clig": False} if tracking else {})
        glyphs = self.font.getGlyphSet()
        order = self.font.getGlyphOrder()
        scale = size / self.font["head"].unitsPerEm
        pen = SVGPathPen(glyphs, ntos=num)
        bounds = BoundsPen(glyphs)
        x = 0.0
        for info, pos in zip(buf.glyph_infos, buf.glyph_positions):
            transform = (scale, 0, 0, -scale, x + pos.x_offset * scale, -pos.y_offset * scale)
            glyphs[order[info.codepoint]].draw(TransformPen(pen, transform))
            glyphs[order[info.codepoint]].draw(TransformPen(bounds, transform))
            x += pos.x_advance * scale + tracking * size
        return pen.getCommands(), x, bounds.bounds


def mark(size, star, companion, weight, bright=MARIGOLD):
    """The Northern Cross drawn `size` px square at the origin."""
    s = size / 100
    radii, stroke, opacity, ((ax, ay, ar), (bx, by, br)) = MARK_WEIGHTS[weight]
    out = [f'<g stroke="{star}" stroke-width="{num(stroke * s)}" stroke-linecap="round" opacity="{opacity}">']
    out += [
        f'  <line x1="{num(x1 * s)}" y1="{num(y1 * s)}" x2="{num(x2 * s)}" y2="{num(y2 * s)}"/>'
        for x1, y1, x2, y2 in LINES
    ]
    out.append("</g>")
    out += [f'<circle cx="{num(x * s)}" cy="{num(y * s)}" r="{num(r * s)}" fill="{star}"/>' for (x, y), r in zip(STARS, radii)]
    out.append(f'<circle cx="{num(ax * s)}" cy="{num(ay * s)}" r="{num(ar * s)}" fill="{bright}"/>')
    out.append(f'<circle cx="{num(bx * s)}" cy="{num(by * s)}" r="{num(br * s)}" fill="{companion}"/>')
    return out


def wordmark(face, size):
    """`cygnus` and the two-star full stop at `size` px, baseline at y=0.

    As the board set it at 76px: a 4px gap, then a 28x17 box holding the 26x16 stop, its bottom
    9px above the bottom of the line box (line-height 1). The gap and the stop scale with `size`.
    Returns the letters' path, the stop's two circles (cx, cy, r) and the ink bounds.
    """
    u = size / 76
    letters, advance, (x0, y0, x1, y1) = face.outline("cygnus", size, -0.045)
    k = min(28 / 26, 17 / 16) * u
    box_left = advance + 4 * u
    box_top = (size - face.baseline(size, 1)) - 9 * u - 17 * u
    ox, oy = box_left + (28 * u - 26 * k) / 2, box_top + (17 * u - 16 * k) / 2
    stop = [(ox + 7 * k, oy + 9 * k, 6.5 * k), (ox + 20.5 * k, oy + 6 * k, 4.5 * k)]
    top = min(y0, *(cy - r for _, cy, r in stop))
    bottom = max(y1, *(cy + r for _, cy, r in stop))
    right = max(x1, *(cx + r for cx, _, r in stop))
    return letters, stop, (x0, top, right, bottom)


def wordmark_body(letters, stop, ink, companion):
    (bright, dim) = stop
    return [
        f'<path fill="{ink}" d="{letters}"/>',
        f'<circle cx="{num(bright[0])}" cy="{num(bright[1])}" r="{num(bright[2])}" fill="{MARIGOLD}"/>',
        f'<circle cx="{num(dim[0])}" cy="{num(dim[1])}" r="{num(dim[2])}" fill="{companion}"/>',
    ]


def starfield(rng, width, height, clear):
    """Stars over the whole image, so any crop of it is still sky, but none inside the `clear`
    boxes (x0, y0, x1, y1)."""
    count = max(70, round(220 * width * height / DENSITY**2 / (1280 * 720)))
    out = []
    for _ in range(count):
        x, y, r, t = rng.random() * width, rng.random() * height, rng.random(), rng.random()
        if any(x0 <= x <= x1 and y0 <= y <= y1 for x0, y0, x1, y1 in clear):
            continue
        fill = STEEL if t < 0.12 else STARLIGHT
        radius = (1 + r * 1.8) * DENSITY / 2
        out.append(f'<circle cx="{num(x)}" cy="{num(y)}" r="{num(radius)}" fill="{fill}" opacity="{num(0.25 + r * 0.6)}"/>')
    return out


def write(name, width, height, shift, body):
    """One SVG, `body` moved by `shift` and padded by PAD on every side."""
    lines = "\n".join(f"    {line}" for line in body)
    (OUT / name).write_text(
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {num(width + 2 * PAD)} {num(height + 2 * PAD)}" role="img" aria-label="Studio Cygnus">\n'
        f"  <title>Studio Cygnus</title>\n"
        f'  <g transform="translate({num(shift[0] + PAD)} {num(shift[1] + PAD)})">\n{lines}\n  </g>\n'
        f"</svg>\n"
    )


def main():
    OUT.mkdir(exist_ok=True)
    bricolage = Face(
        FONTS / "bricolage-grotesque/files/bricolage-grotesque-latin-standard-normal.woff2",
        {"wght": 700, "wdth": 100, "opsz": 96},
    )
    mono = Face(FONTS / "martian-mono/files/martian-mono-latin-standard-normal.woff2", {"wght": 400, "wdth": 100})

    # Wordmark: `cygnus` at 76px with the two-star full stop.
    letters, stop, (x0, top, right, bottom) = wordmark(bricolage, 76)
    for ground, (ink, companion, _) in GROUNDS.items():
        write(f"wordmark-on-{ground}.svg", right - x0, bottom - top, (-x0, -top), wordmark_body(letters, stop, ink, companion))

    # Mark: the 100-unit drawing at the weight of the board's mark on night and on paper.
    for ground, (star, companion, _) in GROUNDS.items():
        write(f"mark-on-{ground}.svg", 96, 96, (-PAD, -PAD), mark(100, star, companion, "medium"))

    for ground, colours in GROUNDS.items():
        body, width, top, bottom = lockup(mono, bricolage, *colours)
        write(f"lockup-on-{ground}.svg", width, bottom - top, (0, -top), body)

    social(bricolage)
    icons()
    email(mono, bricolage)


def lockup(mono, bricolage, star, companion, label):
    """The lockup with its mark's top-left at the origin.

    The 88px mark at its small weight, a 20px gap, then a column centred on the mark: "STUDIO" in
    Martian Mono (12px, 0.32em spacing, normal line height), a 6px gap, and `cygnus` at 54px with
    line-height 0.9. Returns the body, its width, and the top and bottom of its ink.
    """
    studio, _, (_, sy0, sx1, _) = mono.outline("STUDIO", 12, 0.32)
    name, _, (_, _, nx1, ny1) = bricolage.outline("cygnus", 54, -0.045)
    studio_line = (mono.ascent + mono.descent) * 12
    column_top = (88 - (studio_line + 6 + 54 * 0.9)) / 2
    studio_y = column_top + mono.baseline(12, mono.ascent + mono.descent)
    name_y = column_top + studio_line + 6 + bricolage.baseline(54, 0.9)
    text_x = 88 + 20
    body = [
        *mark(88, star, companion, "small"),
        f'<path fill="{label}" transform="translate({num(text_x)} {num(studio_y)})" d="{studio}"/>',
        f'<path fill="{star}" transform="translate({num(text_x)} {num(name_y)})" d="{name}"/>',
    ]
    return body, text_x + max(sx1, nx1), min(0, studio_y + sy0), max(88, name_y + ny1)


def centred_mark(square, scale, star, companion, weight, bright=MARIGOLD):
    """The mark at `scale` of a `square` px square, the point (50, 49) of its drawing on the
    centre, which puts it in the middle of a circle crop."""
    size = scale * square
    return [
        f'<g transform="translate({num(square / 2 - 0.5 * size)} {num(square / 2 - 0.49 * size)})">',
        *(f"  {line}" for line in mark(size, star, companion, weight, bright)),
        "</g>",
    ]


def write_social(name, width, height, body, folder=SOCIAL):
    """One image, `width` by `height` px with nothing outside it."""
    lines = "\n".join(f"  {line}" for line in body)
    (folder / name).write_text(
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}" role="img" aria-label="Studio Cygnus">\n'
        f"  <title>Studio Cygnus</title>\n{lines}\n</svg>\n"
    )


def social(bricolage):
    """The avatar and the banners, all on night."""
    spec = json.loads((ROOT / "src/social.json").read_text())
    SOCIAL.mkdir(exist_ok=True)
    star, companion, _ = GROUNDS["night"]

    # Avatar: the mark at its avatar weight, 72% of the square, in the middle of the circle every
    # platform crops it to.
    w, h = spec["avatar"]["width"], spec["avatar"]["height"]
    write_social("avatar.svg", w, h, [
        f'<rect width="{w}" height="{h}" fill="{NIGHT}"/>',
        *centred_mark(w, 0.72, star, companion, "avatar"),
    ])

    # Banners: the wordmark and the Northern Cross side by side, centred in the platform's safe
    # area and sized from it, over a star field that keeps clear of them.
    for banner in spec["banners"]:
        w, h = banner["width"], banner["height"]
        sx, sy, sw, sh = banner["safe"]
        word = min(0.42 * sh, 0.15 * sw)
        cross = min(0.92 * sh, 0.32 * sw)
        gap = min(0.5 * sh, 0.07 * sw)
        letters, stop, (x0, top, right, bottom) = wordmark(bricolage, word)
        width = right - x0 + gap + cross
        left, mid = sx + (sw - width) / 2, sy + sh / 2
        wx, wy = left - x0, mid - (top + bottom) / 2
        cx, cy = left + right - x0 + gap, mid - cross / 2
        # Keep stars off the wordmark and the cross, each with a margin, but not the gap between.
        m = 0.12 * word
        clear = [
            (left - m, mid - (bottom - top) / 2 - m, left + right - x0 + m, mid + (bottom - top) / 2 + m),
            (cx - m, cy - m, cx + cross + m, cy + cross + m),
        ]
        write_social(f"banner-{banner['name']}.svg", w, h, [
            f'<rect width="{w}" height="{h}" fill="{NIGHT}"/>',
            *starfield(random.Random(banner["name"]), w, h, clear),
            f'<g transform="translate({num(wx)} {num(wy)})">',
            *(f"  {line}" for line in wordmark_body(letters, stop, star, companion)),
            "</g>",
            f'<g transform="translate({num(cx)} {num(cy)})">',
            *(f"  {line}" for line in mark(cross, star, companion, "medium")),
            "</g>",
        ])


def icons():
    """The sources of the favicon, the app icons and the splash screens, all 512 px square."""
    ICONS.mkdir(exist_ok=True)
    star, companion, _ = GROUNDS["night"]
    sq = 512
    ground = f'<rect width="{sq}" height="{sq}" fill="{NIGHT}"/>'
    # Tabs show the square, so it gets rounded corners and the mark fills more of it.
    rounded = f'<rect width="{sq}" height="{sq}" rx="{num(0.18 * sq)}" fill="{NIGHT}"/>'
    write_social("favicon.svg", sq, sq, [rounded, *centred_mark(sq, 0.84, star, companion, "avatar")], ICONS)
    write_social("favicon-16.svg", sq, sq, [rounded, *centred_mark(sq, 0.92, star, companion, "favicon-16")], ICONS)
    # iOS rounds the touch icon itself and turns transparency black, so it's a full square.
    write_social("apple-touch-icon.svg", sq, sq, [ground, *centred_mark(sq, 0.72, star, companion, "avatar")], ICONS)
    # Maskable: full bleed, the mark inside the middle 80% circle that every launcher mask keeps.
    # It's the avatar's layout.
    write_social("maskable.svg", sq, sq, [ground, *centred_mark(sq, 0.72, star, companion, "avatar")], ICONS)
    # Monochrome: one colour on transparent; the system tints it and reads only its alpha.
    write_social("monochrome.svg", sq, sq, centred_mark(sq, 0.72, "#FFFFFF", "#FFFFFF", "avatar", "#FFFFFF"), ICONS)
    # Splash screens: the mark alone, at its lighter weight, placed on night by src/icons.ts.
    write_social("splash-mark.svg", 100, 100, mark(100, star, companion, "medium"), ICONS)


def email(mono, bricolage):
    """The signature's band: a night plate with the lockup and the address among stars.

    Drawn at twice its 440x60 size in the email, as on the canvas: 12px of padding top and bottom,
    14px left and 18px right, the lockup's mark 36px tall, the address in Martian Mono at 9px with
    0.1em spacing.
    """
    EMAIL.mkdir(exist_ok=True)
    w, h, k = 880, 120, 2
    star, companion, label = GROUNDS["night"]
    body, width, top, bottom = lockup(mono, bricolage, star, companion, label)
    s = 36 * k / 88
    lx, ly = 14 * k, (h - (bottom - top) * s) / 2 - top * s
    site, advance, (_, ay0, _, ay1) = mono.outline("STUDIOCYGNUS.CO", 9 * k, 0.1)
    ax = w - 18 * k - (advance - 0.1 * 9 * k)
    ay = h / 2 - (ay0 + ay1) / 2
    m = 12 * k
    clear = [
        (lx - m, ly + top * s - m, lx + width * s + m, ly + bottom * s + m),
        (ax - m, ay + ay0 - m, w, ay + ay1 + m),
    ]
    write_social("band.svg", w, h, [
        f'<clipPath id="plate"><rect width="{w}" height="{h}" rx="{10 * k}"/></clipPath>',
        f'<rect width="{w}" height="{h}" rx="{10 * k}" fill="{NIGHT}"/>',
        '<g clip-path="url(#plate)">',
        *(f"  {line}" for line in starfield(random.Random("email"), w, h, clear)),
        "</g>",
        f'<g transform="translate({num(lx)} {num(ly)}) scale({num(s)})">',
        *(f"  {line}" for line in body),
        "</g>",
        f'<path fill="{MARIGOLD}" transform="translate({num(ax)} {num(ay)})" d="{site}"/>',
    ], EMAIL)


if __name__ == "__main__":
    main()
