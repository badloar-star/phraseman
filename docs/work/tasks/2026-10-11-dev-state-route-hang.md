# Task packet: dev_state не переходит на next (зависание «DEV-STATE…»)

Governance-ID: TG-F98E78CEE8D4
Status: Implemented, awaiting emulator confirmation
Owner: сессия «3 · МАКЕТЫ ВЛАДЕЛЬЦА» по поручению координатора
Related epic/enabler: R1_SHOT_LIST (съёмка), коммит 97800bc3f

## Outcome

Ссылка `phraseman://dev_state?next=/flashcards` переходит на `next` за секунды; по логу `[DEV-STATE] route: …` видно каждый шаг.
Мера: на эмуляторе после ссылки появляется `dev-state-done`, затем целевой экран; при любом сбое — причина в журнале.

## Scope

In scope: `app/dev_state.tsx` (маршрут): лог каждого шага после применения фикстур, потолок 3 с на перечитывание энергии, catch с причиной.
Out of scope: логика фикстур, энергия (`EnergyContext`), навигация других экранов.

## Architecture

No architecture change. Гипотеза причины: безлимитное `await reload()` энергии (её загрузчик ждёт замок/сеть) блокировало `setResult` и `router.replace`.
Это не от 97800bc3f (ветка перехода там не менялась); подтвердит лог `перечитывание энергии → …`.

## Security and privacy

Маршрут по-прежнему только `__DEV__ && !IS_STORE_RELEASE`; в сеть и Firestore не пишет; в логах нет личных данных.

## Technical debt

Contain: если лог покажет, что висит не reload, а иное — править по факту; потолок оставить (переход не должен зависеть от энергии).

## Verification

`tests/dev_state_fixtures.test.ts` 16/16; синтаксис файла проверен; эмулятор — по команде координатора.

## Rollback

Вернуть прежний `.then(...)` в `app/dev_state.tsx` из git.
