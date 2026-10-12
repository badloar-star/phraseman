# Task packet: три красных теста из полного прогона — Главная (gcSnapshot), иконка энергии, тост __DEV__

Governance-ID: TG-2246AF00782F
Status: Done — 4 теста 85/85, соседние 6/6, срез типов 0
Owner: сессия «1 · Ядро» (координатор 12.10 после полного прогона: «Тебе: home_lesson_progress_single_pass (25 тестов, одна причина gcSnapshot is not defined), energy_start_cost, use_mistake_explain_bundle_state»; handoff Codex — строка про 132 gustav и 106 Learning V2).

## Outcome
1. `tests/home_lesson_progress_single_pass.test.ts` (25 красных): стенд исполняет настоящий кусок Главной в vm; блок получил
   диагностические замеры сборки мусора `gcSnapshot`/`gcDelta` (f3b742cc5, 6b5a03a25) — стенду их не подставили. Добавить двойники
   (возвращают null — диагностика, не логика подсчёта).
2. `tests/energy_start_cost_contract.test.ts`: иконка энергии получила вариант «заливная» (601d85844, `glyph = solid ? 'flash' :
   'flash-outline'`) — тест искал литерал `name="flash-outline"`. Проверять: контурная по умолчанию + имя берётся из выбора.
   Плюс проверка «папки assets/images/energy нет картинок» — пустую папку git не хранит; отсутствующая папка = тоже «нет картинок».
3. `tests/use_mistake_explain_bundle_state.test.ts`: падение — `app/events.ts:299` голый `__DEV__` в логе повтора тоста
   (491c0b71c); вне React Native (тесты, node) — ReferenceError, и тост терялся бы вместе с исключением. Привести к безопасной форме,
   как строка 263 того же файла: `(globalThis as { __DEV__?: boolean }).__DEV__`.
4. Handoff Codex — строка в «Просьбы»: 132 gustav-теста (нет `docs/gustav/generated`, папка в .gitignore) и 106 файлов Learning V2.

## Scope
In: два теста, `app/events.ts` (одна строка), handoff Codex. Out: `app/(tabs)/home.tsx`, `components/EnergyIcon.tsx`, хук разбора
ошибки — без изменений.

## Architecture
Тесты не ослабляются: стенд Главной по-прежнему исполняет настоящий блок; контракт иконки проверяет и умолчание, и связь имени с
выбором. Правка events.ts — та же форма проверки, что уже стоит в файле.

## Security and privacy
Не затрагивается.

## Technical debt
Голый `__DEV__` может встречаться и в других модулях, которые грузятся в тестах node — отдельным сторожем не закрывается.

## Verification
Три теста + `tests/community_pack_like_owner_fix.test.ts` (там тоже `__DEV__ is not defined`) + соседние тесты событий; срез типов
по `app/events.ts`.

## Rollback
`git revert` коммита.
