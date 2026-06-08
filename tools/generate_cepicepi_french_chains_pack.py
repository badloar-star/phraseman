#!/usr/bin/env python3
"""Build a new French-Russian A1 chain phrase pack for the Cepicepi template."""

from __future__ import annotations

import csv
import json
import re
from pathlib import Path


OUT = Path("exports/chains/cepicepi_french_ru_a1_20260606")


CHAINS = [
    {
        "scenario": "bakery bread",
        "queries": ["person buying bread bakery morning", "fresh bread bakery counter", "woman carrying bread home", "breakfast bread kitchen table"],
        "steps": [
            ("J'ai acheté du pain.", "Я купил хлеб."),
            ("J'ai acheté du pain à la boulangerie.", "Я купил хлеб в булочной."),
            ("J'ai acheté du pain à la boulangerie avant le petit-déjeuner.", "Я купил хлеб в булочной перед завтраком."),
            ("J'ai acheté du pain à la boulangerie avant le petit-déjeuner parce que nous n'avions rien.", "Я купил хлеб в булочной перед завтраком, потому что у нас ничего не было."),
        ],
    },
    {
        "scenario": "school notebook",
        "queries": ["student opening notebook classroom", "notebook pencil school desk", "student writing notes after lesson", "quiet classroom notebook study"],
        "steps": [
            ("J'ai ouvert mon cahier.", "Я открыл свою тетрадь."),
            ("J'ai ouvert mon cahier en classe.", "Я открыл свою тетрадь в классе."),
            ("J'ai ouvert mon cahier en classe après la pause.", "Я открыл свою тетрадь в классе после перемены."),
            ("J'ai ouvert mon cahier en classe après la pause pour écrire la leçon.", "Я открыл свою тетрадь в классе после перемены, чтобы записать урок."),
        ],
    },
    {
        "scenario": "blue coat",
        "queries": ["person putting on coat hallway", "blue coat near door", "putting on coat before leaving", "cold morning coat hallway"],
        "steps": [
            ("J'ai mis mon manteau.", "Я надел пальто."),
            ("J'ai mis mon manteau bleu.", "Я надел синее пальто."),
            ("J'ai mis mon manteau bleu avant de sortir.", "Я надел синее пальто перед выходом."),
            ("J'ai mis mon manteau bleu avant de sortir parce qu'il faisait froid.", "Я надел синее пальто перед выходом, потому что было холодно."),
        ],
    },
    {
        "scenario": "metro card",
        "queries": ["person using metro card station", "metro ticket gate card", "buying metro card before work", "subway station morning commute"],
        "steps": [
            ("J'ai pris le métro.", "Я поехал на метро."),
            ("J'ai pris le métro avec ma carte.", "Я поехал на метро со своей картой."),
            ("J'ai pris le métro avec ma carte avant le travail.", "Я поехал на метро со своей картой перед работой."),
            ("J'ai pris le métro avec ma carte avant le travail parce que la rue était pleine.", "Я поехал на метро со своей картой перед работой, потому что улица была переполнена."),
        ],
    },
    {
        "scenario": "orange juice",
        "queries": ["person pouring orange juice kitchen", "orange juice glass breakfast", "drinking orange juice before school", "breakfast orange juice sunny kitchen"],
        "steps": [
            ("J'ai bu du jus.", "Я выпил сок."),
            ("J'ai bu du jus d'orange.", "Я выпил апельсиновый сок."),
            ("J'ai bu du jus d'orange avant l'école.", "Я выпил апельсиновый сок перед школой."),
            ("J'ai bu du jus d'orange avant l'école parce que j'avais soif.", "Я выпил апельсиновый сок перед школой, потому что хотел пить."),
        ],
    },
    {
        "scenario": "museum ticket",
        "queries": ["person buying museum ticket", "museum ticket counter", "friends entering museum afternoon", "museum entrance ticket visitor"],
        "steps": [
            ("Nous avons visité le musée.", "Мы посетили музей."),
            ("Nous avons visité le musée avec nos amis.", "Мы посетили музей с друзьями."),
            ("Nous avons visité le musée avec nos amis samedi.", "Мы посетили музей с друзьями в субботу."),
            ("Nous avons visité le musée avec nos amis samedi parce que l'entrée était gratuite.", "Мы посетили музей с друзьями в субботу, потому что вход был бесплатным."),
        ],
    },
    {
        "scenario": "desk email",
        "queries": ["person sending email laptop desk", "laptop email office desk", "sending email before meeting", "office laptop email morning"],
        "steps": [
            ("J'ai envoyé un message.", "Я отправил сообщение."),
            ("J'ai envoyé un message à mon collègue.", "Я отправил сообщение коллеге."),
            ("J'ai envoyé un message à mon collègue avant la réunion.", "Я отправил сообщение коллеге перед встречей."),
            ("J'ai envoyé un message à mon collègue avant la réunion parce que j'avais une question.", "Я отправил сообщение коллеге перед встречей, потому что у меня был вопрос."),
        ],
    },
    {
        "scenario": "green park",
        "queries": ["woman walking in green park", "park path trees morning", "walking in park after lunch", "quiet park sunny afternoon"],
        "steps": [
            ("Elle a marché.", "Она гуляла."),
            ("Elle a marché dans le parc.", "Она гуляла в парке."),
            ("Elle a marché dans le parc après le déjeuner.", "Она гуляла в парке после обеда."),
            ("Elle a marché dans le parc après le déjeuner parce qu'elle voulait se détendre.", "Она гуляла в парке после обеда, потому что хотела расслабиться."),
        ],
    },
    {
        "scenario": "clean kitchen",
        "queries": ["person cleaning kitchen counter", "kitchen counter cloth cleaning", "cleaning kitchen after dinner", "tidy kitchen evening home"],
        "steps": [
            ("J'ai nettoyé la cuisine.", "Я убрал кухню."),
            ("J'ai nettoyé la cuisine après le dîner.", "Я убрал кухню после ужина."),
            ("J'ai nettoyé la cuisine après le dîner avec une éponge.", "Я убрал кухню после ужина губкой."),
            ("J'ai nettoyé la cuisine après le dîner avec une éponge parce que la table était sale.", "Я убрал кухню после ужина губкой, потому что стол был грязный."),
        ],
    },
    {
        "scenario": "new glasses",
        "queries": ["person trying glasses optician", "glasses on table close up", "buying glasses after eye test", "optician shop glasses customer"],
        "steps": [
            ("Il a choisi des lunettes.", "Он выбрал очки."),
            ("Il a choisi des lunettes noires.", "Он выбрал черные очки."),
            ("Il a choisi des lunettes noires chez l'opticien.", "Он выбрал черные очки у оптика."),
            ("Il a choisi des lunettes noires chez l'opticien parce qu'il voyait mal.", "Он выбрал черные очки у оптика, потому что плохо видел."),
        ],
    },
    {
        "scenario": "post office letter",
        "queries": ["person sending letter post office", "letter envelope post office counter", "mailing letter before work", "post office queue envelope"],
        "steps": [
            ("J'ai envoyé une lettre.", "Я отправил письмо."),
            ("J'ai envoyé une lettre à ma tante.", "Я отправил письмо тете."),
            ("J'ai envoyé une lettre à ma tante à la poste.", "Я отправил письмо тете на почте."),
            ("J'ai envoyé une lettre à ma tante à la poste parce qu'elle n'utilise pas Internet.", "Я отправил письмо тете на почте, потому что она не пользуется интернетом."),
        ],
    },
    {
        "scenario": "family photo",
        "queries": ["family taking photo living room", "photo frame family home", "taking family photo birthday", "family photo sofa evening"],
        "steps": [
            ("Nous avons pris une photo.", "Мы сделали фотографию."),
            ("Nous avons pris une photo dans le salon.", "Мы сделали фотографию в гостиной."),
            ("Nous avons pris une photo dans le salon pour l'anniversaire.", "Мы сделали фотографию в гостиной на день рождения."),
            ("Nous avons pris une photo dans le salon pour l'anniversaire parce que toute la famille était là.", "Мы сделали фотографию в гостиной на день рождения, потому что вся семья была там."),
        ],
    },
    {
        "scenario": "red umbrella",
        "queries": ["person opening umbrella rain street", "red umbrella rainy street", "walking with umbrella before work", "rainy city umbrella morning"],
        "steps": [
            ("J'ai pris un parapluie.", "Я взял зонт."),
            ("J'ai pris un parapluie rouge.", "Я взял красный зонт."),
            ("J'ai pris un parapluie rouge avant de partir.", "Я взял красный зонт перед уходом."),
            ("J'ai pris un parapluie rouge avant de partir parce que le ciel était gris.", "Я взял красный зонт перед уходом, потому что небо было серым."),
        ],
    },
    {
        "scenario": "flower shop",
        "queries": ["person buying flowers flower shop", "flowers bouquet shop counter", "buying flowers before visit", "flower bouquet gift morning"],
        "steps": [
            ("Elle a acheté des fleurs.", "Она купила цветы."),
            ("Elle a acheté des fleurs pour sa mère.", "Она купила цветы для мамы."),
            ("Elle a acheté des fleurs pour sa mère avant la visite.", "Она купила цветы для мамы перед визитом."),
            ("Elle a acheté des fleurs pour sa mère avant la visite parce que c'était une surprise.", "Она купила цветы для мамы перед визитом, потому что это был сюрприз."),
        ],
    },
    {
        "scenario": "rice dinner",
        "queries": ["person cooking rice kitchen", "rice pot kitchen stove", "cooking rice for dinner", "simple dinner rice home"],
        "steps": [
            ("J'ai préparé du riz.", "Я приготовил рис."),
            ("J'ai préparé du riz pour le dîner.", "Я приготовил рис на ужин."),
            ("J'ai préparé du riz pour le dîner avec des légumes.", "Я приготовил рис с овощами на ужин."),
            ("J'ai préparé du riz pour le dîner avec des légumes parce que c'était facile.", "Я приготовил рис с овощами на ужин, потому что это было легко."),
        ],
    },
    {
        "scenario": "hotel room",
        "queries": ["hotel room suitcase bed", "person entering hotel room", "opening hotel room after trip", "hotel room travel luggage evening"],
        "steps": [
            ("J'ai trouvé ma chambre.", "Я нашел свой номер."),
            ("J'ai trouvé ma chambre à l'hôtel.", "Я нашел свой номер в отеле."),
            ("J'ai trouvé ma chambre à l'hôtel après le voyage.", "Я нашел свой номер в отеле после поездки."),
            ("J'ai trouvé ma chambre à l'hôtel après le voyage parce que j'étais fatigué.", "Я нашел свой номер в отеле после поездки, потому что устал."),
        ],
    },
    {
        "scenario": "market cheese",
        "queries": ["person buying cheese market", "cheese market stall", "buying cheese for dinner", "fresh cheese counter market"],
        "steps": [
            ("J'ai goûté du fromage.", "Я попробовал сыр."),
            ("J'ai goûté du fromage au marché.", "Я попробовал сыр на рынке."),
            ("J'ai goûté du fromage au marché avec mon frère.", "Я попробовал сыр на рынке с братом."),
            ("J'ai goûté du fromage au marché avec mon frère parce qu'il aimait ce magasin.", "Я попробовал сыр на рынке с братом, потому что ему нравился этот магазин."),
        ],
    },
    {
        "scenario": "living room music",
        "queries": ["person listening music living room", "speaker living room music", "listening music after work", "relaxing music sofa evening"],
        "steps": [
            ("J'ai écouté de la musique.", "Я слушал музыку."),
            ("J'ai écouté de la musique dans le salon.", "Я слушал музыку в гостиной."),
            ("J'ai écouté de la musique dans le salon après le travail.", "Я слушал музыку в гостиной после работы."),
            ("J'ai écouté de la musique dans le salon après le travail parce que j'étais stressé.", "Я слушал музыку в гостиной после работы, потому что был напряжен."),
        ],
    },
    {
        "scenario": "small cake",
        "queries": ["person baking cake kitchen", "small cake oven kitchen", "baking cake for children", "homemade cake family kitchen"],
        "steps": [
            ("Elle a fait un gâteau.", "Она испекла торт."),
            ("Elle a fait un petit gâteau.", "Она испекла маленький торт."),
            ("Elle a fait un petit gâteau pour les enfants.", "Она испекла маленький торт для детей."),
            ("Elle a fait un petit gâteau pour les enfants parce qu'ils avaient bien travaillé.", "Она испекла маленький торт для детей, потому что они хорошо поработали."),
        ],
    },
    {
        "scenario": "garage car",
        "queries": ["person washing car driveway", "car sponge water driveway", "washing car before trip", "clean car garage sunny day"],
        "steps": [
            ("Nous avons lavé la voiture.", "Мы помыли машину."),
            ("Nous avons lavé la voiture devant la maison.", "Мы помыли машину перед домом."),
            ("Nous avons lavé la voiture devant la maison avant le voyage.", "Мы помыли машину перед домом перед поездкой."),
            ("Nous avons lavé la voiture devant la maison avant le voyage parce qu'elle était poussiéreuse.", "Мы помыли машину перед домом перед поездкой, потому что она была пыльной."),
        ],
    },
    {
        "scenario": "pharmacy cream",
        "queries": ["person buying cream pharmacy", "pharmacy cream medicine counter", "buying cream after doctor", "pharmacy skincare medicine customer"],
        "steps": [
            ("J'ai acheté une crème.", "Я купил крем."),
            ("J'ai acheté une crème à la pharmacie.", "Я купил крем в аптеке."),
            ("J'ai acheté une crème à la pharmacie après le médecin.", "Я купил крем в аптеке после врача."),
            ("J'ai acheté une crème à la pharmacie après le médecin parce que ma main me faisait mal.", "Я купил крем в аптеке после врача, потому что у меня болела рука."),
        ],
    },
    {
        "scenario": "quiet tea",
        "queries": ["person making tea evening kitchen", "tea cup book table", "drinking tea before sleep", "warm tea quiet room night"],
        "steps": [
            ("J'ai préparé du thé.", "Я приготовил чай."),
            ("J'ai préparé du thé chaud.", "Я приготовил горячий чай."),
            ("J'ai préparé du thé chaud avant de dormir.", "Я приготовил горячий чай перед сном."),
            ("J'ai préparé du thé chaud avant de dormir parce que je voulais me calmer.", "Я приготовил горячий чай перед сном, потому что хотел успокоиться."),
        ],
    },
    {
        "scenario": "toy box",
        "queries": ["child putting toys in box", "toys box living room", "cleaning toys after play", "children room toy box evening"],
        "steps": [
            ("Il a rangé les jouets.", "Он убрал игрушки."),
            ("Il a rangé les jouets dans la boîte.", "Он убрал игрушки в коробку."),
            ("Il a rangé les jouets dans la boîte après le jeu.", "Он убрал игрушки в коробку после игры."),
            ("Il a rangé les jouets dans la boîte après le jeu parce que la chambre était en désordre.", "Он убрал игрушки в коробку после игры, потому что комната была в беспорядке."),
        ],
    },
    {
        "scenario": "city map",
        "queries": ["tourist looking at city map", "paper map city street", "checking map before museum", "tourist map old town"],
        "steps": [
            ("J'ai regardé la carte.", "Я посмотрел карту."),
            ("J'ai regardé la carte de la ville.", "Я посмотрел карту города."),
            ("J'ai regardé la carte de la ville avant le musée.", "Я посмотрел карту города перед музеем."),
            ("J'ai regardé la carte de la ville avant le musée parce que je ne connaissais pas le chemin.", "Я посмотрел карту города перед музеем, потому что не знал дорогу."),
        ],
    },
    {
        "scenario": "doctor call",
        "queries": ["person calling doctor phone", "doctor appointment phone calendar", "calling doctor after breakfast", "phone call clinic appointment home"],
        "steps": [
            ("J'ai appelé le médecin.", "Я позвонил врачу."),
            ("J'ai appelé le médecin ce matin.", "Я позвонил врачу сегодня утром."),
            ("J'ai appelé le médecin ce matin après le petit-déjeuner.", "Я позвонил врачу сегодня утром после завтрака."),
            ("J'ai appelé le médecin ce matin après le petit-déjeuner parce que je toussais.", "Я позвонил врачу сегодня утром после завтрака, потому что кашлял."),
        ],
    },
]


def normalize(text: str) -> str:
    return re.sub(r"\s+", " ", text.strip().casefold())


def generate() -> dict[str, object]:
    rows = []
    for chain_index, chain in enumerate(CHAINS, start=1):
        for step_index, (french, russian) in enumerate(chain["steps"], start=1):
            rows.append(
                {
                    "index": len(rows) + 1,
                    "chain": chain_index,
                    "step": step_index,
                    "scenario": chain["scenario"],
                    "french": french,
                    "russian": russian,
                    "background_query": chain["queries"][step_index - 1],
                }
            )
    fr_seen: dict[str, int] = {}
    ru_seen: dict[str, int] = {}
    errors: list[str] = []
    for row in rows:
        fr = normalize(row["french"])
        ru = normalize(row["russian"])
        if fr in fr_seen:
            errors.append(f"duplicate French: {row['index']} and {fr_seen[fr]}")
        if ru in ru_seen:
            errors.append(f"duplicate Russian: {row['index']} and {ru_seen[ru]}")
        fr_seen[fr] = int(row["index"])
        ru_seen[ru] = int(row["index"])
        if len(str(row["french"]).split()) > 18:
            errors.append(f"too long French row {row['index']}: {row['french']}")
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "french_chains_100.json").write_text(json.dumps(rows, ensure_ascii=False, indent=2), encoding="utf-8")
    with (OUT / "french_chains_100.csv").open("w", encoding="utf-8-sig", newline="") as fh:
        writer = csv.DictWriter(fh, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)
    report = {
        "status": "ready" if not errors and len(rows) == 100 else "failed",
        "rows": len(rows),
        "chains": len(CHAINS),
        "steps_per_chain": 4,
        "unique_french": len(fr_seen),
        "unique_russian": len(ru_seen),
        "errors": errors,
    }
    (OUT / "french_chains_quality_report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    return report


if __name__ == "__main__":
    print(json.dumps(generate(), ensure_ascii=False, indent=2))
