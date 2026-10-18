# Task packet: шторка гостя подключена к окну входа — гость с прогрессом, вход в существующий другой аккаунт

Governance-ID: TG-5DFC4F7ABCBF
Governance-ID: TG-8B35CE18E49A
Status: In progress
Owner: сессия «2 · ДИЗАЙН» (срочное поручение координатора 18.10; модуль `app/guest_switch_offer.ts` — Авторизация)
Related epic/enabler: правило владельца 2 (гость с прогрессом входит в другой существующий аккаунт: одно предупреждение, без слияния, без второго окна Google); `docs/work/tasks/guest-switch-warning-sheet-2026-10-18.md`

## Outcome

Когда вход гостя с прогрессом упирается в уже существующий другой аккаунт (`account_switch_required`), окно входа больше не показывает карточку «Вход не завершился», а открывает шторку `GuestSwitchWarningSheet`: «Войти» переводит в существующий аккаунт (без слияния, без второго окна Google), «Отмена» молча оставляет человека гостем. Итог входа после «Войти» обрабатывается теми же ветками, что обычный вход.

## Scope

In scope: `components/RegistrationPromptModal.tsx` — вызов `runGuestSwitchToExistingAccount(provider)` на отказ `account_switch_required`, подключение `useGuestSwitchOffer()` к шторке (проп `guestSwitch` остаётся переопределением для тестов), закрытие окна отменяет висящее предложение (`cancelGuestSwitchOffer`); сторож в `tests/registration_prompt_recovery_ui_contract.test.ts`.
Out of scope: `app/guest_switch_offer.ts` и `app/auth_provider.ts` (Авторизация).

## Architecture

После `signInWithProvider` результат `account_switch_required` передаётся в `runGuestSwitchToExistingAccount`: `cancelled` → тихо (кнопки снова активны), `failed` → мягкая карточка «other» и повтор, `signed_in` → результат подменяет исходный и идёт по обычному пути ниже (журнал, обработка отказов, завершение). Шторка берёт состояние из `useGuestSwitchOffer()`.

## Security and privacy

Данных не собираем; журнал без uid и почты; прогресс гостя не переносится (решение владельца).

## Technical debt

- Пропуск выбранного аккаунта хранит `auth_provider` (только память процесса, ≤ 10 мин).

## Verification

- `babel.parseSync`; тесты окна входа и шторки через `slot.sh run`; склейка «макет | эмулятор» — Сверка.

## Rollback

`git revert` коммита: окно снова показывает общую карточку на `account_switch_required`.
