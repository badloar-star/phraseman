# Аудит текстов Phraseman vs «Библия Phraseman» — РЕЗУЛЬТАТЫ

> Дата: 2026-06-27
> Эталон: [`PHRASEMAN_BIBLE.md`](../PHRASEMAN_BIBLE.md). План: [`BIBLE_TEXT_AUDIT_PLAN.md`](BIBLE_TEXT_AUDIT_PLAN.md)
> Метод: пер-зонный аудит + adversarial-верификация каждой находки (отсев учебного контента, кода, комментариев, dev-экранов).
> Код НЕ менялся — это отчёт. Каждая находка проверена дважды.

## ДОБОР ПОСЛЕ ПОЛНОГО ГРЕП-КОНТРОЛЯ (2026-06-27) ✅

Агенты второго прохода падали от лимитов и нашли НЕ всё. Прогнал исчерпывающий греп по ВСЕМ 221 UI-файлам (широкий набор паттернов) и доисправил пропущенное (~40 строк, 2 коммита `audit-2b/2c`):
- **«прогресс»→«путь»:** notifications (upsell), paywall_copy ×3, ai_companion, personal_plan_thank_you, StatsPremiumBlur, LevelGiftModal/Dual, DeleteAccountConfirmModal, streak_stats, home.
- **«статистика»→«твои результаты»:** streak_stats (заголовок экрана + 2), profile_card_system, LevelGiftModal.
- **«задание»→«вызов»:** весь daily_tasks_screen (~10), DailyTasksFirstVisitModal (~9), streak_stats, preposition_drill, personal_plan_complete, lesson_menu, paywall_personalization, EnergyRefillShardModal.
- **«покупка»→«оплата»:** shards_shop Google Play-ветка (пропущена в 1-м проходе!), purchaseCommunityPack, paywallScreenCopy (2-й экземпляр).
- **Запугивание убрано:** `home.tsx` «Цепочка под угрозой» (на ГЛАВНОЙ!) → «Защити цепочку», streak_stats «Собьёшь→потеряешь» → нейтрально, ReleaseNotesModal «Понятно»→«Поехали дальше».

Финальный греп-контроль: чисто. Осталось 3 ложных (НЕ трогать): `lesson_words` перевод слова «task», `vip_survey_content` варианты ответа в опросе.

**ИТОГО по всем проходам: ~135 исправленных нарушений, 11 коммитов в master (не запушено).**

---

## ВТОРОЙ ПРОХОД (2026-06-27) — непроверенная половина приложения ✅

Проверены ещё ~130 файлов, НЕ входивших в первый аудит (арена, AI-диалоги, голосовые тренеры, экзамены/диагностика, личный план-упражнения, тосты/коуч, баннеры/хосты, paywall-подкомпоненты, достижения, соцветка, компас, виджет). Метод тот же: многоагентный Workflow + adversarial-верификация, добор грепом по упавшим от лимита зонам. **Исправлено ~35 находок** (2 коммита `fix(audit-2): …`):

- **«ты» вместо «вы»:** `lesson_words` («Вставьте»→«Вставь»), `lesson_irregular_verbs` («Вернитесь/откройте»→«ты»), `trainer_load_copy` («Проверьте»→«Проверь»).
- **Кнопки-глаголы:** «Повторить»→«Отправить снова»/«Перевести снова»/«Попробовать снова» (ai-dialog, trainer_load), «Далее →»→«Следующий вопрос →» (exam, level_exam), «Назад»→«Вернуться» (diagnostic_test).
- **«ошибка/неверно»→«промах/почти»:** generic error-тост `ActionToast` («Ошибка»→«Что-то пошло не так» — влияет на ВСЕ ошибки без своего заголовка), `pack_opening`, `AiMistakeCard` («Разбор ошибки»→«Разбор промаха»), `preposition_drill`/`trainer_words` («Неверно»→«Почти»/«Мимо»), `level_exam` («Ошибки:»→«Что разобрать:»).
- **«задание»→«вызов»:** `DailyTaskRewardToast`, `daily_tasks`, `personal_plan_exercise`/`transition`, `shard_earn_ui`.
- **«прогресс»→«путь»:** `lesson_words`, `SaveProgressBanner`.
- **Техтермины убраны:** `ai_dialog_client` («сервер не видит подписку/обнови статус подписки», «ИИ-сервис»→человеческий текст).
- **loss/срочность смягчены:** `arena_i18n` forfeitSub («потеряешь звезду»→нейтрально), тосты энергии арены, `PaywallPriceUrgency` («Эту цену поднимаем»→«Это предложение меняется», дедлайн реальный — оставлен).
- **legal-ok / опросы НЕ трогал:** `vip_survey_content` (формулировки проблем в анкете «Непонятны ошибки/Больше статистики» — нельзя искажать смысл опроса), billing-дисклеймеры.

Всего по двум аудитам: **~95 исправленных нарушений, 9 коммитов** в `master` (не запушено).

---

## СТАТУС: ✅ ВСЕ НАРУШЕНИЯ ИСПРАВЛЕНЫ (2026-06-27)

Все находки ниже исправлены и закоммичены в `master` (7 коммитов `fix: …to Bible`).
Дополнительно при финальной grep-проверке найдены и исправлены остаточные нарушения вне исходного отчёта:
`club_screen.tsx` («Купить»→«Открыть»), `lessons.tsx` / `lesson_menu.tsx` / `SpeakingPanel.tsx` / `ReportErrorButton.tsx` («Понятно»→«Закрыть»), ещё два «Задания дня»→«Вызовы дня».
Legal-ok места (управление подпиской, дисклеймеры автопродления) НЕ трогались. Синтаксис всех файлов проверен.

---

## Итог

- **Проверено зон:** все 10 (paywall, онбординг, словарь/квизы, главный словарь, уведомления, модалки, тосты/ошибки, экраны уроков/главная — частично точечным грепом).
- **Подтверждённых нарушений: ~55** (high / medium / low).
- **Главные проблемы:** слово «Купить» на кнопках paywall; «ошибки» в квизах; «Понятно» вместо глагола в модалках; «вы/ваш» в нескольких местах; паника в стрик-пушах; технический текст в UI магазина.
- Базовый тон приложения в целом **близок к Библии** (много правильных «Открыть полный доступ», «Попробуй ещё раз», «ты»). Нарушения — точечные, легко правятся.

Легенда: 🔴 high · 🟠 medium · 🟡 low.

---

## 1. PAYWALL / ПОДПИСКА — стиль ИНВЕСТОР

Главная зона по словарю. Базовый CTA «Открыть полный доступ» — ✅ правильный. Проблемы — в lifetime-ветке и магазине осколков.

| Severity | Файл:строка | Сейчас | Правило | Предложение |
|---|---|---|---|---|
| 🔴 | [paywallScreenCopy.ts:20](../components/paywall/paywallScreenCopy.ts) | `Купить навсегда` (CTA lifetime) | «купить» запрещено | **Открыть навсегда** / Получить навсегда |
| 🔴 | [paywallScreenCopy.ts:137](../components/paywall/paywallScreenCopy.ts) | `Купить навсегда` (sticky-кнопка) | то же | **Открыть навсегда** (согласовать с CTA) |
| 🔴 | [CardPackShardPaywallModal.tsx:170](../app/flashcards/CardPackShardPaywallModal.tsx) | `buy: 'Купить'` | «купить» | **Открыть** / Получить |
| 🔴 | [CardPackShardPaywallModal.tsx:171](../app/flashcards/CardPackShardPaywallModal.tsx) | `Купить осколки` | «купить» + «пополнить» | **Пополнить осколки** |
| 🔴 | [CardPackShardPaywallModal.tsx:172](../app/flashcards/CardPackShardPaywallModal.tsx) | `Купить за ${n} осколков` | «купить» | **Открыть за N осколков** |
| 🔴 | [shards_shop.tsx:1611](../app/shards_shop.tsx) | `Купить за ${n} осколков` | «купить» | **Открыть за N осколков** |
| 🔴 | [avatar_select.tsx:873](../app/avatar_select.tsx) | `title="Подтвердить покупку?"` | «подтвердить» + «покупка» + хардкод RU без triLang | **Открыть ауру?** (+ локализовать) |
| 🔴 | [shards_shop.tsx:982](../app/shards_shop.tsx) | `Покупка принята. Осколки появятся после webhook RevenueCat.` | техтермин в UI + «покупка» | **Оплата принята. Осколки появятся через пару минут.** |
| 🔴 | [shards_shop.tsx:441](../app/shards_shop.tsx) | `Магазин ещё не готов: проверь Offering «shards» в RevenueCat…` | техтекст в UI | **Магазин временно недоступен. Попробуй позже.** (детали — в лог) |
| 🟠 | [shards_shop.tsx:996](../app/shards_shop.tsx) | `Ошибка покупки. Попробуй ещё раз.` | «ошибка» + «покупка» | **Не получилось оформить. Давай ещё раз.** |
| 🟠 | [shards_shop.tsx:953](../app/shards_shop.tsx) | `Покупка подтверждена.` | «покупка» | **Готово — осколки скоро будут.** |
| 🟠 | [shards_shop.tsx:420](../app/shards_shop.tsx) | `Покупка — в App Store` | «покупка» | **Оплата через App Store** |
| 🟠 | [CardPackShardPaywallModal.tsx:193](../app/flashcards/CardPackShardPaywallModal.tsx) | `costLabel: 'Стоимость'` | «стоимость» | **Нужно осколков** |
| 🟠 | [paywallScreenCopy.ts:62/95](../components/paywall/paywallScreenCopy.ts) | `Точная сумма появится перед покупкой.` | «покупка» | **…перед оформлением.** |
| 🟠 | [NoEnergyModal.tsx:492](../components/NoEnergyModal.tsx) | `Понятно` (CTA) | нет глагола | **Вернуться к учёбе** / Продолжить |
| 🟠 | [EnergyRefillShardModal.tsx:127](../components/EnergyRefillShardModal.tsx) | `…сможешь купить полное восстановление за осколки` | «купить» | **…сможешь открыть полное восстановление…** |
| 🟡 | [shards_shop.tsx:1733](../app/shards_shop.tsx) | `Осколки (оплата)` | «оплата» как лейбл | **Пополнить осколки** |
| 🟡 | [PremiumCelebrationModal.tsx:348](../components/PremiumCelebrationModal.tsx) | `Учи без лимитов` | «учи» | **Прокачивайся без лимитов** |
| 🟡 | [PremiumCelebrationModal.tsx:407](../components/PremiumCelebrationModal.tsx) | `Начать учиться` | «учиться» | **Поехали** / Открыть приложение |
| 🟡 | [IntroFullAccessModal.tsx:31](../components/IntroFullAccessModal.tsx) | `welcomeCta: 'Начать'` | слабый CTA без объекта | **Начать — всё открыто** |
| 🟡 | [IntroFullAccessModal.tsx:37](../components/IntroFullAccessModal.tsx) | `Продолжить бесплатно` | «бесплатно» | **Остаться на базовом** |
| 🟡 | [paywall_copy.ts:297](../app/paywall_copy.ts) | `personal_plan.subtitleRu` (длинный абзац, «задания», «уроки») | Правило 4 + словарь | сократить, «раунды» вместо «уроки» |

**Пограничные (legal-ok, НЕ править):** «подписка/оплата» в [manage_subscription.tsx](../app/manage_subscription.tsx), [PaywallLegalDisclosure.tsx](../components/paywall/PaywallLegalDisclosure.tsx), дисклеймеры автопродления, «бесплатно» в trial-CTA ([paywallScreenCopy.ts:32](../components/paywall/paywallScreenCopy.ts)) — обязательны по требованиям App Store / Google Play.

---

## 2. КВИЗЫ / СЛОВАРЬ — «ошибки», «Далее/Понятно», «вы»

| Severity | Файл:строка | Сейчас | Правило | Предложение |
|---|---|---|---|---|
| 🔴 | [quizzes.tsx:2468](../app/(tabs)/quizzes.tsx) | `ВАШ ВАРИАНТ:` | «вы» (№8) | **ТВОЙ ВАРИАНТ:** |
| 🔴 | [quizzes.tsx:2132](../app/(tabs)/quizzes.tsx) | `Исправить ошибки (${n})` | «ошибки» (№6) | **Закрепить промахи (N)** / Доработать фразы |
| 🔴 | [result_view.tsx:200](../app/quizzes/result_view.tsx) | `🔄 Исправить ошибки (${n})` | «ошибки» | **🔄 Закрепить промахи (N)** |
| 🔴 | [LangContext.tsx:61](../components/LangContext.tsx) | `fixErrors: 'Исправь ошибки'` | «ошибки» | **Закрепи промахи** |
| 🔴 | [quizzes.tsx:2636](../app/(tabs)/quizzes.tsx) | `Далее` | нет глагола | **Следующая фраза** |
| 🔴 | [quizzes.tsx:2853](../app/(tabs)/quizzes.tsx) | `Понятно` | нет глагола | **Попробовать снова** |
| 🔴 | [flashcards_swipe.tsx:1030](../app/flashcards_swipe.tsx) | `Дальше` | нет глагола | **Следующая фраза** |
| 🟠 | [quizzes.tsx:1239](../app/(tabs)/quizzes.tsx) | `Понятно` | нет глагола | **Вернуться к вызовам** |
| 🟠 | [quizzes.tsx:2823](../app/(tabs)/quizzes.tsx) | `Очень жаль 😔 Попробуй ещё раз!` | не унижаем (№6) | **Почти! Давай ещё заход — ты близко.** |
| 🟠 | [flashcards_swipe.tsx:920](../app/flashcards_swipe.tsx) | `Нет доступных наборов для тренировки.` | сухое пустое состояние | **Наборы откроются здесь — добавь свои фразы.** |

---

## 3. ГЛАВНЫЙ СЛОВАРЬ `constants/i18n.ts` — «слова/урок/учить/прогресс»

| Severity | Строка | Сейчас | Предложение |
|---|---|---|---|
| 🟠 | [140](../constants/i18n.ts) | `fixErrors: 'Разбери ошибки'` | **Разбери промахи** |
| 🟠 | [148](../constants/i18n.ts) | `${n} слов — изучаем` | **${n} фраз — осваиваем** |
| 🟠 | [147](../constants/i18n.ts) | `Все слова — твои. Урок закрыт.` | **Все фразы — твои. Раунд закрыт.** |
| 🟡 | [146](../constants/i18n.ts) | `Все слова урока` | **Все фразы раунда** |
| 🟡 | [152](../constants/i18n.ts) | `Как ты учишь` | **Как ты осваиваешь** |
| 🟡 | [185](../constants/i18n.ts) | `30 минут — быстрый прогресс` | **30 минут — быстрый путь** |

---

## 4. ОНБОРДИНГ — стиль ТРЕНЕР

| Severity | Файл:строка | Сейчас | Предложение |
|---|---|---|---|
| 🔴 | [WelcomeSlides.tsx:124](../app/onboarding_welcome/WelcomeSlides.tsx) | `'Далее'` (хардкод) | **Продолжить →** (вынести в сценарий) |
| 🟠 | [onboarding.tsx:3780](../components/onboarding.tsx) | `Сохрани прогресс` | **Сохрани свой путь** |
| 🟠 | [onboarding.tsx:3794](../components/onboarding.tsx) | `…сменить телефон — прогресс останется только на этом устройстве.` | gain-тон, без «прогресс» |

> Структура онбординга (Приветствие→Цель→Привычка) и тексты целей/темпа — ✅ соответствуют Библии.

---

## 5. УВЕДОМЛЕНИЯ (`app/notifications.ts`) — ЗАПУГИВАНИЕ В СТРИК-ПУШАХ

Самая системная проблема: стрик-предупреждения написаны в тоне паники («под угрозой», «может исчезнуть», 😱🚨), а Библия требует «защити серию». Для юзеров со стриком **< 7 дней** loss-framing запрещён вовсе — а функция шлёт его всем.

| Severity | Строка | Сейчас | Предложение |
|---|---|---|---|
| 🔴 | [587](../app/notifications.ts) | `Цепочка под угрозой! / может исчезнуть сегодня! / в опасности 😱🚨` | **Защити серию ${n} дней — один раунд.** + гейт «паника только при 7+ днях» |
| 🔴 | [1278](../app/notifications.ts) | `🚨 …под угрозой! 😱 всё может исчезнуть сегодня!` (streak≥15) | **🏆 Сбереги легендарную серию ${n} дней.** Убрать 🚨😱 |
| 🟠 | [1480](../app/notifications.ts) | `не прерывай сегодня! / Не пропусти урок!` (streak<7) | **Один раунд — и серия растёт!** (без «не», без «урок») |
| 🟠 | [1530](../app/notifications.ts) | `Не давай привычке сломаться — сделай урок!` | **Закрепи привычку — короткий раунд 💪** |
| 🟠 | [1937](../app/notifications.ts) | `😤 обогнал тебя! 😱 Тебя обошли! не сдавай позиции!` | **⚔️ ${name} вырвался вперёд — твой ход!** |
| 🟡 | [1379](../app/notifications.ts) | `в опасности / под угрозой / не сдавай` (streak≥7) | **🔥 Продолжи серию ${n} дней сегодня.** |
| 🟡 | [213](../app/notifications.ts) | `Не прерывай серию` (ежедневное, всем) | **5 минут в день — и серия растёт.** |
| 🟡 | [215](../app/notifications.ts) | `Кто-то обошёл тебя в лиге` | **Время вернуть лидерство!** |
| 🟡 | [630](../app/notifications.ts) | `Один урок решает всё` | заменить «урок»→«раунд» |
| 🟡 | [869](../app/notifications.ts) | `Ты выучил первые фразы… доступ к урокам` | «освоил» / «к сессиям» (дедлайн реальный — ок) |

---

## 6. МОДАЛКИ — «Понятно» и «вы/ваш»

**Кнопка «Понятно» без глагола (Правило 1)** — повторяется во многих модалках:

| Severity | Файл:строка |
|---|---|
| 🟠 | [ArenaLimitModal.tsx:406](../components/ArenaLimitModal.tsx), [GlobalBroadcastModal.tsx:240](../components/GlobalBroadcastModal.tsx), [QuizTimeoutModal.tsx:144](../components/QuizTimeoutModal.tsx), [SeasonResultModal.tsx:240](../components/SeasonResultModal.tsx), [WeeklyBoonDetailModal.tsx:71](../components/WeeklyBoonDetailModal.tsx), [UserWarningModal.tsx:25](../components/UserWarningModal.tsx) — все `Понятно` → **«Хорошо, дальше»/«Закрыть»/контекстный глагол** |
| 🟡 | [ReleaseNotesModal.tsx:105](../components/ReleaseNotesModal.tsx) `Понятно, продолжаем` — пограничное, можно «Поехали дальше» |

**«вы/ваш» вместо «ты» (Правило №8):**

| Severity | Файл:строка | Сейчас | Предложение |
|---|---|---|---|
| 🔴 | [PlayerProfileModal.tsx:419](../components/PlayerProfileModal.tsx) | `Вы уже друзья` | **Вы уже друзья → «Уже друзья»** |
| 🔴 | [PlayerProfileModal.tsx:447](../components/PlayerProfileModal.tsx) | `Это ваш профиль` | **Это твой профиль** |
| 🔴 | [VipSurveyReviewPromptModal.tsx:62](../components/VipSurveyReviewPromptModal.tsx) | `Ваш VIP активирован` | **Твой VIP активирован** |
| 🔴 | [ReportPackModal.tsx:175](../components/ReportPackModal.tsx) | `Ваша жалоба сохранена…` | **Твоя жалоба сохранена…** |
| 🟠 | [CertificateNameModal.tsx:96](../components/CertificateNameModal.tsx) | `Ваше имя или ник` | **Твоё имя или ник** |
| 🟠 | [VipSurveyModal.tsx:143](../components/VipSurveyModal.tsx) | `Ваши ответы…` | **Твои ответы…** |
| 🟠 | [RegistrationPromptModal.tsx](../components/RegistrationPromptModal.tsx) | `…ваш email…` | **…твой email…** |
| 🟠 | [LoyaltyGiftModal.tsx:74](../components/LoyaltyGiftModal.tsx) | `Ответил неправильно` | **Если промахнулся** |

---

## 7. ГЛАВНАЯ / ЕЖЕДНЕВНЫЕ ЗАДАЧИ — «задание», «ошибки»

| Severity | Файл:строка | Сейчас | Предложение |
|---|---|---|---|
| 🟠 | [home.tsx:1838,2943](../app/(tabs)/home.tsx) | `Задания дня` | **Вызовы дня** / Миссии дня |
| 🟠 | [daily_tasks_screen.tsx:1022](../app/daily_tasks_screen.tsx) | `Быстрые ошибки` | **Быстрые промахи** |
| 🟠 | [daily_tasks_screen.tsx:1042](../app/daily_tasks_screen.tsx) | `Разобрать ошибки` | **Разобрать промахи** |
| 🟡 | [daily_tasks_screen.tsx:2805](../app/daily_tasks_screen.tsx) | `Прогресс старого задания не сохранится.` | **Старый вызов начнётся заново.** |
| 🟡 | [lesson_complete.tsx:336](../app/lesson_complete.tsx) | `Все уроки = 5.0…` | **Все раунды = 5.0…** |

---

## Рекомендованный порядок исправления

1. **🔴 high (paywall + квизы + «вы»)** — самое заметное и влияет на конверсию/доверие (~18 правок).
2. **Стрик-пуши** (раздел 5) — добавить гейт «паника только при 7+ днях» + смягчить тон.
3. **«Понятно» в модалках** (раздел 6) — массовая замена на глаголы.
4. **🟠/🟡 medium/low** — словарь и косметика, можно пачкой.
5. **Технический текст в UI** (shards_shop:441/982) — вынести в лог.

> Все правки — замена строк, без логики. «legal-ok» места (управление подпиской, дисклеймеры) НЕ трогать.
