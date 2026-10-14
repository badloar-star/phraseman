# зачем (гейт паритета переноса, координатор 14.10): склейка «приложение | эталон» одной высоты с подписями — для поэлементной сверки.
# usage: python pgate.py <кадр_приложения.png> <эталон.png> <выход.png> [подпись]
import sys
from PIL import Image, ImageDraw, ImageFont
# зачем: подписи кириллицей — встроенный шрифт PIL рисовал квадраты
try: F = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 18)
except OSError as e: print('[PGATE] шрифт arial не найден:', e); F = None
app, ref, out = sys.argv[1:4]; cap = sys.argv[4] if len(sys.argv) > 4 else ''
A = Image.open(app).convert('RGB'); B = Image.open(ref).convert('RGB')
h = 900
A = A.resize((int(A.width * h / A.height), h)); B = B.resize((int(B.width * h / B.height), h))
C = Image.new('RGB', (A.width + B.width + 30, h + 40), (24, 24, 26))
C.paste(A, (10, 34)); C.paste(B, (A.width + 20, 34))
d = ImageDraw.Draw(C); d.text((12, 8), 'ПРИЛОЖЕНИЕ', fill=(255, 255, 255), font=F); d.text((A.width + 22, 8), 'ЭТАЛОН ' + cap, fill=(126, 240, 200), font=F)
C.save(out, quality=82) if out.endswith('.webp') else C.save(out); print(out, C.size)
