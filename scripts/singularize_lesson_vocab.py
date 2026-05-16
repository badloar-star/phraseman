#!/usr/bin/env python3
"""Singularize plural noun lemmas in lesson_words.tsx (pos: nouns only) and VOCABULARY rows."""

from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

# plural_en_lower -> (singular_en, ru, uk, es)  — English UI uses lowercase for most lesson words
NOUN_REPLACE: dict[str, tuple[str, str, str, str]] = {
    "friends": ("friend", "Друг", "Друг", "amigo"),
    "enemies": ("enemy", "Враг", "Ворог", "enemigo"),
    "books": ("book", "Книга", "Книга", "libro"),
    "dishes": ("dish", "Блюдо", "Страва", "plato"),
    "keys": ("key", "Ключ", "Ключ", "llave"),
    "letters": ("letter", "Письмо", "Лист", "carta"),
    "strangers": ("stranger", "Незнакомец", "Незнайомець", "extraño"),
    "ads": ("ad", "Рекламное объявление", "Рекламне оголошення", "anuncio"),
    "details": ("detail", "Деталь", "Деталь", "detalle"),
    "masks": ("mask", "Маска", "Маска", "mascarilla"),
    "messages": ("message", "Сообщение", "Повідомлення", "mensaje"),
    "rules": ("rule", "Правило", "Правило", "norma"),
    "secrets": ("secret", "Секрет", "Секрет", "secreto"),
    "tickets": ("ticket", "Билет", "Квиток", "entrada"),
    "vegetables": ("vegetable", "Овощ", "Овоч", "verdura"),
    "cards": ("card", "Карточка", "Картка", "tarjeta"),
    "mistakes": ("mistake", "Ошибка", "Помилка", "error"),
    "taxes": ("tax", "Налог", "Податок", "impuesto"),
    "groceries": ("grocery bag", "Продукт (бакалея)", "Продукт", "abarrote"),
    "guests": ("guest", "Гость", "Гість", "huésped"),
    "bookings": ("booking", "Бронирование", "Бронювання", "reserva"),
    "chargers": ("charger", "Зарядка", "Зарядка", "cargador"),
    "documents": ("document", "Документ", "Документ", "documento"),
    "mondays": ("Monday", "Понедельник", "Понеділок", "lunes"),
    "saturdays": ("Saturday", "Суббота", "Субота", "sábado"),
    "sundays": ("Sunday", "Воскресенье", "Неділя", "domingo"),
    "thursdays": ("Thursday", "Четверг", "Четвер", "jueves"),
    "tuesdays": ("Tuesday", "Вторник", "Вівторок", "martes"),
    "wednesdays": ("Wednesday", "Среда", "Середа", "miércoles"),
    "weekends": ("weekend", "Выходной (день)", "Вихідний", "fin de semana"),
    "apples": ("apple", "Яблоко", "Яблуко", "manzana"),
    "cafes": ("cafe", "Кафе", "Кафе", "café"),
    "cars": ("car", "Машина", "Машина", "coche"),
    "desserts": ("dessert", "Десерт", "Десерт", "postre"),
    "magazines": ("magazine", "Журнал", "Журнал", "revista"),
    "mountains": ("mountain", "Гора", "Гора", "montaña"),
    "pens": ("pen", "Ручка", "Ручка", "bolígrafo"),
    "pharmacies": ("pharmacy", "Аптека", "Аптека", "farmacia"),
    "photos": ("photo", "Фотография", "Фотографія", "foto"),
    "places": ("place", "Место", "Місце", "lugar"),
    "printers": ("printer", "Принтер", "Принтер", "impresora"),
    "questions": ("question", "Вопрос", "Питання", "pregunta"),
    "stars": ("star", "Звезда", "Зірка", "estrella"),
    "students": ("student", "Студент", "Студент", "estudiante"),
    "tasks": ("task", "Задача", "Завдання", "tarea"),
    "towels": ("towel", "Полотенце", "Рушник", "toalla"),
    "trees": ("tree", "Дерево", "Дерево", "árbol"),
    "windows": ("window", "Окно", "Вікно", "ventana"),
    "days": ("day", "День", "День", "día"),
    "hours": ("hour", "Час / часов", "Година", "hora"),
    "minutes": ("minute", "Минута", "Хвилина", "minuto"),
    "plants": ("plant", "Растение", "Рослина", "planta"),
    "shelves": ("shelf", "Полка", "Полиця", "estante"),
    "shoes": ("shoe", "Обувь (туфля)", "Взуття (туфля)", "zapato"),
    "suitcases": ("suitcase", "Чемодан", "Валіза", "maleta"),
    "bags": ("bag", "Сумка", "Сумка", "bolsa"),
    "fruits": ("fruit", "Фрукт", "Фрукт", "fruta"),
    "words": ("word", "Слово", "Слово", "palabra"),
    "armchairs": ("armchair", "Кресло", "Крісло", "sillón"),
    "boots": ("boot", "Ботинок", "Черевик", "bota"),
    "gloves": ("glove", "Перчатка", "Рукавичка", "guante"),
    "batteries": ("battery", "Батарейка", "Батарейка", "batería"),
    "papers": ("paper", "Бумага", "Папір", "papel"),
    "terms": ("term", "Условие", "Умова", "término"),
    "people": ("person", "Человек", "Людина", "persona"),
    "children": ("child", "Ребёнок", "Дитина", "niño"),
    "builders": ("builder", "Строитель", "Будівельник", "constructor"),
    "conditions": ("condition", "Условие", "Умова", "condición"),
    "farmers": ("farmer", "Фермер", "Фермер", "granjero"),
    "flowers": ("flower", "Цветок", "Квітка", "flor"),
    "gardeners": ("gardener", "Садовник", "Садівник", "jardinero"),
    "gifts": ("gift", "Подарок", "Подарунок", "regalo"),
    "panels": ("panel", "Панель", "Панель", "panel"),
    "gates": ("gate", "Калитка", "Хвіртка", "portillo"),
    "berries": ("berry", "Ягода", "Ягода", "baya"),
    "watches": ("watch", "Часы (наручные)", "Годинник", "reloj"),
    "blueprints": ("blueprint", "Чертёж", "Креслення", "plano"),
    "lamps": ("lamp", "Лампа", "Лампа", "lámpara"),
    "newspapers": ("newspaper", "Газета", "Газета", "periódico"),
    "stairs": ("stair step", "Ступенька", "Сходинка", "escalón"),
    "sneakers": ("sneaker", "Кроссовок", "Кросівок", "zapatilla"),
    "boxes": ("box", "Ящик (коробка)", "Ящик (коробка)", "caja"),
    "bushes": ("bush", "Куст", "Кущ", "arbusto"),
    "clouds": ("cloud", "Облако", "Хмара", "nube"),
    "forests": ("forest", "Лес", "Ліс", "bosque"),
    "hills": ("hill", "Холм", "Пагорб", "colina"),
    "parks": ("park", "Парк", "Парк", "parque"),
    "tables": ("table", "Стол", "Стіл", "mesa"),
    "employees": ("employee", "Сотрудник", "Працівник", "empleado"),
    "crumbs": ("crumb", "Крошка", "Крихта", "miga"),
    "bananas": ("banana", "Банан", "Банан", "plátano"),
    "blankets": ("blanket", "Одеяло", "Ковдра", "manta"),
    "buildings": ("building", "Здание", "Будівля", "edificio"),
    "clocks": ("clock", "Часы", "Годинник", "reloj"),
    "cookies": ("cookie", "Печенье", "Печиво", "galleta"),
    "curtains": ("curtain", "Штора", "Штора", "cortina"),
    "drones": ("drone", "Дрон", "Дрон", "dron"),
    "knives": ("knife", "Нож", "Ніж", "cuchillo"),
    "licenses": ("license", "Лицензия", "Ліцензія", "licencia"),
    "maps": ("map", "Карта", "Карта", "mapa"),
    "mice": ("mouse", "Мышь", "Миша", "ratón"),
    "nuts": ("nut", "Орех", "Горіх", "nuez"),
    "ribbons": ("ribbon", "Лента", "Стрічка", "cinta"),
    "rings": ("ring", "Кольцо", "Кільце", "anillo"),
    "scarves": ("scarf", "Шарф", "Шарф", "bufanda"),
    "tomatoes": ("tomato", "Помидор", "Помідор", "tomate"),
    "tools": ("tool", "Инструмент", "Інструмент", "herramienta"),
    "addresses": ("address", "Адрес", "Адреса", "dirección"),
    "bottles": ("bottle", "Бутылка", "Пляшка", "botella"),
    "clients": ("client", "Клиент", "Клієнт", "cliente"),
    "coins": ("coin", "Монета", "Монета", "moneda"),
    "colleagues": ("colleague", "Коллега", "Колега", "colega"),
    "deals": ("deal", "Сделка", "Угода", "trato"),
    "drops": ("drop", "Капля", "Крапля", "gota"),
    "folders": ("folder", "Папка", "Папка", "carpeta"),
    "hands": ("hand", "Рука (ладонь)", "Рука", "mano"),
    "jackets": ("jacket", "Куртка", "Куртка", "chaqueta"),
    "leaflets": ("leaflet", "Листовка", "Листівка", "folleto"),
    "parcels": ("parcel", "Посылка", "Посилка", "paquete"),
    "plates": ("plate", "Тарелка", "Тарілка", "plato"),
    "problems": ("problem", "Проблема", "Проблема", "problema"),
    "socks": ("sock", "Носок", "Шкарпетка", "calcetín"),
    "snacks": ("snack", "Закуска", "Закуска", "bocadillo"),
    "grapes": ("grape", "Виноград (гроздь)", "Виноград", "uva"),
    "pears": ("pear", "Груша", "Груша", "pera"),
    # week-day lesson blocks were lowercase keys in source
}


def capitalize_like(src: str, target: str) -> str:
    if not src:
        return target
    if src[:1].isupper() and (len(src) == 1 or not src[1:2].isupper()):
        return target[:1].upper() + target[1:]
    return target


def patch_word_line(line: str, report: list[str]) -> str:
    if "pos: 'nouns'" not in line:
        return line
    m = re.match(r"(?P<pre>.*?en:\s*')(?P<e>(?:[^'\\]|\\.)*)(?P<mid>', ru:\s*')(?P<r>(?:[^'\\]|\\.)*)(?P<a>', uk:\s*')(?P<u>(?:[^'\\]|\\.)*)(?P<b>', es:\s*')(?P<s>(?:[^'\\]|\\.)*)(?P<post>', pos:\s*'nouns'\s*\}.*)", line)
    if not m:
        return line
    en_lit = m.group("e").lower()
    if en_lit not in NOUN_REPLACE:
        return line
    s_en, ru, uk, es = NOUN_REPLACE[en_lit]
    new_en = capitalize_like(m.group("e"), s_en if s_en.lower() != s_en else s_en)
    rep = (
        f"{m.group('pre')}{new_en}"
        f"{m.group('mid')}{ru}"
        f"{m.group('a')}{uk}"
        f"{m.group('b')}{es}"
        f"{m.group('post')}"
    )
    report.append(f"{m.group('e')} → {new_en}")
    return rep


VOCAB_EN: dict[str, tuple[str, str, str]] = {
    "Vegetables": ("Vegetable", "Овощ", "Овоч"),
    "Shoes": ("Shoe", "Обувь (туфля)", "Взуття (туфля)"),
    "Dishes": ("Dish", "Блюдо", "Страва"),
    "Batteries": ("Battery", "Батарейка", "Батарейка"),
    "Plants": ("Plant", "Растение", "Рослина"),
    "Keys": ("Key", "Ключ", "Ключ"),
    "Fruits": ("Fruit", "Фрукт", "Фрукт"),
    "Documents": ("Document", "Документ", "Документ"),
    "Gloves": ("Glove", "Перчатка", "Рукавичка"),
    "Details": ("Detail", "Деталь", "Деталь"),
    "Goods": ("Good", "Товар", "Товар"),
    "Terms": ("Term", "Условие", "Умова"),
}


def patch_vocab_line(line: str, report: list[str]) -> str:
    em = re.search(r"english:\s*'([^']+)'", line)
    if not em:
        return line
    ew = em.group(1)
    if ew not in VOCAB_EN:
        return line
    se, ru, uk = VOCAB_EN[ew]
    nl = line
    nl = re.sub(r"english:\s*'[^']+'", f"english: '{se}'", nl)
    nl = re.sub(r"russian:\s*'[^']+'", f"russian: '{ru}'", nl)
    nl = re.sub(r"ukrainian:\s*'[^']+'", f"ukrainian: '{uk}'", nl)
    report.append(f"VOCAB {ew} → {se}")
    return nl


def main() -> int:
    report: list[str] = []

    lw = ROOT / "app" / "lesson_words.tsx"
    text = lw.read_text(encoding="utf-8")
    lines_out = []
    for line in text.splitlines(keepends=True):
        lines_out.append(patch_word_line(line, report))
    text2 = "".join(lines_out)
    lw.write_text(text2, encoding="utf-8")

    for fname in ("lesson_data_1_8.ts", "lesson_data_9_16.ts", "lesson_data_17_24.ts", "lesson_data_25_32.ts"):
        p = ROOT / "app" / fname
        if not p.exists():
            continue
        vlines = []
        for line in p.read_text(encoding="utf-8").splitlines(keepends=True):
            if "{ english:" in line and "}" in line:
                vlines.append(patch_vocab_line(line, report))
            else:
                vlines.append(line)
        p.write_text("".join(vlines), encoding="utf-8")

    out = ROOT / "docs" / "reports" / "lesson_vocab_singularize_report.txt"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text("\n".join(f"- {x}" for x in report), encoding="utf-8")
    print(f"OK: {len(report)} entries -> {out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
