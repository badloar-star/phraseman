# Phraseman — Claude instructions

## ⛔ АДМИНКА: писать ТОЛЬКО в `admin/v2/legacy.html`

Владелец пользуется одной админкой — https://phraseman-ea0b3.web.app/legacy.html#control-panel
Её исходник — **`admin/v2/legacy.html`**, и hosting публикует именно папку `admin/v2`.
Любая правка админки вне этого файла на боевую НЕ попадёт.

`admin/legacy.html`, `admin/index.html`, `admin/full.html` — **заморожены**, только
чтение. Белая V2-панель `admin/v2/index.html` и её router/core/UI удалены
навсегда; восстанавливать их запрещено. Корень Hosting обязан перенаправлять на
`/legacy.html`. Подробности: `AGENTS.md` → «ЕДИНСТВЕННАЯ РАБОЧАЯ АДМИНКА» и
`docs/admin/WHITE_ADMIN_V2_RETIRED.md`.

### 👤 Правило: рядом с uid ВСЕГДА имя (владелец, 2026-08-02)

В админке идентификатор пользователя никогда не показывается один. Голый uid не
говорит, о ком речь, и владельцу приходилось копировать его в поиск.

- Рендерить через `renderUserRef(uid, names, opts)` — общий помощник в
  `admin/v2/legacy.html`. Имя ведёт, uid поясняет более тихим тоном.
- Имена тянуть **батчем** через `resolveUserNames(uids)` — 30 uid за запрос плюс
  кэш на сессию. НИКОГДА не `getDoc` на каждый uid: так уже теряли до 600 чтений
  за один заход.
- Имени нет → показываем uid как есть. Ничего не выдумываем: подпись «Без имени»
  спутали бы с настоящим именем.
- Если имя уже есть рядом (соседняя колонка, заголовок карточки) — правило
  соблюдено, дублировать не нужно.

**Исключение — Telegram и любые внешние каналы:** туда не уходят ни имена, ни
uid, только количества. Департаменты Джарвиса по этой же причине считают
серверными `.count()`-агрегациями и документы не выкачивают — PII физически не
может попасть в решение.

### 🤖 Правило: тронул данные — обнови Джарвиса (владелец, 2026-08-02)

Джарвис читает чужие коллекции и поля, но не участвует в их изменении. Если
поле переименовали, департамент **не упадёт** — он вернёт нули и будет бодро
врать, что всё хорошо. Молчаливая ложь опаснее явной поломки.

Поэтому при ЛЮБОМ изменении контента, схемы данных, коллекций или полей —
**в том же ходу**, без напоминания владельца:

1. Проверь, читает ли это Джарвис: `functions/src/jarvis/*_firestore_fetcher.ts`.
2. Если да — обнови читатель под новую схему.
3. Обнови таблицу в `functions/src/jarvis/jarvis_data_contract_guard.test.ts`.
4. Новый департамент → подключи в `all_departments_snapshot.ts` (поле там
   обязательное, забыть нельзя) **и** добавь в `JF_DEPARTMENT_META`
   в `admin/v2/legacy.html`, иначе владелец его не увидит.
5. Новая коллекция → закрой правилом в `firestore.rules`.

**Страж:** `jarvis_data_contract_guard.test.ts` ломает сборку, когда контракт
разошёлся. Он проверяет связь «поле в источнике ↔ поле в читателе Джарвиса»,
правила Firestore и то, что каждый департамент виден в панели. Обычные тесты
департаментов это НЕ ловят — они работают на моках и остаются зелёными.

Сломался страж — почини контракт, а не удаляй проверку.

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
