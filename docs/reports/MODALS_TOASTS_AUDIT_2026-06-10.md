# Аудит модалок и тостов — 2026-06-10

Полная инвентаризация всплывающих элементов, конфликтные сценарии, план миграции «модалка ↔ тост», концепция редизайна.
Макеты: `docs/reports/modal_redesign_mockups_2026-06-10.html` (открыть в браузере).

---

## 1. Что есть сейчас (инвентарь)

| Метрика | Значение |
|---|---|
| Всего модальных окон | **87** (37 компонентов + 38 inline в экранах + 4 router-screen + 5 нативных Alert.alert) |
| Тост-компонентов | **8** (ActionToast, AchievementToast, DailyTaskRewardToast, MatchFoundToast, CoachToast, InGameToast, MedalToast, RankChangeBanner) |
| Вызовов `action_toast` | 127 в 23 файлах |
| Наградных/праздничных модалок | 17 |
| Пейволов/премиум | 11 |
| Admin/QA-only | 4 |
| Дубликаты | QuizTimeoutModal ×2 (компонент + inline в quizzes.tsx:2666), NotificationPermissionModal ×2 (компонент + inline в settings_notifications.tsx:114) |

### Оркестрация
Есть `OverlayArbiter` (`components/overlay_arbiter_core.ts`) — приоритетная очередь из 23 ключей, non-preemptive, одновременно активен 1 слот. **Это хорошо.** Проблема: значительная часть попапов живёт ВНЕ арбитра на локальном state:

- `lesson_complete.tsx`: ReviewModal (:618), RegistrationPromptModal (setTimeout 1500ms, :797), BonusXPCard — без арбитра;
- `lesson1.tsx`: NoEnergyModal, PlanLessonDoneModal, LessonCycleEndModal, ExplainSheet, MedalToast — без арбитра;
- `AppMessagesInbox.tsx:659–693`: Inbox + VipSurveyModal + VipCelebrationModal — три вложенных `<Modal>`;
- `home.tsx`: energy tooltip Modal (:3519), title Modal (:3614) — без арбитра;
- `InGameToast` (zIndex 999999) и `MedalToast` — поверх всего, мимо арбитра.

---

## 2. Конфликтные сценарии (худшие)

1. **Конец первого урока — тройной удар.** AchievementNotifModal (таймер 1200мс) + ReviewModal (сразу) + RegistrationPromptModal (таймер 1500мс) — три попапа за полторы секунды, два из них нативные `<Modal>` одновременно (Android-баг фокуса). `lesson_complete.tsx:618, 766, 797–807`.
2. **Inbox → VIP-опрос → VIP-празднование** — три вложенных нативных `<Modal>` в одном дереве без координации. `AppMessagesInbox.tsx:659,677,683`. Back закрывает только верхний.
3. **StreakRevive + PremiumCelebration** — celebration открывается по `setTimeout(600)` поверх ещё читаемого revive-предложения. `home.tsx:1383–1389`. Аналогично PremiumCelebration→VipCelebration (`setTimeout 1200/600`, home.tsx:1399–1406).
4. **ExplainSheet + NoEnergyModal + пейвол** — два `<Modal>` одновременно в lesson1, затем `router.push('/premium_modal')` без закрытия (`NoEnergyModal.tsx:204`) — три слоя.
5. **Холодный старт — парад**: Update → ReleaseNotes → Broadcast → NotifNudge → LeagueBonus (+ActionToast сразу) → ReleaseWave → ачивки → level-up. Арбитр выстраивает их по одному, но юзер получает ленту из 4–7 окон подряд. `_layout.tsx:1902–1907` (таймеры 0/400/1400/1800мс).
6. **Цепочка level-up**: LevelUp → (260мс) → LevelGiftModal → onClose → пейвол-апселл. `_layout.tsx:659–699`. До 3 окон подряд + хрупкие платформенные задержки.

### Технические баги
- `CoachToast.tsx:77` — `useOverlayVisible('coachToast', true)`: пока смонтирован, перманентно занимает want-слот и душит actionToast.
- `NoEnergyModal.tsx:204` — router.push без закрытия модалки.
- Вложенные Modal: AppMessagesInbox (3 шт), AchievementToast detail (:361) поверх чужих Modal.
- Хардкод-бэкдропы, ломающие светлую тему: ThroneRewardModal `rgba(0,0,0,0.88)`, ReleaseWaveBonusModal `rgba(0,0,0,0.62)`.

---

## 3. Наградные модалки («модалки подарков») — почему они не нравятся

Это зоопарк, который притворяется семьёй (общие утилиты `rewardModal*` есть, но):

| Параметр | Разброс |
|---|---|
| borderRadius карточки | 20 / 22 / 29 / 30 / 32 — пять значений |
| Бэкдроп | от `rgba(0,0,0,0.46)` до `0.88`, два хардкода |
| Тап по фону | LevelGift — нет; Shards/League — закрывает; ReleaseWave — закрывает И забирает; Throne — нет |
| CTA-кнопка | радиус 12–18, paddingV 14–17, тексты «Забрать»/«Продолжить»/«Получить всё»/«Забрать награду» |
| Вход-анимации | 5 разных spring-конфигов; у ReleaseWave входа нет вообще |
| Перегруз | ThroneReward: 12 лучей + glow + 4 звезды + 8 частиц + 3 спринга одновременно; ShardsEarned: sheen + glow + bounce + top-line; синий блок награды внутри золотой Throne-карточки |
| Дёшево | ReleaseWave: эмодзи 🙏 48px + текстовый чеклист ✅/⏳ как «дизайн»; жёлтая HTML-плашка предупреждения внутри тёмного LevelGift |

---

## 4. Миграция: что в тост, что в модалку, что inline

### → В тост (Reward Toast на каркасе ActionToast)
| Сейчас | Почему |
|---|---|
| ShardsEarnedModal | автозакрытие 40с = тостовая природа; мелкие суммы не заслуживают блокировки экрана |
| PlanLessonDoneModal (lesson1.tsx:3137) | мини-событие внутри потока урока |
| LeagueBonusAvailableModal | информашка с CTA → тост с кнопкой «Открыть» (как DailyTaskRewardToast) |
| ShardRewardModal (admin-grant вариант) | подтверждение не нужно |

### → Inline/поповер (вообще не попап)
QuizTimeoutModal (баннер в экране квиза + слить дубль), EnergyTooltip (:3519 — поповер), ArenaRatingInfoModal (экспанд-секция), ActivityHeatmap365 day-модалки (поповер), ThroneTopModal (секция лобби), ClubBotStatsModal (экспанд).

### → Из Alert.alert в ThemedConfirmModal
4 алерта в `premium_modal_v2.tsx:222–256` (ошибки покупки/восстановления) — нативные алерты вне темы, на Android могут уйти под Modal.

### Остаются модалками (но в единой системе)
Подарки уровня, сундук лиги, трон, релизный бонус, празднование Premium/VIP (fullscreen), NoEnergy (sheet), пейволы, подтверждения трат, DeleteAccount.

### Тосты → модалки
Обратных переносов не нужно: текущие тосты на своих местах. DailyTaskRewardToast — образец правильного тоста с действием.

---

## 5. Редизайн: система «Reward Stack»

**Один компонент наград, три формы:**

1. **Reward Toast (S)** — каркас ActionToast + вариант `reward`: иконка-бейдж с артом награды, label «НАГРАДА», сумма, опциональная кнопка. Все 8 тостов переезжают на один каркас (radius 16, фон t.bgCard, левый rail = семантический цвет, 1px бордер) — меняются только иконка/акцент.
2. **Reward Card (M)** — единая центральная карточка для всех наград:
   - бэкдроп: blur + `rgba(2,4,8,0.55)` — одинаковый, тематизированный;
   - карточка: 326w, radius `ds.radius.xxl` (24, в compass/gold 18), panel-градиент `rewardModalPanelColors`, 1px бордер-акцент, фирменная glow-линия сверху — единственный декор;
   - анатомия сверху вниз: кикер (11/900/uppercase/акцент) → кольцо 104px с артом → заголовок (22/900) → значение/название → reason-box (опц., soft surface radius 14) → CTA 52px radius 16 «Забрать» → ghost «Позже»;
   - правила: тап по фону = «Забрать» (награда никогда не теряется), редкость = только цвет кикера/кольца, максимум 2 анимированных слоя (вход + glow кольца);
   - один вход: spring scale 0.94→1 + translateY 16→0 + fade 240ms (MOTION_SPRING.ui).
3. **Reward Stack (агрегация)** — если в очереди ≥2 наград за один триггер, показывается ОДНА карточка с очередью-стопкой позади и точками «1 из N». На карточке — обычная CTA «Забрать» (только текущая награда), а ПОД модалкой — отдельная стеклянная кнопка «Забрать всё · N». По «Забрать всё» — фирменная анимация: стопка схлопывается, бэкдроп растворяется, иконки всех наград выпархивают в центре и веером улетают вверх к счётчикам шапки (осколки/уровень подскакивают и обновляются, «+N» всплывает у счётчика). Убивает «парад модалок». (Утверждено юзером 2026-06-10, интерактив в HTML-макете.)

4. **Один тип для ВСЕХ модалок (решение юзера 2026-06-10):** та же анатомия Reward Card применяется не только к наградам, а ко всем категориям — подтверждения трат (заморозка стрика, реролл), опасные действия (удаление аккаунта, красная семантика + ввод слова), лимиты (NoEnergy, ArenaLimit — жёлтая семантика), системные (Update/ReleaseNotes/Broadcast), социальные (подарки друзей, приглашения арены), спасение прогресса (StreakRevive), регистрация. Семантика = только цвет кикера/кольца и иконка. Галерея всех категорий — в HTML-макете.

**Оркестрация v2:**
- Все попапы — только через OverlayArbiter (добавить ключи: review, authPrompt, noEnergy, inboxFlow);
- запрет setTimeout-цепочек: следующий попап только из onClose предыдущего через арбитра;
- маркетинговый бюджет: после урока максимум 1 маркетинг-попап (review ИЛИ регистрация ИЛИ апселл — скоринг), наградные агрегируются в Stack;
- глобальный лимит: не более 2 попапов подряд на один триггер, хвост — в inbox/бейджи;
- фиксы багов: CoachToast wants, NoEnergy→onClose перед push, разворачивание вложенных Modal в последовательность.

---

## 6. Приоритеты внедрения

1. **P0 — багфиксы конфликтов** (CoachToast wants; lesson_complete тройной удар → один маркетинг-слот; NoEnergy push; AppMessagesInbox последовательность). Маленькие диффы, сразу меньше злости юзеров.
2. **P1 — Reward Card v2 + миграция 6 наградных модалок** на единую анатомию (LevelGift/Dual, ShardsEarned→тост, ShardReward, LeagueChest, Throne, ReleaseWave).
3. **P2 — Reward Stack агрегация** + перевод кандидатов в тосты/inline, слить дубли, Alert→ThemedConfirm.
4. **P3 — унификация тостов** на одном каркасе.
