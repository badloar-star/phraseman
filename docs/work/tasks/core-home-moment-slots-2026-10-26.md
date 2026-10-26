# Ядро · окна «итог недели» и «с возвращением» — свои хосты, Главная не перерисовывается (Моменты №4, координатор 26.10)

Governance-ID: TG-8ECA1DF43EBE
Status: In progress
Owner: 1 · ЯДРО

## Outcome
Состояние окон «итог недели Пика» (`useSpireWeekMoment`) и «С возвращением» (`useWelcomeBackMoment`) жило в `HomeScreen`
(`app/(tabs)/home.tsx`). Решение, открытие и закрытие окна перерисовывали всю Главную — самый большой экран — в том же
коммите, что и первый кадр окна. Теперь каждое окно живёт в своём маленьком хосте
(`components/home/home_moment_slots.tsx`): хуки вызываются внутри хоста, Главная на это состояние не подписана.

## Scope
In scope: новый `components/home/home_moment_slots.tsx`; в `home.tsx` — вызовы двух хуков и разметка двух окон
заменены двумя хостами, поля окон убраны из снимка `useRenderCause('home')`; сторожа
`tests/render_cause_probe.test.tsx`, `tests/overlay_native_modal_keys_contract.test.ts`,
`tests/spire_moments_v3_contract.test.tsx` — перепин на новый файл; новый тест изоляции.
Out of scope: когда показывать, порядок окон (`overlay_arbiter_core` — по таблице приоритетов, не по месту вызова),
содержимое окон, звук, анимации. Только JS, OTA-безопасно.

## Architecture
`HomeWeekMomentSlot({ lang, studyTarget, spireTabEnabled, active, coinRank, onPlay })` и
`HomeWelcomeBackSlot({ lang, studyTarget, active, coinRank, energyCurrent, energyMax, onOpenSavedCards })` — `memo`,
пропсы примитивы и стабильные колбэки (`useMemo`/`useCallback` в Главной). Энергия по-прежнему из `peekEnergy()` в Главной
(без чтений), передаётся числами. Журнал `[HOME-MOMENT-SLOT]` — смена решения и показ в хосте.

## Security and privacy
Не затрагивает данные.

## Technical debt
Замер на устройстве — по `useRenderCause('home')` на эмуляторе у Сверки (поля окон больше не меняют снимок Главной).

## Verification
Тест изоляции (смена состояния окна перерисовывает только хост, счётчик рендеров родителя не растёт), три перепиненных
сторожа, `tests/welcome_back_ui_contract.test.ts`, `tests/spire_week_moment_host_contract.test.tsx`; разбор `.tsx` babel.

## Rollback
Откат коммита.
