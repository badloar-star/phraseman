# Maestro Smoke Suite

This folder contains critical smoke scenarios used as architectural safety gates.

## Flows

- `smoke/onboarding_to_first_lesson.yaml`
- `smoke/xp_gain_updates_home_hall.yaml`
- `smoke/premium_purchase_updates_energy_and_gates.yaml`
- `smoke/arena_matchmaking_to_results.yaml`
- `smoke/arena_invite_accept_flow.yaml`
- `smoke/settings_delete_account_recovery.yaml`

### Navigation smoke (stack + `testID`)

- `smoke/nav_quizzes_level_select_and_back.yaml` — главная → квизы → выбор уровня → назад
- `smoke/nav_lesson_menu_to_lesson_and_back.yaml` — Уроки → меню урока 1 → старт → назад ×2
- `smoke/nav_flashcards_open_and_back.yaml` — главная → карточки → назад
- `dev_only/nav_quiz_result_home_from_testers.yaml` — админ-панель → мок результата квиза → «На главную» (только `__DEV__` или `DEV_MODE=true`). Прогон: `npm run maestro:dev`

Одиночный прогон:

```bash
powershell -ExecutionPolicy Bypass -File ./scripts/run_maestro.ps1 maestro/flows/smoke/nav_quizzes_level_select_and_back.yaml
```

## Regression Flows

- `regression/tab_navigation_contract.yaml` (hard assertions for home/hall/settings tab contracts)
- `regression/arena_lobby_contract.yaml` (hard assertions for home -> arena lobby critical CTAs)
- `regression/settings_contract.yaml` (hard assertions for settings profile + delete account controls)

## Modular suite (по фичам, один эмулятор — последовательно)

Папка `flows/modules/**` — контракты по областям: уроки, арена, квизы, карточки, настройки, зал славы. Общий вход: `flows/_shared/boot_to_home.yaml` (только `runFlow`, не гонять отдельно).

```bash
npm run maestro:modules
```

Несколько эмуляторов / шардирование (параллельно разные YAML, не один девайс):

```bash
maestro test maestro/flows/modules --shard-split 2 --device emulator-5554,emulator-5556
```

(подставьте свои `adb devices` UDID).

## Local Run

```bash
powershell -ExecutionPolicy Bypass -File ./scripts/run_maestro.ps1 maestro/flows/smoke
```

Or run all via npm script:

```bash
npm run maestro:smoke
```

Regression suite:

```bash
npm run maestro:regression
```

Strict suite (deeper chained business flows):

```bash
npm run maestro:regression:strict
```

## CI Gate Scope

The smoke suite is required for PRs that touch critical architecture files:

- `app/_layout.tsx`
- `app/xp_manager.ts`
- `app/premium_guard.ts`
- `components/EnergyContext.tsx`
- `app/arena_*`
- `app/firestore_*`
