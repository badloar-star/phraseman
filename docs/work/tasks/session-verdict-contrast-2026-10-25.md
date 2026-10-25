# Task packet: контраст вердикта и чипов занятия Learning V2

Governance-ID: TG-78C1ED4DF67F
Status: In progress
Owner: Learning V2 session; 4 · ТЕМЫ по поручению координатора 25.10 (замер docs/work/learning-v2-session-contrast-2026-10-25.md, строки L11, L16, L17)

## Outcome

«Правильно» в блоке вердикта, текст и значок чипов «верно / неверно» (сборка фразы, «Найди пары»), пометка плитки — цветом
semanticInk(g).goodText / badText (тон темы, доведённый до ≥ 4,55 на фоне экрана, мягкой подложке и 18 %-заливке чипа), вместо
сырых good/bad (3,55–3,76 в светлых темах). Пояснение под «Правильно» — text вместо secondary.

## Scope

components/learning-v2/learning_v2_task_layout_tokens.ts (lv2TaskVerdictBlockLook), components/learning-v2/LearningV2Glass.tsx
(чип и плитка). Раскладка не меняется.

## Architecture

semanticInk получает Lv2Glass целиком (в нём есть bg), поэтому доводка учитывает фон экрана и заливку чипа (b84690a11).
Заголовок неверного вердикта остаётся text (он и был text, не сырой bad).

## Security and privacy

Только цвета; данных и сети нет.

## Technical debt

Pay now: текст «верно / неверно» ниже 4,5 в светлых темах.

## Verification

tests/semantic_ink_surfaces_contrast.test.ts и сторожа заданий занятия.

## Rollback

Revert коммита.
