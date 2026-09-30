# Task packet: PhraseMan 2.0 — довести ретайр XP/лиг/Season/MAX и реестр до проверяемого состояния

Governance-ID: TG-78D0099DF28B
Governance-ID: TG-8153C496647F
Governance-ID: TG-DD9A410F98B2
Governance-ID: TG-2115333F3F30
Governance-ID: TG-A799C28458D9
Governance-ID: TG-5ADD377BE8E1
Governance-ID: TG-3BB948145EA4
Governance-ID: TG-617781A24FAD
Governance-ID: TG-253FF9DD239D
Governance-ID: TG-E4562E842D50
Governance-ID: TG-97072ED0ECE9
Governance-ID: TG-C3D67F2B8D24
Governance-ID: TG-2FCD992BD044
Governance-ID: TG-DAB1A958BE88
Governance-ID: TG-5795A9E96BAB
Governance-ID: TG-DE9CF14D0563
Governance-ID: TG-7EAA7B63001C
Governance-ID: TG-93760C0E468F
Governance-ID: TG-1312A43269B2
Governance-ID: TG-3EDF5FB003A3
Governance-ID: TG-038617AE3639
Governance-ID: TG-58675794F5DD
Governance-ID: TG-6D4F1CDD3F17
Governance-ID: TG-774199A41B20
Governance-ID: TG-836C792A8C19
Governance-ID: TG-DE760364A701
Governance-ID: TG-7CA438095A9C
Governance-ID: TG-2E6E5B2A56A1
Governance-ID: TG-6B5366F75B3C
Governance-ID: TG-4C87B1BAB232
Governance-ID: TG-D5F1780D928D
Governance-ID: TG-D2498693A265
Governance-ID: TG-AFCDA2A7FB6D
Governance-ID: TG-08BFB15EE8C8
Governance-ID: TG-084D8B546E97
Governance-ID: TG-FACD8D90037B
Governance-ID: TG-D7AC01A3316E
Governance-ID: TG-AABB40289B72
Governance-ID: TG-1FC0ED218D0E
Governance-ID: TG-5F7E88718FCB
Governance-ID: TG-EA6C79C62B68
Governance-ID: TG-229777EF7C91
Governance-ID: TG-6F35127FD15D
Governance-ID: TG-3AC682B22EDE
Governance-ID: TG-27B1BDE96B61
Governance-ID: TG-A961DE5BB4C7
Governance-ID: TG-BCCA69A48E84
Status: In progress
Owner: Claude session (по HANDOVER_2026-09-29.md)
Related epic/enabler: E01–E25 (docs/phraseman-2.0/registries/tasks.json)

## Outcome

Владелец ушёл спать и просит довести цель PhraseMan 2.0 до конца. Результат: каждый блок работы подтверждён фактической командой и записан в `docs/phraseman-2.0/PROGRESS.md`; реестр пересчитан; всё, что нельзя закрыть без владельца/устройства/релиза, честно помечено blocked/needs_decision. «Готово» заявляется только после requirement-by-requirement аудита. Мера успеха: рост подтверждённых criteria без ложных PASS.

## Scope

In scope: source-level ретайр остатков XP/лиг/Season Pass; устаревшие тесты лиг (`functions/src/admin_final_sensitive_writes.test.ts`, `community_packs.test.ts`, `friend_activity_likes.test.ts`); задачи реестра со статусами ready_audit/review, доказуемые source-probe/jest точечно; обновление `PROGRESS.md`, `tasks.json`, карточек `tasks/PM-xxx.md`.

Out of scope: deploy, production-миграции, удаление облачных данных, платные API (OpenAI/TTS), device/E2E/release acceptance, решения владельца (PM-184, PM-188, PM-001), `git reset`/`checkout --`, восстановление MAX, App Check, правки заморожённых `admin/legacy.html|index|full.html`.

## Architecture

No architecture change: работа ограничена удалением/ужесточением остатков и документированием. Сервер остаётся в границах subscriptions/content/notifications/sync/purchases. Инвариант: legacy-парсинг старых квитанций и legacy-очистка данных аккаунта сохраняются; новая Главная, монеты, лимиты Free/Plus не меняются.

## Security and privacy

Не трогаем auth/claims/secrets. Секреты не читаются и не печатаются. Персональные данные не добавляются; Privacy Policy не затрагивается (данные не собираются новые). Правки серверных функций — только fail-closed (ужесточение), без расширения прав.

## Technical debt

- Contain: устаревшие league-тесты — либо чинить под фактическую схему, либо удалять вместе с мёртвым модулем, с записью в PROGRESS.
- Accept temporarily: задачи, требующие устройства/релиза/решения владельца, остаются blocked/needs_decision; владелец — пользователь, выход — его решение или прогон на устройстве.

## Verification

Точечно: `npm run test:one -- tests/<файл>` (не полный сюит), `npx tsx tests/*.probe.ts`, точечный ESLint/typecheck затронутых файлов, `git diff --check`, пересчёт registry (node-скрипт), JSON parse. Каждый результат — в PROGRESS.md с командой. Тяжёлое — только со слотом светофора (`.claude/semaphore/slot.sh`).

## Rollback

Работа в общем рабочем дереве без коммитов-разрушений; правки локальные и отслеживаются `git diff`. Откат конкретного файла — по diff вручную (не массовый checkout). Данные пользователей и прод не затрагиваются.
