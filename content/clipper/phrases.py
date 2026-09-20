"""Шаг 2-seq: транскрипт -> ПОДРЯД идущие фразы для пофразового перевода.

зачем отдельно от select_moments.py: там конвейер ОТБИРАЛ 3-5 «интересных»
моментов и пропускал остальное. Владелец 20.09.2026: «текст надо просто
перевести и причём весь, и давать так, чтобы сказал фразу и мы её перевели,
потом след фраза и так далее — и каждую, а не ждать». Здесь отбора нет вовсе.

Резать надо по естественным границам речи, иначе перевод будет обрывком.
Сегменты whisper для этого не годятся напрямую: они то склеивают три реплики
в одну строку, то рвут фразу пополам. Поэтому режем сами — по знакам конца
предложения и по паузам между словами.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

TAG = "[CLIPPER][phrases]"

# зачем именно такие пороги: пауза в речи длиннее 0.45с почти всегда означает
# конец мысли; фраза короче 0.8с не несёт смысла и даёт дёрганый ролик;
# длиннее 7с — зритель забудет начало, пока дойдёт до перевода.
# зачем MAX_LEN=4.0, а не 7: на замере 20.09.2026 при 7с в одну «фразу»
# слипались две мысли («I looked dorky... So I came up with this idea...»).
# Перевести такое одной строкой нельзя — получается каша.
# зачем короче: длинная фраза = длинная озвучка = длинная пауза. На замере
# 20.09.2026 фразы по 73 знака требовали 8.7с паузы, и в минутный ролик
# влезало 6 фраз вместо 10. Ритм «короткая реплика → быстрый перевод» держит
# внимание лучше, чем редкие длинные остановки.
PAUSE_SPLIT = 0.30
MIN_LEN = 0.7
MAX_LEN = 2.6
MAX_CHARS = 52          # жёсткий потолок длины фразы в знаках
MIN_WORDS = 2
SENTENCE_END = (".", "!", "?", ",")

# зачем резать по союзам: разрез строго по времени рвал мысль посреди
# («...a style that he» | «never let go of it»). Английская фраза естественно
# делится ПЕРЕД союзом, поэтому при переборе лимита ищем ближайший союз и
# режем там, а не по секундомеру. Замер 20.09.2026.
JOIN_WORDS = {"and", "but", "so", "because", "that", "which", "when",
              "where", "if", "or", "then", "though", "while", "after",
              "before", "since"}


def clean(text: str) -> str:
    """Чинит артефакты whisper: 'award -winning' -> 'award-winning'."""
    out = text.replace(" -", "-").replace("- ", "-")
    out = out.replace("  ", " ")
    return out.strip()


def split_into_phrases(words: list[dict]) -> list[dict]:
    """Режет поток слов на фразы по знакам препинания и паузам."""
    if not words:
        print(f"{TAG} РАННИЙ ВЫХОД: слов ноль, резать нечего")
        return []

    phrases: list[dict] = []
    buf: list[dict] = []

    def flush(reason: str) -> None:
        if not buf:
            return
        text = clean(" ".join(w["word"] for w in buf))
        start, end = buf[0]["start"], buf[-1]["end"]
        if len(buf) < MIN_WORDS or (end - start) < MIN_LEN:
            # зачем не молча: без этого лога непонятно, куда делись куски речи
            print(f"{TAG}   пропуск «{text[:40]}» — {len(buf)} слов, "
                  f"{end - start:.2f}с (причина среза: {reason})")
            buf.clear()
            return
        phrases.append({"text": text, "start": start, "end": end,
                        "cut": reason})
        buf.clear()

    for i, w in enumerate(words):
        buf.append(w)
        word = w["word"]
        nxt = words[i + 1] if i + 1 < len(words) else None
        gap = (nxt["start"] - w["end"]) if nxt else 99.0
        span = w["end"] - buf[0]["start"]

        chars = sum(len(b["word"]) + 1 for b in buf)

        if word.endswith(SENTENCE_END):
            flush("конец предложения")
        elif gap >= PAUSE_SPLIT:
            flush(f"пауза {gap:.2f}с")
        elif chars >= MAX_CHARS:
            # зачем по знакам, а не только по времени: озвучка и чтение зависят
            # от ДЛИНЫ ТЕКСТА, а не от того, быстро ли человек говорит
            flush(f"длина {chars} знаков")
        elif span >= MAX_LEN:
            # зачем не рубить сразу: разрез по секундомеру рвёт мысль посреди.
            # Если следующее слово — союз, он начнёт НОВУЮ фразу, и разрез
            # ляжет на естественную границу.
            nxt_word = nxt["word"].lower().strip(".,!?") if nxt else ""
            if nxt_word in JOIN_WORDS:
                flush(f"союз «{nxt_word}» после {span:.1f}с")
            elif span >= MAX_LEN * 1.6:
                flush(f"предел длины {span:.1f}с")
    flush("конец записи")

    if phrases:
        lens = [p["end"] - p["start"] for p in phrases]
        print(f"{TAG} нарезано фраз: {len(phrases)} · "
              f"длина от {min(lens):.1f}с до {max(lens):.1f}с, "
              f"средняя {sum(lens) / len(lens):.1f}с")
    else:
        print(f"{TAG} ВНИМАНИЕ: не получилось ни одной фразы")
    return phrases


def main() -> int:
    if len(sys.argv) < 3:
        print(f"{TAG} использование: phrases.py <work> <начало_с> [конец_с]")
        return 2
    workdir = Path(sys.argv[1])
    start = float(sys.argv[2])
    end = float(sys.argv[3]) if len(sys.argv) > 3 else start + 60.0

    tpath = workdir / "transcript.json"
    if not tpath.exists():
        print(f"{TAG} РАННИЙ ВЫХОД: нет {tpath} — сначала transcribe.py")
        return 1
    transcript = json.loads(tpath.read_text(encoding="utf-8"))
    all_words = transcript.get("words", [])
    print(f"{TAG} ВХОД: слов всего={len(all_words)} · отрезок {start:.1f}..{end:.1f}с")

    words = [w for w in all_words if w["start"] >= start and w["end"] <= end]
    if not words:
        print(f"{TAG} РАННИЙ ВЫХОД: в отрезке {start}..{end} нет слов — "
              f"проверь границы (видео идёт {transcript.get('duration', 0):.0f}с)")
        return 1
    print(f"{TAG} слов в отрезке: {len(words)}")

    phrases = split_into_phrases(words)
    if not phrases:
        return 1

    out = workdir / "phrases.json"
    out.write_text(json.dumps(phrases, ensure_ascii=False, indent=1),
                   encoding="utf-8")
    print(f"{TAG} РЕЗУЛЬТАТ: {out}")
    for i, p in enumerate(phrases, 1):
        print(f"{TAG}   {i:>2}. [{p['start']:6.2f}..{p['end']:6.2f}] {p['text']}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
