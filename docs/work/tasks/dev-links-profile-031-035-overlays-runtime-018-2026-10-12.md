# Task packet: ссылки съёмки для profile-031…035 и overlays-runtime-018 (пропущены Сверкой в chain7) + записка Codex о запускателе

Governance-ID: TG-F6ABCD618EC0
Status: Done
Owner: 5 · АВТОРИЗАЦИЯ (координатор 12.10)

## Outcome

- Для profile-031, 032, 033, 034, 035 и overlays-runtime-018: строка в scripts/dev_links_r1_steps_auth.py (ссылка + шаги до состояния),
  перегенерация docs/phraseman-2.0/DEV_LINKS_R1.md, уникальность в dev_links_r1_contract.
- docs/phraseman-2.0/handoff/CODEX_PROVISION_LOCK_LAUNCHER_2026-10-12.md — одна строка для Codex (перенести внешний запускатель в репозиторий).

## Scope

In scope: генератор ссылок своей зоны, сгенерированная таблица, записка. Out of scope: код приложения (если состояние недостижимо
без кода — вынести координатору), profile-027 и overlays-runtime-017 (убраны владельцем, п.85).

## Architecture

Ссылка phraseman://dev_state?…&next=… + шаги робота; только гость или №2/№3, dev-подмены в памяти, без настоящих выходов/удалений.

## Security and privacy

Без записи в прод; аккаунт №1 не трогается.

## Technical debt

- Contain: нет.

## Verification

Генератор без ошибок; tests/dev_links_r1_contract (уникальность); ссылки сверены с кодом (testID, маршруты, параметры).

## Rollback

Откат коммита.

## Result

profile-031…035 — в реестре status=removed_by_owner (правило 22.09: уведомлений об удалении не показывать) → ссылки не нужны, пропуск Сверки верный.
overlays-runtime-018 — ссылка: account=support_only&logout=hold (№3; прогресс выхода держится 120 с, затем отказ без стирания) + LOGOUT_TAP.
DEV_LINKS_R1 перегенерирована (заодно догнала закоммиченные шаги dialogs-017/018/036 других сессий). dev_links_r1_contract 6/6, prod_write_guard 4/4;
dev_links_r1_selectors_exist красный ДО правки (15 динамических testID в разных файлах шагов, напр. language-welcome-option-${id}) — не мой шаг.
