# Task packet: кнопка Google в окне входа — белая с цветной G и тонкой линией (светлая тема)

Governance-ID: TG-917E02CB9B11
Status: In progress
Owner: сессия «2 · ДИЗАЙН» (решение координатора 18.10, пункт 5; вердикт Макетов A1.1)
Related epic/enabler: приоритет владельца «все ресурсы на вход»; `docs/work/tasks/sign-in-modal-mockup-verdict-fixes-2026-10-18.md`

## Outcome

В окне входа кнопка Google всегда белая с цветной G (как в эталоне `docs/design/v2-app/auth-states.html` и по правилам бренда Google). На светлой шторке её отделяет тонкая полупрозрачная линия 1 px и тень — две чёрные кнопки подряд (Google и Apple) исключены. В тёмных темах вид не меняется.

## Scope

In scope: `components/auth/SignInProgressButton.tsx` — берёт краску у `googleButtonPaintForSurface` (контракт `{ variant: 'light', edge: string | null }`, коммит 12c5d3be6 у «Темы»).
Out of scope: `components/auth_google_button_style.ts` и `tests/blend_auth_1018.test.ts` (Темы); онбординг (`CleanOnboarding.tsx`, `AuthProviderButtons`) — переводит Темы.

## Architecture

Линия рисуется внутренним кольцом `boxShadow` (inset, spread 1 px) — размер кнопки (54, радиус 27) не меняется, обводки-рамки нет. Альфу линии считает helper под ту поверхность, на которой стоит кнопка (`opaqueSheet`).

## Security and privacy

Данных не собираем.

## Technical debt

- Онбординг и `GoogleSignInButton` пока на старой тёмной кнопке в светлых темах — задача «Темы».

## Verification

- `babel.parseSync`; тесты окна входа (sign_in_progress_states, aa_auth_double_tap, auth_apple_button_variant) и сторож контраста `blend_auth_1018` (138 сочетаний тем) через `slot.sh run`;
- склейка «макет | эмулятор» (светлая тема) — Сверка.

## Rollback

`git revert` коммита: кнопка возвращается к выбору светлого/тёмного варианта по яркости шторки.
