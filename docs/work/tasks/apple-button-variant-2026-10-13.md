# Task packet: «Войти через Apple» не сливается с тёмной плитой — белый стиль на тёмном, чёрный на светлом (координатор 13.10 ~19:05)

Governance-ID: TG-BDBECDBDC333
Status: Тесты пишутся сейчас; код — сразу после прогона №2 (правка components/ меняет сборку на эмуляторе)
Owner: 5 · АВТОРИЗАЦИЯ

## Outcome

`AppleSignInButton` (`components/AuthProviderButtons.tsx`) всегда чёрная `#000`. На тёмной плите онбординга (`#0C111B`) она сливается с фоном, а правило владельца — «никакие кнопки не сливаются».

По Apple HIG у Sign in with Apple два официальных стиля:
- на тёмном фоне — белый (белая заливка, чёрный логотип и текст);
- на светлом — чёрный.

Стиль выбирается по реальному фону места:
- онбординг, плита входа — фон всегда `#0C111B`, тема на онбординг не влияет → `dark`;
- онбординг, таблетка на экране политики — тот же фон → `dark`;
- шторка регистрации `RegistrationPromptModal` — по теме: `isLightThemeMode(themeMode)` → `light`, иначе `dark`.

Остальной вид онбординга не меняется.

## Scope

In scope:
- `components/AuthProviderButtons.tsx` — prop `variant`, чистая функция `appleButtonColors(variant)`, лог `[AUTH-APPLE-BTN]`;
- `components/CleanOnboarding.tsx` — 2 вызова `variant="dark"`;
- `components/RegistrationPromptModal.tsx` — 1 вызов `variant` по теме;
- тест `tests/auth_apple_button_variant_contract.test.ts`.

Out of scope: кнопка Google, размеры, тексты, логика входа.

## Architecture

- `appleButtonColors('dark') = { background: '#FFFFFF', ink: '#000000' }`, `('light') = { background: '#000000', ink: '#FFFFFF' }`.
- По умолчанию `variant = 'light'` — прежний чёрный вид для мест без prop.
- Лог `[AUTH-APPLE-BTN] variant=… background=… shape=…` — один раз на монтирование, только dev.

## Security and privacy

Только вид кнопки. Вход и данные не меняются.

## Technical debt

- Вариант задают места вызова вручную, как у Google. Если плита онбординга станет зависеть от темы, места вызова надо будет перевести на `isLightSurface(bg)`.

## Verification

- `npm run test:one -- tests/auth_apple_button_variant_contract.test.ts`: цвета обоих стилей; по каждому месту — какой `variant`.
- Соседние сторожа: `aa_auth_double_tap_contract`, `auth_surfaces_english_contract`, `registration_prompt_modal_lifecycle`, `shadow_style_no_container_borders`.
- Кадр Сверки: онбординг (плита и таблетка) и шторка в тёмной и светлой теме.

## Rollback

`git revert` коммита.
