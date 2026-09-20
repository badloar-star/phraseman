"""Шаг 2: транскрипт -> моменты для разбора (фраза + объяснение + оценка).

зачем: владелец выбрал «модель сама решает, что интересно, без моей проверки».
Чтобы это не превращалось в мусор и в оплаченную впустую озвучку, у каждого
момента есть оценка 0-10 и порог min_score: слабое отсекается ДО платного шага.

Скрипт НЕ ходит в сеть сам. Он готовит запрос и читает ответ — вызов модели
делает раннер (run.py), потому что ключ и способ вызова живут там.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

TAG = "[CLIPPER][select]"

# зачем: просим строгий JSON и явную оценку, иначе отсечь слабое невозможно.
PROMPT = """Ты — редактор обучающего канала об английском для русскоязычных (25–55, «понимаю, но не говорю»).

Ниже транскрипт видео с таймкодами. Найди {n} момента, где звучит РАЗГОВОРНАЯ английская фраза,
которую русскоязычный НЕ поймёт по словарю: идиома, фразовый глагол, устойчивое выражение.

Требования к выбору:
- фраза должна звучать ЦЕЛИКОМ внутри транскрипта, дословно;
- дословный перевод должен сбивать с толку — в этом вся суть ролика;
- НЕ бери: простые слова, очевидное (hello, thank you), грубость, политику;
- моменты должны быть из РАЗНЫХ мест видео, не подряд.

Для каждого момента верни объект:
- "phrase": фраза точно как в транскрипте (для поиска таймкода — дословно!)
- "literal": дословный (неправильный) перевод на русский — то, что человек подумает
- "meaning": что она значит на самом деле, одним предложением
- "voiceover": текст для озвучки, 2 коротких предложения, живая устная речь по-русски.
  Схема: назвать фразу → сказать, что дословно это чушь → дать настоящий смысл.
  БЕЗ грамматических терминов. БЕЗ пафоса. Как будто объясняешь другу.
  ЖЁСТКО не длиннее {max_chars} знаков. Это не рекомендация: пауза в ролике длится
  ровно столько, сколько звучит озвучка, а длинная пауза убивает удержание на TikTok.
  Лучше недосказать, чем растянуть.
- "score": честная оценка 0–10, насколько это интересно русскоязычному зрителю.
  8–10 — фраза частая и неочевидная. 5–7 — средне. 0–4 — скучно или очевидно.
  НЕ завышай: слабые оценки экономят деньги на озвучке.

Ответь ТОЛЬКО JSON-массивом, без markdown-обёртки и без пояснений.

ТРАНСКРИПТ:
{transcript}
"""


def build_prompt(transcript: dict, n: int, voice_max: int = 150,
                 max_chars: int = 14000) -> str:
    """Собирает текст запроса. Длинный транскрипт режем — окно не бесконечное.

    voice_max — потолок длины разбора. Передаётся в промпт, потому что пауза в
    ролике длится ровно столько, сколько звучит озвучка: длинный текст = длинный
    стоп-кадр = провал удержания. Замер 20.09.2026: 193 знака дали 16 секунд.
    """
    lines = []
    for seg in transcript["segments"]:
        lines.append(f"[{seg['start']:.1f}] {seg['text']}")
    body = "\n".join(lines)
    if len(body) > max_chars:
        print(f"{TAG} транскрипт {len(body)} знаков > лимита {max_chars} — беру начало")
        body = body[:max_chars]
    return PROMPT.format(n=n, max_chars=voice_max, transcript=body)


def find_timing(phrase: str, words: list[dict]) -> tuple[float, float] | None:
    """Ищет фразу в потоке слов и возвращает (начало, КОНЕЦ последнего слова).

    зачем: конец последнего слова — это и есть кадр, на котором ставим паузу.
    Ошибка здесь = пауза посреди слова, ролик испорчен.
    """
    def norm(s: str) -> str:
        return "".join(ch for ch in s.lower() if ch.isalnum() or ch == " ").strip()

    target = norm(phrase).split()
    if not target:
        print(f"{TAG} фраза пустая после нормализации: {phrase!r}")
        return None

    flat = [norm(w["word"]) for w in words]
    for i in range(len(flat) - len(target) + 1):
        if flat[i:i + len(target)] == target:
            start, end = words[i]["start"], words[i + len(target) - 1]["end"]
            print(f"{TAG} найдено '{phrase}' -> {start:.2f}..{end:.2f}с (слово #{i})")
            return start, end

    # зачем: частый случай — модель слегка перефразировала. Пробуем по первым словам.
    if len(target) > 2:
        head = target[:max(2, len(target) // 2)]
        for i in range(len(flat) - len(head) + 1):
            if flat[i:i + len(head)] == head:
                start = words[i]["start"]
                j = min(i + len(target) - 1, len(words) - 1)
                print(f"{TAG} точного совпадения нет, взял по началу '{' '.join(head)}' "
                      f"-> {start:.2f}..{words[j]['end']:.2f}с")
                return start, words[j]["end"]

    print(f"{TAG} НЕ НАЙДЕНО в транскрипте: {phrase!r} — момент выкидываю")
    return None


def main() -> int:
    if len(sys.argv) < 3:
        print(f"{TAG} использование: select_moments.py <work> <prompt|parse> [n]")
        return 2
    workdir, mode = Path(sys.argv[1]), sys.argv[2]
    n = int(sys.argv[3]) if len(sys.argv) > 3 else 2

    tpath = workdir / "transcript.json"
    if not tpath.exists():
        print(f"{TAG} РАННИЙ ВЫХОД: нет {tpath} — сначала transcribe.py")
        return 1
    transcript = json.loads(tpath.read_text(encoding="utf-8"))
    print(f"{TAG} ВХОД: слов={len(transcript['words'])} сегментов={len(transcript['segments'])} n={n}")

    if mode == "prompt":
        cfg_path = Path(__file__).parent / "config" / "config.json"
        voice_max = json.loads(cfg_path.read_text(encoding="utf-8")).get(
            "max_voiceover_chars", 150)
        (workdir / "prompt.txt").write_text(
            build_prompt(transcript, n, voice_max), encoding="utf-8")
        print(f"{TAG} РЕЗУЛЬТАТ: prompt.txt готов (потолок разбора {voice_max} знаков)")
        return 0

    if mode == "parse":
        raw_path = workdir / "answer.json"
        if not raw_path.exists():
            print(f"{TAG} РАННИЙ ВЫХОД: нет {raw_path} (ответ модели)")
            return 1
        raw = raw_path.read_text(encoding="utf-8").strip()
        if raw.startswith("```"):  # снимаем markdown-обёртку, если модель её добавила
            raw = raw.split("```")[1]
            raw = raw[4:] if raw.lower().startswith("json") else raw
        try:
            items = json.loads(raw)
        except json.JSONDecodeError as exc:
            print(f"{TAG} РАННИЙ ВЫХОД: ответ не JSON: {exc}")
            return 1

        out = []
        for it in items:
            timing = find_timing(it.get("phrase", ""), transcript["words"])
            if timing is None:
                continue  # причина уже напечатана внутри find_timing
            it["start"], it["phrase_end"] = timing
            out.append(it)

        (workdir / "moments.json").write_text(
            json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
        print(f"{TAG} РЕЗУЛЬТАТ: моментов с таймкодами {len(out)} из {len(items)}")
        return 0 if out else 1

    print(f"{TAG} неизвестный режим: {mode}")
    return 2


if __name__ == "__main__":
    sys.exit(main())
