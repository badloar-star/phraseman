# Task packet: интро en 1–4 в слое оверрайдов

Governance-ID: TG-107A47F46E73
Status: In progress
Owner: сессия «Темы» (интро классики)
Related epic/enabler: TG-D01D9A1F84C3 (переписывание интро классики), TG-8A3674E816C9 (слой оверрайдов в пакете)

## Outcome

Переписанные интро английского курса уроков 1–4 (12 карточек, ru) попадают в `docs/work/classic_intro_overrides.json` и переживают пересборку пакета. Пользователь видит подробный разбор без сценок «Представь ситуацию» в первых четырёх уроках английского. Мерка: после `node scripts/classic_course_pack.mjs en` в `modules/classic-courses/en/intro.json` у уроков 1–4 нет шаблонных начал, а сторож Ревизора по en 1–4 зелёный.

## Scope

In scope: `docs/work/classic_intro_overrides.json` (ключи `en:01:intro:1`…`en:04:intro:3`, поля titleRU/textRU/linesRU); пересборка en; коммит итогового `modules/classic-courses/en/intro.json` и файла оверрайдов.
Out of scope: uk-поля (их пишет Переводчик в `classic_intro_overrides_uk.json`); es/fr/de/it; уроки 5+; сам скрипт пакета (уже закоммичен e9db02e3b).

## Architecture

Граница: `classic_intro_overrides.json` → `classic_course_pack.mjs` → `modules/classic-courses/en/intro.json`. Ключ — screenId, поля — только ru; uk остаётся из архива до правки Переводчика. id экранов и число карточек не меняются.

## Security and privacy

Не применимо: учебный текст, персональных данных и сети нет.

## Technical debt

- Accept temporarily: uk-поля интро en 1–4 ещё со сценками — владелец Переводчик, выход — его файл `classic_intro_overrides_uk.json`.
- Accept temporarily: уроки 5–32 и другие языки — следующие пачки этой же задачи.

## Verification

- `node scripts/classic_course_pack.mjs en` — без ошибок; предупреждения «не применено ключ» не должно быть.
- Поиск в `modules/classic-courses/en/intro.json` по шаблонным началам для уроков 1–4 — пусто (ru).
- Сторож Ревизора `tests/classic_intro_no_template_start.test.ts` — итог по строке `Tests:`.
- Коммит через `scripts/safe_commit.sh` с `--expect`.

## Rollback

Удалить ключи en:01…en:04 из оверрайдов и пересобрать — пакет вернёт архивные тексты. Данных пользователей не затрагивает.
