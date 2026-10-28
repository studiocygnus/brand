# /// script
# requires-python = ">=3.12"
# dependencies = ["fonttools[woff]==4.68.0", "uharfbuzz==0.57.0"]
# ///
"""Draw the logo SVGs in logos/, with the text as outlines so they need no fonts.

`just logos` runs it. It reproduces the final identity board's layout: the mark's geometry, and
the wordmark and lockup as the browser set them, using the fonts from node_modules.
"""

import io
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
}
LINES = [(46, 10, 50, 38), (50, 38, 56, 90), (16, 30, 50, 38), (50, 38, 84, 50)]
STARS = [(46, 10), (50, 38), (16, 30), (84, 50)]
PAD = 2


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


def mark(size, star, companion, weight):
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
    out.append(f'<circle cx="{num(ax * s)}" cy="{num(ay * s)}" r="{num(ar * s)}" fill="{MARIGOLD}"/>')
    out.append(f'<circle cx="{num(bx * s)}" cy="{num(by * s)}" r="{num(br * s)}" fill="{companion}"/>')
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

    # Wordmark: `cygnus` at 76px with line-height 1, a 4px gap, then the two-star full stop: a
    # 28x17 box holding a 26x16 drawing, its bottom 9px above the bottom of the line box.
    size = 76
    letters, advance, (x0, y0, x1, y1) = bricolage.outline("cygnus", size, -0.045)
    k = min(28 / 26, 17 / 16)
    box_left = advance + 4
    box_top = (size - bricolage.baseline(size, 1)) - 9 - 17
    ox, oy = box_left + (28 - 26 * k) / 2, box_top + (17 - 16 * k) / 2
    stop = [(ox + 7 * k, oy + 9 * k, 6.5 * k), (ox + 20.5 * k, oy + 6 * k, 4.5 * k)]
    top = min(y0, *(cy - r for _, cy, r in stop))
    bottom = max(y1, *(cy + r for _, cy, r in stop))
    right = max(x1, *(cx + r for cx, _, r in stop))
    for ground, (ink, companion, _) in GROUNDS.items():
        (bright, dim) = stop
        write(f"wordmark-on-{ground}.svg", right - x0, bottom - top, (-x0, -top), [
            f'<path fill="{ink}" d="{letters}"/>',
            f'<circle cx="{num(bright[0])}" cy="{num(bright[1])}" r="{num(bright[2])}" fill="{MARIGOLD}"/>',
            f'<circle cx="{num(dim[0])}" cy="{num(dim[1])}" r="{num(dim[2])}" fill="{companion}"/>',
        ])

    # Mark: the 100-unit drawing at the weight of the board's mark on night and on paper.
    for ground, (star, companion, _) in GROUNDS.items():
        write(f"mark-on-{ground}.svg", 96, 96, (-PAD, -PAD), mark(100, star, companion, "medium"))

    # Lockup: the 88px mark at its small weight, a 20px gap, then a column centred on the mark:
    # "STUDIO" in Martian Mono (12px, 0.32em spacing, normal line height), a 6px gap, and
    # `cygnus` at 54px with line-height 0.9.
    studio, _, (_, sy0, sx1, _) = mono.outline("STUDIO", 12, 0.32)
    name, _, (_, _, nx1, ny1) = bricolage.outline("cygnus", 54, -0.045)
    studio_line = (mono.ascent + mono.descent) * 12
    column_top = (88 - (studio_line + 6 + 54 * 0.9)) / 2
    studio_y = column_top + mono.baseline(12, mono.ascent + mono.descent)
    name_y = column_top + studio_line + 6 + bricolage.baseline(54, 0.9)
    text_x = 88 + 20
    top = min(0, studio_y + sy0)
    bottom = max(88, name_y + ny1)
    for ground, (star, companion, label) in GROUNDS.items():
        write(f"lockup-on-{ground}.svg", text_x + max(sx1, nx1), bottom - top, (0, -top), [
            *mark(88, star, companion, "small"),
            f'<path fill="{label}" transform="translate({num(text_x)} {num(studio_y)})" d="{studio}"/>',
            f'<path fill="{star}" transform="translate({num(text_x)} {num(name_y)})" d="{name}"/>',
        ])


if __name__ == "__main__":
    main()
