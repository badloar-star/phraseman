# Task packet: «Мои ошибки» — testID вариантов практики и dev-подмена ИИ-объяснения (mistakes-panel-014/015/016)

Governance-ID: TG-0E50EDD95B04
Status: Done
Owner: Ядро (сессия 1)
Related: координатор 13.10; THEMES_ZONES_DIFF_ROWS_R1 (a657d84e4) строки 014/015/016

## Outcome

- Варианты ответа практики получают testID `mistake-practice-option-N`; в dev-сборке робота — `mistake-practice-option-correct`
  и `mistake-practice-option-wrong-N`, чтобы Сверка снимала «Верно» (014) и «Неверно» (015) тапом, а не координатами.
- `dev_state?ai_explain=demo` — разбор «Почему» показывает готовое объяснение образца без вызова сервера и без расхода
  бесплатного разбора дня (016); только память, только `__DEV__ && !IS_STORE_RELEASE`, заглушка в стор-сборке.

## Scope

In scope: components/mistakes-panel/PracticeKit.tsx (OptionGrid), app/mistake_practice_session.tsx (передача префикса),
app/dev_paywall_state.ts, store_release_stubs/dev_state/dev_paywall_state_stub.ts, app/dev_state_fixtures.ts (свои строки),
app/use_mistake_explain.ts (dev-ветка). Out of scope: вид экрана.

## Architecture

No architecture change.

## Security and privacy

Не касается данных. Признак верного варианта в testID — только в dev-сборке (в стор-сборке номер без признака).

## Technical debt

- Текст демо-объяснения — только русский (кадр образца русский).

## Verification

Тест: стор-заглушка экспортирует те же имена; dev-ветка объяснения не зовёт сервер и не тратит лимит; testID в OptionGrid.

## Rollback

Откат коммита.
