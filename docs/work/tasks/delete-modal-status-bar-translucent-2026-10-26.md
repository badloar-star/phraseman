# Task packet: окно удаления (классический Modal) — statusBarTranslucent + отступы безопасной зоны

Governance-ID: TG-42E4657C06E2
Status: В работе
Owner: «5 · ВХОД»

## Outcome

Темы (гейт safe-area) через координатора 26.10: прозрачная модалка подтверждения удаления на Android без statusBarTranslucent —
сверху светлая полоса. Добавить флаг и проверить отступ сверху. Отдельный коммит.

## Scope

`components/DeleteAccountConfirmModal.tsx`: классическая ветка `<Modal>` — `statusBarTranslucent`; вьюпорт окна — paddingTop/
paddingBottom от `useStableSafeAreaInsets`. Гибридная ветка уже через HybridAlertShell (флаг стоит). Тест.

## Architecture

Затемнение тянется под строку состояния, окно (по центру, maxHeight 90%) — внутри безопасной зоны.

## Security and privacy

Нет данных.

## Technical debt

Склейка «макет | эмулятор» для классической ветки — Темы/Сверка.

## Verification

Тест исходника: флаг и отступы; сторожа окна удаления.

## Rollback

Откат коммита — снова светлая полоса на Android.
