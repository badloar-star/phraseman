import re
from pathlib import Path

t = Path("app/lesson_data_17_24.ts").read_text(encoding="utf-8")
P = re.compile(
    r"english:\s*'([^'\\]*(?:\\.[^'\\]*)*)'[\s\S]{0,2000}?russian:\s*'([^'\\]*(?:\\.[^'\\]*)*)'"
)
print("matches", len(list(P.finditer(t))))
for i, m in enumerate(P.finditer(t)):
    if i < 3:
        print("---", i, m.group(1)[:60], "|", m.group(2)[:60])
