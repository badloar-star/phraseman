# Хендовер: сессия «5 · ВХОД И АККАУНТ» → Codex (26.10.2026)

Для агента без контекста. Ветка `feature/referral-roulette`, основное дерево `C:\appsprojects\phraseman` (без worktree и без stash).
Коммит только через `scripts/safe_commit.sh` (сверка `--expect путь=+N/-M`; в общих файлах — свои хунки через `--patch`).
Тяжёлое (jest, проверка типов) — через светофор: `bash .claude/semaphore/slot.sh run --wait=3600 "<что>" -- npm run test:one -- <файлы>`.
Отчёт сессии со всеми хэшами по порядку: `docs/work/reports/5-vhod-2026-10-24.md`.

## Сделано (последние сутки, все в HEAD)

| Что | Коммит |
|---|---|
| «Вместе» (дуэли, занятие вдвоём, «Позвать», уровни дружбы) включён в 2.0.3 (146); удалённый ключ теперь прячет все входы | e64d29561 |
| Банки экзамена глав v2: урок 24 / вопросы главы 2 / урок 25 / урок 26 + реестр `registry_l24_l26.ts` на 21 банк | 0f0988f28, 0e1400cba, edb09e9dc, ab318babf |
| Строки в `docs/work/exam-banks/PROGRESS.md` | 17cecd625 |
| Окно «Выйти»: statusBarTranslucent + отступы безопасной зоны | 382bb0a02 |
| Классическое окно удаления: то же | 04ca0c298 |
| Тексты о данных без неправды ×9 (онбординг privacyBody, настройки приватности, пробный период) | b28c5c85b, 248e9ed5e |
| Сторожа политики/приватности перезакреплены | eacd31068 |
| Ночные красные зоны Входа перезакреплены | a56c947e3 |
| Сервер удаления: Google/Apple — 14 дней льготы без удаления Auth-пользователя | 713677ddd |
| «Восстановить аккаунт?» со сводкой (серия / фразы / урок) | 51884d675 |
| Сводка ночи для владельца | 95fdc355c |

Проверено на бою (только чтение, 26.10):
- функции «Вместе» (9 шт.) выложены 25.10 08:22Z, `friendsNudge` — 26.10 06:50Z; серверный код с тех пор не менялся;
  `remote_config/app.bools.friends_together_enabled = true`;
- группа удаления (`accountDeleteWorker`, `accountDeleteEnqueue`, `accountDeleteStatusMine` и др.) выложена 26.10 05:59Z — позже
  последней серверной правки 51884d675 (25.10 20:51Z). **Невыложенных функций у зоны нет.**

## НЕ доделано

1. **Сверка экранов «Вместе» с макетом** (гейт «приложение = макет», CLAUDE.md). В шапке выключателя
   `app/friends_together/together_config.ts:68-76` сказано «включать после Сверки эмулятора с `docs/design/v2-app/friends-full.html`».
   Включено по прямому слову владельца (26.10). Склеек «макет | эмулятор» в `docs/phraseman-2.0/evidence/parity/` по экранам
   «Вместе» нет — нужно решение координатора до сборки 146. Откат: `FRIENDS_TOGETHER_UI_ENABLED = false` (сборка) или
   `friends_together_enabled = false` в Пульте (живьём).
2. **Проверка типов на HEAD красная из-за чужого файла**: `components/spire/SpireHomeScreen.tsx:273,274,306,364` — `podiumColumns`,
   `podiumSkeleton`, `roomCeilingPassed` не объявлены (незакоммиченная правка зоны Пика, +1/−1). Не моя зона; без неё сборка не пройдёт.
3. **Новый вид удаления аккаунта (вариант Б)** за флагом `account_delete_variant_b_ui_enabled` (ВЫКЛ, Пульт). Сервер выложен.
   До включения: Сверка окон удаления и «Восстановить аккаунт?» на эмуляторе (`components/DeleteAccountConfirmModal.tsx`,
   `components/account/DeleteAccountVariantBBody.tsx`, `components/account/AccountRestoreSummaryDialog.tsx`); вычитка Переводчиком
   «3 из 32» и строки `handoffFailed` (`components/account/delete_account_variant_b_copy.ts`).
4. **Сторож слов банков экзамена**: `modules/learning-v2/exam/chapter_exam_v2_vocabulary.ts` → `findChapterExamV2UnknownWords` —
   запасные ответы проверяются после `normalizeChapterExamV2Answer`, где однобуквенное «a» не отфильтровано, а в словаре его нет
   никогда. Итог: запасной ответ со словом «a» всегда красный, у части заданий оставлен только эталон (пометка в
   `docs/work/exam-banks/l24.md … l26.md`). Чинит Learning V2: фильтр `w.length > 1 || w === 'i'` и для запасных; проверка —
   `npx jest tests/owner_locks_exam_episode_words_2026_10_25.test.ts tests/learning_v2_chapter_exam_v2_banks_rules.test.ts --runInBand`.
5. **Решения владельца по текстам** (не сделано намеренно): заголовок онбординга «Твои данные — только твои»; заголовок
   «Напомним до конца пробного» без условия (условие «если разрешишь уведомления» — в теле, `components/onboarding/clean_onboarding_copy_core.ts`);
   пункт 4 неправды о данных — `repeatPrivacy` в плеере урока (зона Learning V2).

## Риски

- 🔴 «Вместе» включён без склеек Сверки (п. 1). Если владелец увидит расхождение с макетом — откат одним флагом.
- 🔴 Сборка из чистого HEAD падает на проверке типов из-за `SpireHomeScreen.tsx` (п. 2).
- 🟡 «Вместе»: обработчики событий сервера внутри вкладки (`app/(tabs)/friends.tsx`, прямые `FRIENDS_TOGETHER_UI_ENABLED` в обработчиках
  дуэли/«Позвать»/недели) остались на флаге сборки — при выключенном ключе сервер таких событий не создаёт; видимые входы спрятаны.
- 🟡 Сторожа-снимки (`tests/legal_document_liquid_glass_source_contract.test.mjs` — sha256 политики,
  `tests/privacy_settings_liquid_glass_source_contract.test.mjs` — отпечатки карт переводов) ломаются при любой правке текста политики /
  экрана приватности — перезакреплять по смыслу, текст не менять.

## Как проверить зону быстро

```bash
bash .claude/semaphore/slot.sh run --wait=3600 "vhod zone" -- npm run test:one -- tests/delete_modal_status_bar_translucent.test.ts tests/account_delete_variant_b_windows.test.tsx tests/account_restore_summary_window.test.ts tests/privacy_claims_truth_texts.test.ts tests/onboarding_privacy_body_truth.test.ts tests/friends_together_dev_bots.test.ts tests/friend_week_mine.test.ts
```
```bash
node --test tests/logout_modal_status_bar_translucent.test.mjs tests/modal_status_bar_translucent_ratchet.test.mjs tests/legal_document_liquid_glass_source_contract.test.mjs tests/privacy_settings_liquid_glass_source_contract.test.mjs
```
