# Admin v2 final readiness report

Дата: 2026-06-27

Статус: Admin v2 готов как основной рабочий вход вместо старого перегруженного меню.

Дополнительно добавлен operational audit: Diagnostics показывает подключенность v2 actions/routes, Firestore sources, права, index/rules ошибки и server-side-only границы. Подробности: `docs/design/ADMIN_V2_OPERATIONAL_AUDIT_2026-06-27.md`.

## Что считается готовым

- 7 основных разделов вместо длинного списка legacy-вкладок.
- Все legacy-вкладки учтены в migration coverage.
- Активный fallback: `0`.
- Старый `admin/index.html` сохранен только как архивный аварийный доступ для сверки.
- Опасные write-действия не копируются как прямые кнопки.
- Опасные write-действия оформлены как guarded workflow: preview, permission, approval, confirm, audit, rollback.
- Все новые v2-кнопки имеют tooltip и доступный текст.
- Fake online, visual campus, extra presence stream и heartbeat не используются.
- Button/function audit можно пересобрать командой:

```powershell
node scripts/admin-legacy-button-audit.mjs
```

## Coverage

- Legacy tabs: `42`.
- Active fallback: `0`.
- Workflow-gated legacy areas: `9`.
- Legacy buttons audited: `314`.
- Legacy functions audited: `626`.
- Writing functions classified: `119`.
- Linked write actions classified: `110`.
- V2 actions connected: `40/40`.
- V2 routes valid: `9/9`.
- Operational audit rows: `8`.

## Что намеренно не сделано прямой кнопкой

Эти действия не должны становиться прямыми кнопками без backend/audit contract:

- remote config publish;
- push / in-app message publish;
- ban / grant / reset / bulk user actions;
- paywall experiment publish;
- daily phrases publish / seed / reorder;
- explain cache reset;
- UGC approve/reject;
- league chat punishment;
- arena cleanup / force finish / wager switches.

Это не недоделка интерфейса. Это защита продакшена.

## Final gate

Перед отчетом "готово" должны проходить:

```powershell
node scripts/admin-legacy-button-audit.mjs
node --check admin/v2/scripts/admin-core.js
node --check admin/v2/scripts/admin-router.js
node --check admin/v2/scripts/admin-firebase.js
node --check admin/v2/scripts/admin-migration.js
node --check admin/v2/scripts/admin-completion.js
node --check admin/v2/scripts/admin-button-audit.js
node --check admin/v2/scripts/admin-function-transfer.js
node --check admin/v2/scripts/admin-launch-readiness.js
node --check scripts/admin-legacy-button-audit.mjs
```

Browser smoke должен пройти на desktop и mobile по всем 9 маршрутам:

- overview;
- application;
- campaigns;
- team;
- users;
- money;
- content;
- community;
- diagnostics.

## Итог

Admin v2 можно использовать как новую основную админку. Старый файл остается только как архивный аварийный вход, пока backend write-contracts для guarded workflows не будут подтверждены отдельно.
