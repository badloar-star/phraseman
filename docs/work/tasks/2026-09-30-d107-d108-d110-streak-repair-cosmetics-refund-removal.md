# Task packet: D107/D108/D110 — убрать починку серии, косметику и админ-возврат наборов

Governance-ID: TG-DAB1A958BE88
Governance-ID: TG-2FCD992BD044
Status: Done (ждёт правок «Дизайна» по списку)
Owner: Claude session (субагент «удаление 2.0», 2026-09-30)
Related epic/enabler: PhraseMan 2.0 — упрощение (D70/D78, D101–D110)

## Outcome

- D107: серию спасает только бесплатная заморозка Plus. Починка уроком и защита
  серии «Путешествием дня» больше не срабатывают и удалены из ядра.
- D108: купленные ауры и кастомные аватары не рисуются нигде; каталоги, выдача в
  подарках/спинах, серверный архив косметики и косметика ботов удалены.
- D110: админ-функция adminRefundCommunityPackPurchase удалена (сервер, экспорты,
  админка, тесты).
Мера успеха: пробы-ратчеты зелёные, затронутые тесты зелёные, typecheck чистый.

## Scope

In scope: app/hall_of_fame_utils.ts, app/streak_repair.ts, app/daily_journey_protected_day.ts,
app/lesson_complete.tsx (одна логическая строка), app/achievements.ts, components/AvatarView.tsx,
constants/avatar_auras.ts, constants/custom_avatars.ts, app/level_gift_system.ts (косметические
ветки), app/theme_gift_pool.ts, app/customization_snapshot.ts, app/cosmetic_asset_archive.ts,
functions/src/cosmetic_asset_archive.ts, functions/src/bot_cosmetics.ts,
functions/src/community_packs.ts, functions/src/index.ts, functions-admin/index.ts,
admin/v2/legacy.html (точечно), тесты и пробы.

Out of scope: UI-файлы сессии «Дизайн» (Главная, Уроки, Друзья, экраны итогов/серии/профиля) —
для них составляется список мест; app/cloud_sync.ts (активно правится другой сессией);
журнал выбора косметики (связан с cloud_sync/phone-state); docs/phraseman-2.0/PROGRESS.md,
registries/tasks.json.

## Architecture

Удаление без замены (D78). Где UI «Дизайна» ещё импортирует косметику, остаётся
минимальный модуль, отвечающий «нет косметики» (помечен `зачем: D10x`), чтобы сборка
не падала до правки экранов. Ратчет tests/d108_cosmetics_removed.probe.ts держит
удалённое удалённым и список оставшихся мест только сокращающимся.

## Security and privacy

Удаляется админ-функция возврата (меньше поверхности атаки). Персональные данные не
добавляются. Публичный профиль перестаёт публиковать ауру (меньше данных).

## Technical debt

- Contain: заглушки streak_repair.ts, constants/avatar_auras.ts, constants/custom_avatars.ts —
  выход: «Дизайн» убирает импорты, затем файлы удаляются; ратчет d108 это держит.
- Accept temporarily: журнал выбора косметики и ключи косметики в cloud_sync — владелец
  сессии cloud_sync, пересмотр после её завершения.

## Verification

Пробы: d70, d108, server_remote_event_allowlist, firestore_listener_allowlist,
node tests/server_decision_atlas_contract.mjs, admin_pack_gift_revenue, pm060, pm229.
Точечные тесты по одному файлу, typecheck functions и точечный клиента.

## Rollback

Все изменения — в рабочем дереве без коммита; откат — владельцем через git по файлам.
Данные пользователей не удаляются (старые ключи хранилища остаются и игнорируются).
