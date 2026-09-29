from pathlib import Path

from PIL import Image, ImageOps


ROOT = Path(__file__).parent.parent
SOURCE = ROOT / "public" / "rich-menu" / "sby-modes-ai-source.png"
OUTPUT = ROOT / "public" / "rich-menu" / "sby-modes.jpg"
SIZE = (2500, 1686)


def main():
    image = ImageOps.fit(
        Image.open(SOURCE).convert("RGB"),
        SIZE,
        method=Image.Resampling.LANCZOS,
    )
    # JPEG keeps the generated artwork below LINE's rich-menu upload limit.
    image.save(OUTPUT, format="JPEG", quality=88, optimize=True, progressive=True)
    print(OUTPUT)


if __name__ == "__main__":
    main()
