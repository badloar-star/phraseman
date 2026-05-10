"""Audit lesson phrase counts in lesson_data files (lessons 1–32)."""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
APP = ROOT / "app"


def extract_phrase_blocks(text: str) -> dict[int, tuple[str, str]]:
    """lesson_num -> (const_name, block_text inside [...] )"""
    out: dict[int, tuple[str, str]] = {}
    for m in re.finditer(
        r"export const (LESSON_(\d+)_PHRASES): LessonPhrase\[\] = \[",
        text,
    ):
        n = int(m.group(2))
        name = m.group(1)
        i = m.end() - 1
        assert text[i] == "[", f"expected [ at {i}"
        depth = 1
        i += 1
        start = i
        while i < len(text) and depth > 0:
            c = text[i]
            if c == "[":
                depth += 1
            elif c == "]":
                depth -= 1
                if depth == 0:
                    block = text[start:i]
                    out[n] = (name, block)
                    break
            i += 1
    return out


def count_phrases_in_block(block: str) -> int:
    """Each phrase has exactly one `english:` (multiline or minified `,english:`)."""
    return len(re.findall(r"\benglish:", block))


def main() -> None:
    files = [
        APP / "lesson_data_1_8.ts",
        APP / "lesson_data_9_16.ts",
        APP / "lesson_data_17_24.ts",
        APP / "lesson_data_25_32.ts",
    ]
    phrases: dict[int, dict] = {}
    for fp in files:
        if not fp.exists():
            continue
        text = fp.read_text(encoding="utf-8")
        for n, (name, block) in extract_phrase_blocks(text).items():
            c = count_phrases_in_block(block)
            phrases[n] = {"file": fp.name, "const": name, "phrases": c}

    print("=== Фразы по lesson_data (уроки 1–32) ===\n")
    issues: list[str] = []
    for L in range(1, 33):
        p = phrases.get(L, {})
        pc = p.get("phrases", -1)
        if pc < 0:
            issues.append(f"Урок {L}: нет блока LESSON_*_PHRASES")
            print(f"{L:2d}  фраз: ???  MISSING     {p.get('file', '')}")
        else:
            print(f"{L:2d}  фраз: {pc:3d}              {p.get('file', '?')}")

    if issues:
        print("\n--- Проблемы ---")
        for x in issues:
            print(" -", x)
    else:
        print("\nВсе 32 урока найдены в файлах lesson_data.")


if __name__ == "__main__":
    main()
