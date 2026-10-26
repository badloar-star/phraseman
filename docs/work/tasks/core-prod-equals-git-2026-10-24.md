# Ядро 24.10 ночь — «бой = git»: истории, правила, админка

Governance-ID: TG-62D86406B06C
Governance-ID: TG-CB85DE6C5AAF
Governance-ID: TG-D68E305B699B
Governance-ID: TG-50B65F7BE40B
Governance-ID: TG-739DE3399DC0

Координатор 24.10: журнал в catch функции role() — в ТОМ ЖЕ коммите, что и сервер историй; поведение не меняется (тот же permission-denied).

Правила: премиум-часть закоммичена Темами (369dfab6a); остаток — 6 строк историй (match story_announcements / story_announcement_feed + исключения из общего админ-правила). Тесты правил 5/5 (175).

Дополнение (Ревизор 24.10, 🟢 «как есть»): вторым маленьким коммитом — журнал `[STORY-ADMIN] role_denied { write, reason }` в catch функции role() (без uid), по закону «немых catch нет».

Решение координатора 24.10: объявления в историях и правки админки живые на бою (выложены из дерева 23–24.10), фиксируем их в git как есть, чтобы 2.0.2 и следующие выкладки их не стёрли.

## Outcome
1. Коммит сервера историй без правок логики: functions/src/story_announcements.ts, story_announcements_domain.ts, контракт modules/story_events/story_announcements_contract.ts (байт в байт = 5169f85d6) и хунк экспорта в functions/src/index.ts (истории + adminListOpsLog — тоже живая на бою и без экспорта в HEAD).
2. firestore.rules целиком одним коммитом: бой + истории + премиум-темы + блоки HEAD.
3. admin/v2/legacy.html: концы строк нормализованы, непустые строки = бой, плюс 16 ответов поддержки; снимок до правки — docs/work/admin_legacy_snapshot_2026-10-24.html.txt.

## Scope
Только перечисленные пути. daily-digest.js, site.html и прочие чужие файлы не трогаются. Логика функций не меняется.

## Architecture
Коммиты через scripts/safe_commit.sh: --patch для хунка index.ts, пути целиком для остального. Выкладка — только адресно, через deploy_from_clean_head.sh.

## Security and privacy
Админские команды историй проверяют роль через admin/roles + admin/permissions (ревью — Ревизор). Правила историй закрывают коллекции для клиента. Новых данных не собирается.

## Technical debt
- Немой catch в role() story_announcements.ts — оставлен как на бою, на ревью.
- Сторож обводок и клиентская часть историй (5169f85d6) — у Дизайна/Моментов.

## Verification
Проверка типов functions на снимке HEAD после коммита, тесты правил, сверка непустых строк админки с боем, после выкладки — скачать бой и сверить с HEAD.

## Rollback
Revert коммита; функции на бою не трогаются до утреннего пакета.
