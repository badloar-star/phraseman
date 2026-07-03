#!/usr/bin/env python3
"""Build the French version of the FUL JOY Chains CapCut project.

This keeps the fixed July 2 CapCut timing/grid and replaces only the
language-learning text/audio slots with French/Russian chain content.
"""

from __future__ import annotations

import argparse
from concurrent.futures import ThreadPoolExecutor, as_completed
import hashlib
import json
import os
from pathlib import Path
import shutil
import struct
import subprocess
import sys
import time
import urllib.error
import urllib.request
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parent))
from build_chains_800_capcut_project import (  # noqa: E402
    capcut_root,
    localize_copied_project_paths,
    load_json,
    set_text,
    update_meta,
    write_json,
)
from openai_dev_guard import require_openai_dev_spend_guard  # noqa: E402


US = 1_000_000
MODEL_ID = "gpt-4o-mini-tts"
OUTPUT_FORMAT = "wav"
SOURCE_DRAFT = "CHAINS VAR 2 FUL JOY SEPARATE FIXED 20260702_145459"
TARGET_PREFIX = "CHAINS FR FUL JOY 25"
PACK_ROOT = Path("exports/chains/phrase_packs")
OPENAI_TTS_ESTIMATE_USD_PER_1K_CHARS = 0.015

ROLE_CONFIG: dict[str, dict[str, str]] = {
    "fr1": {
        "voice": "coral",
        "instructions": (
            "Speak natural standard French for an A1-A2 chain-method lesson. "
            "Warm, clear, conversational. Say only the phrase, then stop cleanly."
        ),
    },
    "ru": {
        "voice": "marin",
        "instructions": (
            "Говори по-русски естественно и тепло, как диктор хорошего учебного ролика. "
            "Четкое произношение. Скажи только фразу и остановись чисто."
        ),
    },
    "fr2": {
        "voice": "nova",
        "instructions": (
            "Speak clear standard French with a calm second voice. "
            "Natural lesson pace, precise articulation. Say only the phrase."
        ),
    },
    "fr3": {
        "voice": "cedar",
        "instructions": (
            "Speak standard French with a slightly slower teacher voice. "
            "Friendly, confident, easy to repeat. Say only the phrase."
        ),
    },
}


CHAINS: list[dict[str, Any]] = [
    {
        "topic": "home charger",
        "steps": [
            ("J'ai besoin de mon chargeur", "Мне нужна моя зарядка"),
            ("J'ai besoin de mon chargeur pres du lit", "Мне нужна моя зарядка возле кровати"),
            ("J'ai besoin de mon chargeur pres du lit avant de dormir", "Мне нужна моя зарядка возле кровати перед сном"),
            ("J'ai besoin de mon chargeur pres du lit avant de dormir parce que mon telephone est presque decharge", "Мне нужна моя зарядка возле кровати перед сном, потому что телефон разряжен"),
        ],
        "half_1": "J'ai besoin de mon chargeur pres du lit avant de dormir",
        "half_2": "parce que mon telephone est presque decharge",
    },
    {
        "topic": "kitchen salt",
        "steps": [
            ("Tu peux me passer le sel ?", "Можешь передать соль?"),
            ("Tu peux me passer le sel sur la table ?", "Можешь передать соль со стола?"),
            ("Tu peux me passer le sel sur la table pendant que je cuisine ?", "Можешь передать соль со стола, пока я готовлю?"),
            ("Tu peux me passer le sel sur la table pendant que je cuisine le diner ?", "Можешь передать соль со стола, пока я готовлю ужин?"),
        ],
        "half_1": "Tu peux me passer le sel sur la table pendant que je cuisine",
        "half_2": "le diner ?",
    },
    {
        "topic": "late bus",
        "steps": [
            ("Je suis en retard aujourd'hui", "Я сегодня опаздываю"),
            ("Je suis en retard aujourd'hui pour le bus", "Я сегодня опаздываю на автобус"),
            ("Je suis en retard aujourd'hui pour le bus parce que je me suis reveille trop tard", "Я сегодня опаздываю на автобус, потому что проспал"),
            ("Je suis en retard aujourd'hui pour le bus parce que je me suis reveille trop tard ce matin", "Я сегодня опаздываю на автобус, потому что проспал утром"),
        ],
        "half_1": "Je suis en retard aujourd'hui pour le bus",
        "half_2": "parce que je me suis reveille trop tard ce matin",
    },
    {
        "topic": "shop size",
        "steps": [
            ("Vous avez cette taille ?", "У вас есть этот размер?"),
            ("Vous avez cette taille en bleu ?", "У вас есть этот размер в синем цвете?"),
            ("Vous avez cette taille en bleu pour moi ?", "У вас есть этот размер в синем цвете для меня?"),
            ("Vous avez cette taille en bleu pour moi, pour que je puisse l'essayer ?", "У вас есть этот размер в синем цвете, чтобы примерить?"),
        ],
        "half_1": "Vous avez cette taille en bleu pour moi",
        "half_2": "pour que je puisse l'essayer ?",
    },
    {
        "topic": "work file",
        "steps": [
            ("Envoie le fichier, s'il te plait", "Пожалуйста, отправь файл"),
            ("Envoie le fichier avant le dejeuner, s'il te plait", "Пожалуйста, отправь файл до обеда"),
            ("Envoie le fichier avant le dejeuner s'il est pret", "Пожалуйста, отправь файл до обеда, если он готов"),
            ("Envoie le fichier avant le dejeuner s'il est pret aujourd'hui", "Пожалуйста, отправь файл до обеда, если он готов сегодня"),
        ],
        "half_1": "Envoie le fichier avant le dejeuner",
        "half_2": "s'il est pret aujourd'hui",
    },
    {
        "topic": "phone update",
        "steps": [
            ("Mon telephone ne marche pas", "Мой телефон не работает"),
            ("Mon telephone ne marche pas apres la mise a jour", "Мой телефон не работает после обновления"),
            ("Mon telephone ne marche pas apres la mise a jour ce matin", "Мой телефон не работает после обновления сегодня утром"),
            ("Mon telephone ne marche pas apres la mise a jour ce matin, donc j'ai besoin d'aide", "Мой телефон не работает после обновления сегодня утром, поэтому мне нужна помощь"),
        ],
        "half_1": "Mon telephone ne marche pas apres la mise a jour ce matin",
        "half_2": "donc j'ai besoin d'aide",
    },
    {
        "topic": "coffee",
        "steps": [
            ("Je peux prendre un cafe ?", "Можно мне кофе?"),
            ("Je peux prendre un cafe sans sucre ?", "Можно мне кофе без сахара?"),
            ("Je peux prendre un cafe sans sucre a emporter ?", "Можно мне кофе без сахара с собой?"),
            ("Je peux prendre un cafe sans sucre a emporter, s'il vous plait ?", "Можно мне кофе без сахара с собой, пожалуйста?"),
        ],
        "half_1": "Je peux prendre un cafe sans sucre a emporter",
        "half_2": "s'il vous plait ?",
    },
    {
        "topic": "train platform",
        "steps": [
            ("Ou est le quai ?", "Где платформа?"),
            ("Ou est le quai pour mon train ?", "Где платформа для моего поезда?"),
            ("Ou est le quai pour mon train pour Londres ?", "Где платформа для моего поезда в Лондон?"),
            ("Ou est le quai pour mon train pour Londres ce matin ?", "Где платформа для моего поезда в Лондон сегодня утром?"),
        ],
        "half_1": "Ou est le quai pour mon train pour Londres",
        "half_2": "ce matin ?",
    },
    {
        "topic": "hotel reservation",
        "steps": [
            ("J'ai une reservation", "У меня есть бронь"),
            ("J'ai une reservation pour ce soir", "У меня есть бронь на сегодня вечером"),
            ("J'ai une reservation pour ce soir a mon nom", "У меня есть бронь на сегодня вечером на мое имя"),
            ("J'ai une reservation pour ce soir a mon nom, mais je suis en avance", "У меня есть бронь на сегодня вечером на мое имя, но я приехал рано"),
        ],
        "half_1": "J'ai une reservation pour ce soir a mon nom",
        "half_2": "mais je suis en avance",
    },
    {
        "topic": "health water",
        "steps": [
            ("Je me sens un peu malade", "Мне немного нехорошо"),
            ("Je me sens un peu malade apres le dejeuner", "Мне немного нехорошо после обеда"),
            ("Je me sens un peu malade apres le dejeuner et j'ai besoin d'eau", "Мне немного нехорошо после обеда, и мне нужна вода"),
            ("Je me sens un peu malade apres le dejeuner et j'ai besoin d'un peu d'eau maintenant", "Мне немного нехорошо после обеда, и мне сейчас нужна вода"),
        ],
        "half_1": "Je me sens un peu malade apres le dejeuner",
        "half_2": "et j'ai besoin d'un peu d'eau maintenant",
    },
    {
        "topic": "directions",
        "steps": [
            ("Comment je vais la-bas ?", "Как мне туда добраться?"),
            ("Comment je vais la-bas depuis cette rue ?", "Как мне туда добраться с этой улицы?"),
            ("Comment je vais la-bas depuis cette rue a pied ?", "Как мне туда добраться с этой улицы пешком?"),
            ("Comment je vais la-bas depuis cette rue a pied en dix minutes ?", "Как мне туда добраться с этой улицы пешком за десять минут?"),
        ],
        "half_1": "Comment je vais la-bas depuis cette rue a pied",
        "half_2": "en dix minutes ?",
    },
    {
        "topic": "meeting",
        "steps": [
            ("La reunion commence bientot", "Встреча скоро начнется"),
            ("La reunion commence bientot dans la petite salle", "Встреча скоро начнется в маленькой комнате"),
            ("La reunion commence bientot dans la petite salle a l'etage", "Встреча скоро начнется в маленькой комнате наверху"),
            ("La reunion commence bientot dans la petite salle a l'etage, alors apporte tes notes", "Встреча скоро начнется в маленькой комнате наверху, поэтому возьми свои записи"),
        ],
        "half_1": "La reunion commence bientot dans la petite salle a l'etage",
        "half_2": "alors apporte tes notes",
    },
    {
        "topic": "waiting Anna",
        "steps": [
            ("Nous attendons Anna", "Мы ждем Анну"),
            ("Nous attendons Anna pres de l'entree", "Мы ждем Анну возле входа"),
            ("Nous attendons Anna pres de l'entree apres le film", "Мы ждем Анну возле входа после фильма"),
            ("Nous attendons Anna pres de l'entree apres le film parce qu'elle a oublie son sac", "Мы ждем Анну возле входа после фильма, потому что она забыла сумку"),
        ],
        "half_1": "Nous attendons Anna pres de l'entree apres le film",
        "half_2": "parce qu'elle a oublie son sac",
    },
    {
        "topic": "bathroom door",
        "steps": [
            ("La porte ne ferme pas", "Дверь не закрывается"),
            ("La porte ne ferme pas dans la salle de bain", "Дверь не закрывается в ванной"),
            ("La porte ne ferme pas dans la salle de bain apres la reparation", "Дверь не закрывается в ванной после ремонта"),
            ("La porte ne ferme pas dans la salle de bain apres la reparation, alors verifie-la s'il te plait", "Дверь не закрывается в ванной после ремонта, поэтому проверь ее, пожалуйста"),
        ],
        "half_1": "La porte ne ferme pas dans la salle de bain apres la reparation",
        "half_2": "alors verifie-la s'il te plait",
    },
    {
        "topic": "visa form",
        "steps": [
            ("J'ai besoin de ce formulaire", "Мне нужна эта форма"),
            ("J'ai besoin de ce formulaire pour mon visa", "Мне нужна эта форма для моей визы"),
            ("J'ai besoin de ce formulaire pour mon visa aujourd'hui", "Мне нужна эта форма для моей визы сегодня"),
            ("J'ai besoin de ce formulaire pour mon visa aujourd'hui, mais je ne le trouve pas", "Мне нужна эта форма для моей визы сегодня, но я не могу ее найти"),
        ],
        "half_1": "J'ai besoin de ce formulaire pour mon visa aujourd'hui",
        "half_2": "mais je ne le trouve pas",
    },
    {
        "topic": "repeat lesson",
        "steps": [
            ("Tu peux repeter ca ?", "Можешь повторить это?"),
            ("Tu peux repeter ca plus lentement ?", "Можешь повторить это медленнее?"),
            ("Tu peux repeter ca plus lentement pour moi ?", "Можешь повторить это медленнее для меня?"),
            ("Tu peux repeter ca plus lentement pour moi encore une fois ?", "Можешь повторить это медленнее для меня еще один раз?"),
        ],
        "half_1": "Tu peux repeter ca plus lentement pour moi",
        "half_2": "encore une fois ?",
    },
    {
        "topic": "cold outside",
        "steps": [
            ("Il fait froid dehors", "На улице холодно"),
            ("Il fait froid dehors apres la pluie", "На улице холодно после дождя"),
            ("Il fait froid dehors apres la pluie, alors prends une veste", "На улице холодно после дождя, поэтому возьми куртку"),
            ("Il fait froid dehors apres la pluie, alors prends une veste avant de partir", "На улице холодно после дождя, поэтому возьми куртку перед выходом"),
        ],
        "half_1": "Il fait froid dehors apres la pluie",
        "half_2": "alors prends une veste avant de partir",
    },
    {
        "topic": "pay by card",
        "steps": [
            ("Je peux payer par carte ?", "Можно оплатить картой?"),
            ("Je peux payer par carte au comptoir ?", "Можно оплатить картой у стойки?"),
            ("Je peux payer par carte au comptoir apres avoir verifie le prix ?", "Можно оплатить картой у стойки после того, как я проверю цену?"),
            ("Je peux payer par carte au comptoir apres avoir verifie le prix, s'il vous plait ?", "Можно оплатить картой у стойки после того, как я проверю цену, пожалуйста?"),
        ],
        "half_1": "Je peux payer par carte au comptoir apres avoir verifie le prix",
        "half_2": "s'il vous plait ?",
    },
    {
        "topic": "lost wallet",
        "steps": [
            ("J'ai perdu mon portefeuille", "Я потерял кошелек"),
            ("J'ai perdu mon portefeuille pres de la gare", "Я потерял кошелек возле станции"),
            ("J'ai perdu mon portefeuille pres de la gare cet apres-midi", "Я потерял кошелек возле станции сегодня днем"),
            ("J'ai perdu mon portefeuille pres de la gare cet apres-midi et je dois le signaler", "Я потерял кошелек возле станции сегодня днем, и мне нужно сообщить об этом"),
        ],
        "half_1": "J'ai perdu mon portefeuille pres de la gare cet apres-midi",
        "half_2": "et je dois le signaler",
    },
    {
        "topic": "appointment time",
        "steps": [
            ("Je dois changer l'heure", "Мне нужно изменить время"),
            ("Je dois changer l'heure de mon rendez-vous", "Мне нужно изменить время моей встречи"),
            ("Je dois changer l'heure de mon rendez-vous demain", "Мне нужно изменить время моей встречи завтра"),
            ("Je dois changer l'heure de mon rendez-vous demain parce que je travaille tard", "Мне нужно изменить время моей встречи завтра, потому что я работаю допоздна"),
        ],
        "half_1": "Je dois changer l'heure de mon rendez-vous demain",
        "half_2": "parce que je travaille tard",
    },
    {
        "topic": "slow wifi",
        "steps": [
            ("Le Wi-Fi est lent", "Wi-Fi медленный"),
            ("Le Wi-Fi est lent dans ma chambre", "Wi-Fi медленный в моей комнате"),
            ("Le Wi-Fi est lent dans ma chambre quand j'appelle", "Wi-Fi медленный в моей комнате, когда я звоню"),
            ("Le Wi-Fi est lent dans ma chambre quand j'appelle ma famille", "Wi-Fi медленный в моей комнате, когда я звоню семье"),
        ],
        "half_1": "Le Wi-Fi est lent dans ma chambre",
        "half_2": "quand j'appelle ma famille",
    },
    {
        "topic": "hot soup",
        "steps": [
            ("Cette soupe est trop chaude", "Этот суп слишком горячий"),
            ("Cette soupe est trop chaude pour moi", "Этот суп для меня слишком горячий"),
            ("Cette soupe est trop chaude pour moi maintenant", "Этот суп для меня сейчас слишком горячий"),
            ("Cette soupe est trop chaude pour moi maintenant, alors je vais attendre", "Этот суп для меня сейчас слишком горячий, поэтому я подожду"),
        ],
        "half_1": "Cette soupe est trop chaude pour moi maintenant",
        "half_2": "alors je vais attendre",
    },
    {
        "topic": "move chair",
        "steps": [
            ("Deplace la chaise, s'il te plait", "Пожалуйста, передвинь стул"),
            ("Deplace la chaise pres de la fenetre, s'il te plait", "Пожалуйста, передвинь стул к окну"),
            ("Deplace la chaise pres de la fenetre avant que je nettoie", "Пожалуйста, передвинь стул к окну перед тем, как я уберу"),
            ("Deplace la chaise pres de la fenetre avant que je nettoie le sol", "Пожалуйста, передвинь стул к окну перед тем, как я вымою пол"),
        ],
        "half_1": "Deplace la chaise pres de la fenetre",
        "half_2": "avant que je nettoie le sol",
    },
    {
        "topic": "medicine question",
        "steps": [
            ("J'ai une question", "У меня есть вопрос"),
            ("J'ai une question sur ce medicament", "У меня есть вопрос об этом лекарстве"),
            ("J'ai une question sur ce medicament pour ma mere", "У меня есть вопрос об этом лекарстве для моей мамы"),
            ("J'ai une question sur ce medicament pour ma mere avant qu'elle le prenne", "У меня есть вопрос об этом лекарстве для моей мамы перед тем, как она его примет"),
        ],
        "half_1": "J'ai une question sur ce medicament pour ma mere",
        "half_2": "avant qu'elle le prenne",
    },
    {
        "topic": "leave now",
        "steps": [
            ("On devrait partir maintenant", "Нам стоит уходить сейчас"),
            ("On devrait partir maintenant avant qu'il fasse nuit", "Нам стоит уходить сейчас, пока не стемнело"),
            ("On devrait partir maintenant avant qu'il fasse nuit dehors", "Нам стоит уходить сейчас, пока на улице не стемнело"),
            ("On devrait partir maintenant avant qu'il fasse nuit dehors et que les bus s'arretent", "Нам стоит уходить сейчас, пока на улице не стемнело и автобусы не перестали ходить"),
        ],
        "half_1": "On devrait partir maintenant avant qu'il fasse nuit dehors",
        "half_2": "et que les bus s'arretent",
    },
]


def load_env_file(start: Path) -> dict[str, str]:
    env_path = next((folder / ".env.local" for folder in [start.resolve(), *start.resolve().parents] if (folder / ".env.local").exists()), None)
    values: dict[str, str] = {}
    if env_path:
        for line in env_path.read_text(encoding="utf-8-sig", errors="ignore").splitlines():
            stripped = line.strip()
            if not stripped or stripped.startswith("#") or "=" not in stripped:
                continue
            key, value = stripped.split("=", 1)
            values[key.strip()] = value.strip().strip('"').strip("'")
    values.update({key: value for key, value in os.environ.items() if key == "OPENAI_API_KEY"})
    return values


def normalize(value: str) -> str:
    return " ".join(str(value or "").casefold().split())


def strip_final_punct(value: str) -> str:
    return str(value).strip().rstrip(".!?").strip()


FRENCH_TEXT_FIXES: tuple[tuple[str, str], ...] = (
    ("mise a jour", "mise à jour"),
    ("s'il vous plait", "s'il vous plaît"),
    ("s'il te plait", "s'il te plaît"),
    ("a emporter", "à emporter"),
    ("a l'etage", "à l'étage"),
    ("a mon nom", "à mon nom"),
    ("a pied", "à pied"),
    ("Ou est", "Où est"),
    ("la-bas", "là-bas"),
    ("telephone", "téléphone"),
    ("decharge", "déchargé"),
    ("dejeuner", "déjeuner"),
    ("diner", "dîner"),
    ("reveille", "réveillé"),
    ("apres", "après"),
    ("pres", "près"),
    ("prèsque", "presque"),
    ("cafe", "café"),
    ("pret", "prêt"),
    ("reservation", "réservation"),
    ("reunion", "réunion"),
    ("bientot", "bientôt"),
    ("entree", "entrée"),
    ("oublie", "oublié"),
    ("reparation", "réparation"),
    ("verifie-la", "vérifie-la"),
    ("verifie", "vérifié"),
    ("repeter ca", "répéter ça"),
    ("Deplace", "Déplace"),
    ("deplace", "déplace"),
    ("fenetre", "fenêtre"),
    ("medicament", "médicament"),
    ("mere", "mère"),
    ("s'arretent", "s'arrêtent"),
)


def fix_french_text(value: str) -> str:
    text = " ".join(str(value).split())
    for old, new in FRENCH_TEXT_FIXES:
        text = text.replace(old, new)
    return text


def ascii_slug(value: str) -> str:
    cleaned = "".join(ch if ch.isalnum() else "_" for ch in value.lower())
    return "_".join(part for part in cleaned.split("_") if part)[:60] or "audio"


def wrap_text(text: str, max_chars: int, max_lines: int = 2) -> str:
    text = " ".join(str(text).split())
    if len(text) <= max_chars:
        return text
    words = text.split()
    lines: list[str] = []
    current = ""
    for word in words:
        if len(word) > max_chars:
            raise RuntimeError(f"word too long for safe wrap: {word!r}")
        candidate = word if not current else f"{current} {word}"
        if len(candidate) <= max_chars:
            current = candidate
        else:
            lines.append(current)
            current = word
    if current:
        lines.append(current)
    if len(lines) > max_lines and max_chars < 58:
        return wrap_text(text, max_chars + 6, max_lines)
    if len(lines) > max_lines:
        raise RuntimeError(f"too many lines after wrap: {text!r} -> {lines!r}")
    return "\n".join(lines)


def french_hint(text: str) -> str:
    value = normalize(strip_final_punct(text))
    replacements = [
        ("j'ai", "zhe"),
        ("je ", "zhe "),
        ("tu ", "tu "),
        ("vous", "vu"),
        ("ou ", "u "),
        ("ou", "u"),
        ("eau", "o"),
        ("au", "o"),
        ("ai", "e"),
        ("ei", "e"),
        ("oi", "ua"),
        ("ch", "sh"),
        ("gn", "ny"),
        ("ill", "iy"),
        ("qu", "k"),
        ("ç", "s"),
        ("é", "e"),
        ("è", "e"),
        ("ê", "e"),
        ("à", "a"),
        ("ù", "u"),
        ("û", "u"),
        ("ô", "o"),
        ("â", "a"),
        ("î", "i"),
        ("ï", "i"),
        ("h", ""),
    ]
    for old, new in replacements:
        value = value.replace(old, new)
    value = " ".join(value.split())
    return f"/{value}/"


def build_content(pack: Path) -> dict[str, Any]:
    phrases: list[dict[str, Any]] = []
    seen_fr: dict[str, str] = {}
    seen_ru: dict[str, str] = {}
    errors: list[str] = []
    for index, chain in enumerate(CHAINS, start=1):
        steps = []
        for step_index, (fr, ru) in enumerate(chain["steps"], start=1):
            fr = fix_french_text(fr)
            step = {
                "id": f"S{step_index:02d}",
                "fr": strip_final_punct(fr),
                "ru": strip_final_punct(ru),
                "pronunciation": french_hint(fr),
            }
            steps.append(step)
            fr_norm = normalize(step["fr"])
            ru_norm = normalize(step["ru"])
            if fr_norm in seen_fr:
                errors.append(f"duplicate French {index:03d}/{step_index}: {fr}")
            if ru_norm in seen_ru:
                errors.append(f"duplicate Russian {index:03d}/{step_index}: {ru}")
            seen_fr[fr_norm] = f"{index:03d}/{step_index}"
            seen_ru[ru_norm] = f"{index:03d}/{step_index}"
        final_fr = steps[-1]["fr"]
        half_1 = strip_final_punct(fix_french_text(chain["half_1"]))
        half_2 = strip_final_punct(fix_french_text(chain["half_2"]))
        if not final_fr.casefold().startswith(half_1.casefold()[: max(8, min(len(half_1), 28))]):
            errors.append(f"half_1 is not aligned with final phrase at P{index:03d}")
        phrases.append(
            {
                "id": f"P{index:03d}",
                "topic": chain["topic"],
                "steps": steps,
                "half_1_fr": half_1,
                "half_2_fr": half_2,
            }
        )
    report = {
        "status": "ready" if not errors and len(phrases) == 25 else "failed",
        "phrase_count": len(phrases),
        "step_count": sum(len(item["steps"]) for item in phrases),
        "unique_french_steps": len(seen_fr),
        "unique_russian_steps": len(seen_ru),
        "errors": errors,
        "source_meaning_rule": "French chains preserve the July 2 FUL JOY meanings, so existing semantic backgrounds remain aligned.",
    }
    pack.mkdir(parents=True, exist_ok=True)
    (pack / "chains_french_ful_joy_25_content.json").write_text(
        json.dumps({"schema_version": "chains_french_ful_joy_25_v1", "phrases": phrases}, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    (pack / "chains_french_ful_joy_25_content_report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    if report["status"] != "ready":
        raise RuntimeError(f"content gate failed: {errors}")
    return {"phrases": phrases, "report": report}


def audio_digest(job_id: str, role: str, text: str) -> str:
    payload = {
        "model": MODEL_ID,
        "format": OUTPUT_FORMAT,
        "job_id": job_id,
        "role": role,
        "voice": ROLE_CONFIG[role]["voice"],
        "instructions": ROLE_CONFIG[role]["instructions"],
        "text": text,
    }
    return hashlib.sha1(json.dumps(payload, ensure_ascii=False, sort_keys=True).encode("utf-8")).hexdigest()[:12]


def raw_audio_path(pack: Path, job_id: str, role: str, text: str) -> Path:
    return pack / "openai_audio" / "raw" / role / f"{job_id}_{audio_digest(job_id, role, text)}.wav"


def fitted_audio_path(pack: Path, job_id: str, role: str, track: int, segment: int, slot_us: int) -> Path:
    return pack / "openai_audio" / "fitted" / role / f"t{track:02d}_s{segment:03d}_{job_id}_{slot_us}.wav"


def openai_tts(api_key: str, text: str, role: str, path: Path) -> None:
    cfg = ROLE_CONFIG[role]
    payload = json.dumps(
        {
            "model": MODEL_ID,
            "voice": cfg["voice"],
            "input": text,
            "instructions": cfg["instructions"],
            "response_format": OUTPUT_FORMAT,
        },
        ensure_ascii=False,
    ).encode("utf-8")
    request = urllib.request.Request(
        "https://api.openai.com/v1/audio/speech",
        data=payload,
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
        method="POST",
    )
    path.parent.mkdir(parents=True, exist_ok=True)
    last_error: Exception | None = None
    for attempt in range(1, 6):
        try:
            with urllib.request.urlopen(request, timeout=180) as response:
                path.write_bytes(response.read())
            return
        except urllib.error.HTTPError as error:
            last_error = RuntimeError(error.read().decode("utf-8", errors="replace")[:800])
        except Exception as error:  # noqa: BLE001
            last_error = error
        time.sleep(1.5 * attempt)
    raise RuntimeError(f"OpenAI TTS failed for {role}/{text[:50]!r}: {last_error}")


def ffprobe_duration(path: Path) -> float:
    completed = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", str(path)],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        check=False,
    )
    if completed.returncode != 0:
        raise RuntimeError(f"ffprobe failed for {path}: {completed.stderr[:500]}")
    return float(completed.stdout.strip())


def wav_duration_us(path: Path) -> int:
    data = path.read_bytes()
    if data[:4] != b"RIFF" or data[8:12] != b"WAVE":
        raise RuntimeError(f"not a wav file: {path}")
    offset = 12
    byte_rate: int | None = None
    data_size: int | None = None
    while offset + 8 <= len(data):
        chunk_id = data[offset : offset + 4]
        size = struct.unpack_from("<I", data, offset + 4)[0]
        start = offset + 8
        if chunk_id == b"fmt ":
            byte_rate = struct.unpack_from("<I", data, start + 8)[0]
        if chunk_id == b"data":
            data_size = len(data) - start if size == 0xFFFFFFFF else size
            break
        offset = start + size + (size % 2)
    if not byte_rate or data_size is None:
        raise RuntimeError(f"cannot read wav duration: {path}")
    return round((data_size / byte_rate) * US)


def atempo_chain(factor: float) -> str:
    values: list[float] = []
    remaining = factor
    while remaining > 2.0:
        values.append(2.0)
        remaining /= 2.0
    while remaining < 0.5:
        values.append(0.5)
        remaining /= 0.5
    values.append(remaining)
    return ",".join(f"atempo={value:.6f}" for value in values)


def fit_audio(raw: Path, target: Path, slot_us: int) -> dict[str, Any]:
    slot_sec = slot_us / US
    raw_sec = ffprobe_duration(raw)
    speed = 1.0
    filters: list[str] = []
    max_raw = max(slot_sec - 0.08, 0.2)
    if raw_sec > max_raw:
        speed = raw_sec / max_raw
        filters.append(atempo_chain(speed))
    filters.append(f"apad=pad_dur={max(slot_sec, 0.1):.6f}")
    filters.append(f"atrim=0:{slot_sec:.6f}")
    target.parent.mkdir(parents=True, exist_ok=True)
    completed = subprocess.run(
        ["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-i", str(raw), "-af", ",".join(filters), "-ar", "48000", "-ac", "2", str(target)],
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        check=False,
    )
    if completed.returncode != 0:
        raise RuntimeError(f"ffmpeg fit failed for {raw}: {completed.stdout[:800]}")
    duration_us = wav_duration_us(target)
    return {
        "path": str(target),
        "raw_duration_sec": round(raw_sec, 3),
        "slot_us": slot_us,
        "duration_us": duration_us,
        "speed": round(speed, 4),
    }


def build_unique_tts_jobs(phrases: list[dict[str, Any]]) -> list[dict[str, Any]]:
    jobs: list[dict[str, Any]] = []
    for phrase in phrases:
        phrase_id = phrase["id"]
        for step in phrase["steps"]:
            step_id = step["id"]
            jobs.extend(
                [
                    {"job_id": f"{phrase_id}_{step_id}_FR1", "role": "fr1", "text": step["fr"]},
                    {"job_id": f"{phrase_id}_{step_id}_RU", "role": "ru", "text": step["ru"]},
                    {"job_id": f"{phrase_id}_{step_id}_FR2", "role": "fr2", "text": step["fr"]},
                    {"job_id": f"{phrase_id}_{step_id}_FR3", "role": "fr3", "text": step["fr"]},
                ]
            )
        jobs.extend(
            [
                {"job_id": f"{phrase_id}_HALF_1", "role": "fr1", "text": phrase["half_1_fr"]},
                {"job_id": f"{phrase_id}_HALF_2", "role": "fr2", "text": phrase["half_2_fr"]},
            ]
        )
    return jobs


def generate_raw_audio(pack: Path, phrases: list[dict[str, Any]], workers: int) -> dict[str, Any]:
    api_key = load_env_file(Path.cwd()).get("OPENAI_API_KEY")
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY is required in .env.local")
    jobs = build_unique_tts_jobs(phrases)
    planned = []
    cached = 0
    for job in jobs:
        path = raw_audio_path(pack, job["job_id"], job["role"], job["text"])
        job["path"] = str(path)
        if path.exists() and path.stat().st_size > 4096:
            cached += 1
        else:
            planned.append(job)
    planned_chars = sum(len(job["text"]) for job in planned)
    estimated_cost = (planned_chars / 1000) * OPENAI_TTS_ESTIMATE_USD_PER_1K_CHARS
    require_openai_dev_spend_guard(
        action="French FUL JOY 25 Chains OpenAI TTS batch",
        estimated_cost_usd=estimated_cost,
        units=len(planned),
    )
    generated = 0
    failed: list[dict[str, str]] = []
    started = time.time()
    if planned:
        print(json.dumps({"planned_tts_files": len(planned), "cached_files": cached, "estimated_cost_usd": round(estimated_cost, 4)}, ensure_ascii=False), flush=True)
        with ThreadPoolExecutor(max_workers=max(1, workers)) as pool:
            futures = {
                pool.submit(openai_tts, api_key, job["text"], job["role"], Path(job["path"])): job
                for job in planned
            }
            for future in as_completed(futures):
                job = futures[future]
                try:
                    future.result()
                    generated += 1
                    if generated == 1 or generated % 25 == 0 or generated == len(planned):
                        print(json.dumps({"tts_generated": generated, "tts_total": len(planned)}, ensure_ascii=False), flush=True)
                except Exception as exc:  # noqa: BLE001
                    failed.append({"job_id": job["job_id"], "error": str(exc)})
                    raise
    manifest = {
        "status": "ready" if not failed else "failed",
        "model": MODEL_ID,
        "cached": cached,
        "generated": generated,
        "failed": failed,
        "elapsed_sec": round(time.time() - started, 1),
        "files": [
            {
                **job,
                "path": str(raw_audio_path(pack, job["job_id"], job["role"], job["text"])),
                "duration_us": wav_duration_us(raw_audio_path(pack, job["job_id"], job["role"], job["text"])),
            }
            for job in jobs
        ],
    }
    out = pack / "openai_audio" / "raw_audio_manifest.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return manifest


def sorted_segments(content: dict[str, Any], track_idx: int) -> list[dict[str, Any]]:
    return sorted(content["tracks"][track_idx].get("segments", []), key=lambda seg: int((seg.get("target_timerange") or {}).get("start", 0)))


def material_map(content: dict[str, Any], group: str) -> dict[str, dict[str, Any]]:
    return {item["id"]: item for item in content.get("materials", {}).get(group, []) if isinstance(item, dict) and item.get("id")}


def localize_resource(target: Path, source: Path, folder: str) -> Path:
    destination = target / "Resources" / folder / source.parent.name / source.name
    destination.parent.mkdir(parents=True, exist_ok=True)
    if not destination.exists() or destination.stat().st_size != source.stat().st_size:
        shutil.copy2(source, destination)
    return destination


def capcut_processes() -> list[int]:
    completed = subprocess.run(
        ["powershell", "-NoProfile", "-Command", "Get-Process -Name CapCut -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Id"],
        stdout=subprocess.PIPE,
        stderr=subprocess.DEVNULL,
        text=True,
        check=False,
    )
    ids = []
    for line in completed.stdout.splitlines():
        line = line.strip()
        if line.isdigit():
            ids.append(int(line))
    return ids


def close_capcut() -> None:
    if not capcut_processes():
        return
    script = (
        "$procs=Get-Process -Name CapCut -ErrorAction SilentlyContinue;"
        "foreach($p in $procs){if($p.MainWindowHandle -ne 0){[void]$p.CloseMainWindow()}};"
        "Start-Sleep -Seconds 5;"
        "$left=Get-Process -Name CapCut -ErrorAction SilentlyContinue;"
        "if($left){$left | Stop-Process -Force}"
    )
    subprocess.run(["powershell", "-NoProfile", "-Command", script], check=False, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    time.sleep(2)
    if capcut_processes():
        raise RuntimeError("CapCut is still running; cannot edit native draft files.")


def unique_target_name() -> str:
    stamp = time.strftime("%Y%m%d_%H%M%S")
    root = capcut_root()
    base = f"{TARGET_PREFIX} {stamp}"
    if not (root / base).exists():
        return base
    return f"{base}_{hashlib.sha1(str(time.time()).encode()).hexdigest()[:6]}"


def copy_source_draft(pack: Path) -> tuple[Path, Path, Path]:
    close_capcut()
    root = capcut_root()
    source = root / SOURCE_DRAFT
    if not source.exists():
        raise RuntimeError(f"source draft not found: {source}")
    backup = Path(".codex-tmp/capcut-backups") / f"{source.name}.BEFORE-FR-FUL-JOY_25_{time.strftime('%Y%m%d_%H%M%S')}"
    backup.parent.mkdir(parents=True, exist_ok=True)
    if not backup.exists():
        shutil.copytree(source, backup)
    target = root / unique_target_name()
    shutil.copytree(source, target)
    lock = target / ".locked"
    if lock.exists():
        lock.unlink()
    root_meta = root / "root_meta_info.json"
    root_meta_backup = root / f"root_meta_info.json.bak_fr_ful_joy_{time.strftime('%Y%m%d_%H%M%S')}"
    shutil.copy2(root_meta, root_meta_backup)
    (pack / "capcut_source_backup_manifest.json").write_text(
        json.dumps({"source": str(source), "source_backup": str(backup), "target": str(target), "root_meta_backup": str(root_meta_backup)}, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    return source, backup, target


def slot_us(segment: dict[str, Any]) -> int:
    return int((segment.get("target_timerange") or {}).get("duration", 0))


def apply_audio(
    *,
    pack: Path,
    target: Path,
    content: dict[str, Any],
    audio_materials: dict[str, dict[str, Any]],
    track_idx: int,
    segment_idx: int,
    job_id: str,
    role: str,
    text: str,
    applications: list[dict[str, Any]],
) -> None:
    segment = sorted_segments(content, track_idx)[segment_idx]
    raw = raw_audio_path(pack, job_id, role, text)
    fit = fit_audio(raw, fitted_audio_path(pack, job_id, role, track_idx, segment_idx, slot_us(segment)), slot_us(segment))
    local = localize_resource(target, Path(fit["path"]), "chains_french_ful_joy_audio")
    material = audio_materials[segment["material_id"]]
    duration = int(fit["duration_us"])
    material["path"] = str(local)
    material["media_path"] = str(local)
    material["name"] = local.name
    material["material_name"] = local.name
    material["duration"] = duration
    material["category_name"] = "local"
    segment["source_timerange"] = {"start": 0, "duration": duration}
    segment["target_timerange"]["duration"] = duration
    segment["speed"] = 1.0
    segment["is_tone_modify"] = False
    applications.append(
        {
            "track": track_idx,
            "segment": segment_idx,
            "job_id": job_id,
            "role": role,
            "text": text,
            "local_path": str(local),
            **fit,
        }
    )


def remove_legacy_track21_tail(content: dict[str, Any]) -> list[dict[str, Any]]:
    track = content["tracks"][21]
    segments = sorted_segments(content, 21)
    removable = segments[100:]
    if not removable:
        return []
    remove_ids = {id(segment) for segment in removable}
    removed = []
    audios = material_map(content, "audios")
    for index, segment in enumerate(segments[100:], start=100):
        material = audios.get(segment.get("material_id"), {})
        removed.append(
            {
                "track": 21,
                "segment": index,
                "material_id": segment.get("material_id"),
                "path": material.get("path") or material.get("media_path") or material.get("name") or "",
            }
        )
    track["segments"] = [segment for segment in track.get("segments", []) if id(segment) not in remove_ids]

    used_material_ids = {
        segment.get("material_id")
        for item in content.get("tracks", [])
        for segment in item.get("segments", [])
        if segment.get("material_id")
    }
    materials = content.get("materials", {})
    materials["audios"] = [item for item in materials.get("audios", []) if item.get("id") in used_material_ids]
    return removed


def write_mirrors(target: Path, content: dict[str, Any]) -> None:
    write_json(target / "draft_content.json", content)
    if (target / "template-2.tmp").exists():
        write_json(target / "template-2.tmp", content)
    timelines = target / "Timelines"
    if timelines.exists():
        for timeline_dir in timelines.iterdir():
            if not timeline_dir.is_dir():
                continue
            write_json(timeline_dir / "draft_content.json", content)
            if (timeline_dir / "template-2.tmp").exists():
                write_json(timeline_dir / "template-2.tmp", content)


def apply_to_capcut(pack: Path, phrases: list[dict[str, Any]]) -> dict[str, Any]:
    source, backup, target = copy_source_draft(pack)
    content = load_json(target / "draft_content.json")
    localized = localize_copied_project_paths(content, source, target)
    texts = material_map(content, "texts")
    audios = material_map(content, "audios")

    source_expected_counts = {5: 100, 7: 100, 8: 100, 10: 25, 11: 50, 13: 25, 15: 25, 21: 101, 22: 100, 23: 100, 24: 100, 25: 25, 26: 25, 27: 25, 28: 25}
    for track_idx, expected in source_expected_counts.items():
        actual = len(sorted_segments(content, track_idx))
        if actual != expected:
            raise RuntimeError(f"track {track_idx} expected {expected}, got {actual}")

    learning_ru = sorted_segments(content, 5)
    learning_pron = sorted_segments(content, 7)
    learning_fr = sorted_segments(content, 8)
    completion_ru = sorted_segments(content, 10)
    halves = sorted_segments(content, 11)
    recall_fr = sorted_segments(content, 13)
    recall_ru = sorted_segments(content, 15)

    text_changes = 0
    for phrase_index, phrase in enumerate(phrases):
        for step_index, step in enumerate(phrase["steps"]):
            row = phrase_index * 4 + step_index
            set_text(texts[learning_ru[row]["material_id"]], wrap_text(step["ru"], 42))
            set_text(texts[learning_pron[row]["material_id"]], wrap_text(step["pronunciation"], 56))
            set_text(texts[learning_fr[row]["material_id"]], wrap_text(step["fr"], 50))
            text_changes += 3
        final = phrase["steps"][-1]
        set_text(texts[halves[phrase_index * 2]["material_id"]], wrap_text(f"{phrase['half_1_fr']}...", 54))
        set_text(texts[halves[phrase_index * 2 + 1]["material_id"]], wrap_text(phrase["half_2_fr"], 54))
        set_text(texts[completion_ru[phrase_index]["material_id"]], wrap_text(final["ru"], 44))
        set_text(texts[recall_fr[phrase_index]["material_id"]], wrap_text(final["fr"], 54))
        set_text(texts[recall_ru[phrase_index]["material_id"]], wrap_text(final["ru"], 44))
        text_changes += 5

    applications: list[dict[str, Any]] = []
    for phrase_index, phrase in enumerate(phrases):
        phrase_id = phrase["id"]
        for step_index, step in enumerate(phrase["steps"]):
            row = phrase_index * 4 + step_index
            step_id = step["id"]
            apply_audio(pack=pack, target=target, content=content, audio_materials=audios, track_idx=21, segment_idx=row, job_id=f"{phrase_id}_{step_id}_FR1", role="fr1", text=step["fr"], applications=applications)
            apply_audio(pack=pack, target=target, content=content, audio_materials=audios, track_idx=22, segment_idx=row, job_id=f"{phrase_id}_{step_id}_RU", role="ru", text=step["ru"], applications=applications)
            apply_audio(pack=pack, target=target, content=content, audio_materials=audios, track_idx=23, segment_idx=row, job_id=f"{phrase_id}_{step_id}_FR2", role="fr2", text=step["fr"], applications=applications)
            apply_audio(pack=pack, target=target, content=content, audio_materials=audios, track_idx=24, segment_idx=row, job_id=f"{phrase_id}_{step_id}_FR3", role="fr3", text=step["fr"], applications=applications)
        final = phrase["steps"][-1]
        apply_audio(pack=pack, target=target, content=content, audio_materials=audios, track_idx=25, segment_idx=phrase_index, job_id=f"{phrase_id}_HALF_1", role="fr1", text=phrase["half_1_fr"], applications=applications)
        apply_audio(pack=pack, target=target, content=content, audio_materials=audios, track_idx=26, segment_idx=phrase_index, job_id=f"{phrase_id}_HALF_2", role="fr2", text=phrase["half_2_fr"], applications=applications)
        apply_audio(pack=pack, target=target, content=content, audio_materials=audios, track_idx=27, segment_idx=phrase_index, job_id=f"{phrase_id}_S04_RU", role="ru", text=final["ru"], applications=applications)
        apply_audio(pack=pack, target=target, content=content, audio_materials=audios, track_idx=28, segment_idx=phrase_index, job_id=f"{phrase_id}_S04_FR1", role="fr1", text=final["fr"], applications=applications)

    removed_legacy_audio = remove_legacy_track21_tail(content)
    content["duration"] = max(
        int((segment.get("target_timerange") or {}).get("start", 0)) + int((segment.get("target_timerange") or {}).get("duration", 0))
        for track in content.get("tracks", [])
        for segment in track.get("segments", [])
    )
    write_mirrors(target, content)
    update_meta(target, content)
    report = {
        "status": "ready",
        "target_name": target.name,
        "target": str(target),
        "source": str(source),
        "source_backup": str(backup),
        "pack": str(pack),
        "localized_copied_project_paths": localized,
        "row_count": len(phrases),
        "step_count": len(phrases) * 4,
        "audio_event_count": len(applications),
        "text_changes": text_changes,
        "max_audio_speed": max(item["speed"] for item in applications),
        "over_speed_1_15_count": sum(1 for item in applications if item["speed"] > 1.15),
        "removed_legacy_audio": removed_legacy_audio,
        "applications_sample": applications[:12],
    }
    (pack / "chains_french_ful_joy_25_capcut_apply_report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (pack / "chains_french_ful_joy_25_audio_application_manifest.json").write_text(json.dumps(applications, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return report


def text_value(material: dict[str, Any] | None) -> str:
    if not material:
        return ""
    raw = material.get("content") or ""
    try:
        parsed = json.loads(raw)
        if isinstance(parsed, dict):
            return str(parsed.get("text") or "")
    except Exception:
        return str(raw)
    return str(raw)


def qa_project(pack: Path, draft_dir: Path, phrases: list[dict[str, Any]]) -> dict[str, Any]:
    content = load_json(draft_dir / "draft_content.json")
    template = load_json(draft_dir / "template-2.tmp") if (draft_dir / "template-2.tmp").exists() else None
    timeline_paths = sorted((draft_dir / "Timelines").glob("*/draft_content.json")) if (draft_dir / "Timelines").exists() else []
    timeline_template_paths = sorted((draft_dir / "Timelines").glob("*/template-2.tmp")) if (draft_dir / "Timelines").exists() else []
    texts = material_map(content, "texts")
    audios = material_map(content, "audios")
    errors: list[str] = []

    if template != content:
        errors.append("draft_content/template-2 mirror mismatch")
    for path in timeline_paths + timeline_template_paths:
        if load_json(path) != content:
            errors.append(f"timeline mirror mismatch: {path}")
    for track_idx, expected in {5: 100, 7: 100, 8: 100, 10: 25, 11: 50, 13: 25, 15: 25, 21: 100, 22: 100, 23: 100, 24: 100, 25: 25, 26: 25, 27: 25, 28: 25}.items():
        actual = len(sorted_segments(content, track_idx))
        if actual != expected:
            errors.append(f"track {track_idx} expected {expected}, got {actual}")

    all_relevant_text = []
    for track_idx in (5, 7, 8, 10, 11, 13, 15):
        for segment in sorted_segments(content, track_idx):
            value = text_value(texts.get(segment.get("material_id")))
            all_relevant_text.append({"track": track_idx, "text": value})
            if any(bad in value for bad in ["????", "Ð", "Ñ", "�"]):
                errors.append(f"bad encoded text on track {track_idx}: {value}")
            for line in value.splitlines() or [value]:
                if len(line) > 64:
                    errors.append(f"overlong line on track {track_idx}: {line}")

    old_english_needles = ["I need my charger", "Can you pass the salt", "Please send the file"]
    for needle in old_english_needles:
        if any(needle in item["text"] for item in all_relevant_text):
            errors.append(f"old English remains in learning text: {needle}")

    first_fr = phrases[0]["steps"][0]["fr"]
    if not any(first_fr in item["text"].replace("\n", " ") for item in all_relevant_text):
        errors.append(f"first French phrase not found: {first_fr}")

    audio_missing = []
    audio_duration_errors = []
    checked_audio = 0
    role_folders = {
        21: "fr1",
        22: "ru",
        23: "fr2",
        24: "fr3",
        25: "fr1",
        26: "fr2",
        27: "ru",
        28: "fr1",
    }
    for track_idx, role in role_folders.items():
        for index, segment in enumerate(sorted_segments(content, track_idx)):
            material = audios.get(segment.get("material_id"))
            raw_path = str((material or {}).get("path") or "")
            if "chains_french_ful_joy_audio" not in raw_path or f"\\{role}\\" not in raw_path.replace("/", "\\"):
                errors.append(f"wrong audio folder track {track_idx} segment {index}: {raw_path}")
                continue
            path = Path(raw_path)
            if not path.exists():
                audio_missing.append(raw_path)
                continue
            real = wav_duration_us(path)
            target_duration = int((segment.get("target_timerange") or {}).get("duration", 0))
            source_duration = int((segment.get("source_timerange") or {}).get("duration", 0))
            material_duration = int((material or {}).get("duration", 0))
            if max(abs(real - target_duration), abs(real - source_duration), abs(real - material_duration)) > 50_000:
                audio_duration_errors.append({"track": track_idx, "segment": index, "real": real, "target": target_duration, "source": source_duration, "material": material_duration})
            checked_audio += 1
    if audio_missing:
        errors.append(f"missing audio files: {len(audio_missing)}")
    if audio_duration_errors:
        errors.append(f"audio duration mismatches: {len(audio_duration_errors)}")

    report = {
        "status": "ready" if not errors else "failed",
        "draftDir": str(draft_dir),
        "pack": str(pack),
        "errors": errors,
        "errorCount": len(errors),
        "mirrors": {
            "root_template_equal": template == content,
            "timeline_draft_count": len(timeline_paths),
            "timeline_template_count": len(timeline_template_paths),
        },
        "checked": {
            "relevant_text_segments": len(all_relevant_text),
            "audio_segments": checked_audio,
            "missing_audio_count": len(audio_missing),
            "audio_duration_error_count": len(audio_duration_errors),
        },
        "first_visible_phrases": all_relevant_text[:10],
        "audio_duration_errors_sample": audio_duration_errors[:10],
    }
    (pack / "chains_french_ful_joy_25_structural_gate_report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return report


def latest_pack() -> Path:
    packs = [path for path in PACK_ROOT.glob("chains_french_ful_joy_25_*") if path.is_dir()]
    if not packs:
        raise RuntimeError("no French FUL JOY pack found")
    return max(packs, key=lambda item: item.stat().st_mtime)


def make_pack() -> Path:
    return PACK_ROOT / f"chains_french_ful_joy_25_{time.strftime('%Y%m%d_%H%M%S')}"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("mode", nargs="?", choices=["content", "tts", "build", "qa", "all"], default="all")
    parser.add_argument("--pack", type=Path)
    parser.add_argument("--draft-dir", type=Path)
    parser.add_argument("--workers", type=int, default=8)
    return parser.parse_args()


def load_content(pack: Path) -> list[dict[str, Any]]:
    path = pack / "chains_french_ful_joy_25_content.json"
    if not path.exists():
        return build_content(pack)["phrases"]
    return load_json(path)["phrases"]


def main() -> int:
    args = parse_args()
    pack = args.pack or (make_pack() if args.mode in {"content", "all"} else latest_pack())
    if args.mode in {"content", "all"}:
        content = build_content(pack)
        phrases = content["phrases"]
    else:
        phrases = load_content(pack)

    if args.mode in {"tts", "all"}:
        generate_raw_audio(pack, phrases, args.workers)

    apply_report = None
    if args.mode in {"build", "all"}:
        apply_report = apply_to_capcut(pack, phrases)

    if args.mode in {"qa", "all"}:
        draft_dir = args.draft_dir or Path(str((apply_report or load_json(pack / "chains_french_ful_joy_25_capcut_apply_report.json"))["target"]))
        qa_report = qa_project(pack, draft_dir, phrases)
        print(json.dumps({"pack": str(pack), "qa": qa_report["status"], "draft": str(draft_dir), "errors": qa_report["errors"][:5]}, ensure_ascii=False, indent=2))
        return 0 if qa_report["status"] == "ready" else 1

    print(json.dumps({"status": "ready", "pack": str(pack)}, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
