"""
Resizes store screenshots to Chrome Web Store requirements:
  - Screenshots: 1280x800 (or 640x400), JPEG or 24-bit PNG (no alpha)
  - Small promo tile: 440x280
  - Large promo tile: 1400x560

Usage: python resize_screenshots.py
Output goes to store/screenshots/resized/
"""

from PIL import Image
import os

SCREENSHOTS_DIR = os.path.join(os.path.dirname(__file__), "screenshots")
OUTPUT_DIR = os.path.join(SCREENSHOTS_DIR, "resized")
os.makedirs(OUTPUT_DIR, exist_ok=True)

SCREENSHOT_SIZE = (1280, 800)  # target for regular screenshots

def convert_to_rgb_png(img: Image.Image) -> Image.Image:
    """Strip alpha, convert to RGB (24-bit)."""
    if img.mode in ("RGBA", "LA", "P"):
        background = Image.new("RGB", img.size, (255, 255, 255))
        if img.mode == "P":
            img = img.convert("RGBA")
        background.paste(img, mask=img.split()[-1] if img.mode in ("RGBA", "LA") else None)
        return background
    return img.convert("RGB")


def fit_and_pad(img: Image.Image, target_w: int, target_h: int) -> Image.Image:
    """Scale image to fit inside target dimensions, pad remainder with white."""
    img.thumbnail((target_w, target_h), Image.LANCZOS)
    canvas = Image.new("RGB", (target_w, target_h), (255, 255, 255))
    offset_x = (target_w - img.width) // 2
    offset_y = (target_h - img.height) // 2
    canvas.paste(img, (offset_x, offset_y))
    return canvas


def process_screenshots():
    files = [
        f for f in os.listdir(SCREENSHOTS_DIR)
        if f.lower().endswith((".png", ".jpg", ".jpeg"))
        and os.path.isfile(os.path.join(SCREENSHOTS_DIR, f))
    ]

    if not files:
        print("No images found in", SCREENSHOTS_DIR)
        return

    print(f"Found {len(files)} screenshot(s). Resizing to {SCREENSHOT_SIZE[0]}x{SCREENSHOT_SIZE[1]}...\n")

    for i, filename in enumerate(sorted(files), start=1):
        src_path = os.path.join(SCREENSHOTS_DIR, filename)
        img = Image.open(src_path)
        print(f"  [{i}] {filename}  ({img.size[0]}x{img.size[1]}, {img.mode})")

        img = convert_to_rgb_png(img)
        resized = fit_and_pad(img, *SCREENSHOT_SIZE)

        out_name = f"screenshot_{i:02d}.png"
        out_path = os.path.join(OUTPUT_DIR, out_name)
        resized.save(out_path, "PNG")
        print(f"       -> {out_name}  ({resized.size[0]}x{resized.size[1]})")

    print(f"\nDone. Resized files saved to: {OUTPUT_DIR}")


if __name__ == "__main__":
    process_screenshots()
