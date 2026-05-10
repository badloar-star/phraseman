"""Match id + english + russian in order; flag plural RU dem vs EN this/that."""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def _pair_from_chunk(chunk: str, forward: bool):
    """forward: english then russian; else russian then english."""
    for q in ("'", '"'):
        if forward:
            pat = re.compile(
                rf"english:\s*{q}([^\\{q}]*(?:\\.[^\\{q}]*)*){q}[\s\S]{{0,12000}}?"
                rf"russian:\s*{q}([^\\{q}]*(?:\\.[^\\{q}]*)*){q}",
                re.MULTILINE,
            )
        else:
            pat = re.compile(
                rf"russian:\s*{q}([^\\{q}]*(?:\\.[^\\{q}]*)*){q}[\s\S]{{0,12000}}?"
                rf"english:\s*{q}([^\\{q}]*(?:\\.[^\\{q}]*)*){q}",
                re.MULTILINE,
            )
        m = pat.search(chunk)
        if m:
            a, b = m.group(1), m.group(2)
            a = a.replace("\\'", "'").replace('\\"', '"')
            b = b.replace("\\'", "'").replace('\\"', '"')
            return (a, b) if forward else (b, a)
    return None


def extract_phrases(path: Path):
    text = path.read_text(encoding="utf-8")
    id_pat = re.compile(r"id:\s*['\"]([^'\"]+)['\"]")
    for mid in id_pat.finditer(text):
        pid = mid.group(1)
        rest = text[mid.end() : mid.end() + 12000]
        nxt = id_pat.search(rest)
        chunk = rest if nxt is None else rest[: nxt.start()]
        pair = _pair_from_chunk(chunk, True) or _pair_from_chunk(chunk, False)
        if pair:
            yield pid, pair[0], pair[1]


def main() -> None:
    ru_pl = re.compile(
        r"(?<![а-яёa-zA-Z])(эти|те)\s+[а-яё]", re.IGNORECASE
    )
    ru_sg = re.compile(
        r"(?<![а-яёa-zA-Z])(этот|эта|это|тот|та|то)\s+[а-яё]", re.IGNORECASE
    )
    skip_that_clause = re.compile(
        r"\b(said|think|know|knew|believe|confirmed|mentioned|replied|explained|warned|complained|reminded|announced)\s+that\s+",
        re.I,
    )
    app = ROOT / "app"
    for fp in sorted(app.glob("lesson_data*.ts")):
        if "types" in fp.name or fp.name == "lesson_data_all.ts":
            continue
        for pid, en, ru in extract_phrases(fp):
            if "\n" in en or "\n" in ru:
                continue
            el = en.lower()
            if skip_that_clause.search(el):
                continue
            has_these = bool(re.search(r"\b(these|those)\s+\w", el))
            has_this_that = bool(re.search(r"\b(this|that)\s+\w", el))
            allow_mass = bool(
                re.search(
                    r"\b(this|that)\s+(day|year|time|morning|evening|night|week|month|way|moment)\b",
                    el,
                )
            )
            if ru_pl.search(ru) and has_this_that and not has_these and not allow_mass:
                print(f"{fp.name}\t{pid}")
                print(f"  EN: {en[:200]}")
                print(f"  RU: {ru[:200]}")
                print()
            if (
                ru_sg.search(ru)
                and re.search(r"\b(these|those)\s+\w", el)
                and not has_this_that
                and not ru_pl.search(ru)
            ):
                print(f"{fp.name}\t{pid}\t[RU_sg_EN_pl]")
                print(f"  EN: {en[:200]}")
                print(f"  RU: {ru[:200]}")
                print()


if __name__ == "__main__":
    main()
