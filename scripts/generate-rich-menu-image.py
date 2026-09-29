from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageOps


ROOT = Path(__file__).parent.parent
OUTPUT = ROOT / "public" / "rich-menu" / "sby-modes.png"
BACKGROUND = ROOT / "public" / "rich-menu" / "sby-menu-background.png"
LOGO = ROOT / "public" / "rich-menu" / "sby-school-logo.jpg"
WIDTH, HEIGHT = 2500, 1686

FONT = r"C:\Windows\Fonts\LeelawUI.ttf"
FONT_BOLD = r"C:\Windows\Fonts\LeelaUIb.ttf"


def load_font(size, bold=False):
    return ImageFont.truetype(FONT_BOLD if bold else FONT, size)


def centered_text(draw, center_x, y, text, font, fill):
    box = draw.textbbox((0, 0), text, font=font)
    draw.text((center_x - (box[2] - box[0]) / 2, y), text, font=font, fill=fill)


def draw_speech_icon(draw, center_x, center_y, color):
    draw.rounded_rectangle(
        (center_x - 75, center_y - 55, center_x + 75, center_y + 50),
        radius=28,
        outline=color,
        width=16,
    )
    draw.polygon(
        [(center_x - 25, center_y + 42), (center_x - 55, center_y + 85), (center_x + 12, center_y + 48)],
        outline=color,
    )
    draw.line((center_x - 38, center_y - 4, center_x + 38, center_y - 4), fill=color, width=12)
    draw.line((center_x - 38, center_y + 25, center_x + 18, center_y + 25), fill=color, width=12)


def draw_scholarship_icon(draw, center_x, center_y, color):
    draw.polygon(
        [(center_x - 105, center_y - 18), (center_x, center_y - 78), (center_x + 105, center_y - 18), (center_x, center_y + 42)],
        outline=color,
        fill=None,
    )
    draw.line((center_x + 105, center_y - 18, center_x + 105, center_y + 52), fill=color, width=14)
    draw.ellipse((center_x + 87, center_y + 45, center_x + 123, center_y + 81), fill=color)
    draw.line((center_x - 52, center_y + 30, center_x - 52, center_y + 92), fill=color, width=14)
    draw.line((center_x + 52, center_y + 30, center_x + 52, center_y + 92), fill=color, width=14)
    draw.arc((center_x - 82, center_y + 58, center_x + 82, center_y + 150), 0, 180, fill=color, width=14)


def draw_admin_icon(draw, center_x, center_y, color):
    draw.ellipse((center_x - 42, center_y - 82, center_x + 42, center_y + 2), outline=color, width=15)
    draw.arc((center_x - 108, center_y - 65, center_x + 108, center_y + 115), 180, 360, fill=color, width=15)
    draw.line((center_x - 105, center_y - 12, center_x - 105, center_y + 55), fill=color, width=15)
    draw.line((center_x + 105, center_y - 12, center_x + 105, center_y + 55), fill=color, width=15)
    draw.line((center_x + 105, center_y + 44, center_x + 145, center_y + 44), fill=color, width=15)
    draw.arc((center_x - 90, center_y + 10, center_x + 90, center_y + 210), 0, 180, fill=color, width=15)


def transparent_logo(size):
    logo = Image.open(LOGO).convert("RGBA")
    pixels = logo.load()
    for y in range(logo.height):
        for x in range(logo.width):
            red, green, blue, alpha = pixels[x, y]
            if red > 242 and green > 242 and blue > 242:
                pixels[x, y] = (red, green, blue, 0)
    bbox = logo.getbbox()
    logo = logo.crop(bbox) if bbox else logo
    return ImageOps.contain(logo, (size, size), Image.Resampling.LANCZOS)


def main():
    background = ImageOps.fit(
        Image.open(BACKGROUND).convert("RGB"),
        (WIDTH, HEIGHT),
        method=Image.Resampling.LANCZOS,
    ).convert("RGBA")
    canvas = background.copy()
    draw = ImageDraw.Draw(canvas, "RGBA")

    logo_size = 330
    logo_x = WIDTH // 2 - logo_size // 2
    logo_y = 72
    draw.ellipse(
        (logo_x - 30, logo_y - 30, logo_x + logo_size + 30, logo_y + logo_size + 30),
        fill=(255, 255, 255, 242),
        outline=(210, 226, 248, 255),
        width=8,
    )
    logo = transparent_logo(logo_size)
    canvas.alpha_composite(logo, (logo_x, logo_y))

    items = [
        ("คำถามทั่วไป", "สอบถามข้อมูลโรงเรียน", draw_speech_icon),
        ("ทุนช้างเผือก", "ข้อมูลทุนและการสมัคร", draw_scholarship_icon),
        ("ติดต่อแอดมิน", "ฝากข้อความถึงโรงเรียน", draw_admin_icon),
    ]
    panel_width = WIDTH / 3
    card_top, card_bottom = 980, 1535
    title_font = load_font(72, bold=True)
    hint_font = load_font(42)
    footer_font = load_font(34, bold=True)

    for index, (title, hint, icon) in enumerate(items):
        center_x = int(panel_width * (index + 0.5))
        left = int(panel_width * index + 64)
        right = int(panel_width * (index + 1) - 64)

        shadow = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
        shadow_draw = ImageDraw.Draw(shadow, "RGBA")
        shadow_draw.rounded_rectangle(
            (left + 10, card_top + 16, right + 10, card_bottom + 16),
            radius=42,
            fill=(1, 25, 65, 90),
        )
        shadow = shadow.filter(ImageFilter.GaussianBlur(18))
        canvas.alpha_composite(shadow)
        draw = ImageDraw.Draw(canvas, "RGBA")
        draw.rounded_rectangle(
            (left, card_top, right, card_bottom),
            radius=42,
            fill=(255, 255, 255, 232),
            outline=(255, 255, 255, 255),
            width=5,
        )

        icon_y = card_top + 118
        draw.ellipse(
            (center_x - 102, icon_y - 102, center_x + 102, icon_y + 102),
            fill=(11, 58, 131, 255),
        )
        icon(draw, center_x, icon_y, (255, 255, 255, 255))
        centered_text(draw, center_x, card_top + 270, title, title_font, (8, 42, 97, 255))
        centered_text(draw, center_x, card_top + 382, hint, hint_font, (29, 80, 143, 255))

    centered_text(
        draw,
        WIDTH // 2,
        1602,
        "โรงเรียนส่วนบุญโญปถัมภ์ ลำพูน",
        footer_font,
        (8, 42, 97, 255),
    )
    # LINE's rich-menu image upload limit is 1 MB; indexed PNG keeps the artwork crisp.
    optimized = canvas.convert("RGB").quantize(colors=256, method=Image.Quantize.MEDIANCUT)
    optimized.save(OUTPUT, format="PNG", optimize=True)
    print(OUTPUT)


if __name__ == "__main__":
    main()
