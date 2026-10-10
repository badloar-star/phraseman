# Экраны релиза без макета — качество «нового стиля» (11 групп × 6 критериев)

Поручение координатора 10.10 23:42 («дизайн везде»). Метод: автометрика по файлам групп (`C:/Temp/claude/colors/audit_groups.py`: зашитые цвета, обводки, нестандартные кегли, виды нажатий и окон, слова-состояния, замки) + чтение кода трёх самых видимых групп.

Критерии: **1** токены темы, без зашитых цветов и обводок-контейнеров · **2** кегли 16/13 · **3** нажатия по киту (kitPress), окна/шторки по общим шеллам · **4** пустое/ошибочное/загрузочное состояние на 9 языках с действием · **5** длинный текст/локаль не ломают раскладку · **6** Optimistic UI (мгновенный отклик, замок от двойного тапа, откат).
Знаки: ✅ проверено, нарушений нет · 🔧 исправлено в этом проходе · 🟡 осознанная оговорка · ➖ неприменимо. Ячейки ◐ первого прохода закрыты построчным чтением (группы 5, 6, 10, 11 — 23:50).

## Что сделано

- **Нажатия.** Новая замена `TouchableOpacity` — `components/KitTouchable.tsx`: те же числа кита, что у TapScale/PressableScale/PressableHybrid (90 мс до .97 + opacity .86, отпускание 240 мс), но `style` остаётся на самом элементе (раскладка не меняется). Заменено 56 мест в 13 файлах: `ReportErrorButton`, `ReportUserModal`, `ExplainReportButton`, `referrals`, `lesson_complete`, `AppMessagesInbox`, `VipSurveyModal`, `VipSurveyReviewPromptModal`, `PremiumCelebrationModal`, `paywallShared`, `PaywallProofCards`, `promo_code_entry`, `referral_code_sheet`.
- **Промокод:** синхронный замок `redeemInFlightRef`; раньше молча выходил без ответа при потере входа/смене аккаунта и при исключении сети — теперь понятное сообщение «не получилось» + лог.
- **«Сообщить об ошибке»:** синхронный замок `sendLockRef`; немой `catch` теперь пишет причину.
- **Кит-примитивы без app-хуков:** `hooks/use_system_reduce_motion.ts`; кривые `kitPress` ленивые (тесты с урезанным react-native не падают).

## Таблица

| Группа | 1 токены | 2 кегли | 3 нажатия/окна | 4 состояния (9 яз.) | 5 длинный текст | 6 Optimistic UI |
|---|---|---|---|---|---|---|
| 1 Пейвол Plus (цена/покупка) | ✅ 0 hex; 1-px чехлы из токенов `chrome` | ✅ | ✅ PressableHybrid ×7; крестик `paywallShared` 🔧 KitTouchable; экран-маршрут | ✅ загрузка · ошибка до checkout · проверка · ожидание · неизвестно (D158), `paywall_copy` | ✅ ScrollView, перенос | ✅ `operationRef`, finally-откат (13a9053dd, проверено) |
| 2 Визитка игрока | 🟡 арт-карточка (`ProfileCardBackdrop` 37 hex, `RankUp` 11) — собственная палитра «looks», вне темы по замыслу; окна на токенах | ✅ | 🟡 шторки био/Pro на RN `Pressable`+свой слой, `ReportUserModal` 🔧 KitTouchable | 🟡 копия `t4` + `_more` на 9 языков (часть строк — запасной английский) | ◐ | ✅ жалоба с замком (7514997ea); заявка/лайк — `usePlayerProfileSocial` ◐ |
| 3 Сообщить об ошибке | ✅ | ✅ | 🔧 6× KitTouchable; окно по центру (RN Modal fade) | ✅ форма · мин. 10 символов · отправка · готово · не отправилось · лимит | ✅ ScrollView, `numberOfLines`, клавиатура | 🔧 `sendLockRef` + лог; оптимистичное «готово» с откатом (было) |
| 4 Промокод | ✅ | ✅ | 🔧 KitTouchable | ✅ 12 исходов, 9 яз. (`feedbackForStatus`) 🔧 +ответ на тихие выходы | ✅ ScrollView | 🔧 `redeemInFlightRef`, `finally`, сообщение при исключении |
| 5 Код друга | ✅ | ✅ | 🔧 лист `referral_code_sheet` и экран `referrals` — KitTouchable; шторка `ReferralSheetShell` (у неё свой движок) 🔧 переведена на kit `.sheet` (440 мс, затемнение 260 мс, старт за краем экрана) | ✅ 9 яз.: «Применяем…», 7 исходов, ошибка сети; 🔧 исключение больше не оставляет экран без ответа | ✅ перенос, шторка со скроллом | 🔧 `submitLockRef` (код и заявка в друзья дважды), `inviteLockRef` для «Поделиться»; рулетка уже с откатом ключа (`spinningRef`) ✅ |
| 6 Встроенные предложения Plus (деньги) | ✅ токены `glass`, 1-px кромка; цена в карточках не показывается — только вход на пейвол | ✅ | 🔧 обе карточки на KitTouchable (раньше плоское `opacity .82` у `Pressable`); `AiLimitUpsellCard` 🔧 вместо пружинного «подпрыгивания» и тряски — спокойный подъём kit `.anim-rise` (620 мс) | ➖ карточки без собственных ошибок; CTA на 9 яз., заголовок и подписи приходят от вызывающего экрана (9 яз.) | ✅ `flexWrap` у действий, `minHeight` 44, перенос | 🔧 синхронные замки: `AiLimitUpsellCard` (`openLockRef`, пейвол открывался дважды), `SoftContextualUpsellCard` (`actionLockRef`, CTA и «не сейчас»); цену/пробный период карточки не трогают — они на пейволе (проверено выше) |
| 7 Опрос о занятиях | ✅ | ✅ | ✅ PressableHybrid, HybridSheetShell | ✅ 11 слов-состояний, 9 яз. | ✅ ScrollView ×2 | ✅ мгновенное «принято», фон догоняет (тест `survey_sheet_modal`) |
| 8 Управление Plus | ✅ | ✅ | ✅ PressableHybrid ×11 | ✅ загрузка · восстановление · пусто · ошибка | ✅ | ✅ `restoringRef` (13a9053dd), `saveOfferBusyRef`, `changing` |
| 9 Подтверждённый доступ | ✅ | ✅ | 🔧 KitTouchable; полноэкранное празднование (RN Modal fade) | ➖ нет ошибочных состояний | ✅ ScrollView | ➖ показ после подтверждения магазином |
| 10 Объявление/жалоба/приглашённый/окна «открыто» | ✅ | ✅ | 🔧 `PromoBanner`, `ReferralWelcomeHost` — KitTouchable (раньше плоская прозрачность); `ExplainReportButton`, `lesson_complete` уже на KitTouchable | ✅ 9 яз. везде; жалоба на объяснение: причина · отправка · «не отправилось»; окна «открыто» без ошибочных состояний | ✅ `numberOfLines`, ScrollView | 🔧 `ExplainReportButton` (`sendLockRef` + лог), `ReferralWelcomeHost` (`openLockRef`: экран рефералов не открывается дважды), `AchievementNotifModal` (`dismissedRef`: двойной тап больше не пропускает следующее окно очереди) |
| 11 VIP-опрос и входящие | ✅ | ✅ | ✅ KitTouchable, `VipSurveyReviewPromptModal` на HybridSheetShell | ✅ сеть · аккаунт · сервис · недоступно · «пусто» во входящих (9 яз.) | ✅ ScrollView, `numberOfLines` | 🔧 `VipSurveyModal` (`finishLockRef`, причина отказа теперь в логе и в релизе), `VipSurveyReviewPromptModal` (`reviewLockRef`, магазин не открывается дважды); входящие: оптимистичное убирание с «Вернуть» и замки ✅ |

## Не вёрстка / оставлено

- Арт-палитра визитки (hex) — по замыслу «looks»; перенос в токены темы изменил бы дизайн карточки — решение владельца.
- Бордюры во всех группах — только 1-px прозрачные/из токенов (`glassEdge`, `line`, `chrome.cardBorder`), как разрешено для 2.0.

## Дополнение: построчный проход 5, 6, 10, 11 и проверка CTA пейвола (10.10, 23:50)

- **Пейвол Plus (цена и «Оформить»).** Действующий пейвол (`PaywallPlusScreen` → `PaywallPlus`) нажимает кнопки через `PressableHybrid`/`V2Pressable` с прежними testID (`paywall-plan-yearly`, `paywall-plan-monthly`, `paywall-close`, `paywall-restore`) — замена `TouchableOpacity` их не затронула. В `paywallShared`/`PaywallProofCards` замена коснулась только остатков прежних вариантов (крестик `PaywallCloseButton`, закреплённая панель, карточка отзыва), которые экраном Plus не используются (крестик живёт в dev-превью). Для замены добавлен RNTL-тест `tests/kit_touchable.test.tsx`: `onPress`, `testID`, `accessibilityLabel/Role`, `disabled` сохраняются, роль можно переопределить (вкладки, ссылки).
- **Движок шторок.** `ReferralSheetShell` («Код от друга», «Как это работает») имел свою кривую 380/240 мс — переведён на kit `.sheet`; кривые в обоих шеллах создаются лениво (тесты с урезанным мок-Reanimated).
- **Не мои красные:** `friend_together_sheet` (текст «Ты уже занимался(ась) сегодня» после перехода на «ты» — тест ждёт прежнее «Вы…»), `client_reports_delivery_contract`, `gustav_french_curriculum_contract`.
