"""Generate PWA icons for Desi Cal AI: orange rounded square + white bowl motif."""
import os
from PIL import Image, ImageDraw, ImageFont

OUT = os.path.join(os.path.dirname(__file__), "..", "public", "icons")
os.makedirs(OUT, exist_ok=True)

def draw(size: int) -> Image.Image:
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    r = int(size * 0.22)
    # warm gradient background (two-tone orange)
    for y in range(size):
        t = y / size
        rr = int(234 + (249 - 234) * t)
        gg = int(88 + (115 - 88) * t)
        bb = int(12 + (22 - 12) * t)
        d.line([(0, y), (size, y)], fill=(rr, gg, bb, 255))
    # round the corners by masking
    mask = Image.new("L", (size, size), 0)
    md = ImageDraw.Draw(mask)
    md.rounded_rectangle([0, 0, size, size], radius=r, fill=255)
    img.putalpha(mask)

    d = ImageDraw.Draw(img)
    cx, cy = size / 2, size / 2
    # white bowl (circle) + steam lines + plate arc
    bowl_r = size * 0.26
    d.ellipse([cx - bowl_r, cy - bowl_r * 0.9, cx + bowl_r, cy + bowl_r * 0.9],
              fill=(255, 255, 255, 255))
    # curry surface
    d.ellipse([cx - bowl_r * 0.78, cy - bowl_r * 0.66, cx + bowl_r * 0.78,
               cy + bowl_r * 0.66], fill=(234, 88, 12, 255))
    # steam
    sw = size * 0.02
    for i, dx in enumerate((-0.14, 0, 0.14)):
        x = cx + dx * size
        y0 = cy - bowl_r * 1.25 - i * size * 0.012
        d.line([(x, y0), (x + size * 0.03, y0 - size * 0.07)],
               fill=(255, 255, 255, 200), width=int(max(2, sw)))
    # bold "DC" letters for legibility at small sizes
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
                                  int(size * 0.20))
    except OSError:
        font = ImageFont.load_default()
    d.text((cx, cy + bowl_r * 1.12), "DC", fill=(255, 255, 255, 255),
           font=font, anchor="mm")
    return img

for s, name in [(192, "icon-192.png"), (512, "icon-512.png"),
                (180, "apple-touch-icon-180.png")]:
    draw(s).save(os.path.join(OUT, name), "PNG")
    print("wrote", name)
# maskable icon needs padding: draw bowl at 80% inside the canvas
m = draw(512)
canvas = Image.new("RGBA", (512, 512), (234, 88, 12, 255))
canvas.alpha_composite(m.crop((51, 51, 461, 461)).resize((512, 512)))
canvas.save(os.path.join(OUT, "maskable-512.png"), "PNG")
print("wrote maskable-512.png")
