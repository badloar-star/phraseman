# Task packet: интро es 1–4 без «Представь ситуацию» (слой оверрайдов)

Governance-ID: TG-6264B42C1D88
Status: In progress
Owner: сессия «Темы» (интро классики)
Related epic/enabler: TG-D01D9A1F84C3 (интро классики), TG-8A3674E816C9 (слой оверрайдов), TG-107A47F46E73 (en 1–4)

## Outcome

Переписанные русские интро испанского курса уроков 1–4 (12 карточек) попадают в `docs/work/classic_intro_overrides.json` и переживают пересборку пакета. Пользователь видит подробный разбор без сценок «Представь ситуацию» в первых четырёх уроках испанского. Мерка: после `node scripts/classic_course_pack.mjs es` в `modules/classic-courses/es/intro.json` у уроков 1–4 нет шаблонных начал в русском тексте.

## Scope

In scope: `docs/work/classic_intro_overrides.json` (ключи `es:01:intro:1`…`es:04:intro:3`, поля titleRU/textRU/linesRU); пересборка es; коммит итогового `modules/classic-courses/es/intro.json` и файла оверрайдов.
Out of scope: uk-поля (их пишет Переводчик в `classic_intro_overrides_uk.json`); fr/de/it; уроки 5+; сам скрипт пакета.

## Architecture

Граница: `classic_intro_overrides.json` → `classic_course_pack.mjs` → `modules/classic-courses/es/intro.json`. Ключ — screenId, поля — только ru. id экранов и число карточек не меняются. Примеры испанского в lines берутся из текущих образцов уроков (examplesById не меняется).

## Security and privacy

Не применимо: учебный текст, персональных данных и сети нет.

## Technical debt

- Accept temporarily: uk-поля интро es 1–4 ещё со сценками — владелец Переводчик, выход — `classic_intro_overrides_uk.json`.
- Accept temporarily: уроки 5–32 и fr/de/it — следующие пачки этой же задачи.

## Verification

- `node scripts/classic_course_pack.mjs es` — без ошибок; предупреждений «не применено ключ» не должно быть.
- Поиск по русским полям интро es 1–4 — нет шаблонных начал.
- Сторож Ревизора `tests/classic_intro_no_template_start.test.ts` — итог по строке `Tests:`.
- Коммит через `scripts/safe_commit.sh` с `--expect`, в окно кода.

## Rollback

Удалить ключи es:01…es:04 из оверрайдов и пересобрать — пакет вернёт архивные тексты. Данных пользователей не затрагивает.
