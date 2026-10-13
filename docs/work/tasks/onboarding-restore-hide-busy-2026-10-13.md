# Task packet: онбординг — под окном «Восстановить аккаунт?» не крутится спиннер Google и не висит «Вход всё ещё выполняется» (№23, замечание Макетов 13.10 ~17:25)

Governance-ID: TG-B8B1A6DE44B2
Status: In progress
Owner: 5 · АВТОРИЗАЦИЯ

## Outcome

Макеты (№23, Optimistic UI по «удаление/вход», только чтение) проверили 9c7850a10: двойной тап, «назад», спиннер на кнопке и текст провала — в порядке.

Одна мелочь того же класса, что фикс 11.10 для окна «Этот аккаунт уже есть»: пока открыто окно восстановления, под тёмной подложкой:
- продолжает крутиться спиннер на кнопке Google (`authLoading`);
- при входе дольше 8 с висит «Вход всё ещё выполняется» (`authSlow` ставится до окна и не сбрасывается).

Сейчас ждём человека, а не провайдера.

Правка: `offerAccountRestore(lang, decisionHooks)` вызывает те же крючки, что окно смены аккаунта (`switchDecisionHooks`):
- `onDecisionPending` — перед показом окна;
- `onDecisionMade(choice)` — после ответа.

Пока окно открыто, `awaitingSwitchDecision=true` прячет спиннер и плашку. Рендер уже проверяет этот флаг: `CleanOnboarding.tsx` ~3667/3686/3765/3770. После «Восстановить» спиннер возвращается — тогда идёт настоящий сетевой `restoreDeletedAccount`.

## Scope

In scope:
- `components/CleanOnboarding.tsx`: сигнатура `offerAccountRestore` и два вызова;
- `tests/aa_release_floor_auth_ui.test.ts`: строка вызова в сторожке порядка (смысл проверки прежний).

Out of scope: общий модуль `account_delete_restore_prompt.ts` — окно входа из Настроек, там спиннер иной.

## Architecture

Второй необязательный параметр `decisionHooks?: Readonly<{ onDecisionPending: () => void; onDecisionMade: (choice: string) => void }>`. Вызовы:
- перед `enqueueThemedBlockingChoiceAlert` → `onDecisionPending()`;
- сразу после → `onDecisionMade(String(choice))`.

Оба вызова — `await offerAccountRestore(lang, switchDecisionHooks)`.

## Security and privacy

Только показ состояния; сеть и данные не меняются.

## Technical debt

Нет.

## Verification

- syncheck; сторожа `aa_release_floor_auth_ui`, `aa_release_registration_restore_prompt`, `aa_dev_robot_no_cloud_and_restore`.
- Лог `[AUTH-SWITCH-OFFER] onboarding ui decision_pending / decision_made` появляется и при окне восстановления.

## Rollback

`git revert` коммита.
