#!/usr/bin/env python3
"""Build the standalone Phraseman Arena sound-map HTML and validate its PDF."""

from __future__ import annotations

import argparse
import html
import re
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Mapping


ROOT = Path(__file__).resolve().parents[1]
CATALOG_PATH = ROOT / "modules" / "arena" / "sound_catalog.ts"
PROMPTS_PATH = ROOT / "docs" / "arena" / "SOUND_PROMPTS.md"
HTML_PATH = ROOT / "output" / "pdf" / "zvukovaya_karta_arena_phraseman.html"


@dataclass(frozen=True)
class SoundSpec:
    key: str
    file: str
    duration_ms: int
    volume: float
    cooldown_ms: int
    priority: int
    section: str
    moment: str
    trigger: str
    integration: str
    prompts: Mapping[str, str]

    @property
    def stem(self) -> str:
        return Path(self.file).stem


SECTION_FILES: tuple[tuple[str, tuple[str, ...]], ...] = (
    ("1. Поиск матча", (
        "ar_search_start.mp3", "ar_search_loop.mp3", "ar_opponent_found.mp3",
    )),
    ("2. Столкновение и старт", (
        "ar_versus_impact.mp3", "ar_countdown_tick.mp3", "ar_countdown_go.mp3",
    )),
    ("3. Задание и ответ", (
        "ar_task_in.mp3", "ar_option_tap.mp3", "ar_answer_correct.mp3",
        "ar_answer_first.mp3", "ar_answer_wrong.mp3", "ar_opponent_answered.mp3",
        "ar_timer_tick.mp3", "ar_timeout.mp3",
    )),
    ("4. Комбо", (
        "ar_combo_start.mp3", "ar_combo_up.mp3", "ar_combo_break.mp3",
    )),
    ("5. Задание с парами", (
        "ar_pair_match.mp3", "ar_pair_miss.mp3", "ar_pair_clear.mp3",
    )),
    ("6. Итоги матча", (
        "ar_result_win.mp3", "ar_result_loss.mp3", "ar_result_draw.mp3",
    )),
    ("7. Звёзды и прогресс", (
        "ar_star_fly.mp3", "ar_star_land.mp3", "ar_goal_complete.mp3",
        "ar_reward_unlock.mp3",
    )),
    ("8. Ранг", ("ar_rank_up.mp3", "ar_rank_down.mp3")),
    ("9. Приглашения и реакции", (
        "ar_invite_sent.mp3", "ar_invite_received.mp3",
        "ar_invite_accepted.mp3", "ar_reaction_send.mp3",
    )),
    ("10. Магазин Арены", ("ar_store_purchase.mp3", "ar_store_equip.mp3")),
)


TRIGGERS: Mapping[str, str] = {
    "ar_search_start.mp3": "app/arena_matchmaking.tsx - экран поиска открыт",
    "ar_search_loop.mp3": "app/arena_matchmaking.tsx - только пока экран видим и поиск активен",
    "ar_opponent_found.mp3": "app/arena_matchmaking.tsx - сервер подтвердил matchId",
    "ar_versus_impact.mp3": "components/arena/ArenaVersusIntro.tsx - пик плашки VS после схода аватаров",
    "ar_countdown_tick.mp3": "components/arena/ArenaVersusIntro.tsx - цифры 3, 2 и 1",
    "ar_countdown_go.mp3": "components/arena/ArenaVersusIntro.tsx - появляется GO",
    "ar_task_in.mp3": "app/arena_match.tsx - новая задача вошла в фазу reading",
    "ar_option_tap.mp3": "components/arena/ArenaQuestion.tsx - выбран вариант",
    "ar_answer_correct.mp3": "app/arena_match.tsx - локальный вердикт correct",
    "ar_answer_first.mp3": "app/arena_match.tsx - firstBonus больше нуля",
    "ar_answer_wrong.mp3": "app/arena_match.tsx - локальный вердикт wrong",
    "ar_opponent_answered.mp3": "app/arena_match.tsx - соперник закончил текущую задачу",
    "ar_timer_tick.mp3": "components/arena/ArenaTimerRing.tsx - последние три секунды",
    "ar_timeout.mp3": "app/arena_match.tsx - ответ завершён по таймауту",
    "ar_combo_start.mp3": "app/arena_match.tsx - началась серия верных ответов",
    "ar_combo_up.mp3": "app/arena_match.tsx - серия продолжилась",
    "ar_combo_break.mp3": "app/arena_match.tsx - серия сброшена",
    "ar_pair_match.mp3": "app/arena_match.tsx - верная пара",
    "ar_pair_miss.mp3": "app/arena_match.tsx - неверная пара",
    "ar_pair_clear.mp3": "app/arena_match.tsx - доска пар полностью очищена",
    "ar_result_win.mp3": "app/arena_results.tsx - победа показана один раз",
    "ar_result_loss.mp3": "app/arena_results.tsx - поражение показано один раз",
    "ar_result_draw.mp3": "app/arena_results.tsx - ничья показана один раз",
    "ar_star_fly.mp3": "app/arena_match.tsx - начисленные звёзды начинают полёт",
    "ar_star_land.mp3": "app/arena_results.tsx - звезда ударяет в итоговый счётчик",
    "ar_goal_complete.mp3": "components/arena/ArenaDailyGoals.tsx - закрылась цель дня",
    "ar_reward_unlock.mp3": "app/arena_results.tsx - открыта награда тира или сезона",
    "ar_rank_up.mp3": "components/arena/ArenaRankHybrid.tsx - удар повышения",
    "ar_rank_down.mp3": "components/arena/ArenaRankHybrid.tsx - показано понижение",
    "ar_invite_sent.mp3": "app/arena_friend_duel.tsx - вызов успешно создан",
    "ar_invite_received.mp3": "app/arena_invite.tsx - модалка нового вызова стала видимой",
    "ar_invite_accepted.mp3": "app/arena_invite.tsx - вызов принят обеими сторонами",
    "ar_reaction_send.mp3": "app/arena_results.tsx - выбрана локальная реакция",
    "ar_store_purchase.mp3": "app/arena_star_wallet.tsx - покупка получила подтверждение",
    "ar_store_equip.mp3": "app/arena_star_wallet.tsx - косметика применена",
}


NEW_SOUNDS: tuple[dict[str, object], ...] = (
    {
        "key": "versusImpact", "file": "ar_versus_impact.mp3", "duration_ms": 520,
        "volume": 0.50, "cooldown_ms": 1200, "priority": 76,
        "moment": "Аватары сходятся с двух сторон, плашка VS достигает пика и пружинит назад.",
        "prompts": {
            "A": "ar_versus_impact - precise premium interface impact synchronized to two rival avatars meeting and a VS badge locking into place. One tight low digital thump, a crisp centered click and a very short bright edge, total length exactly 520 milliseconds, mono, dry, no speech, no long reverb.",
            "B": "ar_versus_impact - energetic arcade clash for two quiz rivals arriving from opposite sides and the VS emblem landing between them. Compact warm synth-brass hit with a small metallic spark and controlled rebound, total length exactly 520 milliseconds, mono, punchy, no speech, no long tail.",
            "C": "ar_versus_impact - cinematic micro-impact at the exact visual collision of two opponents before a language duel. Tight sub hit, fast air convergence and a clean metal shimmer that stops quickly, total length exactly 520 milliseconds, mono, premium, no speech, no lingering reverb.",
        },
    },
    {
        "key": "inviteSent", "file": "ar_invite_sent.mp3", "duration_ms": 520,
        "volume": 0.34, "cooldown_ms": 900, "priority": 60,
        "moment": "Игрок успешно отправил другу вызов на дуэль.",
        "prompts": {
            "A": "ar_invite_sent - clean interface confirmation for a friend-duel invitation leaving the device successfully. Two light tones moving outward and a soft final lock, total length exactly 520 milliseconds, mono, dry, friendly, no speech, no long reverb.",
            "B": "ar_invite_sent - warm arcade send cue for launching a challenge to a friend in a mobile quiz arena. Quick plucked synth pair with a tiny upward sparkle, total length exactly 520 milliseconds, mono, playful but restrained, no speech, no long tail.",
            "C": "ar_invite_sent - refined cinematic dispatch cue for a duel invitation travelling to another player. Short airy push into a distant bright point, total length exactly 520 milliseconds, mono, elegant, no speech, no lingering reverb.",
        },
    },
    {
        "key": "inviteReceived", "file": "ar_invite_received.mp3", "duration_ms": 700,
        "volume": 0.42, "cooldown_ms": 1500, "priority": 72,
        "moment": "На экране появился новый входящий вызов от друга.",
        "prompts": {
            "A": "ar_invite_received - noticeable but calm interface alert for a new friend-duel challenge appearing on screen. Three compact tones with a firm center note and a clean ending, total length exactly 700 milliseconds, mono, dry, inviting, no speech, no alarm character.",
            "B": "ar_invite_received - friendly arcade challenge notification for a mobile language arena. Bright bell pair answered by a warm short synth hit, total length exactly 700 milliseconds, mono, exciting without urgency, no speech, no long tail.",
            "C": "ar_invite_received - cinematic invitation reveal for a rival challenge arriving in a premium duel app. Soft low pulse, focused metallic glint and a restrained air bloom, total length exactly 700 milliseconds, mono, composed, no speech, no lingering reverb.",
        },
    },
    {
        "key": "inviteAccepted", "file": "ar_invite_accepted.mp3", "duration_ms": 720,
        "volume": 0.48, "cooldown_ms": 1500, "priority": 76,
        "moment": "Вызов принят, оба игрока готовы и начинается переход к матчу.",
        "prompts": {
            "A": "ar_invite_accepted - confident interface resolution when both friends accept a duel and the match becomes ready. Two mirrored tones converge into one bright stable note, total length exactly 720 milliseconds, mono, dry, decisive, no speech, no long reverb.",
            "B": "ar_invite_accepted - warm arcade ready cue for a friend challenge accepted by both players. Short rising synth figure with a compact bell landing, total length exactly 720 milliseconds, mono, celebratory but below a victory fanfare, no speech, no long tail.",
            "C": "ar_invite_accepted - cinematic agreement cue as two rivals commit to a friendly duel. Opposing airy sweeps meet in a controlled low impact with a clean high resolve, total length exactly 720 milliseconds, mono, premium, no speech, no lingering reverb.",
        },
    },
    {
        "key": "reactionSend", "file": "ar_reaction_send.mp3", "duration_ms": 180,
        "volume": 0.22, "cooldown_ms": 240, "priority": 42,
        "moment": "После матча игрок отправил короткую локальную реакцию.",
        "prompts": {
            "A": "ar_reaction_send - tiny interface send cue for a lightweight post-match reaction. One rounded click with a faint outward flick, total length exactly 180 milliseconds, mono, dry, neutral, no speech, no reverb tail.",
            "B": "ar_reaction_send - playful micro-pop for sending a friendly arena reaction after a duel. Soft warm bubble tap with a tiny sparkle, total length exactly 180 milliseconds, mono, repeatable, no speech, no long tail.",
            "C": "ar_reaction_send - refined cinematic micro-contact for releasing a post-match reaction. Muted felt tick with a whisper of air, total length exactly 180 milliseconds, mono, subtle, no speech, no lingering reverb.",
        },
    },
    {
        "key": "storePurchase", "file": "ar_store_purchase.mp3", "duration_ms": 900,
        "volume": 0.50, "cooldown_ms": 1500, "priority": 82,
        "moment": "Покупка косметики за звёзды подтверждена, предмет стал собственностью игрока.",
        "prompts": {
            "A": "ar_store_purchase - premium interface confirmation for an Arena cosmetic purchase completed with earned stars. Crisp value-transfer ticks resolve into a warm two-note ownership chord, total length exactly 900 milliseconds, mono, dry, trustworthy, no speech, no cash-register cliché.",
            "B": "ar_store_purchase - satisfying arcade acquisition cue for buying a cosmetic item in a mobile duel shop. Compact star-like chime cascade with a warm final lock, total length exactly 900 milliseconds, mono, rewarding, no speech, no long tail.",
            "C": "ar_store_purchase - cinematic ownership confirmation for a premium Arena cosmetic. Controlled low bloom, fine metallic shimmer and a clear resolved bell, total length exactly 900 milliseconds, mono, valuable, no speech, no lingering reverb.",
        },
    },
    {
        "key": "storeEquip", "file": "ar_store_equip.mp3", "duration_ms": 480,
        "volume": 0.34, "cooldown_ms": 700, "priority": 64,
        "moment": "Купленная косметика применена к профилю или экрану результата.",
        "prompts": {
            "A": "ar_store_equip - precise interface lock-in for applying an owned Arena cosmetic. One clean mechanical click followed by a short soft tone settling in place, total length exactly 480 milliseconds, mono, dry, confident, no speech, no long reverb.",
            "B": "ar_store_equip - warm arcade equip cue for activating a duel cosmetic. Muted snap with a bright compact sparkle on top, total length exactly 480 milliseconds, mono, tactile, no speech, no long tail.",
            "C": "ar_store_equip - refined cinematic fit cue as a premium cosmetic settles onto the player identity. Tight magnetic contact and a faint polished shimmer, total length exactly 480 milliseconds, mono, elegant, no speech, no lingering reverb.",
        },
    },
)


def ascii_dashes(value: str) -> str:
    return value.replace("—", "-").replace("–", "-").replace("−", "-")


def parse_catalog() -> list[dict[str, object]]:
    text = CATALOG_PATH.read_text(encoding="utf-8")
    pattern = re.compile(
        r"\{\s*key:\s*'(?P<key>[^']+)',\s*file:\s*'(?P<file>[^']+)',"
        r"\s*eventId:\s*'[^']+',\s*volume:\s*(?P<volume>[0-9.]+),"
        r"\s*durationMs:\s*(?P<duration>[0-9]+),\s*cooldownMs:\s*(?P<cooldown>[0-9]+),"
        r"\s*priority:\s*(?P<priority>[0-9]+)\s*\}",
    )
    rows: list[dict[str, object]] = []
    for match in pattern.finditer(text):
        rows.append({
            "key": match.group("key"),
            "file": match.group("file"),
            "volume": float(match.group("volume")),
            "duration_ms": int(match.group("duration")),
            "cooldown_ms": int(match.group("cooldown")),
            "priority": int(match.group("priority")),
        })
    if len(rows) != 28:
        raise ValueError(f"catalog_count_invalid:{len(rows)}")
    return rows


def parse_prompt_markdown() -> dict[str, dict[str, object]]:
    entries: dict[str, dict[str, object]] = {}
    current: dict[str, object] | None = None
    for raw_line in PROMPTS_PATH.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        sound_match = re.match(r"^### `([^`]+)`", line)
        if sound_match:
            file = sound_match.group(1)
            current = {"file": file, "moment": "", "prompts": {}}
            entries[file] = current
            continue
        if current is None:
            continue
        if line.startswith("Момент:"):
            current["moment"] = ascii_dashes(line.removeprefix("Момент:").strip())
            continue
        prompt_match = re.match(r"^\*\*([ABC])\.\*\*\s+(.+)$", line)
        if prompt_match:
            prompts = current["prompts"]
            assert isinstance(prompts, dict)
            prompts[prompt_match.group(1)] = prompt_match.group(2).strip()
    if len(entries) != 28:
        raise ValueError(f"prompt_entry_count_invalid:{len(entries)}")
    return entries


DURATION_RE = re.compile(r"\b\d+(?:\.\d+)?\s+(?:milliseconds?|seconds?)\b", re.IGNORECASE)


def duration_words(duration_ms: int) -> str:
    if duration_ms < 1000:
        return f"{duration_ms} milliseconds"
    seconds = duration_ms / 1000
    return f"{seconds:g} seconds"


def normalize_prompt(stem: str, prompt: str, duration_ms: int) -> str:
    clean = ascii_dashes(prompt.strip())
    matches = list(DURATION_RE.finditer(clean))
    if matches:
        last = matches[-1]
        clean = clean[: last.start()] + duration_words(duration_ms) + clean[last.end() :]
    if not clean.startswith(stem):
        clean = f"{stem} - {clean}"
    if "no speech" not in clean.lower():
        clean = clean.rstrip(".") + ". Mono, dry, no speech, no long reverb tail."
    return clean


def build_sounds() -> list[SoundSpec]:
    catalog = parse_catalog()
    prompt_entries = parse_prompt_markdown()
    section_by_file = {
        file: section for section, files in SECTION_FILES for file in files
    }
    by_file: dict[str, SoundSpec] = {}
    for row in catalog:
        file = str(row["file"])
        source = prompt_entries.get(file)
        if source is None:
            raise ValueError(f"prompt_missing:{file}")
        raw_prompts = source["prompts"]
        assert isinstance(raw_prompts, dict)
        duration_ms = int(row["duration_ms"])
        prompts = {
            label: normalize_prompt(Path(file).stem, str(raw_prompts[label]), duration_ms)
            for label in ("A", "B", "C")
        }
        by_file[file] = SoundSpec(
            key=str(row["key"]), file=file, duration_ms=duration_ms,
            volume=float(row["volume"]), cooldown_ms=int(row["cooldown_ms"]),
            priority=int(row["priority"]), section=section_by_file[file],
            moment=str(source["moment"]), trigger=TRIGGERS[file],
            integration="trigger_required" if file == "ar_search_loop.mp3" else "wired",
            prompts=prompts,
        )
    for row in NEW_SOUNDS:
        file = str(row["file"])
        prompts = row["prompts"]
        assert isinstance(prompts, dict)
        by_file[file] = SoundSpec(
            key=str(row["key"]), file=file, duration_ms=int(row["duration_ms"]),
            volume=float(row["volume"]), cooldown_ms=int(row["cooldown_ms"]),
            priority=int(row["priority"]), section=section_by_file[file],
            moment=str(row["moment"]), trigger=TRIGGERS[file],
            integration="trigger_required", prompts={key: str(value) for key, value in prompts.items()},
        )
    ordered = [by_file[file] for _, files in SECTION_FILES for file in files]
    validate_sounds(ordered)
    return ordered


def validate_sounds(sounds: list[SoundSpec]) -> None:
    if len(sounds) != 35:
        raise ValueError(f"sound_count_invalid:{len(sounds)}")
    if len({sound.file for sound in sounds}) != 35:
        raise ValueError("sound_file_duplicate")
    if sum(len(sound.prompts) for sound in sounds) != 105:
        raise ValueError("prompt_count_invalid")
    for sound in sounds:
        if set(sound.prompts) != {"A", "B", "C"}:
            raise ValueError(f"prompt_variants_invalid:{sound.file}")
        for label, prompt in sound.prompts.items():
            if not prompt.startswith(sound.stem):
                raise ValueError(f"prompt_prefix_invalid:{sound.file}:{label}")
            if "no speech" not in prompt.lower():
                raise ValueError(f"prompt_speech_guard_missing:{sound.file}:{label}")
    wired = sum(sound.integration == "wired" for sound in sounds)
    trigger_required = sum(sound.integration == "trigger_required" for sound in sounds)
    if (wired, trigger_required) != (27, 8):
        raise ValueError(f"integration_counts_invalid:{wired}:{trigger_required}")


def esc(value: object) -> str:
    return html.escape(ascii_dashes(str(value)), quote=True)


def fmt_duration(duration_ms: int) -> str:
    return f"{duration_ms / 1000:g} с"


def status_html(sound: SoundSpec) -> str:
    if sound.integration == "wired":
        return '<span class="status wired">триггер подключён</span><span class="status waiting">файл ожидается</span>'
    return '<span class="status required">нужно добавить триггер</span><span class="status waiting">файл ожидается</span>'


def prompt_html(label: str, prompt: str) -> str:
    names = {"A": "интерфейсный", "B": "игровой", "C": "кинематографичный"}
    return (
        f'<div class="prompt" data-prompt="{label}">'
        f'<div class="prompt-label"><b>{label}</b><span>{names[label]}</span></div>'
        f'<div class="prompt-copy">{esc(prompt)}</div></div>'
    )


def card_html(sound: SoundSpec, index: int) -> str:
    prompts = "".join(prompt_html(label, sound.prompts[label]) for label in ("A", "B", "C"))
    return f"""
    <article class="sound-card" data-sound-card="{esc(sound.file)}">
      <div class="sound-topline">
        <div><span class="sound-index">{index:02d}</span><code>{esc(sound.file)}</code></div>
        <div class="statuses">{status_html(sound)}</div>
      </div>
      <div class="spec-row">
        <span><b>{fmt_duration(sound.duration_ms)}</b> длина</span>
        <span><b>{sound.volume:.2f}</b> громкость</span>
        <span><b>{sound.cooldown_ms} мс</b> cooldown</span>
        <span><b>{sound.priority}</b> приоритет</span>
      </div>
      <p class="moment"><b>Момент:</b> {esc(sound.moment)}</p>
      <p class="trigger"><b>Точка:</b> <code>{esc(sound.trigger)}</code></p>
      <div class="prompts">{prompts}</div>
    </article>
    """


def summary_row(sound: SoundSpec, index: int) -> str:
    status = "подключён" if sound.integration == "wired" else "нужен триггер"
    return (
        f"<tr><td>{index:02d}</td><td><code>{esc(sound.file)}</code></td>"
        f"<td>{fmt_duration(sound.duration_ms)}</td><td>{sound.volume:.2f}</td>"
        f"<td>{sound.cooldown_ms}</td><td>{sound.priority}</td><td>{status}</td></tr>"
    )


def build_html(sounds: list[SoundSpec]) -> str:
    sections = []
    sound_index = 0
    for section, files in SECTION_FILES:
        cards = []
        for file in files:
            sound_index += 1
            sound = next(item for item in sounds if item.file == file)
            cards.append(card_html(sound, sound_index))
        sections.append(
            f'<section class="sound-section"><div class="section-heading"><h2>{esc(section)}</h2>'
            f'<span>{len(files)} зв.</span></div>{"".join(cards)}</section>'
        )
    summary = "".join(summary_row(sound, index) for index, sound in enumerate(sounds, 1))
    journey = "".join(
        f'<li><span>{esc(section)}</span><b>{len(files)}</b></li>' for section, files in SECTION_FILES
    )
    css = r"""
    @page {
      size: A4;
      margin: 16mm 14mm 17mm;
      @top-center { content: "Звуковая карта Арены"; font: 8pt Arial; color: #68717d; }
      @bottom-left { content: "Phraseman · Arena audio map"; font: 8pt Arial; color: #8a9098; }
      @bottom-right { content: counter(page) " / " counter(pages); font: 8pt Arial; color: #68717d; }
    }
    * { box-sizing: border-box; }
    html { background: #ecebe7; }
    body { margin: 0 auto; color: #171b21; background: #fff; font-family: Arial, Helvetica, sans-serif; font-size: 11.5px; line-height: 1.48; }
    h1, h2, h3, p { margin-top: 0; }
    h1 { margin: 14px 0 20px; font-family: "Arial Black", Arial, sans-serif; font-size: 48px; line-height: .95; letter-spacing: -2.4px; }
    h2 { margin: 0; font-family: "Arial Black", Arial, sans-serif; font-size: 24px; letter-spacing: -.8px; }
    h3 { margin-bottom: 10px; font-size: 16px; }
    code { font-family: Consolas, "Courier New", monospace; }
    .cover { min-height: 245mm; display: flex; flex-direction: column; justify-content: center; page-break-after: always; }
    .eyebrow { color: #7a838e; font-size: 10px; font-weight: 700; letter-spacing: 3px; text-transform: uppercase; }
    .dek { max-width: 590px; color: #58616d; font-size: 15px; line-height: 1.55; }
    .metrics { display: grid; grid-template-columns: repeat(4, 1fr); margin: 30px 0 24px; border: 1px solid #ddd8cd; border-radius: 10px; overflow: hidden; }
    .metric { min-height: 86px; padding: 15px 16px; border-right: 1px solid #ddd8cd; background: #fbfaf7; }
    .metric:last-child { border-right: 0; }
    .metric b { display: block; color: #b8750e; font-family: "Arial Black", Arial, sans-serif; font-size: 28px; line-height: 1; }
    .metric span { display: block; margin-top: 8px; color: #77808b; }
    .callout { padding: 18px 20px; border: 1px solid #ddd8cd; border-radius: 10px; background: #faf9f6; }
    .tech { margin-top: 13px; padding: 10px 13px; border-radius: 7px; background: #f4e2bd; }
    .journey-page { page-break-after: always; }
    .journey { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; padding: 0; list-style: none; }
    .journey li { display: flex; justify-content: space-between; gap: 12px; padding: 11px 13px; border: 1px solid #e1ddd5; border-radius: 8px; background: #faf9f6; }
    .journey b { color: #b8750e; }
    .legend { display: flex; gap: 8px; flex-wrap: wrap; margin: 18px 0; }
    .sound-section { page-break-before: always; }
    .section-heading { display: flex; align-items: baseline; justify-content: space-between; margin: 0 0 16px; padding-bottom: 10px; border-bottom: 3px solid #171b21; }
    .section-heading span { color: #7a838e; }
    .sound-card { margin: 0 0 16px; padding: 14px 15px 15px; border: 1px solid #dedbd4; border-radius: 9px; background: #fff; break-inside: avoid; page-break-inside: avoid; }
    .sound-topline { display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; margin-bottom: 9px; }
    .sound-index { display: inline-block; margin-right: 8px; color: #b8750e; font-weight: 900; }
    .sound-topline code { padding: 5px 7px; border-radius: 5px; background: #eeeae3; font-size: 12px; }
    .statuses { display: flex; justify-content: flex-end; gap: 5px; flex-wrap: wrap; }
    .status { padding: 3px 7px; border-radius: 999px; font-size: 8.5px; font-weight: 800; white-space: nowrap; }
    .wired { color: #155b42; background: #dff2e9; }
    .required { color: #7a3f05; background: #f8dfb9; }
    .waiting { color: #59616d; background: #eceef1; }
    .spec-row { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 9px; color: #69727e; }
    .spec-row span { padding: 3px 7px; border-radius: 5px; background: #f5f4f1; }
    .moment, .trigger { margin-bottom: 7px; color: #505966; }
    .trigger code { font-size: 9.5px; }
    .prompts { margin-top: 11px; }
    .prompt { display: grid; grid-template-columns: 70px 1fr; gap: 9px; margin-top: 8px; break-inside: avoid; }
    .prompt-label { padding-top: 6px; text-align: center; }
    .prompt-label b { display: block; color: #b8750e; font-size: 18px; line-height: 1; }
    .prompt-label span { display: block; margin-top: 4px; color: #8a929d; font-size: 7.5px; }
    .prompt-copy { padding: 9px 11px; border-radius: 7px; color: #3e4650; background: #f4f3f0; font-family: Consolas, "Courier New", monospace; font-size: 9.4px; line-height: 1.43; }
    .summary-section { page-break-before: always; }
    table { width: 100%; border-collapse: collapse; font-size: 8.2px; }
    thead { display: table-header-group; }
    th { padding: 6px 5px; color: #fff; background: #1e232a; text-align: left; }
    td { padding: 4px 5px; border-bottom: 1px solid #dedbd4; vertical-align: top; }
    tr { break-inside: avoid; }
    tbody tr:nth-child(even) { background: #f8f7f4; }
    .final-note { margin-top: 16px; padding: 14px 16px; border-left: 4px solid #b8750e; background: #faf5e8; }
    @media screen {
      body { width: 210mm; padding: 16mm 14mm 17mm; box-shadow: 0 4px 24px rgba(0,0,0,.12); }
      .sound-section, .summary-section { margin-top: 20px; }
    }
    @media print {
      html, body { background: #fff; }
      body { width: auto; }
      .sound-card, .prompt-copy, .metric, .callout, .journey li { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
    """
    document = f"""<!doctype html>
<html lang="ru">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Звуковая карта Арены Phraseman</title><style>{css}</style></head>
<body>
  <section class="cover">
    <div class="eyebrow">Arena audio production map · 25 августа 2026</div>
    <h1>Звуковая карта<br>Арены Phraseman</h1>
    <p class="dek">Полный звуковой путь дуэли: от тихого поиска соперника и точного удара VS до ответа, комбо, результата, награды, приглашения и покупки косметики. Для каждого момента - три готовых промпта Adobe Firefly.</p>
    <div class="metrics">
      <div class="metric"><b>35</b><span>уникальных звуков</span></div>
      <div class="metric"><b>105</b><span>готовых промптов</span></div>
      <div class="metric"><b>27</b><span>триггеров уже в коде</span></div>
      <div class="metric"><b>8</b><span>триггеров нужно добавить</span></div>
    </div>
    <div class="callout"><h3>Как пользоваться</h3>
      <ol><li>Выберите вариант A, B или C для нужного события.</li><li>Вставьте промпт в Adobe Firefly Sounds.</li><li>Сохраните результат под точным именем из карточки.</li><li>Сравните звук с анимацией на устройстве и только затем подключайте файл.</li></ol>
      <div class="tech"><b>Файлы:</b> mono, 48 kHz, MP3, стартовая тишина обрезана, -14 LUFS, пик -1 dBTP. Речь, мелодическая музыка и длинные хвосты запрещены.</div>
    </div>
  </section>
  <section class="journey-page">
    <div class="section-heading"><h2>Карта пользовательского пути</h2><span>10 разделов</span></div>
    <ul class="journey">{journey}</ul>
    <div class="legend"><span class="status wired">триггер подключён</span><span class="status required">нужно добавить триггер</span><span class="status waiting">аудиофайл ожидается</span></div>
    <div class="callout"><h3>Главное разделение</h3><p><code>ar_opponent_found.mp3</code> подтверждает, что матч найден. <code>ar_versus_impact.mp3</code> звучит позже - строго в кадр визуального столкновения аватаров и удара плашки VS. Один звук не подменяет другой.</p></div>
    <div class="final-note"><b>Не дублируем глобальный слой.</b> Назад, стандартные модалки, отсутствие энергии, системная ошибка и универсальный тап используют общие звуки приложения. Арена получает собственный звук только там, где событие несёт соревновательный смысл.</div>
  </section>
  {"".join(sections)}
  <section class="summary-section">
    <div class="section-heading"><h2>Сводная производственная таблица</h2><span>35 файлов</span></div>
    <div class="final-note"><b>Порядок внедрения:</b> поиск и VS - отсчёт - ответ и таймер - комбо и пары - результаты - звёзды и ранг - приглашения - магазин. После каждой группы проверяются громкость на реальном устройстве, отсутствие наложений и режим Reduce Motion.</div>
    <table><thead><tr><th>#</th><th>Файл</th><th>Длина</th><th>Vol</th><th>CD ms</th><th>Pri</th><th>Интеграция</th></tr></thead><tbody>{summary}</tbody></table>
  </section>
</body></html>"""
    return ascii_dashes(document)


def write_html(sounds: list[SoundSpec]) -> None:
    HTML_PATH.parent.mkdir(parents=True, exist_ok=True)
    document = build_html(sounds)
    HTML_PATH.write_text(document, encoding="utf-8", newline="\n")
    validate_html(document, sounds)


def validate_html(document: str, sounds: list[SoundSpec]) -> None:
    lowered = document.lower()
    if "http://" in lowered or "https://" in lowered or "<script" in lowered:
        raise ValueError("html_not_standalone")
    if document.count("data-sound-card=") != 35:
        raise ValueError("html_sound_card_count_invalid")
    if document.count("data-prompt=") != 105:
        raise ValueError("html_prompt_count_invalid")
    for sound in sounds:
        if sound.file not in document:
            raise ValueError(f"html_sound_missing:{sound.file}")


def validate_pdf(pdf_path: Path, sounds: list[SoundSpec]) -> None:
    from pypdf import PdfReader

    reader = PdfReader(str(pdf_path))
    if not reader.pages:
        raise ValueError("pdf_has_no_pages")
    extracted = "\n".join(page.extract_text() or "" for page in reader.pages)
    if "Звуковая карта" not in extracted or "Арены Phraseman" not in extracted:
        raise ValueError("pdf_title_missing")
    for sound in sounds:
        if sound.file not in extracted:
            raise ValueError(f"pdf_sound_missing:{sound.file}")
    if "визуального столкновения аватаров" not in extracted:
        raise ValueError("pdf_versus_sync_missing")
    for page in reader.pages:
        width = float(page.mediabox.width)
        height = float(page.mediabox.height)
        if abs(width - 595.28) > 3 or abs(height - 841.89) > 3:
            raise ValueError(f"pdf_page_not_a4:{width:.2f}x{height:.2f}")
    print(f"PASS: PDF readable, A4, {len(reader.pages)} pages, all sound IDs present")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--validate-only", action="store_true")
    parser.add_argument("--html-only", action="store_true")
    parser.add_argument("--check-pdf", type=Path)
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    sounds = build_sounds()
    print("PASS: 35 sounds, 105 prompts, 27 wired, 8 trigger-required")
    if args.check_pdf:
        validate_pdf(args.check_pdf.resolve(), sounds)
        return 0
    if args.validate_only:
        return 0
    write_html(sounds)
    print(f"PASS: HTML standalone - {HTML_PATH}")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:  # concise CLI failure for the deterministic builder
        print(f"FAIL: {exc}", file=sys.stderr)
        raise
