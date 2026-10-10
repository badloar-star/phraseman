# Task packet: контрактный тест «числа нажатия кита» и ожидание вердиктов Сверки

Governance-ID: TG-8C164D8EB11D
Status: In progress
Owner: сессия «2 · Дизайн» (поручение координатора 11.10 00:03)

## Outcome

1. Один контрактный тест: `KitTouchable`, `V2Pressable`, `PressableScale`, `PressableHybrid`, `TapScale` берут числа нажатия (90 мс / .97 / opacity .86 / 240 мс / cubic-bezier(.3,1.4,.5,1)) из `constants/kitPress.ts` — source-pin на импорт, чтобы никто не вернул свою пружину.
2. Ожидание вердиктов Сверки (пробуждение через ~20 мин); всё, что окажется вёрсткой в моих экранах, беру без вопросов.

## Scope

In scope: новый тест, замена литерала `0.97` в `V2Pressable` на константу кита. Out of scope: логика экранов, `DuoPressable` и `feedback/PressableScale` (клавиши, решение владельца 16.08), Learning V2.

## Architecture

Тест читает исходники пяти обёрток и `constants/kitPress.ts` и сверяет с `KIT_MOTION` (источник — kit.css:64–65).

## Security and privacy

Не затрагивает данные.

## Technical debt

Contain: уменьшает расхождение — числа нажатия в одном месте под контролем теста.

## Verification

Запуск самого теста и соседних контрактов через слот, 1 воркер.

## Rollback

`git revert`.
