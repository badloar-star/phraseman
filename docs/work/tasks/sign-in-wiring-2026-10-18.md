# Task packet: подключение состояний входа в RegistrationPromptModal + правка пяти сторожей

Governance-ID: TG-D520AAA4986F
Governance-ID: TG-A1EC3125908C
Governance-ID: TG-891C83999CD8
Status: In progress
Owner: сессия «2 · ДИЗАЙН» (решение координатора 18.10: «подключай сам», Авторизация перегружена)
Related epic/enabler: приоритет владельца 18.10 «все ресурсы на вход»; макет `docs/design/v2-app/auth-states.html` (af3c6e324); рецепт `sign-in-progress-wiring-recipe-2026-10-18.md`

## Outcome

Окно входа `components/RegistrationPromptModal.tsx` показывает состояния по макету одним коммитом вместе со сторожами:
1. нажата кнопка — кольцо на месте значка, остальное 38 % и не нажимается;
2. строка «Входим…» с 3 с (порог 8 с в окне НЕ меняется — он размораживает «Позже»; строка с 3 с — отдельный компонент со своими таймерами);
3. сбой — мягкая карточка над кнопками вместо красного: «Не получилось войти» + причина (из `auth_error_copy`) + «Попробовать ещё раз», при «много попыток» кнопки нет;
4. «Политика» и «Условия» — по одной на строку;
5. после входа шторка уезжает, «Аккаунт» сразу с почтой и способом входа (логика `onSignedIn`/`onClose` не меняется).
Пять сторожей (`aa_auth_double_tap_contract`, `registration_prompt_modal_lifecycle`, `auth_apple_button_variant_contract`, `registration_prompt_liquid_glass_source_contract`, `blend_auth_1018`) проверяют то же поведение на новых кнопках — двойной тап, жизненный цикл, вариант Apple, стекло, контраст; ослаблять нельзя.

## Scope

In scope: `components/RegistrationPromptModal.tsx` (только вид и состояние карточки сбоя), `components/auth/SignInProgressButton.tsx` (цвета по правилам Google/Apple и контраста), правка перечисленных пяти сторожей.
Out of scope: логика входа и её скорость, `handleSignIn`, пороги и таймеры окна, онбординг (`CleanOnboarding` остаётся на `AuthProviderButtons`), `account_details`.

## Architecture

Окно получает `signInFailureKind` (`network | too_many | other`) рядом с прежним `inlineError`: прежние сообщения (смена аккаунта, отказы) остаются текстом, сбой входа рисуется карточкой. Кнопки провайдеров заменены на `SignInProgressButton` (busy/dimmed из `loadingProvider` и `authOperationBusy`), цвета Google — по `googleButtonVariantForSurface(glass.opaqueSheet)` как раньше ([BLEND-AUTH]: кнопка не сливается со шторкой), Apple — по `appleButtonColors`.

## Security and privacy

Данных не собираем. Код ошибки на экран не попадает (в журнал — как раньше `[AUTH-MODAL]`); текст исключений и почта не выводятся.

## Technical debt

- Макет рисует светлую Google белой с тонкой линией; по правилу владельца «кнопки не сливаются» (сторож контраста по 138 сочетаниям тем) на светлой шторке остаётся тёмная кнопка Google — расхождение сообщено Макетам, образец правят они.
- Старые кнопки `GoogleSignInButton`/`AppleSignInButton` остаются в онбординге.

## Verification

- `babel.parseSync` изменённых файлов, ратчет шрифтов;
- точечные тесты через `slot.sh run`: пять сторожей, `sign_in_progress_states`, остальные тесты, упоминающие окно входа;
- `git status` окна перед коммитом: если Авторизация успела его тронуть — стоп и вопрос координатору;
- склейка «макет | эмулятор» (нажата / «Входим…» / сбой, тёмная и светлая) — Сверка.

## Rollback

`git revert` коммита: окно возвращается на прежние кнопки и красный текст, компоненты состояний остаются неиспользуемыми.

## Дополнение 18.10 (координатор, приёмочные тесты Сайта `account_switch_owner_rules_1018`)

1. Текст «This phone is already linked…» в `RegistrationPromptModal.tsx` удаляется полностью.
2. Предложение «Сменить аккаунт» (текст и кнопка с переходом в Настройки) убирается: при вошедшем A кнопки Google/Apple просто запускают вход в B (сам вход делает `auth_provider` у Авторизации).
3. Окно получает показ `GuestSwitchWarningSheet` по сигналу из потока входа: пока API у Авторизации нет — необязательные пропсы-колбэки с журналом `[AUTH-SWITCH-SHEET]`, подключит Авторизация.
