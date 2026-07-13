# Admin v2 Native Completion — release readiness (2026-07-13)

## Итоговое покрытие

- Capability registry: **59 из 59** операций переведены в защищённый Admin v2.
- Legacy fallback: **0**.
- Новый серверный пакет: Money (6 callable), Content (6 callable), Community (7 callable).
- Старые входы `admin/index.html`, `testers.html`, `site.html`, `full.html`, `beta_testers.html` перенаправляют на точные разделы Admin v2.
- Для исторического просмотра оставлен отдельный статический `admin/legacy-archive.html` без скриптов и сетевого доступа.

## Ограничения задачи, которые сохранены

- Safety & Moderation и Native Diagnostics не перерабатывались; их контракты включены в регрессионную проверку.
- Генерация языков не менялась.
- French operations ограничены черновиком и откатом в состоянии `HOLD`: `activationApproved=false`, `productionReady=false`, `rolloutPercent=0`.
- Provider refunds остаются только для чтения: Admin не имитирует возврат App Store или RevenueCat.

## Защита записей

Все новые записи проходят единый серверный процесс:

1. чтение канонического документа и его версии;
2. предпросмотр неизменяемого пакета;
3. запрос одобрения;
4. одобрение вторым администратором (самоодобрение запрещено);
5. повторная проверка версии и прав;
6. идемпотентное применение вместе с записью `admin_log` в одной транзакции.

Массовая очистка Arena ограничена только точным manifest из `arena_profiles`, пакетами по 25 записей, с возобновлением. Она не удаляет `users` и Firebase Auth.

## Проверки до релиза

- Admin v2 + legacy regression: **42/42 suites, 178/178 tests passed**.
- Functions focused regression: **6/6 suites, 38/38 tests passed**.
- Firestore transaction regression для Money, Content и Community: **3/3 suites, 26/26 tests passed**; Help Board отдельно — **14/14**, включая видимые, скрытые и удалённые темы/ответы.
- Telegram VIP regression: отдельный TDD-тест подтверждает активный `vip_admin_override=true` и время выдачи.
- TypeScript Functions build: passed.
- JavaScript syntax: 13 затронутых Admin-модулей passed.
- Migration board check: current, 471 legacy buttons, 1060 inventoried functions, 59 capabilities.
- Legacy button audit: 0 missing functions, 0 writes without confirmation, 0 writes without audit.
- Visible-text audit: 0 blocked findings.
- Runtime-state audit: 0 blocked findings.
- Language audit: exit 0; 10 известных англоязычных терминов остаются в прежних модулях `admin-core.js`, новые заголовки и описания пакета переведены.
- Browser widths checked locally: 375, 768, 1024, 1440 px.
- Legacy redirect and scriptless archive checked in Chromium.

## Релиз

- Финальный frontier review: **Advisor `DECISION: APPROVED`** для HEAD `78984f72c`.
- Ветка `codex/admin-language-factory` опубликована в `origin`.
- В `phraseman-ea0b3` точечно опубликованы **22 Functions**: 19 новых Admin Money/Content/Community callable и 3 обновлённых канонических moderation entrypoint (`communityModerateSubmission`, `communityAdminModeratePack`, `helpBoardAdminModerate`).
- Unauthenticated read-only probes трёх workspace callable получили HTTP 400 без App Check/Auth; 404 и 5xx нет, боевые записи не выполнялись.
- Firebase Hosting target **`admin`** опубликован: <https://phraseman-ea0b3.web.app>.
- Production smoke: **PASS**, 59 capabilities, 59 native, 0 fallback, 0 failures, 0 warnings.
- Временные Functions env-файлы и сгенерированный `functions/lib` после deploy удалены из worktree.

## Находки и предложения

- После релиза провести ручной read-only smoke под реальной ролью администратора для Money, Content и Community; автоматический smoke не должен создавать боевые записи.
- Отдельной задачей можно перевести оставшиеся 10 исторических английских терминов интерфейса, не смешивая локализацию с нативным cutover.
- Общий pre-push TypeScript gate по-прежнему находит существовавший до Admin-пакета дефект `useReduceMotion` в `app/constellation_sky_map.tsx`; файл не менялся в этой ветке и требует отдельного исправления вне Admin-релиза.
