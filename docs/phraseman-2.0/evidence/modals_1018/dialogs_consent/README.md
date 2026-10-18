# Диалоги после 23d9d694d с подменой consent=on (СВЕРКА, 18.10 03:26–03:28; es, светлая, Free по dev_state, ⚡3 → 2, 29/30)
Путь: dev_state?…&plus=off&free=on&energy=3&consent=on&next=/ai_dialog_home → хаб → «Social» → «Saludar después de conocerse» → «Contestar» → «Empezar el diálogo» → чат → одна реплика на en («Hi Mila! I am fine, thank you.»). consent=on — переменная только в памяти dev (dev_ai_consent.ts, `let override`), согласие человека НЕ записывалось. Сеть НЕ выключалась (адб svc wifi/data не трогала — без отдельного слова).
## [DIALOGUE-V2-OPTIMISTIC] (optimistic_full.txt)
- hub_tap: tap → briefing_first_frame 364 мс (прошлый прогон, тот же).
- start_tap: tap (freeTier=true, energyUnlimited=false) → consent_read 39 мс (consent=undecided в прошлом прогоне; теперь подмена снимает шторку согласия, чат открылся без неё) → button_feedback_frame 42 мс.
- send_tap: tap (learnerTurn 0, retryOfPending=false, sessionReady=true) → turn_id_ready 3 мс → **bubble_frame 128 мс** (queuedUntilSession=false) → **reply_frame 13 268 мс** (ответ Mila).
## Кадры
typed.png (набранная реплика), sent_t06.png (≈0,6 с после «отправить»: пузырь «Tú» уже в чате, справа «…» печатает Mila, ⚡2 уже списана — до ответа сервера), sent_t10.png (10 с: «…» ещё), sent_t40.png (ответ Mila «That's great to hear! Where did we meet?», кнопки «Traducir», «Por qué», счётчик 29/30, цель «3 de 6»).
## Журнал сервера
[DIALOGUE-V2] quota:turn remaining 29; [DIALOG-END] turn learnerTurn=1 replies=1 coaching=present activeObjective objective_03; energy:settle outcome=acknowledge reason=first_turn_ok; ENERGY-REFUND acknowledge ok; DIALOG-QUOTA-OPT settle had=true serverRemaining=29 remaining=29 pending=0.
## Итог
Оптимистичная часть: пузырь пользователя на кадре за 128 мс, ⚡ списана мгновенно; но ответ ИИ ждали 13,3 с (индикатор «…» без текста «Mila печатает»). Откат без сети НЕ проверен.
