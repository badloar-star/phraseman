# Admin v2 legacy migration matrix

Дата: 2026-06-27

Цель: не потерять ни одну полезную функцию из старого `admin/index.html` при переходе на `admin/v2/`.

Старый файл содержит:

- 42 legacy-вкладки;
- 314 кнопок;
- 306 inline `onclick`;
- длинное меню без ясной категории.

Правило миграции: функция не переносится как отдельная вкладка первого уровня. Она получает новый дом в одной из 7 категорий Библии админки.

## Статусы

- `В v2` - уже есть нативный экран или read-only обзор в Admin v2.
- `Workflow` - новый дом и безопасный процесс уже определены, но write-действия должны быть подключены через preview, confirm, permission key, reason, audit и rollback.
- `Fallback` - функция сохранена через старую админку до нативного переноса. После completion-board таких строк должно быть `0`.

## Матрица

| Legacy tab | Новый раздел | Статус | Риск | Комментарий |
| --- | --- | --- | --- | --- |
| `control-panel` | Приложение | В v2 | высокий | Разбит на update, banners, maintenance, flags, promo, premium и AI controls. |
| `remote-config` | Приложение | Workflow | высокий | Должен стать Flag Registry. |
| `app-messages` | Кампании | Workflow | высокий | Должен идти через Campaign Wizard. |
| `push-notify` | Кампании | Workflow | высокий | Нужны audience, quiet hours, test send, approval. |
| `review-promo` | Кампании | Workflow | средний | VIP survey как campaign с stop action. |
| `referrals` | Кампании | В v2 | средний | Есть v2-дом в Native completion board и campaign analytics lane. |
| `users` | Пользователи | В v2 | высокий | Search, profile summary, activity timeline. |
| `ban-list` | Пользователи | Workflow | высокий | Confirm, reason, permission, audit. |
| `mod-queue` | Комьюнити | В v2 | высокий | Разделено на UGC и League moderation. |
| `ideas` | Пользователи | В v2 | низкий | Есть v2-дом как feedback/reports queue. |
| `premium` | Деньги | В v2 | высокий | Видно в Money, write позже через permission. |
| `vip` | Деньги | В v2 | высокий | Grant/revoke через sensitive policy. |
| `refunds` | Деньги | В v2 | высокий | Refund policy и revenue queue. |
| `ugc-purchases` | Деньги | В v2 | средний | Часть marketplace/revenue обзора. |
| `paywall-ab` | Деньги | Workflow | высокий | Нужны control group, rollout, rollback. |
| `cancel-surveys` | Деньги | В v2 | средний | Churn feedback. |
| `openai-budget` | Диагностика | В v2 | средний | AI Ops, не Revenue. |
| `analytics` | Обзор | В v2 | средний | Стартует из Overview, saved views и completion lanes. |
| `reports` | Диагностика | В v2 | высокий | Разделяется по очередям. |
| `user-reports` | Пользователи | В v2 | высокий | User reports в timeline/tasks. |
| `website-inbox` | Диагностика | В v2 | средний | Есть support queue home; assignment/status/export подключаются позже. |
| `explain-reports` | Контент | В v2 | средний | Content reports. |
| `explain-cache` | Контент | Workflow | средний | Reset только с preview и audit. |
| `compass` | Контент | В v2 | средний | Есть v2-дом как Content QA signal. |
| `card-packs` | Контент | В v2 | средний | Content overview и publish policy. |
| `daily-phrases` | Контент | Workflow | высокий | Preview, schedule, rollback, audit. |
| `community-packs` | Комьюнити | В v2 | высокий | UGC moderation и marketplace. |
| `clubs` | Комьюнити | В v2 | средний | League/club signals. |
| `league-chat` | Комьюнити | В v2 | высокий | Moderation, reports, restrictions. |
| `arena-ranks` | Комьюнити | В v2 | средний | Community data, не первый уровень. |
| `arena-live` | Комьюнити | В v2 | средний | Только существующие arena источники. |
| `arena-bets` | Комьюнити | Workflow | высокий | High-risk flag, нужен approval. |
| `arena-rooms` | Комьюнити | В v2 | средний | Community live signals. |
| `app-health` | Диагностика | В v2 | высокий | Release Health. |
| `ops-log` | Диагностика | В v2 | средний | Отдельно от audit/reports. |
| `audit` | Диагностика | В v2 | высокий | Admin actions и rollback source. |
| `alerts` | Диагностика | В v2 | высокий | Global alerts. |
| `archive` | Диагностика | В v2 | низкий | Support material. |
| `changelog-0608` | Диагностика | В v2 | низкий | Historical archive живет в Diagnostics archive lane. |
| `onboarding-qa` | Диагностика | В v2 | средний | Есть Diagnostics health lane. |
| `overview` | Обзор | В v2 | низкий | Daily overview. |
| `${actionTab}` | Диагностика | В v2 | средний | Закрыто через Migration coverage и legacy action resolver. |

## Следующий gate перед отключением старой админки

- Каждая `Fallback`-строка должна получить нативный v2-экран или явное решение "оставить в Archive". Текущий статус: `0` fallback.
- Каждая `Workflow`-строка должна получить real write path: preview, confirm, approval, audit, rollback.
- После этого сравнить количество legacy-вкладок и v2 coverage: незамапленных вкладок должно быть `0`.
