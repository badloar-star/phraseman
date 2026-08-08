# Handoff для Codex: Multi-Device Lesson Sync — проверка и доделка

> **Дата:** 2026-07-21
> **Автор сессии:** Kimi (по задаче владельца)
> **Статус:** фикс реализован и покрыт тестами; требуется проверка + решения по открытым пунктам
> **Связанные документы:** `docs/handoffs/multi_device_sync_bug_complete.md` (старый хэндофф; его диагноз ОПРОВЕРГНУТ — читать аддендум в его шапке)

---

## 1. Суть задачи одним абзацем

У пользователей с двумя устройствами (один Google-аккаунт) Plus/подписка синхронизировалась, а прогресс уроков — нет. Старый хэндофф утверждал, что виноват ключ `auth_links` (Firebase uid якобы разный на каждом устройстве). Это опровергнуто: Firebase uid стабилен для одного аккаунта на всех устройствах (иначе Plus через RevenueCat, чей App User ID = `stable_id`, на втором устройстве бы не работал). Реальный механизм: restore в `app/cloud_sync.ts` применяет полный merge прогресса только когда `cloudXP > localXP` (XP-гейт `shouldRestoreCloudProgress`), а в sticky-ветке (`localXP ≥ cloudXP`, обычный случай на активном втором устройстве) подмешивались только премиум/косметика/счётчики — уроковые ключи не доезжали никогда. Исправлено union/max-merge уроковых ключей в sticky-ветке. `auth_links`, auth, сервер, rules не тронуты — и трогать НЕ нужно.

## 2. Что уже сделано (не переделывать)

**`app/cloud_sync.ts`** (+49 строк, 0 удалений, diff точечный):

1. Новая функция `isMonotonicLessonRestoreKey(key)` — стоит непосредственно перед `mergeLessonRestoreValue`. Классифицирует семьи с монотонным merge: `unlocked_lessons`, `lesson{N}_best_score|pass_count|progress`, `level_exam_*`, `achievement_lesson_{N}_perfect_passes_v1`, scoped-варианты (`lesson_progress_v2::fr::...`, числовые scoped id). Осознанно НЕ входит: `lesson{N}_cellIndex`, `listening_progress`, `words`, streak/weekly-скаляры, legacy free-lesson cap/migration.
2. В sticky-ветке restore (`if (!shouldRestoreCloudProgress)`, после owned-ключей блока, перед `cloudActiveAura`) добавлен блок: `getRuntimeSyncKeys().filter(isMonotonicLessonRestoreKey)` → `multiGet` локальных значений → `mergeLessonRestoreValue(...)` → пары с изменениями в `stickyPairs`. Под guard'ом `assertCurrent()`.
3. `isMonotonicLessonRestoreKey` добавлен в `__cloudSyncTestHooks`.

**`tests/cloud_sync_lesson_union_restore.test.ts`** (новый, 28 проверок):
классификация семей (en + fr-scoped), поведение merge в обе стороны (union/max/OR/качество, «локальное лучшее не проигрывает»), отрицательные кейсы (cellIndex, streak, premium), source-контракт наличия блока в sticky-ветке.

**`docs/handoffs/multi_device_sync_bug_complete.md`** — добавлен аддендум в шапку: диагноз опровергнут, шаги 1–4 старого плана НЕ применять (они ломают `account_delete_pending_auth`-guard, тест-контракт привязки и требуют миграции auth_links).

## 3. Проверено в этой сессии

- `npx jest tests/cloud_sync_lesson_union_restore.test.ts tests/auth_provider_stable_link.test.ts` → **49/49 PASS**.
- `git diff HEAD -- app/cloud_sync.ts` не содержит `achievement_quiz_total_count`/`MONOTONIC_COUNTER_RESTORE` (0 совпадений) — см. открытый пункт 5.2.
- Дерево целое; машина блокирует `git stash` (hook), неудачный `stash pop` задел старый чужой stash `stash@{0}` от 2026-07-17 — он НЕ применился (конфликты «already exists»), запись сохранена. **Не трогать stash-записи.**

## 4. Что нужно сделать Codex — чеклист

### 4.1 Верификация (обязательно)
- [ ] Прочитать diff: `git diff HEAD -- app/cloud_sync.ts` — должно быть +49/−0, три блока: классификатор, sticky-блок, hooks-запись.
- [ ] Прогнать: `npx jest tests/cloud_sync_lesson_union_restore.test.ts tests/cloud_sync_monotonic_counter_merge.test.ts tests/auth_provider_stable_link.test.ts` — ожидание: мой новый suite и auth-контракт зелёные; 2 падения в monotonic_counter — пре-существующие (пункт 5.2), не регрессия.
- [ ] Глазами проверить sticky-блок: он внутри `if (!shouldRestoreCloudProgress)`, ДО `if (stickyPairs.length > 0)`; merge идёт через `mergeLessonRestoreValue`, а не прямой записью облака.
- [ ] Убедиться, что `isMonotonicLessonRestoreKey` и монотонные ветки `mergeLessonRestoreValue` покрывают одни и те же семьи (комментарий «Держать СИНХРОННЫМ»).

### 4.2 Живой тест (главный оставшийся шаг, по возможности)
- [ ] Два устройства/эмулятора, один Google-аккаунт, оба залогинены:
  1. На устройстве B наиграть локальный XP ≥ облачного (активно поиграть без перезапуска A).
  2. На A пройти новый урок → дождаться sync (lesson complete шлёт `forceNow`).
  3. На B холодный перезапуск → урок с A должен появиться (раньше не появлялся).
- [ ] Обратный сценарий: уроки на B не должны откатиться после restore (union/max).

### 4.3 Решения владельца, которые Codex может подготовить (не применять без подтверждения)
- `lesson{N}_listening_progress` и `lesson{N}_words` синкаются, но монотонной ветки не имеют (cloud-wins, только полный restore). Если это смысловой прогресс — добавить в классификатор той же схемой + тест.
- `user_total_xp` оставлен как есть: max-merge XP влияет на лигу/недельную конкуренцию — отдельное продуктовое решение.

## 5. Открытые находки (репортить владельцу, не чинить молча)

### 5.1 Ленивая сходимость
Устройства сходятся на следующем restore (холодный старт). Если нужно живее — restore по возврату из фона с TTL 30–60с (паттерн quiet revalidation из Perf Bible). Отдельная задача.

### 5.2 Пре-существующий дрейф теста (НЕ от этой задачи)
`tests/cloud_sync_monotonic_counter_merge.test.ts` падает на main (2 теста): ожидает `achievement_quiz_total_count` в `MONOTONIC_COUNTER_RESTORE_KEYS`; в allowlist его нет (есть `achievement_trainer_correct_count` и др. — вероятно переименование). По правилу «тесты — read-only guards» не чинилось. Владельцу решить: добавить ключ в allowlist (если счётчик жив) или обновить тест (если переименован).

### 5.3 Соседняя сессия (auth recovery, этапы 1–3)
Параллельно идёт работа над `auth_provider.ts` + новым callable + recovery-модалкой (владелец запускает). Конфликтов по файлам нет (там auth/functions, тут cloud_sync restore). Стыковка позитивная: её «тихий фоновый restore» после deferred link идёт через тот же `restoreFromCloud` — union-merge делает его безопасным посреди сессии. Не менять её файлы; не менять `app/auth_provider.ts` вообще.

## 6. Инварианты (не нарушать)

- `auth_links` ключуется по Firebase uid — это контракт (`tests/auth_provider_stable_link.test.ts`), НЕ переключать на Google sub.
- `readAccountDeletePendingAuth(firebaseProviderUid)` проверяется сразу после `signInWithCredential` — не трогать.
- Тесты — read-only guards: не переписывать источник под тест и наоборот без решения владельца.
- Perf Bible / оптимистичный UI: restore-ветки не должны добавлять спиннеров или блокировок.
- Любые новые прогресс-ключи (Learning V2): одна строка в `isMonotonicLessonRestoreKey` + ветка стратегии в `mergeLessonRestoreValue` + проверка в `tests/cloud_sync_lesson_union_restore.test.ts`. НЕ-монотонные ключи (позиции, даты, стрики) в sticky-merge не добавлять.

## 7. Команды быстрого старта

```bash
git diff HEAD --stat -- app/cloud_sync.ts tests/
npx jest tests/cloud_sync_lesson_union_restore.test.ts
npx jest tests/auth_provider_stable_link.test.ts tests/cloud_sync_monotonic_counter_merge.test.ts
```

*Конец хэндоффа.*
