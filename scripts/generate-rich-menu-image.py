from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

OUTPUT = Path(__file__).parent.parent / "public" / "rich-menu" / "sby-modes.png"
WIDTH, HEIGHT = 2500, 1686

image = Image.new("RGB", (WIDTH, HEIGHT), "#0f172a")
draw = ImageDraw.Draw(image)
font = r"C:\\Windows\\Fonts\\tahoma.ttf"
font_bold = r"C:\\Windows\\Fonts\\tahomabd.ttf"
small = ImageFont.truetype(font, 54)
label = ImageFont.truetype(font_bold, 92)
number = ImageFont.truetype(font_bold, 180)
items = [
    ("1", "คำถามทั่วไป", "#0ea5e9", "#e0f2fe", "ถามข้อมูลโรงเรียน"),
    ("2", "ทุนช้างเผือก", "#2563eb", "#dbeafe", "ถามทุนช้างเผือก"),
    ("3", "ติดต่อแอดมิน", "#16a34a", "#dcfce7", "ส่งต่อให้เจ้าหน้าที่"),
]
margin, gap = 36, 24
card_width = (WIDTH - margin * 2 - gap * 2) // 3
for index, (number_text, title, color, tint, hint) in enumerate(items):
    x = margin + index * (card_width + gap)
    draw.rounded_rectangle((x, margin, x + card_width, HEIGHT - margin), radius=46, fill=color)
    center = x + card_width // 2
    draw.ellipse((center - 115, 210, center + 115, 440), fill=tint)
    box = draw.textbbox((0, 0), number_text, font=number)
    draw.text((center - (box[2] - box[0]) // 2, 220 - (box[3] - box[1]) // 2), number_text, font=number, fill=color)
    box = draw.textbbox((0, 0), title, font=label)
    draw.text((center - (box[2] - box[0]) // 2, 650), title, font=label, fill="white")
    box = draw.textbbox((0, 0), hint, font=small)
    draw.text((center - (box[2] - box[0]) // 2, 820), hint, font=small, fill="white")
draw.text((WIDTH // 2, 1510), "โรงเรียนส่วนบุญโญปถัมภ์ ลำพูน", font=small, anchor="mm", fill="#cbd5e1")
image.save(OUTPUT, format="PNG", optimize=True)
print(OUTPUT)
