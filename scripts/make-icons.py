#!/usr/bin/env python3
"""Generate Selah's app icons: the caesura mark ‖ in ink on warm parchment.

Draws the two bars geometrically (slightly tapered, letterpress-inked) so no
font is required. Outputs icon, adaptive foreground/background/monochrome,
splash icon, favicon.
"""
from PIL import Image, ImageDraw, ImageFilter

PARCHMENT = (245, 243, 250, 255)   # dawn bg — whisper lavender-white
INK = (69, 65, 83, 255)            # soft plum-grey ink
EMBER = (143, 134, 198, 255)       # soft lavender accent (the pause dot)


def rounded_bar(draw, cx, top, bottom, w, fill):
    r = w / 2
    draw.rounded_rectangle([cx - r, top, cx + r, bottom], radius=r, fill=fill)


def draw_mark(size, fg, bg=None, scale=1.0, ember_dot=True):
    img = Image.new("RGBA", (size, size), bg if bg else (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    h = size * 0.42 * scale          # bar height
    w = size * 0.075 * scale         # bar width
    gap = size * 0.115 * scale       # gap between bars
    cy = size / 2
    top, bottom = cy - h / 2, cy + h / 2
    rounded_bar(d, size / 2 - gap / 2 - w / 2, top, bottom, w, fg)
    rounded_bar(d, size / 2 + gap / 2 + w / 2, top, bottom, w, fg)
    if ember_dot:
        # a small ember diamond beneath — the pause, held
        r = size * 0.030 * scale
        dy = bottom + size * 0.085 * scale
        d.polygon([(size / 2, dy - r), (size / 2 + r, dy), (size / 2, dy + r), (size / 2 - r, dy)], fill=EMBER)
    return img


def paper_texture(img):
    """Very subtle vignette so the parchment doesn't read flat."""
    size = img.size[0]
    shade = Image.new("L", img.size, 0)
    d = ImageDraw.Draw(shade)
    d.ellipse([-size * 0.25, -size * 0.25, size * 1.25, size * 1.25], fill=18)
    shade = shade.filter(ImageFilter.GaussianBlur(size * 0.12))
    dark = Image.new("RGBA", img.size, (206, 199, 224, 255))  # soft lavender vignette
    return Image.composite(img, dark, shade.point(lambda p: 255 - p))


out = "assets"
# main icon (1024)
icon = paper_texture(draw_mark(1024, INK, PARCHMENT))
icon.save(f"{out}/icon.png")
# android adaptive: foreground has safe-zone margin (66% content)
draw_mark(1024, INK, None, scale=0.62).save(f"{out}/android-icon-foreground.png")
Image.new("RGBA", (1024, 1024), PARCHMENT).save(f"{out}/android-icon-background.png")
draw_mark(1024, (255, 255, 255, 255), None, scale=0.62, ember_dot=False).save(
    f"{out}/android-icon-monochrome.png")
# splash: transparent bg mark (renders on themed splash bg)
draw_mark(512, INK, None, ember_dot=True).save(f"{out}/splash-icon.png")
# favicon
draw_mark(96, INK, PARCHMENT, scale=1.1, ember_dot=False).resize((48, 48), Image.LANCZOS).save(
    f"{out}/favicon.png")
print("icons written")
