#!/usr/bin/env python3
"""Build the next Cepicepi A1-A2 chain phrase pack for the current 100-slot template."""

from __future__ import annotations

import csv
import json
import re
from pathlib import Path


OUT = Path("exports/chains/cepicepi_next_chains_a1a2_20260605")


CHAINS = [
    {
        "scenario": "water glass",
        "queries": [
            "person drinking water kitchen morning",
            "glass of water on kitchen table",
            "person drinking water before walk",
            "hot day drinking water at home",
        ],
        "steps": [
            ("I drank water.", "Я выпил воду."),
            ("I drank water in the kitchen.", "Я выпил воду на кухне."),
            ("I drank water in the kitchen before my walk.", "Я выпил воду на кухне перед прогулкой."),
            ("I drank water in the kitchen before my walk because it was warm.", "Я выпил воду на кухне перед прогулкой, потому что было тепло."),
        ],
    },
    {
        "scenario": "lamp reading",
        "queries": [
            "woman turning on lamp evening room",
            "desk lamp book evening home",
            "woman reading book under lamp",
            "evening reading lamp quiet room",
        ],
        "steps": [
            ("She turned on the lamp.", "Она включила лампу."),
            ("She turned on the lamp near the sofa.", "Она включила лампу возле дивана."),
            ("She turned on the lamp near the sofa and read a book.", "Она включила лампу возле дивана и читала книгу."),
            ("She turned on the lamp near the sofa because the room was dark.", "Она включила лампу возле дивана, потому что в комнате было темно."),
        ],
    },
    {
        "scenario": "washing cups",
        "queries": [
            "people washing cups kitchen sink",
            "clean cups kitchen sink home",
            "washing cups after breakfast",
            "tidy kitchen before leaving home",
        ],
        "steps": [
            ("We washed the cups.", "Мы помыли чашки."),
            ("We washed the cups after breakfast.", "Мы помыли чашки после завтрака."),
            ("We washed the cups after breakfast before leaving home.", "Мы помыли чашки после завтрака перед выходом из дома."),
            ("We washed the cups after breakfast before leaving home so the kitchen looked clean.", "Мы помыли чашки после завтрака перед выходом из дома, чтобы кухня выглядела чистой."),
        ],
    },
    {
        "scenario": "bus card",
        "queries": [
            "man buying bus card kiosk",
            "bus card public transport close up",
            "person buying bus card before work",
            "bus stop ticket card morning",
        ],
        "steps": [
            ("He bought a bus card.", "Он купил проездную карту."),
            ("He bought a bus card at the kiosk.", "Он купил проездную карту в киоске."),
            ("He bought a bus card at the kiosk before work.", "Он купил проездную карту в киоске перед работой."),
            ("He bought a bus card at the kiosk before work because his old card was empty.", "Он купил проездную карту в киоске перед работой, потому что старая карта была пустая."),
        ],
    },
    {
        "scenario": "garden flowers",
        "queries": [
            "people watering flowers garden",
            "watering flowers in small garden",
            "garden flowers sunday morning",
            "dry flowers watering can garden",
        ],
        "steps": [
            ("They watered the flowers.", "Они полили цветы."),
            ("They watered the flowers in the garden.", "Они полили цветы в саду."),
            ("They watered the flowers in the garden on Sunday morning.", "Они полили цветы в саду в воскресенье утром."),
            ("They watered the flowers in the garden on Sunday morning because the soil was dry.", "Они полили цветы в саду в воскресенье утром, потому что земля была сухая."),
        ],
    },
    {
        "scenario": "market apples",
        "queries": [
            "person choosing apples market",
            "buying apples market stall",
            "fresh apples market morning",
            "fruit market apples for pie",
        ],
        "steps": [
            ("I chose apples.", "Я выбрал яблоки."),
            ("I chose apples at the market.", "Я выбрал яблоки на рынке."),
            ("I chose apples at the market in the morning.", "Я выбрал яблоки на рынке утром."),
            ("I chose apples at the market in the morning because I wanted to bake a pie.", "Я выбрал яблоки на рынке утром, потому что хотел испечь пирог."),
        ],
    },
    {
        "scenario": "doctor appointment",
        "queries": [
            "woman booking doctor appointment phone",
            "clinic appointment phone calendar",
            "woman booking doctor visit after lunch",
            "clinic phone appointment headache",
        ],
        "steps": [
            ("She booked an appointment.", "Она записалась на приём."),
            ("She booked an appointment with the doctor.", "Она записалась на приём к врачу."),
            ("She booked an appointment with the doctor after lunch.", "Она записалась на приём к врачу после обеда."),
            ("She booked an appointment with the doctor after lunch because her head hurt.", "Она записалась на приём к врачу после обеда, потому что у неё болела голова."),
        ],
    },
    {
        "scenario": "garage bicycle",
        "queries": [
            "people repairing bicycle garage",
            "bicycle tire garage tools",
            "fixing bicycle tire before ride",
            "bicycle repair garage sunny day",
        ],
        "steps": [
            ("We fixed the bike.", "Мы починили велосипед."),
            ("We fixed the bike in the garage.", "Мы починили велосипед в гараже."),
            ("We fixed the bike in the garage before the ride.", "Мы починили велосипед в гараже перед поездкой."),
            ("We fixed the bike in the garage before the ride because the tire was low.", "Мы починили велосипед в гараже перед поездкой, потому что колесо было спущено."),
        ],
    },
    {
        "scenario": "office chair",
        "queries": [
            "man moving chair office",
            "office chair near window",
            "man moving chair before meeting",
            "office meeting extra chair",
        ],
        "steps": [
            ("He moved the chair.", "Он передвинул стул."),
            ("He moved the chair near the window.", "Он передвинул стул к окну."),
            ("He moved the chair near the window before the meeting.", "Он передвинул стул к окну перед встречей."),
            ("He moved the chair near the window before the meeting because we needed more space.", "Он передвинул стул к окну перед встречей, потому что нам нужно было больше места."),
        ],
    },
    {
        "scenario": "park picnic",
        "queries": [
            "friends bringing sandwiches park",
            "picnic sandwiches park grass",
            "friends picnic after class",
            "park picnic sunny afternoon",
        ],
        "steps": [
            ("They brought sandwiches.", "Они принесли сэндвичи."),
            ("They brought sandwiches to the park.", "Они принесли сэндвичи в парк."),
            ("They brought sandwiches to the park after class.", "Они принесли сэндвичи в парк после занятия."),
            ("They brought sandwiches to the park after class because everyone was hungry.", "Они принесли сэндвичи в парк после занятия, потому что все были голодны."),
        ],
    },
    {
        "scenario": "calendar reminder",
        "queries": [
            "person setting phone reminder",
            "phone calendar reminder close up",
            "setting reminder before meeting",
            "phone reminder important call",
        ],
        "steps": [
            ("I set a reminder.", "Я поставил напоминание."),
            ("I set a reminder on my phone.", "Я поставил напоминание на телефоне."),
            ("I set a reminder on my phone before the call.", "Я поставил напоминание на телефоне перед звонком."),
            ("I set a reminder on my phone before the call so I would not forget.", "Я поставил напоминание на телефоне перед звонком, чтобы не забыть."),
        ],
    },
    {
        "scenario": "soup kitchen",
        "queries": [
            "woman cooking soup kitchen",
            "cooking soup for family",
            "soup kitchen cold evening",
            "hot soup cold day home",
        ],
        "steps": [
            ("She cooked soup.", "Она приготовила суп."),
            ("She cooked soup for her family.", "Она приготовила суп для семьи."),
            ("She cooked soup for her family in the evening.", "Она приготовила суп для семьи вечером."),
            ("She cooked soup for her family in the evening because the day was cold.", "Она приготовила суп для семьи вечером, потому что день был холодный."),
        ],
    },
    {
        "scenario": "mail package",
        "queries": [
            "people opening package home",
            "package delivery home table",
            "opening package after work",
            "small gift package delivery",
        ],
        "steps": [
            ("We opened the package.", "Мы открыли посылку."),
            ("We opened the package on the table.", "Мы открыли посылку на столе."),
            ("We opened the package on the table after work.", "Мы открыли посылку на столе после работы."),
            ("We opened the package on the table after work because it was a gift.", "Мы открыли посылку на столе после работы, потому что это был подарок."),
        ],
    },
    {
        "scenario": "train seat",
        "queries": [
            "man finding seat train",
            "train seat ticket passenger",
            "finding seat on train morning",
            "train passenger window seat",
        ],
        "steps": [
            ("He found his seat.", "Он нашёл своё место."),
            ("He found his seat on the train.", "Он нашёл своё место в поезде."),
            ("He found his seat on the train in the morning.", "Он нашёл своё место в поезде утром."),
            ("He found his seat on the train in the morning and put his bag above it.", "Он нашёл своё место в поезде утром и положил сумку наверх."),
        ],
    },
    {
        "scenario": "museum tickets",
        "queries": [
            "people buying museum tickets",
            "museum ticket counter visitors",
            "museum visit afternoon tickets",
            "museum tickets rainy day",
        ],
        "steps": [
            ("They bought tickets.", "Они купили билеты."),
            ("They bought tickets at the museum.", "Они купили билеты в музее."),
            ("They bought tickets at the museum in the afternoon.", "Они купили билеты в музее днём."),
            ("They bought tickets at the museum in the afternoon because it was raining outside.", "Они купили билеты в музее днём, потому что на улице шёл дождь."),
        ],
    },
    {
        "scenario": "desk cleaning",
        "queries": [
            "person cleaning desk office",
            "clean desk laptop papers",
            "cleaning desk before study",
            "organized desk evening work",
        ],
        "steps": [
            ("I cleaned my desk.", "Я убрал свой стол."),
            ("I cleaned my desk before studying.", "Я убрал свой стол перед учёбой."),
            ("I cleaned my desk before studying in the evening.", "Я убрал свой стол перед учёбой вечером."),
            ("I cleaned my desk before studying in the evening so I could focus.", "Я убрал свой стол перед учёбой вечером, чтобы сосредоточиться."),
        ],
    },
    {
        "scenario": "neighbor ladder",
        "queries": [
            "woman borrowing ladder neighbor",
            "neighbor helping with ladder",
            "ladder home repair weekend",
            "borrowing ladder to change light",
        ],
        "steps": [
            ("She borrowed a ladder.", "Она одолжила лестницу."),
            ("She borrowed a ladder from her neighbor.", "Она одолжила лестницу у соседа."),
            ("She borrowed a ladder from her neighbor on Saturday.", "Она одолжила лестницу у соседа в субботу."),
            ("She borrowed a ladder from her neighbor on Saturday because she needed to change a light.", "Она одолжила лестницу у соседа в субботу, потому что ей нужно было поменять лампочку."),
        ],
    },
    {
        "scenario": "homework table",
        "queries": [
            "children doing homework kitchen table",
            "homework at kitchen table family",
            "doing homework after dinner",
            "parents helping homework evening",
        ],
        "steps": [
            ("We did homework.", "Мы сделали домашнее задание."),
            ("We did homework at the kitchen table.", "Мы сделали домашнее задание за кухонным столом."),
            ("We did homework at the kitchen table after dinner.", "Мы сделали домашнее задание за кухонным столом после ужина."),
            ("We did homework at the kitchen table after dinner because the lesson was tomorrow.", "Мы сделали домашнее задание за кухонным столом после ужина, потому что урок был завтра."),
        ],
    },
    {
        "scenario": "raincoat",
        "queries": [
            "man taking raincoat from closet",
            "raincoat hallway rainy morning",
            "person wearing raincoat before walk",
            "rainy day coat umbrella hallway",
        ],
        "steps": [
            ("He took his raincoat.", "Он взял свой плащ."),
            ("He took his raincoat from the closet.", "Он взял свой плащ из шкафа."),
            ("He took his raincoat from the closet before going out.", "Он взял свой плащ из шкафа перед выходом."),
            ("He took his raincoat from the closet before going out because the sky was grey.", "Он взял свой плащ из шкафа перед выходом, потому что небо было серым."),
        ],
    },
    {
        "scenario": "video lesson",
        "queries": [
            "students watching video lesson laptop",
            "online lesson laptop headphones",
            "watching lesson before test",
            "study video lesson notes",
        ],
        "steps": [
            ("They watched a lesson.", "Они посмотрели урок."),
            ("They watched a lesson on the laptop.", "Они посмотрели урок на ноутбуке."),
            ("They watched a lesson on the laptop before the test.", "Они посмотрели урок на ноутбуке перед тестом."),
            ("They watched a lesson on the laptop before the test and wrote down examples.", "Они посмотрели урок на ноутбуке перед тестом и записали примеры."),
        ],
    },
    {
        "scenario": "bakery cake",
        "queries": [
            "person ordering cake bakery",
            "bakery cake counter birthday",
            "ordering cake for sister",
            "birthday cake bakery afternoon",
        ],
        "steps": [
            ("I ordered a cake.", "Я заказал торт."),
            ("I ordered a cake at the bakery.", "Я заказал торт в пекарне."),
            ("I ordered a cake at the bakery for my sister.", "Я заказал торт в пекарне для сестры."),
            ("I ordered a cake at the bakery for my sister because her birthday was close.", "Я заказал торт в пекарне для сестры, потому что её день рождения был скоро."),
        ],
    },
    {
        "scenario": "library card",
        "queries": [
            "woman getting library card",
            "library card books desk",
            "getting library card after class",
            "library books borrow card",
        ],
        "steps": [
            ("She got a library card.", "Она получила читательский билет."),
            ("She got a library card after class.", "Она получила читательский билет после занятия."),
            ("She got a library card after class at the front desk.", "Она получила читательский билет после занятия на стойке."),
            ("She got a library card after class because she wanted to borrow books.", "Она получила читательский билет после занятия, потому что хотела брать книги."),
        ],
    },
    {
        "scenario": "living room shelf",
        "queries": [
            "people putting books on shelf",
            "bookshelf living room home",
            "organizing books after move",
            "new shelf living room books",
        ],
        "steps": [
            ("We put books on the shelf.", "Мы поставили книги на полку."),
            ("We put books on the shelf in the living room.", "Мы поставили книги на полку в гостиной."),
            ("We put books on the shelf in the living room after moving it.", "Мы поставили книги на полку в гостиной после того, как передвинули её."),
            ("We put books on the shelf because the living room corner was empty.", "Мы поставили книги на полку, потому что угол в гостиной был пустой."),
        ],
    },
    {
        "scenario": "phone charger",
        "queries": [
            "man plugging phone charger",
            "phone charger airport cafe",
            "charging phone before trip",
            "low phone battery charger",
        ],
        "steps": [
            ("He charged his phone.", "Он зарядил телефон."),
            ("He charged his phone at the cafe.", "Он зарядил телефон в кафе."),
            ("He charged his phone at the cafe before the trip.", "Он зарядил телефон в кафе перед поездкой."),
            ("He charged his phone at the cafe before the trip because the battery was low.", "Он зарядил телефон в кафе перед поездкой, потому что батарея была разряжена."),
        ],
    },
    {
        "scenario": "city map",
        "queries": [
            "tourists checking city map",
            "city map near station",
            "tourists checking map before hotel",
            "lost tourists city map evening",
        ],
        "steps": [
            ("They checked the map.", "Они проверили карту."),
            ("They checked the map near the station.", "Они проверили карту возле станции."),
            ("They checked the map near the station before walking to the hotel.", "Они проверили карту возле станции перед тем, как идти в отель."),
            ("They checked the map near the station because the streets were new.", "Они проверили карту возле станции, потому что улицы были новыми."),
        ],
    },
]


def normalize(value: str) -> str:
    return re.sub(r"\s+", " ", value.casefold().strip())


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    rows = []
    for chain_index, chain in enumerate(CHAINS, start=1):
        for step_index, (english, russian) in enumerate(chain["steps"], start=1):
            index = len(rows) + 1
            rows.append(
                {
                    "index": index,
                    "chain": chain_index,
                    "step": step_index,
                    "scenario": chain["scenario"],
                    "english": english,
                    "russian": russian,
                    "background_query": chain["queries"][step_index - 1],
                }
            )

    en_seen = {}
    ru_seen = {}
    errors = []
    for row in rows:
        en = normalize(row["english"])
        ru = normalize(row["russian"])
        if en in en_seen:
            errors.append(f"duplicate English: {row['index']} and {en_seen[en]}")
        if ru in ru_seen:
            errors.append(f"duplicate Russian: {row['index']} and {ru_seen[ru]}")
        en_seen[en] = row["index"]
        ru_seen[ru] = row["index"]
        if len(row["english"].split()) > 16:
            errors.append(f"too long English row {row['index']}: {row['english']}")

    (OUT / "next_chains_100.json").write_text(json.dumps(rows, ensure_ascii=False, indent=2), encoding="utf-8")
    with (OUT / "next_chains_100.csv").open("w", encoding="utf-8-sig", newline="") as fh:
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
    (OUT / "next_chains_quality_report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
