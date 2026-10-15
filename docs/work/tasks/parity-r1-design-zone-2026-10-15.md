# PARITY-GATE r1 — зона Дизайна: разбор 233 нарушений и правки по итогам (15.10)

Governance-ID: TG-B56ACB7750E1

## Outcome
Разобрать нарушения r1 по файлам кода (документ `docs/phraseman-2.0/PARITY_R1_TRIAGE_DESIGN_2026-10-15.md`), передать Сверке строки «только пересъёмка», Макетам — «образец под решение владельца», Ядру — фикстуры; в коде править только то, где решения владельца нет и правка однозначна (храповик D145: подписи «ТОП-5» 10 → 13, надзаголовок m01 → V2_TYPE.overline).

## Scope
Только числа шрифта в компонентах моментов Пика; остальные кандидаты (меню фильтра Карточек top: 56, живое превью в редакторе карточки) ждут логов с эмулятора / решения.

## Architecture
`MomentPromotion` и `SpirePositionRiseMoment` берут размеры из `V2_TYPE` / шкалы 13·16 (D145).

## Security and privacy
Данные не затрагиваются.

## Technical debt
Храповик `typography_two_sizes` остаётся красным из-за чужих файлов (`StreakMilestone*`, `modules/learning-v2/modes/mode_feedback_v1.tsx`).

## Verification
`typography_two_sizes_ratchet` (число моих нарушений падает на 3), контрактные тесты моментов.

## Rollback
Откат коммита.
