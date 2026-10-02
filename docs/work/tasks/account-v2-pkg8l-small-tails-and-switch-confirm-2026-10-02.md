# Task packet: Account V2 — Пакет 8L: хвосты 8C-2 + подтверждение «Сменить без сохранения» при невыгруженных карточках

Governance-ID: TG-BB5E6D4C6FE8
Status: In progress
Owner: Claude session (Account V2, /loop); решение координатора §85

## Outcome

1. **Кэш авторских наборов** (`app/community_packs/communityFirestore.ts`, последнее удачное чтение по `автор|цель`, 8C-2): удалять запись при отзыве/удалении/снятии своего набора (найти эти пути: grep unpublish/delete/withdraw community pack) и очищать целиком при смене поколения аккаунта/выходе (подписка на существующий механизм сброса кэшей при смене аккаунта — найти, как сбрасываются другие кэши, напр. `resetAccessiblePackIdsCache`, BoundedScopeCache). Тест.
2. **Немые catch:** `.catch(() => [])` в `app/flashcards_packs.tsx` (~346) и `app/flashcards_swipe.tsx` (~802), `.catch(() => {})` у публикации счётчика в `app/flashcards_my_packs.tsx` — с логом причины без uid (префикс `[MY-PACKS]`).
3. **Хвост дневной статистики экономики:** `reportEconomyOperationApplied` фоном после отпуска замка пишет `economy_daily_stats_tail_v1:<прежний владелец>` — проверять поколение аккаунта перед записью (или писать внутри замка); тест «смена аккаунта сразу после покупки → ключ прежнего владельца не пишется».
4. **Мёртвый сторож:** `tests/my_packs_data_integrity_behavior.test.ts` написан на `node:test` — перевести на раннер проекта (jest `test`/`expect`), чтобы `npm run test:one` его реально исполнял; все 11 случаев сохранить по смыслу; мутация одного защищаемого места → красный.
5. **Подтверждение смены аккаунта без сохранения при невыгруженных карточках** (решение координатора): если перед «Сменить без сохранения» есть запертые ключи карточек (замок 8J `readFlashcardPagesWriteLocks`) или force sync вернул `false` из-за `pages_locked`/`pages_timeout` — показать подтверждение на СУЩЕСТВУЮЩЕМ стеклянном Modal проекта: заголовок/текст «Несохранённые карточки будут удалены с этого телефона», кнопки «Сохранить и сменить» (повтор force sync; при неуспехе — прежнее сообщение об отмене) и «Сменить без сохранения» (прежний путь `allowWipeWithoutSync`). Без новых визуальных стилей — переиспользовать компонент модалки, найденный в `app/settings.tsx`/соседях; тексты — через существующую систему локализации (все поддерживаемые языки UI, как у соседних строк). Логика выбора — чистая функция + тест; двойной тап защищён.

## Scope

Перечисленные места + место вызова «Сменить без сохранения» (найти в app/settings.tsx и auth_provider — читать, править минимально), локализация строк, тесты. ВНИМАНИЕ: `app/auth_provider.ts` и `app/(tabs)/home.tsx` и др. имеют ЧУЖИЕ незакоммиченные правки — в них не править; если нужно — логика в новом модуле, вызов только из settings-экрана. Out of scope: прод, деплой, сервер (8M отдельно).

## Architecture

Переиспользование существующих примитивов (сброс кэшей по смене аккаунта, поколение аккаунта, стеклянный Modal, i18n). Решение о подтверждении — чистая функция `decideAccountSwitchWithoutSaveConfirm`.

## Security and privacy

Новых данных нет. Логи без uid. Подтверждение снижает риск потери пользовательских данных.

## Technical debt

Нет новых.

## Verification

RED→GREEN на каждый пункт; мутации; затронутые тесты по одному (my_packs_pkg8c2_behavior, client_shard_operation_ledger, layout_stability_contract, perf_freeze_contract, flashcards_force_sync_pages, переведённый my_packs_data_integrity_behavior); тайпчек изменённых; независимое ревью. Дизайн: правило owner-rules (impeccable) — только переиспользование существующего модала, без обводок/новых стилей.

## Rollback

git revert; бэкап `.tmp_pkg8l_backup/`.

## Итог исполнителя (2026-10-02)

Статус: пункты 1–5 сделаны; git-записей, деплоя и прода нет. Бэкапы оригиналов — `.tmp_pkg8l_backup/`.

**1. Кэш авторских наборов (`communityFirestore.ts`).** Подписка на `subscribeAccountGeneration` чистит последнее известное целиком при любой смене поколения (вход/выход/сброс); чтение, начатое до смены, кэш заново не наполняет (сверка поколения). Новый `forgetAuthorPackLastKnown(packId)` вызывается в `withdrawLocalAuthorPack` (cloudPackId и локальный id) и в удалении облачного набора в «Моих наборах» сразу после `callCommunityAuthorRemovePack`. Логи `[MY-PACKS] author_packs last_known_*`.

**2. Немые catch.** `flashcards_packs.tsx` и `flashcards_swipe.tsx` — `[MY-PACKS] author_packs caller_failed screen=… kind=…` (поведение прежнее: `[]`); `flashcards_my_packs.tsx` — `[MY-PACKS] count_publish failed kind=…`. Без uid.

**3. Хвост дневной статистики.** `reportEconomyOperationApplied(operation, accountToken?)`: перед записью `economy_daily_stats_tail_v1:<владелец>` проверяется `isCurrentAccountGeneration(token, owner)`; устарело → хвост не пишется (лог `economy_daily_stats:tail_skipped`), обезличенный счётчик дня уходит как раньше. Леджер передаёт свой `accountToken`.

**4. Мёртвый сторож.** `tests/my_packs_data_integrity_behavior.test.ts` переведён с `node:test`/`assert` на раннер проекта (`it`/`expect`), 11 случаев сохранены. Доказательство «был мёртв»: копия старого файла под раннером проекта → «Your test suite must contain at least one test», 0 тестов.

**5. Подтверждение «Сменить без сохранения».** Чистая функция `decideAccountSwitchWithoutSaveConfirm` + обёртка `readAccountSwitchUnsavedCardsDecision` (новый `app/account_switch_unsaved_cards.ts`): замок 8J (`readFlashcardPagesWriteLocks`) или свежий (в этой попытке) отказ выгрузки `pages_locked`/`pages_timeout` → подтверждение. Причину отказа запоминает `runForceFlashcardUpload` (`peekLastForceFlashcardFailure`, только код + время); `cloud_sync.ts` и `auth_provider.ts` НЕ тронуты. В `app/(tabs)/settings.tsx` все три «Сменить без сохранения» сначала спрашивают; окно — существующий стеклянный `showGlassAlert` экрана (новых стилей нет), заголовок «Несохранённые карточки будут удалены с этого телефона», кнопки «Сохранить и сменить» (повтор обычной попытки `runAccountSwitchAttempt` → при неуспехе прежние окна отмены), «Сменить без сохранения» (прежний путь `allowWipeWithoutSync`), «Остаться здесь» (cancel: нужен, чтобы смахивание/«Назад» не запускало ни сохранение, ни стирание — в двухкнопочном `ThemedConfirmModal` смахивание = кнопка отмены). 9 языков, как у соседних строк (`L(...)`). Двойной тап: гард стеклянного алерта + `switchStageRef === 'wiping'` + `unsavedCardsCheckBusyRef`. Ошибка чтения замков → спрашиваем (безопасная сторона). Логи `[ACC-MUT] unsaved_cards …`, `[ACC-MUT] settings:*`.

**Проверка.** RED→GREEN: `account_v2_pkg8l_behavior` (новый, 11), тест леджера 8L (RED: ключ `economy_daily_stats_tail_v1:owner-1` оставался). Мутации (все красные, восстановлены побайтно): очистка по поколению, forget, сверка поколения при наполнении, решение, запоминание причины, `canCommitAccountScopedResult`, лог swipe, проводка withdraw, передача токена в репортёр. Зелёные по одному: account_v2_pkg8l_behavior 11/11, client_shard_operation_ledger 32/32, my_packs_data_integrity_behavior 11/11, my_packs_pkg8c2_behavior 5/5, flashcards_force_sync_pages 16/16, flashcard_pages_restore_lock 13/13, layout_stability_contract 15/15, perf_freeze_contract 12/12, account_switch_shard_spend_ui_contract 1/1, community_pack_card_backs 2/2, gustav_community_pack_target_gate 5/5, `node --test` стеклянных контрактов 26/26. Полный `npm run typecheck` — 0 ошибок. Независимое ревью — за координатором.

**Изменённые файлы (на момент правки чужих изменений в них не было; концы строк сохранены построчно):**
- `app/community_packs/communityFirestore.ts`
- `app/community_packs/publishLocalPack.ts`
- `app/flashcards_my_packs.tsx`
- `app/flashcards_packs.tsx` (до правки отличался от индекса только концами строк)
- `app/flashcards_swipe.tsx`
- `app/economy/economy_daily_stats_reporter.ts`
- `app/economy/client_shard_operation_ledger.ts` (одна строка: `reportEconomyOperationApplied(result.operation, accountToken)`)
- `app/flashcards_cloud_upload.ts`
- `app/(tabs)/settings.tsx`
- `app/account_switch_unsaved_cards.ts` (новый)
- `tests/account_v2_pkg8l_behavior.test.ts` (новый)
- `tests/client_shard_operation_ledger.test.ts` (+1 тест в блоке 8C-2)
- `tests/my_packs_data_integrity_behavior.test.ts` (перевод на раннер проекта)
- `tests/overlays_runtime_liquid_glass_source_contract.test.mjs` (счётчик `delayMs: 360`: 5 → 6, +1 окно 8L)
- этот пакет (итог)

**Риски/заметки.** 🟡 `ThemedChoiceModal` не выделяет destructive-кнопку цветом — «Сменить без сохранения» выглядит как обычная; стоит отдельной задачей научить модалку тону destructive. 🟡 Пустое `message` в стеклянном окне даёт пустой абзац с отступом 16 — косметика. 💸 Firebase: новых чтений/записей нет (замок читается из AsyncStorage). ⚡️ Optimistic UI: окно появляется сразу после локального чтения замка, сеть не ждём.
