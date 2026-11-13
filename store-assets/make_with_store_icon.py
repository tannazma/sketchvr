# Rebuilds the store images using the store icon from sketchvr-android (store_icon.png).
from PIL import Image, ImageDraw, ImageFont
import math

ICON = "/Users/tann/sketchvr-android/store_icon.png"
OUT = "/Users/tann/sketchvr/store-assets"
BG = (245, 244, 239)            # app light background, used on the cover and hero
FONT = "/System/Library/Fonts/Avenir Next.ttc"
SS = 4

icon = Image.open(ICON).convert("RGBA")
dark = icon.getpixel((6, 6))    # the icon's own dark background colour
print("icon background", dark)

def bold(size):
    return ImageFont.truetype(FONT, size, index=7)

def regular(size):
    return ImageFont.truetype(FONT, size, index=0)

# 1) Logo icon: the store icon itself (512 x 512, solid background)
icon.convert("RGB").save(f"{OUT}/logo-icon-black-1024.png".replace("black-1024", "512"), optimize=True)

# 2) Cover and hero: store icon on the left, title and tagline on the right
def cover(W, H, path):
    canvas = Image.new("RGB", (W * SS, H * SS), BG)
    d = ImageDraw.Draw(canvas)
    size = int(H * SS * 0.62)
    x = int(W * SS * 0.10)
    y = (H * SS - size) // 2
    canvas.paste(icon.resize((size, size), Image.LANCZOS).convert("RGB"), (x, y))
    tx = x + size + int(W * SS * 0.05)
    title_size, sub_size = int(H * SS * 0.16), int(H * SS * 0.065)
    avail = W * SS - tx - int(W * SS * 0.06)
    while True:
        tf, sf = bold(title_size), regular(sub_size)
        tb = d.textbbox((0, 0), "Sketch VR", font=tf)
        sb = d.textbbox((0, 0), "Trace sketches onto the real world.", font=sf)
        if max(tb[2] - tb[0], sb[2] - sb[0]) <= avail:
            break
        title_size -= 4; sub_size -= 2
    gap = int(H * SS * 0.04)
    block = (tb[3] - tb[1]) + gap + (sb[3] - sb[1])
    ty = (H * SS - block) // 2
    d.text((tx - tb[0], ty - tb[1]), "Sketch VR", font=tf, fill=(17, 19, 18))
    d.text((tx - sb[0], ty + (tb[3] - tb[1]) + gap - sb[1]), "Trace sketches onto the real world.", font=sf, fill=(75, 75, 70))
    canvas.resize((W, H), Image.LANCZOS).save(path, optimize=True)

cover(2560, 1440, f"{OUT}/cover-landscape-2560x1440.png")
cover(3000, 900, f"{OUT}/hero-3000x900.png")

# 3) Spatialized tile background: solid colour of the store icon
Image.new("RGB", (512, 512), dark[:3]).save(f"{OUT}/tile-background-512.png", optimize=True)

# 4) Spatialized tile foreground: icon with its dark background made transparent,
#    scaled so the frame sits inside the 392 px safe area, centred on 512 px
def key_out(img, bg, soft=60):
    out = img.copy()
    px = out.load()
    for yy in range(out.height):
        for xx in range(out.width):
            r, g, b, a = px[xx, yy]
            dist = math.sqrt((r - bg[0]) ** 2 + (g - bg[1]) ** 2 + (b - bg[2]) ** 2)
            px[xx, yy] = (r, g, b, int(a * min(1.0, dist / soft)))
    return out

keyed = key_out(icon, dark)
frame_span = 309.5               # the icon's frame spans about 304 of 512 px
scale = 392.0 / frame_span
big = keyed.resize((round(512 * scale), round(512 * scale)), Image.LANCZOS)
fg = Image.new("RGBA", (512, 512), (0, 0, 0, 0))
off = (512 - big.width) // 2
fg.alpha_composite(big, (off, off)) if off >= 0 else fg.alpha_composite(big.crop((-off, -off, big.width, big.height)), (0, 0))
fg.save(f"{OUT}/tile-foreground-512.png", optimize=True)
print("done")
