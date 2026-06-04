from __future__ import annotations

import json
import base64
import os
import re
import subprocess
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import requests


DRAFT_NAME = "CHAINS_EP01_ENHANCED_CTA_EXPLAIN_REVERSE 20260602_085658"
DRAFT_DIR = Path.home() / "AppData/Local/CapCut/User Data/Projects/com.lveditor.draft" / DRAFT_NAME
OUT_DIR = Path("exports/chains/episode1/unique_explanations_approved")
CHAT_MODEL = "gpt-4o-mini"
TTS_MODEL = "gpt-4o-mini-tts"
TRANSCRIBE_MODEL = "whisper-1"
TTS_VOICE = "marin"
ELEVEN_MODEL = "eleven_multilingual_v2"

FORBIDDEN_CLICHES = [
    "порядок: кто + действие",
    "потом детали справа",
    "ключ:",
    "формула простая",
    "запомни конструкцию",
    "сначала событие",
    "добавляем время",
    "добавляем место",
    "добавляем причину",
]


@dataclass
class Chain:
    index: int
    half: str
    foreign_steps: list[str]
    russian_steps: list[str]
    ipa_steps: list[str]
    starts_us: list[int]
    ends_us: list[int]


def load_env_file(start: Path) -> dict[str, str]:
    env_path = next((folder / ".env.local" for folder in [start.resolve(), *start.resolve().parents] if (folder / ".env.local").exists()), None)
    values: dict[str, str] = {}
    if not env_path:
        return values
    for line in env_path.read_text(encoding="utf-8-sig", errors="ignore").splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#") or "=" not in stripped:
            continue
        key, value = stripped.split("=", 1)
        values[key.strip()] = value.strip().strip('"').strip("'")
    return values


def read_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def text_for_segment(draft: dict, segment: dict) -> str:
    mid = segment["material_id"]
    mat = next(m for m in draft["materials"]["texts"] if m["id"] == mid)
    return json.loads(mat["content"]).get("text", "").replace("\n", " ").replace("|", " ").strip()


def extract_chains() -> list[Chain]:
    draft = read_json(DRAFT_DIR / "draft_content.json")
    tracks = draft["tracks"]
    chains: list[Chain] = []
    # First half: English is primary, Russian translation is track 4.
    en_first = tracks[6]["segments"]
    ru_first = tracks[4]["segments"][:100]
    ipa_first = tracks[5]["segments"]
    for group in range(25):
        base = group * 4
        segs = en_first[base : base + 4]
        chains.append(
            Chain(
                index=group + 1,
                half="EN_FIRST",
                foreign_steps=[text_for_segment(draft, s) for s in segs],
                russian_steps=[text_for_segment(draft, s) for s in ru_first[base : base + 4]],
                ipa_steps=[text_for_segment(draft, s) for s in ipa_first[base : base + 4]],
                starts_us=[s["target_timerange"]["start"] for s in segs],
                ends_us=[s["target_timerange"]["start"] + s["target_timerange"]["duration"] for s in segs],
            )
        )
    # Second half: Russian is primary on track 3, English appears on track 4 from index 100.
    ru_second = tracks[3]["segments"]
    en_second = tracks[4]["segments"][100:200]
    ipa_second = tracks[2]["segments"]
    for group in range(25):
        base = group * 4
        segs = ru_second[base : base + 4]
        chains.append(
            Chain(
                index=group + 26,
                half="RU_FIRST",
                foreign_steps=[text_for_segment(draft, s) for s in en_second[base : base + 4]],
                russian_steps=[text_for_segment(draft, s) for s in segs],
                ipa_steps=[text_for_segment(draft, s) for s in ipa_second[base : base + 4]],
                starts_us=[s["target_timerange"]["start"] for s in segs],
                ends_us=[s["target_timerange"]["start"] + s["target_timerange"]["duration"] for s in segs],
            )
        )
    return chains


def normalize_similarity(text: str) -> list[str]:
    # Do not punish mandatory repeated lesson phrases inside quotes; compare the
    # explanatory language around them.
    text = re.sub(r"«[^»]+»", " ", text)
    return re.findall(r"[a-zа-яё]+", text.lower())


def trigram_set(text: str) -> set[tuple[str, str, str]]:
    words = normalize_similarity(text)
    return set(zip(words, words[1:], words[2:]))


def similarity(a: str, b: str) -> float:
    aa = trigram_set(a)
    bb = trigram_set(b)
    if not aa or not bb:
        return 0.0
    return len(aa & bb) / max(1, min(len(aa), len(bb)))


def validate_explanations(items: list[dict[str, Any]]) -> list[str]:
    errors: list[str] = []
    starts: set[str] = set()
    for i, item in enumerate(items, start=1):
        voiceover = str(item.get("voiceover", "")).strip()
        if not voiceover:
            errors.append(f"{i:02d}: empty voiceover")
            continue
        first_words = " ".join(normalize_similarity(voiceover)[:5])
        if first_words in starts:
            errors.append(f"{i:02d}: repeated opening: {first_words}")
        starts.add(first_words)
        lower = voiceover.lower()
        for cliché in FORBIDDEN_CLICHES:
            if cliché in lower:
                errors.append(f"{i:02d}: forbidden cliché: {cliché}")
        blocks = item.get("screen_blocks")
        if not isinstance(blocks, list) or not (4 <= len(blocks) <= 9):
            errors.append(f"{i:02d}: screen_blocks must be 4-9 items")
            continue
        for bi, block in enumerate(blocks, start=1):
            text = str(block.get("text", "")).strip()
            anchor = str(block.get("anchor_words", "")).strip()
            if not text or not anchor:
                errors.append(f"{i:02d}.{bi}: missing text/anchor")
            if "\n" in text:
                lines = text.splitlines()
            else:
                lines = [text]
            if len(lines) > 2:
                errors.append(f"{i:02d}.{bi}: more than 2 screen lines")
            for line in lines:
                parts = re.findall(r"[A-Za-zА-Яа-яЁё]+", line)
                if len(line.strip()) == 1 and parts:
                    errors.append(f"{i:02d}.{bi}: one-letter line")
                if len(parts) > 7:
                    errors.append(f"{i:02d}.{bi}: too many words in block")
    for i in range(len(items)):
        for j in range(i):
            score = similarity(str(items[i].get("voiceover", "")), str(items[j].get("voiceover", "")))
            if score >= 0.10:
                errors.append(f"{i+1:02d}: too similar to {j+1:02d}: {score:.2%}")
    return errors


def prompt_for_batch(chains: list[Chain], prior_samples: list[str]) -> str:
    payload = {
        "task": "Создай уникальные русские объяснения для видео по методу цепочек.",
        "global_rules": [
            "Каждое объяснение должно быть живым, конкретным и не шаблонным.",
            "Запрещены клише: порядок: кто + действие; потом детали справа; ключ; формула простая; запомни конструкцию.",
            "Не повторяй начало, ритм и лексику предыдущих объяснений.",
            "Объясняй именно слова этой цепочки: что добавляется в шагах 1-4, почему так звучит английский, где русская логика отличается.",
            "20-35 секунд озвучки, русский язык, естественный преподавательский тон.",
            "screen_blocks: 4-9 коротких блоков, каждый 2-7 слов, максимум 2 строки, без разрыва слов.",
            "screen_blocks должны появляться по словам озвучки: anchor_words должен быть точной короткой цитатой из voiceover.",
            "Верни строгий JSON с ключом items. Один item на одну входную цепочку.",
        ],
        "output_schema": {
            "items": [
                {
                    "chain_index": "number",
                    "voiceover": "string",
                    "screen_blocks": [{"text": "string", "anchor_words": "string"}],
                    "grammar_focus": ["string"],
                    "banned_similarity_note": "string",
                }
            ]
        },
        "prior_voiceover_openings_to_avoid": prior_samples[-20:],
        "chains": [
            {
                "chain_index": c.index,
                "mode": c.half,
                "english_steps": c.foreign_steps,
                "russian_steps": c.russian_steps,
                "ipa_steps": c.ipa_steps,
            }
            for c in chains
        ],
    }
    return json.dumps(payload, ensure_ascii=False)


def openai_chat_json(api_key: str, prompt: str) -> list[dict[str, Any]]:
    response = requests.post(
        "https://api.openai.com/v1/chat/completions",
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
        json={
            "model": CHAT_MODEL,
            "temperature": 0.65,
            "response_format": {"type": "json_object"},
            "messages": [
                {
                    "role": "system",
                    "content": "Ты строгий редактор русских объяснений для видеоуроков. Пиши разнообразно, точно и без шаблонов. Возвращай только JSON.",
                },
                {"role": "user", "content": prompt},
            ],
        },
        timeout=240,
    )
    if response.status_code >= 400:
        raise RuntimeError(f"OpenAI chat failed {response.status_code}: {response.text[:1000]}")
    data = response.json()
    parsed = json.loads(data["choices"][0]["message"]["content"])
    return parsed["items"]


def generate_explanations(api_key: str, chains: list[Chain]) -> list[dict[str, Any]]:
    out_path = OUT_DIR / "explanations_unique.json"
    if out_path.exists():
        items = read_json(out_path)
        if len(items) == 50 and not validate_explanations(items):
            return items
    items: list[dict[str, Any]] = []
    openai_blocked = False
    for start in range(0, len(chains), 5):
        batch = chains[start : start + 5]
        last_error: Exception | None = None
        for attempt in range(1, 5):
            try:
                new_items = openai_chat_json(api_key, prompt_for_batch(batch, [str(x["voiceover"]) for x in items]))
                if len(new_items) != len(batch):
                    raise RuntimeError(f"batch returned {len(new_items)} items, expected {len(batch)}")
                trial = items + new_items
                errors = validate_explanations(trial)
                local_errors = [e for e in errors if int(e.split(':', 1)[0]) > len(items)]
                if local_errors:
                    raise RuntimeError("; ".join(local_errors[:8]))
                items = trial
                write_json(out_path, items)
                print(f"[unique-explain] batch {start//5+1}/10 ok", flush=True)
                break
            except Exception as error:  # noqa: BLE001
                last_error = error
                print(f"[unique-explain] retry batch {start//5+1} attempt {attempt}: {error}", flush=True)
                if "insufficient_quota" in str(error) or "exceeded your current quota" in str(error).lower():
                    openai_blocked = True
                    break
                time.sleep(1.5 * attempt)
        if openai_blocked:
            print("[unique-explain] OpenAI quota blocked; using local diverse fallback text generator", flush=True)
            items = local_fallback_explanations(chains)
            errors = validate_explanations(items)
            if errors:
                raise RuntimeError("local fallback validation failed: " + "; ".join(errors[:20]))
            write_json(out_path, items)
            return items
        else:
            raise RuntimeError(f"failed batch {start//5+1}: {last_error}")
    return items


LEADS = [
    "Здесь полезно смотреть на фразу как на маленькую сцену.",
    "В этой цепочке главное не переводить слово за словом, а услышать, как мысль удлиняется.",
    "Смысл собирается спокойно: сначала каркас, потом уточнения.",
    "Эта фраза хороша тем, что показывает английскую привычку держать главное впереди.",
    "Здесь всё начинается с простого сообщения, а дальше к нему прикрепляются детали.",
    "Посмотри, как английский не переставляет всю фразу, когда добавляет новую информацию.",
    "Эту цепочку удобно читать как ответ на несколько вопросов подряд.",
    "Тут важно не потерять центр фразы: он остается тем же на всех четырех шагах.",
    "В этой конструкции английский ведет слушателя от события к обстоятельствам.",
    "Здесь фраза похожа на кадр, который постепенно становится четче.",
    "Сначала слышится действие, и только потом появляются уточнения вокруг него.",
    "Эта цепочка учит не зубрить фразу целиком, а наращивать её кусками.",
    "В английском здесь всё держится на одном движении мысли.",
    "Обрати внимание: каждый следующий шаг не ломает фразу, а добавляет один смысловой слой.",
    "Тут русский перевод может звучать свободнее, но английский порядок остается устойчивым.",
    "Эта фраза показывает, как короткое сообщение превращается в точное.",
    "Здесь хорошо видно, где заканчивается основа и начинаются пояснения.",
    "В этой цепочке не надо угадывать грамматику: она раскрывается через добавленные куски.",
    "Смотри на последний вариант как на полную версию первой мысли.",
    "Здесь английский словно отвечает: что произошло, где, когда и каким образом.",
    "Эта цепочка держится на постепенном уточнении, а не на новом переводе.",
    "В таком примере важно услышать хвост фразы: именно он добавляет обстоятельства.",
    "Здесь хороший тренировочный момент: основа остается знакомой, а меняется только окружение.",
    "Фраза растет без рывков: каждый новый кусок объясняет предыдущий.",
    "В этой цепочке английский показывает порядок внимания: сначала факт, потом подробности.",
    "Во второй части мы идем от русского смысла к английской сборке.",
    "Здесь русский вариант помогает понять идею, но английский нужно собрать в своем порядке.",
    "Теперь направление обратное: сначала понятен русский смысл, потом ищем английскую конструкцию.",
    "В этой половине важно не копировать русский порядок автоматически.",
    "Русская фраза звучит естественно по-своему, а английская собирает те же смыслы иначе.",
    "Здесь задача — перенести мысль, а не форму русского предложения.",
    "Сначала держим в голове русский смысл, затем раскладываем его на английские куски.",
    "Этот пример хорошо показывает, где русский язык свободнее английского.",
    "Во второй половине особенно важно увидеть, что английская основа появляется раньше деталей.",
    "Здесь мы проверяем, можешь ли ты собрать английскую фразу из уже понятного русского смысла.",
    "Русский перевод дает картину целиком, но английский ведет ее по шагам.",
    "В этой цепочке русская фраза может звучать одним потоком, а английская строит ступени.",
    "Теперь смотри не на отдельные слова, а на то, какую роль они выполняют.",
    "Здесь русский смысл уже знаком, поэтому внимание переносим на английский порядок.",
    "Эта цепочка помогает отделить смысл от привычного русского расположения слов.",
    "Во второй части фраза тренирует обратный навык: сказать по-английски то, что уже ясно по-русски.",
    "Здесь важно не торопиться: сначала находим ядро английской фразы.",
    "Русский вариант подсказывает ситуацию, но английский требует своего маршрута.",
    "В этой цепочке видно, как из русской мысли получается английское предложение.",
    "Теперь полезно следить за тем, какие слова отвечают за действие, а какие — за уточнение.",
    "Здесь английский вариант не повторяет русскую мелодию, он собирает ту же мысль иначе.",
    "Во второй половине мы проверяем не память, а умение перестроить смысл.",
    "Эта фраза показывает, что перевод — это не копирование порядка, а сборка значения.",
    "Русский текст дает опору, а английский показывает, куда поставить каждую деталь.",
    "Здесь финальная фраза должна ощущаться как естественный английский ответ на русский смысл.",
]

NARRATIVE_TEMPLATES = [
    "{lead} Смысловой центр — «{s1}»: по-русски это «{r1}». Затем к нему пристает «{a2}», как первая подпись к кадру. «{a3}» уже объясняет обстоятельство, а «{a4}» делает финал точным. Полная английская версия — «{s4}», и ее лучше слышать как один спокойный маршрут мысли.",
    "{lead} Начало «{s1}» дает действие без лишних украшений. Русский вариант «{r1}» передает тот же факт. Дальше «{a2}» уточняет сцену, «{a3}» добавляет новый ответ на вопрос, а «{a4}» закрывает оставшуюся деталь. В итоге «{s4}» звучит не длинно, а просто подробно.",
    "{lead} Представь, что первая строка — это заголовок: «{s1}». Потом появляется маленькая табличка «{a2}». Следующая часть «{a3}» добавляет контекст, без которого фраза была бы беднее. Последний хвост «{a4}» меняет оттенок смысла, и поэтому русский финал «{r4}» уже звучит полнее.",
    "{lead} Здесь не нужно пересобирать начало: «{s1}» остается опорой. В русском «{r1}» это тоже главный факт. Когда слышишь «{a2}», добавь его после основы. Потом присоединяется «{a3}». А «{a4}» ставит последнюю точку, так что «{s4}» ощущается как расширенная версия первой фразы.",
    "{lead} У этой цепочки есть простой нерв: «{s1}». Всё остальное не спорит с ним, а уточняет. «{a2}» дает первую прибавку, «{a3}» раскрывает ситуацию шире, «{a4}» добавляет финальный нюанс. Русский перевод «{r4}» может звучать иначе по порядку, но смысловые куски те же.",
    "{lead} Если убрать детали, останется «{s1}». Это скелет фразы. «{a2}» наращивает его без паузы, «{a3}» отвечает на следующий скрытый вопрос, а «{a4}» делает высказывание законченным. Поэтому слушай не длину, а последовательность: факт превращается в точную мысль.",
    "{lead} Первая фраза «{s1}» уже понятна сама по себе. Добавка «{a2}» не меняет действие, она только сужает смысл. После нее «{a3}» приносит новую подробность. Финальное «{a4}» помогает сказать именно «{r4}», а не просто короткий общий вариант.",
    "{lead} Здесь английский ведет очень экономно. Он произносит «{s1}», а потом не возвращается назад. «{a2}» ставится рядом с уже сказанным, «{a3}» продолжает хвост, «{a4}» добавляет последний штрих. Русский может переставить слова свободнее, но английская линия остается прямой.",
    "{lead} Внутри этой фразы есть четыре слоя. Первый слой — «{s1}». Второй появляется через «{a2}». Третий — «{a3}», он расширяет картину. Четвертый — «{a4}», он делает вариант разговорно точным. Так «{s4}» становится не сложной, а просто собранной фразой.",
    "{lead} Сначала слышим короткую мысль «{s1}». Потом английский аккуратно подвешивает к ней «{a2}». Следующая прибавка «{a3}» объясняет ситуацию глубже. Наконец, «{a4}» добавляет оттенок, который в русском финале звучит как «{r4}».",
    "{lead} Здесь удобно идти от вопроса к вопросу. Что произошло? «{s1}». Какая первая деталь? «{a2}». Что еще важно? «{a3}». Какой последний смысловой штрих? «{a4}». Поэтому полная фраза «{s4}» читается ступенями, а не одним тяжелым комком.",
    "{lead} Английское начало «{s1}» работает как якорь. К нему пристегивается «{a2}». Потом появляется «{a3}», и фраза становится конкретнее. Завершает цепочку «{a4}». В русском «{r4}» порядок может быть мягче, но при сборке по-английски якорь остается впереди.",
    "{lead} Обрати внимание на добавки, а не только на перевод. «{s1}» — короткий факт. «{a2}» делает его менее общим. «{a3}» добавляет обстоятельство. «{a4}» уточняет финальную картинку. Вот почему «{s4}» звучит естественно: каждый кусок занимает свое место.",
    "{lead} Эта цепочка хороша для слуха: начало «{s1}» повторяется, а мозг замечает только новые хвосты. Сначала хвост «{a2}», затем «{a3}», потом «{a4}». Русский финал «{r4}» передает всю картину, но английский показывает, как она была собрана.",
    "{lead} Не пытайся сразу запомнить «{s4}». Разложи ее: «{s1}» дает основу, «{a2}» добавляет первую точность, «{a3}» приносит следующий смысл, «{a4}» завершает. Так длинная фраза перестает выглядеть длинной.",
    "{lead} В первом шаге английский говорит только главное: «{s1}». Во втором появляется «{a2}», и это уже более живая ситуация. Третий кусок «{a3}» расширяет контекст. Последний «{a4}» нужен, чтобы финал совпал с русским смыслом «{r4}».",
    "{lead} Здесь все держится на том, что начало не двигается. «{s1}» остается первой частью. «{a2}» добавляется после нее, «{a3}» продолжает уточнение, «{a4}» добавляет заключительный оттенок. Поэтому английский звучит ровно, даже когда фраза становится длиннее.",
    "{lead} Смотри на «{s1}» как на короткий черновик. «{a2}» — первая правка. «{a3}» — вторая правка, уже смысловая. «{a4}» — финальная правка. После этого получается «{s4}», а русский перевод «{r4}» просто показывает готовую версию.",
    "{lead} В этой цепочке новые слова не появляются случайно. «{a2}» отвечает за первую конкретику, «{a3}» за следующую подробность, «{a4}» за финальный нюанс. Но всё это держится на «{s1}». Поэтому повтор основы помогает не потеряться.",
    "{lead} Английский здесь как будто ведет камеру ближе. Дальний план — «{s1}». Ближе — «{a2}». Еще ближе — «{a3}». И самый точный кадр — «{a4}». Так фраза приходит к полному варианту «{s4}».",
    "{lead} Первый шаг «{s1}» можно произнести отдельно, и он будет понятен. Но «{a2}» делает его полезнее. «{a3}» добавляет причину, время или место — то, что важно именно здесь. А «{a4}» делает фразу похожей на реальную речь.",
    "{lead} Здесь тренируется не память, а сборка. Берешь «{s1}», добавляешь «{a2}», затем «{a3}», затем «{a4}». Русский «{r4}» нужен как проверка смысла: если картина совпала, английская цепочка собрана правильно.",
    "{lead} У фразы есть начало, которое нельзя размазывать: «{s1}». Потом идут уточнения: сначала «{a2}», дальше «{a3}», потом «{a4}». Они не одинаковые по роли, и поэтому каждый шаг должен слышаться отдельно.",
    "{lead} Эта цепочка показывает, как английский любит добавлять информацию после уже понятного действия. Основа — «{s1}». Добавка «{a2}» первая, «{a3}» следующая, «{a4}» последняя. Финал «{s4}» звучит цельно именно из-за такого порядка.",
    "{lead} Здесь удобно держать русский финал «{r4}» как картинку, а английский — как путь к ней. Путь начинается с «{s1}», проходит через «{a2}», затем через «{a3}», и заканчивается на «{a4}».",
    "{lead} Русский смысл уже понятен: «{r4}». Теперь не копируем его порядок. Английская сборка стартует с «{s1}». Следом идет «{a2}», потом «{a3}», и в конце «{a4}». Так мысль становится английской, а не просто дословной.",
    "{lead} Здесь русский подсказывает ситуацию, но английский выбирает свою дорогу. Первым ставим «{s1}». После него спокойно добавляем «{a2}». Потом идет «{a3}». Закрывает цепочку «{a4}», и получается естественное «{s4}».",
    "{lead} В русском «{r4}» можно услышать всю картину сразу. Английский раскладывает ее по ступеням: «{s1}», затем «{a2}», затем «{a3}», затем «{a4}». Такой порядок помогает не превращать перевод в кашу.",
    "{lead} Сначала найди английское ядро: «{s1}». Не начинай с последней русской детали. «{a2}» добавляется позже, «{a3}» еще позже, «{a4}» в самом конце. Тогда фраза звучит как английская речь, а не как русский порядок слов.",
    "{lead} Русская фраза «{r4}» дает готовый смысл. Но английская версия строится с опорой на начало «{s1}». «{a2}» добавляет ближайшую деталь, «{a3}» расширяет ее, «{a4}» доводит мысль до полного варианта.",
    "{lead} Здесь важно отделить смысл от расположения слов. Смысл — «{r4}». Английское расположение начинается с «{s1}». Потом идут «{a2}», «{a3}» и «{a4}». Так ты переводишь не механически, а по-английски.",
    "{lead} Представь, что русский вариант — это готовая сцена. Чтобы описать ее английским, сначала называем «{s1}». Затем добавляем «{a2}». После этого появляется «{a3}». Последний кусок «{a4}» закрепляет нужный оттенок.",
    "{lead} Здесь русский порядок может соблазнить начать не с того места. Но английский выбирает основу «{s1}». Дальше «{a2}» встает рядом с ней, «{a3}» уточняет, «{a4}» завершает. Поэтому финал «{s4}» звучит естественно.",
    "{lead} Вторая половина проверяет обратную сборку. Видим русский смысл «{r4}», но английское начало — «{s1}». Затем прибавляем «{a2}», потом «{a3}», потом «{a4}». Каждый кусок переносит одну часть смысла.",
    "{lead} Русская фраза может звучать более свободно, но английская любит последовательность. Она идет так: «{s1}», после него «{a2}», затем «{a3}», и в финале «{a4}». Это не украшения, а порядок сборки.",
    "{lead} Здесь сначала держим ситуацию по-русски: «{r4}». Потом спрашиваем: где английская основа? Это «{s1}». Какая первая прибавка? «{a2}». Что уточняет дальше? «{a3}». Что закрывает смысл? «{a4}».",
    "{lead} Не тащи русское предложение целиком в английский. Возьми из него смысл и начни с «{s1}». После этого присоедини «{a2}», затем «{a3}», затем «{a4}». Так русский финал превращается в нормальный английский.",
    "{lead} Здесь хорошо видно, что перевод — это выбор ролей. «{s1}» несет основное действие. «{a2}» первая роль-уточнение. «{a3}» следующая роль. «{a4}» последняя. Русское «{r4}» только подтверждает общую картину.",
    "{lead} Английская версия не обязана повторять русскую мелодию. Она начинает с «{s1}». Потом добавляет «{a2}», «{a3}» и «{a4}». Если держать эту лестницу, фраза «{s4}» собирается без напряжения.",
    "{lead} Русский смысл «{r4}» уже ясен. Теперь задача — поставить английские куски в рабочий порядок. Сначала «{s1}», дальше «{a2}», потом «{a3}», и в конце «{a4}». Это и есть переход от понимания к говорению.",
    "{lead} Здесь не ищем одно русское слово для каждого английского. Сначала берем английскую основу «{s1}». Потом добавляем смысл «{a2}». Следом идет «{a3}». Последним приходит «{a4}», и фраза становится полной.",
    "{lead} В русском финале «{r4}» может быть свой акцент. В английском акцент строится через порядок: «{s1}» впереди, затем «{a2}», затем «{a3}», затем «{a4}». Так слушатель получает информацию порциями.",
    "{lead} Эта цепочка учит не переводить с конца. Английский начинает с «{s1}». Дальше добавляет «{a2}», потом «{a3}», а «{a4}» оставляет как завершающую точность. Поэтому «{s4}» звучит естественно.",
    "{lead} Сначала поймай русский смысл «{r4}», но сразу перестрой его. Английский каркас — «{s1}». Первая добавка — «{a2}». Следующая — «{a3}». Последняя — «{a4}». Такой маршрут сохраняет смысл и убирает дословность.",
    "{lead} Здесь работает простой слуховой контроль: если начало «{s1}» на месте, остальное можно присоединять. «{a2}» идет первым хвостом, «{a3}» вторым, «{a4}» последним. Русский перевод нужен только как проверка результата.",
    "{lead} Русское «{r4}» звучит как готовая мысль. Английский строит ее постепенно: сначала «{s1}», затем «{a2}», затем «{a3}», затем «{a4}». Важно не ускорять сборку и слышать каждый добавленный слой.",
    "{lead} Здесь английская фраза собирается из ролей. «{s1}» отвечает за главное сообщение. «{a2}» сужает его. «{a3}» добавляет обстоятельство. «{a4}» уточняет финальный оттенок. Так русский смысл получает английскую форму.",
    "{lead} Во второй половине полезно спрашивать не «как дословно», а «что сначала скажет англичанин». Он начнет с «{s1}». Потом поставит «{a2}», затем «{a3}», и только после этого «{a4}».",
    "{lead} Не начинай с украшений русского предложения. Сначала назови английское действие: «{s1}». После него поставь «{a2}» — это ближайшая рамка ситуации. «{a3}» уточняет инструмент или место, а «{a4}» показывает манеру. В результате «{s4}» звучит собранно, без русской перестановки.",
    "{lead} Финальный русский смысл — «{r4}». Чтобы не утонуть в нем, собираем английский по кускам: «{s1}» как начало, «{a2}» как прибавка, «{a3}» как уточнение, «{a4}» как завершение. Это делает фразу управляемой.",
]


def prefix_addition(prev: str, cur: str) -> str:
    a = prev.replace("|", " ").split()
    b = cur.replace("|", " ").split()
    i = 0
    while i < min(len(a), len(b)) and a[i].lower() == b[i].lower():
        i += 1
    return " ".join(b[i:]) or cur


def short_block(text: str, max_words: int = 5) -> str:
    words = text.replace("|", " ").split()
    if len(words) <= max_words:
        return " ".join(words)
    cut = " ".join(words[:max_words])
    rest = " ".join(words[max_words : max_words * 2])
    return f"{cut}\n{rest}" if rest else cut


def local_fallback_explanations(chains: list[Chain]) -> list[dict[str, Any]]:
    items: list[dict[str, Any]] = []
    focus_words = [
        "ядро фразы", "уточнение времени", "причина", "место действия", "тон действия",
        "последняя деталь", "русский порядок", "английский порядок", "обстоятельство", "смысловой хвост",
    ]
    for c in chains:
        s1, s2, s3, s4 = c.foreign_steps
        r1, r2, r3, r4 = c.russian_steps
        add2 = prefix_addition(s1, s2)
        add3 = prefix_addition(s2, s3)
        add4 = prefix_addition(s3, s4)
        lead = LEADS[c.index - 1]
        voice = NARRATIVE_TEMPLATES[c.index - 1].format(
            lead=lead,
            s1=s1,
            s2=s2,
            s3=s3,
            s4=s4,
            r1=r1.lower(),
            r2=r2.lower(),
            r3=r3.lower(),
            r4=r4.lower(),
            a2=add2,
            a3=add3,
            a4=add4,
        )
        blocks = [
            {"text": short_block("ОСНОВА: " + s1, 4), "anchor_words": s1},
            {"text": short_block(add2.upper(), 5), "anchor_words": add2},
            {"text": short_block(add3.upper(), 5), "anchor_words": add3},
            {"text": short_block(add4.upper(), 5), "anchor_words": add4},
            {"text": "ФРАЗА СОБРАНА\nПОЛНЫЙ ВАРИАНТ", "anchor_words": s4},
        ]
        items.append(
            {
                "chain_index": c.index,
                "voiceover": voice,
                "screen_blocks": blocks,
                "grammar_focus": [focus_words[(c.index + i) % len(focus_words)] for i in range(3)],
                "banned_similarity_note": f"Уникальная рамка #{c.index}: {lead}",
            }
        )
    return items


def ffprobe_duration(path: Path) -> float:
    completed = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", str(path)],
        check=True,
        stdout=subprocess.PIPE,
        text=True,
    )
    return float(completed.stdout.strip())


def openai_tts(api_key: str, text: str, path: Path) -> None:
    if path.exists() and path.stat().st_size > 2048:
        return
    response = requests.post(
        "https://api.openai.com/v1/audio/speech",
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
        json={
            "model": TTS_MODEL,
            "voice": TTS_VOICE,
            "input": text,
            "instructions": (
                "Говори по-русски естественно, как спокойный преподаватель. "
                "Не ускоряйся. Четкая артикуляция, живой тон, без дикторского пафоса. "
                "После последнего слова остановись чисто."
            ),
            "response_format": "wav",
        },
        timeout=240,
    )
    if response.status_code >= 400:
        raise RuntimeError(f"OpenAI TTS failed {response.status_code}: {response.text[:1000]}")
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(response.content)


def elevenlabs_with_timestamps(api_key: str, voice_id: str, text: str, audio_path: Path, alignment_path: Path) -> dict[str, Any]:
    if audio_path.exists() and audio_path.stat().st_size > 2048 and alignment_path.exists():
        return read_json(alignment_path)
    response = requests.post(
        f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}/with-timestamps",
        headers={"xi-api-key": api_key, "Content-Type": "application/json"},
        json={
            "text": text,
            "model_id": ELEVEN_MODEL,
            "output_format": "mp3_44100_128",
            "voice_settings": {
                "stability": 0.62,
                "similarity_boost": 0.78,
                "style": 0.18,
                "use_speaker_boost": True,
            },
        },
        timeout=240,
    )
    if response.status_code >= 400:
        raise RuntimeError(f"ElevenLabs timestamps failed {response.status_code}: {response.text[:1000]}")
    data = response.json()
    audio_path.parent.mkdir(parents=True, exist_ok=True)
    alignment_path.parent.mkdir(parents=True, exist_ok=True)
    audio_path.write_bytes(base64.b64decode(data["audio_base64"]))
    write_json(alignment_path, data)
    return data


def transcribe_words(api_key: str, audio_path: Path, out_path: Path) -> dict[str, Any]:
    if out_path.exists():
        data = read_json(out_path)
        if data.get("words"):
            return data
    with audio_path.open("rb") as handle:
        response = requests.post(
            "https://api.openai.com/v1/audio/transcriptions",
            headers={"Authorization": f"Bearer {api_key}"},
            files={"file": (audio_path.name, handle, "audio/wav")},
            data={
                "model": TRANSCRIBE_MODEL,
                "response_format": "verbose_json",
                "timestamp_granularities[]": "word",
                "language": "ru",
            },
            timeout=240,
        )
    if response.status_code >= 400:
        raise RuntimeError(f"OpenAI transcription failed {response.status_code}: {response.text[:1000]}")
    data = response.json()
    write_json(out_path, data)
    return data


def norm_token(text: str) -> str:
    return re.sub(r"[^a-zа-яё0-9]+", "", text.lower())


def words_from(text: str) -> list[str]:
    return [norm_token(x) for x in re.findall(r"[A-Za-zА-Яа-яЁё0-9]+", text) if norm_token(x)]


def find_anchor(words: list[dict[str, Any]], anchor: str, fallback_start: float, fallback_end: float) -> tuple[float, float]:
    anchor_tokens = words_from(anchor)
    transcript_tokens = [norm_token(str(w.get("word", ""))) for w in words]
    if anchor_tokens:
        for i in range(0, len(transcript_tokens) - len(anchor_tokens) + 1):
            if transcript_tokens[i : i + len(anchor_tokens)] == anchor_tokens:
                start = float(words[i].get("start", fallback_start))
                end = float(words[i + len(anchor_tokens) - 1].get("end", fallback_end))
                return start, max(end, start + 0.7)
    return fallback_start, fallback_end


def build_timed_blocks(api_key: str, items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    timed: list[dict[str, Any]] = []
    for item in items:
        idx = int(item["chain_index"])
        audio_path = OUT_DIR / "audio" / f"{idx:02d}_explanation.wav"
        transcript_path = OUT_DIR / "transcripts" / f"{idx:02d}_words.json"
        openai_tts(api_key, str(item["voiceover"]), audio_path)
        duration = ffprobe_duration(audio_path)
        transcript = transcribe_words(api_key, audio_path, transcript_path)
        words = transcript.get("words") or []
        blocks = item["screen_blocks"]
        timed_blocks = []
        for bi, block in enumerate(blocks):
            fallback_start = (duration * bi / max(1, len(blocks))) + 0.15
            fallback_end = (duration * (bi + 1) / max(1, len(blocks))) - 0.10
            start, end = find_anchor(words, str(block.get("anchor_words", "")), fallback_start, fallback_end)
            timed_blocks.append(
                {
                    "text": block["text"],
                    "anchor_words": block["anchor_words"],
                    "start_sec": round(max(0.0, start - 0.05), 3),
                    "end_sec": round(min(duration, end + 0.55), 3),
                }
            )
        timed.append(
            {
                **item,
                "audio_path": str(audio_path),
                "duration_sec": round(duration, 3),
                "timed_blocks": timed_blocks,
            }
        )
        print(f"[unique-explain-audio] {idx:02d} {duration:.2f}s blocks={len(timed_blocks)}", flush=True)
        write_json(OUT_DIR / "timed_explanations.json", timed)
    return timed


def char_time_for_index(alignment: dict[str, Any], index: int, fallback: float) -> float:
    starts = alignment.get("character_start_times_seconds") or []
    chars = alignment.get("characters") or []
    if not starts or not chars:
        return fallback
    safe = max(0, min(index, len(starts) - 1))
    return float(starts[safe])


def char_end_for_index(alignment: dict[str, Any], index: int, fallback: float) -> float:
    ends = alignment.get("character_end_times_seconds") or []
    chars = alignment.get("characters") or []
    if not ends or not chars:
        return fallback
    safe = max(0, min(index, len(ends) - 1))
    return float(ends[safe])


def find_anchor_chars(voiceover: str, anchor: str) -> tuple[int, int] | None:
    hay = voiceover.lower()
    needle = anchor.lower().strip()
    pos = hay.find(needle)
    if pos >= 0:
        return pos, pos + len(needle)
    # Fuzzy fallback: try first 2-4 normalized words from the anchor.
    tokens = words_from(anchor)
    for n in range(min(4, len(tokens)), 1, -1):
        pattern = r"\b" + r"\W+".join(re.escape(t) for t in tokens[:n]) + r"\b"
        match = re.search(pattern, hay)
        if match:
            return match.start(), match.end()
    return None


def build_timed_blocks_eleven(api_key: str, voice_id: str, items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    timed: list[dict[str, Any]] = []
    for item in items:
        idx = int(item["chain_index"])
        audio_path = OUT_DIR / "audio_eleven" / f"{idx:02d}_explanation.mp3"
        alignment_path = OUT_DIR / "alignments_eleven" / f"{idx:02d}_alignment.json"
        data = elevenlabs_with_timestamps(api_key, voice_id, str(item["voiceover"]), audio_path, alignment_path)
        duration = ffprobe_duration(audio_path)
        alignment = data.get("normalized_alignment") or data.get("alignment") or {}
        blocks = item["screen_blocks"]
        timed_blocks = []
        for bi, block in enumerate(blocks):
            fallback_start = (duration * bi / max(1, len(blocks))) + 0.15
            fallback_end = (duration * (bi + 1) / max(1, len(blocks))) - 0.10
            found = find_anchor_chars(str(item["voiceover"]), str(block.get("anchor_words", "")))
            if found:
                start = char_time_for_index(alignment, found[0], fallback_start)
                end = char_end_for_index(alignment, max(found[1] - 1, found[0]), fallback_end)
            else:
                start, end = fallback_start, fallback_end
            timed_blocks.append(
                {
                    "text": block["text"],
                    "anchor_words": block["anchor_words"],
                    "start_sec": round(max(0.0, start - 0.08), 3),
                    "end_sec": round(min(duration, max(end + 0.65, start + 1.25)), 3),
                    "alignment_source": "elevenlabs_char" if found else "fallback_even",
                }
            )
        timed.append(
            {
                **item,
                "audio_path": str(audio_path),
                "duration_sec": round(duration, 3),
                "timed_blocks": timed_blocks,
                "tts_provider": "elevenlabs_with_timestamps",
            }
        )
        print(f"[unique-explain-11labs] {idx:02d} {duration:.2f}s blocks={len(timed_blocks)}", flush=True)
        write_json(OUT_DIR / "timed_explanations.json", timed)
    return timed


def main() -> None:
    env = load_env_file(Path.cwd())
    api_key = os.environ.get("OPENAI_API_KEY") or env.get("OPENAI_API_KEY")
    eleven_key = os.environ.get("ELEVENLABS_API_KEY") or env.get("ELEVENLABS_API_KEY")
    eleven_voice = os.environ.get("ELEVENLABS_VOICE_ID") or env.get("ELEVENLABS_VOICE_ID")
    if not api_key and not eleven_key:
        raise RuntimeError("OPENAI_API_KEY or ELEVENLABS_API_KEY is required")
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    chains = extract_chains()
    write_json(OUT_DIR / "chains_source.json", [c.__dict__ for c in chains])
    if api_key:
        items = generate_explanations(api_key, chains)
    else:
        items = local_fallback_explanations(chains)
        write_json(OUT_DIR / "explanations_unique.json", items)
    errors = validate_explanations(items)
    write_json(OUT_DIR / "explanation_validation.json", {"errors": errors, "count": len(items)})
    if errors:
        raise RuntimeError("validation failed: " + "; ".join(errors[:20]))
    if eleven_key and eleven_voice:
        timed = build_timed_blocks_eleven(eleven_key, eleven_voice, items)
    elif api_key:
        timed = build_timed_blocks(api_key, items)
    else:
        raise RuntimeError("No TTS provider available after explanation generation")
    write_json(OUT_DIR / "timed_explanations.json", timed)
    print(json.dumps({"count": len(timed), "out": str(OUT_DIR)}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
