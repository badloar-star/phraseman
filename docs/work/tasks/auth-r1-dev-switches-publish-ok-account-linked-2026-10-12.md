# Task packet: подмены съёмки publish=ok (cards-gap-025) и account=linked (settings-gap-001)

Governance-ID: TG-E865F0752530
Governance-ID: TG-CA40D4F5A47C
Status: Done
Owner: 5 · АВТОРИЗАЦИЯ (координатор 12.10)

## Outcome

- cards-gap-025 «Публикация — отправлено»: `publish=ok` — успешная публикация набора ТОЛЬКО в памяти (ни Firestore, ни callable),
  экран показывает тот же исход, что после настоящей отправки.
- settings-gap-001 «Главная — профиль привязан»: `account=linked` — Настройки рисуют привязанный аккаунт (подставные имя и почта
  alex.demo@example.com) только для показа; любые действия аккаунта (выход / смена / удаление / синхронизация) при флаге отказывают ДО
  побочных эффектов с логом; включение — только на одноразовом госте (guest=required).

## Scope

In scope: dev-модули состояния (память), точки внедрения в publish_pack_flow и экране Настроек, заглушки store_release_stubs,
разбор ссылки dev_state_fixtures, тесты, раздел «Авторизация» в DEV_SWITCHES_R1_CORE.md.
Out of scope: серверные функции, правила Firestore, настоящий вход, вид экранов.

## Architecture

Флаги в памяти процесса, геттеры `__DEV__ && !IS_STORE_RELEASE`; стор-сборка получает заглушки (metro), гейт store_release_stubs_gate.

## Security and privacy

Подставная почта — example.com (не реальная). Никаких записей в прод; действия аккаунта при подмене не выполняются вовсе.
Сторож прод-записей должен остаться зелёным.

## Technical debt

- Contain: ключи — в существующих dev-модулях.

## Verification

Поведенческие тесты геттеров и отказов действий, контракт мест внедрения (до сети), store_release_dev_state_stubs, гейт заглушек.

## Rollback

Откат коммита; состояние только в памяти.
