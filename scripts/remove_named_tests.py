"""Remove top-level `test(...)`/`it(...)` blocks (2-space indent) whose titles are listed in a file.
// зачем: владелец 2026-09-30 велел удалить старые тесты удалённых механик; удаляем строго по списку названий.
Usage: python scripts/remove_named_tests.py <test-file> <titles-file>"""
import re
import sys

path, titles_path = sys.argv[1], sys.argv[2]
raw = open(path, encoding='utf-8', newline='').read()
nl = '\r\n' if '\r\n' in raw else '\n'
lines = raw.replace('\r\n', '\n').split('\n')
titles = {t.strip() for t in open(titles_path, encoding='utf-8').read().split('\n') if t.strip()}
out, removed, i = [], [], 0
start = re.compile(r"^  (?:test|it)\((['\"`])(.*?)\1,")
while i < len(lines):
    m = start.match(lines[i])
    if m and m.group(2) in titles:
        j = i
        while not re.match(r'^  \}\);\s*$', lines[j]):
            j += 1
        removed.append(m.group(2))
        i = j + 1
        if i < len(lines) and lines[i].strip() == '':
            i += 1
        continue
    out.append(lines[i])
    i += 1
missing = titles - set(removed)
open(path, 'w', encoding='utf-8', newline='').write(nl.join(out))
print(f'removed {len(removed)}/{len(titles)}; not found: {sorted(missing)}')
