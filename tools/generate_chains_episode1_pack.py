#!/usr/bin/env python3
"""Create the first CHAIN episode phrase pack and IPA rows."""

from __future__ import annotations

import json
import time
import urllib.request
from pathlib import Path
from typing import Any


OUT = Path("exports/chains/episode1")
MODEL = "gpt-4o-mini"


CHAINS: list[list[tuple[str, str]]] = [
    [
        ("I missed the train.", "Я опоздал на поезд."),
        ("I missed the train this morning.", "Я опоздал на поезд этим утром."),
        ("I missed the train this morning because of traffic.", "Я опоздал на поезд этим утром из-за пробок."),
        ("I missed the train this morning because of heavy traffic.", "Я опоздал на поезд этим утром из-за сильных пробок."),
    ],
    [
        ("She found the receipt.", "Она нашла чек."),
        ("She found the receipt in her bag.", "Она нашла чек в сумке."),
        ("She found the receipt in her bag after dinner.", "Она нашла чек в сумке после ужина."),
        ("She found the receipt in her bag after dinner accidentally.", "Она случайно нашла чек в сумке после ужина."),
    ],
    [
        ("We sent a reminder.", "Мы отправили напоминание."),
        ("We sent a reminder to the group.", "Мы отправили напоминание в группу."),
        ("We sent a reminder to the group before noon.", "Мы отправили напоминание в группу до полудня."),
        ("We sent a reminder to the group before noon politely.", "Мы вежливо отправили напоминание в группу до полудня."),
    ],
    [
        ("He forgot the password.", "Он забыл пароль."),
        ("He forgot the password for his account.", "Он забыл пароль от своего аккаунта."),
        ("He forgot the password for his account last night.", "Он забыл пароль от своего аккаунта прошлой ночью."),
        ("He forgot the password for his account completely.", "Он полностью забыл пароль от своего аккаунта."),
    ],
    [
        ("They booked a table.", "Они забронировали столик."),
        ("They booked a table at the restaurant.", "Они забронировали столик в ресторане."),
        ("They booked a table at the restaurant for Friday.", "Они забронировали столик в ресторане на пятницу."),
        ("They booked a table at the restaurant for Friday in advance.", "Они заранее забронировали столик в ресторане на пятницу."),
    ],
    [
        ("I cancelled the trip.", "Я отменил поездку."),
        ("I cancelled the trip because of weather.", "Я отменил поездку из-за погоды."),
        ("I cancelled the trip because of bad weather.", "Я отменил поездку из-за плохой погоды."),
        ("I cancelled the trip because of bad weather yesterday.", "Я вчера отменил поездку из-за плохой погоды."),
    ],
    [
        ("She fixed the mistake.", "Она исправила ошибку."),
        ("She fixed the mistake in the report.", "Она исправила ошибку в отчёте."),
        ("She fixed the mistake in the report before sending it.", "Она исправила ошибку в отчёте перед отправкой."),
        ("She fixed the mistake in the report before sending it quickly.", "Она быстро исправила ошибку в отчёте перед отправкой."),
    ],
    [
        ("We saved the document.", "Мы сохранили документ."),
        ("We saved the document on the laptop.", "Мы сохранили документ на ноутбуке."),
        ("We saved the document on the laptop after editing.", "Мы сохранили документ на ноутбуке после редактирования."),
        ("We saved the document on the laptop after editing carefully.", "Мы внимательно сохранили документ на ноутбуке после редактирования."),
    ],
    [
        ("He lost his keys.", "Он потерял ключи."),
        ("He lost his keys near the door.", "Он потерял ключи у двери."),
        ("He lost his keys near the door after work.", "Он потерял ключи у двери после работы."),
        ("He lost his keys near the door after work again.", "Он снова потерял ключи у двери после работы."),
    ],
    [
        ("They offered help.", "Они предложили помощь."),
        ("They offered help to their neighbor.", "Они предложили помощь своему соседу."),
        ("They offered help to their neighbor with boxes.", "Они предложили соседу помощь с коробками."),
        ("They offered help to their neighbor with boxes kindly.", "Они любезно предложили соседу помощь с коробками."),
    ],
    [
        ("I answered the question.", "Я ответил на вопрос."),
        ("I answered the question during the lesson.", "Я ответил на вопрос во время урока."),
        ("I answered the question during the lesson without help.", "Я ответил на вопрос во время урока без помощи."),
        ("I answered the question during the lesson without help confidently.", "Я уверенно ответил на вопрос во время урока без помощи."),
    ],
    [
        ("She prepared notes.", "Она подготовила заметки."),
        ("She prepared notes for the meeting.", "Она подготовила заметки для встречи."),
        ("She prepared notes for the meeting in the morning.", "Она подготовила заметки для встречи утром."),
        ("She prepared notes for the meeting in the morning carefully.", "Она внимательно подготовила заметки для встречи утром."),
    ],
    [
        ("We checked the schedule.", "Мы проверили расписание."),
        ("We checked the schedule on the website.", "Мы проверили расписание на сайте."),
        ("We checked the schedule on the website before leaving.", "Мы проверили расписание на сайте перед выходом."),
        ("We checked the schedule on the website before leaving twice.", "Мы дважды проверили расписание на сайте перед выходом."),
    ],
    [
        ("He ordered a package.", "Он заказал посылку."),
        ("He ordered a package from the store.", "Он заказал посылку из магазина."),
        ("He ordered a package from the store last week.", "Он заказал посылку из магазина на прошлой неделе."),
        ("He ordered a package from the store last week online.", "Он заказал посылку из магазина онлайн на прошлой неделе."),
    ],
    [
        ("They waited outside.", "Они ждали снаружи."),
        ("They waited outside the building.", "Они ждали снаружи у здания."),
        ("They waited outside the building for ten minutes.", "Они ждали снаружи у здания десять минут."),
        ("They waited outside the building for ten minutes patiently.", "Они терпеливо ждали снаружи у здания десять минут."),
    ],
    [
        ("I moved the meeting.", "Я перенёс встречу."),
        ("I moved the meeting to Monday.", "Я перенёс встречу на понедельник."),
        ("I moved the meeting to Monday after the call.", "Я перенёс встречу на понедельник после звонка."),
        ("I moved the meeting to Monday after the call immediately.", "Я сразу перенёс встречу на понедельник после звонка."),
    ],
    [
        ("She joined the call.", "Она подключилась к звонку."),
        ("She joined the call from home.", "Она подключилась к звонку из дома."),
        ("She joined the call from home after lunch.", "Она подключилась к звонку из дома после обеда."),
        ("She joined the call from home after lunch on time.", "Она вовремя подключилась к звонку из дома после обеда."),
    ],
    [
        ("We sent the invoice.", "Мы отправили счёт."),
        ("We sent the invoice to the customer.", "Мы отправили счёт клиенту."),
        ("We sent the invoice to the customer by email.", "Мы отправили счёт клиенту по электронной почте."),
        ("We sent the invoice to the customer by email today.", "Мы сегодня отправили счёт клиенту по электронной почте."),
    ],
    [
        ("He cleaned the apartment.", "Он убрал квартиру."),
        ("He cleaned the apartment before guests.", "Он убрал квартиру перед гостями."),
        ("He cleaned the apartment before guests arrived.", "Он убрал квартиру до прихода гостей."),
        ("He cleaned the apartment before guests arrived quickly.", "Он быстро убрал квартиру до прихода гостей."),
    ],
    [
        ("They paid the bill.", "Они оплатили счёт."),
        ("They paid the bill at the cafe.", "Они оплатили счёт в кафе."),
        ("They paid the bill at the cafe with a card.", "Они оплатили счёт в кафе картой."),
        ("They paid the bill at the cafe with a card together.", "Они вместе оплатили счёт в кафе картой."),
    ],
    [
        ("I borrowed a charger.", "Я одолжил зарядку."),
        ("I borrowed a charger from a friend.", "Я одолжил зарядку у друга."),
        ("I borrowed a charger from a friend at school.", "Я одолжил зарядку у друга в школе."),
        ("I borrowed a charger from a friend at school temporarily.", "Я временно одолжил зарядку у друга в школе."),
    ],
    [
        ("She returned the book.", "Она вернула книгу."),
        ("She returned the book to the library.", "Она вернула книгу в библиотеку."),
        ("She returned the book to the library before closing.", "Она вернула книгу в библиотеку до закрытия."),
        ("She returned the book to the library before closing quietly.", "Она тихо вернула книгу в библиотеку до закрытия."),
    ],
    [
        ("We accepted the invitation.", "Мы приняли приглашение."),
        ("We accepted the invitation to the party.", "Мы приняли приглашение на вечеринку."),
        ("We accepted the invitation to the party this weekend.", "Мы приняли приглашение на вечеринку в эти выходные."),
        ("We accepted the invitation to the party this weekend happily.", "Мы с радостью приняли приглашение на вечеринку в эти выходные."),
    ],
    [
        ("He checked the weather.", "Он проверил погоду."),
        ("He checked the weather before the walk.", "Он проверил погоду перед прогулкой."),
        ("He checked the weather before the walk on his phone.", "Он проверил погоду перед прогулкой на телефоне."),
        ("He checked the weather before the walk on his phone carefully.", "Он внимательно проверил погоду перед прогулкой на телефоне."),
    ],
    [
        ("They packed the backpack.", "Они собрали рюкзак."),
        ("They packed the backpack for the hike.", "Они собрали рюкзак для похода."),
        ("They packed the backpack for the hike the night before.", "Они собрали рюкзак для похода накануне вечером."),
        ("They packed the backpack for the hike the night before carefully.", "Они внимательно собрали рюкзак для похода накануне вечером."),
    ],
]


def load_env_file(start: Path) -> dict[str, str]:
    env_path = next((folder / ".env.local" for folder in [start.resolve(), *start.resolve().parents] if (folder / ".env.local").exists()), None)
    values: dict[str, str] = {}
    if not env_path:
        return values
    for line in env_path.read_text(encoding="utf-8-sig", errors="ignore").splitlines():
        if not line.strip() or line.lstrip().startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        values[key.strip()] = value.strip().strip('"').strip("'")
    return values


def write_json(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def chat_ipa(api_key: str, rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    prompt = {
        "task": "Add General American IPA and direct visual anchor keywords for a chain-method English lesson.",
        "rules": [
            "Return strict JSON: {\"rows\":[...]}",
            "Keep same index, english, russian.",
            "ipa must be readable General American IPA, no slashes.",
            "visual_anchor must be 2-5 concrete objects/actions that MUST be visible on screen for background approval.",
            "visual_queries must be 4 short stock-video search queries, each concrete and literal.",
        ],
        "rows": rows,
    }
    payload = json.dumps(
        {
            "model": MODEL,
            "temperature": 0.1,
            "response_format": {"type": "json_object"},
            "messages": [
                {"role": "system", "content": "You are a strict English pronunciation and stock-video visual-anchor editor. Output JSON only."},
                {"role": "user", "content": json.dumps(prompt, ensure_ascii=False)},
            ],
        },
        ensure_ascii=False,
    ).encode("utf-8")
    request = urllib.request.Request(
        "https://api.openai.com/v1/chat/completions",
        data=payload,
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=240) as response:
        parsed = json.loads(response.read().decode("utf-8"))
    return json.loads(parsed["choices"][0]["message"]["content"])["rows"]


def main() -> int:
    env = load_env_file(Path.cwd())
    api_key = env.get("OPENAI_API_KEY")
    rows: list[dict[str, Any]] = []
    for chain_index, chain in enumerate(CHAINS, start=1):
        for step, (english, russian) in enumerate(chain, start=1):
            rows.append({"index": len(rows) + 1, "chain": chain_index, "step": step, "english": english, "russian": russian})

    if api_key:
        enriched: list[dict[str, Any]] = []
        for start in range(0, len(rows), 25):
            chunk = rows[start : start + 25]
            print(f"[chains-pack] IPA/anchors {chunk[0]['index']:03d}-{chunk[-1]['index']:03d}", flush=True)
            enriched.extend(chat_ipa(api_key, chunk))
            time.sleep(0.5)
        by_index = {int(item["index"]): item for item in enriched}
        for row in rows:
            item = by_index[int(row["index"])]
            row["ipa"] = str(item["ipa"]).strip().strip("/")
            row["visual_anchor"] = item["visual_anchor"]
            row["visual_queries"] = item["visual_queries"]
    else:
        for row in rows:
            row["ipa"] = ""
            row["visual_anchor"] = [row["english"]]
            row["visual_queries"] = [row["english"]]

    errors: list[str] = []
    if len(rows) != 100:
        errors.append(f"expected 100, got {len(rows)}")
    if any("ОПУСТ" in row["russian"].upper() for row in rows):
        errors.append("bad train translation typo")
    seen = set()
    for row in rows:
        key = row["english"].casefold()
        if key in seen:
            errors.append(f"duplicate {row['english']}")
        seen.add(key)
        if not row.get("ipa"):
            errors.append(f"missing IPA {row['index']}")
        if not row.get("visual_anchor"):
            errors.append(f"missing anchor {row['index']}")
    OUT.mkdir(parents=True, exist_ok=True)
    write_json(OUT / "phrase_rows.json", rows)
    write_json(OUT / "validation.json", {"error_count": len(errors), "errors": errors})
    lines = ["# CHAINS Episode 1 Phrase Pack", ""]
    for row in rows:
        lines.append(f"{row['index']:03d}. {row['english'].upper()} — {row['russian'].upper()} — /{row['ipa']}/ — anchors: {', '.join(map(str, row['visual_anchor']))}")
    (OUT / "review.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(json.dumps({"rows": len(rows), "errors": len(errors), "out": OUT.as_posix()}, ensure_ascii=False, indent=2))
    if errors:
        raise SystemExit(1)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
