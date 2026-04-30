# Rebuild export const LESSON_31_PHRASES from scripts/lesson_31_user.md + existing words (match by english).
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
md_path = ROOT / "scripts" / "lesson_31_user.md"
ts_path = ROOT / "app" / "lesson_data_25_32.ts"


def esc_t(s: str) -> str:
    return s.replace("\\", "\\\\").replace("'", "\\'")


def parse_md() -> list[tuple[str, str, str]]:
    """Return list of 50 (english, russian, ukrainian) in card order; english from ### line."""
    md = md_path.read_text(encoding="utf-8")
    heads = list(re.finditer(r"^###\s*(\d+)\.\s*(.+)$", md, re.M))
    out: list[tuple[str, str, str]] = []
    for i, h in enumerate(heads):
        n = int(h.group(1))
        en = h.group(2).strip()
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
        out.append((en, m.group(1).strip(), m.group(2).strip()))
    if len(out) != 50:
        raise SystemExit(f"expected 50 cards from md, got {len(out)}")
    return out


def unescape_ts_string(s: str) -> str:
    return s.replace("\\'", "'").replace("\\\\", "\\")


def extract_english_to_words(body: str) -> dict[str, str]:
    """Map english sentence -> '    words: ...,' block (incl. leading + trailing newline/comma)."""
    en_to: dict[str, str] = {}
    for m in re.finditer(
        r"english: '((?:\\'|[^'])*)',",
        body,
    ):
        en = m.group(1).replace("\\'", "'").replace("\\\\", "\\")
        tail = body[m.end() :]
        wk = tail.find("    words: [")
        if wk == -1:
            continue
        wstart = m.end() + wk
        i = wstart + len("    words: ")
        if i >= len(body) or body[i] != "[":
            raise SystemExit("words: not followed by [")
        depth = 0
        for j in range(i, len(body)):
            c = body[j]
            if c == "[":
                depth += 1
            elif c == "]":
                depth -= 1
                if depth == 0:
                    k = j + 1
                    if k < len(body) and body[k] == ",":
                        k += 1
                    if k < len(body) and body[k] == "\n":
                        k += 1
                    en_to[en] = body[wstart:k]
                    break
    return en_to


def main() -> None:
    rows = parse_md()
    text = ts_path.read_text(encoding="utf-8")
    m0 = re.search(
        r"export const LESSON_31_PHRASES: LessonPhrase\[] = \[",
        text,
    )
    if not m0:
        raise SystemExit("LESSON_31_PHRASES not found")
    start = m0.end()
    sub = text[start:]
    m_close = re.search(r"^\];", sub, re.M)
    if not m_close:
        raise SystemExit("Could not find ]; for LESSON_31_PHRASES")
    body = sub[: m_close.start()]
    en_to_words = extract_english_to_words(body)

    parts: list[str] = []
    for idx, (en, ru, uk) in enumerate(rows, start=1):
        w = en_to_words.get(en)
        if w is None:
            raise SystemExit(
                f"Missing words for english (card {idx}): {en!r}\n"
                f"Have {len(en_to_words)} keys (sample: {list(en_to_words.keys())[:3]})"
            )
        parts.append(
            "  {\n"
            f"    id: {idx},\n"
            f"    english: '{esc_t(en)}',\n"
            f"    russian: '{esc_t(ru)}',\n"
            f"    ukrainian: '{esc_t(uk)}',\n"
            f"{w}"
            "  }"
        )

    new_block = "export const LESSON_31_PHRASES: LessonPhrase[] = [\n" + ",\n".join(parts) + "\n];"
    out = text[: m0.start()] + new_block + sub[m_close.end() :]
    ts_path.write_text(out, encoding="utf-8")
    print("Rebuilt LESSON_31_PHRASES: 50 phrases, order from lesson_31_user.md")


if __name__ == "__main__":
    main()
