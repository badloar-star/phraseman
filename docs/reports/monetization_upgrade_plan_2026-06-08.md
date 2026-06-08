# План апгрейда монетизации Phraseman

> Дата: 2026-06-08
> Автор: аудит + research (6 параллельных агентов: 3 веб-research с источниками, 3 кодовые карты)
> Все пользовательские тексты — строго по `PHRASEMAN_BIBLE.md` (gain-framing, словарь замен, ≤10 слов, глагол в кнопке, «ты»)
> Прод-пейвол = `app/premium_modal.tsx` (НЕ v2). Цены всегда из RevenueCat — не хардкодить.

---

## Как читать документ

Каждый пункт содержит:
- **Диагноз** — что не так сейчас (с файл:строка)
- **Research** — что говорят данные индустрии (с источником и пометкой уровня доверия)
- **За / Против** — аргументы и риски
- **Решение** — что делать
- **Тексты по Библии** — готовые копии (ru, с пометкой стиля)
- **Файлы:строки + псевдокод** — где и что менять
- **Метрики и A/B** — что трекать, как замерить

Приоритет помечен: 🔴 критично · 🟠 сильно · 🟡 средне

Уровни доверия research: **[D]** документировано (есть кейс/цифра) · **[V]** vendor-оценка (блог поставщика) · **[E] экстраполяция** (нет прямых данных, вывод по принципу).

---

## Сводка приоритетов и порядок работ

| # | Пункт | Приоритет | Усилие | Главный ожидаемый эффект | Зависимости |
|---|-------|-----------|--------|--------------------------|-------------|
| 1 | РФ-оплата — диагностика рисков бана | 🔴 (только диагностика) | — | Не словить бан | нет |
| 2 | `intro_ended`: «было/стало» + urgency + персональные числа | 🔴 | M-L | Главный момент конверсии | #5 (зеркало), urgency-port |
| 3 | After-win upsell (perfect / level-up) | 🔴 | S-M | Ловит пик дофамина | анти-over-prompt гард |
| 4 | Перцентиль на пейволе | 🟠 | S | Social proof + FOMO | данные есть |
| 5 | «Зеркало прогресса» перед стеной | 🟠 | M-L | Endowment / value | reuse в #2 |
| 6 | Социальное доказательство (ротация отзывов) | 🟠 | S-M | +trial по бенчмаркам | нет |
| 7 | Re-engagement (abandoned-paywall + winback) | 🟠 | M-L | Дожим неконвертнувшихся | RC Offerings для скидки |
| 9 | Бейдж экономии: статический fallback | 🟡 | S | Сигнал выгоды всегда | нет |
| 10 | Цена в день (decoupling) | 🟡 | S | Снижение pain-of-paying | нет |
| 11 | Smart Trainer: lock-preview вместо редиректа | 🟡 | M | Показать что теряет | нет |

**Рекомендуемый порядок:** сначала «фундамент данных» (#5 зеркало прогресса как переиспользуемый модуль), затем #2 (использует #5), параллельно дешёвые победы #4/#9/#10/#6, затем #3 и #11, в конце #7 (требует RC-настройки). #1 — прочитать первым и зафиксировать как ограничение для всех остальных.

---

# 1. 🔴 РФ-оплата — диагностика рисков бана (БЕЗ внедрения)

> По решению: только диагностика. Внедрять обход в приложение НЕЛЬЗЯ — это бан.

## Диагноз
- Telegram Stars-канал технически работает (`functions/src/telegram_premium_bot.ts:73` — 300⭐/мес, 1800⭐/год), активация ручная (`telegram_premium_bot.ts:102`).
- Ссылок на него внутри приложения нет (grep `t.me`/`telegram` в `premium_modal.tsx` = 0). **И это правильно — их там быть НЕ должно.**

## Что = БАН (нельзя ни в коем случае)
| Действие | Нарушение | Источник |
|----------|-----------|----------|
| Кнопка/ссылка/призыв в iOS-приложении (RU-сторфронт) «оплати premium через Telegram/бот/сайт» | Apple **3.1.1** (обход IAP) + **3.1.1(a)** (steering вне US) + **3.1.3** (anti-steering) | [Apple Guidelines](https://developer.apple.com/app-store/review/guidelines/) |
| То же в Android-приложении | Google **Payments policy** — прямой запрет «linking to a webpage that could lead to an alternate payment method» | [Google support 10281818](https://support.google.com/googleplay/android-developer/answer/10281818) |
| License keys / QR / крипта для разблокировки premium | Apple **3.1.1** (явно перечислено) | там же |
| Опора на reader-исключение (3.1.3(a)) для языкового приложения | Отклонят — перечень закрыт: magazines/newspapers/books/audio/music/video. Языковое приложение не подпадает | [Apple reader-apps](https://developer.apple.com/support/reader-apps/) |

**Прецедент:** Telegram Stars и появились потому, что Apple уведомила Telegram о нарушении ботами **4.7 и 3.1.1**. Stars — «починка» внутри Telegram, а НЕ лазейка для сторонних приложений. ([Telegram Bot Payments](https://core.telegram.org/bots/payments-stars))

## Что = СЕРАЯ ЗОНА
- **US-сторфронт Apple** (post-Epic, май 2025): внешние ссылки разрешены — но только US, RU-аудитории не помогает. ([Apple News](https://developer.apple.com/news/?id=9txfddzf))
- «Multiplatform»-намёки (premium доступен и на других платформах) без явного steering/линка — Apple трактует придирчиво.
- Telegram Mini App с оплатой Stars как **отдельный** продукт — легально, пока Mini App не становится платёжным шлюзом нативного приложения.

## Что = БЕЗОПАСНО
- Apple IAP / Google Play Billing внутри стор-приложения (комиссия 15–30%).
- Коммуникация про альтернативную оплату **ВНЕ приложения** — email, push вне-сторовые каналы, ваш сайт (оба стора прямо разрешают: «outside of your app, you are free to communicate»).
- **RuStore** — нативная поддержка карт МИР и СБП, основной легальный путь для RU digital-оплаты (#2 в РФ после Google Play). ([ASO World 2026](https://asoworld.com/en/blog/rustore-vs-google-play-vs-app-store-in-russia-a-side-by-side-aso-comparison-for-2026/))
- Telegram Mini App / бот как самостоятельный продукт с оплатой через Stars.

## Контекст РФ 2024–2025
- Иностранные карты в App Store/Google Play для РФ-аккаунтов официально не работают.
- Google Play: биллинг для РФ на паузе с 10.03.2022; с 26.12.2024 разработчики с РФ-счётом вообще не могут монетизироваться. ([Google 11950272](https://support.google.com/googleplay/android-developer/answer/11950272), [15685001](https://support.google.com/googleplay/android-developer/answer/15685001))

## Решение (стратегия, не код в приложении)
1. **НЕ трогать `premium_modal.tsx`** — никаких ссылок на внешнюю оплату.
2. RU-монетизация решается на уровне **дистрибуции**, не внутри iOS/Android-бинарника:
   - **RuStore-сборка** с оплатой МИР/СБП (отдельный трек, отдельная задача).
   - **Сайт** как outside-of-app канал (на него можно вести из email/push, но НЕ кнопкой из приложения).
3. Telegram-бот оставить как есть (отдельный продукт), но **не линковать из стор-приложения**.

## Метрики
- Не применимо для приложения. Для RuStore-трека (отдельно): conversion RuStore install→paid, доля МИР/СБП.

> **Дисклеймер:** диагностика по публичным правилам на июнь 2026; политики меняются, решение ревью может отличаться. Не юридическая консультация.

---

# 2. 🔴 `intro_ended` — главный момент конверсии

## Диагноз
`intro_ended` — единственный момент, когда юзер уже попробовал премиум (закончились 72ч full-access). Сейчас слит:
- Копия абстрактная, без персональных чисел. Дословно (`premium_modal.tsx:464–472`):
  > `titleRu: 'Продолжай в полном доступе'`
  > `subtitleRu: 'Ты уже почувствовал полный доступ. Premium открывает его насовсем — без пауз и блокировок.'`
- **Нет демонстрации downgrade**: что именно отключилось (безлимит энергии, личный план, уроки 9+) — не показано.
- **Нет таймера** обратного отсчёта в приложении в последние часы (только push `scheduleIntroExpiringNotification`, `notifications.ts:835–882`).
- **Urgency не подключён в v1**: grep `paywall_urgency` в `premium_modal.tsx` = 0. Работает только в v2 (`premium_modal_v2.tsx:40–44`), который видит ~50%.
- Аналитика дырявая: `intro_ended_shown` / `intro_ended_cta` / `intro_ended_dismiss` объявлены (`analytics.ts:58–60`), но **нигде не вызываются**.

## Research
- **Value-first перед пейволом**: ASL Bloom — value-first онбординг дал **+15% trial conversion, +12% ARPU, +18% D30 retention** [D] ([RevenueCat/Applica](https://www.revenuecat.com/blog/growth/asl-bloom-applica-case-study/)).
- **Endowment / opt-out**: пользователь, уже «владеющий» доступом, конвертирует **48–60% vs 18–25%** opt-in [V] (Adapty). Конец intro = ровно момент эндоумента.
- **Loss vs gain на конце триала**: prospect theory — потеря ~2× сильнее равной выгоды (Kahneman & Tversky) [D-academic]. НО изолированных мобильных A/B «loss vs gain at trial expiry» в открытых данных **нет** [E]. Медицинские мета-анализы (PMC 2023) показывают loss-framing сильнее для prevention-поведений.
- **Trial expiry reminder** (Day 5) в редизайне дал **+58% initial / +59.6% to paying** [D] ([Ryan Ashcraft case study](https://ryanashcraft.com/paywall-optimization-success-story/)).
- **Urgency-таймер**: visual-only эксперименты до +30% (Adapty playbook) [V]; «last chance» даёт значимый CTR-lift у Duolingo [D].

## За / Против

**За полную переделку intro_ended:**
- Самый горячий момент во всей воронке — здесь максимальный ROI.
- Эндоумент уже сформирован — конкретные «твои» цифры бьют generic.
- Инфраструктура почти вся есть (urgency реализован, данные прогресса доступны).

**Против / риски:**
- **Конфликт с Библией Правило 2** (gain-framing для новичков, loss разрешён только для streak 7+). Конец intro — пограничный: юзер уже не новичок (3 дня в продукте), но streak может быть <7.
  - **Разрешение конфликта:** использовать **endowment-framing, не loss-framing**. Разница: не «ты ПОТЕРЯЕШЬ X» (запрещено), а «Уже твоё: X — Premium держит этот темп» (показываем накопленное как актив, который остаётся с Premium). Это формально gain/ownership, психологически работает как удержание. Текущая ветка `getPersonalValueLine` для intro_ended (`premium_modal.tsx:1410–1457`) **уже** написана в этом ключе («Уже твоё: …») — расширяем её, не ломая принцип.
  - Блок «что сейчас ограничено» подаём как факт-эксперт (Стиль 4), без запугивания: «С бесплатным режимом: 2 урока в день» — нейтральная констатация, не «ты потерял».
- **Urgency-таймер риск фальшивой срочности** (Библия Правило 5 / запрещённый паттерн #5: «не делаем фальшивую срочность без реального дедлайна»).
  - **Разрешение:** таймер привязать к **реальному** дедлайну — окно персональной цены (как в v2 grace-период `premium_modal_v2.tsx:329–336`), а не выдуманный «только сегодня». Если реального дедлайна нет — таймер не показывать.

## Решение
1. **Подключить urgency в v1** (порт из v2): импорт `activateUrgencyIfNeeded`, `getUrgencyState`, `getDoubledPrice` из `./paywall_urgency`.
2. **Добавить блок «Эндоумент» для intro_ended**: «Уже твоё за 3 дня: N уроков · N фраз · серия N дн.» (данные из #5).
3. **Добавить блок «Сейчас в бесплатном режиме»** — нейтральная факт-таблица из 3 строк (Стиль 4), показывающая текущие ограничения (реюз `PAYWALL_COMPARISON_ROWS`, `premium_modal.tsx:1051–1191`, колонка `free`).
4. **In-app countdown** в последние часы intro (опционально, фаза 2) — на home-экране, привязан к `endsAt` (`intro_full_access.ts:13`).
5. **Зашить аналитику**: вызвать `intro_ended_shown/cta/dismiss`.

## Тексты по Библии

**Заголовок** (Стиль 3 Инвестор + Тренер) — оставить персонализируемым:
```
titleRu (есть данные):  'Твой темп уже набран'
titleRu (нет данных):   'Продолжай в полном доступе'   // текущий, оставить как фоллбэк
```

**Блок «Уже твоё»** (Стиль 2 Игра + 3 Инвестор) — расширить существующую ветку:
```
'Уже твоё за 3 дня: 4 урока · 38 фраз · серия 3 дня.'
'Premium держит этот темп — без пауз.'
```
(глагол-владение «твоё», числа создают конкретность, ≤10 слов/строка)

**Блок «Сейчас в бесплатном режиме»** (Стиль 4 Эксперт — факт, не запугивание):
```
Заголовок: 'В бесплатном режиме сейчас:'
— 'Уроки — 2 в день'
— 'Энергия — восстанавливается по одной'
— 'Личный план — на паузе'
```
> ⚠️ НЕ писать «ты потерял», «больше недоступно навсегда», «успей». Только нейтральная констатация текущего состояния + контраст с Premium-колонкой рядом.

**CTA** (Правило 1, глагол):
```
'Открыть полный доступ'        // без триала
'Продолжить бесплатные 3 дня'  // если магазин даёт триал (Правило: глагол + объект)
```

**Urgency-полоса** (только при реальном окне цены):
```
'Твоя цена закреплена — ещё {timer}'
```
> НЕ «Только сегодня!» без реального дедлайна.

## Файлы:строки + псевдокод

**A. Порт urgency в v1** — `premium_modal.tsx`:
```
// рядом со строкой 63 (импорты paywall_trial_offer):
import { activateUrgencyIfNeeded, getUrgencyState, getDoubledPrice, type UrgencyState } from './paywall_urgency';

// в компоненте, рядом со стейтом (~1728):
const [urgency, setUrgency] = useState<UrgencyState | null>(null);
useEffect(() => {
  (async () => { await activateUrgencyIfNeeded(); setUrgency(await getUrgencyState()); })();
}, []);
useEffect(() => {            // live-таймер, копия v2:169–180
  if (!urgency?.isActive) return;
  const id = setInterval(() => setUrgency(prev => recomputeTimer(prev)), 1000);
  return () => clearInterval(id);
}, [urgency?.isActive]);
```

**B. Зачёркнутая цена** — в карточках планов (`premium_modal.tsx:4034–4360`):
```
const yearlyDoubled = urgency?.isActive ? getDoubledPrice(yearlyPriceStr) : null;
// рядом с ценой: {yearlyDoubled && <Text style={strikePrice}>{yearlyDoubled}</Text>}
```

**C. Блок эндоумента + «бесплатный режим»** — вставить в JSX между Блоком 3 (`premium_modal.tsx:3907–3921`) и сравнительной таблицей (3923), показывать только при `ctx === 'intro_ended'`:
```
{ctx === 'intro_ended' && (
  <>
    <EndowmentCard stats={introProgress} />        {/* данные из #5 readIntroProgress() */}
    <FreeModeFactList rows={PAYWALL_COMPARISON_ROWS.slice(0,3)} />
  </>
)}
```

**D. Расширить `getPersonalValueLine` intro_ended-ветку** (`premium_modal.tsx:1410–1457`) — добавить «за 3 дня» (сейчас «Уже твоё: …» без периода).

**E. Аналитика** — в `_layout.tsx:1689` (где открывается intro_ended) добавить `trackEvent('intro_ended_shown')`; в CTA — `intro_ended_cta`; в close — `intro_ended_dismiss`.

## Метрики и A/B
- **События**: `intro_ended_shown`, `intro_ended_cta`, `intro_ended_dismiss`, `purchase_completed{context:intro_ended}`, `trial_started{context:intro_ended}`.
- **Главная метрика**: conversion `intro_ended_shown → purchase_completed`.
- **A/B-дизайн** (детерминированный по userId-хешу, как существующий `EXPO_PUBLIC_TRAINER_AB_*` в `remote_flags.ts`):
  - Control: текущий intro_ended.
  - Variant B: + эндоумент-блок + «бесплатный режим».
  - Variant C: B + urgency-таймер.
  - Метрика-страж: refund rate (urgency не должен раздувать возвраты — Superwall: exit-offers 3.3% vs 6.8%).
- Минимальный размер выборки считать по базовой конверсии intro_ended (взять из текущих данных PostHog после wiring аналитики — сейчас её нет, поэтому **сначала зашить события, собрать 1–2 недели baseline, потом A/B**).

---

# 3. 🔴 After-win upsell (момент успеха → апсейл)

## Диагноз
- После **идеального** прохождения урока (`wasPerfect`, `lesson_complete.tsx:592–607`) показывается только `ReviewModal` (просьба оценить, `lesson_complete.tsx:613–617`). Пик дофамина уходит впустую.
- После **level-up** (`xp_manager.ts:219–243` → `emitAppEvent('level_up_pending')` → `_layout.tsx:583–588`) — только модал + gift, без апсейла.
- После **починки стрика** (`streak_repair.ts:103–128`, `nowRepaired`) — только achievement, без «защити цепочку заморозкой».
- Единственный существующий after-win upsell — `showPremiumBanner` в `goNext()` (`lesson_complete.tsx:827–844`), и он сделан хорошо (показывается когда следующий урок закрыт).

## Research
- **After-win = лучший момент**: «aha moment» — лучший триггер пейвола (Superwall, RevenueCat) [D]. Plant/fitness app: sign-up→trial вырос **3%→15% (5×)** после привязки пейвола к моменту ценности [D] ([RevenueCat Placement](https://www.revenuecat.com/blog/growth/paywall-placement/)).
- **Over-prompting убивает**: Duolingo показывает апгрейд в **7 точках за первую сессию** [D]; 40%+ юзеров сообщают о subscription fatigue (2024) [V]. Hard-paywall apps: выше D35-конверсия, но выше churn при «заперли слишком рано» [V] ([RevenueCat SOSA 2024](https://www.revenuecat.com/state-of-subscription-apps-2024/)).

## За / Против

**За:**
- Момент успеха объективно конвертит лучше холодного пейвола (5× в кейсе).
- У нас есть точные хуки (perfect, level-up, repair) — технически дёшево.

**Против / риски (СЕРЬЁЗНО):**
- **Over-prompting → churn + 1-star reviews.** Если показывать апсейл после КАЖДОГО успеха — деградирует в шум, бьёт по retention.
- **Конфликт с ReviewModal**: после perfect уже просится оценка приложения. Два промпта подряд = раздражение. Нельзя показывать оба.
- **Каннибализация App Store рейтинга**: ReviewModal на perfect-уроке — ценный (просим оценку на пике эмоции). Если заменить его апсейлом, упадёт поток отзывов (которые сами по себе social proof для #6).

## Решение (осторожное, с гардами)
1. **НЕ показывать после каждого успеха.** Ввести единый `afterWinUpsellGate`:
   - Глобальный кулдаун (напр. 1 показ / 24–48ч), по аналогии с `claimImmediateNotificationSlot` (`notifications.ts:436–461`).
   - Не показывать если юзер уже видел пейвол сегодня (`streak_paywall_shown`-паттерн, `home.tsx:1355`).
   - Не показывать одновременно с ReviewModal — **приоритет ReviewModal на perfect** (отзыв ценнее), upsell только на НЕ-perfect-успехах или когда ReviewModal не eligible.
2. **Привязать к контексту успеха**, а не generic:
   - Perfect (но ReviewModal не показан) → «ты на потоке, открой следующее без ожидания».
   - Level-up → «ты вырос — Premium снимает все лимиты».
   - Streak repair → контекст `streak`, «защити цепочку заморозкой» (фича Premium).
3. **Формат — inline-баннер, не модал** (как существующий `showPremiumBanner`, `lesson_complete.tsx:969–1024`), чтобы не блокировать.
4. Начать с **ОДНОГО** места (level-up — реже всего срабатывает, меньше риск over-prompt), измерить, потом расширять.

## Тексты по Библии

**Level-up upsell** (Стиль 2 Игра + 3 Инвестор):
```
Заголовок: 'Уровень {N} — твой'
Строка:    'Ты растёшь быстро. Premium снимает все лимиты.'
CTA:       'Открыть полный доступ'
```

**Perfect-урок** (только если ReviewModal НЕ показан) (Стиль 1 Тренер + 2 Игра):
```
Заголовок: 'Чисто пройдено'
Строка:    'Ты на потоке. Продолжи без ожидания энергии.'
CTA:       'Продолжить на Premium'
```

**Streak repair** (Стиль 1 Тренер):
```
Заголовок: 'Цепочка спасена'
Строка:    'Заморозка защитит её в следующий раз.'
CTA:       'Включить заморозку'
```
> Все — gain-framing, ≤10 слов, глагол в кнопке. НЕ «не упусти», НЕ «последний шанс».

## Файлы:строки + псевдокод

**A. Новый модуль гарда** — `app/after_win_upsell_gate.ts`:
```
const KEY = 'after_win_upsell_last_shown_v1';
const COOLDOWN_MS = 36 * 60 * 60 * 1000;            // 1.5 суток, вынести в remote_flags
export async function canShowAfterWinUpsell(nowMs): Promise<boolean> {
  if (await getVerifiedPremiumStatus()) return false;
  const last = Number(await AsyncStorage.getItem(KEY)) || 0;
  if (nowMs - last < COOLDOWN_MS) return false;
  const paywallToday = await AsyncStorage.getItem('streak_paywall_shown'); // reuse anti-spam
  // ... проверка что сегодня пейвол не показывали
  return true;
}
export async function markAfterWinUpsellShown(nowMs) { await AsyncStorage.setItem(KEY, String(nowMs)); }
```

**B. Level-up хук** — `_layout.tsx:583–588` (`flushQueue`), после dismiss level-up modal:
```
if (await canShowAfterWinUpsell(Date.now())) {
  await markAfterWinUpsellShown(Date.now());
  trackEvent('afterwin_upsell_shown', { source: 'level_up', level: newLvl });
  router.push({ pathname: '/premium_modal', params: { context: 'generic', source: 'afterwin_levelup' } });
}
```
> Контекст можно сделать новый `level_up` в `PremiumContext` (`premium_modal.tsx:119–148`) с собственным PAYWALL_COPY.

**C. Perfect-урок** — `lesson_complete.tsx:613–617`, изменить условие:
```
const reviewEligible = await canShowReview();
if (reviewEligible) { setReviewContext(wasPerfect ? 'perfect_lesson' : 'general'); setShowReview(true); }
else if (wasPerfect && await canShowAfterWinUpsell(Date.now())) {   // отзыв приоритетнее
  await markAfterWinUpsellShown(Date.now());
  openPremiumBanner(/* show perfect-variant copy */);
}
```

**D. Streak repair** — `lesson_complete.tsx:661–664`, после `checkAchievements`:
```
if (repair.nowRepaired && await canShowAfterWinUpsell(Date.now())) {
  // показать inline-баннер с контекстом streak / freeze
}
```

## Метрики и A/B
- **События**: `afterwin_upsell_shown{source}`, `afterwin_upsell_cta`, `afterwin_upsell_dismiss`, `purchase_completed{source:afterwin_*}`.
- **Страж over-prompting**: D7/D30 retention, App Store review submit rate (не должен упасть), session frequency.
- **A/B**: Control (нет after-win) vs Variant (level-up only). Расширять на perfect/repair **только** если retention не просел.
- **Стоп-правило**: если D7 retention в варианте падает >X% или растут негативные отзывы — откат.

---

# 4. 🟠 Перцентиль на пейволе

## Диагноз
`leaderboard_stats.ts:138–186` считает `AllPercentiles` (xp, streak, weekXp, …) с сервера, доступно через `loadPercentileData()` (`daily_analytics_sync.ts:125–151`). На пейволе **не используется**. Строка «Твоя серия 12 дней — лучше, чем у 81% учеников» нигде не появляется.

## Research
- **Duolingo** использует перцентиль в Year in Review (топ-10%, топ-1%) — но как **share/retention** контент, не прямой upsell [D] ([Duolingo Blog](https://blog.duolingo.com/year-in-review-behind-the-scenes/)). Топ-10% по XP дали >50% всех шеров.
- **Прямого встраивания перцентиля в пейвол** у топ-языковых приложений **не задокументировано** [E]. Это означает: гипотеза разумная (social comparison + endowment), но без отраслевого подтверждения → **только как эксперимент, осторожно**.
- Лиги Duolingo создают асимметричный loss aversion (страх понижения > надежда повышения) [D].

## За / Против

**За:**
- Данные уже есть, стоимость близка к нулю.
- Social comparison + «твой ранг — актив» усиливает эндоумент.

**Против / риски:**
- **Нет отраслевого прецедента прямо на пейволе** — может не сработать или раздражать.
- **Может бить по low-performers**: «ты лучше 12%» демотивирует. Нужно показывать только при **хорошем** перцентиле (порог).
- **Null для новичков** (`myXp < minimumSampleXp`, дефолт ~100 XP) — у части юзеров данных нет.
- Риск конфликта с Библией если подать как давление. Подавать как **гордость за достижение** (Стиль 2 Игра), не как угрозу.

## Решение
1. Показывать перцентиль-строку на пейволе **только если**:
   - перцентиль не null И
   - перцентиль «хороший» (напр. top-50% или лучше — порог в remote_flags).
2. Подавать как достижение-владение, не давление.
3. Реюз `visiblePercentile()` (`stats_percentile_display.ts`) для форматирования.
4. Лучшие контексты: `streak`, `intro_ended`, `stats`/`percentiles`/`heatmap`.

## Тексты по Библии (Стиль 2 Игра — гордость, не угроза)
```
'Твоя серия — лучше, чем у 81% учеников.'   // если streak перцентиль хороший
'Твой темп — в топ-15% за неделю.'           // weekXp
'Premium держит тебя в этом темпе.'          // мост к ценности
```
> НЕ «не откатись назад», НЕ «потеряешь место». Только гордость + мост к Premium.
> Для low-percentile — НЕ показывать вообще (молчание лучше демотивации).

## Файлы:строки + псевдокод

**A. Загрузка** — `premium_modal.tsx`, рядом со стейтом (~1728):
```
const [percentiles, setPercentiles] = useState<AllPercentiles | null>(null);
useEffect(() => { (async () => setPercentiles((await loadPercentileData()).percentiles))(); }, []);
```
> `loadPercentileData` async — пейвол рендерится сразу, строка появляется когда данные пришли (graceful).

**B. Хелпер выбора строки** — новый `app/paywall_percentile_line.ts`:
```
const GOOD_THRESHOLD = 50;  // top-50%, в remote_flags
export function pickPercentileLine(ctx, p: AllPercentiles | null, lang): string | null {
  if (!p) return null;
  if (ctx === 'streak' && p.streak != null && p.streak >= GOOD_THRESHOLD)
    return `Твоя серия — лучше, чем у ${p.streak}% учеников.`;
  if ((ctx==='intro_ended'||ctx==='percentiles') && p.weekXp != null && p.weekXp >= GOOD_THRESHOLD)
    return `Твой темп — в топ-${100 - p.weekXp}% за неделю.`;
  return null;  // молчим если плохо/нет данных
}
```

**C. Рендер** — рядом с personalValueLine (`premium_modal.tsx:3918–3919`):
```
{percentileLine && <Text style={socialProofLine}>{percentileLine}</Text>}
```

## Метрики и A/B
- **События**: `paywall_percentile_shown{ctx,bucket}`, корреляция с `purchase_completed`.
- **A/B**: Control (нет строки) vs Variant (строка при хорошем перцентиле). Сегментировать по перцентиль-бакету.
- **Страж**: не должно падать у low-performers (им не показываем — проверить что фильтр работает).

---

# 5. 🟠 «Зеркало прогресса» перед стеной (БОЛЬШОЙ research)

## Диагноз
Готовность платить = ощущение накопленного актива, который жалко бросить. Сейчас нет экрана/блока «За эти 3 дня ты: N уроков, N фраз, N XP, серия N дней» как эмоционального якоря перед pitch. `personalValueLine` даёт одну общую строку, спрятанную **после** бенефитов (`premium_modal.tsx:3918`).

## Research (углублённо)
- **Value-first → +15% trial, +12% ARPU, +18% D30** [D] (ASL Bloom, [RevenueCat/Applica](https://www.revenuecat.com/blog/growth/asl-bloom-applica-case-study/)). Архитектура: сначала ценность/достигнутое → потом pricing.
- **Duolingo Year in Review**: персональная сводка (дни, время, слова, XP, перцентиль) → spike новых юзеров + lift уроков [D] ([Duolingo](https://blog.duolingo.com/year-in-review-behind-the-scenes/)). Это retention/virality, но доказывает силу персональной сводки.
- **«Value recap между квизом и пейволом»** — отраслевая рекомендация формата «чтобы помочь тебе [цель]: → Бенефит 1/2/3», делает пейвол продолжением, не транзакцией [E] ([RevenueCat Paywalls Guide](https://www.revenuecat.com/blog/growth/guide-to-mobile-paywalls-subscription-apps/)).
- **Endowment**: opt-out (уже владеешь) 48–60% vs opt-in 18–25% [V] (Adapty). Сводка достигнутого усиливает чувство владения.
- **Осторожно**: «progress mirror» как изолированная техника **не измерена** [E]. Лучшее приближение — ASL Bloom value-first (+15%).

## За / Против

**За:**
- Сильнейший эндоумент-триггер; согласуется с Библией (показываем что юзер ПОЛУЧИЛ — чистый gain-framing).
- Переиспользуется в #2 (intro_ended), #4 (перцентиль), будущих экранах (Year-in-Review-стиль).
- Данные доступны (см. карту источников ниже).

**Против / риски:**
- **Производительность**: все источники async + часть требует сеть (lifetime/arena). Нельзя блокировать рендер пейвола.
- **Новички с пустым прогрессом**: «0 уроков, 0 фраз» — анти-продающе. Нужен фоллбэк (скрывать блок если данных мало).
- **Точность «за 3 дня»**: нет готового «за период» для фраз/уроков — только lifetime. Нужно строить дельту из `stats_daily_breakdown_v1`.

## Доступные данные (из кодовой карты)
| Метрика | API | Sync? |
|---------|-----|-------|
| Уроки | `countCompletedLessonsFromStorage()` (`notifications.ts:35`) | async (AsyncStorage) |
| Фразы | `countPhrasesLearnedFromLessonProgress()` (`lifetime_profile_stats.ts:106`) | async |
| Слова | `countLearnedWordsTotal()` (`lifetime_profile_stats.ts:136`) | async |
| XP | `AsyncStorage.getItem('user_total_xp')` | async |
| XP/7д | `getLast7DaysXp()` (`daily_analytics_sync.ts:50`) | async |
| Streak | `AsyncStorage.getItem('streak_count')` | async |
| Кэш lifetime | `readLifetimeProfileStatsCache()` (`lifetime_profile_stats.ts:233`) | async, без сети |
| Старт intro | `intro_full_access_started_at_v1` (`intro_full_access.ts:12`) | async |
| Дельта по дням | `stats_daily_breakdown_v1` (посуточно phrases/words/quizzes) | async |

## Решение
1. **Единый переиспользуемый модуль** `app/paywall_progress_mirror.ts`:
   - `readProgressMirror(opts)` → `{ lessons, phrases, xp, streak }` из кэша (быстро, без сети).
   - `readIntroProgress()` → дельта «за 3 дня» из `stats_daily_breakdown_v1` начиная с `intro_full_access_started_at_v1`.
2. **Компонент** `<ProgressMirrorCard>` — bento-стиль (Стиль 2 Игра, числа крупно).
3. **Размещение**: для `intro_ended` — «за 3 дня» (см. #2); для остальных high-value контекстов — lifetime «уже твоё».
4. **Фоллбэк**: если суммарный прогресс ниже порога (напр. <2 уроков) — блок не рендерить, оставить текущий generic.
5. **Загрузка из кэша** (`readLifetimeProfileStatsCache`) для мгновенного рендера, фоновое обновление через `loadLifetimeProfileStats`.

## Тексты по Библии (Стиль 2 Игра + 3 Инвестор)
```
Заголовок: 'Уже твоё'                       // владение
Bento-карточки:
  '4'  'урока'        // urok→raund? Библия: «урок»→«сессия/раунд». Здесь «раунд» уместнее
  '38' 'фраз'
  '420' 'XP'
  '3'  'дня серия'
Подпись:  'Premium держит этот темп.'        // мост к Premium
```
> По Библии «урок» → «раунд/сессия». Уточнить с продуктом: в Phraseman сущность называется «урок» в UI повсеместно — если так, оставить «урок» для консистентности; иначе «раунд».
> Числа крупно (Стиль 2: числа = конкретность). Gain-framing, владение.

## Файлы:строки + псевдокод

**A. Модуль** — `app/paywall_progress_mirror.ts`:
```
export interface ProgressMirror { lessons:number; phrases:number; xp:number; streak:number; }
export async function readProgressMirror(): Promise<ProgressMirror> {
  const cache = await readLifetimeProfileStatsCache();          // быстро, без сети
  const streak = Number(await AsyncStorage.getItem('streak_count')) || 0;
  const xp = Number(await AsyncStorage.getItem('user_total_xp')) || 0;
  return { lessons: cache?.lessons ?? 0, phrases: cache?.phrases ?? 0, xp, streak };
}
export async function readIntroProgress(): Promise<ProgressMirror> {
  const startedAt = Number(await AsyncStorage.getItem('intro_full_access_started_at_v1')) || 0;
  // суммировать stats_daily_breakdown_v1 по дням >= startedAt
  // ...
}
export function isMirrorWorthShowing(m: ProgressMirror): boolean {
  return m.lessons >= 2 || m.phrases >= 10;   // порог, иначе не показывать
}
```

**B. Компонент** — `app/components/ProgressMirrorCard.tsx` (bento, реюз стилей карточек пейвола).

**C. Интеграция** — `premium_modal.tsx` между Блоком 3 и таблицей (~3921):
```
{mirror && isMirrorWorthShowing(mirror) && <ProgressMirrorCard data={mirror} intro={ctx==='intro_ended'} />}
```

## Метрики и A/B
- **События**: `progress_mirror_shown{ctx, lessons_bucket}`, корреляция с purchase.
- **A/B**: Control (нет зеркала) vs Variant (зеркало для high-value контекстов). Главная метрика — conversion. Вторичная — time-on-paywall (зеркало должно удерживать дольше).
- **Сегмент**: отдельно мерить новичков (мало данных) — у них блок не показывается, проверить что фоллбэк корректен.

---

# 6. 🟠 Социальное доказательство (ротация отзывов)

## Диагноз
В проде только агрегат «★★★★★ 4.8 · 10 000+ оценок» (`premium_modal.tsx:3850–3861`). Ни одного живого отзыва. v2 имеет ОДИН хардкод, неротируемый («За месяц поняла первый сериал без субтитров», `premium_modal_v2.tsx:317–319`).

## Research
- **Trial-paywall с embedded social proof: 64.5% vs 44.4%** text-only [D] (Airbridge).
- **Food app: +72% install-to-trial** с reviews + статистикой вместо feature list [D] (multi-factor, [RevenueCat](https://www.revenuecat.com/blog/growth/paywall-redesigns-case-studies/)).
- Форматы топ-игроков [D]:
  - Duolingo Super: 4.8/5 из 3.33M, #1 Top Grossing, ~500M юзеров, **contextual bullets** (первый пункт меняется по точке входа) ([Adapty](https://adapty.io/paywall-library/duolingo/)).
  - Babbel: «Over 2 million 5-star reviews» в начале онбординга.
  - Speak: «5M users» + «4.8 from 140,000 reviews».
- **Goal-matched testimonials >> generic** [D]. Точные числа («Join 47,392») > vague [D]. Рейтинг 4.2–4.5 оптимум (>5.0 → скептицизм) [D].
- **Изолированного A/B «добавили reviews → +X%» нет** [E] — все кейсы multi-factor.

## За / Против

**За:**
- Сильная отраслевая поддержка, дёшево.
- v2 уже имеет паттерн карточки отзыва — переносим в v1 + делаем ротацию.

**Против / риски:**
- **Фейковые/неправдоподобные отзывы → скептицизм + риск App Review** (Apple не любит фейк social proof). Нужны реальные отзывы (из App Store / собранные).
- **Локализация**: отзывы должны быть на языке юзера (ru/uk/es).
- Точные числа («47 000 учеников») должны быть **правдой** — иначе риск.

## Решение
1. **Реальные отзывы** (3–5 на язык) — собрать из App Store reviews / отзывов пользователей. Хранить в `app/paywall_testimonials.ts`.
2. **Ротация**: показывать 1–2, ротировать по сессии/контексту (детерминированно по дню, чтобы не прыгало в рамках сессии).
3. **Goal-matched**: подбирать отзыв под контекст где возможно (напр. для `course_after_lesson3` — отзыв про прогресс в уроках).
4. **Перенести в v1** карточку из v2 (`premium_modal_v2.tsx:307–320`).
5. Числа держать честными (рейтинг/кол-во — из реальных данных стора).

## Тексты по Библии
> Отзывы — это голос пользователей, НЕ переписывать под Библию дословно (аутентичность важнее). Но отбирать те, что звучат gain-framing и человечно (Стиль 5 Человек).
```
Примеры формата (реальные, заменить на собранные):
«За месяц поняла первый сериал без субтитров.» — Анна
«Наконец заговорил на встречах с иностранцами.» — Игорь
«15 минут утром — и словарь растёт сам.» — Мария
```
Заголовок секции (Стиль 4 Эксперт):
```
'Что говорят ученики'
```

## Файлы:строки + псевдокод

**A. Данные** — `app/paywall_testimonials.ts`:
```
export const TESTIMONIALS: Record<Lang, {text:string; author:string; goalTag?:PremiumContext}[]> = {
  ru: [{text:'За месяц поняла первый сериал без субтитров.', author:'Анна', goalTag:'course_after_lesson3'}, ...],
  uk: [...], es: [...],
};
export function pickTestimonials(lang, ctx, dayHash, count=2) { /* детерминированный выбор, goal-matched первым */ }
```

**B. Компонент** — перенести `<TestimonialCard>` из v2:307–320 в общий компонент.

**C. Рендер** — `premium_modal.tsx`, под hero (~3866) или перед планами (~4033):
```
<TestimonialsBlock items={pickTestimonials(lang, ctx, dayHash)} />
```

## Метрики и A/B
- **A/B**: Control (только агрегат-рейтинг) vs Variant (агрегат + ротируемые отзывы) vs Variant2 (goal-matched).
- **Метрика**: conversion + time-on-paywall.
- **Страж**: refund rate (фейк-доверие → возвраты).

---

# 7. 🟠 Re-engagement (abandoned-paywall + winback) (БОЛЬШОЙ research)

## Диагноз
- **Нет abandoned-paywall**: открыл пейвол, закрыл — нет пуша «ты почти открыл Premium». Закрытие трекается (`paywall_close`/`paywall_continue_free`, `analytics.ts:64–65`), но без follow-up.
- **Нет winback-скидки**: вернулся через 7+ дней — нет «-30%». Инфраструктура `premium_store_promo_display.ts` — это **только парсер** store-промо (`:124–131`), программной активации нет.
- D+14 пуш есть (`notifications.ts:975–998`), но при открытии приложения нет limited-time оффера.

## Research (углублённо)
- **Abandoned-paywall**: ~20% юзеров начинают транзакцию и бросают; transaction-abandon paywall = **17% от total revenue** [D] (Superwall, 18 компаний, ~500k). Exit-offer conversion 6.3% vs control 8.9% (хуже, но «найденные» деньги), refund 3.3% vs 6.8%. Timing exit-offer: **0–30 сек** после dismiss [V].
- **Recovery push**: лучше в первый час после exit [V] (Airbridge). Targeted push: **7× open rate** vs generic [D] (Airship, 665B). Education push opt-in: Android 39.7% / iOS 37.1% [D] (OneSignal). Конкретной «abandoned-push → subscription conversion» цифры **нет** [E].
- **Winback discount**: post-paywall welcome offer (limited discount) **+10–15% ARPU** [V] (Adapty). Education — самая высокая доля приложений со скидками (14.3%) [V]. Re-trial для established users: 4.5% [V] (Airbridge).
- **Education**: 22% конверсий отложены на Day 1–31+ (Day-0 только 78%) [D] (RevenueCat SOSA 2026) — то есть ретаргетинг особенно важен именно для языковых.

## За / Против

**За:**
- 17% revenue от abandoned — крупная упущенная масса.
- Education особенно выигрывает от отложенного ретаргета.
- Push-инфраструктура полностью готова (`triggerInterval(3600)` для «через час», `notifications.ts:128–135`).

**Против / риски:**
- **Winback-скидка технически сложнее**: `premium_store_promo_display.ts` не умеет активировать промо. Нужны **RevenueCat Offerings/Experiments** (разные офферинги для сегментов) или промо-коды стора. Это инфра-задача.
- **Скидка обесценивает цену**: приучает ждать скидку. Применять точечно (только вернувшимся через 7+ дней).
- **Push-fatigue**: уже есть D1/D4/D7/D14 + streak/energy/league. Добавление abandoned-push может пересытить. Нужен общий бюджет пушей (кулдаун `IMMEDIATE_NOTIFICATION_MIN_GAP_MS = 45мин`, `notifications.ts:361` — учесть).
- **In-app exit-offer уже частично есть** (exit-trial overlay, `premium_modal.tsx:3332+`), но только для 3 контекстов и только триал, не скидка.

## Решение (поэтапно)

**Фаза A — Abandoned-paywall in-app (дёшево, без скидки):**
1. Расширить exit-trial overlay (`paywall_trial_offer.ts:35`, `EXIT_TRIAL_CONTEXTS`) на больше контекстов (intro_ended, streak, trainer_limit).
2. Это «0–30 сек» exit-offer из research — самый ROI-эффективный.

**Фаза B — Abandoned-paywall push (через час):**
1. Новый тип `paywall_abandoned` в `LocalNotificationType` (`notifications.ts:345`).
2. При `paywall_close`/`paywall_continue_free` без покупки — запланировать `triggerInterval(3600)` (1 час).
3. Учесть глобальный кулдаун + не дублировать с D-пушами.

**Фаза C — Winback-скидка (требует RC-настройки, отдельная задача):**
1. Создать в RevenueCat отдельный **winback offering** (со скидкой).
2. Триггер: возврат после 7+ дней неактивности → показать пейвол с winback-офферингом + limited-time.
3. Реальный дедлайн окна (не фальшивый) — Библия Правило 5.

## Тексты по Библии

**Abandoned push** (Стиль 1 Тренер, targeted, ≤10 слов):
```
'Ты почти открыл полный доступ. Твоя серия ждёт.'
'Один шаг до Premium. Продолжим?'
```
> targeted (упоминание серии/прогресса) — 7× open rate.

**Winback (in-app, вернувшемуся)** (Стиль 1 Тренер + 3 Инвестор):
```
Заголовок: 'Ты вернулся. Хорошо.'
Строка:    'Всё твоё на месте. Вот личное предложение.'
Бейдж:     'Твоя цена — ещё {timer}'
CTA:       'Открыть со скидкой'
```
> «Открыть», не «купить». Реальный таймер. Gain-framing.

**D+14 in-app offer** (Стиль 3 Инвестор):
```
'2 недели вместе. Premium теперь выгоднее.'
```

## Файлы:строки + псевдокод

**A. Расширить exit-contexts** — `paywall_trial_offer.ts:35`:
```
const EXIT_TRIAL_CONTEXTS = new Set([
  'course_after_lesson3','no_energy','quiz_limit',
  'intro_ended','streak','trainer_limit',           // + добавить
]);
```

**B. Abandoned push** — `notifications.ts`:
```
// тип (строка ~349): добавить 'paywall_abandoned'
export async function schedulePaywallAbandonedPush(lang, ctxHint) {
  if (!(await claimImmediateNotificationSlot('paywall_abandoned', Date.now()))) return;
  await scheduleNotificationAsync({ content:{...}, trigger: triggerInterval(3600) });
}
```
Вызов — в `premium_modal.tsx` handlePaywallClose (`PaywallCloseReason`, ~2024) если не куплено + был engagement.

**C. Winback** — новая инфра:
```
// app/winback_offer.ts
export async function shouldShowWinback(nowMs): Promise<boolean> {
  const lastActive = Number(await AsyncStorage.getItem('last_active_at')) || 0;
  return (nowMs - lastActive) > 7*24*3600*1000 && !(await getVerifiedPremiumStatus());
}
// RevenueCat: getOfferings() → offerings.all['winback'] (настроить в RC dashboard)
```
Открытие пейвола с `params: { context:'generic', source:'winback', offering:'winback' }`.

## Метрики и A/B
- **События**: `exit_offer_shown{ctx}`, `paywall_abandoned_push_sent`, `paywall_abandoned_push_opened`, `winback_shown`, `purchase_completed{source:abandoned|winback}`.
- **A/B**: каждая фаза отдельно. Главная — incremental revenue от вернувшихся.
- **Стражи**: push opt-out rate (не должен расти), refund rate, overall push volume per user.
- **Анти-каннибализация winback**: следить что скидку не получают те, кто купил бы по полной (только 7+ дней неактивности).

---

# 9. 🟡 Бейдж экономии: статический fallback

## Диагноз
`savingsPct` (`premium_modal.tsx:1983–1989`) считается только из `pricePerMonth` стора. Если поле не пришло (зависит от региона/SDK/конфига) — бейджа `−X%` нет вообще (`premium_modal.tsx:4080–4083`), сигнала выгоды нет.

## Research
- **Annual доминирует в Education: 67%** [D] (RevenueCat SOSA 2025) — годовой план критичен, его выгода должна быть видна всегда.
- Price anchoring на более высокую цену: конверсия −5–8%, ARPU +18–22% [V] (Adapty) — якорь экономии работает.

## За / Против
**За:** дёшево, чинит «слепое пятно» когда стор молчит.
**Против:** статический «~60%» может разойтись с реальным расчётом → нужно держать близко к правде; помечать как «до ~60%».

## Решение
Fallback: если `savingsPct === null`, показать статический бейдж с консервативной формулировкой, вычисленной из известного соотношения month×12 vs year (если обе цены есть, но pricePerMonth нет — посчитать самим из `priceString`).

## Файлы:строки + псевдокод
`premium_modal.tsx:1983–1989` — добавить fallback:
```
const savingsPct = (() => {
  // ... текущий расчёт из pricePerMonth
  if (pct) return pct;
  // fallback: если есть годовая и месячная цена числом
  const y = numericPrice(packages.yearly), m = numericPrice(packages.monthly);
  if (y && m && m*12 > y) return Math.round((1 - y/(m*12))*100);
  return null;
})();
// если всё ещё null И есть только годовой — статическая строка «Выгоднее месячного»
```

## Тексты по Библии
```
'−{N}%'                        // если посчитали
'Выгоднее месячного'           // если число недоступно (Стиль 4, факт без цифры)
```

## Метрики
- `paywall_savings_badge_shown{computed|fallback|none}`. A/B необязателен (явное улучшение), но мерить долю `none` (должна упасть).

---

# 10. 🟡 Цена в день (decoupling) (ОБЪЁМНЫЙ)

## Диагноз
Есть «≈X/месяц» (`premium_modal.tsx:1990–1998`), но нет «X₽ в день» / «дешевле чашки кофе». Это прямой decoupling по Prelec & Loewenstein — **Правило 3 вашей Библии** («никогда не показываем месячную цену без амортизации»).

## Research
- **Per-day framing**: прямых A/B-цифр uplift в открытых данных **нет** [E] — только рекомендация. Food app показывал «$2.49/month» из годовой в редизайне с +72% (multi-factor).
- **Decoupling (Prelec & Loewenstein 1998)** — академически подтверждён [D-academic], в Библии помечен ★★★★★.
- Библия Правило 3 прямо требует: «Меньше 15 рублей в день», «Один кофе = неделя».

## За / Против
**За:** прямое следование Библии; снижает pain-of-paying; дёшево.
**Против:** «чашка кофе»-аналогия рискует звучать шаблонно; валюта/сумма должны быть из стора (не хардкод — урок прошлых правок).

## Решение
1. Вычислять per-day из годовой цены: `yearlyPriceNumeric / 365`.
2. Показывать рядом с годовым планом и в CTA при триале.
3. Аналогию («меньше, чем …») — опционально, локализованно, без хардкода суммы.

## Тексты по Библии (Стиль 3 Инвестор, Правило 3)
```
'≈ 6 ₽ в день'                          // основное, из расчёта
'Меньше, чем стакан кофе в неделю.'     // опц., аналогия (Библия даёт «один кофе»)
```
> Сумма — ВСЕГДА из стора (`numericPrice(packages.yearly)/365`), формат валюты из `priceString`. НЕ хардкодить (урок: `onboarding.tsx` хардкод $4.99/$39.99 уже убран).

## Файлы:строки + псевдокод
`premium_modal.tsx:1990–1998` — добавить:
```
const yearlyPerDay = (() => {
  const y = numericPrice(packages.yearly?.product);
  if (!y) return null;
  const perDay = y / 365;
  return formatStoreCurrency(perDay, packages.yearly.product);  // та же валюта/символ что priceString
})();
const perDayLabel = yearlyPerDay ? LP(`≈ ${yearlyPerDay} в день`, ...) : null;
```
Рендер — в карточке годового плана (`premium_modal.tsx:4034–4186`) под ценой.

## Метрики и A/B
- **A/B**: Control («≈X/месяц») vs Variant («≈X/месяц» + «≈X/день») vs Variant2 (+аналогия).
- **Метрика**: conversion в годовой план, общий conversion. Per-day должен сдвигать выбор к annual.

---

# 11. 🟡 Smart Trainer: lock-preview вместо мгновенного редиректа

## Диагноз
Smart Trainer блокируется мгновенным `router.replace` на пейвол (`trainer_smart_session.tsx:528–534`) — юзер не видит, **что** это за фича и что теряет. Контекст нормализуется в generic `trainer` (`premium_modal.tsx:279`).

## Research
- **«Earned curiosity» preview** (показал→заблокировал→CTA) — паттерн Nami ML / RevenueCat, популярен в news (NYT/Medium) [D-pattern]. Для языковых конкретики мало [E].
- **Hard gates: 12.11% vs freemium 2.18%** [V] — жёсткая стена конвертит, но preview логически >> холодный редирект (нет прямых языковых данных) [E].
- Busuu: feature видна но недоступна (ближайший аналог) [D].

## За / Против
**За:** юзер понимает ценность фичи до пейвола → осознанная конверсия; меньше «что это вообще было».
**Против:** добавляет экран/шаг; если переборщить — фрустрация. Mгновенный редирект проще.

## Решение
1. Вместо `router.replace` на пейвол — показать **lock-screen** Smart Trainer: размытое превью того, что внутри (умный микс), + объяснение ценности (Стиль 4) + CTA.
2. Дать собственный `PremiumContext` `'smart_trainer'` (сейчас → generic) с прицельным PAYWALL_COPY.
3. CTA ведёт на пейвол с этим контекстом.

## Тексты по Библии
**Lock-screen** (Стиль 4 Эксперт + 1 Тренер):
```
Заголовок: 'Умный микс'
Строка:    'Phraseman сам соберёт твои слабые места в одну сессию.'
Превью:    [размытый список тем/слов]
CTA:       'Открыть умный микс'
```
**PAYWALL_COPY.smart_trainer** (новый):
```
titleRu:    'Умный микс — твой тренер'
subtitleRu: 'Сам подбирает, что подтянуть. Каждая сессия — по тебе.'
```
> Библия: «ошибки»→«слабые места», «урок»→«сессия». gain-framing.

## Файлы:строки + псевдокод
**A.** `premium_modal.tsx:119–148` — добавить `'smart_trainer'` в `PremiumContext`; `:279` — убрать нормализацию в trainer; добавить PAYWALL_COPY.smart_trainer.

**B.** `trainer_smart_session.tsx:528–534` — заменить редирект на lock-screen компонент:
```
if (!premium) {
  return <SmartTrainerLockScreen onUnlock={() =>
    router.push({ pathname:'/premium_modal', params:{ context:'smart_trainer', source:'smart_trainer_lock' }})} />;
}
```

## Метрики и A/B
- **A/B**: Control (мгновенный редирект) vs Variant (lock-preview).
- **События**: `smart_trainer_lock_shown`, `smart_trainer_lock_cta`, conversion.
- **Метрика**: conversion из попытки Smart Trainer → purchase. Страж: bounce-rate с lock-screen.

---

# Сквозные принципы для всех правок

1. **Цены — всегда из RevenueCat.** Никакого хардкода (урок: убранный $4.99/$39.99 из onboarding).
2. **Тексты — строго по Библии.** Перед коммитом прогнать по 5 вопросам (Часть VI Библии): глагол в кнопке? gain-framing? нет «цена/купить/подписка»? ≤10 слов? звучит как человек?
3. **gain/endowment, не loss** для всего конверсионного пути. loss-framing разрешён Библией только для streak 7+ — не использовать для intro_ended новичков.
4. **Аналитика прежде A/B.** Сначала зашить недостающие события (`intro_ended_*`, `afterwin_*`, `progress_mirror_*`), собрать 1–2 недели baseline, потом тестировать. PostHog активируется при `EXPO_PUBLIC_POSTHOG_KEY` + `posthog-react-native`.
5. **A/B — детерминированный по userId-хешу** (паттерн `remote_flags.ts`, `EXPO_PUBLIC_*_AB_*`), не random-per-session.
6. **Анти-over-prompting гард** для всех новых upsell-точек (общий кулдаун, не дублировать пейволы в один день).
7. **Стражевые метрики** в каждом A/B: refund rate, D7/D30 retention, push opt-out, App Store review rate. Конверсия не должна расти ценой churn/возвратов.
8. **Производительность**: данные прогресса/перцентилей — async, грузить из кэша, не блокировать рендер пейвола.
9. **Фоллбэки для новичков**: зеркало прогресса / перцентиль скрывать при недостатке данных (пустые числа анти-продают).
10. **Тесты**: на каждый новый модуль (`after_win_upsell_gate`, `paywall_progress_mirror`, `paywall_percentile_line`, `winback_offer`) — unit-тесты по образцу `tests/remote_flags_trainer.test.ts`.

---

# Источники (research)

**Бенчмарки конверсии:**
- [RevenueCat — State of Subscription Apps 2025](https://www.revenuecat.com/state-of-subscription-apps-2025/) / [2026 Education](https://www.revenuecat.com/state-of-subscription-apps-2026-education/) / [2024](https://www.revenuecat.com/state-of-subscription-apps-2024/)
- [Adapty — Education benchmarks](https://adapty.io/blog/education-app-subscription-benchmarks/) / [Trial conversion](https://adapty.io/blog/trial-conversion-rates-for-in-app-subscriptions/) / [High-performing paywall 2026](https://adapty.io/blog/high-performing-paywall-2026/) / [Experiments playbook](https://adapty.io/blog/paywall-experiments-playbook/)
- [RevenueCat — Paywall redesign case studies](https://www.revenuecat.com/blog/growth/paywall-redesigns-case-studies/) / [ASL Bloom +12% ARPU](https://www.revenuecat.com/blog/growth/asl-bloom-applica-case-study/) / [Paywall placement](https://www.revenuecat.com/blog/growth/paywall-placement/) / [Paywalls guide](https://www.revenuecat.com/blog/growth/guide-to-mobile-paywalls-subscription-apps/)
- [Superwall — 17% revenue from abandon paywalls](https://superwall.com/blog/17-revenue-boost-with-transaction-abandon-paywalls-a-case-study/) / [5 paywall patterns](https://superwall.com/blog/5-paywall-patterns-used-by-million-dollar-apps/)
- [Airbridge — Paywall recovery](https://www.airbridge.io/en/blog/what-happens-after-user-rejects-paywall) / [Social proof for apps](https://www.airbridge.io/en/blog/social-proof-for-apps)
- [OneSignal — Mobile benchmarks 2024](https://onesignal.com/mobile-app-benchmarks-2024)
- [Ryan Ashcraft — Paywall optimization +58%](https://ryanashcraft.com/paywall-optimization-success-story/)

**Языковые приложения / паттерны:**
- [Duolingo — 7 monetization lessons (+176%)](https://medium.com/@nicobottaro/monetization-7-lessons-on-how-duolingo-increased-premium-users-by-176-from-3-to-8-8-42e8d63b58f2) / [Year in Review](https://blog.duolingo.com/year-in-review-behind-the-scenes/) / [Streak psychology](https://www.justanotherpm.com/blog/the-psychology-behind-duolingos-streak-feature) / [Retention](https://www.trypropel.ai/resources/duolingo-customer-retention-strategy)
- [Babbel conversion machine](https://thegrowthhackinglab.com/case-studies/how-babbel-hits-3m-monthly-revenue-the-paid-ads-and-conversion-machine-behind-a-language-app/)
- [Adapty — Duolingo paywall library](https://adapty.io/paywall-library/duolingo/)
- [Nami ML — 20 types of paywalls](https://www.nami.ml/blog/20-types-of-mobile-app-paywalls/)

**Store policy / РФ:**
- [Apple App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/) / [Epic anti-steering update](https://developer.apple.com/news/?id=9txfddzf) / [Reader apps](https://developer.apple.com/support/reader-apps/) / [EU DMA](https://developer.apple.com/support/communication-and-promotion-of-offers-on-the-app-store-in-the-eu/)
- [Google Play Payments policy](https://support.google.com/googleplay/android-developer/answer/10281818) / [User Choice Billing](https://support.google.com/googleplay/android-developer/answer/13821247) / [Russia billing paused](https://support.google.com/googleplay/android-developer/answer/11950272) / [RU seller services](https://support.google.com/googleplay/android-developer/answer/15685001)
- [Telegram Stars](https://telegram.org/blog/telegram-stars) / [Bot payments docs](https://core.telegram.org/bots/payments-stars)
- [RuStore vs Google Play vs App Store 2026](https://asoworld.com/en/blog/rustore-vs-google-play-vs-app-store-in-russia-a-side-by-side-aso-comparison-for-2026/)
