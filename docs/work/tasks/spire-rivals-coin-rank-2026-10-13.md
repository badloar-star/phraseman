# Task packet: Шпиль — ранг монеты у каждого соперника (аватар = монета вместо буквы)

Governance-ID: TG-185EABEA8B3B
Status: In progress
Owner: Ядро (сессия 1) — данные; Дизайн — отрисовка
Related: решение владельца через координатора 13.10 («аватары игроков = монеты рангов»)

## Outcome

- Проверка: в строках комнаты (`SpireRoomRow`, `SpireRival`) ранга монеты НЕ было — ни у живых (документ комнаты хранит
  uid/name/steps/…), ни у ботов (roster: имя/аватар/Plus/серия).
- Живые: ранг монеты принадлежит телефону игрока (пишется одним multiSet с тратой; в public_profiles его тоже пишет клиент).
  Клиент передаёт свой `coinRank` (0…19) при входе в комнату (`spireJoinRoom`, блок `member`, который сервер уже принимает)
  и в каждом отчёте ступеней (`spireReportSteps`). Сервер кладёт `members.<uid>.coinRank` в документ комнаты — в ТОЙ ЖЕ
  транзакции/записи, что и ступени (0 новых чтений; отдельная запись только при смене ранга без новых ступеней — редко).
- Боты: ранг — детерминированная формула от комнаты и uid бота (`spireBotCoinRank(uid, groupId)`, 0…9, чаще низкие) — 0 чтений;
  Дизайн берёт `roster.coinRank ?? spireBotCoinRank(uid, groupId)`.
- Клиент: `SpireRoomRow.coinRank`, `SpireRival.coinRank` (number | null). null — ранга нет (до выкладки функций у живых) →
  Дизайн рисует запасной вид.
- Выкладка `spireJoinRoom` + `spireReportSteps` — вместе с функциями дня выхода (R1_RUNBOOK шаг 13в), без слова координатора не выкладываем.

## Scope

In scope (Ядро): modules/spire/bot_coin_rank.ts (новый), app/spire/spire_room_client.ts, app/spire_report_client.ts,
functions/src/spire_groups.ts, functions/src/spire_progress.ts, тесты. Out of scope: декод/строки/SpireRival (room_rows.ts,
residents.ts, spire_tower_model.ts — правит Дизайн параллельно, договорено) и отрисовка.

## Architecture

No architecture change.

## Security and privacy

Ранг монеты — уже публичное поле (public_profiles.coinRank, виден друзьям/в профиле). Сервер принимает только целое 0…19,
иное отбрасывает. Подделка своего ранга даёт только другую картинку (то же доверие, что у public_profiles). Политика
конфиденциальности: новых данных нет — тот же публичный ранг в комнате недели.

## Technical debt

- Ранг живого обновляется в комнате на следующей ступени после повышения (не мгновенно).

## Verification

Тесты room_rows (декод, боты детерминированы и в 0…19), сервер (buildMember, spireMemberStepsUpdate с рангом), babel.

## Rollback

Откат коммита; поле в документах комнаты безвредно (клиент без кода его игнорирует).
