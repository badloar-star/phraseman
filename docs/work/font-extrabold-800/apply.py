#!/usr/bin/env python3
# Добавление Inter ExtraBold (800) в сборку — всё, кроме самого файла (его кладёт человек после слова владельца).
# Запуск из корня репозитория:
#   python docs/work/font-extrabold-800/apply.py --check   # только проверить, что все места правки находятся (ничего не пишет)
#   python docs/work/font-extrabold-800/apply.py           # применить: нужен файл assets/fonts/Inter-ExtraBold.ttf
# Проверяет файл по таблице имён (версия как у остальных четырёх, usWeightClass 800, семейство «Inter ExtraBold»), правит app.json (android+ios),
# dev-ассеты, карту весов и два сторожа контракта шрифта. После применения: npm run test:one -- tests/font_weights_contract.test.ts tests/app_font_family_contract.test.ts tests/font_extrabold_800_ready.test.ts
# и node tests/android_font_family_contract_probe.mjs. Нативная часть: нужна пересборка (expo-font plugin → xml_inter.xml).
import os
import struct
import sys

sys.stdout.reconfigure(encoding='utf-8')
ROOT = os.getcwd().replace('\\', '/') + '/'
CHECK = '--check' in sys.argv
FONT = 'assets/fonts/Inter-ExtraBold.ttf'


def read(p):
    return open(ROOT + p, encoding='utf-8', newline='').read()


def sub(text, old, new, label):
    # в файлах встречаются смешанные концы строк: пробуем LF, затем CRLF
    for nl in ('\n', '\r\n'):
        o = old.replace('\n', nl)
        if text.count(o) == 1:
            return text.replace(o, new.replace('\n', nl))
    raise AssertionError(f'{label}: место правки не найдено или не одно')


def font_info(path):
    d = open(path, 'rb').read()
    num = struct.unpack('>H', d[4:6])[0]
    tabs = {}
    for i in range(num):
        tag, _, off, ln = struct.unpack('>4sIII', d[12 + 16 * i:28 + 16 * i])
        tabs[tag.decode()] = off
    off = tabs['name']
    _, count, soff = struct.unpack('>HHH', d[off:off + 6])
    names = {}
    for i in range(count):
        pid, eid, lid, nid, nl, no = struct.unpack('>HHHHHH', d[off + 6 + 12 * i:off + 18 + 12 * i])
        raw = d[off + soff + no:off + soff + no + nl]
        try:
            s = raw.decode('utf-16-be') if pid in (0, 3) else raw.decode('latin-1')
        except Exception:
            continue
        names.setdefault(nid, s)
    weight = struct.unpack('>H', d[tabs['OS/2'] + 4:tabs['OS/2'] + 6])[0]
    return names, weight


def font_metrics(path):
    """upm, ascent, descent, lineGap (hhea) и набор кириллицы (cmap) — то, что реально определяет вид строки."""
    d = open(path, 'rb').read()
    num = struct.unpack('>H', d[4:6])[0]
    tabs = {}
    for i in range(num):
        tag, _, off, ln = struct.unpack('>4sIII', d[12 + 16 * i:28 + 16 * i])
        tabs[tag.decode()] = off
    upm = struct.unpack('>H', d[tabs['head'] + 18:tabs['head'] + 20])[0]
    asc, desc, gap = struct.unpack('>hhh', d[tabs['hhea'] + 4:tabs['hhea'] + 10])
    off = tabs['cmap']
    n = struct.unpack('>H', d[off + 2:off + 4])[0]
    cps = set()
    for i in range(n):
        pid, eid, so = struct.unpack('>HHI', d[off + 4 + 8 * i:off + 12 + 8 * i])
        if (pid, eid) not in ((3, 1), (3, 10)):
            continue
        sub = off + so
        fmt = struct.unpack('>H', d[sub:sub + 2])[0]
        if fmt == 12:
            groups = struct.unpack('>I', d[sub + 12:sub + 16])[0]
            for g in range(groups):
                s, e, _ = struct.unpack('>III', d[sub + 16 + 12 * g:sub + 28 + 12 * g])
                cps.update(c for c in range(s, e + 1) if 0x400 <= c <= 0x4FF)
        elif fmt == 4:
            segx2 = struct.unpack('>H', d[sub + 6:sub + 8])[0]
            seg = segx2 // 2
            ends = struct.unpack('>%dH' % seg, d[sub + 14:sub + 14 + segx2])
            starts = struct.unpack('>%dH' % seg, d[sub + 16 + segx2:sub + 16 + 2 * segx2])
            for s, e in zip(starts, ends):
                cps.update(c for c in range(s, e + 1) if 0x400 <= c <= 0x4FF and c != 0xFFFF)
    return upm, asc, desc, gap, cps


EDITS = {
    'app.json': [
        ('                  {\n                    "path": "./assets/fonts/Inter-Bold.ttf",\n                    "weight": 700\n                  },\n',
         '                  {\n                    "path": "./assets/fonts/Inter-Bold.ttf",\n                    "weight": 700\n                  },\n                  {\n                    "path": "./assets/fonts/Inter-ExtraBold.ttf",\n                    "weight": 800\n                  },\n'),
        ('            "./assets/fonts/Inter-Bold.ttf",\n            "./assets/fonts/Inter-Black.ttf"\n',
         '            "./assets/fonts/Inter-Bold.ttf",\n            "./assets/fonts/Inter-ExtraBold.ttf",\n            "./assets/fonts/Inter-Black.ttf"\n'),
    ],
    'app/typography_dev_fonts.ts': [
        ("  'Inter-Bold': require('../assets/fonts/Inter-Bold.ttf'),\n",
         "  'Inter-Bold': require('../assets/fonts/Inter-Bold.ttf'),\n  'Inter-ExtraBold': require('../assets/fonts/Inter-ExtraBold.ttf'),\n"),
    ],
    'app/font_weights.ts': [
        ('export const REGISTERED_INTER_WEIGHTS: readonly number[] = [400, 600, 700, 900];',
         'export const REGISTERED_INTER_WEIGHTS: readonly number[] = [400, 600, 700, 800, 900];'),
    ],
    'tests/android_font_family_contract_probe.mjs': [
        ("    { path: './assets/fonts/Inter-Bold.ttf', weight: 700 },\n",
         "    { path: './assets/fonts/Inter-Bold.ttf', weight: 700 },\n    { path: './assets/fonts/Inter-ExtraBold.ttf', weight: 800 },\n"),
        ('  [400, 600, 700, 900],\n', '  [400, 600, 700, 800, 900],\n'),
    ],
    'tests/app_font_family_contract.test.ts': [
        ("      { path: './assets/fonts/Inter-Bold.ttf', weight: 700 },\n",
         "      { path: './assets/fonts/Inter-Bold.ttf', weight: 700 },\n      { path: './assets/fonts/Inter-ExtraBold.ttf', weight: 800 },\n"),
        ("    expect(fs.existsSync(path.join(root, 'assets/fonts/Inter-Bold.ttf'))).toBe(true);\n",
         "    expect(fs.existsSync(path.join(root, 'assets/fonts/Inter-Bold.ttf'))).toBe(true);\n    expect(fs.existsSync(path.join(root, 'assets/fonts/Inter-ExtraBold.ttf'))).toBe(true);\n"),
    ],
}

if not CHECK:
    assert os.path.exists(ROOT + FONT), f'нет файла {FONT}: положите Inter-ExtraBold.ttf (источник — docs/work/font-extrabold-800/README.md)'
    names, weight = font_info(ROOT + FONT)
    ref_names, _ = font_info(ROOT + 'assets/fonts/Inter-Bold.ttf')
    assert weight == 800, f'usWeightClass={weight}, ожидалось 800'
    # зачем (решение координатора 15.10, вариант A): четыре файла в репозитории — нехинтованная сборка Inter 4.001 (git-66647c0bb), в официальном
    # архиве v4.1 статические ttf — хинтованная сборка той же версии (git-9221beed3). Хеш сборки не сравниваем: сверяем «Version 4.001» и метрики строки.
    assert names.get(5, '').split(';')[0] == ref_names.get(5, '').split(';')[0], f'версия {names.get(5)!r} не совпадает с остальными начертаниями {ref_names.get(5)!r}'
    m_new = font_metrics(ROOT + FONT)
    m_ref = font_metrics(ROOT + 'assets/fonts/Inter-Bold.ttf')
    assert m_new[:4] == m_ref[:4], f'метрики (upm, ascent, descent, lineGap) {m_new[:4]} не совпадают с остальными {m_ref[:4]}'
    assert len(m_new[4]) >= 0.95 * len(m_ref[4]) and {0x0416, 0x0430, 0x044F, 0x0451} <= m_new[4], 'кириллица в файле неполная'
    assert names.get(6) == 'Inter-ExtraBold', f'PostScript-имя {names.get(6)!r}, ожидалось Inter-ExtraBold'
    print('файл проверен:', names.get(4), '|', names.get(5), '| вес', weight)

for path, pairs in EDITS.items():
    text = read(path)
    for i, (old, new) in enumerate(pairs):
        text = sub(text, old, new, f'{path}#{i + 1}')
    if not CHECK:
        open(ROOT + path, 'w', encoding='utf-8', newline='').write(text)
    print(('проверено ' if CHECK else 'исправлено ') + path)
print('ГОТОВО' if not CHECK else 'ВСЕ МЕСТА ПРАВКИ НАЙДЕНЫ (ничего не записано)')
