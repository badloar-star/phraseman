# Task packet: ссылки съёмки video-001/004/008/009/011 (Дизайн 228448bfe) и learn-007/008/011/012/013/029/031, dialogs-020 (Ядро d53db125f)

Governance-ID: TG-6BA820E2318F
Governance-ID: TG-3AC82AFC765C
Status: In progress
Owner: 5 · АВТОРИЗАЦИЯ (DEV_LINKS_R1 держит Авторизация; подмену `videopacks=catalog|catalog_upcoming` сделал Дизайн)

## Outcome

Строки video-001 (главная канала), video-004 (премьера «сейчас»), video-008 (вкладка «Плейлисты»), video-009 (плейлист),
video-011 (ролик с фразами) получают ссылку и шаги в DEV_LINKS_R1 по описанию Дизайна.
То же для learn-007/008/011/012/013 (lessonsDone/examA1), learn-029/031 (метка верного слова) и dialogs-020 (dev_dialog_why=spent) по описанию Ядра.

## Scope

In scope: scripts/dev_links_r1_steps_chain7.py (+CHAIN7_IDS), перегенерация DEV_LINKS_R1.md / DEV_LINKS_R1_BINDINGS.md.
Out of scope: код экранов видео и подмена каталога (Дизайн).

## Architecture

Модуль шагов chain7, тот же механизм `add()`; генератор сам добавляет overlays=off.

## Security and privacy

Демо-каталог только в памяти, Firestore не вызывается; ссылки без записей (сторож prod_write_guard).

## Technical debt

- Contain: нет.

## Verification

Генератор без ошибок; dev_links_r1_contract / selectors_exist / prod_write_guard — когда хватит памяти для jest.

## Rollback

Откат коммита.
