# Аудит: монета везде = ранг пользователя — 05.11.2026

Проверял Диспетчер (13), только чтение кода, HEAD на 05.11 ~19:30. Правило владельца: «монета абсолютно во всех местах обязана соответствовать рангу строго».
Таблица монет: `app/coin_rank_table_v1.ts` (ранги 0…19, `coin_rank_00` = бронза/медь). Свой ранг: хук `useMyCoinRank` / `useMyCoinRankBinding` (`hooks/use_my_coin_rank`), кэш `peekCoinRank` (`app/coin_rank_state_v1.ts:95`).

## Главная причина
`components/home/homeRuneAsset.ts:9`: `HOME_RUNE_ICON_SOURCE = coin_rank_00.webp` — **значок валюты захардкожен как монета ранга 0 (бронза)**. Его рисуют все счётчики и награды, в том числе шапка Пика («930»). У серебряного пользователя там бронза.
**Починка одной точкой (рекомендация):** хук `useMyCurrencyCoinSource(sizeDp)` → `coinRankDisplaySource(useMyCoinRank() ?? 0, sizeDp)`; `RuneGlyph` и все места с `HOME_RUNE_ICON_SOURCE` берут его. Пока ранг не прочитан — сейчас бронза, лучше пустой круг тона скелета (как `SpireRankCoin`), чтобы не мигало бронзой.
Для анимаций, которые грузят модуль без React (`CoinRewardFlight`, `LegacyBonusFlyLayer`), источник передать пропом от родителя.

## 1. Значок валюты (свой пользователь) — ❌ все бронза, источник захардкожен
| Место | Файл:строка |
|---|---|
| Пик, шапка «930» | `components/spire/peak/PeakMyCounter.tsx:21` (`RuneGlyph`) |
| Пик/Шпиль, подиум (подписи монет) | `components/spire/SpirePodium.tsx:84` (`RuneGlyph`) |
| Награда Шпиля (золото) | `components/spire/SpireGoldReward.tsx:15` |
| Баланс на Главной | `components/home/HomeRuneBalance.tsx:4` |
| Полёт монет за награду | `components/rewards/CoinRewardFlight.tsx:35` |
| Бонус старым игрокам (полёт) | `components/legacy_bonus/LegacyBonusFlyLayer.tsx:13` |
| Итог урока / цепочка завершения | `components/completion/V2DoneScreen.tsx:17`, `components/completion/V2DoneChain.tsx:24` |
| Итоги (последовательность наград) | `components/feedback/ResultsSequence.tsx:48` |
| Итог «Горизонтов» | `components/learning-v2/horizons/HorizonResultGlass.tsx:30` |
| Плеер уроков 2.0 | `app/learning_v2_direct_session_player_v1.tsx:63` |
| Итог Карточек | `app/flashcards/CardsSessionResultV2.tsx:18` |
| Праздник первой покупки | `components/FirstPurchaseSealCelebration.tsx:58` |
| Окна-рассылки | `components/GlobalBroadcastModal.tsx:151,158` |
| Магазин | `app/shop.tsx:166` |
| Счётчик монет в сессии (уроки, слова, глаголы, 4 режима Карточек) | `components/PracticeRuneCounter.tsx:19` — свой отдельный `require(coin_rank_00)`, тоже бронза; места вызова: `app/lesson1.tsx:1170`, `app/lesson_words.tsx:3280`, `app/lesson_irregular_verbs.tsx:810`, `app/flashcards_*` |

## 2. Монета-аватар своего пользователя — ✅ берёт ранг
| Место | Файл:строка | Источник |
|---|---|---|
| Главная (кольцо) | `app/(tabs)/home.tsx:1525` | `useMyCoinRank` ✅ (нет ранга → монеты нет) |
| Уроки (плашка) | `app/(tabs)/lessons.tsx:2722` | `useMyCoinRankBinding`, тот же владелец, что и баланс ✅ |
| Настройки/профиль | `app/(tabs)/settings.tsx:1064` | `useMyCoinRank` ✅; ⚠️ пока ранг не прочитан — `coinRankRowForDisplay(0)` = бронза на мгновение |
| Данные аккаунта, дуэль, «Моя неделя» | `app/account_details.tsx:107`, `app/friends_duel.tsx:126`, `app/friends_week_mine.tsx:72` | `useMyCoinRank` ✅ |
| Шпиль: маркер на башне, итог недели, панель результата | `components/spire/SpireTowerMarker.tsx:38,44`, `SpireWeekResultCard.tsx:127`, `SpireResultPanel.tsx:44` | `myCoinRank` из `SpireHomeScreen.tsx:103` ✅ |
| Комментарии Наборов (свой) | `app/community_packs/PackCommentsSheet.tsx:772` | `mine ? myCoinRank` ✅ |
| Диалоги: «нужен ранг» | `components/dialogs/DialogueV2BriefingScreen.tsx:146` | текущий ранг ✅; `DialogueV2CatalogueSection.tsx:283` — монета ТРЕБУЕМОГО ранга, это намеренно ✅ |

## 3. Своя монета — ❌ ошибки
| Место | Файл:строка | Что не так |
|---|---|---|
| Итог экзамена главы (старый) | `components/learning-v2/LearningV2ChapterExamResult.tsx:92` | `coinRank ?? 0`; вызов `app/learning-v2/chapter-exam.tsx:256` **не передаёт coinRank** → всегда бронза |
| Итог экзамена главы v2 | `components/learning-v2/exam_v2/ChapterExamV2Result.tsx:80` | `coinRank ?? 0`; вызов `exam_v2/ChapterExamV2Run.tsx:232` **не передаёт coinRank** → всегда бронза |
| Пик, строка «Ты» и список | `components/spire/peak/PeakTopRow.tsx:18` ← `row.coinRank` из документа комнаты | Ранг пишется в комнату только при входе (`app/spire/spire_room_client.ts:156`, `peekCoinRank`). ⚠️ Если кэш ещё пуст — поле не уходит, строка показывает бронзу (`SpireRankCoin` ранг 0). После повышения ранга строка остаётся старой до следующего входа. **Для строки «Ты» брать `useMyCoinRank`, а не документ комнаты.** |

## 4. Монеты ДРУГИХ игроков
| Место | Файл:строка | Источник | Вердикт |
|---|---|---|---|
| Пик: топ, лауреаты, башня | `PeakTopRow.tsx:18`, `PeakTowerPlayers.tsx:22` | `coinRank` из комнаты | ⚠️ верно, только если игрок вошёл с прочитанным рангом; нет поля → бронза ранга 0 (`SpireRankCoin.tsx:18`). После повышения устаревает. Починка — сервер при входе/записи ступеней берёт ранг из профиля, а не от клиента (0 новых чтений, если ранг уже в профиле). |
| Шпиль: друзья на башне | `components/spire/SpireFriendsRow.tsx:32` | профиль друга | ✅ (нет ранга → точка, не бронза) |
| Друзья | `app/(tabs)/friends.tsx:255,421,452,501` | `profile.coinRank` | ✅ |
| Наборы: авторы | `components/packs/CommunityScene.tsx:78` (`?? 0`), `CommunityPackScene.tsx:37` | `author.coinRank` | ⚠️ нет ранга → бронза вместо нейтрального круга |
| Комментарии Наборов (чужие) | `PackCommentsSheet.tsx:772` | `profiles[authorId].coinRank` | ✅ |
| Вместе с другом, уведомления | `components/friends_together/FriendTogetherSheet.tsx:141,143`, `NotificationCenterButton.tsx:597` | `AvatarView` без `coinRank` | ❌ рисуется старый аватар, не монета ранга (свой и чужой) |

## 5. Демо-данные (тур Пика / Шпиля) — не ошибка
`components/spire/peak/PeakTourFull.tsx:44,98,112`, `SpireTour.tsx:94`: фиксированные ранги в обучающем туре. Пилюля «ты» в туре — `Coin rank={0}` (`PeakTourFull.tsx:98`) → бронза. Если владелец хочет «строго везде», то и в туре брать свой ранг.

## Раздача починки по зонам (предложение)
1. Значок валюты одной точкой (раздел 1) — Ядро: `homeRuneAsset`/`RuneGlyph` + хук.
2. Пик «Ты» из `useMyCoinRank` + сервер берёт ранг из профиля (раздел 3, 4) — Ядро (Пик).
3. Экзамены глав — передать `useMyCoinRank()` (2 вызова).
4. `FriendTogetherSheet`, `NotificationCenterButton` — передать `coinRank`; Наборы `?? 0` → нейтральный круг.
5. Настройки: до чтения ранга — скелет, не бронза.
