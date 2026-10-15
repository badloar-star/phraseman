# Аудит кнопок по коду: Диалоги, Ошибки, Прогресс/Экономика, Друзья — 15.10 (R42, агент координатора)

Только чтение. Все маршруты существуют, router.ctx.js ничего отсюда не вырезает.

## 🔴
| Экран | Проблема | file:line | Фикс | Кто |
|---|---|---|---|---|
| Мои ошибки → тренировка | При 0 энергии экран открывается и молча закрывается, суточная Free-попытка сгорает до проверки энергии; текст noEnergy не используется | mistake_practice_session.tsx:641-645; hooks/useMistakePracticeStartGate.ts:44-53; mistakes_hub.tsx:182; mistakes_list.tsx:140; mistake_detail.tsx:134 | Энергию проверять ДО tryStartSession; при нехватке — NoEnergyModal, попытку не тратить | Сайт (R48) |
| Тренировка ошибок, голос | recognitionLocale только fr/en — es/de/it распознаются как английский | mistake_practice_session.tsx:1615 | Локаль по studyTarget (таблица dialogue_voice_capability.ts + it-IT) | Сайт (R49) |
| Итог диалога V2 | Монеты и ошибки диалога начисляются только после ответа сервера; выход раньше — пропадают | dialogue_v2_completion.tsx:269-282; useDialogueV2CoinReward.ts:61; useDialogueV2MistakeCapture.ts:55 | Начислять от локальных outcome/learnerTurns (или в openSummary) | Моменты (R50) |
| Диалоги для it | V2_TARGETS = en/es/fr/de — для it «язык ещё проверяется», диалоги не запускаются | DialogueV2CatalogueContainer.tsx:45; use_dialogue_hub_quota.ts:10; dialogue_v2_briefing/session/completion | Проверить наличие контента it; правило владельца — все 5 доступны | Переводчик → координатор (R51) |

## 🟡 (все до сборки)
Диалоги (Моменты, R52): briefing двойной тап «Начать» (защёлка снимается до ухода, :310-322) и нет индикатора занятости (:363-390); freeform один сбой → весь экран «недоступно» вместо ошибки с «Повторить» (:276-279, 399-437); memory «Очистить» молчит при receipt=null (:248-255).
Ошибки (Сайт, R53): mistakes_list при сбое чтения показывает «пусто» и стирает снимок (:97-101); хаб не показывает замок при gate.locked (:317); mistake_detail «Слушать» без .catch (:70).
Экономика/тексты (Переводчик, R54): runes_wallet/coin_rank подписи для pt-BR/vi/id/tr/pl на английском, тосты es на английском, числа ru-RU для всех; referrals «крути награду» (запрещённое слово) :875-883.
Друзья (Вход и аккаунт, R55): поделиться кодом при null молчит, Share без try/catch (friends.tsx:1141-1157, 2405, 2422); ошибка исчезает за 2,5 с (:1569); удаление друга — три сообщения (:2576-2621); блокировка без отката deleteFriend (:1946-1953); FriendListRow без pressed (FriendListRow.tsx:93-107); «Добавить в друзья» два противоречащих тоста (usePlayerProfileSocial.ts:236-262).
Прочее (Ядро, R56): promo_code_entry успех до записи VIP (:285-307); streak_stats «Заморозить» двойной пейвол (:2194-2199); achievements «Поделиться» двойной тап + пустой вызов (:681-687); checkAchievements мёртв для friend/mistake/lesson событий (achievements.ts:1462) — решить; language_welcome молчит при сбое (:209-216); орфанные ai_dialog_briefing/ai_dialog_session/ai_companion_session без энергии/квоты достижимы внешней ссылкой — редирект; мёртвый DialogsTabContentBody (~780 строк) и «Архив» streak_stats — после релиза.
Наблюдения: свободный разговор Plus не засчитывает серию/задание (решить); V2 засчитывает серию только при ≥1 звезде; user_stats trackLesson* только в lesson1.

Цепочки: ошибка урока → хаб ✅; монеты → coin_rank ✅; друг → список оптимистично ✅; все микрофоны зоны на общем useVoiceAttemptGate ✅; под таббаром ничего нет ✅.
