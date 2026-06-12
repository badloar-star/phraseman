from __future__ import annotations

import json
import shutil
from pathlib import Path


ROOT = Path.cwd()
REVIEW_DIR = ROOT / ".codex-tmp" / "cinema-asset-review"
ACCEPTED_DIR = REVIEW_DIR / "accepted"
REDO_DIR = REVIEW_DIR / "redo"


ACCEPTED = {
    "midnight": [
        "lessons",
        "quizzes",
        "cards",
        "daily-tasks",
        "league",
        "diagnostic-test",
        "practice",
        "exam",
        "shop",
        "arena",
        "hero-map",
        "league-chest",
    ],
    "ember": [
        "lessons",
        "quizzes",
        "cards",
        "daily-tasks",
        "league",
        "diagnostic-test",
        "practice",
        "exam",
        "shop",
        "arena",
        "hero-map",
        "league-chest",
    ],
    "aurora": [
        "lessons",
        "quizzes",
        "cards",
        "daily-tasks",
        "league",
        "diagnostic-test",
        "practice",
        "exam",
        "shop",
        "arena",
        "hero-map",
        "league-chest",
    ],
    "volt": [
        "lessons",
        "quizzes",
        "cards",
        "daily-tasks",
        "league",
        "diagnostic-test",
        "practice",
        "exam",
        "shop",
        "arena",
        "hero-map",
        "league-chest",
    ],
}


HOME_KEYS = [
    "lessons",
    "quizzes",
    "cards",
    "daily-tasks",
    "league",
    "diagnostic-test",
    "practice",
    "exam",
    "shop",
    "arena",
    "hero-map",
]
THEMES = ["midnight", "ember", "aurora", "volt"]


def paths_for(theme: str, key: str) -> tuple[Path, Path]:
    source_name = "league-chest.png" if key == "league-chest" else f"home-{key}.png"
    source = ROOT / "assets/images/cinema_dalle_sources/singles/v1" / theme / source_name
    if key == "league-chest":
        final = ROOT / "assets/images/league_bonus" / f"{theme}-chest.webp"
    else:
        final = ROOT / "assets/images/home_menu" / theme / f"home-{theme}-{key}.webp"
    return source, final


def copy_if_exists(src: Path, dst: Path) -> str | None:
    if not src.exists():
        return None
    dst.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(src, dst)
    return str(dst.relative_to(ROOT))


def classify() -> dict:
    accepted_items = []
    redo_items = []

    for theme in THEMES:
        for key in [*HOME_KEYS, "league-chest"]:
            source, final = paths_for(theme, key)
            is_accepted = key in ACCEPTED.get(theme, [])
            bucket_dir = ACCEPTED_DIR if is_accepted else REDO_DIR
            copied_source = copy_if_exists(source, bucket_dir / theme / source.name)
            copied_final = copy_if_exists(final, bucket_dir / theme / final.name)
            item = {
                "theme": theme,
                "key": key,
                "source": str(source.relative_to(ROOT)),
                "final": str(final.relative_to(ROOT)),
                "sourceExists": source.exists(),
                "finalExists": final.exists(),
                "copiedSource": copied_source,
                "copiedFinal": copied_final,
            }
            if is_accepted:
                accepted_items.append(item)
            else:
                reason = "missing single-source or rejected old/bad generation"
                if theme in {"aurora", "volt"} and not source.exists():
                    reason = "old processed final without approved per-icon DALL-E source"
                if key == "practice" and theme in {"aurora", "volt"}:
                    reason = "practice icon uses rejected microphone/old concept"
                item["reason"] = reason
                redo_items.append(item)

    report = {
        "acceptedCount": len(accepted_items),
        "redoCount": len(redo_items),
        "accepted": accepted_items,
        "redo": redo_items,
    }
    REVIEW_DIR.mkdir(parents=True, exist_ok=True)
    (REVIEW_DIR / "classification.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    return report


if __name__ == "__main__":
    result = classify()
    print(json.dumps(
        {
            "acceptedCount": result["acceptedCount"],
            "redoCount": result["redoCount"],
            "classification": str((REVIEW_DIR / "classification.json").relative_to(ROOT)),
            "acceptedDir": str(ACCEPTED_DIR.relative_to(ROOT)),
            "redoDir": str(REDO_DIR.relative_to(ROOT)),
        },
        ensure_ascii=False,
        indent=2,
    ))
