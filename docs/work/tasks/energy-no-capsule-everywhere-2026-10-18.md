# Task packet: энергия без подложки везде — только молния и число

Governance-ID: TG-29086EB3EF11
Status: In progress
Owner: сессия «4 · ТЕМЫ 2.0»
Related epic/enabler: владелец через координатора 18.10 — «убрать подложку-эллипс под молнией и числом везде (Главная, Уроки, Диалоги, Learning V2, тренировки)»

## Outcome

Индикатор энергии в шапках (EnergyBar) и в шапке занятия режима Б (EnergyMistakeHud) — без заливки, обводки и тени. Значок ≥ 3, цифра ≥ 4,5 к фону экрана (bg/bgTop/bgBottom) во всех 138 сочетаниях тем; зона нажатия EnergyBar 60×44 прежняя.

## Scope

In scope: components/EnergyBar.tsx, components/energy/EnergyMistakeHud.tsx, components/energy/EnergyAttemptsHud.tsx (цвета), constants/energy_low_ink.ts (порог), сторожа energy_glass_capsule_contract, verdicts_7c831a193_app_fixes_contract, energy_mistake_hud, blend_1018_pairs.

Out of scope: монеты и баланс рядом, сердечки попыток (SessionAttemptsHud режим А), всплывающее окно энергии, размеры.

## Architecture

No architecture change: снимаем стиль капсулы; цвета смысловых состояний (мало/перезаряд/ноль) доводятся до порога к фону экрана общей функцией lowChargeInk.

## Security and privacy

Не затрагивает данные; только цвета.

## Technical debt

- Pay now: проп noCapsule становится лишним (оставлен для совместимости, ни на что не влияет).

## Verification

Замер 138 сочетаний; точечные тесты энергии.

## Rollback

`git revert`.
