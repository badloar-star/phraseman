# Build lesson_31_user.md: first occurrence of each card ### 1..50 from raw user paste
import pathlib
import re
import sys

RAW = pathlib.Path(__file__).resolve().parent / "lesson_31_user_raw.txt"
OUT = pathlib.Path(__file__).resolve().parent / "lesson_31_user.md"

if not RAW.exists():
    print("Missing", RAW, file=sys.stderr)
    raise SystemExit(1)

text = RAW.read_text(encoding="utf-8")

matches: list[re.Match[str]] = list(
    re.finditer(r"^###\s*(\d+)\.\s*[^\n]*$", text, re.MULTILINE)
)
if not matches:
    raise SystemExit("no ### N. headers found")

# First occurrence of each n in 1..50
seen: set[int] = set()
spans: list[tuple[int, int, int]] = []  # n, start, end
for i, m in enumerate(matches):
    n = int(m.group(1))
    if n < 1 or n > 50 or n in seen:
        continue
    end = matches[i + 1].start() if i + 1 < len(matches) else len(text)
    spans.append((n, m.start(), end))
    seen.add(n)
    if len(seen) == 50:
        break

if len(seen) != 50:
    raise SystemExit(f"expected 50 unique first cards, got {len(seen)}: {sorted(seen)}")

spans.sort(key=lambda t: t[0])
out_parts: list[str] = []
for n, a, b in spans:
    if n != len(out_parts) + 1:
        raise SystemExit(f"gap: expected {len(out_parts)+1}, got card {n}")
    block = text[a:b].rstrip()
    out_parts.append(block)

out = "\n\n---\n\n".join(out_parts) + "\n"
OUT.write_text(out, encoding="utf-8")
print("Wrote", OUT, "chars", len(out))
