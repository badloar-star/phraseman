# Task packet: обновить ожидания двух тестов-контрактов под новые тексты входа (координатор)

Governance-ID: TG-617154E20490
Status: In progress
Owner: сессия «Специалист по переводам»
Related epic/enabler: R07

## Outcome

Тесты `registration_prompt_recovery_ui_contract` и `onboarding_auth_busy_state_contract` ждут новые тексты того же смысла, без технических слов:
- «Локальный прогресс сохранён» → «Прогресс на этом телефоне сохранён» (c073caee1);
- «Вход всё ещё выполняется… Кнопки останутся недоступны» → «Вход ещё идёт… Кнопки снова заработают» (acd0c034c).
Ожидание поведения `ENABLE_DEV_TOOLS && code` — не текст: его снял c073caee1 (Авторизация, «код ошибки только в журнал»); решать Авторизации.

## Scope

In scope: только текстовые ожидания в двух тест-файлах.

Out of scope: файлы входа (`auth_provider`, `account_switch_*`, `CleanOnboarding.tsx`), поведенческие проверки.

## Architecture

No architecture change.

## Security and privacy

Не применимо.

## Technical debt

- Строка `ENABLE_DEV_TOOLS && code` в тесте остаётся красной до решения Авторизации — Accept temporarily: это не текст, а её поведенческая правка.

## Verification

- точечный прогон двух тестов через светофор.

## Rollback

`git revert <коммит>`.
