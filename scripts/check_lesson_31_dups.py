"""List duplicate main-sentence 'english' values in LESSON_31 (skips words[].text)."""
import re
from collections import Counter
from pathlib import Path

lines = (Path(__file__).resolve().parent.parent / "app" / "lesson_data_25_32.ts").read_text(
    encoding="utf-8"
).splitlines()
# L31: export ... through closing ]; before LESSON_31_VOCABULARY
start = next(i for i, L in enumerate(lines) if "export const LESSON_31_PHRASES" in L)
end = next(i for i, L in enumerate(lines) if "export const LESSON_31_VOCABULARY" in L)
chunk = "\n".join(lines[start : end + 1])

in_words = False
ens: list[str] = []
for line in chunk.splitlines():
    s = line.strip()
    if s.startswith("words:"):
        in_words = True
        continue
    if in_words and s == "],":
        in_words = False
        continue
    if in_words:
        continue
    m = re.match(r"english: '((?:\\'|[^'])*)',?\s*$", s)
    if m:
        ens.append(m.group(1).replace("\\'", "'"))

c = Counter(ens)
dups = [(e, n) for e, n in c.items() if n > 1]
print("phrases", len(ens), "unique", len(c), "dups", len(dups))
for e, n in sorted(dups, key=lambda x: -x[1])[:50]:
    print(n, e[:120])
