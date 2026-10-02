# Task packet: Account V2 — Пакет 8J: ошибка чтения страниц карточек ≠ «страниц нет»

Governance-ID: TG-84E8516B5701
Governance-ID: TG-DADF88AD75C1
Governance-ID: TG-0EE942625EE8
Status: In progress
Owner: Claude session (Account V2, /loop); предложено координатору §AV2-12, взято по правилу «рекомендованный вариант + запись в inbox»

## Outcome

`readFlashcardPages` (app/flashcards_cloud_pages.ts) возвращает `null` и при «страниц нет», и при ошибке/офлайне. После 8H-2 restore у обнулённых аккаунтов зависит только от страниц: если чтение сорвалось, restore завершается, снимок получает `flashcards_v1` = «нет», и первая же новая карточка перезапишет страницы списком из одной карточки (хвост удаляется) — потеря карточек. Плюс у аккаунтов без поля сбой даёт древнее `progress.flashcards`.

1. Сперва логи: `[FLASHCARD-PAGES] read result=ok|empty|error code=… from=server|cache` без uid.
2. Различать результат чтения: `{status:'ok', value}` / `{status:'empty'}` / `{status:'error'}` (новая функция-обёртка или расширение, без ломки существующих вызывающих — проверить ВСЕХ потребителей `readFlashcardPages`). Пустота — только по подтверждённому ответу сервера (не из офлайн-кэша без метаданных `fromCache`), иначе — error.
3. В restore (`applyRestoreFromUserDoc`): при `error` по ключу — не трогать локальное значение, не брать древнее поле, и пометить ключ «страницы не подтверждены» так, чтобы `doSyncToCloud` НЕ перезаписывал страницы этого ключа, пока следующее чтение страниц не пройдёт успешно (например, ключ не попадает в снимок → но тогда синк отправит локальное; нужен явный «замок записи страниц до успешного чтения», хранить локально, снимать при успешном чтении/restore). Выбрать надёжное, обосновать в `// зачем:`.
4. Повторное чтение страниц при следующем restore/входе снимает замок.

## Scope

app/flashcards_cloud_pages.ts (ВНИМАНИЕ: в файле чужие незакоммиченные правки другой сессии — rnfbInstance/getDocs; не трогать их хунки, добавлять минимально, либо новая логика в отдельном модуле), app/cloud_sync.ts (restore + проверка замка перед записью страниц), новый модуль при необходимости, тесты. Out of scope: прод, деплой, forceSyncToCloud (8K).

## Architecture

Трёхзначный результат чтения + локальный замок записи страниц до подтверждённого чтения.

## Security and privacy

Новых данных нет. Логи без uid/текста.

## Technical debt

Accept temporarily: замок живёт локально; при переустановке без связи карточки не восстановятся до появления связи (это правильно — лучше ждать, чем затереть).

## Verification

RED→GREEN: «ошибка чтения → restore не трогает локальное и не берёт древнее поле», «после ошибки синк не пишет страницы этого ключа», «успешное чтение снимает замок и синк снова пишет», «пустой ответ сервера = empty (обычное поведение)», «ответ из кэша без сервера не считается empty». Мутации, затронутые тесты по одному (включая flashcards_cloud_pages_guard, accounts_v2_legacy_sync_switch, flashcards_doc_field_clear), независимое ревью.

## Rollback

git revert; бэкап `.tmp_pkg8j_backup/`.

## Итог исполнителя (2026-10-02)

**Статус: ГОТОВО к ревью/коммиту (доделка ниже, раздел «Доделка»).** Ниже сначала промежуточная запись.
Прежний статус: ЧАСТИЧНО, работа остановлена гейтом. Посреди работы хук
`scripts/hooks/task_governance_hook.mjs` перевооружился на НОВЫЙ Governance-ID
`TG-DADF88AD75C1` (новый промпт в родительской сессии) и блокирует любые Write/Edit вне
`docs/work/tasks/`. Обходить его (правкой через Bash/python или чужим ID в этом пакете)
исполнитель не стал. Нужен пакет под этот ID (или снятие гейта координатором) — потом
доделать шаг «Осталось» ниже.

### Что сделано
- `app/flashcard_pages_read_result.ts` (новый): `readFlashcardPagesResult` → `ok | empty | error`;
  чистая `classifyFlashcardPagesSnapshot`; логи `[FLASHCARD-PAGES] read result=… code=… from=…`
  без uid и текста карточек. Источник правды — `snapshot.metadata.fromCache` RN Firebase
  (`getDocs` с source `default` при офлайне молча отдаёт кэш): empty и ok — только при
  `fromCache === false`; кэш или нет метаданных → error; «страницы есть, ни одной годной» → error.
  Замок записи: `flashcard_pages_write_lock_v1` в AsyncStorage (не в SYNC_KEYS), без uid
  (ошибка всегда в безопасную сторону), запасная копия в памяти при сбое записи, сбой чтения
  замка = заперты все ключи.
- `app/cloud_sync.ts` (CRLF сохранён, чужие хунки rnfbInstance/noteSwallowed у строк ~261 и
  ~1735–1760 не тронуты):
  - импорт: `readFlashcardPages` убран, добавлены функции нового модуля;
  - `doSyncToCloud`: перед циклом карточек `readFlashcardPagesWriteLocks`; запертый ключ — в
    `offloadedFlashcardKeys` (не уходит в документ), страницы не пишутся, лог
    `[LEGACY-V2-SYNC] pages_write_skipped key=… reason=pages_unconfirmed`; в снимке значение
    запертого ключа возвращается к прежнему (чтобы после снятия замка страницы дописались);
  - `applyRestoreFromUserDoc` (основной путь): `readFlashcardPagesResult`; error → локальное не
    трогается, источник `error` (древнее `progress.flashcards` не берётся), `lockFlashcardPagesWrite`,
    лог `source=pages_error code=… from=… local=untouched`; ok/empty/поле документа → замок
    снимается ПОСЛЕ `applyPersonalPlanRestorePairs(pairs)`.
- `app/flashcards_cloud_pages.ts` — **не тронут** (readFlashcardPages байт-в-байт, других
  потребителей в app/ нет — grep).
- Тесты: `tests/flashcard_pages_read_result.test.ts` (новый, 16), `tests/flashcard_pages_restore_lock.test.ts`
  (новый, 8), мок в `tests/accounts_v2_legacy_sync_switch.test.ts` переведён на `readFlashcardPagesResult`
  (контракт мока прежний).

### Прогоны (по одному, текст вывода)
- flashcard_pages_read_result: 16/16 PASS
- accounts_v2_legacy_sync_switch: 39/39 PASS
- flashcards_doc_field_clear: 12/12 PASS
- flashcards_cloud_pages_guard: 9/9 PASS
- flashcard_pages_restore_lock: 5/8 — **3 RED по делу**: второй restore в тесте идёт sticky-веткой
  (local streak ≥ cloud), которая страниц не читает → замок не снимается. В приложении это
  обычный путь активного человека: без доделки замок жил бы до restore с cloud > local.

### Осталось (заблокировано гейтом)
1. Вынести блок чтения страниц restore в `restoreFlashcardPagesForKeys(cloudData, legacyV2SkipOnRestore,
   assertCurrent, onlyKey)` + `unlockFlashcardPagesAfterRestore(...)` и вызвать в sticky-ветке ТОЛЬКО для
   запертых ключей (у незапертых — ноль лишних чтений Firestore), снятие замка — после
   `applyPersonalPlanRestorePairs(stickyPairs)`. Скрипт-заготовка: scratchpad `refactor8j.py`.
2. Поправить структурный тест «замок снимается после pairs» под вынесенную функцию.
3. Мутации (сброс каждого ключевого стража → красный → байт-в-байт возврат), tsc по изменённым файлам.

### Доделка (после того как координатор добавил ID в шапку)
- Чтение страниц при restore вынесено в `restoreFlashcardPagesForKeys(cloudData, legacyV2SkipOnRestore,
  assertCurrent, lockedBefore, onlyKey)` + `unlockFlashcardPagesAfterRestore` (cloud_sync.ts, перед
  `applyRestoreFromUserDoc`). Основной путь зовёт для всех ключей; sticky-ветка (local ≥ cloud) — только
  если есть замки и только для запертых ключей (у остальных ноль чтений Firestore, одно чтение AsyncStorage).
  Снятие замка в обеих ветках — после `applyPersonalPlanRestorePairs`.
- **Риск «карточка, добавленная под замком, пропадёт при снятии» — закрыт.** Ключ, запертый до этого
  restore, при удачном чтении НЕ заменяется страницами, а объединяется: облачные карточки + локальные,
  которых в облаке нет (по id); облачная, явно удалённая человеком на телефоне (журнал удалений 7D,
  `en:saved:<id>`), не возвращается. Удаление под замком без журнала даст «воскрешение» — безопаснее потери.
  Локальное не читается → страницы как раньше. То же для источника «поле документа» у запертого ключа
  (sticky-ветка поле в локальное не кладёт, а синк потом обнулил бы поле). Чистая функция
  `mergeLockedFlashcardsWithPages` в `app/flashcard_pages_read_result.ts`. Лог
  `[LEGACY-V2-SYNC] restore key=… source=pages_merged_local cloud=N local_only=M deleted_skipped=K`.
  Незапертые ключи — прежняя замена страницами (поведение restore не менялось).
- Дубль ключа в multiSet исключён: объединённое значение вытесняет поле документа из `pairs`.

### Прогоны (финал, по одному, текст вывода)
| Файл | Итог |
|---|---|
| flashcard_pages_restore_lock | 13/13 (было 5/8) |
| flashcard_pages_read_result | 19/19 |
| accounts_v2_legacy_sync_switch | 39/39 |
| flashcards_doc_field_clear | 12/12 |
| flashcards_cloud_pages_guard | 9/9 |

`npm run typecheck` (полный, с поднятым лимитом): 0 ошибок.

### Мутации (каждая → красный, возврат байт-в-байт по sha256 подтверждён)
M1 замок в синке (1 red) · M2 ветка error в restore (5) · M3 кэш ≠ empty (4) · M4 перечитка в sticky (5) ·
M5 объединение при снятии (2) · M6 снятие замка в основном пути (1) · M7 снимок запертого ключа (1) ·
M8 запасной замок в памяти (1) · M9 пропуск удалённых по журналу (1) · M10 объединение для поля документа (1).

### Изменённые файлы (итог)
- `app/flashcard_pages_read_result.ts` (новый)
- `app/cloud_sync.ts` — хунки относительно HEAD: импорты (~243–270), doSyncToCloud: замок перед циклом
  карточек (~3113) и снимок запертых ключей (~3273), новые функции перед applyRestoreFromUserDoc (~3395),
  sticky-ветка (~3877–3896), основной путь (~3976), снятие замка после pairs (~4022). CRLF сохранён.
- `tests/flashcard_pages_read_result.test.ts`, `tests/flashcard_pages_restore_lock.test.ts` (новые)
- `tests/accounts_v2_legacy_sync_switch.test.ts` (только мок)
- `app/flashcards_cloud_pages.ts` — НЕ тронут.

### ⚠️ Общий индекс git
Другая сессия застейджила (`git add`) мою ПРОМЕЖУТОЧНУЮ версию `app/cloud_sync.ts` (54+/3−,
импорт ещё не закоммиченного модуля). Исполнитель git не трогает — перед коммитом 8J нужно
`git add` финальной версии всех файлов пакета, иначе чужой коммит унесёт полуготовое состояние.

### Бэкап
`.tmp_pkg8j_backup/` — `cloud_sync.ts.orig` (снят ПОСЛЕ появления чужих хунков rnfbInstance —
откатывать только свои хунки!), `accounts_v2_legacy_sync_switch.test.ts.orig`, `packet.md.orig`.
