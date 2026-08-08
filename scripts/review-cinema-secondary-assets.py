from __future__ import annotations

import json
from pathlib import Path


ROOT = Path.cwd()
OUT = ROOT / ".codex-tmp/cinema-asset-review/secondary-classification.json"

THEMES = ["midnight", "ember", "aurora", "volt"]
KINDS = [
    "level-easy",
    "level-medium",
    "level-hard",
    "theme-kitchen-and-cooking",
    "theme-home-and-rooms",
    "theme-at-the-doctor",
    "theme-body-and-health",
    "theme-shopping-and-money",
    "trainer-phrases",
    "trainer-words",
    "trainer-analytics",
    "medal",
]


def final_path(theme: str, kind: str) -> Path:
    if kind.startswith("level-"):
        level = kind.removeprefix("level-")
        return ROOT / "assets/images/quizzes/level_logos" / f"quiz-logo-{level}-{theme}.webp"
    if kind.startswith("theme-"):
        slug = kind.removeprefix("theme-")
        return ROOT / "assets/images/quizzes/theme_logos" / f"quiz-theme-{slug}-{theme}.webp"
    if kind.startswith("trainer-"):
        trainer = kind.removeprefix("trainer-")
        return ROOT / "assets/images/trainer_theme_icons" / theme / f"{trainer}.webp"
    if kind == "medal":
        return ROOT / "assets/images/quizzes/medals" / f"quiz-completion-medal-{theme}-cutout.webp"
    raise ValueError(kind)


def source_path(theme: str, kind: str) -> Path:
    if kind.startswith("level-"):
        level = kind.removeprefix("level-")
        name = f"quiz-logo-{level}.png"
    elif kind.startswith("theme-"):
        slug = kind.removeprefix("theme-")
        name = f"quiz-theme-{slug}.png"
    elif kind.startswith("trainer-"):
        trainer = kind.removeprefix("trainer-")
        name = f"trainer-{trainer}.png"
    elif kind == "medal":
        name = "medal.png"
    else:
        raise ValueError(kind)
    # зачем: черновики генерации вынесены из assets/ в asset_sources/.
    return ROOT / "asset_sources/cinema_dalle_sources/singles/v1" / theme / name


REDO_VISUAL = set()


def main() -> None:
    accepted = []
    redo = []
    for theme in THEMES:
        for kind in KINDS:
            item = {
                "theme": theme,
                "kind": kind,
                "source": str(source_path(theme, kind).relative_to(ROOT)),
                "final": str(final_path(theme, kind).relative_to(ROOT)),
                "sourceExists": source_path(theme, kind).exists(),
                "finalExists": final_path(theme, kind).exists(),
            }
            if (theme, kind) in REDO_VISUAL:
                item["reason"] = "old green/yellow secondary style conflicts with volt UI and lacks approved per-icon source"
                redo.append(item)
            else:
                accepted.append(item)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(
        json.dumps(
            {
                "acceptedCount": len(accepted),
                "redoCount": len(redo),
                "accepted": accepted,
                "redo": redo,
            },
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )
    print(json.dumps({"acceptedCount": len(accepted), "redoCount": len(redo), "path": str(OUT.relative_to(ROOT))}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
