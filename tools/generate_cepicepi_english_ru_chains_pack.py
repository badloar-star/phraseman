#!/usr/bin/env python3
"""Build a new English-Russian A1-A2 chain phrase pack for the Cepicepi template.

25 chains × 4 steps = 100 phrases.
Each chain grows a base sentence with varied grammar structures —
no repeated constructions, diverse subjects, verbs, locations, reasons.
Phrases are chosen for real-world usefulness (everyday situations people actually face).
"""

from __future__ import annotations

import csv
import json
import re
from pathlib import Path


OUT = Path("exports/chains/cepicepi_english_ru_a1a2_20260607")

CHAINS = [
    {
        "scenario": "morning coffee order",
        "queries": [
            "barista making coffee espresso machine",
            "coffee shop counter order morning",
            "person paying coffee cafe card",
            "coffee takeaway cup walk morning street",
        ],
        "steps": [
            ("I ordered a coffee.", "Я заказал кофе."),
            ("I ordered a coffee at the café.", "Я заказал кофе в кафе."),
            ("I ordered a coffee at the café before work.", "Я заказал кофе в кафе перед работой."),
            ("I ordered a coffee at the café before work because I was tired.", "Я заказал кофе в кафе перед работой, потому что устал."),
        ],
    },
    {
        "scenario": "grocery shopping list",
        "queries": [
            "person writing shopping list notebook",
            "supermarket vegetables fruit basket",
            "checkout queue supermarket groceries",
            "person carrying grocery bags home",
        ],
        "steps": [
            ("She made a list.", "Она составила список."),
            ("She made a list of groceries.", "Она составила список продуктов."),
            ("She made a list of groceries before going to the store.", "Она составила список продуктов перед походом в магазин."),
            ("She made a list of groceries before going to the store so she wouldn't forget anything.", "Она составила список продуктов перед походом в магазин, чтобы ничего не забыть."),
        ],
    },
    {
        "scenario": "calling a friend",
        "queries": [
            "person talking phone smiling",
            "woman calling friend mobile outside",
            "friends talking phone plan weekend",
            "person on phone happy conversation",
        ],
        "steps": [
            ("He called his friend.", "Он позвонил другу."),
            ("He called his friend on Saturday.", "Он позвонил другу в субботу."),
            ("He called his friend on Saturday to make plans.", "Он позвонил другу в субботу, чтобы договориться о планах."),
            ("He called his friend on Saturday to make plans because they hadn't met in weeks.", "Он позвонил другу в субботу, чтобы договориться о планах, потому что они не виделись несколько недель."),
        ],
    },
    {
        "scenario": "renting an apartment",
        "queries": [
            "apartment viewing couple living room",
            "real estate agent showing apartment",
            "person signing lease contract table",
            "moving boxes new apartment hallway",
        ],
        "steps": [
            ("They found an apartment.", "Они нашли квартиру."),
            ("They found an apartment near the city centre.", "Они нашли квартиру рядом с центром города."),
            ("They found an apartment near the city centre with two bedrooms.", "Они нашли квартиру рядом с центром города с двумя спальнями."),
            ("They found an apartment near the city centre with two bedrooms because their old place was too small.", "Они нашли квартиру рядом с центром города с двумя спальнями, потому что старое жильё было слишком маленьким."),
        ],
    },
    {
        "scenario": "doctor appointment",
        "queries": [
            "doctor consulting patient clinic room",
            "patient waiting clinic chair",
            "doctor writing prescription desk",
            "person pharmacy medicine counter",
        ],
        "steps": [
            ("I booked a doctor's appointment.", "Я записался к врачу."),
            ("I booked a doctor's appointment for Monday.", "Я записался к врачу на понедельник."),
            ("I booked a doctor's appointment for Monday morning.", "Я записался к врачу на понедельник утром."),
            ("I booked a doctor's appointment for Monday morning because my throat was hurting.", "Я записался к врачу на понедельник утром, потому что у меня болело горло."),
        ],
    },
    {
        "scenario": "job interview preparation",
        "queries": [
            "person in suit before job interview",
            "woman practising presentation mirror",
            "man reading documents preparing interview",
            "office handshake meeting professional",
        ],
        "steps": [
            ("She prepared for the interview.", "Она подготовилась к собеседованию."),
            ("She prepared for the interview the night before.", "Она подготовилась к собеседованию накануне вечером."),
            ("She prepared for the interview the night before by practising her answers.", "Она подготовилась к собеседованию накануне вечером, отрабатывая свои ответы."),
            ("She prepared for the interview the night before by practising her answers because the job was important to her.", "Она подготовилась к собеседованию накануне вечером, отрабатывая ответы, потому что эта работа была ей важна."),
        ],
    },
    {
        "scenario": "cooking dinner for family",
        "queries": [
            "person chopping vegetables kitchen",
            "pasta boiling pot stove kitchen",
            "family sitting dinner table home",
            "woman serving food dinner plate",
        ],
        "steps": [
            ("I cooked dinner.", "Я приготовил ужин."),
            ("I cooked dinner for my family.", "Я приготовил ужин для семьи."),
            ("I cooked dinner for my family on Sunday evening.", "Я приготовил ужин для семьи в воскресенье вечером."),
            ("I cooked dinner for my family on Sunday evening because we wanted to eat together.", "Я приготовил ужин для семьи в воскресенье вечером, потому что мы хотели поесть вместе."),
        ],
    },
    {
        "scenario": "bus to work",
        "queries": [
            "person waiting bus stop morning",
            "bus arriving city stop passengers",
            "man sitting bus window city",
            "passenger getting off bus downtown",
        ],
        "steps": [
            ("He took the bus.", "Он сел на автобус."),
            ("He took the bus to work.", "Он поехал на автобус на работу."),
            ("He took the bus to work instead of driving.", "Он поехал на работу на автобусе, а не на машине."),
            ("He took the bus to work instead of driving because there was too much traffic.", "Он поехал на работу на автобусе, а не на машине, потому что были пробки."),
        ],
    },
    {
        "scenario": "sending a parcel",
        "queries": [
            "person packing box tape home",
            "post office clerk parcel counter",
            "label sticker parcel shipping",
            "delivery van city street parcel",
        ],
        "steps": [
            ("I sent a parcel.", "Я отправил посылку."),
            ("I sent a parcel to my sister.", "Я отправил посылку сестре."),
            ("I sent a parcel to my sister from the post office.", "Я отправил посылку сестре с почты."),
            ("I sent a parcel to my sister from the post office because it was her birthday.", "Я отправил посылку сестре с почты, потому что у неё был день рождения."),
        ],
    },
    {
        "scenario": "gym workout",
        "queries": [
            "person lifting weights gym",
            "treadmill running gym morning",
            "woman stretching after gym workout",
            "gym water bottle towel locker",
        ],
        "steps": [
            ("She went to the gym.", "Она пошла в спортзал."),
            ("She went to the gym after work.", "Она пошла в спортзал после работы."),
            ("She went to the gym after work three times a week.", "Она ходила в спортзал после работы три раза в неделю."),
            ("She went to the gym after work three times a week to stay in shape.", "Она ходила в спортзал после работы три раза в неделю, чтобы поддерживать форму."),
        ],
    },
    {
        "scenario": "booking a train ticket",
        "queries": [
            "person booking train ticket laptop",
            "train station departure board",
            "man buying ticket machine station",
            "train platform passengers travel",
        ],
        "steps": [
            ("He booked a train ticket.", "Он купил билет на поезд."),
            ("He booked a train ticket online.", "Он купил билет на поезд онлайн."),
            ("He booked a train ticket online two days in advance.", "Он купил билет на поезд онлайн за два дня."),
            ("He booked a train ticket online two days in advance to get a better price.", "Он купил билет на поезд онлайн за два дня, чтобы получить более выгодную цену."),
        ],
    },
    {
        "scenario": "paying a bill",
        "queries": [
            "person looking at invoice paper desk",
            "banking app phone bill payment",
            "person at bank counter cashier",
            "utility bill paper home table",
        ],
        "steps": [
            ("I paid a bill.", "Я оплатил счёт."),
            ("I paid the electricity bill.", "Я оплатил счёт за электричество."),
            ("I paid the electricity bill through the app.", "Я оплатил счёт за электричество через приложение."),
            ("I paid the electricity bill through the app before it was overdue.", "Я оплатил счёт за электричество через приложение до того, как вышел срок."),
        ],
    },
    {
        "scenario": "walking the dog",
        "queries": [
            "person walking dog park morning",
            "dog leash path trees walk",
            "man dog off leash open field",
            "dog playing park ball owner",
        ],
        "steps": [
            ("I walked the dog.", "Я выгулял собаку."),
            ("I walked the dog in the park.", "Я выгулял собаку в парке."),
            ("I walked the dog in the park every morning.", "Я выгуливал собаку в парке каждое утро."),
            ("I walked the dog in the park every morning because she needed exercise.", "Я выгуливал собаку в парке каждое утро, потому что ей нужна была физическая нагрузка."),
        ],
    },
    {
        "scenario": "studying for an exam",
        "queries": [
            "student open books desk night studying",
            "highlighter notes textbook revision",
            "person flashcards learning table",
            "student library quiet study evening",
        ],
        "steps": [
            ("She studied for the exam.", "Она готовилась к экзамену."),
            ("She studied for the exam at the library.", "Она готовилась к экзамену в библиотеке."),
            ("She studied for the exam at the library for three hours.", "Она готовилась к экзамену в библиотеке три часа."),
            ("She studied for the exam at the library for three hours without a break.", "Она готовилась к экзамену в библиотеке три часа без перерыва."),
        ],
    },
    {
        "scenario": "fixing a bike",
        "queries": [
            "person repairing bicycle wheel outdoor",
            "bike tools repair workshop",
            "man pumping tire bicycle",
            "fixed bicycle outside apartment building",
        ],
        "steps": [
            ("He fixed his bike.", "Он починил велосипед."),
            ("He fixed his bike in the yard.", "Он починил велосипед во дворе."),
            ("He fixed his bike in the yard on Sunday afternoon.", "Он починил велосипед во дворе в воскресенье днём."),
            ("He fixed his bike in the yard on Sunday afternoon so he could ride to work.", "Он починил велосипед во дворе в воскресенье днём, чтобы ездить на работу."),
        ],
    },
    {
        "scenario": "cleaning the house",
        "queries": [
            "person vacuuming living room floor",
            "cleaning cloth wiping kitchen counter",
            "mop bucket floor cleaning home",
            "tidy clean bright living room after cleaning",
        ],
        "steps": [
            ("We cleaned the house.", "Мы убрали дом."),
            ("We cleaned the house on Saturday.", "Мы убрали дом в субботу."),
            ("We cleaned the house on Saturday before the guests arrived.", "Мы убрали дом в субботу до прихода гостей."),
            ("We cleaned the house on Saturday before the guests arrived because we hadn't done it all week.", "Мы убрали дом в субботу до прихода гостей, потому что всю неделю не убирались."),
        ],
    },
    {
        "scenario": "opening a bank account",
        "queries": [
            "bank advisor meeting client desk",
            "person signing bank documents",
            "bank card new debit card hand",
            "bank app mobile phone screen",
        ],
        "steps": [
            ("I opened a bank account.", "Я открыл банковский счёт."),
            ("I opened a bank account at a new bank.", "Я открыл счёт в новом банке."),
            ("I opened a bank account at a new bank last month.", "Я открыл счёт в новом банке в прошлом месяце."),
            ("I opened a bank account at a new bank last month because the fees were lower.", "Я открыл счёт в новом банке в прошлом месяце, потому что там ниже комиссии."),
        ],
    },
    {
        "scenario": "catching a flight",
        "queries": [
            "passenger airport check-in desk luggage",
            "airplane boarding gate airport",
            "security check airport queue",
            "plane window seat passenger flying",
        ],
        "steps": [
            ("They caught their flight.", "Они успели на самолёт."),
            ("They caught their flight just in time.", "Они успели на самолёт в последний момент."),
            ("They caught their flight just in time after rushing through security.", "Они успели на самолёт в последний момент, пробежав через досмотр."),
            ("They caught their flight just in time after rushing through security because the taxi was late.", "Они успели на самолёт в последний момент, пробежав через досмотр, потому что такси опоздало."),
        ],
    },
    {
        "scenario": "asking for directions",
        "queries": [
            "tourist asking directions street map",
            "person pointing direction street",
            "lost person phone map navigation city",
            "two people talking directions city centre",
        ],
        "steps": [
            ("I asked for directions.", "Я спросил дорогу."),
            ("I asked a woman for directions.", "Я спросил дорогу у женщины."),
            ("I asked a woman for directions to the station.", "Я спросил у женщины дорогу до вокзала."),
            ("I asked a woman for directions to the station because my phone had run out of battery.", "Я спросил у женщины дорогу до вокзала, потому что у меня разрядился телефон."),
        ],
    },
    {
        "scenario": "writing a birthday message",
        "queries": [
            "person writing greeting card desk",
            "birthday card envelope pen table",
            "woman writing message notebook candles",
            "birthday message phone typing smiling",
        ],
        "steps": [
            ("She wrote a message.", "Она написала сообщение."),
            ("She wrote a birthday message.", "Она написала поздравление с днём рождения."),
            ("She wrote a birthday message for her colleague.", "Она написала поздравление с днём рождения коллеге."),
            ("She wrote a birthday message for her colleague because she didn't want to forget.", "Она написала поздравление с днём рождения коллеге, потому что не хотела забыть."),
        ],
    },
    {
        "scenario": "returning a purchase",
        "queries": [
            "customer service desk return product",
            "person handing item back shop counter",
            "receipt product return shopping bag",
            "shop assistant checking returned item",
        ],
        "steps": [
            ("He returned the jacket.", "Он вернул куртку."),
            ("He returned the jacket to the shop.", "Он вернул куртку в магазин."),
            ("He returned the jacket to the shop the next day.", "Он вернул куртку в магазин на следующий день."),
            ("He returned the jacket to the shop the next day because the size was wrong.", "Он вернул куртку в магазин на следующий день, потому что размер не подошёл."),
        ],
    },
    {
        "scenario": "watching the news",
        "queries": [
            "person watching news television sofa",
            "news anchor broadcast TV studio",
            "couple watching evening news home",
            "man tablet reading news morning",
        ],
        "steps": [
            ("I watched the news.", "Я посмотрел новости."),
            ("I watched the news in the evening.", "Я посмотрел новости вечером."),
            ("I watched the news in the evening before going to bed.", "Я посмотрел новости вечером перед сном."),
            ("I watched the news in the evening before going to bed to know what had happened.", "Я посмотрел новости вечером перед сном, чтобы знать, что произошло."),
        ],
    },
    {
        "scenario": "meeting a neighbour",
        "queries": [
            "neighbours talking apartment hallway",
            "two people chatting building entrance",
            "man greeting neighbour friendly smile",
            "neighbours having coffee together kitchen",
        ],
        "steps": [
            ("She met her neighbour.", "Она встретила соседа."),
            ("She met her neighbour in the hallway.", "Она встретила соседа в коридоре."),
            ("She met her neighbour in the hallway and said hello.", "Она встретила соседа в коридоре и поздоровалась."),
            ("She met her neighbour in the hallway and said hello because they hadn't spoken in a while.", "Она встретила соседа в коридоре и поздоровалась, потому что давно не разговаривала с ним."),
        ],
    },
    {
        "scenario": "saving money",
        "queries": [
            "person putting coins jar savings",
            "budget spreadsheet laptop finance",
            "piggy bank coins saving money",
            "person checking bank savings account phone",
        ],
        "steps": [
            ("He started saving money.", "Он начал откладывать деньги."),
            ("He started saving money every month.", "Он начал откладывать деньги каждый месяц."),
            ("He started saving money every month by cutting unnecessary expenses.", "Он начал откладывать деньги каждый месяц, сокращая ненужные расходы."),
            ("He started saving money every month by cutting unnecessary expenses because he wanted to travel.", "Он начал откладывать деньги каждый месяц, сокращая ненужные расходы, потому что хотел путешествовать."),
        ],
    },
    {
        "scenario": "learning a new skill",
        "queries": [
            "person taking online course laptop home",
            "hands learning guitar practice",
            "woman sketching drawing notebook learning",
            "man studying tutorial video desk",
        ],
        "steps": [
            ("I started learning a new skill.", "Я начал учиться новому навыку."),
            ("I started learning to draw.", "Я начал учиться рисовать."),
            ("I started learning to draw in the evenings.", "Я начал учиться рисовать по вечерам."),
            ("I started learning to draw in the evenings because I wanted a creative hobby.", "Я начал учиться рисовать по вечерам, потому что хотел творческое хобби."),
        ],
    },
]


def normalize(text: str) -> str:
    return re.sub(r"\s+", " ", text.strip().casefold())


def generate() -> dict[str, object]:
    if len(CHAINS) != 25:
        raise RuntimeError(f"expected 25 chains, got {len(CHAINS)}")
    rows = []
    for chain_index, chain in enumerate(CHAINS, start=1):
        if len(chain["steps"]) != 4:
            raise RuntimeError(f"chain {chain_index} has {len(chain['steps'])} steps, expected 4")
        for step_index, (english, russian) in enumerate(chain["steps"], start=1):
            rows.append(
                {
                    "index": len(rows) + 1,
                    "chain": chain_index,
                    "step": step_index,
                    "scenario": chain["scenario"],
                    "english": english,
                    "russian": russian,
                    "background_query": chain["queries"][step_index - 1],
                }
            )

    en_seen: dict[str, int] = {}
    ru_seen: dict[str, int] = {}
    errors: list[str] = []
    for row in rows:
        en = normalize(row["english"])
        ru = normalize(row["russian"])
        if en in en_seen:
            errors.append(f"duplicate English: row {row['index']} and {en_seen[en]}")
        if ru in ru_seen:
            errors.append(f"duplicate Russian: row {row['index']} and {ru_seen[ru]}")
        en_seen[en] = int(row["index"])
        ru_seen[ru] = int(row["index"])
        if len(str(row["english"]).split()) > 22:
            errors.append(f"too long English row {row['index']}: {row['english']}")

    if len(rows) != 100:
        errors.append(f"expected 100 rows, got {len(rows)}")

    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "english_chains_100.json").write_text(
        json.dumps(rows, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    with (OUT / "english_chains_100.csv").open("w", encoding="utf-8-sig", newline="") as fh:
        writer = csv.DictWriter(fh, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)

    report = {
        "status": "ready" if not errors and len(rows) == 100 else "failed",
        "rows": len(rows),
        "chains": len(CHAINS),
        "steps_per_chain": 4,
        "unique_english": len(en_seen),
        "unique_russian": len(ru_seen),
        "errors": errors,
    }
    (OUT / "english_chains_quality_report.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    return report


if __name__ == "__main__":
    import sys
    sys.stdout.reconfigure(encoding="utf-8")
    print(json.dumps(generate(), ensure_ascii=False, indent=2))
