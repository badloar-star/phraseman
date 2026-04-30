# Parse lesson 29 Used to / Did use to markdown and emit TypeScript for lessonCards[29]
import json
import pathlib
import re

# Format: **Правильно (RU):** ... **Правильно (UK):** ... **Неправильно (RU):** ... etc.


def esc(s: str) -> str:
    return s.replace("\\", "\\\\").replace('"', '\\"').replace("\n", "\\n")


def clean_secret_glue(s: str) -> str:
    s = s.strip()
    s = re.split(
        r"\.(?:Продолжаем|Завершаем|Ми продовжуємо|Мы завершаем)\b",
        s,
        maxsplit=1,
        flags=re.I,
    )[0]
    s = re.sub(r"\s*---\s*$", "", s)
    return s.rstrip().strip()


def parse_blocks(md: str) -> list[dict]:
    heads = list(re.finditer(r"^###\s*(\d+)\.\s*[^\n]*$", md, re.M))
    out = []
    for i, h in enumerate(heads):
        n = int(h.group(1))
        start = h.end()
        end = heads[i + 1].start() if i + 1 < len(heads) else len(md)
        block = md[start:end]

        m = re.search(
            r"\*\*Правильно \(RU\):\*\*\s*([\s\S]*?)(?=\*\*Правильно \(UK\):\*\*)",
            block,
        )
        if not m:
            raise RuntimeError(f"Card {n}: no **Правильно (RU):**")
        pr_ru = m.group(1).strip()

        m = re.search(
            r"\*\*Правильно \(UK\):\*\*\s*([\s\S]*?)(?=\*\*Неправильно \(RU\):\*\*)",
            block,
        )
        if not m:
            raise RuntimeError(f"Card {n}: no **Правильно (UK):**")
        pr_uk = m.group(1).strip()

        m = re.search(
            r"\*\*Неправильно \(RU\):\*\*\s*([\s\S]*?)(?=\*\*Неправильно \(UK\):\*\*)",
            block,
        )
        if not m:
            raise RuntimeError(f"Card {n}: no **Неправильно (RU):**")
        wr_ru = m.group(1).strip()

        m = re.search(
            r"\*\*Неправильно \(UK\):\*\*\s*([\s\S]*?)(?=\*\*Секрет \(RU\):\*\*)",
            block,
        )
        if not m:
            raise RuntimeError(f"Card {n}: no **Неправильно (UK):**")
        wr_uk = m.group(1).strip()

        m = re.search(
            r"\*\*Секрет \(RU\):\*\*\s*([\s\S]*?)(?=\*\*Секрет \(UK\):\*\*)",
            block,
        )
        if not m:
            raise RuntimeError(f"Card {n}: no **Секрет (RU):**")
        se_ru = m.group(1).strip()

        m = re.search(r"\*\*Секрет \(UK\):\*\*\s*([\s\S]*)$", block, re.M)
        if not m:
            raise RuntimeError(f"Card {n}: no **Секрет (UK):**")
        se_uk = clean_secret_glue(m.group(1))

        out.append(
            {
                "i": n,
                "correctRu": pr_ru,
                "correctUk": pr_uk,
                "wrongRu": wr_ru,
                "wrongUk": wr_uk,
                "secretRu": se_ru,
                "secretUk": se_uk,
            }
        )
    out.sort(key=lambda x: x["i"])
    return out


def main() -> None:
    p = pathlib.Path(__file__).resolve().parent / "lesson_29_user.md"
    if not p.exists():
        raise SystemExit("Place scripts/lesson_29_user.md")
    md = p.read_text(encoding="utf-8")
    cards = parse_blocks(md)
    if len(cards) != 50:
        raise SystemExit(f"expected 50 cards, got {len(cards)}")

    lines = ["  29: {"]
    for c in cards:
        k = c["i"]
        lines += [
            f"    {k}: {{",
            f'      correctRu: "{esc(c["correctRu"])}",',
            f'      correctUk: "{esc(c["correctUk"])}",',
            f'      wrongRu: "{esc(c["wrongRu"])}",',
            f'      wrongUk: "{esc(c["wrongUk"])}",',
            f'      secretRu: "{esc(c["secretRu"])}",',
            f'      secretUk: "{esc(c["secretUk"])}"',
            "    },",
        ]
    lines.append("  },")
    out = pathlib.Path(__file__).resolve().parent / "_lesson_29_insert.fragment.txt"
    out.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print("Wrote", out, "lines", len(lines))

    jpath = pathlib.Path(__file__).resolve().parent / "lesson_29_cards.json"
    jpath.write_text(json.dumps(cards, ensure_ascii=False, indent=2), encoding="utf-8")
    print("Wrote", jpath)


if __name__ == "__main__":
    main()
