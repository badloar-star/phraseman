# Phraseman — Claude instructions

## MASON — content scriptwriter pipeline

If the user says **"MASON"**, "мейсон", "подними мейсон", or **"пишем новый ролик"** —
load the content pipeline: **read `content/MASON.md` FIRST** and follow its step-by-step
instructions exactly (read DOSSIER.md + CLARKSON_STYLE.md, write a ready-to-voice short-video
script in Clarkson's-Farm style on RU, save it to `content/scripts/ГГГГ-ММ-ДД_*.md`).

MASON is self-contained in `content/` — any AI, any session continues from those files.

## LINGMAN — educational scriptwriter pipeline (DIFFERENT channel)

If the user says **"LINGMAN"**, "лингман", **"пишем новый урок"**, or **"следующее видео"** —
load the OTHER content pipeline: **read `content/lingman/LINGMAN.md` FIRST** and follow its
step-by-step instructions exactly. This is the EDUCATIONAL English channel (Professor Lingman
voice, audience 40+/50+, long ~10-12 min "phrase chain" videos, native Phraseman integration).
It writes a ready-to-read teleprompter script (one continuous RU text) to
`content/lingman/scripts/ГГГГ-ММ-ДД_NNN_*.md` and updates `content/lingman/memory/`.

> ⚠️ MASON ≠ LINGMAN. MASON = behind-the-scenes dev channel (Shorts, Clarkson style, hero "Максим").
> LINGMAN = teaching channel about English (Professor Lingman voice). Do not mix them.

LINGMAN is self-contained in `content/lingman/` — any AI, any session continues from those files.

> Project-wide engineering rules also live in `AGENTS.md`.
