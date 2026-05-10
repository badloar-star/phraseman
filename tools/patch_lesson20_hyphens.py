"""Strip lesson 20 hyphen slot markers from lesson_data_17_24.ts (english + words[]).

Also normalizes French-quote EN snippets inside lessonCards.generated.ts hint strings."""
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PATH = ROOT / "app" / "lesson_data_17_24.ts"
CARDS_PATH = ROOT / "app" / "lesson_cards" / "lessonCards.generated.ts"


def fix_english_inner(inner: str) -> str:
    inner = inner.replace(" - ", " ")
    inner = re.sub(r"^-\s+", "", inner)
    inner = re.sub(r"\s+-\s+", " ", inner)
    inner = re.sub(r"\s{2,}", " ", inner).strip()
    return inner


def fix_english_match(m: re.Match[str]) -> str:
    q = m.group(1)
    inner = m.group(2)
    return f"english:{q}{fix_english_inner(inner)}{q}"


def normalize_fr_quote_english(s: str) -> str:
    """Inside «...», strip legacy gap-fill markers (` - `, leading `- `)."""

    def repl(m: re.Match[str]) -> str:
        inner = fix_english_inner(m.group(1))
        return f"«{inner}»"

    return re.sub(r"«([^»]+)»", repl, s)


def main() -> None:
    text = PATH.read_text(encoding="utf-8")
    start = text.index("export const LESSON_20_PHRASES")
    end = text.index("export const LESSON_20_VOCABULARY")
    pre, block, post = text[:start], text[start:end], text[end:]

    block2 = re.sub(r"english:(')((?:[^'\\]|\\.)*)'", fix_english_match, block)
    block2 = re.sub(r'english:(")((?:[^"\\]|\\.)*)"', fix_english_match, block2)

    hyphen_slot = re.compile(
        r"\{text:'-',correct:'-',distractors:\s*\[[^\]]*\]\s*\}\s*,?"
    )
    block3 = hyphen_slot.sub("", block2)
    block3 = re.sub(r",\s*,+", ",", block3)
    block3 = re.sub(r"\[\s*,", "[", block3)
    block3 = re.sub(r",\s*\]", "]", block3)
    block3 = re.sub(r"words:\[\s*,", "words:[", block3)

    PATH.write_text(pre + block3 + post, encoding="utf-8")
    print("patched", PATH.relative_to(ROOT))

    if CARDS_PATH.is_file():
        ct = CARDS_PATH.read_text(encoding="utf-8")
        CARDS_PATH.write_text(normalize_fr_quote_english(ct), encoding="utf-8")
        print("patched", CARDS_PATH.relative_to(ROOT))


if __name__ == "__main__":
    main()
