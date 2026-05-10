"""
Скан EN↔RU на несовпадение указательных (эти/те vs this/that и наоборот).
Источники: lesson_data*.ts, arena JSON, quizzes JSON, lesson_help.tsx.
"""
from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

RU_PL = re.compile(r"(?<![а-яёa-zA-Z])(эти|те)\s+[а-яё]", re.I)
RU_SG = re.compile(
    r"(?<![а-яёa-zA-Z])(этот|эта|это|тот|та|то)\s+[а-яё]", re.I
)
SKIP_THAT = re.compile(
    r"\b(said|says|think|thinks|know|knew|believe|believed|confirmed|mentioned|replied|explained|warned|complained|reminded|announced|admit|admitted|feel|feels|hope|hopes|wish|wishes|guess|guesses|that)\s+that\s+\w",
    re.I,
)
ALLOW_MASS = re.compile(
    r"\b(this|that)\s+(day|year|time|morning|evening|night|week|month|way|moment)\b",
    re.I,
)


def check_pair(en: str, ru: str, loc: str, out: list) -> None:
    if not en or not ru or len(en) > 500:
        return
    el = en.lower()
    if SKIP_THAT.search(el):
        return
    has_these = bool(re.search(r"\b(these|those)\s+\w", el))
    has_this_that = bool(re.search(r"\b(this|that)\s+\w", el))
    if RU_PL.search(ru) and has_this_that and not has_these and not ALLOW_MASS.search(el):
        if re.search(r"\bthat\s+(he|she|it|they|we|you|i|someone|if|there)\b", el):
            return
        out.append(("RU_pl_EN_sg", loc, en.strip()[:240], ru.strip()[:240]))
    elif (
        RU_SG.search(ru)
        and re.search(r"\b(these|those)\s+\w", el)
        and not has_this_that
        and not RU_PL.search(ru)
    ):
        out.append(("RU_sg_EN_pl", loc, en.strip()[:240], ru.strip()[:240]))


def scan_lesson_ts() -> None:
    findings: list[tuple] = []
    id_pat = re.compile(r"id:\s*['\"]([^'\"]+)['\"]")

    def pair_from_chunk(chunk: str):
        for fw in (True, False):
            for q in ("'", '"'):
                if fw:
                    pat = re.compile(
                        rf"english:\s*{q}([^\\{q}]*(?:\\.[^\\{q}]*)*){q}[\s\S]{{0,12000}}?"
                        rf"russian:\s*{q}([^\\{q}]*(?:\\.[^\\{q}]*)*){q}",
                    )
                else:
                    pat = re.compile(
                        rf"russian:\s*{q}([^\\{q}]*(?:\\.[^\\{q}]*)*){q}[\s\S]{{0,12000}}?"
                        rf"english:\s*{q}([^\\{q}]*(?:\\.[^\\{q}]*)*){q}",
                    )
                m = pat.search(chunk)
                if m:
                    a, b = m.group(1), m.group(2)
                    a = a.replace("\\'", "'").replace('\\"', '"')
                    b = b.replace("\\'", "'").replace('\\"', '"')
                    return (a, b) if fw else (b, a)
        return None

    for fp in sorted((ROOT / "app").glob("lesson_data*.ts")):
        if "types" in fp.name or fp.name == "lesson_data_all.ts":
            continue
        text = fp.read_text(encoding="utf-8")
        for mid in id_pat.finditer(text):
            pid = mid.group(1)
            rest = text[mid.end() : mid.end() + 12000]
            nxt = id_pat.search(rest)
            chunk = rest if nxt is None else rest[: nxt.start()]
            p = pair_from_chunk(chunk)
            if not p or "\n" in p[0] or "\n" in p[1]:
                continue
            check_pair(p[0], p[1], f"{fp.name} id={pid}", findings)

    _print_unique(findings)


def scan_json_examples(path: Path, key_en: str, key_ru: str, label: str) -> None:
    findings: list[tuple] = []
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except Exception as e:
        print(f"# skip {path}: {e}")
        return

    def walk(obj, trail: str) -> None:
        if isinstance(obj, dict):
            en = obj.get(key_en)
            ru = obj.get(key_ru)
            if isinstance(en, str) and isinstance(ru, str):
                check_pair(en, ru, f"{label} {trail}", findings)
            for k, v in obj.items():
                walk(v, f"{trail}.{k}" if trail else k)
        elif isinstance(obj, list):
            for i, v in enumerate(obj):
                walk(v, f"{trail}[{i}]")

    walk(data, "")
    _print_unique(findings, prefix=label)


def scan_arena_json() -> None:
    findings: list[tuple] = []
    for fp in (ROOT / "assets").glob("arena_questions_*.json"):
        try:
            data = json.loads(fp.read_text(encoding="utf-8"))
        except Exception:
            continue
        for i, item in enumerate(data if isinstance(data, list) else []):
            if not isinstance(item, dict):
                continue
            en = item.get("questionEn") or item.get("english") or item.get("en")
            ru = item.get("questionRu") or item.get("russian") or item.get("ru")
            if isinstance(en, str) and isinstance(ru, str):
                check_pair(en, ru, f"{fp.name}[{i}]", findings)
        _print_unique(findings, prefix=fp.name)


def scan_quizzes() -> None:
    qdir = ROOT / "app" / "quizzes"
    if not qdir.is_dir():
        return
    findings: list[tuple] = []
    for fp in qdir.rglob("*.ts"):
        text = fp.read_text(encoding="utf-8", errors="ignore")
        # english: '...' russian: '...' in objects
        for m in re.finditer(
            r"english:\s*'([^'\\]*(?:\\.[^'\\]*)*)'[^}]{0,2000}?russian:\s*'([^'\\]*(?:\\.[^'\\]*)*)'",
            text,
            re.DOTALL,
        ):
            en, ru = m.group(1).replace("\\'", "'"), m.group(2).replace("\\'", "'")
            if "\n" in en:
                continue
            check_pair(en, ru, f"{fp.relative_to(ROOT)}", findings)
    _print_unique(findings, prefix="quizzes")


def scan_lesson_help_ts() -> None:
    fp = ROOT / "app" / "lesson_help.tsx"
    if not fp.is_file():
        return
    text = fp.read_text(encoding="utf-8")
    findings: list[tuple] = []
    # eng="..." rus={isUK ? 'uk' : 'ru'} or rus="..."
    pat1 = re.compile(
        r'eng="([^"]+)"\s+rus=\{isUK\s*\?\s*\'([^\']*)\'\s*:\s*\'([^\']*)\'\s*\}',
    )
    for m in pat1.finditer(text):
        en, _, ru = m.group(1), m.group(2), m.group(3)
        check_pair(en, ru, "lesson_help.tsx (RU)", findings)
    pat2 = re.compile(r'eng="([^"]+)"\s+rus="([^"]+)"')
    for m in pat2.finditer(text):
        en, ru = m.group(1), m.group(2)
        if ru.startswith("Якби") or ru.startswith("Вона ") or "Є " in ru[:20]:
            continue  # Ukrainian in quoted rus= is rare; skip if detect UK-heavy
        check_pair(en, ru, "lesson_help.tsx (quoted)", findings)
    _print_unique(findings, prefix="lesson_help")


def _print_unique(
    findings: list[tuple], prefix: str = ""
) -> None:
    seen: set[tuple] = set()
    for row in findings:
        if row in seen:
            continue
        seen.add(row)
        kind, loc, en, ru = row
        print(f"=== {kind} :: {prefix} :: {loc}")
        print("  EN:", en)
        print("  RU:", ru)
        print()


def main() -> None:
    print("--- lesson_data*.ts ---")
    scan_lesson_ts()
    print("--- lesson_theory_help.json (examples eng/rus — см. также lesson_help.tsx) ---")
    theory_fp = ROOT / "exports" / "lesson-theory-dump" / "lesson_theory_help.json"
    if theory_fp.is_file():
        scan_json_examples(theory_fp, "eng", "rus", "lesson_theory_help")
    else:
        print(f"# skip {theory_fp}: not found (npm run dump:lesson-content)")
    print("--- lesson_help.tsx ---")
    scan_lesson_help_ts()
    print("--- arena JSON ---")
    scan_arena_json()
    print("--- quizzes ts ---")
    scan_quizzes()


if __name__ == "__main__":
    main()
