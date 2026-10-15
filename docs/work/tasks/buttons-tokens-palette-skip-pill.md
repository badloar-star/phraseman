# Task packet: кнопки не сливаются — токены главной кнопки, палитра Пика, плашка «Пропустить», страница «до / после»

Governance-ID: TG-AB520554B0A7
Governance-ID: TG-0EBF8A639AC7
Governance-ID: TG-327EDCE8BF67
Status: In progress
Owner: сессия «4 · ТЕМЫ 2.0»
Related epic/enabler: аудит `docs/work/tasks/buttons-never-merge-audit.md` (TG-E353B0699B5C); решения координатора 15.10: (1) ОК по CTA_SURFACE_MIN, (2) ОК по cta → ctaFill отдельным коммитом, вариант (а) по «Пропустить»; коммиты в окне 07:00

## Outcome

1. Заливка главной кнопки в светлых цветных градиентных темах глубже и читаемее: цель 3 : 1 к поверхностям при подписи ≥ 4,5 : 1; где цель недостижима (светлая подпись нужна для 3 : 1), берётся лучший вариант с читаемой подписью (было 2,1–2,9 → стало 2,4–2,8 на худших поверхностях, без возврата к пастельному акценту).
2. Главная кнопка окон Пика и моментов берёт `ctaFill` вместо сырого `accent` (было до 1,00 : 1 к фону).
3. «Пропустить» в рубежах серии: 13 · 700 на плашке-таблетке (padding 6/10, радиус 12), фон `buttonFill` вместо `control` — осознанное отличие от эталона v3 по правилу «кнопки не сливаются».
4. Страница `docs/phraseman-2.0/evidence/buttons_before_after_2026-10-15.html`: старый и новый цвет кнопок на фоне 10 светлых градиентных тем + третий столбец «вариант со светлой подписью».
5. Аудит на двух уровнях (координатор 15.10): основные кнопки ≥ 3 : 1, тоновые плашки (вторичная, опасная, отключённая, плашки окон на buttonFill) ≥ 1,5 : 1; база красного пересчитана.

## Scope

In scope: `constants/liquidGlassButtonTokens.ts` (primaryFill, CTA_SURFACE_MIN), `components/spire/useSpirePalette.ts` (cta), `components/streak/moments/StreakMilestoneScreen.tsx` (плашка «Пропустить»), `tests/buttons_never_merge_audit.test.ts`, `config/buttons-never-merge-baseline.json`, HTML страницы «до / после».

Out of scope: цвет подписи кнопок, формы кнопок, вторичная/опасная/отключённая кнопки (остаются на принятом пороге 1,5 : 1 — вопрос владельцу).

## Architecture

No architecture change: те же роли токенов; палитра Пика получает уже существующую роль `ctaFill`.

## Security and privacy

Только цвета и вёрстка.

## Technical debt

Contain: 3 : 1 для основной кнопки в 10 светлых градиентных темах достижимо только со светлой подписью — решение владельца; красное зафиксировано в базе аудита и может только уменьшаться.

## Verification

`button_tokens_contrast`, `moments_contrast_all_themes`, `accent_fill_paywall_guard`, `buttons_never_merge_audit`, `streak_moments_v3_contract`, `spire_r1_view_defects`, `spire_optimistic_ui_r1`, `spire_floor_moment_contract` — «N passed» по слоту; `moment_coin_contract` через рендер-конфиг.

## Rollback

git revert коммитов по одному (токены / палитра / плашка).
