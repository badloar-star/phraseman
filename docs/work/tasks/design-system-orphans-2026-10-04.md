# Task packet: «сироты» паритета system.html — ErrorBoundary (system_12) и AppMessagesInbox (system_17)

Governance-ID: TG-8A271F7F743E
Governance-ID: TG-848E76321790
Governance-ID: TG-4D7B3ED7FCD1
Status: In progress
Owner: сессия «2 · Дизайн» (контур 2, LANES.md); правки оставил выбывший фоновый исполнитель координатора
Related epic/enabler: гейт «приложение = макет», system.html

## Outcome

Экран ошибки (system_12) и входящие сообщения (system_17) совпадают с макетом system.html; сторожа вида обновлены
под макет; правки закоммичены, рабочее дерево по этим файлам чистое.

## Scope

In scope: `components/ErrorBoundary.tsx` (стили + текст тела по макету, 9 языков), `components/AppMessagesInbox.tsx`
(стили по макету), сторожа `tests/error_boundary_graphite_source_contract.test.mjs`,
`app_messages_read_persistence_ui_contract`.
Out of scope: логика показа, тон заголовка «Что-то пошло не так» (совпадает с макетом; D158 — решение владельца).

## Architecture

No architecture change: стили и тексты.

## Security and privacy

Не затрагивает данные.

## Technical debt

- Accept temporarily: основной текст 16 вместо макетных 15 — решение владельца D145 (только 16/13) новее макета
  26.09; владелец — координатор, вынесено в журнал паритета.

## Verification

Сторожа вида и типографики (node --test), склейка «макет | эмулятор» после подъёма эмулятора координатором.

## Rollback

`git revert` коммита.
