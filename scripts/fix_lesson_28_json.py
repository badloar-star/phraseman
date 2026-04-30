import json
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parent
JSON_PATH = ROOT / "lesson_28_cards.json"
OUT_INS = ROOT.parent / "app" / "_lesson_28_insert.ts"


def esc(s: str) -> str:
    return s.replace("\\", "\\\\").replace('"', '\\"').replace("\n", "\\n")


def split_ru_uk_blob(s: str) -> tuple[str, str]:
    if not s:
        return "", ""
    m = re.split(r"\n?\*\*UK:\*\*\s*", s, maxsplit=1)
    if len(m) == 2:
        return m[0].strip(), m[1].strip()
    m2 = re.split(r"\n?\*\*UK:\s*", s, maxsplit=1)
    if len(m2) == 2:
        return m2[0].strip(), m2[1].strip()
    return s.strip(), ""


def unmerge(ru: str, uk: str) -> tuple[str, str]:
    r, u = split_ru_uk_blob(ru)
    if u:
        return r, u
    r2, u2 = split_ru_uk_blob(uk)
    if u2 and r2:
        return r2, u2
    return ru or "", uk or ""


def trim_essay(s: str) -> str:
    for marker in (
        "Продолжаем",
        "Начинаем",
        "Мы продолжаем",
        "Ми продовжуємо",
        "Мы завершаем",
    ):
        i = s.find(marker)
        if i > 0:
            s = s[:i].rstrip(" .\n*")
    return s.strip()


def strip_stray_asterisks(s: str) -> str:
    return re.sub(r"\*+\s*$", "", s or "").strip()


def apply_ame_patches(c: dict) -> None:
    """Optional: add card-specific AmE notes for lesson 28 if needed."""
    _ = c.get("i")
    return


def main() -> None:
    cards: list[dict] = json.loads(JSON_PATH.read_text(encoding="utf-8"))
    for c in cards:
        c["correctRu"], c["correctUk"] = unmerge(
            c.get("correctRu", ""), c.get("correctUk", "")
        )
        c["wrongRu"], c["wrongUk"] = unmerge(c.get("wrongRu", ""), c.get("wrongUk", ""))
        c["secretRu"], c["secretUk"] = unmerge(
            c.get("secretRu", ""), c.get("secretUk", "")
        )
        for k in (
            "correctRu",
            "correctUk",
            "wrongRu",
            "wrongUk",
            "secretRu",
            "secretUk",
        ):
            c[k] = strip_stray_asterisks(c.get(k, ""))
        c["secretRu"] = trim_essay(c.get("secretRu", ""))
        c["secretUk"] = trim_essay(c.get("secretUk", ""))
        apply_ame_patches(c)

    cards.sort(key=lambda x: x["i"])
    if len(cards) != 50:
        raise SystemExit(f"expected 50 cards, got {len(cards)}")

    JSON_PATH.write_text(json.dumps(cards, ensure_ascii=False, indent=2), encoding="utf-8")

    lines: list[str] = ["  28: {"]
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
    OUT_INS.write_text("\n".join(lines) + "\n", encoding="utf-8", newline="\n")
    print("OK ->", OUT_INS)


if __name__ == "__main__":
    main()
