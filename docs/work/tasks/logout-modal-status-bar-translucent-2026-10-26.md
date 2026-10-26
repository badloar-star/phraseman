# Task packet: окно выхода AccountLogoutFlow — затемнение под строкой состояния на Android

Governance-ID: TG-F2D8EC48F1F5
Status: В работе
Owner: «5 · ВХОД»

## Outcome

От Тем через координатора 26.10: окно «Выйти» (`components/account/AccountLogoutFlow.tsx`) — прозрачный `<Modal>` без
`statusBarTranslucent`, на Android сверху светлая полоса. Окно по центру, полей ввода нет — флаг безопасен (нет сдвига
клавиатуры, как у ExplainReportButton/ReportErrorButton). Храповик `modal_status_bar_translucent_ratchet` уменьшается на строку.

## Scope

- `AccountLogoutFlow.tsx`: `statusBarTranslucent` на единственном `<Modal>`; отступы прокрутки `20 + insets.top/bottom`
  из `useStableSafeAreaInsets`, чтобы на низком экране / крупном шрифте карточка не уезжала под строку состояния.
  Разметка, тексты, стадии, логика выхода — без изменений.
- `tests/modal_status_bar_translucent_ratchet.test.mjs`: убрать строку `AccountLogoutFlow` из `ALLOWED`. В файле чужие
  незакоммиченные правки → коммит своей строкой через патч от HEAD.
- Сторож `tests/logout_modal_status_bar_translucent.test.mjs` (node --test): флаг и отступ от insets.

## Architecture

Нет изменений: тот же приём, что в окне удаления (04ca0c298).

## Security and privacy

Не затрагивает данные.

## Technical debt

Сверка кадра на эмуляторе Android (полосы нет, карточка по центру) — за Темами/Сверкой; у меня эмулятора нет.

## Verification

node --test: новый сторож, храповик, account_modals_liquid_glass_source_contract; разбор TSX без ошибок.

## Rollback

Откат коммита вернёт полосу; строку храповика вернуть тем же коммитом.
