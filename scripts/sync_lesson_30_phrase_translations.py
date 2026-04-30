# Update russian/ukrainian in LESSON_30_PHRASES from lesson_30_user.md translation lines
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parent.parent
md_path = ROOT / "scripts" / "lesson_30_user.md"
ts_path = ROOT / "app" / "lesson_data_25_32.ts"
md = md_path.read_text(encoding="utf-8")
text = ts_path.read_text(encoding="utf-8")

heads = list(re.finditer(r"^###\s*(\d+)\.\s*[^\n]*$", md, re.M))
translations: dict[int, tuple[str, str]] = {}
for i, h in enumerate(heads):
    n = int(h.group(1))
    start = h.end()
    end = heads[i + 1].start() if i + 1 < len(heads) else len(md)
    block = md[start:end]
    m = re.search(
        r"^\*\*([^\*]+)\*\*\s*/\s*\*\*([^\*]+)\*\*",
        block.lstrip(),
        re.M,
    )
    if not m:
        raise SystemExit(f"No RU/UK line for card {n}")
    translations[n] = (m.group(1).strip(), m.group(2).strip())

if len(translations) != 50:
    raise SystemExit(f"Expected 50 translations, got {len(translations)}")

m_start = re.search(r"export const LESSON_30_PHRASES", text)
if not m_start:
    raise SystemExit("Could not find LESSON_30_PHRASES")
block_start = m_start.start()
sub = text[block_start :]
m_close = re.search(r"^\];", sub, re.M)
if not m_close:
    raise SystemExit("Could not find ];")
block = sub[: m_close.end()]
rest = sub[m_close.end() :]


def esc_t(s: str) -> str:
    return s.replace("\\", "\\\\").replace("'", "\\'")


# Match TS single-quoted strings that may contain \' (e.g. Ukrainian "п'ють")
_TS_SQ = r"(?:\\'|[^'])*"

for n in range(50, 0, -1):
    pat = re.compile(
        rf"(    id: {n},\r?\n    english: [^\r\n]+\r?\n    )russian: '({_TS_SQ})',\r?\n    ukrainian: '({_TS_SQ})',",
    )
    m = pat.search(block)
    if not m:
        raise SystemExit(f"Could not find phrase {n} in TS")
    ru, uk = translations[n]
    new_snippet = f"{m.group(1)}russian: '{esc_t(ru)}',\n    ukrainian: '{esc_t(uk)}',"
    block = block[: m.start()] + new_snippet + block[m.end() :]

out = text[:block_start] + block + rest
ts_path.write_text(out, encoding="utf-8")
print("Updated LESSON_30_PHRASES russian/ukrainian for 50 items")
