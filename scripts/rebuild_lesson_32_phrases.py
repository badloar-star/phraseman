# Rebuild export const LESSON_32_PHRASES from scripts/lesson_32_user.md + existing words (match by english).
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
md_path = ROOT / "scripts" / "lesson_32_user.md"
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


def _words_for_english_match(body: str, end_pos: int) -> str:
    tail = body[end_pos:]
    wk = tail.find("    words: [")
    if wk == -1:
        raise SystemExit("words: [ not found after english line")
    wstart = end_pos + wk
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
                return body[wstart:k]
    raise SystemExit("unclosed words: [")


def extract_english_to_words(body: str) -> dict[str, str]:
    en_to: dict[str, str] = {}
    # Single- or double-quoted english (e.g. apostrophe in "tomorrow's" may use double quotes in TS)
    for m in re.finditer(r"english: '((?:\\'|[^'])*)',", body):
        en = m.group(1).replace("\\'", "'").replace("\\\\", "\\")
        en_to[en] = _words_for_english_match(body, m.end())
    for m in re.finditer(r'english: "((?:\\"|[^"])*)",', body):
        en = m.group(1).replace('\\"', '"').replace("\\\\", "\\")
        en_to[en] = _words_for_english_match(body, m.end())
    return en_to


def main() -> None:
    rows = parse_md()
    text = ts_path.read_text(encoding="utf-8")
    m0 = re.search(
        r"export const LESSON_32_PHRASES: LessonPhrase\[] = \[",
        text,
    )
    if not m0:
        raise SystemExit("LESSON_32_PHRASES not found")
    start = m0.end()
    sub = text[start:]
    m_close = re.search(r"^\];", sub, re.M)
    if not m_close:
        raise SystemExit("Could not find ]; for LESSON_32_PHRASES")
    body = sub[: m_close.start()]
    en_to_words = extract_english_to_words(body)

    parts: list[str] = []
    for idx, (en, ru, uk) in enumerate(rows, start=1):
        w = en_to_words.get(en)
        if w is None:
            raise SystemExit(
                f"Missing words for english (card {idx}): {en!r}\n"
                f"Keys sample: {list(en_to_words.keys())[:5]}"
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

    new_block = "export const LESSON_32_PHRASES: LessonPhrase[] = [\n" + ",\n".join(parts) + "\n];"
    out = text[: m0.start()] + new_block + sub[m_close.end() :]
    ts_path.write_text(out, encoding="utf-8")
    print("Rebuilt LESSON_32_PHRASES: 50 phrases, order from lesson_32_user.md")


if __name__ == "__main__":
    main()
