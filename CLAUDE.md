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

## VIRAL — app marketing pipeline (reels/carousels/content plans, THIRD pipeline)

If the user says **"VIRAL"**, "вирал", "подними вирал", **"пишем рилс"**, **"пишем карусель"**,
or **"контент-план"** — load the MARKETING pipeline: **read `content/marketing/VIRAL.md` FIRST**
and follow its steps exactly (then MARKETING_SYSTEM.md + the needed playbook). It produces
ready-to-shoot reels scripts / ready-to-design carousels / weekly content plans that drive
users into the paid funnel knowlyapps.com/start/, saved to `content/marketing/scripts/`.
Payment/analytics services setup for the funnel: `content/marketing/PAYMENTS_SETUP.md`.

> ⚠️ VIRAL ≠ MASON ≠ LINGMAN. VIRAL = promotion of the Phraseman APP on IG/TikTok/FB
> (goal: paying users). Do not mix the three pipelines.

VIRAL is self-contained in `content/marketing/` — any AI, any session continues from those files.

> Project-wide engineering rules also live in `AGENTS.md`.

## Performance Bible (MANDATORY for any new screen/feature/UI change)

Before creating or editing screens, tabs, animations, data loading, or content files —
read **`AGENTS.md` → «Performance Bible (Instagram-Grade Runtime)»** and follow it exactly:
frozen background (freezeOnBlur/react-freeze + guarded loops), instant first frame
(sync hydration from snapshot/peek, no default-then-patch, no full-screen spinners),
**layout stability (first frame = final geometry: skeletons with reserved sizes, no
`if (loading) return null`, no zero-then-jump counters, flow inserts only via
`animateNextLayoutTransition`, insets only via `useStableSafeAreaInsets`, no
`adjustsFontSizeToFit`)**, constant stack background, lazy content through registry
accessors (the seam for the planned server-side content delivery). Guarded by
`tests/perf_freeze_contract.test.ts` and `tests/layout_stability_contract.test.ts`
(+ baseline `config/layout-stability-baseline.json`, may only shrink) — never weaken
the guards to make a feature pass; extend allowlists only consciously.
