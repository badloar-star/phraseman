# Ядро · доказательство `component_unreachable` для гейта «приложение = макет» + сторож «назад» из сессии диалога

Governance-ID: TG-8ECA1DF43EBE
Status: In progress
Owner: 1 · ЯДРО (решения координатора 26.10)

## Outcome
1. Гейт знает третий вид доказательства `no_release_surface`:
   `{ kind: 'component_unreachable', components: [...], guard_test }`. Каждый компонент существует, и ни один файл рабочего
   кода его не импортирует (относительный путь, `@/`, `require`, `import()`). Строки снятых экранов Learning V2 Макеты
   смогут сделать зелёными честно.
2. Сторож `tests/component_unreachable_guard.test.mjs` читает настоящий реестр и краснеет, как только у такого компонента
   появился импорт.
3. Решение координатора «назад из идущей сессии диалога — в хаб» внесено в `tests/back_nav_registry_contract.test.ts` с
   причиной (брифинг = повторная трата энергии): сессия остаётся вне реестра, все её выходы ведут в `/ai_dialog_home`.

## Scope
In scope: `scripts/visual_parity_gate.mjs`, `tests/component_unreachable_guard.test.mjs`,
`tests/back_nav_registry_contract.test.ts`. Отдельные коммиты.
Out of scope: строки реестра `visual_parity.json` (Макеты), поведение навигации (не меняется).

## Architecture
`componentImporters(root, component)` — обход `app components modules hooks constants contexts lib store_release_stubs`
без тестов и `node_modules`. `releaseSurfaceViolations` получает ветку `component_unreachable`; коды нарушений:
`release_surface_components_missing`, `release_surface_component_missing`, `release_surface_component_imported`,
`release_surface_guard_missing`, `release_surface_guard_unrelated`.

## Security and privacy
Не затрагивает данные.

## Technical debt
Импорт из dev-превью тоже считается достижимостью (строго, по слову координатора «нигде не импортируется»). Если снятый
компонент живёт в dev-превью — Макеты скажут, тогда решать отдельно.

## Verification
`node --test tests/component_unreachable_guard.test.mjs`, `node --test tests/visual_parity_gate.test.mjs`,
`tests/back_nav_registry_contract.test.ts`.

## Rollback
Откат коммитов; реестр не менялся.
