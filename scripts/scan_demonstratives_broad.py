"""Любые пары english:'..' russian:'..' в app/ (без обязательного id)."""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
APP = ROOT / "app"

RU_PL = re.compile(r"(?<![а-яёa-zA-Z])(эти|те)\s+[а-яё]", re.I)
RU_SG = re.compile(
    r"(?<![а-яёa-zA-Z])(этот|эта|это|тот|та|то)\s+[а-яё]", re.I
)
SKIP = re.compile(
    r"\b(said|think|know|knew|believe|confirmed|mentioned|replied|explained|warned)\s+that\s+",
    re.I,
)
ALLOW = re.compile(
    r"\b(this|that)\s+(day|year|time|morning|evening|night|week|month|way|moment)\b",
    re.I,
)

PAIR = re.compile(
    r"english:\s*'([^'\\]*(?:\\.[^'\\]*)*)'[\s\S]{0,2000}?"
    r"russian:\s*'([^'\\]*(?:\\.[^'\\]*)*)'",
)


def main() -> None:
    findings: list[tuple[str, str, str, str]] = []
    skip_files = {
        "lesson_data_types.ts",
        "lesson_data_all.ts",
        "lesson_data_9_16.ts",
    }
    for fp in sorted(list(APP.rglob("*.ts")) + list(APP.rglob("*.tsx"))):
        if fp.name in skip_files or "node_modules" in str(fp):
            continue
        text = fp.read_text(encoding="utf-8", errors="replace")
        for m in PAIR.finditer(text):
            en = m.group(1).replace("\\'", "'")
            ru = m.group(2).replace("\\'", "'")
            if "\n" in en or "\n" in ru or len(en) > 400:
                continue
            el = en.lower()
            if SKIP.search(el):
                continue
            ht = bool(re.search(r"\b(these|those)\s+\w", el))
            hdt = bool(re.search(r"\b(this|that)\s+\w", el))
            if RU_PL.search(ru) and hdt and not ht and not ALLOW.search(el):
                if re.search(r"\bthat\s+(he|she|it|they|if)\b", el):
                    continue
                rel = str(fp.relative_to(ROOT))
                findings.append((rel, en[:200], ru[:200]))
            elif RU_SG.search(ru) and re.search(r"\b(these|those)\s+\w", el) and not hdt:
                if not RU_PL.search(ru):
                    rel = str(fp.relative_to(ROOT))
                    findings.append((rel + " [RU_sg_EN_pl]", en[:200], ru[:200]))

    seen = set()
    for loc, en, ru in findings:
        key = (loc, en, ru)
        if key in seen:
            continue
        seen.add(key)
        print(loc)
        print("  EN:", en)
        print("  RU:", ru)
        print()
    print("TOTAL", len(seen))


if __name__ == "__main__":
    main()
