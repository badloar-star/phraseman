# Task packet: урок 1 при ⚡0 — закрытие окна «Энергия закончилась» не должно давать бесплатный урок

Governance-ID: TG-78689D889761
Status: In progress
Owner: Ядро (сессия 1)
Related epic/enabler: energy-modes-017 (Макеты c319f6947), журнал Сверки evidence/energy_modes_n13/energy-modes-017.log

## Outcome

Журнал Сверки: при ⚡0 вход работает правильно (`start decision insufficient` → окно через ~2 с после тапа; кадр снят раньше
окна). Дыра в другом: `NoEnergyModal` в уроке закрывается тапом по фону / «назад» / переходом в Plus через `onClose` =
`resetNoEnergyModal` — окно прячется, урок остаётся, энергия не списана, слова нажимаются → урок бесплатно. Теперь: пока
списание не прошло, ответы заблокированы (тап снова показывает окно); закрытие окна без энергии — выход из урока; переход в
Plus окно прячет, а после появления энергии/Plus списание повторяется и урок разблокируется.

## Scope

In scope: `app/lesson1.tsx` (флаг блокировки после insufficient, проверка в handleWordPress/checkAnswer, onClose/onBeforeOpenPremium
окна, повтор списания). Out of scope: остальные экраны с гейтом (lesson_words, lesson_irregular_verbs, preposition_drill —
проверить отдельно; Learning V2 — Codex), сам NoEnergyModal.

## Architecture

No architecture change: локальный флаг экрана поверх `useFirstQuestionEnergyGate`; деньги/энергия списываются тем же гейтом.

## Security and privacy

Не касается данных; закрывает обход оплаты (энергия — монетизируемый ресурс Plus).

## Technical debt

- Contain: тот же класс возможен на других экранах с гейтом — проверить и записать.

## Verification

Логи `[ENERGY-GATE] lesson1 blocked/tap blocked/modal closed/retry`; тест-контракт; Сверка: ⚡0 → окно → тап по фону → выход из урока.

## Rollback

Откат коммита.
