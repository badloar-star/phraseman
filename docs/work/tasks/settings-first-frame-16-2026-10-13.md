# Task packet: №16 — первый кадр «Настроек» (1,3–1,4 с → цель ≤500 мс), шаг 1: отложенный монтаж окна входа + замер по поддеревьям

Governance-ID: TG-C5270FB03663
Status: In progress
Owner: 5 · АВТОРИЗАЦИЯ

## Outcome

Факты журнала `[SETTINGS-PERF]` (c3509ed9f), кадр Сверки 13.10 15:58 (dev-сборка, вход ссылкой, вкладка не прогрета — `premounted=нет`):
- `commit renderToCommitMs=469` — сама сборка дерева экрана;
- `first_focus sinceCommitMs=250`;
- `header_layout sinceRenderMs=747`.

По коду в дерево первого кадра всегда входит скрытое окно входа `RegistrationPromptModal`: 2507 строк, 86 хуков, без раннего выхода при `visible=false`. Оно монтируется и гоняет все хуки и эффекты, хотя открывается редко (кнопка «Войти», смена аккаунта).

Шаг 1:
- **Замер:** `React.Profiler` вокруг тела экрана (`settings_body`) и окна входа (`settings_auth_modal`). Лог `[SETTINGS-PERF] profile id=… phase=mount actualMs=…` — раз на монтирование, только `__DEV__`. Покажет, какую долю первого кадра занимает каждое поддерево.
- **Ускорение:** окно входа монтируется скрытым ПОСЛЕ первого кадра и взаимодействий (`InteractionManager.runAfterInteractions`). Если кнопку нажали раньше — монтируется сразу по `visible`. Переход скрытое→открытое для окна прежний: оно уже смонтировано скрытым к моменту тапа.

Следующий шаг — по журналу пересъёмки, если первого кадра всё ещё больше 500 мс.

## Scope

In scope: `app/(tabs)/settings.tsx` — состояние `authPromptMounted`, условный рендер окна входа, два `Profiler`.
Out of scope: сам `RegistrationPromptModal`; `StudyLanguageSheet` (196 строк, мелко).

## Architecture

- `const [authPromptMounted, setAuthPromptMounted] = useState(false)`. Эффект при монтировании: `InteractionManager.runAfterInteractions(() => setAuthPromptMounted(true))` с отменой. Рендер окна: `authPromptMounted || authPromptVisible`.
- `onSettingsProfile(id, phase, actualDuration)` — лог только `__DEV__` и только `phase === 'mount'`. В стор-сборке Profiler не профилирует и не стоит ничего.

## Security and privacy

Только вёрстка и порядок монтирования; данные не меняются.

## Technical debt

- `Profiler`-логи временные (№16) — убрать вместе с остальными `[SETTINGS-PERF]` после достижения цели.

## Verification

- syncheck; сторожа `settings_root_liquid_glass_source_contract`, `aa_guest_honesty_contract`, `startup_provider_reauth_recovery`, `video_language_pill_study_target`.
- Пересъёмка SP1 (Сверка): `[SETTINGS-PERF] commit renderToCommitMs` и `profile id=settings_auth_modal`; окно входа открывается как раньше.

## Rollback

`git revert` коммита.
