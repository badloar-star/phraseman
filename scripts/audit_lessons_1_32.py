"""Cross-check lesson phrase counts vs lesson_cards_data for lessons 1-32."""
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
        # Position after the opening `[` of the array; match its closing `]`
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


def count_cards_per_lesson() -> dict[int, int | str]:
    path = APP / "lesson_cards_data.ts"
    text = path.read_text(encoding="utf-8")
    if "export const lessonCards" not in text:
        return {}
    m = re.search(r"export const lessonCards:[^=]+=\s*\{", text)
    if not m:
        return {}
    start = m.end() - 1
    depth = 0
    i = start
    while i < len(text):
        c = text[i]
        if c == "{":
            depth += 1
        elif c == "}":
            depth -= 1
            if depth == 0:
                blob = text[start : i + 1]
                break
        i += 1
    else:
        return {}

    out: dict[int, int | str] = {}
    for L in range(1, 33):
        mm = re.search(rf"^  {L}: \{{", blob, re.M)
        if not mm:
            out[L] = "no lesson key"
            continue
        a = mm.start()
        if L < 32:
            mm2 = re.search(rf"^  {L + 1}: \{{", blob[mm.end() :], re.M)
            chunk = blob[a : a + mm.end() + mm2.start()] if mm2 else blob[a:]
        else:
            chunk = blob[a:]
        keys = [int(x) for x in re.findall(r"^    (\d+): \{\s*$", chunk, re.M)]
        if not keys:
            out[L] = 0
            continue
        mx, mn = max(keys), min(keys)
        if mn != 1 or len(set(keys)) != mx:
            out[L] = f"non-contiguous keys {mn}..{mx} (count {len(set(keys))})"
        else:
            out[L] = mx
    return out


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

    cards = count_cards_per_lesson()

    print("=== Сверка: число фраз (lesson_data) vs карточек (lesson_cards_data) ===\n")
    issues: list[str] = []
    for L in range(1, 33):
        p = phrases.get(L, {})
        pc = p.get("phrases", -1)
        cc = cards.get(L, -1)
        if isinstance(cc, str):
            issues.append(f"Урок {L}: карточки — {cc}")
            row = f"{L:2d}  фраз: {pc:3d}  карточек: {cc!s}  ({p.get('file', '?')})"
        else:
            ok = pc == cc
            mark = "OK" if ok else "РАСХОЖДЕНИЕ"
            if not ok:
                issues.append(f"Урок {L}: фраз {pc}, карточек {cc}")
            row = f"{L:2d}  фраз: {pc:3d}  карточек: {cc:3d}  {mark:12s}  {p.get('file', 'MISSING')}"
        print(row)

    if issues:
        print("\n--- Проблемы ---")
        for x in issues:
            print(" -", x)
    else:
        print("\nВсе 32 урока: количество фраз и карточек совпадает.")


if __name__ == "__main__":
    main()
