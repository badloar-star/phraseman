# зачем (координатор 14.10): 90 МБ PNG в публичный репозиторий не кладём. В репозиторий — выборка: 412×915, точка «final»
# (+ «peak» там, где смысл в анимации: повышение лиги m01, ранг монеты m14, рубежи m19/d*, «С возвращением» m21), темы из THEMES, webp q85.
# usage: python scripts/mockups/etalon_pack.py   env: THEMES=aurora-dark,aurora-light PEAK_RE=<рег.выр. моментов с «пиком»> SRC=<полный набор>
import os, re, sys
from PIL import Image
SRC = os.environ.get('SRC', 'C:/Temp/claude/etalon_v3')
DST = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'docs', 'phraseman-2.0', 'evidence', 'etalon_v3')
THEMES = (os.environ.get('THEMES') or 'aurora-dark,aurora-light').split(',')
PEAK = re.compile(os.environ.get('PEAK_RE', r'^(m01|m14|m19|m21|d\d+)$'))
n = 0; size = 0
for mid in sorted(os.listdir(SRC)):
    d = os.path.join(SRC, mid)
    if not os.path.isdir(d): continue
    for f in sorted(os.listdir(d)):
        m = re.match(r'^([a-z-]+)_412_(?:(\w+)_)?(start|peak|final)\.png$', f)
        if not m or m.group(1) not in THEMES: continue
        if m.group(3) == 'start' or (m.group(3) == 'peak' and not PEAK.match(mid)): continue
        os.makedirs(os.path.join(DST, mid), exist_ok=True)
        out = os.path.join(DST, mid, f[:-4] + '.webp')
        Image.open(os.path.join(d, f)).convert('RGB').save(out, 'WEBP', quality=85, method=6)
        n += 1; size += os.path.getsize(out)
print('frames', n, 'MB', round(size / 1048576, 2))
