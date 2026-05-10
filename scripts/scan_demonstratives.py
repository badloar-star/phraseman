"""Heuristic scan: RU эти/те + noun vs EN this/that + noun (lessons ts)."""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
APP = ROOT / "app"

issues: list[tuple[str, str, str, str]] = []


def check_en_ru(en: str, ru: str, loc: str) -> None:
    en_l = en.lower()
    ru_l = ru.lower()
    ru_pl = bool(re.search(r"(?<![а-яёa-z])(эти|те)\s+[а-яё]", ru_l))
    ru_sg_dem = bool(
        re.search(r"(?<![а-яёa-z])(этот|эта|это|тот|та|то)\s+[а-яё]", ru_l)
    )
    en_this_adj = bool(re.search(r"\bthis\s+[a-z]", en_l))
    en_that_adj = bool(re.search(r"\bthat\s+[a-z]", en_l))
    en_these_adj = bool(re.search(r"\bthese\s+[a-z]", en_l))
    en_those_adj = bool(re.search(r"\bthose\s+[a-z]", en_l))

    if ru_pl and (en_this_adj or en_that_adj) and not (en_these_adj or en_those_adj):
        if re.search(
            r"\b(said|says|think|thinks|know|knew|believe|believed|confirmed|mentioned|replied|explained|warned|complained|reminded|announced|admit|admitted)\s+that\s+[a-z]{1,4}\s",
            en_l,
        ):
            return
        if re.search(
            r"\bthat\s+(he|she|it|they|we|you|i|someone|people|there|this|these|those|if)\b",
            en_l,
        ):
            return
        issues.append(("RU_pl_EN_sg", loc, en, ru))

    if ru_sg_dem and (en_these_adj or en_those_adj) and not (en_this_adj or en_that_adj):
        if re.search(r"(?<![а-яёa-z])(эти|те)\s+[а-яё]", ru_l):
            return
        issues.append(("RU_sg_EN_pl", loc, en, ru))


def scan_file(fp: Path) -> None:
    text = fp.read_text(encoding="utf-8")
    pat1 = re.compile(
        r"id\s*:\s*['\"]([^'\"]+)['\"][\s\S]*?"
        r"english\s*:\s*['\"]([\s\S]*?)['\"][\s\S]*?"
        r"russian\s*:\s*['\"]([\s\S]*?)['\"]",
        re.MULTILINE,
    )
    for m in pat1.finditer(text):
        id_, en, ru = m.group(1), m.group(2), m.group(3)
        if "\n" in en or "\n" in ru:
            continue
        en = en.replace("\\'", "'")
        ru = ru.replace("\\'", "'")
        check_en_ru(en, ru, f"{fp.name} id={id_}")

    pat2 = re.compile(
        r"id\s*:\s*['\"]([^'\"]+)['\"][\s\S]*?"
        r"russian\s*:\s*['\"]([\s\S]*?)['\"][\s\S]*?"
        r"english\s*:\s*['\"]([\s\S]*?)['\"]",
        re.MULTILINE,
    )
    for m in pat2.finditer(text):
        id_, ru, en = m.group(1), m.group(2), m.group(3)
        if "\n" in en or "\n" in ru:
            continue
        en = en.replace("\\'", "'")
        ru = ru.replace("\\'", "'")
        check_en_ru(en, ru, f"{fp.name} id={id_}")

    # Objects with english/russian but no id (multiline fields in _gen.ts)
    pat_plain = re.compile(
        r"english\s*:\s*['\"]([\s\S]*?)['\"][\s\S]{0,800}?"
        r"russian\s*:\s*['\"]([\s\S]*?)['\"]",
        re.MULTILINE,
    )
    for m in pat_plain.finditer(text):
        en, ru = m.group(1), m.group(2)
        if "\n" in en or "\n" in ru or len(en) > 400:
            continue
        en = en.replace("\\'", "'")
        ru = ru.replace("\\'", "'")
        check_en_ru(en, ru, f"{fp.name} (no id @ {m.start()})")


def main() -> None:
    for fp in sorted(APP.glob("lesson_data*.ts")):
        scan_file(fp)
    seen: set[tuple[str, str, str]] = set()
    for kind, loc, en, ru in issues:
        key = (kind, en.strip(), ru.strip())
        if key in seen:
            continue
        seen.add(key)
        print(f"=== {kind} :: {loc}")
        print("EN:", en.strip()[:220])
        print("RU:", ru.strip()[:220])
        print()
    print("TOTAL unique:", len(seen))


if __name__ == "__main__":
    main()
