# Admin v2 legacy function transfer audit

Дата: 2026-06-27

Цель: переносить не только кнопки, но и реальные функции за ними. Старый `onclick` не считается готовым v2-действием.

## Команда

```powershell
node scripts/admin-legacy-button-audit.mjs
```

Теперь скрипт пишет:

- `.codex-tmp/admin-audit/legacy-functions.json`;
- `.codex-tmp/admin-audit/legacy-functions-summary.json`;
- `.codex-tmp/admin-audit/legacy-button-function-links.json`.

## Текущая сводка

- legacy-функций найдено: `626`;
- пишущих функций: `119`;
- функций с confirm-сигналом: `90`;
- функций с audit-сигналом: `116`;
- callable-backed функций: `13`;
- связанных button/function actions: `269`;
- связанных write actions: `110`;
- linked write без confirm-сигнала: `20`;
- linked write без audit-сигнала: `18`;
- unresolved onclick/function links: `76`.

## Решения по переносу

| Класс | Решение | Что делать |
| --- | --- | --- |
| `load*`, `copy*`, `export*` | Native lane | Переносить первыми как read-only после query contract, loading, empty, error. |
| `save*`, `set*`, `update*` remote config | Guarded write | Только через preview, approval, audit history, rollback value. |
| campaign writers | Guarded write | Campaign Wizard: audience, quiet hours, test send, summary, stop rule. |
| user money/access tools | Backend required | Нужен permission key, reason, callable/rules-backed write, audit, rollback. |
| content publish tools | Guarded write | Preview affected items, checklist, schedule, rollback version, audit. |
| community moderation | Guarded write | Разделить действие над контентом и наказание пользователя. |
| `httpsCallable` actions | Backend contract | Проверить callable schema, permissions, errors, audit. |
| unresolved onclick links | Inspect before move | Не переносить, пока не найден реальный handler. |

## Правило

Если функция пишет в Firestore или вызывает Cloud Function, она не получает прямую кнопку в v2, пока нет:

- понятного текста действия;
- preview;
- confirm;
- permission key;
- audit event;
- rollback/off switch;
- error state;
- query contract;
- теста или browser smoke.
