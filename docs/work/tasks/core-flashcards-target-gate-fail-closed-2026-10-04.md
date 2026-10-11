# Task packet: доводка волны 03.10 «fail-closed по языку изучения» для карточек

Governance-ID: TG-94EA8E61CB15
Status: In progress
Owner: сессия 1 · ЯДРО (решение владельца через координатора 04.10: «правильно он и сделал! коммит, доведи правку»)
Related epic/enabler: D129/D130 — разделы по языку изучения

## Outcome

Встроенный английский банк системных карточек показывается только при английском (французский —
из своего удалённого банка). Для de/es/it банк пуст (родного банка нет — английские слова немецкому
ученику не подставляем), но раздел карточек, свои наборы и наборы маркета остаются открытыми.
Пустой/неизвестный язык НЕ закрывает карточки у всех — трактуется как язык по умолчанию (en), с логом.
Каждый ранний выход гейта пишет [FC-TARGET-GATE] с языком и причиной. Новое решение D160 уточняет
D129/D130; таблица готовности не противоречит.

## Scope

In scope: app/flashcards_target_gate.ts, tests/flashcards_target_gate_fail_closed.test.ts,
остальные файлы волны 03.10 (target_storage_keys, study_target_lang_dev, today_task_surface_filter,
functions arena_target_registry / custom_card_milestone_core и их тесты) — коммитятся как есть после
прогона тестов; docs/phraseman-2.0/03_DECISIONS.md (D160); комментарий в
app/learning_language_surface_readiness.ts. Out of scope: релизный APK от 04.10 (пересоберёт владелец).

## Architecture

Гейт остаётся единственной точкой выдачи системного банка (flashcards_collection.tsx). Поверхность
system_cards для de/es/it — выключена без блокировки маршрутов; community_packs — включена.

## Security and privacy

Нет новых данных. Логи — только язык, поверхность, причина.

## Technical debt

Родные системные банки de/es/it — отдельная работа контента (по решению владельца).

## Verification

Точечный прогон тестов волны: один jest, --runInBand, батчи по 3–4 файла, через светофор.

## Rollback

git revert коммита.
