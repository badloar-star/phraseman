# План улучшения конверсии в премиум — Phraseman

**Дата:** 2026-06-08
**Автор:** аудит + проектирование на основе кода `C:\appsprojects\phraseman`
**Связанные документы:**
- Аудит воронки: `docs/reports/premium_conversion_audit_2026-06-08.md`
- Уже применённые P0-фиксы (эта сессия): см. раздел 0.

**Объём:** ≥20 страниц A4.

## Содержание

- **Раздел 0.** Что уже сделано (контекст плана).
- **Глава 1.** Тайминг гейтов и сглаживание обрыва ценности после 72-часового intro.
- **Глава 2.** Victory-moments: перенос апселла с фрустрации на победу.
- **Глава 3.** Социальное доказательство, savings-бейдж и порядок элементов в live-пейволе + судьба `premium_modal_v2`.
- **Глава 4.** Лимиты тренажёра / smart / diagnosis: лестница ценности и энергетическая экономика.
- **Глава 5.** Метрики, гипотезы и приоритизация (ICE).
- **Глава 6.** Технические заметки, дорожная карта, приложения.

---

## Раздел 0. Что уже сделано (контекст плана)

В этой сессии применены P0-фиксы, на которые опирается остальной план:

| # | Фикс | Файлы |
|---|---|---|
| 1 | Триальный UI («3 дня бесплатно») показывается на ВСЕХ контекстах, где магазин реально отдаёт intro-фазу (а не только из настроек). | `app/paywall_trial_offer.ts`, `app/premium_modal.tsx` |
| 3 | Онбординг-пейвол: цены тянутся из RevenueCat (убран хардкод `$4.99/$39.99`); CTA «3 дня бесплатно» только при реальном триале; выбор плана (monthly/annual) пробрасывается в основной пейвол. | `components/onboarding.tsx`, `app/_layout.tsx`, `app/premium_modal.tsx` |
| 4 | `intro_ended` стал полноценным контекстом пейвола с loss-framing копией и персональной строкой «за 3 дня ты собрал: серию N · M уроков · K карточек». | `app/premium_modal.tsx`, `app/firebase.ts` |
| 5 | `analytics.ts` превращён в единый фасад (Firebase + PostHog). Подключены недостающие события воронки: `purchase_started/completed/failed/cancelled`, `trial_started` в ОБОИХ пейволах (v1 и v2), шаги онбординга, intro-модалки. Создан `app/posthog_client.ts` (активируется ключом `EXPO_PUBLIC_POSTHOG_KEY`). | `app/analytics.ts`, `app/posthog_client.ts`, `app/premium_modal.tsx`, `app/premium_modal_v2.tsx`, `components/onboarding.tsx`, `components/IntroFullAccessModal.tsx` |

**Важная поправка к аудиту:** `premium_modal_v2.tsx` НЕ мёртвый код — в `premium_modal.tsx` есть A/B-сплит 50/50 по ключу `paywall_variant` (строки ~1607–1624), и половина новых пользователей видит v2. Раньше v2 не слал ни одного аналитического события — половина покупок была невидима. Теперь это исправлено (#5). Это меняет приоритет блока 4 (см. главу 3).

Дальнейшее — это P1/P2: структурные улучшения, требующие продуктовых решений и дизайна, поэтому вынесены в план, а не в немедленные правки.

---

## Глава 1. Тайминг гейтов и сглаживание обрыва ценности после 72-часового intro full-access

### 1. Точное описание проблемы «value cliff»

#### Что происходит сегодня

В `app/intro_full_access.ts:10` объявлена константа:

```
export const INTRO_FULL_ACCESS_DURATION_MS = 72 * 60 * 60 * 1000;
```

При первом запуске онбординга вызывается `startIntroFullAccessAfterOnboarding()` (строки 39–57). Функция записывает в AsyncStorage четыре ключа: `startedAt`, `endsAt`, `welcome_seen = false`, `ended_seen = false`. Одновременно планируются два пакета уведомлений: `scheduleIntroExpiringNotification` (за 2 часа до конца) и `scheduleUpsellNotifications` (D+4, D+7, D+14 от момента окончания, `notifications.ts:905-1019`).

Функция `getVerifiedPremiumAccessStatus()` в `premium_guard.ts:215-244` последовательно проверяет: реальный премиум → VIP → `isIntroFullAccessActive()`. Строка 229:

```
if (await isIntroFullAccessActive().catch(() => false)) {
  return cacheAccess(true);
}
```

Пока `remainingMs > 0` (строка 79 `intro_full_access.ts`), пользователь получает `true` по всем проверкам: `spendEnergy()` в `energy_system.ts:101` вернёт `true` не тратя энергию, `consumeTrainerSessionEntry()` в `trainer_session.ts:97-98` не проверяет счётчик сессии, квизы в `quizzes.tsx:862` пропускают лимит.

**Момент T=72h:** `remainingMs` падает до 0, `getIntroFullAccessState().active = false`. Теперь:

- `spendEnergy()` начинает тратить реальную энергию. `MAX_ENERGY = 5` (`energy_system.ts:13`), восстановление строго фиксировано: `ENERGY_RECOVERY_INTERVAL_MS = 10 * 60 * 1000` (строка 14) — 10 минут на единицу, 50 минут на полное восстановление с нуля. Формулой управляет `secondsUntilEnergyFull()` (строки 198–211): `missing * recoveryIntervalMs - elapsedInCurrent`.
- Квизы становятся ограниченными: `FREE_DAILY_QUIZ_LIMIT = 3` (`quiz_daily_limit.ts:5`). Лимит проверяется жёстко: `lockedByDailyLimit = !DEV_MODE && !isPremium && freeQuizState.exhausted` (`quizzes.tsx:1045`). Ни одной grace-итерации нет.
- Тренажёр: `getFreeSessionsLeftToday()` возвращает `Math.max(0, 1 - data.count)` (`trainer_session.ts:61`). Лимит — одна сессия в сутки. Попытка второй — `reserveTrainerSessionEntry()` вернёт `false`, навигация заблокируется.
- `NoEnergyModal` (`components/NoEnergyModal.tsx:194`) показывается через `shouldRenderNoEnergyModal(visible, hasPremiumAccess, qaIgnorePremiumAccess)`. До T=72h этот модал не показывался ни разу: `isPremium` был `true`. После — первый же запуск урока с 0 энергией триггерит полноэкранный модал с паузой 10 мин и пэйволлом.

#### Почему это «обрыв», а не «переход»

Переход мгновенный и тотальный: за одну миллисекунду пользователь из состояния «всё открыто, без ограничений» переходит в состояние «5 уроков в день, 3 квиза, 1 сессия тренажёра, 10 минут ждать». Уведомление «Твой Premium истекает через 2 часа» (`notifications.ts:853`) — единственный сигнал перед обрывом. Никаких промежуточных состояний нет: нет grace-периода, нет «сейчас 4 единицы вместо 5», нет soft-limit с предупреждением.

Пользователи на D+3 (последний день интро) в среднем уже имеют вредную привычку: они привыкли открывать приложение и немедленно обучаться столько, сколько хотят. Формируется поведенческий якорь — «это приложение работает без ограничений». Резкая смена механики на D+4 воспринимается не как «закончился триал», а как «приложение сломалось» или «меня обманули». Результат — спайк чёрного списка и чёрная метка в App Store reviews.

---

### 2. Трёхфазная модель деградации (фазы A, B, C)

Модель делит постинтро-период на три фазы с разными терапевтическими целями.

#### Фаза A — Grace Window (T=72h до T=96h, 24 часа после окончания интро)

**Цель:** не дать пользователю почувствовать обрыв немедленно. Покупка совершается в первые 48 часов после триала значительно чаще, чем позже. Grace Window — буфер, который даёт ещё один шанс без агрессии.

**Механика энергии:** вместо немедленного перехода на `MAX_ENERGY=5` предоставляется расширенный лимит `GRACE_ENERGY=7`. Это реализуется через `getIntroPhase()` (см. раздел 3), который возвращает `phase: 'grace'` и `bonusEnergy: 2`. `spendEnergy()` во время grace-фазы тратит энергию нормально, но `checkAndRecover()` использует grace-максимум при расчёте восстановления. Текущие `bonusEnergy` уже существуют в `useEnergy()` (в `NoEnergyModal.tsx:189` видно `bonusEnergy`), значит инфраструктура для дополнительной энергии есть.

**Механика квизов:** `FREE_DAILY_QUIZ_LIMIT` виртуально поднимается до 5 в grace-фазе. В `quiz_daily_limit.ts:5` это хардкод — во время grace нужно не менять константу, а добавить функцию `getEffectiveDailyQuizLimit()`, которая считывает `getIntroPhase()` и возвращает 5 вместо 3.

**Механика тренажёра:** 2 сессии вместо 1. `getFreeSessionsLeftToday()` возвращает `Math.max(0, 2 - data.count)` в grace-фазе.

**Уроки:** без изменений — `MAX_ENERGY=7` в grace даёт эффективно 7 уроков вместо 5.

**Смарт/Диагноз:** диагностический движок (`diagnosis_training_engine.ts`) и personal plan (`personal_plan_state.ts`) — доступны полностью. Это дорогие функции, с которыми пользователь ещё только знакомится, их блокировка в grace нецелесообразна.

**Пуш в начале grace:** немедленно при T=72h (не ждать D+4) — тёплое уведомление, не паника. «Твои 72 часа завершились, но мы не бросаем тебя сразу» (конкретные тексты — в разделе 4).

#### Фаза B — Soft Narrowing (T=96h до T=168h, дни 4–7 после окончания интро)

**Цель:** постепенное осознание ценности Premium через ощущение реального ограничения. Не сломать пользователя одним ударом, а дать ему «потрогать» ограничения, оставив достаточно, чтобы он продолжал учиться.

**Механика энергии:** `MAX_ENERGY=5`, стандартная система, но `NoEnergyModal` показывает новую ветку текста с персонализацией (серия, количество пройденных уроков). До этого момента пользователь никогда не видел этот модал — нужно его встретить мягко, а не как paywall-агрессию. Текущие тексты в `lesson1_energy.ts` уже грамотные («Дай знаниям улягтися»), но в B-фазе нужна дополнительная ветка с упоминанием того, что было в интро.

**Механика квизов:** стандартный лимит 3/день (`FREE_DAILY_QUIZ_LIMIT`). При достижении лимита — в блокирующем экране добавляется счётчик «осталось X часов до сброса», и мягкий CTA «ты уже прошёл 3 квиза — неплохо для начала».

**Механика тренажёра:** 1 сессия/день. После использования кнопка не исчезает, а меняет текст на «Вернуться завтра» с таймером до полуночи.

**Уроки и Personal Plan:** без изменений — стандартный режим. Personal Plan по умолчанию должен оставаться доступным на 1 день (базовый режим), чтобы пользователь видел, что может сделать с Premium.

**D+4 уведомление** (уже есть в коде: `notifications.ts:929`): «Твой прогресс продолжается». Дополняем персонализацией — N серия, M уроков (раздел 4).

#### Фаза C — Freemium Baseline (T=168h+, D+8 и далее)

**Цель:** устойчивая freemium-механика, при которой пользователь может учиться каждый день, но чувствует ценность Premium и имеет мотивацию конвертироваться.

**Механика энергии:** стандартная. Ключевое изменение — добавить еженедельный «energy refill» за серию 7 дней: если пользователь завершил неделю учёбы, ему дают +3 бонусных энергии как награду. Это уже частично предусмотрено `addEnergy()` в `energy_system.ts:134`.

**Механика квизов:** 3/день. Но добавить «квиз-стрик бонус»: если пользователь делает квизы 3 дня подряд, на 4-й день лимит временно 4. Это создаёт habit loop без нарушения монетизационных параметров.

**Механика тренажёра:** 1 сессия/день, стабильно. При использовании арены добавляется связка: выигранный поединок в `arena_daily_limit.ts` не считается за сессию тренажёра — это разные контексты.

**Smart-функции:** Diagnosis training (`diagnosis_training_engine.ts`) ограничен 2 тренингами в неделю в C-фазе. Personal Plan (`personal_plan_state.ts`) — 1 активный план с базовыми упражнениями.

---

### 3. Псевдокод `getIntroPhase()` и `getPostIntroDay()` с интеграцией в лимиты

```typescript
// Концептуальная структура — не для прямого копипаста

type IntroPhase = 'active' | 'grace' | 'soft_narrow' | 'freemium';

interface IntroPhaseState {
  phase: IntroPhase;
  postIntroDay: number;         // 0 если интро активно
  graceRemainingMs: number;     // 0 вне grace
  softNarrowProgress: number;   // 0.0–1.0 внутри B-фазы
}

async function getIntroPhase(nowMs: number = Date.now()): Promise<IntroPhaseState> {
  const introState = await getIntroFullAccessState(nowMs);

  // Интро активно — фаза не началась
  if (introState.active) {
    return { phase: 'active', postIntroDay: 0, graceRemainingMs: 0, softNarrowProgress: 0 };
  }

  // Интро никогда не запускалось (новый пользователь без онбординга)
  if (!introState.endsAt) {
    return { phase: 'freemium', postIntroDay: 0, graceRemainingMs: 0, softNarrowProgress: 0 };
  }

  const msSinceEnd = nowMs - introState.endsAt;
  const daysSinceEnd = msSinceEnd / (24 * 60 * 60 * 1000);

  // Grace Window: первые 24 часа после окончания интро
  const GRACE_WINDOW_MS = 24 * 60 * 60 * 1000;
  if (msSinceEnd < GRACE_WINDOW_MS) {
    return {
      phase: 'grace',
      postIntroDay: 0,
      graceRemainingMs: GRACE_WINDOW_MS - msSinceEnd,
      softNarrowProgress: 0,
    };
  }

  // Soft Narrowing: дни 1–7 после окончания grace (D+4 – D+11 от конца интро)
  const SOFT_NARROW_DAYS = 7;
  const daysSinceGrace = daysSinceEnd - 1; // -1 день grace
  if (daysSinceGrace < SOFT_NARROW_DAYS) {
    return {
      phase: 'soft_narrow',
      postIntroDay: Math.floor(daysSinceGrace) + 1,
      graceRemainingMs: 0,
      softNarrowProgress: daysSinceGrace / SOFT_NARROW_DAYS,
    };
  }

  // Freemium Baseline: D+8 и далее
  return {
    phase: 'freemium',
    postIntroDay: Math.floor(daysSinceGrace),
    graceRemainingMs: 0,
    softNarrowProgress: 1,
  };
}

// Интеграция в getEffectiveDailyQuizLimit
async function getEffectiveDailyQuizLimit(): Promise<number> {
  const isPremium = await getVerifiedPremiumStatus();
  if (isPremium) return Infinity;

  const phase = await getIntroPhase();
  switch (phase.phase) {
    case 'active': return Infinity;
    case 'grace': return 5;                  // +2 к базе
    case 'soft_narrow': return 3;            // базовый, но с чистым UX
    case 'freemium': return FREE_DAILY_QUIZ_LIMIT; // 3 — константа из quiz_daily_limit.ts
  }
}

// Интеграция в getFreeSessionsLeftToday
async function getEffectiveFreeTrainerSessions(): Promise<number> {
  const phase = await getIntroPhase();
  if (phase.phase === 'active' || phase.phase === 'grace') return 2;
  return 1; // soft_narrow и freemium
}
```

**Важно про кэш:** `getVerifiedPremiumAccessStatus()` в `premium_guard.ts` кэшируется на 5 минут (`CACHE_TTL_MS = 5 * 60 * 1000`, строка 9). `getIntroPhase()` нужно кэшировать аналогично — отдельным модулем `intro_phase_cache.ts`, чтобы не вызывать цепочку AsyncStorage-чтений при каждом рендере урока. После перехода из grace в soft_narrow кэш нужно инвалидировать.

---

### 4. Тексты пуш-уведомлений фазы B (персонализированные, русский язык)

Персонализация опирается на переменные, которые система уже собирает: серию дней (`streak`), количество пройденных уроков (из `countCompletedLessonsFromStorage()` в `notifications.ts:36`), количество выученных карточек. Уведомление отправляется в конце D+0 (начало grace), D+4 (первый B-нотиф, уже есть), D+7, дополнительно D+2.

**Вариант 1 (T=72h, начало grace, тёплое):**
Заголовок: `Твои 72 часа завершились — и это только начало 🎯`
Тело: `Ты прошёл {{M}} уроков и держишь серию {{N}} дней. Мы даём тебе ещё 24 часа полного доступа. Потом — выбор: Premium или стандартный режим.`

**Вариант 2 (T=96h, D+4 — начало soft narrow, мотивационный):**
Заголовок: `{{N}} дней серии — это уже характер 🔥`
Тело: `Ты выучил {{K}} карточек за первые дни. С Premium ни энергия, ни лимиты не остановят прогресс. Посмотри, что ты уже умеешь.`

**Вариант 3 (D+7, сравнительный):**
Заголовок: `Неделя прошла — ты всё ещё здесь 💪`
Тело: `Большинство уходит на D+3. Ты продолжаешь — серия {{N}} дней не врёт. Premium открывает всё: курсы, тренажёр без лимитов, арена.`

**Вариант 4 (D+5, триггер «прервал серию»):**
Заголовок: `Серия на паузе — но не потеряна ⚡`
Тело: `Вчера ты не заходил, но {{M}} уроков никуда не делись. Сегодня 3 квиза бесплатно — хватит, чтобы восстановить серию. А с Premium — без ограничений.`

**Технические требования к персонализации:** В `scheduleUpsellNotifications()` сейчас тексты статичны (строки 929–998). Динамическую вставку `{{N}}` и `{{M}}` добавить через `data`-поле нотификации и lazy-чтение при получении (`addNotificationReceivedListener`), либо вычислять значения в момент планирования. Альтернатива надёжнее — серверный триггер по расписанию через Cloud Messaging (`push_token_registration.ts`).

---

### 5. Дизайн внутриэкранного «таймера сужения» на home-экране

#### Состояние A (grace-фаза, `graceRemainingMs > 0`):

Баннер вверху под хедером (над `DailyPhraseCard`). Высота 56px. Содержимое:
- Слева: иконка часов в тематическом цвете (`gold`, если тема gold/compass).
- Центр: текст `«Расширенный доступ ещё X ч Y мин»`. Время из `graceRemainingMs`, обновляется раз в минуту.
- Справа: кнопка-пилюля «Стать Premium» → тап → `router.push('/premium_modal', { context: 'grace_countdown' })`.

Фон: мягкий amber-gradient `rgba(245,158,11,0.12)` → `rgba(245,158,11,0.04)`. В compass-теме — `COMPASS_RICH.charcoalRaised` с оранжевой рамкой. Кнопка не агрессивная — линейная рамка, не заливка.

#### Состояние B (soft_narrow, дни 1–3):

Высота 48px. Текст: `«Энергия: {{current}}/5 ⚡ · Квизы: {{left}}/3 сегодня»`. Информационный индикатор, не продающий. Тап → `router.push('/premium_modal', { context: 'soft_narrow_info' })`. Исчезает на D+4 soft_narrow.

#### Состояние C (soft_narrow D+4+ и freemium):

Баннер не показывается. Постоянный `PremiumCard` (`home.tsx:38`) работает как основной retention-элемент.

#### Поведение при тапе в grace-фазе:

Открывается paywall в контексте `'grace_countdown'`. В `premium_modal.tsx` нужна ветка с заголовком «Продолжи без перерывов» — аргумент: пользователь уже попробовал, он знает ценность.

#### Edge-case внутри компонента:

Если `getIntroPhase()` возвращает `phase: 'active'` или `endsAt` отсутствует — баннер не рендерится. Баннер монтируется после `useEffect` на `AppState.change`, чтобы обновлять фазу при форграунде.

---

### 6. Edge-cases и обработка

**EC-1: Не открывал приложение 5 дней после конца интро.** `getIntroPhase()` увидит `msSinceEnd = 5*24h` → `freemium` (grace и soft_narrow — real-time окна, не сохраняются в ожидании). Правило для retention: при первом открытии после 3+ дней отсутствия — показать `IntroPhaseCountdownBanner` в режиме «welcome back»: «Ты вернулся! Сегодня +2 бонусной энергии» + `addEnergy(2)`. Компенсирует потерянный grace.

**EC-2: Купил Premium в grace-фазе.** `markPremiumStoreSeenNow()` → `invalidatePremiumCache()` (`premium_guard.ts:38-40`). Следующий `getVerifiedPremiumAccessStatus()` вернёт `true` через RC-путь. `IntroPhaseCountdownBanner` должен реагировать на `hasPremiumAccess` и скрываться немедленно.

**EC-3: Купил в soft_narrow, потом отменил.** После отмены RC вернёт `rcActive = false`. Через 24ч (`RC_STALE_GRACE_MS`) доступ упадёт. Если отмена в течение 30 дней от `endsAt` — применить «реактивацию soft_narrow» ещё на 48ч. Защита от «пробных возвратов».

**EC-4: Сброс прогресса.** `resetIntroFullAccessForAdmin()` (`intro_full_access.ts:125`) очищает ключи. Анти-абьюз: записывать `intro_reset_count`; если `>= 2` — не запускать новое интро.

**EC-5: Смена часового пояса.** Метки в UTC ms — пояс не влияет. Единственная точка — `todayKey()` использует UTC-дату; минорный edge, обычно выгодный пользователю.

**EC-6: Переустановка.** AsyncStorage очищается на Android (не iOS Keychain). Анти-абьюз: счётчик переустановок интро хранить в Firestore (привязка к `auth.uid`).

**EC-7: Offline во время перехода фазы.** `getIntroPhase()` использует только `Date.now()` и AsyncStorage — переход корректен без сети. RC-недоступность защищена `RC_STALE_GRACE_MS`.

**EC-8: Перевод даты назад.** Добавить проверку `endsAt - startedAt === DURATION ± tolerance`; при несовпадении — игнорировать состояние, считать expired.

---

### 7. Метрики успеха и guardrail-метрики

**Primary:**
- **M1 Grace Conversion Rate (GCR):** `purchases_in_grace / users_opened_in_grace`. Цель: +15% к текущему D+4 CR.
- **M2 D7 Retention Post-Intro:** доля открывших на D+7 после конца интро (нужно событие `intro_ended`). Цель: +8%.
- **M3 Soft Narrow Quiz Completion:** доля юзеров в soft_narrow, тратящих все 3 квиза ≥3 из 7 дней. Снижение → лимиты слишком низкие.
- **M4 Grace Paywall Impression→Purchase:** CR `grace_countdown CTA → purchase`. Должен быть выше `no_energy`.

**Guardrail:**
- **G1 Support-тикеты «потерял доступ»:** не выше baseline +10%.
- **G2 App Store rating в когорте postintro:** не ниже average −0.1.
- **G3 Uninstall D+4–D+7:** не выше baseline +5% (главный guardrail).
- **G4 NoEnergyModal open rate в soft_narrow:** не выше 60% сессий.

---

### 8. Риски и митигация

- **Grace как вектор абьюза (high):** хранить `intro_started_count` в Firestore по `auth.uid`; при `>= 2` — без grace. Чек в Cloud Function.
- **Несинхронность кэша (medium):** ввести `IntroPhaseContext` (как `PremiumContext`), форс-refresh при форграунде; инвалидировать вместе с `invalidatePremiumCache()`.
- **A/B grace vs no-grace влияет на ranking (low):** тест на 20% базы, контроль = текущее поведение.
- **Персонализация пушей требует свежих данных (medium):** подстановка при доставке, либо серверный триггер.
- **Таймер воспринимается как угроза (low):** A/B тон («Расширенный доступ» / «Успей» / конкретная дата). Дефолт — нейтральный.

---

### 9. Пошаговый план внедрения

- **Этап 0 — аналитбаза (2 дня):** событие `intro_ended`; `intro_phase_entered`; dashboard baseline-когорт.
- **Этап 1 — ядро `getIntroPhase()` (2 дня):** `app/intro_phase.ts` + `IntroPhaseContext` + тесты edge-cases.
- **Этап 2 — grace-механика лимитов (3 дня):** `getEffectiveDailyQuizLimit`, `getEffectiveFreeTrainerSessions`, grace-bonus энергии + тесты.
- **Этап 3 — `IntroPhaseCountdownBanner` (2 дня):** компонент + интеграция в home.
- **Этап 4 — персонализированные пуши (2 дня):** рефакторинг `scheduleUpsellNotifications` + `grace_start` slot.
- **Этап 5 — anti-abuse (1 день):** Firestore-счётчик + проверка в `startIntroFullAccessAfterOnboarding`.
- **Этап 6 — A/B и измерение (3 дня + ongoing):** флаги в Remote Config, guardrail-алерты.

**Итого ~15 рабочих дней.** MVP (только grace без баннера и anti-abuse) — 6 дней.


---

## Глава 2. Victory-moments: перенос апселла с фрустрации на победу

### 2.1 Психологический фундамент: почему дофаминовый пик продаёт лучше ямы фрустрации

#### 2.1.1 Нейробиология момента победы

Когда пользователь завершает урок с высоким баллом или закрывает серию N дней подряд, его мозг выбрасывает дофамин — не как реакцию на награду, а как сигнал «это работает, продолжай». Дофаминовый пик предшествует осознанному решению на 200–500 мс. В этот момент человек нейрохимически открыт к новому обязательству.

Фрустрация, напротив, активирует другую цепочку: инсула (боль), миндалина (угроза), префронтальный кортекс ищет выход, а не возможность. Пользователь, у которого кончилась энергия или заблокирован следующий урок, думает «как отсюда выбраться», а не «как получить больше». Даже если он покупает — это покупка из капкана, а не из желания. Retention у таких конверсий статистически хуже: «пойманный» платящий пользователь отписывается на 30–40% чаще в первые 30 дней.

#### 2.1.2 Карта текущих гейтов: почти все — фрустрационные

Анализ `premium_modal.tsx` (типы контекста строки 119–148):

| Контекст | Тип триггера | Эмоциональный момент |
|---|---|---|
| `no_energy` | Фрустрация | Энергия кончилась |
| `course_after_lesson3` | Фрустрация (рассинхрон) | Хочет урок 9, видит замок |
| `quiz_limit` | Фрустрация | Дневной лимит исчерпан |
| `quiz_medium`, `quiz_hard` | Фрустрация | Хочет сложнее, не пускают |
| `flashcard_limit` | Фрустрация | Достиг лимита флешкарт |
| `trainer_limit` | Фрустрация | Лимит тренера |
| `streak` | Страх потери | Потеряет серию |
| `mastery` | Фрустрация/нейтр. | Хочет переповторить |
| `stats`/`heatmap`/`patterns`/`percentiles` | Любопытство | Нейтральный |
| `arena` | Желание | Победный/нейтр. |
| `intro_ended` | Loss-framing | 72ч триал истёк |
| `personal_plan` | Желание | Позитивный |

**Итог: 8 из 14 контекстов — явно фрустрационные/страховые. Victory-контекстов сейчас ноль.** Единственный позитивный фрейм — `intro_ended`, но реализован через loss-framing. Это грамотно для `intro_ended`, но не покрывает победные моменты в ходе обучения.

#### 2.1.3 Почему victory улучшает и конверсию, и LTV

Покупка на пике вовлечённости создаёт когнитивную согласованность — пользователь платит, потому что уже чувствует себя «человеком, который учится». Такой юзер: продолжает учиться после оплаты (нет диссонанса), чаще рекомендует, менее склонен к chargeback. Victory-момент снижает воспринимаемое давление: апселл читается как «поздравление с возможностью продолжить», а не «стена».

---

### 2.2 Четыре новых victory-триггера: архитектура и код

#### 2.2.1 Триггер A: Завершение урока 8 с высоким score (≥ 4.5/5)

**Контекст.** Урок 8 — последний бесплатный (`FREE_LESSON_LIMIT = 8`). Курс A1 заканчивается здесь. Идеальный момент: пользователь завершил весь бесплатный блок.

**Условие:** `lessonId === 8`, `lessonScore >= 4.5`, не Premium, не сработал в эту сессию (frequency cap).

**Точка встройки.** `lesson_complete.tsx`, после проверки `topicAllDone` (~строка 648):

```
if (lessonId === 8 && score >= 4.5) {
  const premium = await getVerifiedPremiumStatus().catch(() => false);
  if (!premium && await checkVictoryUpsellCap('lesson8_highscore')) {
    setTimeout(() => router.push({ pathname: '/premium_modal',
      params: { context: 'victory_lesson8', score: String(score) } }), 1500);
  }
}
```

Добавить контекст `victory_lesson8` в `PremiumContext`, `PREMIUM_CONTEXT_VALUES`, `PREMIUM_HERO_ART`, `CONTEXT_BENEFITS`.

**Копии:**
- (progress) «**Уровень A1 завершён — ты в топ 12% учеников.** Ты прошёл все 8 уроков базового английского. Большинство бросают на 3-м. Продолжи с Premium — A2 ждёт.»
- (momentum) «**5.0 за финальный урок начального уровня 🎉** Теперь реальный английский — A2–B2, Arena, личный тренер. Всё в Premium.»
- (identity) «**Ты уже не новичок.** 8 уроков пройдено. Базовый английский — за спиной. Пора дальше — на средний уровень.»

#### 2.2.2 Триггер B: «A1 Complete» (one-time achievement)

**Контекст.** Более торжественный, один раз в жизни: `topicAllDone === true && currentCefr === 'A1'` (`lesson_complete.tsx:629–648`). Сейчас код только выдаёт осколки.

**Точка встройки.** Сразу после `AsyncStorage.setItem(topicKey,'1')`:

```
const a1Key = 'victory_upsell_a1_complete_shown';
if (!(await AsyncStorage.getItem(a1Key)) && !premium) {
  await AsyncStorage.setItem(a1Key, '1');
  setTimeout(() => router.push({ pathname: '/premium_modal',
    params: { context: 'victory_a1_complete' } }), 2000);
}
```

**Копии:**
- «**🎓 A1 English — пройден полностью.** Все 8 уроков закрыты. Ты знаешь базу. Теперь — A2: рабочие ситуации, поездки, разговоры.»
- «**Поздравляем: базовый английский освоен.** Это занимает у большинства 2–3 недели. Premium даёт все 24 оставшихся урока, Арену и личный план.»

#### 2.2.3 Триггер C: Streak-milestone 7/14/30

**Контекст.** Достижения `streak_7/14/30` уже есть (`achievements.ts:1130,1135,1140`). Момент пиковой гордости.

**Точка встройки.** В `achievements.ts`, `case 'streak'`, после разблокировки:
```
if (s === 7 || s === 14 || s === 30) emitAppEvent('streak_milestone_victory', { days: s });
```
В `(tabs)/home.tsx` подписаться на событие, показать `premium_modal` с `context:'victory_streak'` с задержкой.

**Формат:** не полноэкранная модалка, а расширяемый toast-баннер (≈160dp) после тоста достижения. Свайп закрывает; тап → полная модалка.

**Копии (7 дней):** «7 дней подряд — это уже привычка. Premium поможет не сломать.» / «Ты в топ 8% по регулярности. Дай себе инструменты для роста.»
**(14):** «Две недели без перерыва. Время брать следующий уровень.»
**(30):** «Месяц в строю. Это уже характер. Premium — твой следующий шаг.»

#### 2.2.4 Триггер D: Идеальный квиз / личный рекорд

**Контекст.** `wasPerfect === true` (`lesson_complete.tsx:602`), `lessonId <= FREE_LESSON_LIMIT`, не Premium, `perfectCount % 2 === 0`, cap не истёк.

**Точка встройки.** В блоке `if (wasPerfect)` (~611):
```
if (wasPerfect && lessonId <= FREE_LESSON_LIMIT && !premium && !showReview
    && await checkVictoryUpsellCap('perfect_lesson')) {
  setTimeout(() => emitAppEvent('show_victory_upsell',
    { context: 'victory_perfect', lessonId }), 2500);
}
```

**Формат:** компактный inline-баннер снизу (≈140dp), bounce-появление, свайп вниз закрывает.

**Копии:** «Ни одной ошибки! 🎯 Ты готов к настоящему английскому. Открой A2–B2.» / «Perfect! Такой результат — в топ 5% учеников.»

---

### 2.3 Механика частотного кэпа

#### Проблема без кэпа

В один день возможны триггер A + D + C одновременно. Три апселла подряд = спам, разрушающий trust.

#### Структура хранения

```typescript
const SESSION_UPSELL_CAP_KEY = 'victory_upsell_session_cap';
const UPSELL_COOLDOWNS = {
  lesson8_highscore: 'victory_upsell_cooldown_lesson8',
  streak_7:  'victory_upsell_cooldown_streak7',
  streak_14: 'victory_upsell_cooldown_streak14',
  streak_30: 'victory_upsell_cooldown_streak30',
  perfect_lesson: 'victory_upsell_cooldown_perfect',
};
// запись: { shownAt: ISO-string, count: number }
```

#### Псевдокод `checkVictoryUpsellCap`

```typescript
async function checkVictoryUpsellCap(trigger, cooldownDays = 7): Promise<boolean> {
  try {
    // 1. session cap
    const sessionRaw = await AsyncStorage.getItem(SESSION_UPSELL_CAP_KEY);
    if (sessionRaw && JSON.parse(sessionRaw).sessionId === getAppSessionId()) return false;
    // 2. per-trigger cooldown
    const cdKey = UPSELL_COOLDOWNS[trigger];
    if (cdKey) {
      const cdRaw = await AsyncStorage.getItem(cdKey);
      if (cdRaw && differenceInDays(new Date(), parseISO(JSON.parse(cdRaw).shownAt)) < cooldownDays) return false;
    }
    // 3. регистрируем показ
    const now = new Date().toISOString();
    await AsyncStorage.setItem(SESSION_UPSELL_CAP_KEY, JSON.stringify({ sessionId: getAppSessionId(), shownAt: now }));
    if (cdKey) await AsyncStorage.setItem(cdKey, JSON.stringify({ shownAt: now, trigger }));
    return true;
  } catch { return false; }
}
```

**Cooldown по типу:** lesson8 — 14 дней; perfect — 3–7 дней; streak_7/14 — 30 дней; streak_30 — 60 дней; a1_complete — one-time (Infinity).

---

### 2.4 Исправление рассинхрона `course_after_lesson3` ↔ лимит 8

`lessonPaywallContext` возвращает `'course_after_lesson3'` для любого урока > 8 (`monetization_policy.ts:36–41`), хотя лимит = 8. Проблемы: семантика копий, искажение аналитики, невозможность разделить A/B.

**Варианты:**
- **В1 (мин. риск):** переименовать `'course_after_lesson3'` → `'course_after_free'` везде.
- **В2 (правильно для аналитики):** гранулярные контексты `course_after_free_a1` (урок 9), `course_mid_a2` (10–18), `course_b1` (19+).
- **В3 (быстрый патч):** только обновить тексты копий.

**Рекомендация:** В2 для новых контекстов + В1 для legacy, одновременно.

---

### 2.5 Дизайн celebration-экрана «A1 Complete»

Реализовать как отдельный роут `/celebration_a1` (проще тестировать).

**Зоны (сверху вниз):** 1) Hero (40%) — Lottie-медаль A1 с золотым свечением + конфетти 3с; 2) Заголовок «Уровень A1 завершён 🎓» (28pt bold) + «Все 8 уроков пройдены»; 3) Прогресс-бар «A1 ████ → A2» с анимацией заполнения; 4) Social proof «Только 23% доходят до этой точки» (реальная цифра); 5) Feature-блок (📚 A2–B2: ещё 24 урока / ⚔️ Arena / 🎯 Личный план); 6) CTA «Открыть Premium» (gradient #63E6BE→#FFD86B) + вторичная ссылка «Посмотреть позже»; 7) Footer Terms.

**Анимации:** вход scale 0.85→1.0 + opacity (350ms spring tension 60 friction 8); медаль — пульс loop 1200ms; конфетти 30–50 частиц; прогресс-бар 0→100% за 800ms; feature-пункты последовательный fade-in 600/800/1000ms.

---

### 2.6 Edge-cases

1. **Уже Premium** — первая проверка `getVerifiedPremiumStatus()`; вместо апселла можно показать celebration-тост без CTA.
2. **Закрыл без покупки** — cooldown фиксируется при показе; session cap защитит от второго типа в той же сессии.
3. **Несколько побед в сессию** — session cap показывает только первый. Приоритет: `a1_complete > streak_milestone > lesson8_highscore > perfect_lesson`.
4. **Урок 8: низкий→высокий score при переигре** — триггер по первому достижению ≥4.5 (через cooldown-ключ).
5. **Achievement-тост + streak-баннер** — баннер с задержкой 3000ms (тост ~2500ms уходит).
6. **Переустановка** — ключи сброшены, апселл может повториться; приемлемо.
7. **Медленный async** — try-catch + `return false`, показ через `setTimeout`.
8. **Offline** — `getVerifiedPremiumStatus().catch(() => false)` (паттерн `lesson_complete.tsx:831`); допустимый риск.

---

### 2.7 Метрики

- **CR victory vs frustration** по полю `context`: `purchase / paywall_view` per context. Ожидание: victory в 1.5–3× выше фрустрационных.
- **CTR баннеров:** `victory_banner_tapped / victory_banner_shown` (новые события). Ожидание: streak 15–30%, perfect 20–35%, A1 25–45%.
- **Влияние кэпа на отток:** A/B группы A (без), B (без кэпа), C (с кэпом). KPI: D7/D30 retention. Гипотеза: B хуже C из-за спама; C без деградации vs A + прирост revenue.
- **Атрибуция:** добавить в `paywallSourceForContext` тег `'organic_victory'`.

---

### 2.8 Риски

- **Спам-восприятие:** cooldown perfect → 7 дней; при 3+ закрытиях заморозить тип на 30 дней.
- **Прерывание потока:** апселл всегда ПОВЕРХ экрана/как баннер, кнопка «продолжить» доступна, задержка 1.5–2.5с.
- **Ложно-позитивы в dev:** обернуть в `IS_STORE_RELEASE`/`DEV_MODE` (паттерн `achievements.ts:10`).
- **Несоответствие ожиданий:** в feature-блоке конкретно называть уроки A2.
- **Конфликт с `intro_ended`:** `intro_ended` имеет приоритет; victory не показывается при pending `intro_ended`.

---

### 2.9 Пошаговый план

| Шаг | Задача | Дни |
|---|---|---|
| 1 | Типы `VictoryUpsellContext`, расширить `PremiumContext` | 0.5 |
| 2 | `victory_upsell_cap.ts` + тесты | 1 |
| 3 | Копии + `PREMIUM_HERO_ART` записи | 1 |
| 4 | Триггер B (A1 Complete) — самый ценный | 1 |
| 5 | Триггер A (урок 8) | 0.5 |
| 6 | Celebration-экран (Lottie) | 3 |
| 7 | Триггер C (streak) через events | 1 |
| 8 | Триггер D (perfect) — inline баннер | 1.5 |
| 9 | Рассинхрон `course_after_lesson3` | 0.5 |
| 10 | QA edge-cases | 2 |
| 11 | Analytics `victory_banner_*` | 0.5 |
| 12 | A/B setup (A/B/C группы) | 1 |
| 13 | Мягкий запуск 10%, мониторинг | 7 |
| 14 | Анализ + корректировка | 2 |
| 15 | Полный роллаут | 1 |

**Итого ~23 дня** (с мониторингом). Без celebration-экрана — 18 дней.


---

## Глава 3. Социальное доказательство, savings-бейдж и порядок элементов в live-пейволе: разрыв между v1 и v2 и план приведения к единому стандарту

### 3.1. Что отсутствует в v1 и что захардкожено в v2

#### 3.1.1. Диагностика v1 — `app/premium_modal.tsx`

`premium_modal.tsx` — живой пейвол, который видит ~половина аудитории (50/50 A/B по строкам 1617–1622). При объёме >4300 строк в нём отсутствуют критические конверсионные элементы.

**Нет отдельного блока социального доказательства.** Единственное упоминание рейтинга — внутри hero-карточки (~строки 3828–3837): `★★★★★` + `«4.8 · 10 000+ оценок»` мелким текстом, встроенным в hero. Пользователь, быстро прокручивающий пейвол, его не замечает. Рядом нет ни одного отзыва, ни счётчика учеников.

**Savings-бейдж слабый.** `savingsPct` рассчитывается корректно (строки 1960–1966), но отображается только как маленький inline-chip рядом с лейблом «Годовая подписка» (строки 4057–4060), не выделен цветом `tc.savingsBadgeBg`, в состоянии триала «тонет» рядом со словом «Бесплатно».

**Текущий порядок секций v1:** Trial ribbon → персонализированные теги → Hero-карточка → Бенефиты → «Для тебя сейчас» → Comparison-таблица → Планы → CTA → микрокопи/футер. Социальное доказательство как самостоятельная секция отсутствует. Порядок **Бенефиты → Планы** перевёрнут относительно validated layout: юзер видит «что входит» раньше, чем цену и экономию — это снижает якорный эффект savings-бейджа.

#### 3.1.2. Диагностика v2 — `app/premium_modal_v2.tsx`

v2 реализует validated layout и содержит social proof первым после заголовка. Но все три цифры захардкожены (строки 311–317): `4.9`, `47 000+ учеников`, отзыв «За месяц поняла первый сериал без субтитров».

**Три риска хардкода:**
- **R1 Расхождение с реальностью.** Рейтинг 4.9 не синхронизирован со сторами. Приложение с реальным 4.7, показывающее 4.9 — юридически рискованно (ФЗ «О рекламе», DSA, FTC). Скриншот легко сравнить с App Store.
- **R2 Нарушение стор-гайдлайнов.** App Store 4.3 / 2.3.7, Google Play Misrepresentation требуют верифицируемых утверждений.
- **R3 Операционный.** Обновление цифры требует релиза (1–7 дней). Падение рейтинга ниже 4.5 делает 4.9 ложью.

Отзыв также захардкожен, не ротируется, не сегментирован по контексту, имя не верифицировано.

---

### 3.2. Принцип «только реальные данные»

#### Источники

- **Рейтинг/оценки:** Apple — iTunes Lookup API (`averageUserRating`, `userRatingCount`) / App Store Connect API; Google Play — Play Developer API. Прямой вызов из клиента нестабилен (CORS, rate-limit). Правильно: Cloud Function раз в 12–24ч опрашивает оба стора, усредняет, пишет в Remote Config / Firestore `app_meta/ratings`.
- **Число учеников:** реальное из Firebase Analytics (BigQuery) / Firestore-счётчик; round-down (`Math.floor(total/1000)*1000`).
- **Отзывы:** App Store Connect `customerReviews?filter[rating]=5&sort=-createdDate`; отбор 80–200 символов, русскоязычные для СНГ; массив в Remote Config (JSON).

#### Схема Remote Config

```
paywall_rating_combined     → "4.8"
paywall_users_count_k       → 47           (тысяч; "47 000+")
paywall_testimonials_ru     → JSON-array
paywall_social_proof_enabled → true/false  (kill-switch)
ab_paywall_split            → 50           (доля v2 %)
```

Клиент — один вызов `fetchAndActivate()` при инициализации; дефолтные значения если fetch не прошёл.

#### Если рейтинг ниже 4.5

Ниже 4.5 рейтинг работает против конверсии. Стратегии: скрыть рейтинг (оставить число учеников); заменить на NPS («9 из 10 учеников стали лучше понимать речь» — если подтверждено опросом); убрать блок (kill-switch). Правило: рейтинг < 4.5 → Cloud Function автоматически ставит `paywall_social_proof_enabled = false`.

---

### 3.3. Savings-бейдж: перенос из v2 в v1

Расчёт `savingsPct` (v2 строки 192–197) — `Math.round((1 - yearlyPricePerMonth/monthlyPricePerMonth) * 100)`, данные из RevenueCat, без хардкода. В v1 (1960–1966) почти идентичен.

**Правило размещения:** на карточке годового плана, правый верхний угол, высококонтрастный фон (`tc.savingsBadgeBg/Text` из `paywallThemeConfig.ts`). Виден ДО цены — формирует якорь «я экономлю».

```typescript
{savingsPct !== null && (
  <View style={{ position:'absolute', top:-1, right:-1,
    backgroundColor: tc.savingsBadgeBg, borderTopRightRadius: compassRadius,
    borderBottomLeftRadius: 8, paddingHorizontal:8, paddingVertical:3, zIndex:1 }}>
    <Text style={{ color: tc.savingsBadgeText, fontSize:f.label, fontWeight:'900' }}>
      {`−${savingsPct}%`}
    </Text>
  </View>
)}
```

`tc` уже в scope v1 (используется для urgency-цветов); нужно добавить `getPaywallThemeConfig(themeMode)`.

---

### 3.4. Validated layout order

**Эталон:** `Headline → Social proof → Urgency → Plans → Benefits → CTA → Microcopy`.

| Позиция | Эталон | v1 сейчас | Проблема |
|---|---|---|---|
| 1 | Headline | Trial ribbon + теги | Нет identity-заголовка до планов |
| 2 | Social proof | внутри hero | не самостоятельно |
| 3 | Urgency | — | нет отдельной секции |
| 4 | Plans | позиция 7 из 9 | слишком низко |
| 5 | Benefits | позиция 4 | до цены, якорь не работает |
| 6 | CTA | позиция 8 | до него слишком много |
| 7 | Microcopy | есть | ок |

**Что переставить:** (1) добавить standalone social proof после trial ribbon; (2) добавить urgency-секцию (блок из v2 320–334 + state `urgency`/`timerDisplay`); (3) переместить блок «Планы» (4010–4230) выше «Что ты получишь» (3846–3882); (4) бенефиты/comparison — после планов; (5) hero-карточка → identity-headline на позицию 1, звёзды вынести в отдельный social proof.

Все перестановки — строго через feature flag (`paywall_layout_v1b`), не меняя дефолт.

---

### 3.5. Реалистичные отзывы и identity-заголовки

#### Четыре отзыва (шаблоны; в проде — реальные из API)

1. «Через три месяца поняла первый эпизод сериала почти без субтитров. Слышу знакомые слова и понимаю сюжет — это что-то новое.» — Анастасия, Казань
2. «До этого бросал каждые две недели. Здесь уже 47 дней подряд — цепочка реально мотивирует. Дико жалко терять.» — Максим, Алматы
3. «Готовился к собеседованию. Прошёл B1 за два месяца, взяли. Тренер слабых мест — лучшая фича.» — Дмитрий, Минск
4. «В аэропорту первый раз спросила дорогу и поняла ответ. Занимаюсь три месяца по 15 минут в день.» — Юлия, Харьков

#### Identity-framing заголовки

- **A (generic):** «Говори.\nНе переводи в голове.»
- **B (no_energy/streak):** «Ты из тех, кто доходит до конца.\nPremium — для таких.»
- **C (course_after_free):** «Три урока — и ты уже чувствуешь разницу.\nТеперь не останавливайся.»

---

### 3.6. A/B-инфраструктура

#### Проблема `Math.random()`

Строки 1617–1622 используют `Math.random()`, хотя комментарий обещает «детерминированно по userId-hash». Вариант не связан с userId (теряется при переустановке), нет способа менять split без релиза.

#### Детерминированный хеш

```typescript
function djb2Hash(str: string): number {
  let h = 5381;
  for (let i=0;i<str.length;i++){ h=((h<<5)+h)^str.charCodeAt(i); h=h>>>0; }
  return h;
}
export function getPaywallVariant(userId: string, splitPct: number): 'v1'|'v2' {
  return (djb2Hash(userId+':paywall_v1v2') % 100) < splitPct ? 'v2' : 'v1';
}
```

`splitPct` из Remote Config `ab_paywall_split` (default 50). Кеш в AsyncStorage `paywall_variant_v2`. Если userId ещё нет — дефолт v1.

#### План эксперимента: v1 vs v1-с-техниками-v2

Правильный тест — не «v1 vs отдельный файл v2», а «v1 без техник vs v1 с добавленными social proof + savings + reorder». Это атрибутирует эффект конкретным изменениям.

- **Гипотеза:** +social proof +savings-бейдж → CVP +≥15%, доля annual +≥20 п.п.
- **Запуск:** ≥1000 уникальных открытий на вариант.
- **Завершение:** 95% significance (p<0.05) по CVP или 14 дней.
- **Удаление проигравшего:** если контроль проигрывает p<0.05 — удалить. После завершения всех экспериментов `premium_modal_v2.tsx` либо становится единственным (переименование), либо удаляется.

---

### 3.7. Чек-лист комплаенса для social proof

**App Store:** рейтинг на экране ≤ фактический ±0.1 (округление вниз); число пользователей подтверждено аналитикой; отзывы реальные/верифицированные; имена обезличены/из публичных отзывов; Restore виден; цена явна до CTA (3.1.2). **Google Play:** «−N%» из реальных тарифов (✓ `savingsPct`); рейтинг не противоречит фактическому; testimonials реальные. **Правило:** только данные из Remote Config с верифицированными API-значениями → риск близок к нулю.

---

### 3.8. Метрики

**Воронка с `variant`:** `paywall_shown → plan_select → cta_click → purchase_started → purchase_completed`.

| Метрика | Target | Измерение |
|---|---|---|
| CVP | +15% | purchase_completed / paywall_shown |
| Annual share | +20 п.п. | yearly / total purchases |
| CTA tap rate | +10% | cta_click / paywall_shown |
| Time on paywall | +20% | custom timer |
| Bounce rate | −10% | close-without-CTA / shown |

Savings-бейдж + перемещение планов выше: ожидаемый сдвиг доли годового +15–25 п.п. (медиана отраслевых данных ~18%).

---

### 3.9. Риски и план

**Риски:** R1 регрессия v1 при перестановке (high) → feature flag; R2 хардкод попадёт в релиз (high) → тип `SocialProofData.source`, ESLint-правило против `'hardcoded'` в прод-билде; R3 Remote Config fetch failure (medium) → defaultConfig; R4 хеш ломает A/B при смене userId (low) → кешировать вариант.

**План:**
- **Фаза 1 — Remote Config инфра (3–4 дня):** Cloud Function `updatePaywallSocialProof`, ключи, хук `usePaywallSocialProof()`, тесты.
- **Фаза 2 — детерм. A/B (1–2 дня):** `getPaywallVariant`, `ab_paywall_split`, `variant` во все events.
- **Фаза 3 — social proof блок в v1 (2–3 дня):** standalone блок (только при `enabled`), urgency-блок.
- **Фаза 4 — savings-бейдж + layout (2–3 дня):** corner-badge, `getPaywallThemeConfig` в v1, feature flag reorder.
- **Фаза 5 — запуск (ongoing):** 10% → 50% → оценка по метрикам 21–28 дней.
- **Фаза 6 — консолидация (2–3 дня):** удалить проигравший / откатить.

**Итого 13–18 дней.** Критический путь — Фаза 1.


---

## Глава 4. Лимиты тренажёра / smart / diagnosis: лестница ценности вместо хард-волла + энергетическая экономика

### 4.1 Принцип «нельзя продать неиспытанную ценность»

Фундаментальная ошибка монетизации — пейвол раньше, чем пользователь получил реальный опыт от фичи. Когда человек ещё не понимает, что покупает, конверсия предсказуемо низка: нет эмоционального «долга» перед продуктом.

**Обычный тренажёр** (`trainer_session.ts:56–62`) — единственный честный FREE-слот: `getFreeSessionsLeftToday → Math.max(0, 1 - data.count)`, FREE = 1 сессия/день. Для основного тренажёра адекватно.

**Smart-тренажёр** (`trainer_smart_session.tsx:522–529`) — сразу пейвол, 0 демо:
```typescript
const premiumAllowed = await getVerifiedPremiumStatus();
if (!premiumAllowed) {
  router.replace({ pathname: '/premium_modal', params: { context: 'smart_trainer' } });
  return;
}
```
Пользователь нажимает «Умный тренажёр» → пустой экран → выброс на подписку. Он не знает, что внутри. Худший сценарий конверсии.

**Coach / Diagnosis** (`problem_coach.tsx:84–89`) — чуть лучше: `reserveFreeDiagnosisTraining` (`diagnosis_training_progress.ts:137–152`) допускает одну бесплатную сессию на `id`, но только если `completedAt` не выставлен. На практике — **одна диагностика за всё время**, не еженедельно. После завершения доступ закрывается навсегда; «возвращенец» через месяц получает пейвол с порога.

**Итог:** обе premium-фичи применяют «нулевое демо». Демо-сессия, доведённая до конца, конвертирует в 3–5 раз лучше экрана подписки без опыта. Человек должен сначала почувствовать «о, это помогает», потом увидеть предложение.

---

### 4.2 Лестница ценности: демо → soft limit → premium

```
FREE-демо (испытать) → Soft-лимит (захотеть ещё) → Premium-CTA (решиться)
```

**Smart-тренажёр.** Константы (новый файл `trainer_smart_access.ts`):
```
FREE_SMART_DEMO_PER_WEEK = 1
FREE_SMART_DEMO_STORAGE_KEY = 'trainer_smart_free_v1'
```
Запись: `{ weekKey: string; count: number }`.

```typescript
function weekKey(): string {
  const d = new Date();
  const jan4 = new Date(d.getFullYear(), 0, 4);
  const week = Math.ceil(((d.getTime()-jan4.getTime())/86400000 + jan4.getDay()+1)/7);
  return `${d.getFullYear()}-W${String(week).padStart(2,'0')}`;
}
async function getSmartDemoLeft(): Promise<number> {
  const raw = await AsyncStorage.getItem(FREE_SMART_DEMO_STORAGE_KEY);
  if (!raw) return FREE_SMART_DEMO_PER_WEEK;
  const data = JSON.parse(raw);
  if (data.weekKey !== weekKey()) return FREE_SMART_DEMO_PER_WEEK;
  return Math.max(0, FREE_SMART_DEMO_PER_WEEK - data.count);
}
```

Встройка в `trainer_smart_session.tsx:522`:
```typescript
if (!premiumAllowed) {
  if (await getSmartDemoLeft() <= 0) {
    router.replace({ pathname:'/premium_modal', params:{ context:'smart_trainer_after_demo' }});
    return;
  }
  onSessionComplete = () => consumeSmartDemo(); // квота сгорает при ЗАВЕРШЕНИИ, не входе
}
```

**Coach / Diagnosis.** Заменить «одна навсегда» на еженедельный счётчик:
```
FREE_DIAGNOSIS_DEMO_PER_WEEK = 1
```
Добавить в state поля `lastFreeWeekKey`, `freeSessionsThisWeek`; в `reserveFreeDiagnosisTraining` проверять неделю, а не глобальный `completedAt`. «Возвращенец» через месяц всегда имеет демо на текущей неделе.

---

### 4.3 Тренажёр: 1→2–3 сессий/день, SRS и привычка

`trainer_session.ts:62` — хардкод `1`. Вынести:
```typescript
export const FREE_TRAINER_SESSIONS_PER_DAY = 1; // A/B: 2 или 3
return Math.max(0, FREE_TRAINER_SESSIONS_PER_DAY - data.count);
```
Аналогично `hasUsedFreeSessionToday` (`:37`).

**A/B (1 vs 2 vs 3):** флаг из Remote Config. Группа A (1) — макс. конверсия через неудовлетворённость (риск раннего оттока); B (2) — компромисс (разогрев + поток); C (3) — высокая ретенция, медленная конверсия.

**Влияние на SRS:** больше итераций → плотнее сигнал для очереди ошибок → точнее настройка на слабые места. Кривая Эббингауза: 2 сессии/день дают «вечернюю консолидацию». 3/день рискуют fatigue. Оптимум: 2 свободно + 3-я за рекламу.

**Привычка (модель Фогга):** двукратное суточное касание (утро+вечер) сильнее коррелирует с D30. Пользователи с 2+ занятиями в первую неделю имеют D30 на ~40% выше.

---

### 4.4 Лестница в NoEnergyModal: три опции

Сейчас (`NoEnergyModal.tsx:452–492`) — только Premium + «Понятно». Осколочный рефилл (`energy_shard_refill.ts`) реализован, но не вызывается из модалки. Рекламы нет. Это деньги на полу.

```
┌─────────────────────────────────┐
│  ⚡ Энергия закончилась          │
│  +1 вернётся через 8м 30с        │
│  [Смотреть рекламу +1 ⚡]        │ ← Rewarded Ad
│  [Потратить 5 💎 → +5 ⚡]        │ ← Осколки
│  [⚡ Безлимит с Premium →]       │ ← Premium CTA
│    Подождать                     │
└─────────────────────────────────┘
```

**Тексты:** «Смотреть рекламу — получить +1 ⚡» / «Потратить 5 💎 — зарядить полностью» (цена = `energyRefillShardCost(maxEnergy)`) / «Безлимитная энергия — попробовать Premium» / dismiss «Подождать». Под кнопкой осколков: «У тебя: {balance} 💎»; при нехватке — заблёкшая «Нет осколков — заработай в уроке».

**Осколочный рефилл:** `refillEnergyWithShards({maxEnergy, baseEnergy, isUnlimited})` уже готов. Добавить хук баланса + обработчик; при `insufficient_shards` — мини-тост.

**Rewarded Ad:** создать `app/rewarded_ad.ts` (обёртка AdMob Rewarded). Кнопка только если `isRewardedAdAvailable`. При просмотре — `addEnergy(REWARDED_AD_ENERGY_GRANT)` (`energy_system.ts:134`).

**Приоритет опций:** реклама (меньше трения) → осколки → Premium (основной CTA).

---

### 4.5 Энергетическая экономика

Параметры: `MAX_ENERGY = 5`, `ENERGY_RECOVERY_INTERVAL_MS = 10мин`, полный цикл 0→5 = 50 минут.

- **Rewarded Ad:** `REWARDED_AD_ENERGY_GRANT = 1`. Больше 1 = «рекламный паразитизм» (5 роликов = обход системы). 30с ролик ≈ 10 минут ожидания — эквивалентность разумна.
- **Лимит рекламы:** `REWARDED_AD_MAX_PER_DAY = 3`. Итого free-юзер/день: 5 ⚡ пассивно + 3 за рекламу = 8 сессий. Premium — безлимит, GAP ощутим.
- **Осколки за рефилл:** `energyRefillShardCost = maxEnergy = 5`. Источники (`shards_system.ts`): урок +1, идеальный +2, дневные задания +1, арена +1. ~3–5 уроков на рефилл — здоровое соотношение.
- **Защита от каннибализации:** даже при 3 рекламах + рефилл юзер всё равно сталкивается с трением (прерваться, смотреть ролик, иметь осколки). Premium убирает всё одним платежом. Value proposition: не «нельзя без Premium», а «с Premium удобнее».

---

### 4.6 Осколки vs подписка: инвариант

`shards_system.ts:14–28` — `ShardSpendReason` делятся на расходники (`buy_energy`, `streak_freeze/revive`, `arena_plays_refill`, `daily_task_reroll`) и косметику (`custom_avatar`, `avatar_aura`, ...). Ни одна не открывает функционал, эквивалентный Premium (безлимит энергии, smart, diagnosis). Инвариант сохраняется.

**Правило для code review:** при добавлении новой `ShardSpendReason` проверить — «Даёт ли это доступ к premium-заблокированному функционалу?» Если да — Premium-функционал остаётся за Premium, за осколки только временный/ограниченный доступ (одна smart-сессия, не безлимит).

---

### 4.7 Косметика: не первичный гейт, а up-sell

Косметика должна быть наградой, а не блокировкой. Базовые темы — бесплатно. Премиальные аватары/ауры: открываются с подпиской (часть value); покупаются за осколки для non-premium; **никогда** не основной аргумент пейвола.

На `premium_modal` в «Что вы получаете» — информационный блок «Все эксклюзивные аватары и ауры» (бонус, не главное обещание). Главное обещание: «Учи без лимитов, умный тренажёр, диагностика — безлимитно». В галерее аватаров locked-контент → CTA «Разблокировать Premium» / «Купить за N 💎».

---

### 4.8 Граничные случаи

1. **Демо smart исчерпано, вернулся через месяц** — по `weekKey` получает новое демо. Намеренно. Риск: давний юзер бесконечно получает 1/неделю — приемлемо.
2. **Вышел из smart на полпути** — `consumeSmartDemo()` в `onSessionComplete`, не в `loadSession`. Иначе квота сгорает при «понял, не то».
3. **Реклама недоступна (offline/нет инвентаря)** — кнопку скрыть без сообщений. Остаются осколки + Premium.
4. **Осколков не хватает (<5)** — заблёкшая кнопка с субтекстом «нужно ещё N»; тап → магазин осколков (push, не replace).
5. **Premium активировался при открытой модалке** — `usePremium()` реактивен; `shouldRenderNoEnergyModal` проверяет `hasPremiumAccess`; модалка скроется.
6. **Diagnosis: вторая на той же неделе** — экран «Бесплатная диагностика уже использована. Следующая — {дата}» + Premium CTA, не пустой экран.
7. **Достигнут лимит 3 рекламы/день** — кнопку скрыть (не заблёкшую); место занимает подробный таймер восстановления.
8. **Быстрые повторные тапы рекламы** — `lastAdWatchedAt` + 60с anti-spam guard (поверх AdMob cooldown).

---

### 4.9 Метрики

**Retention:** D1 +5–8 п.п.; D7 +15–20% (попробовавшие smart в первые 3 дня); D30 цель 12–18%.
**Конверсия:** `smart_demo_to_premium_cvr` (baseline 1.5–2% → 4–6% после демо); `diagnosis_demo_to_premium_cvr` (5–8%, высокоэмоц. момент); `rewarded_ad_segment_delayed_cvr` (30-дн.).
**Экономика:** `avg_rewarded_ads_per_dau` (цель 0.8–1.5; >2 — слишком «рекламно»); `shard_energy_refill_rate` (8–12%); `no_energy_modal_premium_cvr` (baseline ~3–4% → 4.5–6%).

---

### 4.10 Риски и план

**Риски:** демо каннибализирует подписку (низк., 1/нед = ~5% месячного Premium, A/B до масштаба); реклама снижает воспринимаемое качество (средн., только в NoEnergyModal, качественный инвентарь); бесконечные рефиллы за осколки (расчёт: макс ~8 ⚡/день < Premium, митигация не нужна).

| Фаза | Задача | Дни |
|---|---|---|
| 1 | Константа `FREE_TRAINER_SESSIONS_PER_DAY` + тесты | 0.5 |
| 2 | `trainer_smart_access.ts` (weekKey/demo) + тесты | 1 |
| 3 | Diagnosis-демо еженедельно + миграция | 1 |
| 4 | Осколки в NoEnergyModal | 1.5 |
| 5 | `rewarded_ad.ts` (AdMob) + дневной лимит | 2 |
| 6 | Тексты/UX, edge-cases | 1 |
| 7 | A/B Remote Config (1/2/3) на 10% | 1.5 |
| 8 | Аналитика событий | 1 |
| 9 | QA + admin preview | 0.5 |
| 10 | Rollout 20%→50%→100% + мониторинг | 3 |

**Итого ~10 рабочих дней.** Фазы 2/3/4 параллельны. Блокер Rewarded Ad — регистрация Ad Unit ID в AdMob + ревью Google (3–5 дней, параллельно).


---

## Глава 5. Метрики, гипотезы и приоритизация

### 5.1. Базовая воронка (теперь измеримая благодаря разделу 0, #5)

```
app_open
  → onboarding_step_view (по шагам)
    → onboarding_complete
      → intro_full_access_started
        → intro_welcome_shown / cta
          → [72ч использования]
            → intro_ended_shown
              → intro_ended_cta / dismiss
                → paywall_shown (context, paywall=v1|v2)
                  → paywall_plan_select
                    → paywall_cta_click
                      → purchase_started
                        → purchase_completed / failed / cancelled
                          → trial_started (если триал)
```

Каждое ребро = измеримый drop-off. До этой сессии видимы были только `paywall_shown` и `purchase` — теперь вся цепочка.

### 5.2. Ключевые продуктовые гипотезы (для A/B)

| ID | Гипотеза | Метрика-цель |
|---|---|---|
| H1 | Триал на всех контекстах (#1) повысит конверсию пейвола | CR `paywall_shown → trial_started` |
| H2 | Постепенная деградация после intro снизит отток (глава 1) | 7-day churn после intro |
| H3 | Victory-апселлы конвертируют лучше frustration-гейтов (глава 2) | CR по `context` |
| H4 | Соц-доказательство + savings-бейдж повысят выбор годового (глава 3) | доля yearly в `paywall_plan_select` |
| H5 | Демо smart/diagnosis резко поднимет конверсию этих контекстов (глава 4) | CR `paywall_shown(smart) → purchase` |
| H6 | Тренажёр 2–3/день повысит D7 и отложенную конверсию (глава 4) | D7 retention, D14 purchase |
| H7 | Лестница (ad→осколки→Premium) в NoEnergy удержит не-платящих (глава 4) | retention сегмента no_energy |

### 5.3. Статистическая дисциплина

- Не принимать решение до достижения значимости (минимальный размер выборки рассчитать заранее под ожидаемый эффект; для базовой CR ~2–5% и MDE 20% относительного — нужны тысячи на вариант).
- Один первичный KPI на эксперимент, остальное — guardrail-метрики (отток, ARPU, рейтинг).
- Когорты по дате установки, чтобы не смешивать сезонность.

### 5.4. Приоритизация (ICE: Impact × Confidence / Effort, 1–10)

| Инициатива | Impact | Confidence | Effort | ICE |
|---|---|---|---|---|
| #1 Триал везде (сделано) | 9 | 8 | 1 | 72.0 |
| #5 Аналитика воронки (сделано) | 8 | 9 | 3 | 24.0 |
| #3 Онбординг цены/триал (сделано) | 7 | 9 | 2 | 31.5 |
| #4 intro_ended контекст (сделано) | 6 | 8 | 1 | 48.0 |
| Тренажёр 2–3/день (глава 4) | 5 | 6 | 1 | 30.0 |
| Демо smart/diagnosis (глава 4) | 8 | 7 | 3 | 18.7 |
| Savings-бейдж в v1 (глава 3) | 6 | 8 | 2 | 24.0 |
| Соц-доказательство v1 (глава 3) | 7 | 6 | 4 | 10.5 |
| Постепенная деградация intro (глава 1) | 8 | 6 | 6 | 8.0 |
| Victory-апселлы (глава 2) | 7 | 6 | 5 | 8.4 |
| Remote Config + детерм. A/B (глава 3) | 6 | 7 | 5 | 8.4 |
| Rewarded-ad лестница (глава 4) | 6 | 5 | 6 | 5.0 |

(Сделанное оставлено в таблице для полноты картины приоритетов.)

---

## Глава 6. Технические заметки, дорожная карта, приложения

### 6.1. PostHog — что осталось сделать команде

`app/posthog_client.ts` готов и no-op без ключа. Для активации:
1. `npm i posthog-react-native`
2. В `.env` / `eas.json`: `EXPO_PUBLIC_POSTHOG_KEY=phc_...`, опц. `EXPO_PUBLIC_POSTHOG_HOST` (по умолчанию EU).
3. Пересобрать dev-client / прод-билд (нативная зависимость).
4. (Опц.) вызвать `identifyPostHog(canonicalUserId)` при логине и `resetPostHog()` при разлогине — точки в `app/auth_provider.ts`.

До этого вся аналитика всё равно идёт в Firebase (фасад `analytics.ts`).

### 6.2. Remote Config (для глав 1, 3, 4)

Сейчас в проекте нет Firebase Remote Config (`grep remoteConfig` = 0). Для управления долей A/B, числом учеников, рейтингом, фазами деградации, лимитами тренажёра — подключить `@react-native-firebase/remote-config`. Это разблокирует изменение конфигурации без релиза — критично для скорости итераций.

### 6.3. Webhook RevenueCat → аналитика

`functions/src/revenuecat_shards.ts` обрабатывает события подписок серверно, но не шлёт их в аналитику. Добавить отправку `purchase_verified` / `renewal` / `cancellation` / `refund` в продуктовую аналитику с серверной стороны — это замкнёт воронку на достоверные события стора (клиентский `purchase_completed` может теряться при крэше).

### 6.4. Ключевые файлы по главам

| Глава | Файлы |
|---|---|
| 1 Тайминг | `app/intro_full_access.ts`, `app/premium_guard.ts`, `app/energy_system.ts`, `app/quiz_daily_limit.ts`, `app/trainer_session.ts` |
| 2 Victory | `app/lesson_complete.tsx`, `app/(tabs)/home.tsx`, `app/streak_stats.tsx`, `app/monetization_policy.ts`, `app/achievements.ts` |
| 3 Соц-доказательство | `app/premium_modal.tsx`, `app/premium_modal_v2.tsx`, `components/paywallThemeConfig.ts` |
| 4 Лимиты | `app/trainer_session.ts`, `app/trainer_smart_session.tsx`, `app/problem_coach.tsx`, `components/NoEnergyModal.tsx`, `app/energy_shard_refill.ts`, `app/shards_system.ts` |

### 6.5. Тестирование

- Все временны́е функции (фазы intro, кулдауны) — чистые, принимают `now` параметром, покрыть юнит-тестами (паттерн уже есть: `tests/intro_full_access.test.ts`, `tests/monetization_policy.test.ts`).
- Контрактные тесты пейвола (как `tests/intro_full_access_modal_contract.test.ts`) — обновлять при смене копий (есть один уже-устаревший тест: ожидает «Оставить полный доступ», в коде «Открыть полный доступ»).
- Платёжные пути — ручное QA в sandbox обоих сторов + Maestro-сценарии (каталог `maestro/`).

### 6.6. Сводная дорожная карта (6 спринтов по ~2 недели)

**Спринт 1 — Измеримость и быстрые победы (частично сделано):**
- ✅ #1 триал везде, #3 онбординг, #4 intro_ended, #5 аналитика-фасад.
- Подключить PostHog (ключ + пакет + identify).
- Подключить Firebase Remote Config (инфраструктура).
- Тренажёр 1 → 2–3/день (1 строка + A/B-флаг).

**Спринт 2 — Витрина ценности (демо):**
- Демо smart/diagnosis (1/неделю).
- Лестница в NoEnergyModal: показать кнопку осколков (rewarded-ad — позже).
- Savings-бейдж −N% в v1.

**Спринт 3 — Доверие и порядок пейвола:**
- Соц-доказательство в v1 (реальные данные из Remote Config).
- Привести v1 к validated layout order.
- Детерминированное A/B-назначение по userId-хешу + серверная доля.

**Спринт 4 — Сглаживание intro:**
- `getIntroPhase` / `getPostIntroDay` + юнит-тесты.
- Поэтапная деградация лимитов (фаза C).
- Предупреждения фазы B (пуши + внутри-экранный таймер).

**Спринт 5 — Victory-моменты:**
- Апселл после урока 8 (celebration).
- Achievement «A1 Complete» + апселл.
- Streak-milestone позитивный апселл.
- Частотный кэп апселлов.

**Спринт 6 — Консолидация и rewarded-ad:**
- Подвести итог A/B v1 vs v2, удалить проигравший.
- Замкнуть webhook RevenueCat на аналитику.
- Rewarded-ad в лестнице энергии (если экономика сходится).
- Чистка мёртвого кода в пейволе (disabled-`Modal` под `{false &&}`).

---

## Приложение A. Чек-лист комплаенса (для каждого изменения пейвола)

- [ ] Цены ТОЛЬКО из RevenueCat/стора, никогда не хардкод.
- [ ] «Бесплатно/триал» в копии — ТОЛЬКО при реальной intro-фазе (`storeProductHasTrialIntro`).
- [ ] Нет фейковых таймеров обратного отсчёта (urgency на основе реального timestamp допустим, но без «сгорит навсегда» обмана).
- [ ] Нет фейковых зачёркнутых/удвоенных цен, передаваемых в стор (display-only «удвоение» уже изолировано в `paywall_urgency.ts`).
- [ ] Restore Purchases присутствует.
- [ ] Terms of Use + Privacy Policy ссылки присутствуют и доступны до покупки.
- [ ] Дисклоз автопродления (период, цена после триала, отмена за 24ч) — присутствует.
- [ ] Социальное доказательство — только реальные, верифицируемые данные.

## Приложение B. Словарь событий аналитики (после раздела 0, #5)

| Событие | Когда | Ключевые props |
|---|---|---|
| `onboarding_step_view` | смена шага онбординга | `step` |
| `onboarding_plan_paywall_view` | показан онбординг-пейвол | `plan` |
| `onboarding_plan_trial_cta` | нажата CTA в онбординге | `plan`, `has_trial` |
| `onboarding_continue_free` | «Продолжить без плана» | — |
| `intro_welcome_shown/cta` | welcome-модалка | — |
| `intro_ended_shown` | модалка «3 дня закончились» | — |
| `intro_ended_cta/dismiss` | действие в ended-модалке | — |
| `paywall_shown` | маунт пейвола | `context`, `source`, `paywall` |
| `paywall_plan_select` | выбор плана | `context`, `plan`, `paywall` |
| `paywall_cta_click` | нажата основная CTA | `context`, `plan`, `paywall` |
| `purchase_started` | открыт диалог стора | `context`, `plan`, `product_id`, `with_trial`, `paywall` |
| `purchase_completed` | покупка авторизована | те же |
| `trial_started` | покупка с триалом | `context`, `plan`, `paywall` |
| `purchase_failed/cancelled` | ошибка/отмена | `context`, `plan`, `error?`, `paywall` |
| `paywall_close/continue_free` | закрытие пейвола | `context`, `paywall` |
| `subscription_restored` | успешный restore | `context`, `paywall` |

---

_Конец документа._
