# PM-069 / PM-070 — разведка: кошелёк рун и монет (2026-09-24)

Исполнитель: Opus 5.5 (субагент, профиль S2). Код НЕ менялся — только разведка.
Итог: **физическая миграция нужна, но упирается в решения владельца** (см. «Вопросы»).

## 1. Архитектура: сколько на самом деле кошельков

### Кошелёк A — «монеты» 2.0 (он же глобальный кошелёк рун)

- Единственный писатель: `app/level_spin_star_grants.ts` (журнал операций в AsyncStorage,
  проекция `progress.stars` / `progress.starsEarnedTotal` в снапшоте, на сервере —
  `users/{uid}.stars` + phone-state star credits).
- Показ: `app/runes_system.ts` (`peekRunes`, `subscribeRunesBalance`) — шапка Главной,
  Арена (`mergeLevelSpinServerStars`), магазин.
- Все деньги 2.0 уже идут сюда: подарки → монеты (`gifts_to_coins_migration_v1.ts`,
  `enqueueLevelSpinStarGrant`, номиналы `stars_*`), жемчуг → монеты
  (`pearls_to_coins_migration_v1.ts`), Шпиль (`stars_ledger.ts`, PM-280), повышение ранга
  (`coin_rank_upgrade_v1.ts` → `prepareRuneSpend`). Таблица D53: `runes` → монеты 1:1.
- **Отдельного поля/кошелька `coins` нет нигде** (grep `coin_balance|coins_wallet|coins_v1`
  по app/components/modules/functions — пусто). «Руны» здесь — просто старое имя монет.
  Для этого кошелька миграции данных не требуется, достаточно переименования в текстах
  (зона сессии интерфейса).

### Кошелёк B — кошелёк курса Learning V2 (отдельный, независимый баланс)

- Хранилище: owner repository `learning_v2_owner_repository:v1:<scopeHash>:root`
  (`WalletStateV1`, валюта `access_star`, **10 000 подъединиц = 1 руна**, дроби возможны),
  account-local префикс в `cloud_sync.ts`. Серверное зеркало обмена —
  `users/{uid}.v2_access_stars` + `v2_star_journal` (`functions/src/coin_exchange*.ts`).
- Писатели (только начисления, операции списания в контракте НЕТ —
  `WalletOperationKind = earning_credit | external_credit | legacy_opening_import`):
  - руны за сессию курса — `commitLearningV2SessionRuneRewardCompositeV1`
    (`app/learning_v2_owner_repository_runtime.ts`, вызывается из
    `app/learning_v2_direct_session_player_v1.tsx`);
  - +1 руна за исправленную ошибку — `mistake_correction_wallet_composite.ts`
    через `app/mistake_practice_rewards.ts`;
  - биржа «жемчуг → звёзды» — `exchangeCoinsForStars` (`walletRewardRequest`);
  - `server_wallet_credit_settlement.ts` (plan_completion, dictionary/irregular_verbs,
    tournament_reward, repeat_session);
  - `legacy_opening_import` — есть в контракте, живого писателя grep не нашёл (unknown,
    были ли такие операции у людей).
- Показ: ТОЛЬКО чип «Подтверждённый баланс» в шапке карты урока
  (`app/learning-v2/lesson/[id].tsx:989–1140`). В `runes_system.ts` не входит — на Главной
  и в тратах его не видно. Коммит 2f2e8de8f («единый кошелёк рун», 23.08) объединил
  только ПОКАЗ, сами балансы не сливал.
- Потратить эти руны нельзя нигде: списаний у кошелька B нет, `prepareRuneSpend` смотрит
  только в кошелёк A.

**Вывод по PM-069-A1 («один canonical balance»): сейчас НЕ выполнен.** Руны, заработанные
в курсе Learning V2, на исправлении ошибок и на бирже, лежат в кошельке B, в монеты 2.0
не попадают и в ранг не конвертируются. Переименование текстов этого не решит.

## 2. Что нужно сделать (предложение, НЕ реализовано)

1. **Перевести писателей B на кошелёк A** (иначе A2 нарушено: новые начисления продолжат
   падать в B). Затрагивает Learning V2 player, mistake_practice_rewards, биржу (серверная
   часть — `coin_exchange.ts`, деплой), settlement. Биржа и так уходит вместе с жемчугом
   (PM-057/059) — возможно, её достаточно выключить.
2. **Разовый перенос остатка B → A** по образцу `pearls_to_coins_migration_v1.ts`:
   журнал `runes_to_coins_v1:<owner>`, префикс логов `[RUNES-TO-COINS]`, старт ~22–25 с,
   выключатель через `getRemoteBool`, строка-итог на сервер.
   - Ключи идемпотентности — **по id операции кошелька B** (`r2c1_<walletOpId>`), а не по
     сумме: иначе два устройства с разными снимками B дадут двойную выплату.
   - Списать B нельзя (нет операции debit) — вместо этого «водяной знак» перенесённых
     операций в журнале + скрытие чипа B. Если нужно именно списание, в контракт
     `modules/learning-v2/contracts/wallet.ts` придётся добавить новый вид операции.
   - Кошелёк A принимает гранты номиналами `stars_10…stars_2000` (кратно 10). Суммы B —
     произвольные целые и дроби (3 руны за сессию, 1 за ошибку, дробный курс биржи).
     Точно зачислить можно только через путь произвольной суммы (как
     `PracticeRuneOperation` / settlement) — нужен отдельный тип операции в
     `level_spin_star_grants.ts`, это ядро экономики (сторож
     `tests/economy_constitution_contract.test.ts`).

## 3. Вопросы владельцу (без них миграцию не начинаю — D32 + гейт
`MIGRATION_AND_ROLLBACK_APPROVED_BEFORE_DESTRUCTIVE_CHANGE`)

- О-069-1. Переносить ли остаток кошелька курса в монеты вообще, 1:1?
- О-069-2. Округление дробей и сумм не кратных 10: вверх в пользу человека (как
  `roundCoinsUp` у жемчуга), вниз, или точная сумма новым типом операции?
- О-069-3. Остаётся ли курс Learning V2 (старый `modules/learning-v2`) в 2.0? Если уходит
  в архив — писателей не перенаправляем, а выключаем, и перенос делается один раз.
- О-069-4. Биржа «жемчуг → звёзды»: выключить вместе с жемчугом (тогда серверный писатель
  исчезает) — подтвердить.
- О-069-5. `legacy_opening_import`: если такие операции у кого-то есть, это КОПИЯ старого
  глобального баланса — перенос их в A даст двойной счёт. Исключать их из переноса?
- О-069-6. Серверная строка-итог и любые правки `coin_exchange.ts` требуют деплоя функций.

## 4. PM-070 «единый coin identity token»

Карточка PM-070 — не про переименование константы валюты, а про **один resolver
ранг→ассет** для кошелька, аватара, визитки и шаринга (A1) и отсутствие отдельной
библиотеки аватаров (A2).

- Resolver уже есть: `coinRankRowForDisplay` / `COIN_RANK_TABLE` в
  `app/coin_rank_table_v1.ts`; им пользуются `components/AvatarView.tsx` (проп `coinRank`),
  церемония `components/level_up/*`, `hooks/use_coin_rank_upgrade.ts`.
- Не подключены: иконка валюты (шапка берёт `HOME_RUNE_ICON_SOURCE`), визитка, шаринг;
  `AvatarView` без `coinRank` по-прежнему рисует старые аватары (`constants/avatars.ts`,
  `components/avatar-dna/*`) — A2 не выполнен.
- Всё оставшееся — визуальная подмена на экранах (зона сессии интерфейса, связано с
  PM-077). Безопасного «переименования константы» здесь нет — не делал.
