# 360° preview: equirectangular 2:1 JPG, 6000 x 3000, 24-bit, under 2.3 MB.
# A calm room-like gradient in the app's colours: light sky above the horizon,
# slightly darker floor below, with a faint horizon line. Pillow only.
from PIL import Image, ImageDraw
import os

W, H = 6000, 3000
SKY = (246, 245, 240)     # close to the app background #f5f4ef
FLOOR = (222, 219, 210)   # slightly darker floor
HORIZON = (196, 193, 184)

img = Image.new("RGB", (W, H), SKY)
draw = ImageDraw.Draw(img)
for row in range(H):
    if row < H // 2:
        t = row / (H / 2)                       # 0 at top, 1 at horizon
        c = tuple(round(SKY[i] * (1 - 0.02 * t) + (SKY[i] - 2) * 0.02 * t) for i in range(3))
    else:
        t = (row - H / 2) / (H / 2)             # 0 at horizon, 1 at bottom
        c = tuple(round(SKY[i] * (1 - t) + FLOOR[i] * t) for i in range(3))
    draw.line([(0, row), (W, row)], fill=c)
draw.line([(0, H // 2), (W, H // 2)], fill=HORIZON, width=3)

out = "/Users/tann/sketchvr/store-assets/preview-360-6000x3000.jpg"
img.save(out, quality=88, optimize=True)
print("saved", round(os.path.getsize(out) / 1e6, 2), "MB")
