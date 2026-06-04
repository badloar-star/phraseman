from __future__ import annotations

import re
from pathlib import Path


PHRASE_FILE = Path("exports/venga-phrase-packs/first-200-a1-everyday-review.md")

OVERRIDES: dict[str, str] = {
    "I am waiting for a friend": "I am waiting — я жду; for a friend — друга",
    "You are right": "You are right — ты прав",
    "You are wrong": "You are wrong — ты не прав",
    "Are you ready?": "Are you ready? — ты готов?",
    "Are you at home?": "Are you at home? — ты дома?",
    "Are you busy?": "Are you busy? — ты занят?",
    "Why are you laughing?": "Why are you laughing? — почему ты смеёшься?",
    "Why are you sad?": "Why are you sad? — почему ты грустный?",
    "Why are you late?": "Why are you late? — почему ты опоздал?",
    "Why are you here?": "Why are you here? — почему ты здесь?",
    "Why are you quiet?": "Why are you quiet? — почему ты молчишь?",
    "Why are we waiting?": "Why are we waiting? — почему мы ждём?",
    "Why is she crying?": "Why is she crying? — почему она плачет?",
    "How much time do we have?": "How much time — сколько времени; do we have — у нас есть",
    "Can I have some water?": "Can I have — можно мне; some water — воды",
    "Sorry, I am late": "Sorry — извини; I am late — я опоздал",
    "Sorry, I am busy": "Sorry — извини; I am busy — я занят",
    "It's okay": "It's okay — ничего страшного",
    "What is your name?": "What is your name? — как тебя зовут?",
    "How are you?": "How are you? — как дела?",
}


def clean_breakdown(ru: str, en: str, breakdown: str) -> str:
    if en in OVERRIDES:
        return OVERRIDES[en]
    text = breakdown
    text = text.replace("Are — есть", "Are — связка")
    text = text.replace("am — есть", "am — связка")
    text = text.replace("are — есть", "are — связка")
    text = text.replace("is — есть", "is — связка")
    text = text.replace("will — будешь", "will — показатель будущего")
    text = text.replace("will — будет", "will — показатель будущего")
    text = text.replace("will — буду", "will — показатель будущего")

    if en.startswith("I have a ") or en.startswith("I have an ") or en == "I have time" or en == "I have money":
        tail_en = en.removeprefix("I have ").strip()
        tail_ru = ru.removeprefix("У меня есть").strip()
        return f"I have — у меня есть; {tail_en} — {tail_ru}"
    if en.startswith("I don't have "):
        tail_en = en.removeprefix("I don't have ").strip()
        tail_ru = ru.removeprefix("У меня нет").strip()
        return f"I don't have — у меня нет; {tail_en} — {tail_ru}"
    if en.startswith("I have to "):
        tail_en = en.removeprefix("I have to ").strip()
        tail_ru = ru.removeprefix("Мне нужно").strip()
        return f"I have to — мне нужно; {tail_en} — {tail_ru}"
    if en.startswith("I need "):
        tail_en = en.removeprefix("I need ").strip()
        tail_ru = re.sub(r"^Мне\s+(нужен|нужна|нужно)\s*", "", ru).strip()
        need_ru = "мне " + re.search(r"Мне\s+(нужен|нужна|нужно)", ru).group(1)
        return f"I need — {need_ru}; {tail_en} — {tail_ru}"
    if en.startswith("I like "):
        tail_en = en.removeprefix("I like ").strip()
        tail_ru = ru.removeprefix("Мне нравится").strip()
        return f"I like — мне нравится; {tail_en} — {tail_ru}"
    if en in {"I am cold", "I am hot"}:
        return f"{en} — {ru}"
    if en.startswith("Can I have "):
        tail_en = en.removeprefix("Can I have ").strip()
        tail_ru = ru.removeprefix("Можно мне").strip()
        return f"Can I have — можно мне; {tail_en} — {tail_ru}"

    text = text.replace("I — мне; ", "")
    text = text.replace("I — у меня; ", "")
    text = text.replace("You — ты; are — связка; ", "You are — ты ")
    text = text.replace("They — они; are — связка; ", "They are — они ")
    text = text.replace("This — это; is — связка; ", "This is — это; ")
    text = text.replace("It — это; is — связка; ", "It is — это; ")
    text = text.replace("That — это; sounds —", "That sounds — это звучит;")
    text = text.replace("It — это; looks —", "It looks — это выглядит;")
    text = text.replace("Everything — всё; is — связка; ", "Everything is — всё ")
    text = text.replace("Where — где; is — связка; ", "Where is — где; ")
    text = text.replace("When — когда; is — связка; ", "When is — когда; ")
    text = text.replace("Why — почему; are — связка; ", "Why are — почему; ")
    text = text.replace("Why — почему; is — связка; ", "Why is — почему; ")
    text = text.replace("How — как; are — связка; you — ты", "How are you — как дела")
    text = text.replace("How old — сколько лет; are — связка; you — тебе", "How old are you — сколько тебе лет")
    text = text.replace("How many — сколько; people — людей; are — связка; here — здесь", "How many people — сколько людей; are here — здесь")
    text = text.replace("How much — сколько; is — связка; it — это", "How much is it — сколько это стоит")
    text = text.replace("What time — сколько времени; is — связка; it — это", "What time is it — сколько времени")
    text = text.replace("What — какое; is — связка; your name — твоё имя", "What is your name — как тебя зовут")
    text = text.replace("Can — можно; I — я; ", "Can I — можно; ")
    text = text.replace("Can — могу; I — я; ", "Can I — могу; ")
    return text


def main() -> None:
    source = PHRASE_FILE.read_text(encoding="utf-8")
    out_lines: list[str] = []
    pattern = re.compile(r"^(\d+)\.\s+(.+?)\s+\|\s+(.+?)\s+\|\s+(.+?)\s+\|\s+(.+)$")
    for line in source.splitlines():
        match = pattern.match(line.strip())
        if not match:
            out_lines.append(line)
            continue
        index, ru, en, ipa, breakdown = match.groups()
        out_lines.append(f"{index}. {ru} | {en} | {ipa} | {clean_breakdown(ru, en, breakdown)}")
    PHRASE_FILE.write_text("\n".join(out_lines) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
