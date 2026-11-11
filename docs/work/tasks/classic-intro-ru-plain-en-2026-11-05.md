# Task packet: ru-вступления английского курса, уроки 1–3 (новый формат)

Governance-ID: TG-E6DAF223D711
Status: In progress
Owner: сессия «Темы» (вступления классики)
Related epic/enabler: TG-FD8D5C0A3024 (вступления по стандарту), TG-6264B42C1D88 (ru es 1–3)

## Outcome

Русские вступления английского курса уроков 1–3 в формате `docs/work/classic_intro_plain/ru/en/lesson_NN.ru.json` простыми словами, без терминов. Образец — утверждённый en урок 1. Мерка: проверка «Новичком» по en 1–3 — блок INTRO понятен.

## Scope

In scope: три файла `lesson_01…03.ru.json` в `docs/work/classic_intro_plain/ru/en/`.
Out of scope: подключение в сборку (`plainIntroFor`, у Теории); fr, de, it; уроки 4–32.

## Architecture

Формат как у es 1–3: блоки concept/formula/practice, title/text с ключом ru, exampleIds из существующих примеров en. Код не меняется.

## Security and privacy

Не применимо: учебный текст, персональных данных и сети нет.

## Technical debt

- Accept temporarily: до подключения `plainIntroFor` файлы не попадают в сборку — владелец Теория.

## Verification

- JSON-файлы разбираются без ошибок.
- Проверка «Новичком» (Ревизор/читатель) после подключения.

## Rollback

Удалить три файла.
