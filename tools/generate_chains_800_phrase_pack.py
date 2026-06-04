#!/usr/bin/env python3
"""Generate an 800-chain phrase pack for the Chains video format.

The pack is intentionally deterministic: every row is built from curated
scenario fragments, then passed through hard gates for duplicates, length,
chain growth, word-safe screen wrapping, and direct visual association.
"""

from __future__ import annotations

import csv
import json
import re
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any

import eng_to_ipa


OUT = Path("exports/chains/phrase_packs/chains_800_20260603")
OLD_PACK = Path("exports/chains/episode1/phrase_rows.json")
MAX_FINAL_EN_CHARS = 68
MAX_FINAL_RU_CHARS = 78
MAX_EN_LINE = 34
MAX_RU_LINE = 39
TARGET_CHAINS = 800
IPA_REPLACEMENTS = {
    "workbook*": "ˈwɜrkˌbʊk",
}


@dataclass(frozen=True)
class Subject:
    en: str
    ru: str
    form: str


@dataclass(frozen=True)
class Scenario:
    theme: str
    grammar_focus: str
    verb_en: str
    verb_ru: dict[str, str]
    obj_en: str
    obj_ru: str
    places: tuple[tuple[str, str], ...]
    times: tuple[tuple[str, str], ...]
    details: tuple[tuple[str, str], ...]
    visual_anchor: str
    query_base: str


SUBJECTS: tuple[Subject, ...] = (
    Subject("I", "Я", "m"),
    Subject("She", "Она", "f"),
    Subject("He", "Он", "m"),
    Subject("We", "Мы", "pl"),
    Subject("They", "Они", "pl"),
    Subject("My friend", "Мой друг", "m"),
    Subject("My sister", "Моя сестра", "f"),
    Subject("The students", "Студенты", "pl"),
    Subject("The neighbors", "Соседи", "pl"),
    Subject("The team", "Команда", "f"),
)


COMMON_TIMES = (
    ("this morning", "сегодня утром"),
    ("after lunch", "после обеда"),
    ("before noon", "до полудня"),
    ("in the evening", "вечером"),
    ("yesterday", "вчера"),
    ("before leaving", "перед выходом"),
    ("after work", "после работы"),
    ("last night", "прошлой ночью"),
)


def ru_forms(m: str, f: str, pl: str) -> dict[str, str]:
    return {"m": m, "f": f, "pl": pl}


SCENARIOS: tuple[Scenario, ...] = (
    Scenario("commute", "Past Simple + object + reason", "missed", ru_forms("опоздал на", "опоздала на", "опоздали на"), "the bus", "автобус", (("at the stop", "на остановке"), ("near the station", "у станции")), COMMON_TIMES, (("because of traffic", "из-за пробок"), ("by only five minutes", "всего на пять минут"), ("because of the rain", "из-за дождя")), "bus stop, bus, waiting passenger", "bus stop commuter"),
    Scenario("commute", "Past Simple + object + time", "caught", ru_forms("успел на", "успела на", "успели на"), "the train", "поезд", (("at the station", "на станции"), ("near platform three", "у третьей платформы")), COMMON_TIMES, (("at the last minute", "в последний момент"), ("without rushing", "без спешки"), ("with one small bag", "с одной небольшой сумкой")), "train platform, passenger, clock", "train platform passenger"),
    Scenario("commute", "Past Simple + route phrase", "changed", ru_forms("изменил", "изменила", "изменили"), "the route", "маршрут", (("near the bridge", "у моста"), ("outside the office", "у офиса")), COMMON_TIMES, (("because of roadworks", "из-за дорожных работ"), ("to save time", "чтобы сэкономить время"), ("after checking the map", "после проверки карты")), "map route, phone navigation", "phone map route"),
    Scenario("work", "Past Simple + recipient", "sent", ru_forms("отправил", "отправила", "отправили"), "the email", "письмо", (("to the manager", "менеджеру"), ("to the client", "клиенту")), COMMON_TIMES, (("with the file attached", "с прикреплённым файлом"), ("without mistakes", "без ошибок"), ("after one final check", "после последней проверки")), "email inbox, laptop, send button", "sending email laptop"),
    Scenario("work", "Past Simple + document object", "checked", ru_forms("проверил", "проверила", "проверили"), "the report", "отчёт", (("at the desk", "за столом"), ("in the office", "в офисе")), COMMON_TIMES, (("very carefully", "очень внимательно"), ("before the meeting", "перед встречей"), ("with the numbers open", "с открытыми цифрами")), "report pages, desk, careful review", "checking report desk"),
    Scenario("work", "Past Simple + schedule phrase", "moved", ru_forms("перенёс", "перенесла", "перенесли"), "the meeting", "встречу", (("to Monday", "на понедельник"), ("to the afternoon", "на вторую половину дня")), COMMON_TIMES, (("after the call", "после звонка"), ("because the room was busy", "потому что зал был занят"), ("to give everyone more time", "чтобы дать всем больше времени")), "calendar, meeting time, office", "calendar meeting schedule"),
    Scenario("work", "Past Simple + online meeting", "joined", ru_forms("подключился к", "подключилась к", "подключились к"), "the call", "звонку", (("from home", "из дома"), ("from the office", "из офиса")), COMMON_TIMES, (("right on time", "точно вовремя"), ("with the camera off", "с выключенной камерой"), ("after fixing the sound", "после настройки звука")), "video call, laptop, headphones", "video call laptop headphones"),
    Scenario("study", "Past Simple + study object", "finished", ru_forms("закончил", "закончила", "закончили"), "the homework", "домашнее задание", (("at the kitchen table", "за кухонным столом"), ("in the library", "в библиотеке")), COMMON_TIMES, (("before dinner", "до ужина"), ("without asking for help", "без просьбы о помощи"), ("after reading the rule", "после чтения правила")), "homework notebook, pencil", "student homework notebook"),
    Scenario("study", "Past Simple + question object", "asked", ru_forms("задал", "задала", "задали"), "a question", "вопрос", (("during the lesson", "во время урока"), ("after class", "после занятия")), COMMON_TIMES, (("about the example", "по поводу примера"), ("because the rule was unclear", "потому что правило было непонятно"), ("in simple words", "простыми словами")), "classroom question, raised hand", "student asking question classroom"),
    Scenario("study", "Past Simple + notes object", "wrote", ru_forms("написал", "написала", "написали"), "the notes", "заметки", (("in the notebook", "в тетради"), ("on a yellow card", "на жёлтой карточке")), COMMON_TIMES, (("in short lines", "короткими строками"), ("with one example", "с одним примером"), ("so they could repeat later", "чтобы повторить позже")), "notes notebook close up", "writing notes notebook"),
    Scenario("study", "Past Simple + problem object", "solved", ru_forms("решил", "решила", "решили"), "the problem", "задачу", (("on the board", "на доске"), ("in the workbook", "в рабочей тетради")), COMMON_TIMES, (("step by step", "шаг за шагом"), ("after seeing the pattern", "после того как увидели схему"), ("without guessing", "без угадывания")), "math problem board, workbook", "solving problem workbook"),
    Scenario("home", "Past Simple + household object", "cleaned", ru_forms("убрал", "убрала", "убрали"), "the kitchen", "кухню", (("after breakfast", "после завтрака"), ("before guests arrived", "до прихода гостей")), COMMON_TIMES, (("quickly", "быстро"), ("from top to bottom", "сверху донизу"), ("because everything was messy", "потому что всё было в беспорядке")), "clean kitchen, cloth, counter", "cleaning kitchen counter"),
    Scenario("home", "Past Simple + repair object", "fixed", ru_forms("починил", "починила", "починили"), "the shelf", "полку", (("in the hallway", "в коридоре"), ("near the door", "у двери")), COMMON_TIMES, (("with a small screwdriver", "маленькой отвёрткой"), ("before it fell", "до того как она упала"), ("after finding the loose screw", "после того как нашли слабый винт")), "shelf repair, screwdriver", "fixing shelf screwdriver"),
    Scenario("home", "Past Simple + routine action", "watered", ru_forms("полил", "полила", "полили"), "the plants", "растения", (("on the balcony", "на балконе"), ("by the window", "у окна")), COMMON_TIMES, (("because the soil was dry", "потому что земля была сухой"), ("with warm water", "тёплой водой"), ("before the heat started", "до начала жары")), "watering plants, balcony", "watering house plants"),
    Scenario("food", "Past Simple + meal object", "cooked", ru_forms("приготовил", "приготовила", "приготовили"), "dinner", "ужин", (("in the kitchen", "на кухне"), ("for the family", "для семьи")), COMMON_TIMES, (("with fresh vegetables", "со свежими овощами"), ("before everyone came home", "до возвращения всех домой"), ("without using a recipe", "без рецепта")), "cooking dinner, vegetables", "cooking dinner vegetables"),
    Scenario("food", "Past Simple + drink object", "made", ru_forms("сделал", "сделала", "сделали"), "coffee", "кофе", (("in the kitchen", "на кухне"), ("for the meeting", "для встречи")), COMMON_TIMES, (("with milk", "с молоком"), ("before opening the laptop", "перед открытием ноутбука"), ("because the morning was slow", "потому что утро тянулось медленно")), "coffee cup, kitchen", "making coffee kitchen"),
    Scenario("shopping", "Past Simple + purchase object", "bought", ru_forms("купил", "купила", "купили"), "bread", "хлеб", (("at the bakery", "в пекарне"), ("near the market", "у рынка")), COMMON_TIMES, (("for breakfast", "к завтраку"), ("because the shop was closing", "потому что магазин закрывался"), ("with cash", "наличными")), "bakery bread, customer", "buying bread bakery"),
    Scenario("shopping", "Past Simple + return object", "returned", ru_forms("вернул", "вернула", "вернули"), "the jacket", "куртку", (("to the store", "в магазин"), ("at the counter", "на стойке")), COMMON_TIMES, (("because it was too small", "потому что она была мала"), ("with the receipt", "с чеком"), ("before the deadline", "до срока возврата")), "returning jacket store counter", "return clothes store"),
    Scenario("shopping", "Past Simple + money object", "paid", ru_forms("оплатил", "оплатила", "оплатили"), "the bill", "счёт", (("at the cafe", "в кафе"), ("at the counter", "на кассе")), COMMON_TIMES, (("with a card", "картой"), ("before leaving", "перед уходом"), ("without splitting it", "без разделения счёта")), "paying bill card cafe", "paying cafe bill card"),
    Scenario("health", "Past Simple + appointment object", "booked", ru_forms("записался на", "записалась на", "записались на"), "an appointment", "приём", (("at the clinic", "в клинике"), ("with the doctor", "к врачу")), COMMON_TIMES, (("for next week", "на следующую неделю"), ("because the pain came back", "потому что боль вернулась"), ("through the app", "через приложение")), "doctor appointment phone clinic", "booking doctor appointment"),
    Scenario("health", "Past Simple + medicine object", "took", ru_forms("принял", "приняла", "приняли"), "the medicine", "лекарство", (("with water", "с водой"), ("after breakfast", "после завтрака")), COMMON_TIMES, (("exactly on time", "точно вовремя"), ("because the doctor said so", "потому что так сказал врач"), ("without skipping the dose", "не пропуская дозу")), "medicine glass water", "taking medicine water"),
    Scenario("health", "Past Simple + simple habit", "drank", ru_forms("выпил", "выпила", "выпили"), "water", "воду", (("after the run", "после пробежки"), ("at the desk", "за столом")), COMMON_TIMES, (("because it was hot", "потому что было жарко"), ("from a small bottle", "из маленькой бутылки"), ("before the meeting started", "до начала встречи")), "drinking water bottle", "drinking water bottle"),
    Scenario("tech", "Past Simple + device object", "charged", ru_forms("зарядил", "зарядила", "зарядили"), "the phone", "телефон", (("near the bed", "у кровати"), ("at the desk", "на столе")), COMMON_TIMES, (("because the battery was low", "потому что батарея садилась"), ("before the trip", "перед поездкой"), ("with a borrowed charger", "одолженной зарядкой")), "charging phone cable", "charging phone cable"),
    Scenario("tech", "Past Simple + file object", "saved", ru_forms("сохранил", "сохранила", "сохранили"), "the file", "файл", (("on the laptop", "на ноутбуке"), ("in the folder", "в папке")), COMMON_TIMES, (("before closing the program", "перед закрытием программы"), ("after editing", "после редактирования"), ("with a clear name", "с понятным названием")), "saving file laptop", "saving file laptop"),
    Scenario("tech", "Past Simple + password object", "reset", ru_forms("сбросил", "сбросила", "сбросили"), "the password", "пароль", (("on the website", "на сайте"), ("in the app", "в приложении")), COMMON_TIMES, (("after the warning appeared", "после появления предупреждения"), ("because the old one failed", "потому что старый не подошёл"), ("through email", "через почту")), "password reset screen", "reset password screen"),
    Scenario("tech", "Past Simple + update object", "updated", ru_forms("обновил", "обновила", "обновили"), "the app", "приложение", (("on the phone", "на телефоне"), ("before the lesson", "перед уроком")), COMMON_TIMES, (("because it kept freezing", "потому что оно зависало"), ("over Wi-Fi", "через Wi-Fi"), ("after seeing the notification", "после уведомления")), "app update phone", "updating app phone"),
    Scenario("social", "Past Simple + call object", "called", ru_forms("позвонил", "позвонила", "позвонили"), "a friend", "другу", (("from the car", "из машины"), ("from home", "из дома")), COMMON_TIMES, (("to ask for advice", "чтобы спросить совет"), ("because the plans changed", "потому что планы изменились"), ("after seeing the message", "после сообщения")), "phone call friend", "calling friend phone"),
    Scenario("social", "Past Simple + invitation object", "invited", ru_forms("пригласил", "пригласила", "пригласили"), "the neighbors", "соседей", (("for dinner", "на ужин"), ("to the party", "на вечеринку")), COMMON_TIMES, (("because everyone was free", "потому что все были свободны"), ("with a short message", "коротким сообщением"), ("after meeting them outside", "после встречи на улице")), "neighbors invitation dinner", "inviting neighbors dinner"),
    Scenario("family", "Past Simple + help object", "helped", ru_forms("помог", "помогла", "помогли"), "my brother", "моему брату", (("with the boxes", "с коробками"), ("in the garage", "в гараже")), COMMON_TIMES, (("because they were heavy", "потому что они были тяжёлыми"), ("before the rain started", "до начала дождя"), ("without complaining", "без жалоб")), "helping carry boxes", "helping carry boxes"),
    Scenario("travel", "Past Simple + hotel object", "booked", ru_forms("забронировал", "забронировала", "забронировали"), "the hotel", "отель", (("near the beach", "у пляжа"), ("in the city center", "в центре города")), COMMON_TIMES, (("for two nights", "на две ночи"), ("before the prices went up", "до повышения цен"), ("after reading the reviews", "после чтения отзывов")), "hotel booking travel", "booking hotel laptop"),
    Scenario("travel", "Past Simple + suitcase object", "packed", ru_forms("собрал", "собрала", "собрали"), "the suitcase", "чемодан", (("for the trip", "для поездки"), ("in the bedroom", "в спальне")), COMMON_TIMES, (("the night before", "накануне вечером"), ("without forgetting the passport", "не забыв паспорт"), ("with only warm clothes", "только с тёплой одеждой")), "packing suitcase bedroom", "packing suitcase travel"),
    Scenario("travel", "Past Simple + passport object", "checked", ru_forms("проверил", "проверила", "проверили"), "the passport", "паспорт", (("at the airport", "в аэропорту"), ("before the taxi arrived", "до приезда такси")), COMMON_TIMES, (("twice", "дважды"), ("because the date mattered", "потому что дата была важна"), ("next to the tickets", "рядом с билетами")), "passport tickets airport", "checking passport tickets"),
    Scenario("city", "Past Simple + directions object", "asked for", ru_forms("спросил", "спросила", "спросили"), "directions", "дорогу", (("near the museum", "у музея"), ("outside the metro", "у метро")), COMMON_TIMES, (("because the map was confusing", "потому что карта запутала"), ("from a local person", "у местного человека"), ("before sunset", "до заката")), "asking directions city map", "asking directions city"),
    Scenario("money", "Past Simple + cash object", "withdrew", ru_forms("снял", "сняла", "сняли"), "cash", "наличные", (("from the ATM", "в банкомате"), ("near the bank", "у банка")), COMMON_TIMES, (("for the taxi", "на такси"), ("because the card failed", "потому что карта не сработала"), ("before the shop closed", "до закрытия магазина")), "ATM cash withdrawal", "withdrawing cash ATM"),
    Scenario("money", "Past Simple + price object", "compared", ru_forms("сравнил", "сравнила", "сравнили"), "the prices", "цены", (("on two websites", "на двух сайтах"), ("in the store", "в магазине")), COMMON_TIMES, (("before buying", "перед покупкой"), ("to avoid overpaying", "чтобы не переплатить"), ("with the old receipt", "со старым чеком")), "comparing prices phone store", "comparing prices online"),
    Scenario("plans", "Past Simple + plan object", "changed", ru_forms("изменил", "изменила", "изменили"), "the plan", "план", (("after the call", "после звонка"), ("during the meeting", "во время встречи")), COMMON_TIMES, (("because the date moved", "потому что дата сместилась"), ("to keep it simple", "чтобы всё было проще"), ("after hearing the news", "после новости")), "calendar planning notes", "changing plan calendar"),
    Scenario("plans", "Past Simple + decision object", "made", ru_forms("принял", "приняла", "приняли"), "the decision", "решение", (("after the discussion", "после обсуждения"), ("with the team", "с командой")), COMMON_TIMES, (("because time was short", "потому что времени было мало"), ("without arguing", "без спора"), ("after checking the facts", "после проверки фактов")), "team decision meeting", "making decision meeting"),
    Scenario("communication", "Past Simple + message object", "left", ru_forms("оставил", "оставила", "оставили"), "a message", "сообщение", (("on the phone", "на телефоне"), ("in the group chat", "в групповом чате")), COMMON_TIMES, (("because nobody answered", "потому что никто не ответил"), ("with the address inside", "с адресом внутри"), ("before the meeting started", "до начала встречи")), "phone message chat", "leaving message phone"),
    Scenario("communication", "Past Simple + mistake object", "explained", ru_forms("объяснил", "объяснила", "объяснили"), "the mistake", "ошибку", (("to the customer", "клиенту"), ("during the call", "во время звонка")), COMMON_TIMES, (("in simple words", "простыми словами"), ("without blaming anyone", "никого не обвиняя"), ("because it caused confusion", "потому что она вызвала путаницу")), "explaining mistake call", "explaining mistake meeting"),
    Scenario("weather", "Past Simple + umbrella object", "took", ru_forms("взял", "взяла", "взяли"), "an umbrella", "зонт", (("from the hallway", "из коридора"), ("before going outside", "перед выходом")), COMMON_TIMES, (("because the sky was dark", "потому что небо потемнело"), ("just in case", "на всякий случай"), ("after checking the forecast", "после проверки прогноза")), "umbrella rain hallway", "taking umbrella rain"),
    Scenario("weather", "Past Simple + window object", "closed", ru_forms("закрыл", "закрыла", "закрыли"), "the window", "окно", (("in the bedroom", "в спальне"), ("before the storm", "перед бурей")), COMMON_TIMES, (("because the wind was strong", "потому что ветер был сильный"), ("before leaving home", "перед выходом из дома"), ("after hearing thunder", "после грома")), "closing window storm", "closing window storm"),
    Scenario("events", "Past Simple + seat object", "reserved", ru_forms("забронировал", "забронировала", "забронировали"), "a seat", "место", (("for the concert", "на концерт"), ("near the stage", "у сцены")), COMMON_TIMES, (("before tickets sold out", "до распродажи билетов"), ("for a friend", "для друга"), ("after checking the row", "после проверки ряда")), "concert seat ticket", "reserving concert seat"),
    Scenario("events", "Past Simple + photo object", "took", ru_forms("сделал", "сделала", "сделали"), "a photo", "фото", (("near the entrance", "у входа"), ("after the ceremony", "после церемонии")), COMMON_TIMES, (("with the whole group", "со всей группой"), ("because the light was perfect", "потому что свет был идеальный"), ("before everyone left", "до ухода всех")), "group photo event", "taking group photo"),
    Scenario("safety", "Past Simple + door object", "locked", ru_forms("запер", "заперла", "заперли"), "the door", "дверь", (("before sleeping", "перед сном"), ("before leaving", "перед уходом")), COMMON_TIMES, (("twice", "дважды"), ("because the street was noisy", "потому что улица была шумной"), ("after checking the handle", "после проверки ручки")), "locking door handle", "locking door handle"),
    Scenario("safety", "Past Simple + alarm object", "set", ru_forms("поставил", "поставила", "поставили"), "the alarm", "будильник", (("on the phone", "на телефоне"), ("for six thirty", "на шесть тридцать")), COMMON_TIMES, (("because the train was early", "потому что поезд был ранний"), ("before going to bed", "перед сном"), ("with a backup alarm", "с запасным будильником")), "setting alarm phone", "setting alarm phone"),
    Scenario("hobby", "Past Simple + song object", "practiced", ru_forms("потренировал", "потренировала", "потренировали"), "the song", "песню", (("on the guitar", "на гитаре"), ("in the living room", "в гостиной")), COMMON_TIMES, (("for twenty minutes", "двадцать минут"), ("before the lesson", "перед уроком"), ("slowly at first", "сначала медленно")), "guitar practice living room", "practicing guitar song"),
    Scenario("hobby", "Past Simple + picture object", "drew", ru_forms("нарисовал", "нарисовала", "нарисовали"), "a picture", "рисунок", (("in the notebook", "в блокноте"), ("by the window", "у окна")), COMMON_TIMES, (("with a black pencil", "чёрным карандашом"), ("because the idea was fresh", "потому что идея была свежей"), ("before the class started", "до начала занятия")), "drawing notebook pencil", "drawing pencil notebook"),
    Scenario("sport", "Past Simple + run object", "finished", ru_forms("закончил", "закончила", "закончили"), "the run", "пробежку", (("in the park", "в парке"), ("near the river", "у реки")), COMMON_TIMES, (("before breakfast", "до завтрака"), ("despite the cold", "несмотря на холод"), ("with a steady pace", "ровным темпом")), "running park morning", "finishing run park"),
    Scenario("sport", "Past Simple + game object", "watched", ru_forms("посмотрел", "посмотрела", "посмотрели"), "the game", "игру", (("at home", "дома"), ("with friends", "с друзьями")), COMMON_TIMES, (("until the end", "до конца"), ("because the score was close", "потому что счёт был равный"), ("on the big screen", "на большом экране")), "watching game TV friends", "watching sports game TV"),
)


def load_existing_phrases() -> set[str]:
    if not OLD_PACK.exists():
        return set()
    data = json.loads(OLD_PACK.read_text(encoding="utf-8"))
    return {normalize(row.get("english", "")) for row in data if row.get("english")}


def normalize(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", text.lower()).strip()


def strip_period(text: str) -> str:
    return text[:-1] if text.endswith(".") else text


def sentence(*parts: str) -> str:
    body = " ".join(part.strip() for part in parts if part.strip())
    body = re.sub(r"\s+", " ", body).strip()
    return body[:1].upper() + body[1:] + "."


def ru_sentence(*parts: str) -> str:
    body = " ".join(part.strip() for part in parts if part.strip())
    body = re.sub(r"\s+", " ", body).strip()
    body = re.sub(r" (?=чтобы|потому что)", ", ", body)
    return body[:1].upper() + body[1:] + "."


def wrap_words(text: str, max_chars: int, max_lines: int) -> list[str] | None:
    words = text.split()
    lines: list[str] = []
    current = ""
    for word in words:
        if len(word) > max_chars:
            return None
        candidate = word if not current else f"{current} {word}"
        if len(candidate) <= max_chars:
            current = candidate
        else:
            lines.append(current)
            current = word
    if current:
        lines.append(current)
    if len(lines) > max_lines:
        return None
    return lines


def ipa(text: str) -> str:
    converted = eng_to_ipa.convert(text)
    for bad, good in IPA_REPLACEMENTS.items():
        converted = converted.replace(bad, good)
    return converted.strip().strip("/")


def make_chain(chain_id: int, subject: Subject, scenario: Scenario, place: tuple[str, str], time_part: tuple[str, str], detail: tuple[str, str]) -> dict[str, Any] | None:
    verb_ru = scenario.verb_ru[subject.form]
    step1_en = sentence(subject.en, scenario.verb_en, scenario.obj_en)
    step2_en = sentence(strip_period(step1_en), place[0])
    step3_en = sentence(strip_period(step2_en), time_part[0])
    step4_en = sentence(strip_period(step3_en), detail[0])

    step1_ru = ru_sentence(subject.ru, verb_ru, scenario.obj_ru)
    step2_ru = ru_sentence(strip_period(step1_ru), place[1])
    step3_ru = ru_sentence(strip_period(step2_ru), time_part[1])
    if detail[1].startswith(("чтобы", "потому", "из-за", "до ", "после ", "несмотря")):
        step4_ru = ru_sentence(strip_period(step3_ru), detail[1])
    else:
        step4_ru = ru_sentence(subject.ru, detail[1], verb_ru, scenario.obj_ru, place[1], time_part[1])

    if len(step4_en) > MAX_FINAL_EN_CHARS or len(step4_ru) > MAX_FINAL_RU_CHARS:
        return None
    en_lines = wrap_words(step4_en.upper().rstrip("."), MAX_EN_LINE, 2)
    ru_lines = wrap_words(step4_ru.upper().rstrip("."), MAX_RU_LINE, 2)
    if not en_lines or not ru_lines:
        return None
    if any("-" in line[-1:] for line in en_lines + ru_lines):
        return None

    chunks = [
        {"en": subject.en, "ru": subject.ru},
        {"en": scenario.verb_en, "ru": verb_ru},
        {"en": scenario.obj_en, "ru": scenario.obj_ru},
        {"en": place[0], "ru": place[1]},
        {"en": time_part[0], "ru": time_part[1]},
        {"en": detail[0], "ru": detail[1]},
    ]
    return {
        "id": f"CH800-{chain_id:03d}",
        "theme": scenario.theme,
        "grammar_focus": scenario.grammar_focus,
        "chain_steps": [
            {"step": 1, "en": step1_en, "ru": step1_ru},
            {"step": 2, "en": step2_en, "ru": step2_ru},
            {"step": 3, "en": step3_en, "ru": step3_ru},
            {"step": 4, "en": step4_en, "ru": step4_ru},
        ],
        "final_en": step4_en,
        "final_ru": step4_ru,
        "ipa": ipa(step4_en),
        "breakdown": chunks,
        "screen_lines": {"en": en_lines, "ru": ru_lines},
        "background_gate": {
            "must_show": scenario.visual_anchor,
            "direct_association_rule": "The accepted frame must clearly show the named action/object, not just a vague mood.",
            "search_queries": [
                scenario.query_base,
                f"{scenario.query_base} {scenario.theme}",
                f"{scenario.obj_en} {place[0]} stock video",
                f"{scenario.visual_anchor} close up",
            ],
        },
    }


def validate_pack(rows: list[dict[str, Any]], old_phrases: set[str]) -> dict[str, Any]:
    errors: list[str] = []
    seen: set[str] = set()
    theme_counts: dict[str, int] = {}
    max_en = 0
    max_ru = 0
    for row in rows:
        key = normalize(row["final_en"])
        theme_counts[row["theme"]] = theme_counts.get(row["theme"], 0) + 1
        max_en = max(max_en, len(row["final_en"]))
        max_ru = max(max_ru, len(row["final_ru"]))
        if key in seen:
            errors.append(f"duplicate final_en: {row['id']} {row['final_en']}")
        seen.add(key)
        if key in old_phrases:
            errors.append(f"old-pack repeat: {row['id']} {row['final_en']}")
        steps = row["chain_steps"]
        for prev, cur in zip(steps, steps[1:]):
            if not strip_period(prev["en"]).lower() in cur["en"].lower():
                errors.append(f"chain does not grow EN: {row['id']} step {cur['step']}")
        if len(row["screen_lines"]["en"]) > 2 or len(row["screen_lines"]["ru"]) > 2:
            errors.append(f"screen lines overflow: {row['id']}")
        if any(len(line) > MAX_EN_LINE for line in row["screen_lines"]["en"]):
            errors.append(f"EN line too long: {row['id']}")
        if any(len(line) > MAX_RU_LINE for line in row["screen_lines"]["ru"]):
            errors.append(f"RU line too long: {row['id']}")
        if not row["background_gate"]["must_show"] or "vague" in row["background_gate"]["must_show"].lower():
            errors.append(f"weak visual anchor: {row['id']}")
        if "*" in row["ipa"]:
            errors.append(f"IPA unknown word: {row['id']} {row['ipa']}")
    if len(rows) != TARGET_CHAINS:
        errors.append(f"expected {TARGET_CHAINS} rows, got {len(rows)}")
    return {
        "generated_at": datetime.now().isoformat(timespec="seconds"),
        "target_chains": TARGET_CHAINS,
        "actual_chains": len(rows),
        "error_count": len(errors),
        "errors": errors[:200],
        "theme_counts": dict(sorted(theme_counts.items())),
        "max_final_en_chars": max_en,
        "max_final_ru_chars": max_ru,
        "screen_gate": {
            "max_en_line_chars": MAX_EN_LINE,
            "max_ru_line_chars": MAX_RU_LINE,
            "max_lines_each": 2,
            "word_breaks_allowed": False,
        },
        "background_gate": "Every row has a concrete must_show object/action and stock-video queries.",
    }


def build_rows() -> tuple[list[dict[str, Any]], int]:
    old_phrases = load_existing_phrases()
    scenario_buckets: list[list[dict[str, Any]]] = []
    rejected = 0
    chain_id = 1
    for scenario in SCENARIOS:
        bucket: list[dict[str, Any]] = []
        local_seen: set[str] = set()
        for subject in SUBJECTS:
            for place in scenario.places:
                for time_part in scenario.times:
                    for detail in scenario.details:
                        row = make_chain(chain_id, subject, scenario, place, time_part, detail)
                        if row is None:
                            rejected += 1
                            continue
                        key = normalize(row["final_en"])
                        if key in old_phrases or key in local_seen:
                            rejected += 1
                            continue
                        local_seen.add(key)
                        bucket.append(row)
                        chain_id += 1
        scenario_buckets.append(bucket)

    rows: list[dict[str, Any]] = []
    seen = set(old_phrases)
    bucket_index = 0
    while len(rows) < TARGET_CHAINS and any(scenario_buckets):
        bucket = scenario_buckets[bucket_index % len(scenario_buckets)]
        if bucket:
            row = bucket.pop(0)
            key = normalize(row["final_en"])
            if key not in seen:
                row["id"] = f"CH800-{len(rows) + 1:03d}"
                seen.add(key)
                rows.append(row)
            else:
                rejected += 1
        bucket_index += 1
    return rows, rejected


def write_outputs(rows: list[dict[str, Any]], report: dict[str, Any], rejected: int) -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "chains_800_phrases.json").write_text(json.dumps(rows, ensure_ascii=False, indent=2), encoding="utf-8")
    with (OUT / "chains_800_phrases.jsonl").open("w", encoding="utf-8", newline="\n") as handle:
        for row in rows:
            handle.write(json.dumps(row, ensure_ascii=False) + "\n")
    with (OUT / "chains_800_phrases.csv").open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(
            handle,
            fieldnames=[
                "id",
                "theme",
                "grammar_focus",
                "step1_en",
                "step1_ru",
                "step2_en",
                "step2_ru",
                "step3_en",
                "step3_ru",
                "step4_en",
                "step4_ru",
                "ipa",
                "screen_en",
                "screen_ru",
                "must_show",
                "queries",
                "breakdown",
            ],
        )
        writer.writeheader()
        for row in rows:
            steps = row["chain_steps"]
            writer.writerow(
                {
                    "id": row["id"],
                    "theme": row["theme"],
                    "grammar_focus": row["grammar_focus"],
                    "step1_en": steps[0]["en"],
                    "step1_ru": steps[0]["ru"],
                    "step2_en": steps[1]["en"],
                    "step2_ru": steps[1]["ru"],
                    "step3_en": steps[2]["en"],
                    "step3_ru": steps[2]["ru"],
                    "step4_en": steps[3]["en"],
                    "step4_ru": steps[3]["ru"],
                    "ipa": row["ipa"],
                    "screen_en": " / ".join(row["screen_lines"]["en"]),
                    "screen_ru": " / ".join(row["screen_lines"]["ru"]),
                    "must_show": row["background_gate"]["must_show"],
                    "queries": " | ".join(row["background_gate"]["search_queries"]),
                    "breakdown": "; ".join(f"{p['en']} — {p['ru']}" for p in row["breakdown"]),
                }
            )
    report = {**report, "rejected_candidates": rejected}
    (OUT / "chains_800_gate_report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    preview_lines = [
        "# Chains 800 Preview",
        "",
        f"Generated chains: {len(rows)}",
        f"Gate errors: {report['error_count']}",
        f"Rejected candidates before final pack: {rejected}",
        "",
    ]
    for row in rows[:40]:
        preview_lines.extend(
            [
                f"## {row['id']} · {row['theme']}",
                f"1. {row['chain_steps'][0]['en']} — {row['chain_steps'][0]['ru']}",
                f"2. {row['chain_steps'][1]['en']} — {row['chain_steps'][1]['ru']}",
                f"3. {row['chain_steps'][2]['en']} — {row['chain_steps'][2]['ru']}",
                f"4. {row['final_en']} — {row['final_ru']}",
                f"IPA: /{row['ipa']}/",
                f"Breakdown: {'; '.join(f'{p['en']} — {p['ru']}' for p in row['breakdown'])}",
                f"Background must show: {row['background_gate']['must_show']}",
                "",
            ]
        )
    (OUT / "chains_800_preview.md").write_text("\n".join(preview_lines), encoding="utf-8")


def main() -> int:
    rows, rejected = build_rows()
    report = validate_pack(rows, load_existing_phrases())
    write_outputs(rows, report, rejected)
    print(json.dumps({"out": str(OUT), "chains": len(rows), "errors": report["error_count"], "rejected": rejected}, ensure_ascii=False, indent=2))
    return 0 if report["error_count"] == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
