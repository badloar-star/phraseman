# Task packet: 🔴 откат dev_state на replace — dismissTo не переключал вкладку (регресс, Сверка 14.10 21:28)

Governance-ID: TG-8A4FD266C691
Status: In progress — откат сразу после коммита с регрессом
Owner: 5 · АВТОРИЗАЦИЯ

## Outcome

Факт (Сверка 21:28–21:30, studyTarget=en):
- `dev_state?…&next=/(tabs)/settings` → журнал `dismissTo вызван … canDismiss=true`, но на экране остаётся предыдущая вкладка;
- `next=/(tabs)/community?section=spire` — то же;
- `next=/settings_themes` — работает.

Сломаны почти все DEV_LINKS Пика, Сообщества и Настроек: робот снимает не те экраны, PCF ×3 не снят.

Причина: `dismissTo` снимает dev_state и останавливается на существующей группе `(tabs)`. Кастомный перелистыватель вкладок на смену параметров этим путём не переключается.

Откат: возвращён `router.replace(next)` (как было до 21:30).
- Вкладка переключается.
- Вторая копия `(tabs)` в стеке остаётся известным артефактом тестового входа, у пользователей его нет.
- Дубль чинить отдельно и только по логам: журнал пишет canDismiss.

## Scope

In scope: `app/dev_state.tsx` (одна ветка) + сторож `tests/dev_state_no_duplicate_tabs.test.ts` (переписан на правило «replace, вкладка переключается»).

## Architecture

Как до 21:30, плюс строка журнала с canDismiss.

## Security and privacy

Только dev-маршрут.

## Technical debt

- Дубль `(tabs)` после dev_state.
  - Кандидат: `router.dismiss(1)`, затем `router.navigate(next)`.
  - Сначала логи: что видит перелистыватель вкладок при navigate на существующую группу.

## Verification

- Сторож.
- Сверка: `next=/(tabs)/settings` и `next=/(tabs)/community?section=spire` открывают нужную вкладку, затем PCF ×3.

## Rollback

`git revert`.
