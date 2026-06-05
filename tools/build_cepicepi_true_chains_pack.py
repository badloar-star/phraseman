#!/usr/bin/env python3
"""Build a true A1/A2 chain-method source pack for the CapCut draft."""

from __future__ import annotations

import csv
import hashlib
import json
import os
import subprocess
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")


OUT = Path("exports/chains/cepicepi_true_chains_a1a2_20260605")
AUDIO_DIR = OUT / "openai_audio"
AUDITION_DIR = OUT / "voice_audition"
ROWS_JSON = OUT / "true_chains_200_steps.json"
ROWS_CSV = OUT / "true_chains_200_steps.csv"
TEXT_MANIFEST = OUT / "true_chains_text_manifest.json"
REPORT = OUT / "true_chains_report.json"
MODEL = "gpt-4o-mini-tts"
US = 1_000_000


EN1_VOICE = "nova"
RU_VOICE = "shimmer"
EN2_VOICE = "fable"

ROLE_CONFIG = {
    "en1": {
        "voice": EN1_VOICE,
        "instructions": "Speak American English beautifully and clearly for A1-A2 learners. Warm, bright, natural teacher voice. Say only the phrase.",
    },
    "ru": {
        "voice": RU_VOICE,
        "instructions": "Говори по-русски красиво, тепло и естественно, как приятный ведущий учебного видео. Чётко, без роботизации. Скажи только фразу.",
    },
    "en2": {
        "voice": EN2_VOICE,
        "instructions": "Speak American English with a second beautiful voice, softer and calmer than the first. Clear A1-A2 lesson pace. Say only the phrase.",
    },
}


CHAINS = [
    ("home", ["I opened the window.", "I opened the window in my room.", "I opened the window in my room this morning.", "I opened the window in my room this morning because it was hot."], ["Я открыл окно.", "Я открыл окно в своей комнате.", "Я открыл окно в своей комнате сегодня утром.", "Я открыл окно в своей комнате сегодня утром, потому что было жарко."]),
    ("home", ["She made tea.", "She made tea for her mother.", "She made tea for her mother after dinner.", "She made tea for her mother after dinner because she was tired."], ["Она сделала чай.", "Она сделала чай для мамы.", "Она сделала чай для мамы после ужина.", "Она сделала чай для мамы после ужина, потому что та устала."]),
    ("home", ["We cleaned the kitchen.", "We cleaned the kitchen together.", "We cleaned the kitchen together before lunch.", "We cleaned the kitchen together before lunch because guests were coming."], ["Мы убрали кухню.", "Мы убрали кухню вместе.", "Мы убрали кухню вместе перед обедом.", "Мы убрали кухню вместе перед обедом, потому что должны были прийти гости."]),
    ("home", ["He found his keys.", "He found his keys on the table.", "He found his keys on the table before work.", "He found his keys on the table before work and left quickly."], ["Он нашёл ключи.", "Он нашёл ключи на столе.", "Он нашёл ключи на столе перед работой.", "Он нашёл ключи на столе перед работой и быстро ушёл."]),
    ("home", ["They watched a movie.", "They watched a movie at home.", "They watched a movie at home on Friday.", "They watched a movie at home on Friday because it was raining."], ["Они смотрели фильм.", "Они смотрели фильм дома.", "Они смотрели фильм дома в пятницу.", "Они смотрели фильм дома в пятницу, потому что шёл дождь."]),
    ("daily", ["I bought bread.", "I bought bread at the store.", "I bought bread at the store after work.", "I bought bread at the store after work for breakfast."], ["Я купил хлеб.", "Я купил хлеб в магазине.", "Я купил хлеб в магазине после работы.", "Я купил хлеб в магазине после работы на завтрак."]),
    ("daily", ["She called her friend.", "She called her friend in the evening.", "She called her friend in the evening from the bus.", "She called her friend in the evening from the bus to ask for help."], ["Она позвонила подруге.", "Она позвонила подруге вечером.", "Она позвонила подруге вечером из автобуса.", "Она позвонила подруге вечером из автобуса, чтобы попросить помощи."]),
    ("daily", ["We waited outside.", "We waited outside the building.", "We waited outside the building for ten minutes.", "We waited outside the building for ten minutes because the door was locked."], ["Мы ждали снаружи.", "Мы ждали снаружи здания.", "Мы ждали снаружи здания десять минут.", "Мы ждали снаружи здания десять минут, потому что дверь была закрыта."]),
    ("daily", ["He took a photo.", "He took a photo of the menu.", "He took a photo of the menu at the cafe.", "He took a photo of the menu at the cafe and sent it to me."], ["Он сделал фото.", "Он сделал фото меню.", "Он сделал фото меню в кафе.", "Он сделал фото меню в кафе и отправил его мне."]),
    ("daily", ["They missed the bus.", "They missed the bus in the morning.", "They missed the bus in the morning near school.", "They missed the bus in the morning near school and walked home."], ["Они опоздали на автобус.", "Они опоздали на автобус утром.", "Они опоздали на автобус утром возле школы.", "Они опоздали на автобус утром возле школы и пошли домой пешком."]),
    ("work", ["I sent an email.", "I sent an email to my manager.", "I sent an email to my manager after lunch.", "I sent an email to my manager after lunch with the file attached."], ["Я отправил письмо.", "Я отправил письмо менеджеру.", "Я отправил письмо менеджеру после обеда.", "Я отправил письмо менеджеру после обеда с прикреплённым файлом."]),
    ("work", ["She joined the meeting.", "She joined the meeting online.", "She joined the meeting online at nine.", "She joined the meeting online at nine and shared her idea."], ["Она присоединилась к встрече.", "Она присоединилась к встрече онлайн.", "Она присоединилась к встрече онлайн в девять.", "Она присоединилась к встрече онлайн в девять и поделилась идеей."]),
    ("work", ["We checked the report.", "We checked the report together.", "We checked the report together before sending it.", "We checked the report together before sending it to the client."], ["Мы проверили отчёт.", "Мы проверили отчёт вместе.", "Мы проверили отчёт вместе перед отправкой.", "Мы проверили отчёт вместе перед отправкой клиенту."]),
    ("work", ["He fixed a mistake.", "He fixed a mistake in the document.", "He fixed a mistake in the document before the call.", "He fixed a mistake in the document before the call and saved a copy."], ["Он исправил ошибку.", "Он исправил ошибку в документе.", "Он исправил ошибку в документе перед звонком.", "Он исправил ошибку в документе перед звонком и сохранил копию."]),
    ("work", ["They changed the plan.", "They changed the plan at work.", "They changed the plan at work after the meeting.", "They changed the plan at work after the meeting because the client was late."], ["Они изменили план.", "Они изменили план на работе.", "Они изменили план на работе после встречи.", "Они изменили план на работе после встречи, потому что клиент опаздывал."]),
    ("study", ["I wrote a note.", "I wrote a note in my notebook.", "I wrote a note in my notebook during class.", "I wrote a note in my notebook during class so I could remember it."], ["Я написал заметку.", "Я написал заметку в тетради.", "Я написал заметку в тетради во время урока.", "Я написал заметку в тетради во время урока, чтобы запомнить это."]),
    ("study", ["She read the page.", "She read the page slowly.", "She read the page slowly before the test.", "She read the page slowly before the test and marked new words."], ["Она прочитала страницу.", "Она прочитала страницу медленно.", "Она прочитала страницу медленно перед тестом.", "Она прочитала страницу медленно перед тестом и отметила новые слова."]),
    ("study", ["We practiced together.", "We practiced together after school.", "We practiced together after school for half an hour.", "We practiced together after school for half an hour because the exam was close."], ["Мы занимались вместе.", "Мы занимались вместе после школы.", "Мы занимались вместе после школы полчаса.", "Мы занимались вместе после школы полчаса, потому что экзамен был близко."]),
    ("study", ["He asked a question.", "He asked a question in class.", "He asked a question in class about homework.", "He asked a question in class about homework and wrote down the answer."], ["Он задал вопрос.", "Он задал вопрос на уроке.", "Он задал вопрос на уроке о домашнем задании.", "Он задал вопрос на уроке о домашнем задании и записал ответ."]),
    ("study", ["They opened their books.", "They opened their books on the desk.", "They opened their books on the desk after the break.", "They opened their books on the desk after the break and started reading."], ["Они открыли книги.", "Они открыли книги на парте.", "Они открыли книги на парте после перерыва.", "Они открыли книги на парте после перерыва и начали читать."]),
    ("travel", ["I booked a ticket.", "I booked a ticket online.", "I booked a ticket online last night.", "I booked a ticket online last night because the price was low."], ["Я забронировал билет.", "Я забронировал билет онлайн.", "Я забронировал билет онлайн прошлой ночью.", "Я забронировал билет онлайн прошлой ночью, потому что цена была низкой."]),
    ("travel", ["She packed her bag.", "She packed her bag before the trip.", "She packed her bag before the trip on Sunday.", "She packed her bag before the trip on Sunday and checked her passport."], ["Она собрала сумку.", "Она собрала сумку перед поездкой.", "Она собрала сумку перед поездкой в воскресенье.", "Она собрала сумку перед поездкой в воскресенье и проверила паспорт."]),
    ("travel", ["We found the station.", "We found the station near the hotel.", "We found the station near the hotel in the morning.", "We found the station near the hotel in the morning and bought two tickets."], ["Мы нашли станцию.", "Мы нашли станцию возле отеля.", "Мы нашли станцию возле отеля утром.", "Мы нашли станцию возле отеля утром и купили два билета."]),
    ("travel", ["He called a taxi.", "He called a taxi from the airport.", "He called a taxi from the airport after midnight.", "He called a taxi from the airport after midnight because the train had stopped."], ["Он вызвал такси.", "Он вызвал такси из аэропорта.", "Он вызвал такси из аэропорта после полуночи.", "Он вызвал такси из аэропорта после полуночи, потому что поезд уже не ходил."]),
    ("travel", ["They walked to the hotel.", "They walked to the hotel with their bags.", "They walked to the hotel with their bags after dinner.", "They walked to the hotel with their bags after dinner because it was close."], ["Они пошли в отель пешком.", "Они пошли в отель пешком с сумками.", "Они пошли в отель пешком с сумками после ужина.", "Они пошли в отель пешком с сумками после ужина, потому что он был рядом."]),
    ("shopping", ["I paid by card.", "I paid by card at the supermarket.", "I paid by card at the supermarket this afternoon.", "I paid by card at the supermarket this afternoon because I had no cash."], ["Я заплатил картой.", "Я заплатил картой в супермаркете.", "Я заплатил картой в супермаркете сегодня днём.", "Я заплатил картой в супермаркете сегодня днём, потому что у меня не было наличных."]),
    ("shopping", ["She returned the jacket.", "She returned the jacket to the store.", "She returned the jacket to the store after work.", "She returned the jacket to the store after work because it was too small."], ["Она вернула куртку.", "Она вернула куртку в магазин.", "Она вернула куртку в магазин после работы.", "Она вернула куртку в магазин после работы, потому что она была слишком маленькой."]),
    ("shopping", ["We chose a gift.", "We chose a gift for our friend.", "We chose a gift for our friend at the mall.", "We chose a gift for our friend at the mall and wrapped it at home."], ["Мы выбрали подарок.", "Мы выбрали подарок для друга.", "Мы выбрали подарок для друга в торговом центре.", "Мы выбрали подарок для друга в торговом центре и завернули его дома."]),
    ("shopping", ["He checked the receipt.", "He checked the receipt near the door.", "He checked the receipt near the door after paying.", "He checked the receipt near the door after paying because the price looked wrong."], ["Он проверил чек.", "Он проверил чек возле двери.", "Он проверил чек возле двери после оплаты.", "Он проверил чек возле двери после оплаты, потому что цена выглядела неправильной."]),
    ("shopping", ["They bought fresh fruit.", "They bought fresh fruit at the market.", "They bought fresh fruit at the market on Saturday.", "They bought fresh fruit at the market on Saturday and made a salad."], ["Они купили свежие фрукты.", "Они купили свежие фрукты на рынке.", "Они купили свежие фрукты на рынке в субботу.", "Они купили свежие фрукты на рынке в субботу и сделали салат."]),
    ("health", ["I drank water.", "I drank water after running.", "I drank water after running in the park.", "I drank water after running in the park because I felt thirsty."], ["Я выпил воды.", "Я выпил воды после бега.", "Я выпил воды после бега в парке.", "Я выпил воды после бега в парке, потому что хотел пить."]),
    ("health", ["She took medicine.", "She took medicine before bed.", "She took medicine before bed with warm tea.", "She took medicine before bed with warm tea because her throat hurt."], ["Она приняла лекарство.", "Она приняла лекарство перед сном.", "Она приняла лекарство перед сном с тёплым чаем.", "Она приняла лекарство перед сном с тёплым чаем, потому что у неё болело горло."]),
    ("health", ["We visited the doctor.", "We visited the doctor in the morning.", "We visited the doctor in the morning at the clinic.", "We visited the doctor in the morning at the clinic and asked about the results."], ["Мы посетили врача.", "Мы посетили врача утром.", "Мы посетили врача утром в клинике.", "Мы посетили врача утром в клинике и спросили о результатах."]),
    ("health", ["He felt better.", "He felt better after breakfast.", "He felt better after breakfast at home.", "He felt better after breakfast at home and went to work."], ["Он почувствовал себя лучше.", "Он почувствовал себя лучше после завтрака.", "Он почувствовал себя лучше после завтрака дома.", "Он почувствовал себя лучше после завтрака дома и пошёл на работу."]),
    ("health", ["They rested at home.", "They rested at home all evening.", "They rested at home all evening after the long walk.", "They rested at home all evening after the long walk because they were tired."], ["Они отдыхали дома.", "Они отдыхали дома весь вечер.", "Они отдыхали дома весь вечер после долгой прогулки.", "Они отдыхали дома весь вечер после долгой прогулки, потому что устали."]),
    ("food", ["I cooked rice.", "I cooked rice for dinner.", "I cooked rice for dinner in the kitchen.", "I cooked rice for dinner in the kitchen and added vegetables."], ["Я приготовил рис.", "Я приготовил рис на ужин.", "Я приготовил рис на ужин на кухне.", "Я приготовил рис на ужин на кухне и добавил овощи."]),
    ("food", ["She ordered soup.", "She ordered soup at the restaurant.", "She ordered soup at the restaurant after work.", "She ordered soup at the restaurant after work because she was cold."], ["Она заказала суп.", "Она заказала суп в ресторане.", "Она заказала суп в ресторане после работы.", "Она заказала суп в ресторане после работы, потому что ей было холодно."]),
    ("food", ["We shared pizza.", "We shared pizza with our friends.", "We shared pizza with our friends on Friday.", "We shared pizza with our friends on Friday and watched a show."], ["Мы разделили пиццу.", "Мы разделили пиццу с друзьями.", "Мы разделили пиццу с друзьями в пятницу.", "Мы разделили пиццу с друзьями в пятницу и посмотрели шоу."]),
    ("food", ["He washed the vegetables.", "He washed the vegetables in the sink.", "He washed the vegetables in the sink before cooking.", "He washed the vegetables in the sink before cooking because they were dirty."], ["Он помыл овощи.", "Он помыл овощи в раковине.", "Он помыл овощи в раковине перед готовкой.", "Он помыл овощи в раковине перед готовкой, потому что они были грязные."]),
    ("food", ["They made breakfast.", "They made breakfast together.", "They made breakfast together on Sunday.", "They made breakfast together on Sunday and ate on the balcony."], ["Они приготовили завтрак.", "Они приготовили завтрак вместе.", "Они приготовили завтрак вместе в воскресенье.", "Они приготовили завтрак вместе в воскресенье и поели на балконе."]),
    ("phone", ["I charged my phone.", "I charged my phone near the bed.", "I charged my phone near the bed before sleeping.", "I charged my phone near the bed before sleeping because the battery was low."], ["Я зарядил телефон.", "Я зарядил телефон возле кровати.", "Я зарядил телефон возле кровати перед сном.", "Я зарядил телефон возле кровати перед сном, потому что батарея была почти разряжена."]),
    ("phone", ["She sent a message.", "She sent a message to her brother.", "She sent a message to her brother during lunch.", "She sent a message to her brother during lunch and asked about dinner."], ["Она отправила сообщение.", "Она отправила сообщение брату.", "Она отправила сообщение брату во время обеда.", "Она отправила сообщение брату во время обеда и спросила про ужин."]),
    ("phone", ["We watched a video.", "We watched a video on my phone.", "We watched a video on my phone after class.", "We watched a video on my phone after class because it was funny."], ["Мы посмотрели видео.", "Мы посмотрели видео на моём телефоне.", "Мы посмотрели видео на моём телефоне после урока.", "Мы посмотрели видео на моём телефоне после урока, потому что оно было смешным."]),
    ("phone", ["He lost the charger.", "He lost the charger in his bag.", "He lost the charger in his bag at the airport.", "He lost the charger in his bag at the airport and bought a new one."], ["Он потерял зарядку.", "Он потерял зарядку в сумке.", "Он потерял зарядку в сумке в аэропорту.", "Он потерял зарядку в сумке в аэропорту и купил новую."]),
    ("phone", ["They joined the chat.", "They joined the chat after work.", "They joined the chat after work on their phones.", "They joined the chat after work on their phones and shared photos."], ["Они присоединились к чату.", "Они присоединились к чату после работы.", "Они присоединились к чату после работы на телефонах.", "Они присоединились к чату после работы на телефонах и поделились фотографиями."]),
    ("social", ["I invited my neighbor.", "I invited my neighbor for coffee.", "I invited my neighbor for coffee on Saturday.", "I invited my neighbor for coffee on Saturday because we had not talked for a long time."], ["Я пригласил соседа.", "Я пригласил соседа на кофе.", "Я пригласил соседа на кофе в субботу.", "Я пригласил соседа на кофе в субботу, потому что мы давно не разговаривали."]),
    ("social", ["She thanked the teacher.", "She thanked the teacher after class.", "She thanked the teacher after class for the help.", "She thanked the teacher after class for the help and smiled."], ["Она поблагодарила учителя.", "Она поблагодарила учителя после урока.", "Она поблагодарила учителя после урока за помощь.", "Она поблагодарила учителя после урока за помощь и улыбнулась."]),
    ("social", ["We met our friends.", "We met our friends in the park.", "We met our friends in the park in the evening.", "We met our friends in the park in the evening and walked together."], ["Мы встретили друзей.", "Мы встретили друзей в парке.", "Мы встретили друзей в парке вечером.", "Мы встретили друзей в парке вечером и гуляли вместе."]),
    ("social", ["He helped his sister.", "He helped his sister with her bag.", "He helped his sister with her bag at the station.", "He helped his sister with her bag at the station because it was heavy."], ["Он помог сестре.", "Он помог сестре с сумкой.", "Он помог сестре с сумкой на станции.", "Он помог сестре с сумкой на станции, потому что она была тяжёлая."]),
    ("social", ["They talked quietly.", "They talked quietly in the hallway.", "They talked quietly in the hallway before the lesson.", "They talked quietly in the hallway before the lesson and made a plan."], ["Они тихо разговаривали.", "Они тихо разговаривали в коридоре.", "Они тихо разговаривали в коридоре перед уроком.", "Они тихо разговаривали в коридоре перед уроком и составили план."]),
]


def load_env() -> dict[str, str]:
    path = Path(".env.local")
    values = {}
    if path.exists():
        for line in path.read_text(encoding="utf-8-sig", errors="ignore").splitlines():
            if "=" in line and not line.strip().startswith("#"):
                k, v = line.split("=", 1)
                values[k.strip()] = v.strip().strip('"').strip("'")
    return values


def norm(value: str) -> str:
    return " ".join(value.casefold().split())


def build_rows() -> list[dict[str, Any]]:
    rows = []
    idx = 1
    for chain_index, (theme, en_steps, ru_steps) in enumerate(CHAINS, start=1):
        for step, (english, russian) in enumerate(zip(en_steps, ru_steps, strict=True), start=1):
            rows.append(
                {
                    "index": idx,
                    "chain_index": chain_index,
                    "step": step,
                    "theme": theme,
                    "english": english,
                    "russian": russian,
                    "method": "chain_step",
                    "chain_rule": "Each step adds one clear A1/A2 meaning unit to the previous step.",
                }
            )
            idx += 1
    if len(rows) != 200:
        raise RuntimeError(f"expected 200 chain steps, got {len(rows)}")
    for key in ("english", "russian"):
        values = [norm(row[key]) for row in rows]
        if len(set(values)) != len(values):
            raise RuntimeError(f"{key} duplicates found")
    return rows


def write_rows(rows: list[dict[str, Any]]) -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    ROWS_JSON.write_text(json.dumps(rows, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    with ROWS_CSV.open("w", encoding="utf-8-sig", newline="") as fh:
        writer = csv.DictWriter(fh, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)


def build_text_manifest(rows: list[dict[str, Any]]) -> dict[str, Any]:
    try:
        import eng_to_ipa  # type: ignore
    except Exception as error:  # noqa: BLE001
        raise RuntimeError(f"eng_to_ipa is required for Chains IPA: {error}") from error
    items = []
    for row in rows:
        ipa = eng_to_ipa.convert(str(row["english"]).rstrip(".!?"))
        ipa = ipa.replace("*", "")
        if not ipa.strip():
            raise RuntimeError(f"empty IPA for row {row['index']}")
        items.append(
            {
                "index": int(row["index"]),
                "chain_index": int(row["chain_index"]),
                "step": int(row["step"]),
                "english_upper": str(row["english"]).upper(),
                "russian_upper": str(row["russian"]).upper(),
                "ipa": ipa,
            }
        )
    manifest = {"status": "ready", "items": items}
    TEXT_MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return manifest


def openai_tts(api_key: str, text: str, role: str, path: Path, voice_override: str | None = None) -> None:
    cfg = ROLE_CONFIG[role]
    payload = {
        "model": MODEL,
        "voice": voice_override or cfg["voice"],
        "input": text,
        "instructions": cfg["instructions"],
        "response_format": "wav",
    }
    request = urllib.request.Request(
        "https://api.openai.com/v1/audio/speech",
        data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
        method="POST",
    )
    path.parent.mkdir(parents=True, exist_ok=True)
    last = None
    for attempt in range(1, 5):
        try:
            with urllib.request.urlopen(request, timeout=180) as response:
                path.write_bytes(response.read())
            return
        except urllib.error.HTTPError as error:
            last = error.read().decode("utf-8", errors="replace")[:500]
        except Exception as error:  # noqa: BLE001
            last = str(error)
        time.sleep(attempt)
    raise RuntimeError(f"TTS failed {role}/{voice_override}: {last}")


def ffprobe_duration(path: Path) -> float:
    result = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", str(path)],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        check=False,
    )
    if result.returncode != 0:
        raise RuntimeError(result.stderr[:300])
    return float(result.stdout.strip())


def audio_path(row: dict[str, Any], role: str) -> Path:
    text = row["russian"] if role == "ru" else row["english"]
    digest = hashlib.sha1(f"{ROLE_CONFIG[role]['voice']}|{text}".encode("utf-8")).hexdigest()[:12]
    return AUDIO_DIR / role / f"{int(row['index']):03d}_{digest}.wav"


def generate_auditions(api_key: str) -> dict[str, Any]:
    candidates = ["nova", "shimmer", "fable", "alloy", "verse", "sage", "coral", "ash", "ballad", "echo"]
    samples = [
        ("en", "I opened the window in my room this morning because it was hot."),
        ("ru", "Я открыл окно в своей комнате сегодня утром, потому что было жарко."),
    ]
    ok = []
    failed = []
    for voice in candidates:
        for lang, text in samples:
            path = AUDITION_DIR / voice / f"{lang}.wav"
            if path.exists() and path.stat().st_size > 10_000:
                ok.append({"voice": voice, "lang": lang, "path": str(path), "duration_sec": round(ffprobe_duration(path), 3)})
                continue
            try:
                openai_tts(api_key, text, "en1" if lang == "en" else "ru", path, voice_override=voice)
                ok.append({"voice": voice, "lang": lang, "path": str(path), "duration_sec": round(ffprobe_duration(path), 3)})
            except Exception as error:  # noqa: BLE001
                failed.append({"voice": voice, "lang": lang, "error": str(error)[:300]})
    report = {"selected": {"en1": EN1_VOICE, "ru": RU_VOICE, "en2": EN2_VOICE}, "ok": ok, "failed": failed}
    (AUDITION_DIR / "voice_audition_report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    return report


def generate_audio(api_key: str, rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    manifest = []
    for row in rows:
        for role in ("en1", "ru", "en2"):
            path = audio_path(row, role)
            text = row["russian"] if role == "ru" else row["english"]
            if not path.exists() or path.stat().st_size < 10_000:
                openai_tts(api_key, text, role, path)
            manifest.append(
                {
                    "index": row["index"],
                    "chain_index": row["chain_index"],
                    "step": row["step"],
                    "role": role,
                    "voice": ROLE_CONFIG[role]["voice"],
                    "text": text,
                    "path": str(path),
                    "duration_sec": round(ffprobe_duration(path), 3),
                }
            )
    (AUDIO_DIR / "openai_audio_manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return manifest


def main() -> int:
    rows = build_rows()
    write_rows(rows)
    text_manifest = build_text_manifest(rows)
    env = load_env()
    api_key = env.get("OPENAI_API_KEY")
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY is required in .env.local")
    audition = generate_auditions(api_key)
    audio = generate_audio(api_key, rows)
    report = {
        "status": "ready",
        "method": "true_chain_method",
        "chain_count": 50,
        "step_count": len(rows),
        "level": "A1-A2",
        "voices": {role: cfg["voice"] for role, cfg in ROLE_CONFIG.items()},
        "voice_audition": str((AUDITION_DIR / "voice_audition_report.json").resolve()),
        "audio_count": len(audio),
        "outputs": {"rows_json": str(ROWS_JSON), "rows_csv": str(ROWS_CSV), "text_manifest": str(TEXT_MANIFEST), "audio_manifest": str(AUDIO_DIR / "openai_audio_manifest.json")},
    }
    REPORT.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
