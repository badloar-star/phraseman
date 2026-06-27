# Admin v2 legacy button/function audit

Дата: 2026-06-27

Цель: переносить старую админку не вслепую, а после проверки каждой кнопки и функции по Библии админки.

## Как пересобрать аудит

```powershell
node scripts/admin-legacy-button-audit.mjs
```

Скрипт читает `admin/index.html` и пишет:

- `.codex-tmp/admin-audit/legacy-buttons.json` - все legacy-кнопки поштучно;
- `.codex-tmp/admin-audit/legacy-buttons-summary.json` - сводка по вкладкам.

Скрипт ничего не меняет в приложении.

## Текущая сводка

- legacy-кнопок: `314`;
- write-like действий: `98`;
- потенциально опасных сигналов: `109`;
- кнопок без `title`/tooltip: `293`;
- кнопок с emoji в тексте: `147`;
- direct write candidates перед function-level проверкой: `98`.

## Главные проблемные зоны

| Legacy area | Новый раздел | Кнопок | Write | Risk | No tooltip | Emoji | Что исправить перед переносом |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| `openai-budget` | Диагностика | 155 | 36 | 44 | 143 | 71 | Разделить AI Ops, Money analytics и user tools. |
| `control-panel` | Приложение | 27 | 13 | 13 | 27 | 15 | Разнести update, banners, maintenance, premium, promo, AI. |
| `users` | Пользователи | 12 | 7 | 7 | 10 | 0 | Bulk actions только через permission, reason, confirm, audit. |
| `paywall-ab` | Деньги | 11 | 5 | 5 | 11 | 5 | Добавить control group, rollout health, rollback. |
| `push-notify` | Кампании | 9 | 4 | 7 | 9 | 1 | Audience, quiet hours, test send, approval, stop rule. |
| `league-chat` | Комьюнити | 8 | 7 | 7 | 8 | 0 | Разделить действие над сообщением и наказание пользователя. |
| `reports` | Диагностика | 7 | 3 | 3 | 5 | 4 | Развести reports по очередям и добавить action reason. |
| `app-messages` | Кампании | 4 | 3 | 3 | 4 | 2 | Перенести в Campaign Wizard. |
| `community-packs` | Комьюнити | 4 | 3 | 3 | 4 | 4 | Preview pack, reject reason, audit. |
| `arena-ranks` | Комьюнити | 4 | 2 | 2 | 3 | 4 | Stale-object preview и rollback note. |

## Gate перед переносом каждой кнопки

Кнопка не переносится в v2, пока не ясно:

- человеческое название действия;
- новый раздел из 7 категорий;
- кто затронут;
- есть ли write-действие;
- нужен ли `permission_key`;
- нужен ли `approval request`;
- нужен ли preview;
- нужен ли confirm;
- какая audit-запись создается;
- где rollback/off switch;
- какой query contract нужен;
- какой tooltip отвечает на 4 вопроса из Библии;
- нужна ли эта кнопка вообще на первом экране.

## Решение по переносу

- Read-only / refresh / export: переносить в native lane после tooltip и query contract.
- Dangerous write: переносить только как safe workflow skeleton до backend approval/audit контракта.
- Emoji button: заменить на Lucide icon + текст.
- Inline `onclick`: заменить на `data-action` + централизованный handler.
- Старый `title`: заменить на подробный `data-tooltip`.
- Кнопки с одинаковым смыслом: объединить в одну понятную форму.
