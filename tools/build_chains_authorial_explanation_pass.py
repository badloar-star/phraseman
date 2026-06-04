#!/usr/bin/env python3
"""Build and optionally apply an authorial explanation pass for Chains.

The pass fixes the current explanation direction:
- one voiceover per explanation, no RU/EN split;
- explanation text is rewritten as useful authorial narration, not headings;
- on-screen explanation text is the spoken transcript, chunked from the exact
  voiceover and aligned from ElevenLabs character timestamps;
- a calm generated screensaver replaces weak/random explanation backgrounds.

Run without --apply while CapCut is open to stage assets. Run with --apply only
after CapCut is closed.
"""

from __future__ import annotations

import argparse
import base64
import copy
import difflib
import json
import math
import re
import shutil
import subprocess
import time
import uuid
from pathlib import Path
from typing import Any

import requests

from chains_description_quality_rules import (
    build_strict_russian_explanation,
    validate_description_pack,
)


DRAFT_NAME = "CHAINS_EP01_ENHANCED_CTA_EXPLAIN_REVERSE 20260602_085658"
DRAFT_DIR = Path.home() / "AppData/Local/CapCut/User Data/Projects/com.lveditor.draft" / DRAFT_NAME
CONTENT_PATH = DRAFT_DIR / "draft_content.json"
META_PATH = DRAFT_DIR / "draft_meta_info.json"
TMP_PATH = DRAFT_DIR / "template-2.tmp"
ASSETS_DIR = Path("exports/chains/episode1/unique_explanations_approved")
CHAINS_PATH = ASSETS_DIR / "chains_source.json"
STAGED_TIMED_PATH = ASSETS_DIR / "timed_explanations_authorial.json"
LIVE_TIMED_PATH = ASSETS_DIR / "timed_explanations.json"
STAGED_AUDIO_DIR = ASSETS_DIR / "audio_authorial_one_voice"
LIVE_AUDIO_DIR = ASSETS_DIR / "audio_eleven"
STAGED_ALIGN_DIR = ASSETS_DIR / "alignments_authorial_one_voice"
RESOURCE_AUDIO_DIR = DRAFT_DIR / "Resources" / "chains_unique_explanations"
RESOURCE_BG_DIR = DRAFT_DIR / "Resources" / "chains_unique_explanations"
SCREEN_BG_DIR = ASSETS_DIR / "screensaver_loop"
SCREEN_BG_PATH = SCREEN_BG_DIR / "chains_explain_screensaver_loop_60s.mp4"

ELEVEN_MODEL = "eleven_multilingual_v2"
DEFAULT_RU_VOICE = "S1rCQTdmnPirnlmzDJkz"
DEFAULT_RU_TIP_VOICE = "dH2EgYIVjY7q84hZZrSF"
US = 1_000_000

FORBIDDEN_TEXT_SNIPPETS = [
    "ОСНОВА:",
    "ФРАЗА СОБРАНА",
    "ПОЛНЫЙ ВАРИАНТ",
    "СНАЧАЛА КАРКАС",
    "ПОТОМ УТОЧНЕНИЯ",
    "ШАГ 1",
    "ШАГ 2",
    "ШАГ 3",
    "ШАГ 4",
]


def gid() -> str:
    return str(uuid.uuid4()).upper()


def read_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def write_compact_json(path: Path, data: Any) -> None:
    path.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")


def load_env(path: Path = Path(".env.local")) -> dict[str, str]:
    values: dict[str, str] = {}
    if not path.exists():
        return values
    for raw in path.read_text(encoding="utf-8-sig", errors="ignore").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        values[key.strip()] = value.strip().strip('"').strip("'")
    return values


def capcut_is_open() -> bool:
    result = subprocess.run(
        ["tasklist", "/FI", "IMAGENAME eq CapCut.exe"],
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="ignore",
        check=False,
    )
    return "CapCut.exe" in result.stdout


def backup_project(label: str) -> Path:
    out = Path(".codex-tmp/capcut-backups") / f"{DRAFT_NAME}.{label}"
    out.parent.mkdir(parents=True, exist_ok=True)
    if out.exists():
        shutil.rmtree(out)
    shutil.copytree(DRAFT_DIR, out)
    return out


def ffprobe_duration(path: Path) -> float:
    completed = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", str(path)],
        check=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )
    return float(completed.stdout.strip())


def atempo_filter(factor: float) -> str:
    parts: list[str] = []
    while factor > 2.0:
        parts.append("atempo=2.0")
        factor /= 2.0
    while factor < 0.5:
        parts.append("atempo=0.5")
        factor /= 0.5
    parts.append(f"atempo={factor:.6f}")
    return ",".join(parts)


def fit_mp3_to_slot(src: Path, dst: Path, target_sec: float) -> dict[str, float]:
    raw = ffprobe_duration(src)
    work = dst.with_suffix(".slot.wav")
    filters = [atempo_filter(raw / target_sec)] if target_sec > 0 else ["anull"]
    if raw < target_sec:
        filters.append(f"apad=pad_dur={target_sec - raw:.6f}")
    dst.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(
        [
            "ffmpeg",
            "-y",
            "-hide_banner",
            "-loglevel",
            "error",
            "-i",
            str(src),
            "-af",
            ",".join(filters),
            "-t",
            f"{target_sec:.6f}",
            "-ac",
            "1",
            "-ar",
            "44100",
            "-c:a",
            "pcm_s16le",
            str(work),
        ],
        check=True,
    )
    subprocess.run(
        [
            "ffmpeg",
            "-y",
            "-hide_banner",
            "-loglevel",
            "error",
            "-i",
            str(work),
            "-c:a",
            "libmp3lame",
            "-b:a",
            "128k",
            str(dst),
        ],
        check=True,
    )
    return {
        "raw_duration_sec": round(raw, 3),
        "target_duration_sec": round(target_sec, 3),
        "speed_factor": round(raw / target_sec, 4) if target_sec else 1.0,
    }


def diff_piece(previous: str, current: str) -> str:
    prev_tokens = clean_phrase(previous).split()
    cur_tokens = clean_phrase(current).split()
    changed: list[str] = []
    opcodes = difflib.SequenceMatcher(a=prev_tokens, b=cur_tokens).get_opcodes()
    for tag, _i1, _i2, j1, j2 in opcodes:
        if tag in {"insert", "replace"}:
            piece = cur_tokens[j1:j2]
            if tag == "insert" and j2 < len(cur_tokens) and len(piece) == 1:
                piece = [*piece, cur_tokens[j2]]
            changed.extend(piece)
    if changed:
        return " ".join(changed).strip()
    prev = previous.casefold()
    if current.casefold().startswith(prev):
        return current[len(previous) :].strip()
    return current.strip()


def clean_phrase(text: str) -> str:
    return " ".join(str(text).strip().split())


def lower_ru(text: str) -> str:
    return clean_phrase(text).lower()


def english_label(text: str) -> str:
    return clean_phrase(text).upper()


def focus_for_phrase(final_en: str) -> str:
    lower = final_en.casefold()
    if "because of" in lower:
        return "причина здесь не висит отдельно, она объясняет, почему случилось главное действие"
    if "before" in lower:
        return "before держит точку отсчета: действие уже понятно, а потом появляется граница по времени"
    if "after" in lower:
        return "after не ломает основу, а аккуратно приклеивает момент, после которого все произошло"
    if "with a card" in lower or "by email" in lower:
        return "способ действия лучше слышать как финальный штрих, а не как новую мысль"
    if "to " in lower:
        return "направление или адресат в английском спокойно идет после действия"
    if "from " in lower:
        return "from сразу показывает источник, откуда берется предмет или действие"
    if "for " in lower:
        return "for объясняет назначение: не просто предмет, а предмет для конкретной цели"
    return "последняя деталь не украшает фразу, а делает ее точной"


def describe_additions(chain: dict[str, Any]) -> tuple[str, str, str]:
    steps = [clean_phrase(x) for x in chain["foreign_steps"]]
    a = diff_piece(steps[0], steps[1])
    b = diff_piece(steps[1], steps[2])
    c = diff_piece(steps[2], steps[3])
    return english_label(a), english_label(b), english_label(c)


def authorial_voiceover(chain: dict[str, Any]) -> str:
    idx = int(chain["index"])
    base = english_label(chain["foreign_steps"][0])
    final_en = english_label(chain["foreign_steps"][-1])
    final_ru = lower_ru(chain["russian_steps"][-1])
    add1, add2, add3 = describe_additions(chain)
    focus = focus_for_phrase(final_en)
    variants = [
        f"Здесь не надо тащить всю фразу силой. Возьми {base} как короткую мысль, а потом дай ей воздух: {add1}, {add2}, {add3}. По-русски мы скажем: {final_ru}. {focus}. Хорошая новость: если услышал первый кусок, остальное уже не страшная грамматика, а нормальные человеческие подробности.",
        f"Эта фраза работает как аккуратная заметка в телефоне. Сначала есть событие: {base}. Потом английский не начинает заново, а дописывает рядом {add1}, затем {add2}, и в конце {add3}. Русский вариант: {final_ru}. Смысл держится ровно, просто у него становится больше света по краям.",
        f"Смотри на порядок как на маршрут, а не как на таблицу. {base} отвечает на главный вопрос. {add1} сужает картинку, {add2} добавляет обстоятельство, {add3} ставит маленькую точку. В русском получится: {final_ru}. Так длинная фраза перестает быть поездом из слов и становится одной понятной сценой.",
        f"В этой конструкции важно не переводить каждое слово с лупой. Английский сначала говорит {base}, то есть дает центр. Потом рядом появляются {add1}, {add2} и {add3}. Русский перевод звучит так: {final_ru}. {focus}. Услышал центр — дальше просто собираешь смысл без паники.",
        f"Здесь английский ведет себя очень практично. Он не прячет главное, а сразу показывает {base}. После этого добавки идут спокойной очередью: {add1}, {add2}, {add3}. По-русски вся мысль звучит: {final_ru}. Если фраза кажется длинной, не спорь с ней, разложи ее на эти смысловые карманы.",
        f"Представь, что ты описываешь кадр. В кадре уже есть {base}. Потом камера замечает {add1}, позже становится важно {add2}, и последним попадает {add3}. Русская версия: {final_ru}. Поэтому учим не набор слов, а привычку видеть, какая деталь к чему прицепилась.",
        f"У этой фразы хороший бытовой ритм. Сначала человек сообщает {base}. Потом, чтобы не оставлять нас гадать, добавляет {add1}, {add2} и {add3}. По-русски это: {final_ru}. Секрет простой: английская фраза не раздулась, она просто стала честнее и точнее.",
        f"Здесь полезно услышать скелет фразы, но не называть его скучным словом. {base} — это то, без чего вся мысль развалится. {add1}, {add2} и {add3} уже работают как пояснения. Русский перевод: {final_ru}. Так мозг не ловит каждое слово отдельно, а понимает, зачем оно пришло.",
        f"Эта строка показывает, почему длинные предложения не обязательно трудные. Главное уже сказано в {base}. Дальше английский спокойно раскладывает подробности: {add1}, потом {add2}, потом {add3}. В русском мы передаем это как: {final_ru}. Почти как рецепт, только без кухни и грязной посуды.",
        f"Здесь не нужно искать тайный фокус. Фраза начинается с {base}, и это сразу держит смысл. {add1} уточняет картинку, {add2} объясняет обстоятельство, {add3} добавляет последнюю грань. По-русски: {final_ru}. {focus}.",
        f"Послушай, как фраза становится взрослой. В начале она короткая: {base}. Потом появляется {add1}, затем {add2}, а {add3} делает мысль законченной. Русский вариант: {final_ru}. Чем спокойнее ты слышишь эти добавки, тем меньше хочется переводить фразу кусками.",
        f"В английском здесь главное стоит впереди, и это удобно. {base} уже дает нам действие. Остальные слова не мешают, а помогают: {add1}, {add2}, {add3}. По-русски это звучит так: {final_ru}. Держи первый смысл крепко, а подробности пусть просто встают рядом.",
        f"Эта фраза похожа на короткий отчет без лишней драмы. Сначала {base}. Потом автор уточняет {add1}, добавляет {add2}, и закрывает мысль через {add3}. Русский перевод: {final_ru}. Ничего мистического: английский любит сначала сказать, что произошло, а потом дорисовать условия.",
        f"Здесь хорошо видно, как работает естественный английский порядок. {base} не надо переставлять в голове десять раз. К нему мягко подходят {add1}, {add2} и {add3}. Русская мысль: {final_ru}. Если запомнить этот ритм, похожие фразы начнут собираться почти сами.",
        f"Фраза не просит героизма, она просит внимания. {base} — главный смысл. {add1} отвечает на один дополнительный вопрос, {add2} — на следующий, {add3} добавляет оттенок. По-русски скажем: {final_ru}. Вот и вся магия, очень земная и вполне дружелюбная.",
        f"Здесь английская логика звучит проще, чем выглядит на экране. Начало {base} уже понятно. Дальше идут полезные уточнения: {add1}, {add2}, {add3}. Русский итог: {final_ru}. Не нужно запоминать длинную строку целиком; запоминай, как она дышит.",
        f"В этой фразе каждая добавка делает работу. {base} дает событие, {add1} приближает нас к месту или адресату, {add2} добавляет время или причину, {add3} ставит финальный акцент. По-русски: {final_ru}. Так предложение получается длинным, но не мутным.",
        f"Сначала здесь слышится простая мысль: {base}. А дальше английский как будто отвечает на вопросы слушателя: где или кому — {add1}; когда или почему — {add2}; насколько или как — {add3}. Русский вариант: {final_ru}. Это не зубрежка, это нормальный разговорный порядок.",
        f"Эта конструкция хороша тем, что ее можно почувствовать телом. Сказал {base}, сделал паузу, добавил {add1}. Потом еще одна подробность: {add2}. И в конце {add3}. По-русски вся сцена: {final_ru}. У фразы появляется объем, но центр никуда не пропадает.",
        f"Здесь длинная английская строка на самом деле очень вежливая к ученику. Она сначала показывает {base}. Потом аккуратно подает {add1}, {add2} и {add3}. Русский перевод: {final_ru}. Смотри не на длину, а на то, как каждая часть отвечает на маленький вопрос.",
        f"В этой фразе нет лишнего балласта. {base} сообщает главное. {add1} добавляет конкретику, {add2} расширяет ситуацию, {add3} уточняет настроение или степень. По-русски: {final_ru}. Если бы фраза была шкафом, все полки здесь подписаны довольно честно.",
        f"Здесь полезно поймать не слова, а логику добавления. {base} уже можно понять отдельно. Но с {add1}, {add2} и {add3} мысль становится пригодной для настоящего разговора. Русский итог: {final_ru}. Именно так короткая фраза превращается в живую.",
        f"Эта строка учит спокойствию. Сначала ты слышишь {base}. Потом не пугаешься длины, а замечаешь три подсказки: {add1}, {add2}, {add3}. В русском это: {final_ru}. Чем чаще так слушать, тем быстрее мозг перестает хвататься за каждое слово отдельно.",
        f"Здесь английский не делает сальто, и это приятно. Он дает {base}, потом добавляет {add1}, дальше {add2}, и наконец {add3}. Русский перевод: {final_ru}. Важно, что детали не конкурируют с главным действием, а просто помогают его увидеть.",
        f"Фраза устроена как хорошее объяснение другу. Сначала говорим {base}. Потом, чтобы друг не спросил еще три раза, добавляем {add1}, {add2} и {add3}. По-русски получится: {final_ru}. Так английская длина превращается не в стресс, а в нормальную точность.",
    ]
    if chain.get("half") == "RU_FIRST":
        reverse_variants = [
            f"Во второй половине начинаем с русского смысла: {final_ru}. Теперь задача не угадать слова, а узнать, как английский раскладывает эту же сцену. Центр — {base}; рядом появляется {add1}, потом {add2}, и последним приходит {add3}. Так перевод перестает быть загадкой и становится проверкой: да, это та же мысль, только в английском порядке.",
            f"Русская фраза уже понятна: {final_ru}. Дальше слушаем английский как аккуратную сборку той же картинки. {base} дает главное действие, {add1} приближает обстоятельство, {add2} добавляет следующий слой, а {add3} закрывает смысл. Здесь полезно не спешить: английский не спорит с русским, он просто расставляет детали иначе.",
            f"Сначала держим в голове русскую сцену: {final_ru}. Потом смотрим, куда английский ставит опору. Он начинает с {base}, а не с дальних уточнений. Затем подтягивает {add1}, {add2} и {add3}. Получается не дословная калька, а нормальная английская дорожка к тому же смыслу.",
            f"Если русский вариант уже звучит естественно, английский легче услышать без паники. Тут смысл такой: {final_ru}. В английском первым выходит {base}. После него спокойно встают {add1}, {add2}, {add3}. Это полезная привычка: сначала найти действие, а потом позволить подробностям занять свои места.",
            f"Русский перевод дает готовую картинку: {final_ru}. Теперь английская версия показывает, из каких полок эта картинка собрана. {base} — главный факт, {add1} добавляет конкретику, {add2} объясняет следующий поворот, {add3} уточняет финальный оттенок. Так длинная строка звучит не как забор, а как понятная сцена.",
            f"Здесь удобно идти от смысла к форме. Мы уже понимаем: {final_ru}. Английский начинает с {base}, потому что ему важно быстро назвать действие. Потом появляются {add1}, {add2} и {add3}. Смотри, как те же куски смысла меняют порядок, но не меняют саму историю.",
            f"Русская фраза звучит цельно: {final_ru}. Английский делает ее прозрачной по частям. Он сначала показывает {base}, затем добавляет {add1}, после этого {add2}, и в конце {add3}. Ничего лишнего: каждое уточнение отвечает на маленький вопрос, который мог возникнуть у слушателя.",
            f"В этой части полезно не переводить обратно слово за словом. Русская мысль уже есть: {final_ru}. Теперь слушаем английский ритм: {base}, затем {add1}, дальше {add2}, потом {add3}. У фразы появляется английская походка, но смысл остается тем же.",
            f"Представь, что русский вариант — это уже готовый кадр: {final_ru}. Английский как будто наводит камеру сначала на {base}, потом на {add1}, затем на {add2}, и наконец на {add3}. Так становится понятно, почему порядок другой: язык просто выбирает свой маршрут по той же сцене.",
            f"Здесь русский помогает не потеряться: {final_ru}. Теперь английский надо услышать как ответ на вопрос «что главное?». Главное — {base}. После него идут {add1}, {add2}, {add3}. Когда держишь главный факт, хвост фразы уже не кажется длинным и злым.",
            f"Русская версия сразу говорит всю мысль: {final_ru}. Английская версия раскрывает ее постепенно. Сначала {base}, потом {add1}, потом {add2}, и только в конце {add3}. Важно не зубрить эту строку целиком, а почувствовать, как уточнения цепляются к понятному действию.",
            f"Смысл по-русски уже в руках: {final_ru}. Теперь проверяем, как он переезжает в английский. Первая опора — {base}. Затем к ней присоединяются {add1}, {add2} и {add3}. Хорошее упражнение: услышать не отдельные слова, а порядок появления информации.",
            f"Здесь русский вариант работает как карта: {final_ru}. По этой карте английский ведет нас через {base}, потом через {add1}, дальше через {add2}, и завершает {add3}. Если идти именно так, фраза не разваливается на куски.",
            f"Начинаем с понятного русского смысла: {final_ru}. Теперь английский показывает свою дисциплину: сперва {base}, затем {add1}, после этого {add2}, в конце {add3}. Это не сухая грамматика, а способ быстро сказать главное и потом спокойно уточнить остальное.",
            f"Русская мысль здесь простая и живая: {final_ru}. Английский не обязан копировать ее порядок. Он выбирает {base} как вход, затем добавляет {add1}, {add2} и {add3}. Поэтому слушаем не перестановку слов, а то, как смысл сохраняется при другом маршруте.",
            f"В русском уже понятно, что произошло: {final_ru}. Английский начинает с {base}, потому что это держит всю сцену. {add1} добавляет первую привязку, {add2} приносит обстоятельство, {add3} делает фразу точнее. Вот это и нужно услышать.",
            f"Здесь русский перевод помогает расслабиться: {final_ru}. Мы не ищем волшебную формулу, мы узнаем знакомую сцену в английском виде. {base} открывает ее, {add1} приближает, {add2} объясняет, {add3} завершает. Получается нормальная человеческая фраза, а не экзаменационный ребус.",
            f"Сначала пусть в голове прозвучит русский вариант: {final_ru}. Потом английский становится понятнее: он говорит {base}, добавляет {add1}, уточняет через {add2}, и заканчивает {add3}. Так ты слышишь не длинную строку, а движение мысли.",
            f"Русский смысл готов: {final_ru}. Теперь смотри, как английский выбирает порядок. Он не начинает с мелочей, а ставит вперед {base}. Потом идут {add1}, {add2}, {add3}. Это помогает говорить быстрее: главное уже сказано, детали просто догоняют.",
            f"Эта фраза хороша для reverse-режима, потому что русский сразу дает картину: {final_ru}. Английский отвечает ей через {base}, затем {add1}, дальше {add2}, и наконец {add3}. Если картину держать в голове, английская версия звучит почти как подписи к ней.",
            f"Русский вариант звучит так: {final_ru}. Теперь английский не нужно насильно строить, его можно услышать. Он начинается с {base}, потом добавляет {add1}, {add2}, {add3}. Каждая часть нужна не для красоты, а чтобы слушатель понял сцену без догадок.",
            f"Здесь сначала приходит смысл по-русски: {final_ru}. Потом английский аккуратно меняет упаковку. {base} становится главным входом, {add1} и {add2} добавляют контекст, {add3} закрывает мысль. Упаковка другая, содержимое то же.",
            f"Русский перевод уже сделал половину работы: {final_ru}. Теперь остается услышать английскую привычку: {base} впереди, а {add1}, {add2} и {add3} идут после него. Это не украшения на елке, а нужные адреса, время, причина или оттенок.",
            f"В этой сцене русский говорит сразу понятно: {final_ru}. Английский раздает информацию порциями: сначала {base}, потом {add1}, затем {add2}, в конце {add3}. Такой порядок удобно тренировать вслух, потому что он быстро превращается в привычку.",
            f"Русская фраза дает смысл без тумана: {final_ru}. Английская версия берет тот же смысл и кладет вперед {base}. После этого добавляет {add1}, {add2}, {add3}. Вот почему reverse-часть полезна: ты не угадываешь перевод, а узнаешь знакомую мысль в другом порядке.",
        ]
        text = reverse_variants[(idx - 26) % len(reverse_variants)]
    else:
        text = variants[(idx - 1) % len(variants)]
    return text


def validate_voiceovers(items: list[dict[str, Any]]) -> list[str]:
    errors: list[str] = []
    openings: set[str] = set()
    for item in items:
        idx = int(item["chain_index"])
        text = str(item["voiceover"])
        upper = text.upper()
        for forbidden in FORBIDDEN_TEXT_SNIPPETS:
            if forbidden in upper:
                errors.append(f"{idx:02d}: forbidden snippet {forbidden!r}")
        if text.count("шаг") > 0 or text.count("Шаг") > 0:
            errors.append(f"{idx:02d}: uses forbidden mechanical word 'шаг'")
        words = re.findall(r"[A-Za-zА-Яа-яЁё]+", text)
        if not (40 <= len(words) <= 115):
            errors.append(f"{idx:02d}: voiceover word count {len(words)} outside 40-115")
        opening = " ".join(words[:6]).casefold()
        if opening in openings:
            errors.append(f"{idx:02d}: repeated opening {opening!r}")
        openings.add(opening)
    return errors


# Strict 2026-06-02 standard: descriptions are Russian-only construction
# explanations. They must not quote the on-screen English phrase, repeat the
# visible text, or use mechanical lesson labels.
def authorial_voiceover(chain: dict[str, Any]) -> str:
    return build_strict_russian_explanation(chain)


def validate_voiceovers(items: list[dict[str, Any]]) -> list[str]:
    return validate_description_pack(items, expected_count=50)


def elevenlabs_with_timestamps(api_key: str, voice_id: str, text: str, audio_path: Path, alignment_path: Path) -> dict[str, Any]:
    if audio_path.exists() and audio_path.stat().st_size > 4096 and alignment_path.exists():
        return read_json(alignment_path)
    payload = {
        "text": text,
        "model_id": ELEVEN_MODEL,
        "output_format": "mp3_44100_128",
        "voice_settings": {
            "stability": 0.66,
            "similarity_boost": 0.78,
            "style": 0.14,
            "use_speaker_boost": True,
            "speed": 0.94,
        },
        "apply_text_normalization": "on",
    }
    response = requests.post(
        f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}/with-timestamps",
        headers={"xi-api-key": api_key, "Content-Type": "application/json"},
        data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
        timeout=240,
    )
    if response.status_code >= 400:
        raise RuntimeError(f"ElevenLabs timestamps failed {response.status_code}: {response.text[:800]}")
    data = response.json()
    audio_path.parent.mkdir(parents=True, exist_ok=True)
    alignment_path.parent.mkdir(parents=True, exist_ok=True)
    audio_path.write_bytes(base64.b64decode(data["audio_base64"]))
    write_json(alignment_path, data)
    return data


def alignment_for_text(data: dict[str, Any]) -> dict[str, Any]:
    return data.get("normalized_alignment") or data.get("alignment") or {}


def char_start(alignment: dict[str, Any], index: int, fallback: float) -> float:
    starts = alignment.get("character_start_times_seconds") or []
    if not starts:
        return fallback
    safe = max(0, min(index, len(starts) - 1))
    return float(starts[safe])


def char_end(alignment: dict[str, Any], index: int, fallback: float) -> float:
    ends = alignment.get("character_end_times_seconds") or []
    if not ends:
        return fallback
    safe = max(0, min(index, len(ends) - 1))
    return float(ends[safe])


def transcript_blocks(text: str, alignment: dict[str, Any], target_sec: float, raw_sec: float) -> list[dict[str, Any]]:
    words = list(re.finditer(r"\S+", text))
    blocks: list[dict[str, Any]] = []
    current: list[re.Match[str]] = []
    max_words = 7
    scale = target_sec / raw_sec if raw_sec > 0 else 1.0
    for match in words:
        current.append(match)
        token = match.group(0)
        strong_break = token.endswith((".", "!", "?", ":"))
        soft_break = token.endswith((",", ";"))
        if len(current) >= max_words or (strong_break and len(current) >= 3) or (soft_break and len(current) >= 5):
            first, last = current[0], current[-1]
            chunk_text = text[first.start() : last.end()].strip()
            start = char_start(alignment, first.start(), len(blocks) * 1.2) * scale
            end = char_end(alignment, max(last.end() - 1, first.start()), start + 1.0) * scale
            blocks.append(
                {
                    "text": chunk_text,
                    "anchor_words": chunk_text,
                    "start_sec": round(max(0.0, start - 0.04), 3),
                    "end_sec": round(min(target_sec, max(end + 0.18, start + 0.75)), 3),
                    "alignment_source": "authorial_transcript_eleven_char_scaled",
                }
            )
            current = []
    if current:
        first, last = current[0], current[-1]
        chunk_text = text[first.start() : last.end()].strip()
        start = char_start(alignment, first.start(), len(blocks) * 1.2) * scale
        end = char_end(alignment, max(last.end() - 1, first.start()), start + 1.0) * scale
        blocks.append(
            {
                "text": chunk_text,
                "anchor_words": chunk_text,
                "start_sec": round(max(0.0, start - 0.04), 3),
                "end_sec": round(min(target_sec, max(end + 0.18, start + 0.75)), 3),
                "alignment_source": "authorial_transcript_eleven_char_scaled",
            }
        )
    return blocks


def current_slots() -> list[float]:
    draft = read_json(CONTENT_PATH)
    track = next(t for t in draft["tracks"] if t.get("name") == "CODEx construction explanation UNIQUE VO")
    return [int(s["target_timerange"]["duration"]) / US for s in track["segments"]]


def generate_screensaver() -> Path:
    SCREEN_BG_DIR.mkdir(parents=True, exist_ok=True)
    if SCREEN_BG_PATH.exists() and ffprobe_duration(SCREEN_BG_PATH) >= 59:
        return SCREEN_BG_PATH
    vf = (
        "geq="
        "r='18+10*sin((X+T*55)/210)+7*sin((Y-T*30)/170)':"
        "g='29+13*sin((X+Y+T*42)/260)+9*sin((Y+T*18)/130)':"
        "b='42+20*sin((X-T*36)/240)+15*sin((Y+T*22)/190)',"
        "boxblur=10:3,"
        "vignette=PI/7,"
        "eq=contrast=1.12:saturation=1.18,"
        "format=yuv420p"
    )
    subprocess.run(
        [
            "ffmpeg",
            "-y",
            "-hide_banner",
            "-loglevel",
            "error",
            "-f",
            "lavfi",
            "-i",
            "nullsrc=s=1920x1080:d=60:r=24",
            "-vf",
            "".join(vf),
            "-an",
            "-c:v",
            "libx264",
            "-preset",
            "veryfast",
            "-crf",
            "20",
            str(SCREEN_BG_PATH),
        ],
        check=True,
    )
    return SCREEN_BG_PATH


def build_assets() -> dict[str, Any]:
    env = load_env()
    api_key = env.get("ELEVENLABS_API_KEY")
    if not api_key:
        raise RuntimeError("ELEVENLABS_API_KEY is required for one-voice authorial explanations.")
    voice_id = env.get("ELEVENLABS_RU_EXPLANATION_VOICE_ID") or env.get("ELEVENLABS_RU_TIP_VOICE_ID") or env.get("ELEVENLABS_VOICE_ID") or DEFAULT_RU_TIP_VOICE
    chains = read_json(CHAINS_PATH)
    slots = current_slots()
    staged: list[dict[str, Any]] = []
    drafts = [
        {
            "chain_index": chain["index"],
            "half": chain["half"],
            "voiceover": authorial_voiceover(chain),
            "foreign_final": chain["foreign_steps"][-1],
            "russian_final": chain["russian_steps"][-1],
            "tts_provider": "elevenlabs_authorial_one_voice",
        }
        for chain in chains
    ]
    errors = validate_voiceovers(drafts)
    write_json(ASSETS_DIR / "authorial_explanation_texts.json", drafts)
    if errors:
        write_json(ASSETS_DIR / "authorial_explanation_validation.json", {"errors": errors})
        raise RuntimeError("authorial validation failed: " + "; ".join(errors[:20]))

    for index, item in enumerate(drafts, start=1):
        raw_audio = STAGED_AUDIO_DIR / f"{index:02d}_authorial_raw.mp3"
        aligned = STAGED_ALIGN_DIR / f"{index:02d}_alignment.json"
        data = elevenlabs_with_timestamps(api_key, voice_id, item["voiceover"], raw_audio, aligned)
        raw_sec = ffprobe_duration(raw_audio)
        target_sec = slots[index - 1]
        fitted_audio = STAGED_AUDIO_DIR / f"{index:02d}_explanation.mp3"
        fit = fit_mp3_to_slot(raw_audio, fitted_audio, target_sec)
        blocks = transcript_blocks(item["voiceover"], alignment_for_text(data), target_sec, raw_sec)
        staged.append(
            {
                **item,
                "audio_path": str(fitted_audio),
                "raw_audio_path": str(raw_audio),
                "alignment_path": str(aligned),
                "duration_sec": round(target_sec, 3),
                "raw_duration_sec": round(raw_sec, 3),
                "fit": fit,
                "timed_blocks": blocks,
                "screen_blocks": [{"text": block["text"], "anchor_words": block["anchor_words"]} for block in blocks],
            }
        )
        print(f"[authorial-explain] {index:02d}/50 raw={raw_sec:.2f}s target={target_sec:.2f}s blocks={len(blocks)}", flush=True)
        write_json(STAGED_TIMED_PATH, staged)
        time.sleep(0.05)

    bg = generate_screensaver()
    report = {
        "items": len(staged),
        "voice_id": voice_id,
        "timed_path": str(STAGED_TIMED_PATH),
        "screensaver": str(bg),
        "validation": "passed",
    }
    write_json(ASSETS_DIR / "authorial_explanation_assets_report.json", report)
    write_json(ASSETS_DIR / "authorial_explanation_validation.json", {"errors": [], "count": len(staged)})
    return report


def material_by_id(materials: dict[str, Any], material_id: str) -> dict[str, Any] | None:
    for items in materials.values():
        if isinstance(items, list):
            for item in items:
                if isinstance(item, dict) and item.get("id") == material_id:
                    return item
    return None


def make_text_material(template: dict[str, Any], text: str, font_size: float) -> dict[str, Any]:
    mat = copy.deepcopy(template)
    mat["id"] = gid()
    mat["base_content"] = text
    mat["font_size"] = font_size
    mat["text_size"] = max(18, int(font_size * 4.2))
    mat["line_spacing"] = 0.02
    mat["background_alpha"] = 0.0
    content = json.loads(mat["content"])
    content["text"] = text
    for style in content.get("styles", []):
        style["range"] = [0, len(text)]
        style["size"] = font_size
        fill = style.setdefault("fill", {}).setdefault("content", {}).setdefault("solid", {})
        fill["color"] = [1, 1, 1]
    mat["content"] = json.dumps(content, ensure_ascii=False, separators=(",", ":"))
    return mat


def font_size(text: str) -> float:
    count = len(text)
    if count <= 36:
        return 5.9
    if count <= 52:
        return 5.2
    return 4.7


def clone_track(template: dict[str, Any], name: str, segments: list[dict[str, Any]]) -> dict[str, Any]:
    track = copy.deepcopy(template)
    track["id"] = gid()
    track["name"] = name
    track["is_default_name"] = False
    track["segments"] = segments
    return track


def update_audio_and_bg_materials(draft: dict[str, Any], timed: list[dict[str, Any]]) -> None:
    audio_track = next(t for t in draft["tracks"] if t.get("name") == "CODEx construction explanation UNIQUE VO")
    bg_track = next(t for t in draft["tracks"] if t.get("name") == "CODEx construction explanation SCREENSAVER")
    audio_by_id = {m.get("id"): m for m in draft.get("materials", {}).get("audios", [])}
    video_by_id = {m.get("id"): m for m in draft.get("materials", {}).get("videos", [])}
    RESOURCE_AUDIO_DIR.mkdir(parents=True, exist_ok=True)
    RESOURCE_BG_DIR.mkdir(parents=True, exist_ok=True)
    resource_bg = RESOURCE_BG_DIR / SCREEN_BG_PATH.name
    shutil.copy2(SCREEN_BG_PATH, resource_bg)
    for index, (audio_segment, bg_segment, item) in enumerate(zip(audio_track["segments"], bg_track["segments"], timed), start=1):
        live_audio = LIVE_AUDIO_DIR / f"{index:02d}_explanation.mp3"
        shutil.copy2(item["audio_path"], live_audio)
        shutil.copy2(live_audio, RESOURCE_AUDIO_DIR / live_audio.name)
        duration_us = int(audio_segment["target_timerange"]["duration"])
        audio_material = audio_by_id.get(audio_segment["material_id"])
        if audio_material:
            audio_material["duration"] = duration_us
            audio_material["name"] = live_audio.name
            audio_material["path"] = str(RESOURCE_AUDIO_DIR / live_audio.name)
            audio_material["wave_points"] = []
        video_material = video_by_id.get(bg_segment["material_id"])
        if video_material:
            video_material["path"] = str(resource_bg)
            video_material["name"] = SCREEN_BG_PATH.name
            video_material["duration"] = 60 * US
        bg_segment["is_loop"] = True
        if isinstance(bg_segment.get("source_timerange"), dict):
            bg_segment["source_timerange"]["start"] = 0
            bg_segment["source_timerange"]["duration"] = min(60 * US, int(bg_segment["target_timerange"]["duration"]))


def rebuild_transcript_tracks(draft: dict[str, Any], timed: list[dict[str, Any]]) -> int:
    tracks = draft["tracks"]
    bg_track = next(t for t in tracks if t.get("name") == "CODEx construction explanation SCREENSAVER")
    removed: list[dict[str, Any]] = []
    kept: list[dict[str, Any]] = []
    for track in tracks:
        name = str(track.get("name", ""))
        if name == "CODEx construction explanation TIMED TEXT" or name.startswith("CODEx construction explanation PERSISTENT TEXT LINE ") or name.startswith("CODEx construction explanation TRANSCRIPT LINE "):
            removed.append(track)
        else:
            kept.append(track)
    if not removed:
        raise RuntimeError("No previous explanation text track found to use as template.")
    draft["tracks"] = kept
    template_track = removed[0]
    template_segment = template_track["segments"][0]
    template_material = material_by_id(draft["materials"], template_segment["material_id"])
    if template_material is None:
        raise RuntimeError("Text template material not found.")

    line_tracks: list[list[dict[str, Any]]] = [[] for _ in range(5)]
    y_positions = [-0.18, -0.09, 0.0, 0.09, 0.18]
    for exp_index, item in enumerate(timed):
        bg_range = bg_track["segments"][exp_index]["target_timerange"]
        window_start = int(bg_range["start"])
        window_end = window_start + int(bg_range["duration"])
        blocks = item.get("timed_blocks", [])
        page_size = 5
        for block_index, block in enumerate(blocks):
            line_index = block_index % page_size
            page_start_index = block_index - line_index
            page_end_index = min(page_start_index + page_size, len(blocks)) - 1
            page_end_sec = float(blocks[page_end_index].get("end_sec", block.get("end_sec", 0))) + 0.6
            start = window_start + int(round(float(block.get("start_sec", 0)) * US))
            end = min(window_end - 120_000, window_start + int(round(page_end_sec * US)))
            if end <= start:
                end = min(window_end - 120_000, start + 800_000)
            text = str(block.get("text", "")).strip()
            material = make_text_material(template_material, text, font_size(text))
            draft["materials"].setdefault("texts", []).append(material)
            segment = copy.deepcopy(template_segment)
            segment["id"] = gid()
            segment["material_id"] = material["id"]
            segment["target_timerange"] = {"start": start, "duration": end - start}
            segment["source_timerange"] = None
            segment["visible"] = True
            segment["clip"]["transform"] = {"x": 0.0, "y": y_positions[line_index]}
            segment["clip"]["scale"] = {"x": 1.0, "y": 1.0}
            line_tracks[line_index].append(segment)

    total = 0
    for index, segments in enumerate(line_tracks, start=1):
        segments.sort(key=lambda s: int(s["target_timerange"]["start"]))
        total += len(segments)
        draft["tracks"].append(clone_track(template_track, f"CODEx construction explanation TRANSCRIPT LINE {index}", segments))
    return total


def apply_to_draft() -> dict[str, Any]:
    if capcut_is_open():
        raise SystemExit("CapCut is open. Close CapCut before applying authorial explanations.")
    if not STAGED_TIMED_PATH.exists():
        raise RuntimeError(f"staged timed explanations missing: {STAGED_TIMED_PATH}")
    backup = backup_project("backup-before-authorial-explanations")
    draft = read_json(CONTENT_PATH)
    timed = read_json(STAGED_TIMED_PATH)
    update_audio_and_bg_materials(draft, timed)
    transcript_segments = rebuild_transcript_tracks(draft, timed)
    write_compact_json(CONTENT_PATH, draft)
    if TMP_PATH.exists():
        write_compact_json(TMP_PATH, draft)
    meta = read_json(META_PATH)
    meta["tm_duration"] = draft["duration"]
    write_compact_json(META_PATH, meta)
    write_json(LIVE_TIMED_PATH, timed)
    report = {
        "backup": str(backup),
        "timed_explanations": len(timed),
        "transcript_segments": transcript_segments,
        "screensaver": str(SCREEN_BG_PATH),
    }
    write_json(ASSETS_DIR / "authorial_explanation_apply_report.json", report)
    return report


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true", help="Apply staged authorial assets into the CapCut draft. CapCut must be closed.")
    args = parser.parse_args()
    build_report = build_assets()
    result = {"build": build_report}
    if args.apply:
        result["apply"] = apply_to_draft()
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
