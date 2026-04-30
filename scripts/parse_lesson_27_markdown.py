# Parse lesson 27 Reported Speech markdown and emit TypeScript for lessonCards[27]
import re
import json
import pathlib

# Paste full user markdown between triple quotes (from ### 1. through end of ### 50.)
MD = r"""
PASTE_MARKER
"""

def esc(s: str) -> str:
    return (
        s.replace("\\", "\\\\")
        .replace('"', '\\"')
        .replace("\n", "\\n")
    )


def parse_blocks(md: str) -> list[dict]:
    heads = list(re.finditer(r"^###\s*(\d+)\.\s*[^\n]*$", md, re.M))
    out = []
    for i, h in enumerate(heads):
        n = int(h.group(1))
        start = h.end()
        end = heads[i + 1].start() if i + 1 < len(heads) else len(md)
        block = md[start:end]
        # remove intro / filler paragraphs before first **Правильно** or **RU:**
        m_pr = re.search(
            r"\*\*Правильно\*\*\s*([\s\S]*?)(?=\*\*Неправильно\*\*|\Z)", block, re.M
        )
        if not m_pr:
            raise RuntimeError(f"Card {n}: no **Правильно**")
        pr = m_pr.group(1).strip()
        ru_pr, uk_pr = split_ru_uk(pr)

        m_wr = re.search(
            r"\*\*Неправильно\*\*\s*([\s\S]*?)(?=\*\*Секрет\*\*|\Z)", block, re.M
        )
        if not m_wr:
            raise RuntimeError(f"Card {n}: no **Неправильно**")
        wr = m_wr.group(1).strip()
        ru_wr, uk_wr = split_ru_uk(wr)

        m_se = re.search(r"\*\*Секрет\*\*\s*([\s\S]*?)(?=\n---|\Z)", block, re.M)
        if not m_se:
            m_se = re.search(r"\*\*Секрет\*\*\s*([\s\S]*)$", block, re.M)
        if not m_se:
            raise RuntimeError(f"Card {n}: no **Секрет**")
        se = m_se.group(1).strip()
        # drop essay intros accidentally included in the same card block
        se = re.split(
            r"(?=\n{2,}(?:Продолжаем|Начинаем|Мы продолжаем|Мы завершаем)\b)",
            se,
            1,
            flags=re.I,
        )[0].strip()
        se = re.split(r"\n(?=[A-ZА-ЯЁЄІЇҐ#])", se)[0].strip() if se else se
        ru_se, uk_se = split_ru_uk(se)

        out.append(
            {
                "i": n,
                "correctRu": ru_pr,
                "correctUk": uk_pr,
                "wrongRu": ru_wr,
                "wrongUk": uk_wr,
                "secretRu": ru_se,
                "secretUk": uk_se,
            }
        )
    out.sort(key=lambda x: x["i"])
    return out


def split_ru_uk(chunk: str) -> tuple[str, str]:
    """RU block then **UK:** UK block (with or without newline before **UK:**)."""
    chunk = re.sub(r"</?user_query>", "", chunk, flags=re.I).strip()
    ukm = re.search(r"(?:^|\n)\*\*UK:\*\*\s*", chunk)
    if ukm:
        ru = chunk[: ukm.start()].strip()
        uk = chunk[ukm.end() :].strip()
        return ru, uk
    return chunk, chunk


def main():
    p = pathlib.Path(__file__).resolve().parent / "lesson_27_user.md"
    if p.exists():
        md = p.read_text(encoding="utf-8")
    elif "PASTE_MARKER" not in MD:
        md = MD
    else:
        raise SystemExit("Place scripts/lesson_27_user.md or set MD in script")
    cards = parse_blocks(md)
    if len(cards) != 50:
        raise SystemExit(f"expected 50 cards, got {len(cards)}")

    lines = ["  27: {"]
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
    out = pathlib.Path(__file__).resolve().parent.parent / "app" / "_lesson_27_insert.ts"
    out.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print("Wrote", out, "lines", len(lines))

    jpath = pathlib.Path(__file__).resolve().parent / "lesson_27_cards.json"
    jpath.write_text(json.dumps(cards, ensure_ascii=False, indent=2), encoding="utf-8")
    print("Wrote", jpath)


if __name__ == "__main__":
    main()
