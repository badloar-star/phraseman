# Task packet: энергия в шапке Шпиля без капсулы (приказ владельца 01.10)

Governance-ID: TG-E77336B09B2B
Status: Done
Owner: Ядро (сессия 1)
Related: решение координатора 13.10 по spire-gap-016/017; CORE_ZONES_DIFF_ROWS_R1_2026-10-13.md § 5

## Outcome

EnergyBar получил флаг noCapsule; SpireEnergyPill (шапка Шпиля и ступени) передаёт его — «⚡ N» без заливки и тени капсулы,
стеклянные цвета прежние. Остальные glass-шапки (Диалоги, уроки, Learning V2) с капсулой, как после 7b252fa06.

## Scope

In scope: components/EnergyBar.tsx, components/spire/SpireEnergyPill.tsx, tests/energy_glass_capsule_contract.test.ts.
Out of scope: образец spire-gaps (перерисовывают Макеты по слову координатора).

## Architecture

No architecture change.

## Security and privacy

Не касается данных.

## Technical debt

- Образец spire-gaps с капсулой 60×28 до перерисовки Макетами будет давать diff на шапке Шпиля.

## Verification

energy_glass_capsule_contract, spire_gap009_dock, spire_shadow_style_fixes — 34/34 PASS.

## Rollback

Откат коммита.
