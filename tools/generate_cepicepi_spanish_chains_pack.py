#!/usr/bin/env python3
"""Build a new Spanish-Russian A1 chain phrase pack for the Cepicepi template."""

from __future__ import annotations

import csv
import json
import re
from pathlib import Path


OUT = Path("exports/chains/cepicepi_spanish_ru_a1_20260605")


CHAINS = [
    {
        "scenario": "morning coffee",
        "queries": ["person making coffee morning kitchen", "coffee cup kitchen morning", "person drinking coffee before work", "coffee breakfast early morning home"],
        "steps": [
            ("Preparé café.", "Я приготовил кофе."),
            ("Preparé café en la cocina.", "Я приготовил кофе на кухне."),
            ("Preparé café en la cocina antes del trabajo.", "Я приготовил кофе на кухне перед работой."),
            ("Preparé café en la cocina antes del trabajo porque tenía sueño.", "Я приготовил кофе на кухне перед работой, потому что хотел спать."),
        ],
    },
    {
        "scenario": "library book",
        "queries": ["student taking book library", "book on library table", "student reading book after class", "quiet library study book"],
        "steps": [
            ("Tomé un libro.", "Я взял книгу."),
            ("Tomé un libro en la biblioteca.", "Я взял книгу в библиотеке."),
            ("Tomé un libro en la biblioteca después de la clase.", "Я взял книгу в библиотеке после занятия."),
            ("Tomé un libro en la biblioteca después de la clase para estudiar.", "Я взял книгу в библиотеке после занятия, чтобы учиться."),
        ],
    },
    {
        "scenario": "window rain",
        "queries": ["woman closing window rain home", "rain on window apartment", "person closing window before leaving", "rainy day closing window"],
        "steps": [
            ("Cerré la ventana.", "Я закрыл окно."),
            ("Cerré la ventana de mi cuarto.", "Я закрыл окно в своей комнате."),
            ("Cerré la ventana de mi cuarto antes de salir.", "Я закрыл окно в своей комнате перед выходом."),
            ("Cerré la ventana de mi cuarto antes de salir porque llovía.", "Я закрыл окно в своей комнате перед выходом, потому что шел дождь."),
        ],
    },
    {
        "scenario": "supermarket milk",
        "queries": ["person buying milk supermarket", "milk bottle supermarket shelf", "person buying milk after work", "supermarket dairy aisle evening"],
        "steps": [
            ("Compré leche.", "Я купил молоко."),
            ("Compré leche en el supermercado.", "Я купил молоко в супермаркете."),
            ("Compré leche en el supermercado después del trabajo.", "Я купил молоко в супермаркете после работы."),
            ("Compré leche en el supermercado después del trabajo porque no había leche en casa.", "Я купил молоко в супермаркете после работы, потому что дома не было молока."),
        ],
    },
    {
        "scenario": "phone call",
        "queries": ["woman calling friend phone home", "smartphone call at home", "person calling friend in evening", "phone call quiet room evening"],
        "steps": [
            ("Llamé a mi amiga.", "Я позвонила подруге."),
            ("Llamé a mi amiga por la tarde.", "Я позвонила подруге вечером."),
            ("Llamé a mi amiga por la tarde desde mi casa.", "Я позвонила подруге вечером из дома."),
            ("Llamé a mi amiga por la tarde desde mi casa porque quería hablar.", "Я позвонила подруге вечером из дома, потому что хотела поговорить."),
        ],
    },
    {
        "scenario": "clean shoes",
        "queries": ["person cleaning shoes at home", "shoes near door cleaning", "cleaning shoes before school", "dirty shoes cleaned near entrance"],
        "steps": [
            ("Limpié mis zapatos.", "Я почистил свои туфли."),
            ("Limpié mis zapatos junto a la puerta.", "Я почистил свои туфли у двери."),
            ("Limpié mis zapatos junto a la puerta antes de la escuela.", "Я почистил свои туфли у двери перед школой."),
            ("Limpié mis zapatos junto a la puerta antes de la escuela porque estaban sucios.", "Я почистил свои туфли у двери перед школой, потому что они были грязные."),
        ],
    },
    {
        "scenario": "family dinner",
        "queries": ["family setting table dinner", "plates on dinner table home", "person setting table before dinner", "family dinner table evening"],
        "steps": [
            ("Puse la mesa.", "Я накрыл стол."),
            ("Puse la mesa para mi familia.", "Я накрыл стол для своей семьи."),
            ("Puse la mesa para mi familia antes de la cena.", "Я накрыл стол для своей семьи перед ужином."),
            ("Puse la mesa para mi familia antes de la cena porque todos tenían hambre.", "Я накрыл стол для своей семьи перед ужином, потому что все были голодны."),
        ],
    },
    {
        "scenario": "bus stop",
        "queries": ["man waiting bus stop morning", "bus stop city morning", "person waiting bus before work", "bus stop cold morning"],
        "steps": [
            ("Esperé el autobús.", "Я ждал автобус."),
            ("Esperé el autobús en la parada.", "Я ждал автобус на остановке."),
            ("Esperé el autobús en la parada por la mañana.", "Я ждал автобус на остановке утром."),
            ("Esperé el autobús en la parada por la mañana porque mi coche no funcionaba.", "Я ждал автобус на остановке утром, потому что моя машина не работала."),
        ],
    },
    {
        "scenario": "homework desk",
        "queries": ["student doing homework desk", "notebook pencil desk homework", "student doing homework after lunch", "homework desk quiet afternoon"],
        "steps": [
            ("Hice la tarea.", "Я сделал домашнее задание."),
            ("Hice la tarea en mi escritorio.", "Я сделал домашнее задание за своим столом."),
            ("Hice la tarea en mi escritorio después de comer.", "Я сделал домашнее задание за своим столом после еды."),
            ("Hice la tarea en mi escritorio después de comer para tener la noche libre.", "Я сделал домашнее задание за своим столом после еды, чтобы вечер был свободен."),
        ],
    },
    {
        "scenario": "park photo",
        "queries": ["woman taking photo park", "phone photo flowers park", "person taking photo during walk", "sunny park taking picture"],
        "steps": [
            ("Saqué una foto.", "Я сделал фотографию."),
            ("Saqué una foto en el parque.", "Я сделал фотографию в парке."),
            ("Saqué una foto en el parque durante el paseo.", "Я сделал фотографию в парке во время прогулки."),
            ("Saqué una foto en el parque durante el paseo porque las flores eran bonitas.", "Я сделал фотографию в парке во время прогулки, потому что цветы были красивыми."),
        ],
    },
    {
        "scenario": "train ticket",
        "queries": ["person buying train ticket station", "train ticket machine station", "buying train ticket before trip", "railway station ticket morning"],
        "steps": [
            ("Compré un billete.", "Я купил билет."),
            ("Compré un billete en la estación.", "Я купил билет на вокзале."),
            ("Compré un billete en la estación antes del viaje.", "Я купил билет на вокзале перед поездкой."),
            ("Compré un billete en la estación antes del viaje porque quería llegar temprano.", "Я купил билет на вокзале перед поездкой, потому что хотел приехать рано."),
        ],
    },
    {
        "scenario": "small soup",
        "queries": ["person cooking soup kitchen", "soup pot kitchen home", "cooking soup for lunch", "warm soup cold day home"],
        "steps": [
            ("Cociné sopa.", "Я приготовил суп."),
            ("Cociné sopa para el almuerzo.", "Я приготовил суп на обед."),
            ("Cociné sopa para el almuerzo en casa.", "Я приготовил суп на обед дома."),
            ("Cociné sopa para el almuerzo en casa porque hacía frío.", "Я приготовил суп на обед дома, потому что было холодно."),
        ],
    },
    {
        "scenario": "gym bag",
        "queries": ["person packing gym bag", "sports bag at home", "packing gym bag before training", "gym bag shoes towel"],
        "steps": [
            ("Preparé mi bolsa.", "Я собрал свою сумку."),
            ("Preparé mi bolsa para el gimnasio.", "Я собрал свою сумку для спортзала."),
            ("Preparé mi bolsa para el gimnasio antes de entrenar.", "Я собрал свою сумку для спортзала перед тренировкой."),
            ("Preparé mi bolsa para el gimnasio antes de entrenar porque no quería olvidar nada.", "Я собрал свою сумку для спортзала перед тренировкой, потому что не хотел ничего забыть."),
        ],
    },
    {
        "scenario": "dog walk",
        "queries": ["person walking dog street", "dog leash near park", "walking dog after dinner", "evening dog walk neighborhood"],
        "steps": [
            ("Paseé al perro.", "Я выгулял собаку."),
            ("Paseé al perro cerca del parque.", "Я выгулял собаку рядом с парком."),
            ("Paseé al perro cerca del parque después de cenar.", "Я выгулял собаку рядом с парком после ужина."),
            ("Paseé al perro cerca del parque después de cenar porque necesitaba aire.", "Я выгулял собаку рядом с парком после ужина, потому что мне нужен был воздух."),
        ],
    },
    {
        "scenario": "doctor form",
        "queries": ["person filling form clinic", "medical form pen clinic", "filling form before appointment", "clinic waiting room paperwork"],
        "steps": [
            ("Rellené un formulario.", "Я заполнил анкету."),
            ("Rellené un formulario en la clínica.", "Я заполнил анкету в клинике."),
            ("Rellené un formulario en la clínica antes de la cita.", "Я заполнил анкету в клинике перед приемом."),
            ("Rellené un formulario en la clínica antes de la cita porque era necesario.", "Я заполнил анкету в клинике перед приемом, потому что это было необходимо."),
        ],
    },
    {
        "scenario": "kitchen floor",
        "queries": ["person sweeping kitchen floor", "broom kitchen floor", "cleaning floor after breakfast", "sunny kitchen sweeping floor"],
        "steps": [
            ("Barrí el suelo.", "Я подмел пол."),
            ("Barrí el suelo de la cocina.", "Я подмел пол на кухне."),
            ("Barrí el suelo de la cocina después del desayuno.", "Я подмел пол на кухне после завтрака."),
            ("Barrí el suelo de la cocina después del desayuno porque había migas.", "Я подмел пол на кухне после завтрака, потому что были крошки."),
        ],
    },
    {
        "scenario": "birthday card",
        "queries": ["woman writing birthday card", "birthday card pen table", "writing birthday card before party", "gift birthday card home"],
        "steps": [
            ("Escribí una tarjeta.", "Я написал открытку."),
            ("Escribí una tarjeta para mi hermana.", "Я написал открытку для сестры."),
            ("Escribí una tarjeta para mi hermana antes de la fiesta.", "Я написал открытку для сестры перед вечеринкой."),
            ("Escribí una tarjeta para mi hermana antes de la fiesta porque era su cumpleaños.", "Я написал открытку для сестры перед вечеринкой, потому что у нее был день рождения."),
        ],
    },
    {
        "scenario": "new shirt",
        "queries": ["person ironing shirt home", "shirt iron ironing board", "ironing shirt before meeting", "clean shirt morning preparation"],
        "steps": [
            ("Planché una camisa.", "Я погладил рубашку."),
            ("Planché una camisa blanca.", "Я погладил белую рубашку."),
            ("Planché una camisa blanca antes de la reunión.", "Я погладил белую рубашку перед встречей."),
            ("Planché una camisa blanca antes de la reunión porque quería verme bien.", "Я погладил белую рубашку перед встречей, потому что хотел хорошо выглядеть."),
        ],
    },
    {
        "scenario": "school lunch",
        "queries": ["mother preparing lunch box", "lunch box kitchen morning", "preparing lunch before school", "healthy lunch box home"],
        "steps": [
            ("Preparé el almuerzo.", "Я приготовил обед."),
            ("Preparé el almuerzo para mi hijo.", "Я приготовил обед для сына."),
            ("Preparé el almuerzo para mi hijo antes de la escuela.", "Я приготовил обед для сына перед школой."),
            ("Preparé el almuerzo para mi hijo antes de la escuela porque tenía un día largo.", "Я приготовил обед для сына перед школой, потому что у него был долгий день."),
        ],
    },
    {
        "scenario": "hotel key",
        "queries": ["person taking hotel key reception", "hotel key card reception desk", "checking in hotel evening", "hotel reception travel key card"],
        "steps": [
            ("Tomé la llave.", "Я взял ключ."),
            ("Tomé la llave en el hotel.", "Я взял ключ в отеле."),
            ("Tomé la llave en el hotel por la noche.", "Я взял ключ в отеле вечером."),
            ("Tomé la llave en el hotel por la noche porque estaba cansado.", "Я взял ключ в отеле вечером, потому что устал."),
        ],
    },
    {
        "scenario": "green salad",
        "queries": ["person making salad kitchen", "green salad bowl kitchen", "making salad for dinner", "fresh vegetables salad home"],
        "steps": [
            ("Hice una ensalada.", "Я сделал салат."),
            ("Hice una ensalada con verduras.", "Я сделал салат с овощами."),
            ("Hice una ensalada con verduras para la cena.", "Я сделал салат с овощами на ужин."),
            ("Hice una ensalada con verduras para la cena porque quería comer algo ligero.", "Я сделал салат с овощами на ужин, потому что хотел съесть что-то легкое."),
        ],
    },
    {
        "scenario": "pharmacy medicine",
        "queries": ["person buying medicine pharmacy", "pharmacy counter medicine", "buying medicine after doctor", "pharmacy medicine cold symptoms"],
        "steps": [
            ("Compré medicina.", "Я купил лекарство."),
            ("Compré medicina en la farmacia.", "Я купил лекарство в аптеке."),
            ("Compré medicina en la farmacia después del médico.", "Я купил лекарство в аптеке после врача."),
            ("Compré medicina en la farmacia después del médico porque me dolía la garganta.", "Я купил лекарство в аптеке после врача, потому что у меня болело горло."),
        ],
    },
    {
        "scenario": "desk lamp study",
        "queries": ["student turning on desk lamp", "desk lamp notebook night study", "studying Spanish at night desk", "quiet study desk lamp"],
        "steps": [
            ("Encendí la lámpara.", "Я включил лампу."),
            ("Encendí la lámpara en mi escritorio.", "Я включил лампу на своем столе."),
            ("Encendí la lámpara en mi escritorio para estudiar.", "Я включил лампу на своем столе, чтобы учиться."),
            ("Encendí la lámpara en mi escritorio para estudiar porque la habitación estaba oscura.", "Я включил лампу на своем столе, чтобы учиться, потому что в комнате было темно."),
        ],
    },
    {
        "scenario": "taxi airport",
        "queries": ["person taking taxi airport", "taxi airport suitcase", "taking taxi early morning", "airport taxi travel luggage"],
        "steps": [
            ("Tomé un taxi.", "Я взял такси."),
            ("Tomé un taxi al aeropuerto.", "Я взял такси в аэропорт."),
            ("Tomé un taxi al aeropuerto por la mañana.", "Я взял такси в аэропорт утром."),
            ("Tomé un taxi al aeropuerto por la mañana porque mi vuelo era temprano.", "Я взял такси в аэропорт утром, потому что мой рейс был ранним."),
        ],
    },
    {
        "scenario": "warm tea",
        "queries": ["person making tea kitchen", "tea cup kitchen table", "making tea before bed", "warm tea evening home"],
        "steps": [
            ("Hice té.", "Я сделал чай."),
            ("Hice té caliente.", "Я сделал горячий чай."),
            ("Hice té caliente antes de dormir.", "Я сделал горячий чай перед сном."),
            ("Hice té caliente antes de dormir porque quería descansar.", "Я сделал горячий чай перед сном, потому что хотел отдохнуть."),
        ],
    },
]


def normalize(text: str) -> str:
    return re.sub(r"\s+", " ", text.strip().casefold())


def generate() -> dict[str, object]:
    rows = []
    for chain_index, chain in enumerate(CHAINS, start=1):
        for step_index, (spanish, russian) in enumerate(chain["steps"], start=1):
            rows.append(
                {
                    "index": len(rows) + 1,
                    "chain": chain_index,
                    "step": step_index,
                    "scenario": chain["scenario"],
                    "spanish": spanish,
                    "russian": russian,
                    "background_query": chain["queries"][step_index - 1],
                }
            )
    es_seen: dict[str, int] = {}
    ru_seen: dict[str, int] = {}
    errors: list[str] = []
    for row in rows:
        es = normalize(row["spanish"])
        ru = normalize(row["russian"])
        if es in es_seen:
            errors.append(f"duplicate Spanish: {row['index']} and {es_seen[es]}")
        if ru in ru_seen:
            errors.append(f"duplicate Russian: {row['index']} and {ru_seen[ru]}")
        es_seen[es] = int(row["index"])
        ru_seen[ru] = int(row["index"])
        if len(str(row["spanish"]).split()) > 16:
            errors.append(f"too long Spanish row {row['index']}: {row['spanish']}")
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "spanish_chains_100.json").write_text(json.dumps(rows, ensure_ascii=False, indent=2), encoding="utf-8")
    with (OUT / "spanish_chains_100.csv").open("w", encoding="utf-8-sig", newline="") as fh:
        writer = csv.DictWriter(fh, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)
    report = {
        "status": "ready" if not errors and len(rows) == 100 else "failed",
        "rows": len(rows),
        "chains": len(CHAINS),
        "steps_per_chain": 4,
        "unique_spanish": len(es_seen),
        "unique_russian": len(ru_seen),
        "errors": errors,
    }
    (OUT / "spanish_chains_quality_report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    return report


if __name__ == "__main__":
    print(json.dumps(generate(), ensure_ascii=False, indent=2))
