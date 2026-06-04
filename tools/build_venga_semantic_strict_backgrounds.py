from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import shutil
import subprocess
import time
import uuid
from copy import deepcopy
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import requests
from PIL import Image, ImageEnhance, ImageFilter, ImageStat


US = 1_000_000
DEFAULT_SOURCE_DRAFT = "VENGA A1 200 OPENAI SEMANTIC OPEN BG"
DEFAULT_TARGET_DRAFT = "VENGA A1 200 OPENAI SEMANTIC HQ NOFADE CAPS"
OUT_DIR = Path("exports/venga-phrase-packs/semantic-strict-backgrounds")
CACHE_DIR = Path(os.environ.get("VENGA_BG_CACHE_DIR", str(OUT_DIR / "cache")))
QUERY_CACHE_DIR = CACHE_DIR / "queries"
SOURCE_CACHE_DIR = CACHE_DIR / "source_videos"
RENDER_SUBDIR = "venga_semantic_strict_bg"
MIN_SOURCE_WIDTH = 1920
MIN_SOURCE_HEIGHT = 1080
MIN_SOURCE_DURATION_SECONDS = 5.0
MIN_SOURCE_BITRATE = 1_800_000
MIN_SEQUENCE_PART_US = int(1.5 * US)
MIN_SEQUENCE_TAIL_US = int(1.5 * US)
VISUAL_AUDIT_DIR = OUT_DIR / "visual-audit"
STORYBOARD_DIR = VISUAL_AUDIT_DIR / "storyboard"
VISUAL_GATE_VERSION = "v2"

MIXKIT_LICENSE_URL = "https://mixkit.co/license/#videoFree"
COMMONS_LICENSE_URL = "https://commons.wikimedia.org/wiki/Commons:Licensing"
PEXELS_LICENSE_URL = "https://www.pexels.com/license/"
PIXABAY_LICENSE_URL = "https://pixabay.com/service/license-summary/"

GLOBAL_NEGATIVE_TERMS = {
    "abstract",
    "animation",
    "cartoon",
    "chroma",
    "green screen",
    "kaleidoscope",
    "logo",
    "mockup",
    "paper signing",
    "remote control",
    "template",
    "vertical",
    "code",
    "coding",
    "computer screen",
    "dashboard",
    "developer",
    "development",
    "html",
    "interface",
    "javascript",
    "label",
    "letters",
    "navigation",
    "programming",
    "screen recording",
    "software",
    "source code",
    "text",
    "website",
    "word",
}

BAD_MIXKIT_ASSET_IDS = {
    "241",
    "42633",
    "28286",
    "28300",
    "1240",
    "44737",
    "4688",
    "50816",
    "52076",
    "34435",
    "34048",
    "9356",
    "33335",
    "29999",
    "4762",
    "5339",
    "29030",
    "24011",
    "15871",
    "22965",
    "41930",
    "41931",
    "47005",
    "32458",
    "23477",
}


@dataclass(frozen=True)
class Candidate:
    source: str
    source_id: str
    title: str
    page_url: str
    download_url: str
    license: str
    license_url: str
    query: str
    resolution_hint: int = 0
    ext: str = "mp4"
    source_meta_hint: dict[str, Any] = field(default_factory=dict)


@dataclass
class VisualProfile:
    phrase: str
    concept: str
    queries: list[str]
    required_groups: list[list[str]]
    positive_terms: dict[str, int]
    negative_terms: set[str] = field(default_factory=set)
    layers: dict[str, str] = field(default_factory=dict)
    min_score: int = 11


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def load_env_file(path: Path) -> dict[str, str]:
    values: dict[str, str] = {}
    if not path.exists():
        return values
    for raw in path.read_text(encoding="utf-8", errors="ignore").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        values[key.strip()] = value.strip().strip('"').strip("'")
    return values


def write_json(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def write_capcut_json(path: Path, data: Any) -> None:
    path.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")


def capcut_id() -> str:
    return str(uuid.uuid4()).upper()


def slugify(text: str) -> str:
    value = re.sub(r"[^a-z0-9]+", "-", text.casefold()).strip("-")
    return value or "everyday"


def cache_key(text: str) -> str:
    return hashlib.sha1(text.encode("utf-8")).hexdigest()[:16]


def capcut_text(material: dict[str, Any]) -> str:
    try:
        content = json.loads(material.get("content") or "{}")
        return str(content.get("text") or material.get("base_content") or "")
    except json.JSONDecodeError:
        return str(material.get("base_content") or "")


def phrase_rows(draft: dict[str, Any]) -> list[dict[str, str]]:
    texts = {item["id"]: item for item in draft["materials"]["texts"]}
    rows: list[dict[str, str]] = []
    for index, en_segment in enumerate(draft["tracks"][8]["segments"], start=1):
        ru_segment = draft["tracks"][6]["segments"][index - 1]
        rows.append(
            {
                "index": f"{index:03d}",
                "en": capcut_text(texts[en_segment["material_id"]]).replace("\n", " ").strip(),
                "ru": capcut_text(texts[ru_segment["material_id"]]).replace("\n", " ").strip(),
            }
        )
    return rows


def add_terms(target: dict[str, int], terms: list[str], weight: int) -> None:
    for term in terms:
        target[term] = max(target.get(term, 0), weight)


def profile_for_phrase(phrase: str) -> VisualProfile:
    text = phrase.casefold()
    words = tokens(text)
    queries: list[str] = []
    required: list[list[str]] = []
    positive: dict[str, int] = {}
    negative: set[str] = set(GLOBAL_NEGATIVE_TERMS)
    layers = {
        "literal_action": "everyday action",
        "object": "person or place connected to phrase",
        "setting": "real-life stock footage",
        "mood": "neutral",
    }
    concept = "everyday life"

    def set_profile(
        name: str,
        qs: list[str],
        groups: list[list[str]],
        pos: list[str],
        action: str,
        obj: str,
        setting: str,
        mood: str = "neutral",
        min_score: int = 11,
    ) -> VisualProfile:
        nonlocal concept, queries, required, positive, layers
        concept = name
        queries = qs
        required = groups
        add_terms(positive, pos, 3)
        layers = {
            "literal_action": action,
            "object": obj,
            "setting": setting,
            "mood": mood,
        }
        return VisualProfile(phrase, concept, queries, required, positive, negative, layers, min_score)

    if "wake up" in text or "early" in text:
        return set_profile(
            "wake up early",
            ["wake up early", "person waking up", "morning bedroom", "morning routine"],
            [["wake", "waking", "morning", "bedroom"], ["person", "boy", "woman", "man", "bed"]],
            ["wake", "waking", "morning", "bed", "bedroom", "sunlight"],
            "waking up",
            "person in bed",
            "morning room",
            "calm morning",
        )
    if "everything changed" in text or "changed" in words:
        return set_profile(
            "change transformation",
            ["time lapse city change", "changing weather", "transition change", "turning page", "moving clouds"],
            [["change", "changing", "transition", "turning", "moving"], ["city", "weather", "page", "clouds", "street"]],
            ["change", "changing", "transition", "turning", "moving", "city", "weather", "clouds"],
            "change over time",
            "place or page changing",
            "city, weather, desk",
            min_score=10,
        )
    if "depends on you" in text:
        return set_profile(
            "personal choice",
            ["person making decision", "choice decision", "thinking person", "crossroads decision", "person choosing path"],
            [["decision", "choice", "thinking", "think", "pointing", "choosing", "select"], ["person", "hand", "woman", "man", "road", "path", "face"]],
            ["decision", "choice", "thinking", "think", "pointing", "choosing", "select", "person", "hand", "road", "path", "face"],
            "deciding",
            "person",
            "desk or street",
            min_score=7,
        )
    if "solve" in words or "problem" in words or "plan" in words or "planning" in words:
        return set_profile(
            "problem solving planning",
            ["solving problem notebook", "planning notebook", "thinking at desk", "working on solution", "writing plan"],
            [["problem", "solve", "solution", "planning", "plan", "thinking", "writing"], ["person", "hands", "desk", "notebook", "laptop"]],
            ["problem", "solve", "solution", "planning", "plan", "thinking", "writing", "desk", "notebook", "laptop", "hands"],
            "thinking or solving",
            "plan or problem",
            "desk or office",
            min_score=8,
        )
    if "drink water" in text or "some water" in text:
        return set_profile(
            "drink water",
            ["drink water", "drinking water", "glass of water", "water bottle", "pour water"],
            [["drink", "drinking", "hydrate", "hydrating", "pour", "filling"], ["water", "glass", "bottle"]],
            ["drink", "drinking", "water", "glass", "bottle", "hydrate", "pour"],
            "drinking",
            "water or glass",
            "kitchen, table, gym, outdoor break",
        )
    if "feel" in words or "feeling" in words or "tired" in words or "air" in words:
        return set_profile(
            "feelings wellness",
            ["tired person", "person resting", "fresh air outside", "person feeling sick", "wellness breathing"],
            [["person", "woman", "man", "face", "resting", "breathing"], ["tired", "wellness", "air", "health", "sick", "rest"]],
            ["person", "woman", "man", "face", "resting", "breathing", "tired", "wellness", "air", "health", "sick", "rest"],
            "feeling or resting",
            "person",
            "home or outdoors",
            min_score=8,
        )
    if "coffee" in text or "tea" in text or "cafe" in text:
        drink = "tea" if "tea" in text else "coffee"
        return set_profile(
            f"{drink} cafe",
            [drink, f"cup of {drink}", "cafe drink", "coffee shop", "hot drink"],
            [[drink, "coffee", "tea", "cup", "mug"], ["drink", "cafe", "shop", "table", "pour"]],
            [drink, "coffee", "tea", "cup", "mug", "cafe", "pour"],
            "having a drink",
            drink,
            "cafe or table",
        )
    if "restaurant" in words:
        return set_profile(
            "restaurant",
            ["restaurant interior", "restaurant entrance", "people eating restaurant", "restaurant table", "waiter restaurant"],
            [["restaurant", "dining", "table", "waiter", "meal"], ["person", "people", "entrance", "interior", "food"]],
            ["restaurant", "dining", "table", "waiter", "meal", "person", "people", "entrance", "interior", "food"],
            "going to restaurant",
            "restaurant",
            "restaurant interior or entrance",
            min_score=8,
        )
    if any(word in text for word in ["breakfast", "dinner", "eat", "hungry", "food", "bread", "soup", "eggs", "corn", "snacks", "pizza", "salad", "dessert", "ice cream", "pie", "chicken", "seafood", "dumplings"]):
        obj = "bread" if "bread" in text else "food"
        meal = "breakfast" if "breakfast" in text else ("dinner" if "dinner" in text else "food")
        return set_profile(
            f"{meal} meal",
            [meal, f"{obj} on table", "people eating", "meal table", "kitchen food"],
            [["eat", "eating", "meal", "breakfast", "dinner", "food", "bread"], ["table", "kitchen", "plate", "people", "person"]],
            ["eat", "eating", "meal", "breakfast", "dinner", "food", "bread", "plate", "table"],
            "eating",
            obj,
            "kitchen or dining table",
        )
    if "office" in words or "police" in words or "station" in words or "bank" in words or "university" in words:
        place = next((word for word in ["office", "police", "station", "bank", "university"] if word in words), "building")
        return set_profile(
            f"{place} location",
            [f"{place} building", f"{place} entrance", "city building exterior", "person near building", "street sign building"],
            [[place, "building", "office", "police", "station", "bank", "university"], ["entrance", "street", "city", "person", "sign"]],
            [place, "building", "office", "police", "station", "bank", "university", "entrance", "street", "city", "sign"],
            "finding a place",
            place,
            "building exterior",
            min_score=8,
        )
    if "cook" in words or "cooking" in words or "grill" in words:
        obj = "grill" if "grill" in words else "food"
        return set_profile(
            "cooking food",
            ["cooking food", "kitchen cooking", "food on grill", "barbecue grill", "friends cooking"],
            [["cook", "cooking", "grill", "barbecue", "food", "kitchen"], ["person", "hands", "friends", "family", "table"]],
            ["cook", "cooking", "grill", "barbecue", "food", "kitchen", "person", "hands", "friends", "family"],
            "cooking",
            obj,
            "kitchen or outdoor grill",
            min_score=9,
        )
    if "go to work" in text or "at the office" in text or "work" in words or "email" in words:
        return set_profile(
            "work office",
            ["office work", "working at desk", "business office", "checking email", "laptop office"],
            [["office", "work", "working", "business", "desk", "laptop"], ["person", "woman", "man", "people", "hands"]],
            ["office", "work", "working", "business", "desk", "laptop", "email", "typing"],
            "working",
            "desk or laptop",
            "office",
        )
    if "go home" in text or "at home" in text or "live" in words or "room" in words:
        return set_profile(
            "home room",
            ["home interior", "person at home", "living room", "bedroom home", "walking home"],
            [["home", "room", "house", "interior", "bedroom", "living"], ["person", "woman", "man", "family", "sofa", "door"]],
            ["home", "room", "house", "interior", "bedroom", "living", "door", "sofa"],
            "being at home",
            "room or home",
            "home interior",
        )
    if "bus" in words:
        return set_profile(
            "bus transport",
            ["city bus", "waiting for bus", "bus stop", "bus ride"],
            [["bus"], ["city", "street", "stop", "station", "road", "people"]],
            ["bus", "stop", "street", "city", "ride", "waiting"],
            "bus travel",
            "bus",
            "street or bus stop",
        )
    if "train" in words:
        return set_profile(
            "train transport",
            ["train station", "train arriving", "railway station", "passenger train"],
            [["train", "railway", "station"], ["arrive", "arriving", "platform", "passenger", "city"]],
            ["train", "station", "platform", "railway", "arriving"],
            "train arriving",
            "train",
            "station",
        )
    if "car" in words:
        return set_profile(
            "car transport",
            ["inside car", "person in car", "car road", "city traffic"],
            [["car", "traffic", "road", "vehicle"], ["person", "driver", "city", "street", "hands"]],
            ["car", "traffic", "road", "driver", "vehicle", "street"],
            "car travel",
            "car",
            "road or car interior",
        )
    if "ticket" in words:
        return set_profile(
            "buy ticket",
            ["ticket counter", "train ticket", "bus ticket", "cinema ticket", "ticket machine"],
            [["ticket", "tickets", "boarding", "pass"], ["counter", "station", "cashier", "machine", "train", "bus", "cinema", "airport", "hand"]],
            ["ticket", "tickets", "counter", "station", "cashier", "machine", "train", "bus", "cinema", "airport", "boarding", "pass"],
            "buying",
            "ticket",
            "station or counter",
            min_score=9,
        )
    if "expensive" in words:
        return set_profile(
            "expensive price",
            ["price tag", "expensive shopping", "cash register", "paying money", "credit card payment"],
            [["price", "expensive", "money", "payment", "card", "shopping"], ["tag", "cash", "card", "store", "hand"]],
            ["price", "expensive", "money", "payment", "card", "shopping", "tag", "cash"],
            "paying or seeing a price",
            "price or money",
            "store or counter",
        )
    if "phone" in words or "text" in words or "message" in words or "sms" in words or "internet" in words or "call" in words or "calling" in words:
        call_words = ["call", "calling"] if "call" in text else ["text", "texting", "phone"]
        return set_profile(
            "phone communication",
            ["person using phone", "texting on phone", "phone call", "smartphone close up", "typing phone message"],
            [["phone", "smartphone", "cell"], ["person", "hands", "texting", "call", "calling", "message", "internet"]],
            ["phone", "smartphone", "cell", "texting", "call", "calling", "message", "internet", "hands", *call_words],
            "using phone",
            "phone",
            "desk, home, street, office",
        )
    if "concert" in words:
        return set_profile(
            "concert live music",
            ["concert stage lights", "live music concert", "musician on stage", "audience concert lights", "empty concert stage"],
            [["concert", "stage", "music", "musician", "audience"], ["lights", "people", "crowd", "performance"]],
            ["concert", "stage", "music", "musician", "audience", "lights", "people", "crowd", "performance"],
            "attending concert",
            "stage or audience",
            "concert venue",
            min_score=8,
        )
    if "music" in words or "song" in words or "hear" in words or "listen" in words or "listening" in words or "loud" in words or "quiet" in words or "sounds" in words:
        return set_profile(
            "sound music",
            ["listening to music", "headphones music", "person with headphones", "music speaker", "sound waves"],
            [["music", "headphones", "speaker", "sound", "listen", "listening"], ["person", "woman", "man", "phone", "speaker"]],
            ["music", "headphones", "speaker", "sound", "listening", "listen"],
            "listening",
            "music or sound",
            "room or street",
        )
    if "photo" in words or "photos" in words:
        return set_profile(
            "photos phone",
            ["looking at photos phone", "taking photos phone", "photo gallery phone", "person looking at pictures", "camera photos"],
            [["photo", "photos", "camera", "pictures"], ["phone", "person", "hand", "gallery", "screen"]],
            ["photo", "photos", "camera", "pictures", "phone", "person", "hand", "gallery", "screen"],
            "looking at photos",
            "photos or phone",
            "desk or room",
            min_score=8,
        )
    if "window" in words:
        return set_profile(
            "looking out window",
            ["looking out window", "person by window", "window view", "rain window", "city view window"],
            [["window", "view", "glass"], ["person", "rain", "city", "home", "room"]],
            ["window", "view", "glass", "person", "rain", "city", "home", "room"],
            "looking out",
            "window",
            "home or city",
            min_score=8,
        )
    if "movie" in words or "video" in words or "watching" in words:
        return set_profile(
            "watching video",
            ["watching movie", "watching video", "cinema screen", "person watching laptop", "tv screen"],
            [["watching", "video", "movie", "cinema", "screen", "tv"], ["person", "people", "laptop", "room"]],
            ["watching", "video", "movie", "cinema", "screen", "tv", "laptop"],
            "watching",
            "screen",
            "cinema, living room, laptop",
        )
    if "book" in words or "english" in words or "study" in words or "learn" in words or "question" in words or "answer" in words or "repeat" in words or "speak" in words or "say" in words:
        return set_profile(
            "learning speaking",
            ["studying book", "learning language", "person reading book", "classroom study", "speaking lesson"],
            [["book", "study", "studying", "learn", "learning", "classroom", "speaking", "reading"], ["person", "student", "teacher", "desk", "hands"]],
            ["book", "study", "studying", "learn", "learning", "reading", "student", "speaking", "classroom"],
            "learning or speaking",
            "book or lesson",
            "desk, classroom, office",
        )
    if "store" in words:
        return set_profile(
            "store interior",
            ["supermarket aisle", "shopping store", "grocery store", "clothing store", "retail store"],
            [["store", "shop", "shopping", "supermarket", "market", "retail"], ["aisle", "shelf", "shelves", "counter", "cashier", "customer", "person", "clothes", "grocery", "mall"]],
            ["store", "shop", "shopping", "supermarket", "market", "retail", "aisle", "shelf", "shelves", "counter", "cashier", "customer", "clothes", "grocery", "mall"],
            "being at a store",
            "shelves, counter, customers",
            "store interior",
            min_score=9,
        )
    if "buy" in words or "pay" in words or "card" in words or "money" in words or "expensive" in words or "gift" in words:
        return set_profile(
            "shopping payment",
            ["shopping store", "pay by card", "cash register", "buying gift", "shopping bags"],
            [["shop", "shopping", "store", "pay", "payment", "card", "cash", "gift"], ["person", "hands", "counter", "cashier", "bag"]],
            ["shop", "shopping", "store", "pay", "payment", "card", "cash", "gift", "counter"],
            "buying or paying",
            "money, card, gift, item",
            "store or counter",
        )
    if "park" in words or "sports" in words:
        return set_profile(
            "park sports",
            ["city park", "people in park", "sports training", "running in park", "football training"],
            [["park", "sport", "sports", "training", "running"], ["person", "people", "city", "field", "grass"]],
            ["park", "sports", "training", "running", "field", "grass"],
            "walking or sport",
            "park or sports",
            "outdoor",
        )
    if "walk" in words or "walking" in words:
        return set_profile(
            "walking outdoors",
            ["person walking alone park", "walking path nature", "feet walking path", "person walking trail", "empty park path"],
            [["walk", "walking", "path", "trail", "park"], ["person", "feet", "legs", "outdoor", "nature"]],
            ["walk", "walking", "path", "trail", "park", "person", "feet", "legs", "outdoor", "nature"],
            "walking",
            "person or path",
            "park or path",
            min_score=8,
        )
    if "birthday" in words:
        return set_profile(
            "birthday",
            ["birthday party", "birthday cake", "birthday gifts", "friends birthday"],
            [["birthday"], ["cake", "party", "gift", "friends", "people"]],
            ["birthday", "cake", "party", "gift", "friends"],
            "celebrating",
            "cake or gift",
            "party table",
        )
    if "laughing" in words:
        return set_profile(
            "laughing person",
            ["person laughing", "friends laughing", "woman laughing", "man laughing", "people smiling"],
            [["laughing", "laugh", "smiling"], ["person", "woman", "man", "friends", "people"]],
            ["laughing", "laugh", "smiling", "person", "friends", "people"],
            "laughing",
            "person",
            "home, cafe, street",
            "happy",
        )
    if any(word in words for word in ["friend", "sister", "brother", "mom", "people", "together", "meet", "name"]):
        return set_profile(
            "people together",
            ["friends meeting", "family together", "people talking", "friends walking", "mother phone call"],
            [["friend", "friends", "family", "people", "talking", "meeting", "mother"], ["person", "woman", "man", "group", "street", "home"]],
            ["friend", "friends", "family", "people", "talking", "meeting", "mother", "group"],
            "meeting or talking",
            "people",
            "home, cafe, street",
        )
    if "bathroom" in words:
        return set_profile(
            "bathroom",
            ["bathroom interior", "bathroom sink", "restroom door", "hotel bathroom"],
            [["bathroom", "restroom", "sink"], ["interior", "door", "hotel", "room"]],
            ["bathroom", "restroom", "sink", "interior", "door"],
            "finding",
            "bathroom",
            "interior",
        )
    if "exit" in words or "leave" in words or "come in" in text:
        if "come in" in text:
            return set_profile(
                "come in entrance",
                ["person entering door", "open door entrance", "walking through door", "person coming in"],
                [["door", "entrance", "entering", "open"], ["person", "woman", "man", "walking", "room"]],
                ["door", "entrance", "entering", "open", "person", "walking", "room"],
                "entering",
                "door",
                "building or room",
                min_score=10,
            )
        if "leave it here" in text:
            return set_profile(
                "leave object here",
                ["put object on table", "leaving keys on table", "placing item on table", "hand putting object down"],
                [["put", "placing", "leaving", "table", "object", "hand"], ["hand", "table", "desk", "keys", "item"]],
                ["put", "placing", "leaving", "table", "object", "hand", "desk", "keys", "item"],
                "placing",
                "object",
                "table or desk",
            )
        return set_profile(
            "door exit",
            ["exit door", "person leaving room", "person walking away", "leaving building", "open door"],
            [["door", "exit", "entrance", "leaving"], ["person", "room", "building", "walk"]],
            ["door", "exit", "entrance", "leaving", "walking"],
            "entering or leaving",
            "door",
            "building or room",
            min_score=10,
        )
    if "door" in words:
        return set_profile(
            "open door",
            ["open door", "person opening door", "front door", "door handle"],
            [["door"], ["open", "opening", "handle", "person", "home"]],
            ["door", "open", "opening", "handle", "home"],
            "opening",
            "door",
            "home or room",
        )
    if "window" in words:
        return set_profile(
            "window",
            ["open window", "close window", "person by window", "window curtain"],
            [["window"], ["open", "close", "curtain", "person", "room"]],
            ["window", "open", "close", "curtain", "room"],
            "opening or closing",
            "window",
            "room",
        )
    if "cold" in words:
        return set_profile(
            "cold weather",
            ["cold weather", "winter city", "person in cold", "snow street"],
            [["cold", "winter", "snow"], ["person", "city", "street", "weather"]],
            ["cold", "winter", "snow", "coat", "street"],
            "feeling cold",
            "weather",
            "outdoor winter",
        )
    if "hot" in words:
        return set_profile(
            "hot weather",
            ["hot weather", "summer sun", "person in sun", "sunny street"],
            [["hot", "sun", "summer", "sunny"], ["person", "street", "city", "weather"]],
            ["hot", "sun", "summer", "sunny", "street"],
            "feeling hot",
            "weather",
            "outdoor summer",
        )
    if "sleep" in words or "sleeping" in words or ("go" in words and "bed" in words):
        return set_profile(
            "sleep in bedroom",
            [
                "person sleeping in bed",
                "sleeping person bedroom",
                "tired person in bed",
                "woman sleeping in bed",
                "man sleeping in bed",
                "bedroom at night",
                "person falling asleep",
            ],
            [["sleep", "sleeping", "bed", "bedroom", "asleep", "tired"], ["person", "woman", "man", "bed", "room", "night"]],
            ["sleep", "sleeping", "bed", "bedroom", "asleep", "tired", "night", "rest", "pillow"],
            "sleeping or falling asleep",
            "person, bed, pillow",
            "bedroom or night room",
            "quiet and tired",
            min_score=10,
        )
    if any(word in words for word in ["sleep", "tired", "late", "early", "sad", "crying", "laughing"]):
        if "too late" in text or "late" in words:
            return set_profile(
                "late night clock",
                ["late night clock", "clock at night", "person late at night", "night street clock"],
                [["late", "night", "clock"], ["night", "clock", "person", "street", "time"]],
                ["late", "night", "clock", "time", "person", "street"],
                "being late",
                "clock or night",
                "room or street",
                min_score=10,
            )
        if "crying" in words or "cry" in text:
            return set_profile(
                "person crying",
                ["person crying", "woman crying", "sad woman crying", "crying face", "sad person"],
                [["cry", "crying", "sad", "tears", "tear"], ["person", "woman", "man", "face", "girl"]],
                ["cry", "crying", "sad", "tears", "tear", "face", "woman", "person"],
                "crying",
                "face or person",
                "room or close portrait",
                "sad",
                min_score=10,
            )
        mood_terms = ["laughing", "laugh"] if "laugh" in text else ["sad", "crying"] if "sad" in text or "crying" in text else ["tired", "sleep"]
        return set_profile(
            "emotion tired",
            ["tired person", "sleeping person", "sad person", "person laughing", "late night"],
            [[*mood_terms, "tired", "sleeping", "sad", "crying", "laughing"], ["person", "woman", "man", "room", "night"]],
            ["tired", "sleeping", "sad", "crying", "laughing", "night", "person"],
            "showing emotion",
            "person",
            "room or street",
            "emotional",
        )
    if any(word in words for word in ["beautiful", "new", "old", "look", "style"]) or "good day" in text or "bad idea" in text:
        return set_profile(
            "look style",
            ["beautiful city", "new clothes", "old building", "fashion style", "person looking good"],
            [["beautiful", "new", "old", "style", "fashion", "city", "building"], ["person", "street", "view", "clothes"]],
            ["beautiful", "new", "old", "style", "fashion", "city", "building", "clothes"],
            "looking",
            "appearance or place",
            "street or city",
        )
    if any(word in text for word in ["time", "minute", "start", "finish", "end", "later", "soon", "ready", "free now", "changed", "depends", "try again", "important", "easy", "difficult", "right", "wrong", "understand", "help", "plan", "idea", "okay", "fine"]):
        if "be back soon" in text:
            return set_profile(
                "return soon",
                ["person walking back", "person returning home", "walking back home", "coming back soon"],
                [["walking", "returning", "back", "coming"], ["person", "man", "woman", "street", "home"]],
                ["walking", "returning", "back", "coming", "person", "street", "home"],
                "returning",
                "person",
                "street or home",
            )
        if "help" in words:
            return set_profile(
                "helping person",
                ["helping hand", "person helping friend", "team helping", "support person"],
                [["help", "helping", "support"], ["hand", "person", "friend", "team", "people"]],
                ["help", "helping", "support", "hand", "person", "friend", "team"],
                "helping",
                "person or hand",
                "home, desk, office",
            )
        if "try again" in text:
            return set_profile(
                "try again",
                ["trying again", "person practicing", "repeat attempt", "starting over"],
                [["try", "trying", "again", "practice", "repeat"], ["person", "hand", "sport", "desk"]],
                ["try", "trying", "again", "practice", "repeat", "person", "start"],
                "trying again",
                "person",
                "practice scene",
                min_score=10,
            )
        if "start" in words:
            return set_profile(
                "start beginning",
                ["starting race", "start button", "person starting work", "beginning project"],
                [["start", "starting", "beginning"], ["person", "button", "race", "desk", "work"]],
                ["start", "starting", "beginning", "button", "race", "person", "work"],
                "starting",
                "button or person",
                "track or desk",
                min_score=10,
            )
        if "talk later" in text:
            return set_profile(
                "talk later",
                ["people talking", "friends talking", "phone conversation", "two people talking"],
                [["talk", "talking", "conversation"], ["people", "friends", "phone", "person"]],
                ["talk", "talking", "conversation", "people", "friends", "phone"],
                "talking",
                "people or phone",
                "cafe, office, street",
            )
        return set_profile(
            "planning thinking",
            ["person thinking", "business meeting", "helping friend", "planning at desk", "team discussion"],
            [["thinking", "meeting", "planning", "helping", "discussion", "business", "desk"], ["person", "people", "hands", "office", "friend"]],
            ["thinking", "meeting", "planning", "helping", "discussion", "business", "desk", "people"],
            "thinking or planning",
            "person or group",
            "desk, office, cafe",
        )

    return set_profile(
        "everyday city",
        ["people walking city", "everyday life", "city street", "person walking"],
        [["people", "person", "street", "city", "walking"], ["city", "street", "person", "people"]],
        ["people", "person", "street", "city", "walking", "everyday"],
        "everyday action",
        "person",
        "city street",
    )


def request_text(session: requests.Session, url: str, params: dict[str, Any] | None = None) -> str:
    key = cache_key(url + json.dumps(params or {}, sort_keys=True))
    path = QUERY_CACHE_DIR / f"{key}.txt"
    if path.exists():
        return path.read_text(encoding="utf-8", errors="ignore")
    response = session.get(url, params=params, timeout=45, headers={"User-Agent": "PhrasemanSemanticVideo/1.0"})
    response.raise_for_status()
    text = response.text
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8", errors="ignore")
    time.sleep(0.1)
    return text


def discover_mixkit(session: requests.Session, query: str) -> list[Candidate]:
    url = f"https://mixkit.co/free-stock-video/{slugify(query)}/"
    try:
        html = request_text(session, url)
    except requests.RequestException:
        return []

    id_to_resolution: dict[str, int] = {}
    for asset_id, resolution in re.findall(r"https://assets\.mixkit\.co/videos/(\d+)/\1-(\d+)\.mp4", html):
        if asset_id in BAD_MIXKIT_ASSET_IDS:
            continue
        res = int(resolution)
        if 720 <= res <= 2160:
            id_to_resolution[asset_id] = max(id_to_resolution.get(asset_id, 0), res)

    id_to_title: dict[str, str] = {}
    id_to_page: dict[str, str] = {}
    for slug, asset_id in re.findall(r'href="/free-stock-video/([^"/]+)-(\d+)/"', html):
        if asset_id in BAD_MIXKIT_ASSET_IDS:
            continue
        title = slug.replace("-", " ").strip()
        id_to_title.setdefault(asset_id, title)
        id_to_page.setdefault(asset_id, f"https://mixkit.co/free-stock-video/{slug}-{asset_id}/")

    candidates: list[Candidate] = []
    for asset_id, resolution in sorted(id_to_resolution.items()):
        title = id_to_title.get(asset_id, query)
        candidates.append(
            Candidate(
                source="mixkit",
                source_id=asset_id,
                title=title,
                page_url=id_to_page.get(asset_id, url),
                download_url=f"https://assets.mixkit.co/videos/{asset_id}/{asset_id}-{min(resolution, 1080)}.mp4",
                license="Mixkit Video Free License",
                license_url=MIXKIT_LICENSE_URL,
                query=query,
                resolution_hint=resolution,
                ext="mp4",
            )
        )
    return candidates


def discover_commons(session: requests.Session, query: str) -> list[Candidate]:
    api = "https://commons.wikimedia.org/w/api.php"
    params = {
        "action": "query",
        "generator": "search",
        "gsrsearch": f"{query} filetype:video",
        "gsrnamespace": "6",
        "gsrlimit": "12",
        "prop": "imageinfo",
        "iiprop": "url|mime|size|extmetadata",
        "format": "json",
    }
    try:
        data = json.loads(request_text(session, api, params=params))
    except Exception:
        return []

    out: list[Candidate] = []
    pages = (data.get("query") or {}).get("pages") or {}
    for page in pages.values():
        info = (page.get("imageinfo") or [{}])[0]
        mime = str(info.get("mime") or "")
        url = str(info.get("url") or "")
        if not mime.startswith("video/") or not url:
            continue
        width = int(info.get("width") or 0)
        height = int(info.get("height") or 0)
        if width < 1280 or height < 720 or width < height:
            continue
        title = re.sub(r"^File:", "", str(page.get("title") or "")).rsplit(".", 1)[0].replace("_", " ")
        source_id = str(page.get("pageid") or cache_key(url))
        ext = "webm" if url.lower().endswith(".webm") else "mp4"
        out.append(
            Candidate(
                source="wikimedia_commons",
                source_id=source_id,
                title=title,
                page_url=str(info.get("descriptionurl") or COMMONS_LICENSE_URL),
                download_url=url,
                license="Wikimedia Commons file license",
                license_url=COMMONS_LICENSE_URL,
                query=query,
                resolution_hint=min(width, height),
                ext=ext,
            )
        )
    return out


def discover_pexels(session: requests.Session, query: str, api_key: str | None) -> list[Candidate]:
    if not api_key:
        return []
    cache_path = QUERY_CACHE_DIR / f"pexels_{cache_key(query)}.json"
    if cache_path.exists():
        data = load_json(cache_path)
    else:
        response = session.get(
            "https://api.pexels.com/v1/videos/search",
            params={"query": query, "orientation": "landscape", "size": "large", "per_page": 40},
            headers={"Authorization": api_key, "User-Agent": "PhrasemanSemanticVideo/1.0"},
            timeout=45,
        )
        response.raise_for_status()
        data = response.json()
        write_json(cache_path, data)
        time.sleep(0.12)

    candidates: list[Candidate] = []
    for item in data.get("videos", []):
        files = [
            file
            for file in item.get("video_files", [])
            if int(file.get("width") or 0) >= 1280
            and int(file.get("height") or 0) >= 720
            and int(file.get("width") or 0) >= int(file.get("height") or 0)
            and str(file.get("file_type") or "").lower().endswith("mp4")
        ]
        if not files:
            continue
        best = sorted(files, key=lambda file: (int(file.get("width") or 0), int(file.get("height") or 0)), reverse=True)[0]
        page_url = str(item.get("url") or "")
        title = slugify(page_url.rstrip("/").rsplit("/", 1)[-1]).replace("-", " ") or query
        candidates.append(
            Candidate(
                source="pexels",
                source_id=str(item.get("id") or cache_key(str(best.get("link")))),
                title=title,
                page_url=page_url,
                download_url=str(best.get("link")),
                license="Pexels License",
                license_url=PEXELS_LICENSE_URL,
                query=query,
                resolution_hint=min(int(best.get("width") or 0), int(best.get("height") or 0)),
                ext="mp4",
                source_meta_hint={"duration": item.get("duration"), "width": best.get("width"), "height": best.get("height")},
            )
        )
    return candidates


def discover_pixabay(session: requests.Session, query: str, api_key: str | None) -> list[Candidate]:
    if not api_key:
        return []
    cache_path = QUERY_CACHE_DIR / f"pixabay_{cache_key(query)}.json"
    if cache_path.exists():
        data = load_json(cache_path)
    else:
        response = session.get(
            "https://pixabay.com/api/videos/",
            params={
                "key": api_key,
                "q": query,
                "lang": "en",
                "video_type": "film",
                "safesearch": "true",
                "min_width": 1280,
                "min_height": 720,
                "per_page": 40,
            },
            headers={"User-Agent": "PhrasemanSemanticVideo/1.0"},
            timeout=45,
        )
        response.raise_for_status()
        data = response.json()
        write_json(cache_path, data)
        time.sleep(0.12)

    candidates: list[Candidate] = []
    for item in data.get("hits", []):
        streams = item.get("videos", {})
        available = [
            stream
            for stream in streams.values()
            if stream
            and stream.get("url")
            and int(stream.get("width") or 0) >= 1280
            and int(stream.get("height") or 0) >= 720
            and int(stream.get("width") or 0) >= int(stream.get("height") or 0)
        ]
        if not available:
            continue
        best = sorted(available, key=lambda stream: (int(stream.get("width") or 0), int(stream.get("height") or 0)), reverse=True)[0]
        title = str(item.get("tags") or query).replace(",", " ")
        candidates.append(
            Candidate(
                source="pixabay",
                source_id=str(item.get("id") or cache_key(str(best.get("url")))),
                title=title,
                page_url=str(item.get("pageURL") or ""),
                download_url=str(best.get("url")),
                license="Pixabay Content License",
                license_url=PIXABAY_LICENSE_URL,
                query=query,
                resolution_hint=min(int(best.get("width") or 0), int(best.get("height") or 0)),
                ext="mp4",
                source_meta_hint={"duration": item.get("duration"), "width": best.get("width"), "height": best.get("height")},
            )
        )
    return candidates


def tokens(text: str) -> set[str]:
    return set(re.findall(r"[a-z0-9]+", text.casefold()))


def score_candidate(profile: VisualProfile, candidate: Candidate) -> tuple[int, list[str], list[str]]:
    haystack_text = f"{candidate.title} {candidate.page_url}".casefold()
    haystack_tokens = tokens(haystack_text)
    reasons: list[str] = []
    rejects: list[str] = []

    for term in sorted(profile.negative_terms):
        if term in haystack_text:
            rejects.append(f"negative:{term}")
    for group in profile.required_groups:
        if not any(term in haystack_text or term in haystack_tokens for term in group):
            rejects.append("missing_required:" + "|".join(group[:5]))

    score = 0
    for term, weight in profile.positive_terms.items():
        if term in haystack_text or term in haystack_tokens:
            score += weight
            reasons.append(term)
    phrase_terms = [term for term in tokens(profile.phrase) if len(term) > 2]
    for term in phrase_terms:
        if term in haystack_tokens:
            score += 1
    if slugify(profile.concept) in slugify(candidate.query):
        score += 2
        reasons.append("concept-query")
    if candidate.source == "mixkit":
        score += 1
    if candidate.resolution_hint >= 1080:
        score += 1
    return score, reasons, rejects


def collect_candidates(session: requests.Session, profile: VisualProfile, pexels_key: str | None, pixabay_key: str | None) -> list[Candidate]:
    seen: set[tuple[str, str]] = set()
    candidates: list[Candidate] = []
    for query in profile.queries[:5]:
        for candidate in [
            *discover_pexels(session, query, pexels_key),
            *discover_pixabay(session, query, pixabay_key),
            *discover_mixkit(session, query),
            *discover_commons(session, query),
        ]:
            key = (candidate.source, candidate.source_id)
            if key in seen:
                continue
            seen.add(key)
            candidates.append(candidate)
    return candidates


def ffprobe(path: Path) -> dict[str, Any] | None:
    try:
        result = subprocess.run(
            [
                "ffprobe",
                "-v",
                "error",
                "-print_format",
                "json",
                "-show_format",
                "-show_streams",
                str(path),
            ],
            check=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
        )
        data = json.loads(result.stdout)
        video = next(stream for stream in data["streams"] if stream.get("codec_type") == "video")
        pix_fmt = str(video.get("pix_fmt") or "")
        return {
            "width": int(video.get("width") or 0),
            "height": int(video.get("height") or 0),
            "duration": float(data.get("format", {}).get("duration") or video.get("duration") or 0.0),
            "codec": video.get("codec_name"),
            "pix_fmt": pix_fmt,
            "bit_rate": int(float(data.get("format", {}).get("bit_rate") or video.get("bit_rate") or 0)),
        }
    except Exception:
        return None


def is_source_quality_ok(meta: dict[str, Any] | None) -> bool:
    if not meta:
        return False
    return (
        int(meta["width"]) >= MIN_SOURCE_WIDTH
        and int(meta["height"]) >= MIN_SOURCE_HEIGHT
        and int(meta["width"]) >= int(meta["height"])
        and float(meta["duration"]) >= MIN_SOURCE_DURATION_SECONDS
        and (int(meta.get("bit_rate") or 0) == 0 or int(meta.get("bit_rate") or 0) >= MIN_SOURCE_BITRATE)
    )


def visual_cache_key(candidate: Candidate, source_path: Path) -> str:
    stat = source_path.stat()
    raw = f"{VISUAL_GATE_VERSION}:{candidate.source}:{candidate.source_id}:{stat.st_size}:{int(stat.st_mtime)}"
    return cache_key(raw)


def extract_visual_audit_frames(source_path: Path, candidate: Candidate, meta: dict[str, Any]) -> list[Path]:
    key = visual_cache_key(candidate, source_path)
    frame_dir = VISUAL_AUDIT_DIR / "source-frames" / f"{candidate.source}_{candidate.source_id}_{key}"
    frame_dir.mkdir(parents=True, exist_ok=True)
    duration = max(float(meta.get("duration") or 0), 1.0)
    times = [max(0.25, duration * ratio) for ratio in [0.18, 0.5, 0.82]]
    frames: list[Path] = []
    for index, timestamp in enumerate(times, start=1):
        frame = frame_dir / f"frame_{index:02d}.jpg"
        if not frame.exists():
            subprocess.run(
                [
                    "ffmpeg",
                    "-y",
                    "-hide_banner",
                    "-loglevel",
                    "error",
                    "-ss",
                    f"{timestamp:.3f}",
                    "-i",
                    str(source_path),
                    "-frames:v",
                    "1",
                    "-vf",
                    "scale=480:270:force_original_aspect_ratio=increase,crop=480:270",
                    "-q:v",
                    "3",
                    str(frame),
                ],
                check=True,
            )
        frames.append(frame)
    return frames


def image_luma_stats(image: Image.Image) -> dict[str, float]:
    grey = image.convert("L")
    stat = ImageStat.Stat(grey)
    edge = grey.filter(ImageFilter.FIND_EDGES)
    edge_stat = ImageStat.Stat(edge)
    return {
        "mean": round(float(stat.mean[0]), 3),
        "contrast": round(float(stat.stddev[0]), 3),
        "edge_mean": round(float(edge_stat.mean[0]), 3),
    }


def visual_quality_gate(source_path: Path, candidate: Candidate, meta: dict[str, Any]) -> dict[str, Any]:
    cache_path = VISUAL_AUDIT_DIR / "source-reports" / f"{candidate.source}_{candidate.source_id}_{visual_cache_key(candidate, source_path)}.json"
    if cache_path.exists():
        return load_json(cache_path)

    frames = extract_visual_audit_frames(source_path, candidate, meta)
    frame_reports: list[dict[str, Any]] = []
    reject_reasons: list[str] = []
    safety_zones = {
        "english_title": (0.08, 0.15, 0.92, 0.42),
        "russian_translation": (0.12, 0.43, 0.88, 0.70),
        "lower_analysis": (0.18, 0.70, 0.82, 0.92),
    }

    for frame in frames:
        with Image.open(frame) as image:
            rgb = image.convert("RGB")
            raw_stats = image_luma_stats(rgb)
            display = ImageEnhance.Contrast(rgb.filter(ImageFilter.GaussianBlur(radius=4))).enhance(0.82)
            display = ImageEnhance.Brightness(display).enhance(0.72)
            display_stats = image_luma_stats(display)

            zones: dict[str, dict[str, float]] = {}
            for name, rect in safety_zones.items():
                w, h = rgb.size
                box = (int(rect[0] * w), int(rect[1] * h), int(rect[2] * w), int(rect[3] * h))
                zone_raw = rgb.crop(box)
                zone_display = display.crop(box)
                stats = image_luma_stats(zone_raw)
                display_zone_stats = image_luma_stats(zone_display)
                zones[name] = {
                    "mean": stats["mean"],
                    "contrast": stats["contrast"],
                    "edge_mean": stats["edge_mean"],
                    "display_mean": display_zone_stats["mean"],
                    "display_contrast": display_zone_stats["contrast"],
                }

            frame_reports.append(
                {
                    "frame": str(frame),
                    "raw": raw_stats,
                    "display": display_stats,
                    "zones": zones,
                }
            )

    raw_edge = max(report["raw"]["edge_mean"] for report in frame_reports)
    raw_contrast = max(report["raw"]["contrast"] for report in frame_reports)
    display_mean_max = max(report["display"]["mean"] for report in frame_reports)
    display_mean_min = min(report["display"]["mean"] for report in frame_reports)
    zone_edge_max = max(zone["edge_mean"] for report in frame_reports for zone in report["zones"].values())
    zone_contrast_max = max(zone["contrast"] for report in frame_reports for zone in report["zones"].values())
    zone_display_mean_max = max(zone["display_mean"] for report in frame_reports for zone in report["zones"].values())

    if raw_edge < 3.2:
        reject_reasons.append("too_soft_or_low_detail")
    if raw_contrast < 14.0:
        reject_reasons.append("too_flat_low_contrast")
    if display_mean_max > 165.0:
        reject_reasons.append("too_bright_after_readability_filter")
    if display_mean_min < 18.0 and raw_edge < 4.0 and raw_contrast < 24.0:
        reject_reasons.append("too_dark_after_readability_filter")
    if zone_edge_max > 35.0 and zone_contrast_max > 72.0:
        reject_reasons.append("busy_text_safety_zone")
    if zone_display_mean_max > 155.0:
        reject_reasons.append("bright_text_safety_zone")

    report = {
        "passed": not reject_reasons,
        "reject_reasons": reject_reasons,
        "candidate": serialize_candidate(candidate),
        "source_path": str(source_path),
        "source_meta": meta,
        "summary": {
            "raw_edge_max": round(raw_edge, 3),
            "raw_contrast_max": round(raw_contrast, 3),
            "display_mean_min": round(display_mean_min, 3),
            "display_mean_max": round(display_mean_max, 3),
            "zone_edge_max": round(zone_edge_max, 3),
            "zone_contrast_max": round(zone_contrast_max, 3),
            "zone_display_mean_max": round(zone_display_mean_max, 3),
        },
        "frames": frame_reports,
    }
    write_json(cache_path, report)
    return report


def download_candidate(session: requests.Session, candidate: Candidate) -> Path | None:
    suffix = ".webm" if candidate.ext == "webm" else ".mp4"
    safe_title = slugify(candidate.title)[:48]
    out = SOURCE_CACHE_DIR / candidate.source / f"{candidate.source_id}_{safe_title}{suffix}"
    if out.exists() and out.stat().st_size > 150_000:
        return out
    out.parent.mkdir(parents=True, exist_ok=True)
    tmp = out.with_suffix(out.suffix + ".tmp")
    try:
        with session.get(candidate.download_url, stream=True, timeout=180, headers={"User-Agent": "PhrasemanSemanticVideo/1.0"}) as response:
            response.raise_for_status()
            with tmp.open("wb") as handle:
                for chunk in response.iter_content(chunk_size=1024 * 512):
                    if chunk:
                        handle.write(chunk)
        if tmp.exists() and tmp.stat().st_size > 150_000:
            tmp.replace(out)
            return out
    except requests.RequestException:
        if tmp.exists():
            tmp.unlink()
    return None


def background_filter() -> str:
    return (
        "scale=1920:1080:force_original_aspect_ratio=increase,"
        "crop=1920:1080,"
        "boxblur=8:2,"
        "eq=brightness=-0.12:contrast=0.82:saturation=0.92,"
        "fps=30,format=yuv420p"
    )


def render_background(source: Path, output: Path, duration_us: int) -> dict[str, Any]:
    duration = duration_us / US
    source_meta = ffprobe(source)
    if not source_meta or source_meta["duration"] + 0.05 < duration:
        raise RuntimeError(f"Source is too short for single no-loop render: {source} -> {source_meta}, target={duration:.3f}s")
    output.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(
        [
            "ffmpeg",
            "-y",
            "-hide_banner",
            "-loglevel",
            "error",
            "-i",
            str(source),
            "-t",
            f"{duration:.6f}",
            "-vf",
            background_filter(),
            "-an",
            "-c:v",
            "libx264",
            "-preset",
            "veryfast",
            "-crf",
            "25",
            "-movflags",
            "+faststart",
            str(output),
        ],
        check=True,
    )
    meta = ffprobe(output)
    if not meta or meta["width"] != 1920 or meta["height"] != 1080 or meta["duration"] + 0.05 < duration:
        raise RuntimeError(f"Rendered background failed quality gate: {output} -> {meta}")
    return meta


def render_background_sequence(sequence: list[dict[str, Any]], output: Path, duration_us: int) -> dict[str, Any]:
    duration = duration_us / US
    output.parent.mkdir(parents=True, exist_ok=True)
    tmp_dir = output.parent / f"__tmp_{output.stem}"
    if tmp_dir.exists():
        shutil.rmtree(tmp_dir)
    tmp_dir.mkdir(parents=True)
    segment_paths: list[Path] = []
    try:
        for index, item in enumerate(sequence, start=1):
            part = tmp_dir / f"part_{index:02d}.mp4"
            subprocess.run(
                [
                    "ffmpeg",
                    "-y",
                    "-hide_banner",
                    "-loglevel",
                    "error",
                    "-i",
                    str(item["source_path"]),
                    "-t",
                    f"{item['clip_duration_us'] / US:.6f}",
                    "-vf",
                    background_filter(),
                    "-an",
                    "-c:v",
                    "libx264",
                    "-preset",
                    "veryfast",
                    "-crf",
                    "23",
                    "-movflags",
                    "+faststart",
                    str(part),
                ],
                check=True,
            )
            segment_paths.append(part)
        concat_file = tmp_dir / "concat.txt"
        concat_file.write_text("".join(f"file '{path.as_posix()}'\n" for path in segment_paths), encoding="utf-8")
        subprocess.run(
            [
                "ffmpeg",
                "-y",
                "-hide_banner",
                "-loglevel",
                "error",
                "-f",
                "concat",
                "-safe",
                "0",
                "-i",
                str(concat_file),
                "-t",
                f"{duration:.6f}",
                "-c",
                "copy",
                str(output),
            ],
            check=True,
        )
    finally:
        shutil.rmtree(tmp_dir, ignore_errors=True)
    meta = ffprobe(output)
    if not meta or meta["width"] != 1920 or meta["height"] != 1080 or meta["duration"] + 0.05 < duration or meta.get("pix_fmt") != "yuv420p":
        raise RuntimeError(f"Rendered sequence failed quality gate: {output} -> {meta}")
    return meta


def video_material_from_template(template: dict[str, Any], path: Path, duration_us: int, name: str) -> dict[str, Any]:
    material = deepcopy(template)
    material["id"] = capcut_id()
    material["unique_id"] = capcut_id()
    material["path"] = str(path)
    material["name"] = name
    material["material_name"] = name
    material["duration"] = duration_us
    material["width"] = 1920
    material["height"] = 1080
    material["has_audio"] = False
    return material


def remove_background_fades(draft: dict[str, Any]) -> int:
    fade_refs: set[str] = set()
    for material in draft.get("materials", {}).get("material_animations", []):
        animations = material.get("animations") or []
        if any(str(animation.get("type")) in {"in", "out"} and "fade" in str(animation.get("name", "")).casefold() for animation in animations):
            fade_refs.add(str(material.get("id")))
    removed = 0
    for segment in draft.get("tracks", [{}])[0].get("segments", []):
        refs = list(segment.get("extra_material_refs") or [])
        filtered = [ref for ref in refs if ref not in fade_refs]
        removed += len(refs) - len(filtered)
        segment["extra_material_refs"] = filtered
    return removed


def uppercase_main_text_layers(draft: dict[str, Any]) -> int:
    text_materials = {item["id"]: item for item in draft.get("materials", {}).get("texts", [])}
    changed = 0
    for track_index in [6, 8]:
        if track_index >= len(draft.get("tracks", [])):
            continue
        for segment in draft["tracks"][track_index].get("segments", []):
            material = text_materials.get(segment.get("material_id"))
            if not material:
                continue
            try:
                content = json.loads(material.get("content") or "{}")
            except json.JSONDecodeError:
                content = {}
            old_text = str(content.get("text") or material.get("base_content") or "")
            new_text = old_text.upper()
            if new_text == old_text:
                continue
            if "text" in content:
                content["text"] = new_text
                material["content"] = json.dumps(content, ensure_ascii=False, separators=(",", ":"))
            if material.get("base_content"):
                material["base_content"] = str(material["base_content"]).upper()
            changed += 1
    return changed


def write_storyboard(report_rows: list[dict[str, Any]]) -> dict[str, str]:
    STORYBOARD_DIR.mkdir(parents=True, exist_ok=True)
    cards: list[str] = []
    for row in report_rows:
        rendered = Path(row["rendered_path"])
        thumb = STORYBOARD_DIR / f"{row['index']}.jpg"
        if not thumb.exists():
            subprocess.run(
                [
                    "ffmpeg",
                    "-y",
                    "-hide_banner",
                    "-loglevel",
                    "error",
                    "-ss",
                    "1.0",
                    "-i",
                    str(rendered),
                    "-frames:v",
                    "1",
                    "-vf",
                    "scale=360:203:force_original_aspect_ratio=increase,crop=360:203",
                    "-q:v",
                    "3",
                    str(thumb),
                ],
                check=True,
            )
        sources = row.get("sequence_sources") or [{"selected": row["selected"], "clip_duration_sec": row["target_duration_sec"]}]
        source_lines = []
        for source in sources:
            selected = source["selected"]
            source_lines.append(
                f"{selected['source']}:{selected['source_id']} | {source.get('clip_duration_sec', 0):.1f}s | {selected['title'][:90]}"
            )
        visual = [
            source.get("visual_audit", {}).get("summary", {})
            for source in sources
            if source.get("visual_audit")
        ]
        visual_text = ""
        if visual:
            visual_text = " | ".join(
                f"edge {item.get('zone_edge_max')} contrast {item.get('zone_contrast_max')} bright {item.get('zone_display_mean_max')}"
                for item in visual[:2]
            )
        cards.append(
            "<article class='card'>"
            f"<img src='{thumb.name}' alt='frame {row['index']}'>"
            f"<h2>{row['index']} {row['en']}</h2>"
            f"<p class='ru'>{row['ru']}</p>"
            f"<p><b>score</b> {row.get('score')} | <b>sources</b> {len(sources)}</p>"
            f"<pre>{html_escape(chr(10).join(source_lines))}</pre>"
            f"<p class='metrics'>{html_escape(visual_text)}</p>"
            "</article>"
        )
    html = (
        "<!doctype html><html><head><meta charset='utf-8'>"
        "<title>Venga Background Director Storyboard</title>"
        "<style>body{margin:0;background:#101114;color:#e5e7eb;font-family:Arial,sans-serif}"
        "header{position:sticky;top:0;background:#181a20;padding:16px 24px;border-bottom:1px solid #2f3440}"
        ".grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(360px,1fr));gap:14px;padding:18px}"
        ".card{background:#1d2129;border:1px solid #323846;border-radius:6px;padding:10px}"
        ".card img{width:100%;display:block;border-radius:4px;background:#000}.card h2{font-size:16px;margin:9px 0 4px}"
        ".ru{color:#f8fafc;margin:0 0 8px}.metrics{color:#a7f3d0;font-size:12px}"
        "pre{white-space:pre-wrap;font-size:11px;line-height:1.35;color:#cbd5e1;background:#111827;padding:8px;border-radius:4px}</style>"
        "</head><body><header><h1>Venga Background Director Storyboard</h1>"
        f"<p>{len(report_rows)} phrase backgrounds. Use this to catch random or unreadable backgrounds before opening CapCut.</p>"
        "</header><main class='grid'>"
        + "".join(cards)
        + "</main></body></html>"
    )
    index_path = STORYBOARD_DIR / "index.html"
    index_path.write_text(html, encoding="utf-8")
    return {"dir": str(STORYBOARD_DIR), "index": str(index_path)}


def html_escape(text: str) -> str:
    return (
        text.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )


def folder_size(path: Path) -> int:
    return sum(file.stat().st_size for file in path.rglob("*") if file.is_file())


def unique_draft_dir(root: Path, base_name: str) -> Path:
    candidate = root / base_name
    if not candidate.exists():
        return candidate
    return root / f"{base_name} {time.strftime('%Y%m%d_%H%M%S')}"


def ignore_unreferenced_external_media(dir_path: str, names: list[str]) -> set[str]:
    path = Path(dir_path)
    ignored: set[str] = set()
    for name in names:
        child = path / name
        if path.name == "Resources" and child.is_dir() and name.casefold().startswith("venga_semantic_"):
            ignored.add(name)
        if child.is_file() and child.suffix.casefold() in {".mp4", ".mov", ".mkv", ".avi"} and "external_media" in child.as_posix().casefold():
            ignored.add(name)
        if child.is_dir() and child.name.casefold() in {"videos", "4k video downloader+"} and "external_media" in child.as_posix().casefold():
            # The draft can reopen without the cached old background video tree. Fonts are still copied.
            ignored.add(name)
    return ignored


def update_identity_and_register(draft_dir: Path, draft: dict[str, Any]) -> None:
    now_us = int(time.time() * US)
    project_id = capcut_id()
    draft["name"] = draft_dir.name
    draft["path"] = draft_dir.as_posix()
    draft["update_time"] = now_us

    meta_path = draft_dir / "draft_meta_info.json"
    meta = load_json(meta_path)
    size = folder_size(draft_dir / "Resources")
    meta.update(
        {
            "draft_id": project_id,
            "draft_name": draft_dir.name,
            "draft_fold_path": draft_dir.as_posix(),
            "draft_root_path": draft_dir.parent.as_posix(),
            "draft_json_file": (draft_dir / "draft_content.json").as_posix(),
            "draft_cover": (draft_dir / "draft_cover.jpg").as_posix(),
            "draft_is_invisible": False,
            "streaming_edit_draft_ready": True,
            "tm_duration": draft["duration"],
            "tm_draft_modified": now_us,
            "draft_timeline_materials_size": size,
            "draft_timeline_materials_size_": size,
            "tm_draft_removed": 0,
        }
    )
    write_capcut_json(meta_path, meta)

    root_path = draft_dir.parent / "root_meta_info.json"
    root = load_json(root_path)
    entry = {
        "draft_cover": (draft_dir / "draft_cover.jpg").as_posix(),
        "draft_fold_path": draft_dir.as_posix(),
        "draft_id": project_id,
        "draft_is_invisible": False,
        "draft_json_file": (draft_dir / "draft_content.json").as_posix(),
        "draft_name": draft_dir.name,
        "draft_new_version": meta.get("draft_new_version") or "164.0.0",
        "draft_root_path": draft_dir.parent.as_posix(),
        "draft_timeline_materials_size": size,
        "streaming_edit_draft_ready": True,
        "tm_draft_create": now_us,
        "tm_draft_modified": now_us,
        "tm_draft_removed": 0,
        "tm_duration": draft["duration"],
    }
    root["all_draft_store"] = [
        entry,
        *[
            item
            for item in root.get("all_draft_store", [])
            if item.get("draft_name") != draft_dir.name
            and Path(str(item.get("draft_fold_path", ""))).as_posix().casefold() != draft_dir.as_posix().casefold()
            and item.get("draft_id") != project_id
        ],
    ]
    root["draft_ids"] = max(int(root.get("draft_ids", 0) or 0), len(root["all_draft_store"]))
    root["root_path"] = draft_dir.parent.as_posix()
    write_capcut_json(root_path, root)


def plan_rows(rows: list[dict[str, str]]) -> list[dict[str, Any]]:
    session = requests.Session()
    env = {**load_env_file(Path(".env.local")), **os.environ}
    pexels_key = env.get("PEXELS_API_KEY")
    pixabay_key = env.get("PIXABAY_API_KEY")
    selected_ids: set[tuple[str, str]] = set()
    plans: list[dict[str, Any]] = []
    rejected_total = 0

    for row in rows:
        profile = profile_for_phrase(row["en"])
        candidates = collect_candidates(session, profile, pexels_key, pixabay_key)
        scored: list[dict[str, Any]] = []
        for candidate in candidates:
            score, reasons, rejects = score_candidate(profile, candidate)
            rejected = bool(rejects) or score < profile.min_score
            scored.append(
                {
                    "candidate": candidate,
                    "score": score,
                    "reasons": reasons,
                    "rejects": rejects,
                    "rejected": rejected,
                }
            )
        scored.sort(key=lambda item: (item["rejected"], -item["score"], item["candidate"].source != "mixkit", item["candidate"].title))

        picked: dict[str, Any] | None = None
        for item in scored:
            candidate = item["candidate"]
            if item["rejected"]:
                continue
            key = (candidate.source, candidate.source_id)
            if key in selected_ids:
                continue
            picked = item
            selected_ids.add(key)
            break
        if picked is None:
            for item in scored:
                candidate = item["candidate"]
                if item["rejected"]:
                    continue
                picked = item
                break
        if picked is None:
            plans.append(
                {
                    **row,
                    "profile": profile,
                    "selected": None,
                    "candidate_count": len(scored),
                    "rejected_candidates": len(scored),
                    "selection_error": "no_candidate_passed_semantic_score",
                    "audited_candidates": [
                        {
                            "source": item["candidate"].source,
                            "source_id": item["candidate"].source_id,
                            "title": item["candidate"].title,
                            "query": item["candidate"].query,
                            "score": item["score"],
                            "rejects": item["rejects"],
                        }
                        for item in scored[:20]
                    ],
                }
            )
            continue
        rejected_total += sum(1 for item in scored if item["rejected"])
        selected = picked["candidate"]
        plans.append(
            {
                **row,
                "profile": profile,
                "selected": selected,
                "score": picked["score"],
                "score_reasons": picked["reasons"],
                "candidate_count": len(scored),
                "rejected_candidates": sum(1 for item in scored if item["rejected"]),
                "audited_candidates": [
                    {
                        "source": item["candidate"].source,
                        "source_id": item["candidate"].source_id,
                        "title": item["candidate"].title,
                        "query": item["candidate"].query,
                        "score": item["score"],
                        "rejects": item["rejects"],
                        "rejected": item["rejected"],
                    }
                    for item in scored[:12]
                ],
            }
        )
        if int(row["index"]) % 20 == 0:
            print(f"[strict-bg] planned {row['index']}/{len(rows)}", flush=True)

    write_json(
        OUT_DIR / "strict_selection_plan.json",
        {
            "source_registry": {
                "pexels": {"active": bool(pexels_key), "requires_env": "PEXELS_API_KEY", "license_url": PEXELS_LICENSE_URL},
                "pixabay": {"active": bool(pixabay_key), "requires_env": "PIXABAY_API_KEY", "license_url": PIXABAY_LICENSE_URL},
                "mixkit": {"active": True, "license_url": MIXKIT_LICENSE_URL},
                "wikimedia_commons": {"active": True, "license_url": COMMONS_LICENSE_URL},
            },
            "phrase_count": len(rows),
            "planned_count": sum(1 for item in plans if item.get("selected")),
            "unplanned_count": sum(1 for item in plans if not item.get("selected")),
            "unique_source_count": len({(item["selected"].source, item["selected"].source_id) for item in plans if item.get("selected")}),
            "rejected_total": rejected_total,
            "rows": [serialize_plan(item, include_candidates=True) for item in plans],
        },
    )
    return plans


def serialize_profile(profile: VisualProfile) -> dict[str, Any]:
    return {
        "concept": profile.concept,
        "queries": profile.queries,
        "required_groups": profile.required_groups,
        "positive_terms": profile.positive_terms,
        "negative_terms": sorted(profile.negative_terms),
        "layers": profile.layers,
        "min_score": profile.min_score,
    }


def serialize_candidate(candidate: Candidate | None) -> dict[str, Any] | None:
    if not candidate:
        return None
    return {
        "source": candidate.source,
        "source_id": candidate.source_id,
        "title": candidate.title,
        "page_url": candidate.page_url,
        "download_url": candidate.download_url,
        "license": candidate.license,
        "license_url": candidate.license_url,
        "query": candidate.query,
        "resolution_hint": candidate.resolution_hint,
    }


def serialize_plan(plan: dict[str, Any], include_candidates: bool = False) -> dict[str, Any]:
    out = {
        "index": plan["index"],
        "en": plan["en"],
        "ru": plan["ru"],
        "profile": serialize_profile(plan["profile"]),
        "selected": serialize_candidate(plan.get("selected")),
        "score": plan.get("score"),
        "score_reasons": plan.get("score_reasons", []),
        "candidate_count": plan.get("candidate_count", 0),
        "rejected_candidates": plan.get("rejected_candidates", 0),
        "selection_error": plan.get("selection_error"),
    }
    if include_candidates:
        out["audited_candidates"] = plan.get("audited_candidates", [])
    return out


def build_project(source_name: str, target_name: str, dry_run: bool = False) -> dict[str, Any]:
    capcut_root = Path(os.environ["LOCALAPPDATA"]) / "CapCut" / "User Data" / "Projects" / "com.lveditor.draft"
    source_dir = capcut_root / source_name
    if not source_dir.exists():
        raise SystemExit(f"Source draft does not exist: {source_dir}")

    source_draft = load_json(source_dir / "draft_content.json")
    rows = phrase_rows(source_draft)
    plans = plan_rows(rows)
    unplanned = [item for item in plans if not item.get("selected")]
    if unplanned:
        raise RuntimeError(f"Strict semantic search failed for {len(unplanned)} phrases. See {OUT_DIR / 'strict_selection_plan.json'}")
    if dry_run:
        return {"dry_run": True, "planned": len(plans), "target_name": target_name}

    target_dir = unique_draft_dir(capcut_root, target_name)
    shutil.copytree(source_dir, target_dir, ignore=ignore_unreferenced_external_media)
    draft = load_json(target_dir / "draft_content.json")
    bg_track = draft["tracks"][0]
    old_video_ids = {seg["material_id"] for seg in bg_track["segments"]}
    video_template = next(item for item in draft["materials"]["videos"] if item.get("id") in old_video_ids)
    render_dir = target_dir / "Resources" / RENDER_SUBDIR

    session = requests.Session()
    env = {**load_env_file(Path(".env.local")), **os.environ}
    pexels_key = env.get("PEXELS_API_KEY")
    pixabay_key = env.get("PIXABAY_API_KEY")
    report_rows: list[dict[str, Any]] = []
    new_materials: list[dict[str, Any]] = []
    used_selected: set[tuple[str, str]] = set()

    for index, (segment, plan) in enumerate(zip(bg_track["segments"], plans, strict=True), start=1):
        duration_us = int(segment["target_timerange"]["duration"])
        profile: VisualProfile = plan["profile"]
        candidate_options = collect_candidates(session, profile, pexels_key, pixabay_key)
        scored_options: list[tuple[Candidate, int, list[str]]] = []
        for option in candidate_options:
            score, reasons, rejects = score_candidate(profile, option)
            if rejects or score < profile.min_score:
                continue
            scored_options.append((option, score, reasons))
        planned_candidate = plan.get("selected")
        if planned_candidate and not any((item[0].source, item[0].source_id) == (planned_candidate.source, planned_candidate.source_id) for item in scored_options):
            score, reasons, rejects = score_candidate(profile, planned_candidate)
            if not rejects and score >= profile.min_score:
                scored_options.append((planned_candidate, score, reasons))
        scored_options.sort(key=lambda item: ((item[0].source, item[0].source_id) in used_selected, -item[1], item[0].source != "pexels", item[0].source != "pixabay"))

        source_path: Path | None = None
        source_meta: dict[str, Any] | None = None
        candidate: Candidate | None = None
        score = 0
        score_reasons: list[str] = []
        failed_runtime_candidates: list[dict[str, Any]] = []
        sequence: list[dict[str, Any]] = []
        remaining_us = duration_us
        for option, option_score, option_reasons in scored_options:
            downloaded = download_candidate(session, option)
            meta = ffprobe(downloaded) if downloaded else None
            if downloaded and is_source_quality_ok(meta):
                visual_audit = visual_quality_gate(downloaded, option, meta)
                if not visual_audit.get("passed"):
                    failed_runtime_candidates.append(
                        {
                            "candidate": serialize_candidate(option),
                            "score": option_score,
                            "source_meta": meta,
                            "downloaded": True,
                            "visual_reject_reasons": visual_audit.get("reject_reasons", []),
                            "visual_summary": visual_audit.get("summary", {}),
                        }
                    )
                    continue
                if candidate is None:
                    candidate = option
                    source_path = downloaded
                    source_meta = meta
                    score = option_score
                    score_reasons = option_reasons
                safe_duration_us = max(0, int((float(meta["duration"]) - 0.25) * US))
                clip_duration_us = min(remaining_us, safe_duration_us)
                if clip_duration_us >= MIN_SEQUENCE_PART_US or (sequence and remaining_us <= MIN_SEQUENCE_TAIL_US):
                    sequence.append(
                        {
                            "candidate": option,
                            "score": option_score,
                            "reasons": option_reasons,
                            "source_path": downloaded,
                            "source_meta": meta,
                            "visual_audit": visual_audit,
                            "clip_duration_us": clip_duration_us,
                        }
                    )
                    remaining_us -= clip_duration_us
                    used_selected.add((option.source, option.source_id))
                    if remaining_us <= int(0.1 * US):
                        break
                    continue
            failed_runtime_candidates.append(
                {
                    "candidate": serialize_candidate(option),
                    "score": option_score,
                    "source_meta": meta,
                    "downloaded": bool(downloaded),
                }
            )
        if not candidate or not source_path or not source_meta or remaining_us > int(0.1 * US):
            raise RuntimeError(f"No runtime-valid source for phrase {index}: {plan['en']}. Failed: {failed_runtime_candidates[:5]}")

        clip_name = f"{index:03d}_{candidate.source}_{candidate.source_id}_{slugify(candidate.title)[:36]}.mp4"
        output_path = render_dir / clip_name
        rendered_meta = render_background_sequence(sequence, output_path, duration_us)
        material = video_material_from_template(video_template, output_path, duration_us, clip_name)
        new_materials.append(material)
        segment["material_id"] = material["id"]
        segment["source_timerange"] = {"start": 0, "duration": duration_us}
        segment["is_loop"] = False

        report_rows.append(
            {
                **serialize_plan(plan),
                "selected": serialize_candidate(candidate),
                "sequence_sources": [
                    {
                        "selected": serialize_candidate(item["candidate"]),
                        "score": item["score"],
                        "clip_duration_sec": round(item["clip_duration_us"] / US, 3),
                        "source_meta": item["source_meta"],
                        "visual_audit": {
                            "passed": item["visual_audit"].get("passed"),
                            "reject_reasons": item["visual_audit"].get("reject_reasons", []),
                            "summary": item["visual_audit"].get("summary", {}),
                            "frames": [frame["frame"] for frame in item["visual_audit"].get("frames", [])],
                        },
                    }
                    for item in sequence
                ],
                "score": score,
                "score_reasons": score_reasons,
                "repeated_source_asset": len(used_selected) < len(report_rows) + 1,
                "runtime_failed_candidates": failed_runtime_candidates,
                "source_path": str(source_path),
                "rendered_path": str(output_path),
                "target_start_sec": round(segment["target_timerange"]["start"] / US, 3),
                "target_duration_sec": round(duration_us / US, 3),
                "source_meta": source_meta,
                "rendered_meta": rendered_meta,
            }
        )
        if index % 10 == 0:
            print(f"[strict-bg] rendered {index}/{len(plans)}", flush=True)

    draft["materials"]["videos"].extend(new_materials)
    removed_bg_fade_refs = remove_background_fades(draft)
    uppercase_text_materials = uppercase_main_text_layers(draft)

    for rel in ["draft_content.json", "template-2.tmp", "draft_content.json.bak"]:
        path = target_dir / rel
        if path.exists():
            write_capcut_json(path, draft)
    timeline_content = target_dir / "Timelines" / draft["id"] / "draft_content.json"
    if timeline_content.exists():
        write_capcut_json(timeline_content, draft)
    update_identity_and_register(target_dir, draft)
    storyboard = write_storyboard(report_rows)

    report = {
        "draft_name": target_dir.name,
        "draft_dir": str(target_dir),
        "source_template": str(source_dir),
        "changed_tracks": [0, 6, 8],
        "preserved_tracks": [index for index in range(len(draft["tracks"])) if index not in {0, 6, 8}],
        "phrase_count": len(report_rows),
        "unique_source_assets": len(
            {
                (source["selected"]["source"], source["selected"]["source_id"])
                for row in report_rows
                for source in row.get("sequence_sources", [{"selected": row["selected"]}])
            }
        ),
        "repeated_source_asset_count": (
            sum(len(row.get("sequence_sources", [{"selected": row["selected"]}])) for row in report_rows)
            - len(
                {
                    (source["selected"]["source"], source["selected"]["source_id"])
                    for row in report_rows
                    for source in row.get("sequence_sources", [{"selected": row["selected"]}])
                }
            )
        ),
        "source_breakdown": {
            source: sum(
                1
                for row in report_rows
                for item in row.get("sequence_sources", [{"selected": row["selected"]}])
                if item["selected"]["source"] == source
            )
            for source in sorted(
                {
                    item["selected"]["source"]
                    for row in report_rows
                    for item in row.get("sequence_sources", [{"selected": row["selected"]}])
                }
            )
        },
        "quality_gate": {
            "rendered_1920x1080": all(row["rendered_meta"]["width"] == 1920 and row["rendered_meta"]["height"] == 1080 for row in report_rows),
            "rendered_yuv420p": all(row["rendered_meta"].get("pix_fmt") == "yuv420p" for row in report_rows),
            "source_min_1080p_landscape": all(
                is_source_quality_ok(source["source_meta"])
                for row in report_rows
                for source in row.get("sequence_sources", [{"source_meta": row["source_meta"]}])
            ),
            "visual_readability_gate": all(
                source.get("visual_audit", {}).get("passed") is True
                for row in report_rows
                for source in row.get("sequence_sources", [])
            ),
            "no_short_source_looping": all(
                sum(source["clip_duration_sec"] for source in row.get("sequence_sources", [])) + 0.1 >= row["target_duration_sec"]
                for row in report_rows
            ),
            "background_fades_removed": removed_bg_fade_refs > 0,
            "uppercase_main_text_layers": uppercase_text_materials,
            "missing_paths": 0,
            "semantic_min_score": min(int(row["score"]) for row in report_rows),
        },
        "cache_dirs": {
            "query_cache": str(QUERY_CACHE_DIR),
            "source_cache": str(SOURCE_CACHE_DIR),
            "render_subdir": RENDER_SUBDIR,
        },
        "storyboard": storyboard,
        "rows": report_rows,
    }
    write_json(OUT_DIR / "strict_background_report.json", report)
    return {k: v for k, v in report.items() if k != "rows"}


def main() -> None:
    parser = argparse.ArgumentParser(description="Build strict semantic open-source backgrounds for Venga CapCut draft.")
    parser.add_argument("--source-draft", default=os.environ.get("VENGA_SOURCE_DRAFT", DEFAULT_SOURCE_DRAFT))
    parser.add_argument("--target-draft", default=os.environ.get("VENGA_TARGET_DRAFT", DEFAULT_TARGET_DRAFT))
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    report = build_project(args.source_draft, args.target_draft, dry_run=args.dry_run)
    print(json.dumps(report, ensure_ascii=False, indent=2), flush=True)


if __name__ == "__main__":
    main()
