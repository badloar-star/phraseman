# External admin research for Phraseman Admin v2

Дата: 2026-06-26  
Назначение: источник для расширения `docs/design/ADMIN_UI_BIBLE.md` и roadmap админки 2.0.

## Ограничение

Внутренние админки Duolingo, Stripe, Shopify и других больших продуктов закрыты. Поэтому ресерч опирается на публичные панели, документацию и help center: teacher dashboards, developer consoles, feature-flag tools, campaign tools, payment/admin consoles, CMS workflows and release-health dashboards.

## Что смотрели

### Duolingo for Schools

Источники:

- https://schools.duolingo.com/
- https://duolingoschools.zendesk.com/hc/en-us/articles/6894350549773-What-is-the-Duolingo-for-Schools-activity-log
- https://schools-cdn.duolingo.com/documents/214566024b2e7c04285dd733ab8eab2d.pdf

Полезно для нас:

- прогресс по пользователю/ученику;
- activity log рядом с основным dashboard;
- классы/группы;
- быстрый обзор текущей активности;
- управление доступом к учебному контенту.

Добавить в Phraseman:

- User Activity Timeline;
- сегменты пользователей по учебному прогрессу;
- блок "Что происходит сейчас" на Overview;
- профиль пользователя с событиями: уроки, покупки, ошибки, кампании, жалобы.

### Google Play Console и App Store Connect

Источники:

- https://support.google.com/googleplay/android-developer/answer/6346149
- https://play.google.com/console/about/teamandusermanagement/
- https://developer.apple.com/help/app-store-connect/update-your-app/release-a-version-update-in-phases/
- https://developer.apple.com/help/app-store-connect/reference/account-management/role-permissions/

Полезно для нас:

- staged/phased rollout;
- granular permissions;
- роли;
- release status;
- возможность расширять rollout постепенно;
- per-platform thinking.

Добавить в Phraseman:

- страницу "Релизы и версии";
- progressive rollout;
- status: draft/testing/staged/live/paused/rolled back;
- iOS/Android раздельно;
- проверку store URL;
- release health before force update.

### Firebase Remote Config и A/B Testing

Источники:

- https://firebase.google.com/docs/remote-config
- https://firebase.google.com/docs/ab-testing

Полезно для нас:

- remote params как управляемая система, а не сырой список;
- A/B testing;
- personalization;
- value optimization.

Добавить в Phraseman:

- Flag Registry;
- owner, risk, lifecycle, review date;
- experiment metadata;
- metric and stop rule.

### LaunchDarkly

Источники:

- https://launchdarkly.com/docs/home/releases/approvals
- https://launchdarkly.com/docs/home/releases/change-history
- https://launchdarkly.com/docs/home/releases/scheduled-changes

Полезно для нас:

- approvals;
- scheduled changes;
- progressive delivery;
- change history;
- rollback;
- flag lifecycle.

Добавить в Phraseman:

- approvals для опасных действий;
- scheduled changes для flags/campaigns;
- rollback к прошлому значению;
- lifecycle для каждого флага;
- фильтры "опасные", "устаревшие", "без owner".

### Braze и OneSignal

Источники:

- https://www.braze.com/docs/user_guide/messaging/canvas/create_a_canvas/
- https://www.braze.com/docs/user_guide/messaging/messaging_fundamentals/target_users/
- https://documentation.onesignal.com/docs/en/push
- https://documentation.onesignal.com/docs/en/in-app-messages-setup

Полезно для нас:

- campaign/canvas wizard;
- target audience;
- schedule;
- send settings;
- summary before launch;
- personalization;
- in-app messages;
- push campaigns.

Добавить в Phraseman:

- Campaign Wizard;
- Audience Builder;
- frequency cap;
- quiet hours;
- preview;
- dry run/test send;
- control group;
- campaign analytics.

### Stripe и Shopify

Источники:

- https://docs.stripe.com/get-started/account/teams/roles
- https://docs.stripe.com/activity-logs
- https://help.shopify.com/en/manual/shopify-admin/activity-logs
- https://help.shopify.com/en/manual/your-account/users/roles/permissions/store-permissions

Полезно для нас:

- controlled roles;
- sensitive permissions;
- activity/security logs;
- detailed access areas;
- staff/team management.

Добавить в Phraseman:

- Team & permissions;
- sensitive permission labels;
- activity log for role changes;
- permission key per action;
- read-only/support/marketing/finance/moderator/developer roles.

### Contentful

Источники:

- https://www.contentful.com/help/content-and-entries/tasks/

Полезно для нас:

- task before publish;
- assign to person/team;
- publish blocked until required tasks are done;
- workflow inside content editor.

Добавить в Phraseman:

- content tasks;
- content statuses;
- reviewer;
- localization/audio/image checklists;
- rollback version.

### Crashlytics / Sentry release health pattern

Источники:

- https://firebase.google.com/docs/crashlytics/crash-free-metrics
- https://docs.sentry.io/product/releases/health/

Полезно для нас:

- crash-free users;
- crash-free sessions;
- adoption by version;
- release health before rollout expansion.

Добавить в Phraseman:

- Release Health dashboard;
- block/warn before force update on unhealthy release;
- stuck users on force update;
- update modal impressions/clicks/completion estimate.

## Главный вывод

Phraseman Admin v2 не должен быть просто красивее старой админки. Он должен стать системой управления продуктом:

- кто может менять;
- что именно меняется;
- на кого влияет;
- когда применится;
- как проверить;
- как откатить;
- как понять результат.

Минимальный v2 может начинаться с navigation + update modal, но архитектура должна сразу предусматривать permissions, approvals, rollout, campaign analytics, release health and rollback.
