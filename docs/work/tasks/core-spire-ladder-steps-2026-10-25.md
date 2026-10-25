# Ядро · ступени в строках лесенки итога недели Пика (25.10)

Governance-ID: TG-B1B270DAEC10
Status: In progress
Owner: 1 · ЯДРО (по задаче координатора 25.10)
Related epic/enabler: D191 (лестница итога недели), решение владельца «места в комнате недели по ступеням»

## Outcome
Каждая строка `ladder` в итоге недели (`users/{uid}/spire_week_results/{weekId}_{lang}`) несёт `steps`. Это ступени
участника за неделю, по ним считается место. Клиент «Моменты» (8 · МОМЕНТЫ, необязательное поле в
`app/spire/spire_week_result_client.ts`) показывает ступени, только если сервер их прислал.

## Scope
In scope:
- `functions/src/spire_finalize_core.ts`: тип `SpireWeekLadderRow.steps` и `ladderFor` — `steps: s.steps`;
- `functions/src/spire_finalize_core.test.ts`: набор ключей строки и значения ступеней.

Out of scope:
- клиент: декодер правит 8 · МОМЕНТЫ;
- выкладка: едет с ближайшей выкладкой по «да» владельца;
- три функции со своими проверками маркера удаления вместо общего шлюза (accountsV2MigrateMine, PullMine,
  revenueCatShardsWebhook): замечание Ревизора на будущее, не эта задача.

## Architecture
Изменения архитектуры нет: поле добавочное.
- `ladderFor` строит строки из `roomSorted`, то есть из `spireLiveStandings(input.members)`. В них уже есть
  `steps = nonNegativeInt(members[uid].steps)`: те же данные, по которым `compareSpireStanding` считает место в
  режиме ступеней.
- Документ комнаты крон уже прочитал (`membersOf(data)`), новых чтений Firestore нет.
- Старые клиенты 2.0.1 (794e623c0) и 2.0.2 (a78dbec4d): `decodeLadder` выбирает поля поимённо
  (place/name/coinRank/coins/isMe/removed), строгой проверки ключей нет, лишнее поле игнорируется.
- Правило `spire_week_results` — только чтение владельцем, пишет только крон (admin SDK).
- Стирание при удалении аккаунта (`account_delete.ts`, [D189-LADDER-SCRUB]) копирует строку `{...r}`: ступени
  удалённого остаются, как место и монеты.

## Security and privacy
Новых персональных данных нет. Ступени — игровой счёт, человек и так видел его на экране комнаты рядом с местом.
uid в строку не попадает. Политика конфиденциальности не меняется: игровой прогресс в комнате уже описан (§5).

## Technical debt
Нет нового долга.

## Verification
- `functions/src/spire_finalize_core.test.ts` (точечно, под светофором): ключи строки
  `[coinRank, coins, isMe, memberKey, name, place, steps]`, `steps` = ступени участника в обоих режимах ранжирования.
- Узкая проверка типов functions (ошибок вне тестов нет).

## Rollback
Откат коммита. Сервер не выложен; клиент без поля показывает строку как прежде.
