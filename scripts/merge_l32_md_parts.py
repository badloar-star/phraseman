# Concatenate lesson_32_user_*.md parts into lesson_32_user.md
import pathlib
import re

d = pathlib.Path(__file__).resolve().parent
parts = sorted(
    d.glob("lesson_32_user_*.md"),
    key=lambda p: int(re.search(r"_(\d+)\.md$", p.name).group(1)) if p.name != "lesson_32_user_9.md" else 99,
)
# Manual order: _01, _02, ...
def sort_key(p: pathlib.Path) -> int:
    m = re.search(r"lesson_32_user_(\d+)\.md$", p.name)
    if not m:
        return 999
    return int(m.group(1))


parts = sorted(
    [p for p in d.glob("lesson_32_user_*.md") if re.match(r"lesson_32_user_\d+\.md$", p.name)],
    key=sort_key,
)
if len(parts) < 1:
    raise SystemExit("Add lesson_32_user_01.md, lesson_32_user_02.md, ...")
out = d / "lesson_32_user.md"
out.write_text("\n\n".join(p.read_text(encoding="utf-8").strip() for p in parts) + "\n", encoding="utf-8")
print("Wrote", out, "from", [p.name for p in parts])
