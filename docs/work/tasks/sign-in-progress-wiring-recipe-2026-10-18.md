# Подключение состояний входа в RegistrationPromptModal — рецепт для сессии «Авторизация»

Governance-ID: TG-642494B05BB1
Status: Wiring done by Design session — см. sign-in-wiring-2026-10-18.md
Owner: подключает «5 · АВТОРИЗАЦИЯ»; компоненты — «2 · ДИЗАЙН»
Related: `docs/design/v2-app/auth-states.html` (af3c6e324), `docs/work/tasks/sign-in-progress-states-2026-10-18.md`

Почему не подключено мной: `components/RegistrationPromptModal.tsx` — файл Авторизации, а его контракты (`aa_auth_double_tap_contract`, `registration_prompt_modal_lifecycle`, `auth_apple_button_variant_contract`, `registration_prompt_liquid_glass_source_contract`, `blend_auth_1018`) подменяют/проверяют `GoogleSignInButton`/`AppleSignInButton` внутри окна. Замена кнопок ломает эти тесты, поэтому правки и обновление сторожей делает владелец окна.

## Что подключить (по пунктам макета)

1. **Нажата кнопка** — вместо `GoogleSignInButton`/`AppleSignInButton` в окне:
   ```tsx
   <SignInProgressButton
     provider="google"            // или "apple"
     label={labelGoogle}          // labelApple
     busyLabel={signInBusyLabel}
     busy={loadingProvider === 'google'}
     dimmed={(loadingProvider !== null && loadingProvider !== 'google') || (loadingProvider === null && authOperationBusy)}
     surface={isLightThemeMode(themeMode) ? 'light' : 'dark'}
     onPress={() => handleSignIn('google')}
   />
   ```
   Импорты: `import SignInProgressButton from './auth/SignInProgressButton';`. Кольцо стоит на месте значка, размер не меняется, остальное 38 % и не нажимается. Значок/цвета Google и Apple — по бренд-правилам внутри компонента.
2. **«Входим…» с 3 с** — невидимый узел `auth-prompt-busy/slow` оставить для читалки, а рядом добавить видимую строку: `<SignInStatusLine active={loadingProvider !== null} announce={false} />` (из `./auth/SignInProgressNote`). Её таймеры 3 с и 8 с свои; `SIGN_IN_SLOW_THRESHOLD_MS = 8000` в окне **не менять** — он размораживает «Позже».
3. **Сбой — мягкая карточка** вместо красного текста: завести `signInFailureKind: SignInFailureKind | null` (тип из `./auth/sign_in_progress_copy`: `'network' | 'too_many' | 'cancelled' | 'other'`). Ставить рядом с `showInlineError(...)` в двух местах: ветка «сеть/много попыток» — `setSignInFailureKind(authErrorKind(result.error))` (`'network' | 'too_many' | 'other'`), `catch` входа — `'other'`; снимать в `handleSignIn` на старте (рядом с `setRetryProvider(null)`) и в сбросе окна. Рисовать над кнопками: `{signInFailureKind !== null && loadingProvider === null && !recoverySessionActive ? <SignInFailureCard kind={signInFailureKind} onRetry={retryProvider !== null ? () => { void handleSignIn(retryProvider); } : undefined} /> : null}`. Прежние `Text` с `inlineError` и кнопку «Повторить» скрыть при `signInFailureKind !== null`. Для `too_many` кнопки повтора нет (внутри компонента).
4. **«Позже» и ссылки при входе** — приглушить до 38 %: в `opacity` кнопки «Позже» (две ветки) добавить `(loadingProvider !== null && !signInSlow) ? 0.38 : …`, на `styles.legalLinks` — тот же `opacity`.
5. **Политика и Условия — по одной на строку**: `styles.legalLinks` → `flexDirection: 'column'`, `alignItems: 'center'`, `rowGap: 6`; разделитель `|` убрать.
6. **После входа** шторка уезжает, «Аккаунт» сразу показывает почту и способ входа — это логика `onSignedIn`/`onClose`, вид не требует нового компонента.

## Тексты

В `components/auth/sign_in_progress_copy.ts`: «Входим…», строка 8 с, «Не получилось войти», причины «окно закрыли» и «другое», «Попробовать ещё раз» — 9 языков, черновик, нужен Переводчик. «Связь пропала» и «много попыток» — из `app/auth_error_copy.ts`.

## Проверка

Тест состояний: `tests/sign_in_progress_states.test.tsx` (11/11). После подключения — склейка «макет | эмулятор» (тёмная и светлая): нажата / «Входим…» / сбой.

## Rollback

Откат подключения — вернуть прежние кнопки и текст ошибки; компоненты остаются неиспользуемыми.
