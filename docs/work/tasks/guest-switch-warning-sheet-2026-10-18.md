# Task packet: шторка «Войти в другой аккаунт?» (гость с прогрессом) — компонент GuestSwitchWarningSheet

Governance-ID: TG-E0DEBC8905B1
Governance-ID: TG-7040563D33BD
Governance-ID: TG-50974865DB4A
Governance-ID: TG-2DB3D4AD2C33
Status: In progress
Owner: сессия «2 · ДИЗАЙН»
Related epic/enabler: правило владельца «гость с прогрессом входит в другой существующий аккаунт — одно предупреждение»

## Outcome

Новый компонент `components/auth/GuestSwitchWarningSheet.tsx` строго по макету `docs/design/v2-app/guest-switch-warning.html` (b973ac57d), тёмная и светлая тема:
- «Войти» — cta, «Отмена» — buttonFill с тенью; заголовок 21/27, текст 16/22, кнопки 52, зазор 12;
- смахивание шторки = «Отмена», ничего под таббаром;
- пропсы `{ visible, accountLabel?, onConfirm, onCancel }`; тексты из `guestSignInOtherAccountCopy` (`app/account_switch_copy.ts`, только чтение);
- после «Войти» кнопка сразу неактивна (защита от двойного тапа);
- журнал `[AUTH-SWITCH-SHEET]` на показ и на выбор; тест на рендер обеих кнопок.

Подключение в поток входа делает сессия «Авторизация» (не я).

## Scope

In scope: новый компонент и его тест.
Out of scope: поток входа, `account_switch_copy.ts` (только чтение), Settings/RegistrationPromptModal.

## Architecture

Шторка на общей оболочке шторок проекта (как у остальных нижних шторок); цвета только из токенов темы (`liquidGlassTokens`). Внутреннее состояние `confirmed` блокирует кнопки после «Войти»; закрытие смахиванием/фоном вызывает `onCancel` один раз.

## Security and privacy

Показывает только предупреждение и необязательную подпись аккаунта (`accountLabel`), которую передаёт вызывающий; в журнал имя/почта не пишутся (только факт показа и выбор).

## Technical debt

- Подпись аккаунта отображается, только если передана; формат подписи решает Авторизация.

## Verification

- `babel.parseSync` компонента;
- тест рендера обеих кнопок, двойного тапа и смахивания через `slot.sh run`;
- склейка «макет | эмулятор» — через Сверку.

## Rollback

`git revert` коммита: файлы компонента и теста удаляются, потребителей пока нет.
