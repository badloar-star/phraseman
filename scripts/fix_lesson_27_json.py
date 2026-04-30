import json
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parent
JSON_PATH = ROOT / "lesson_27_cards.json"
OUT_INS = ROOT.parent / "app" / "_lesson_27_insert.ts"


def esc(s: str) -> str:
    return s.replace("\\", "\\\\").replace('"', '\\"').replace("\n", "\\n")


def split_ru_uk_blob(s: str) -> tuple[str, str]:
    """Split 'RU text **UK:** UK text' or 'RU **UK: UK' (user typo)."""
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
    for marker in ("Продолжаем", "Начинаем", "Мы продолжаем", "Мы завершаем"):
        i = s.find(marker)
        if i > 0:
            s = s[:i].rstrip(" .\n*")
    return s.strip()


def strip_stray_asterisks(s: str) -> str:
    """Remove trailing ** from broken markdown (e.g. '...текст.**')."""
    return re.sub(r"\*+\s*$", "", s or "").strip()


def apply_ame_patches(c: dict) -> None:
    n = c.get("i")
    if n == 9:
        c["secretRu"] = (
            "В американском английском в бытовой речи о посылке чаще говорят package. "
            "Слово parcel встречается на формах и в устойчивых сочетаниях, "
            "но в обычной речи в США package звучит естественнее."
        )
        c["secretUk"] = (
            "В американській англійській у повсякденному мовленні про посилку частіше говорять package. "
            "Слово parcel зустрічається в формах і в усталих зворотах, "
            "але в типових розмовах у США package звучить природніше."
        )
    elif n == 16:
        c["secretRu"] = (
            "В американском английском lawyer — чаще всего повседневное слово для «юриста». "
            "Attorney тоже очень часто, особенно в официальных и деловых контекстах."
        )
        c["secretUk"] = (
            "В американській англійській lawyer — зазвичай повсякденне слово для «юриста». "
            "Attorney теж дуже часто, особливо в офіційних і ділових контекстах."
        )
    elif n == 18:
        c["secretRu"] = (
            "У глагола forget формы: forget, forgot, forgotten. "
            "В American English forgotten — нормальная past participle в учебниках, новостях и деловом языке."
        )
        c["secretUk"] = (
            "У дієслова forget форми: forget, forgot, forgotten. "
            "В American English forgotten — нормальна past participle в підручниках, новинах і діловому мовленні."
        )
    elif n == 36:
        c["secretRu"] = (
            "Слово consultant (от лат. consulere) — «тот, с кем советуются». "
            "В business- и tech-английском, включая корпоративный тон в США, это нейтральный термин; "
            "в медицинском американском контексте чаще встречаются doctor, physician, specialist."
        )
        c["secretUk"] = (
            "Слово consultant (від лат. consulere) — «той, з ким радяться». "
            "У business- і tech-англійській, включно з корпоративним тоном у США, це нейтральний термін; "
            "в медичному американському контексті частіше трапляються doctor, physician, specialist."
        )
    elif n == 38:
        c["secretRu"] = (
            "Слово movie (от moving picture) в American English — привычный everyday-термин для кино. "
            "Film нередко в критике, фестивалях и в более формальном тоне."
        )
        c["secretUk"] = (
            "Слово movie (від moving picture) в American English — звичний everyday-термін для кіно. "
            "Film нерідко в критиці, фестивалях і в більш формальному тоні."
        )
    elif n == 44:
        c["secretRu"] = (
            "Drink может быть существительным и глаголом. "
            "Сочетание soft drink в American English — нейтральное «безалкогольный прохладительный напиток» (сок, газировка, чай и т.д.)."
        )
        c["secretUk"] = (
            "Drink може бути іменником і дієсловом. "
            "Сполучення soft drink в American English — нейтральне «безалкогольний холодний напій» (сік, газованка, чай тощо)."
        )


def main() -> None:
    cards: list[dict] = json.loads(JSON_PATH.read_text(encoding="utf-8"))
    for c in cards:
        c["correctRu"], c["correctUk"] = unmerge(c.get("correctRu", ""), c.get("correctUk", ""))
        c["wrongRu"], c["wrongUk"] = unmerge(c.get("wrongRu", ""), c.get("wrongUk", ""))
        c["secretRu"], c["secretUk"] = unmerge(c.get("secretRu", ""), c.get("secretUk", ""))
        for k in ("correctRu", "correctUk", "wrongRu", "wrongUk", "secretRu", "secretUk"):
            c[k] = strip_stray_asterisks(c.get(k, ""))
        c["secretRu"] = trim_essay(c.get("secretRu", ""))
        c["secretUk"] = trim_essay(c.get("secretUk", ""))
        apply_ame_patches(c)

    cards.sort(key=lambda x: x["i"])
    if len(cards) != 50:
        raise SystemExit(f"expected 50 cards, got {len(cards)}")

    JSON_PATH.write_text(json.dumps(cards, ensure_ascii=False, indent=2), encoding="utf-8")

    lines: list[str] = ["  27: {"]
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
    OUT_INS.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print("OK ->", OUT_INS)


if __name__ == "__main__":
    main()
