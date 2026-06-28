# Онбординг — правки для роста конверсии (TODO)

> Источник: глубокий многоагентный аудит онбординга 2026-06-28 (69 находок, 8 персон, 24 идеи).
> Решения владельца зафиксированы. **Эти правки трогают `components/onboarding.tsx`,
> `app/_layout.tsx` — на момент написания они редактировались в другой сессии,
> поэтому вынесены сюда. Выполнять, когда файлы свободны.**
>
> Готовые ассеты уже в репозитории (НЕ конфликтуют, можно коммитить отдельно):
> - `assets/audio/ob_correct.mp3` — звук правильного ответа в демо *(может быть заменён по выбору владельца)*
> - `assets/audio/ob_plan_ready.mp3` — звук «Твой план готов»
> - `assets/audio/ob_purchase_success.mp3` — звук успешной оплаты
> - `hooks/use-onboarding-sounds.ts` — готовый хук `useOnboardingSounds()`
> Лицензия звуков: Mixkit (free for commercial use, без атрибуции).

---

## A. Подключить наградные звуки + хаптику (3 пика конверсии)

> ✅ СДЕЛАНО (2026-06-28, другой сессией): `useOnboardingSounds` импортирован
> (onboarding.tsx:63,761), `playPlanReady()` на planResult (1254), `playPurchaseSuccess()`
> на успехе покупки (1719), `playDemoCorrect()` на верном ответе демо (2930).
> Осталось проверить: добавлен ли `hapticSuccess()` рядом со звуками (для полноты петли)
> и `hapticWarning()` на неверный ответ. Ниже — исходная инструкция для справки.

Онбординг сейчас полностью «немой». Хук готов, подключение — несколько строк.

В `components/onboarding.tsx`, внутри `function Onboarding(...)`:

```ts
import { useOnboardingSounds } from '../hooks/use-onboarding-sounds';
import { hapticSuccess } from '../hooks/use-haptics'; // hapticTap уже импортируется как hap
// ...
const { playDemoCorrect, playPlanReady, playPurchaseSuccess } = useOnboardingSounds();
```

Вызвать в трёх местах:

1. **Правильный ответ в демо-квизе** — `onboarding.tsx:2958` (`setDemoCorrect(i === correctIndex)`):
   ```ts
   const ok = i === correctIndex;
   setDemoCorrect(ok);
   if (ok) { playDemoCorrect(); void hapticSuccess(); } else { void hapticWarning(); }
   ```

2. **Правильная сборка фразы (demo2)** — `onboarding.tsx:3026` (`setDemo2Correct(correct)`):
   ```ts
   setDemo2Correct(correct);
   if (correct) { playDemoCorrect(); void hapticSuccess(); } else { void hapticWarning(); }
   ```

3. **Конец анимации «План готов»** — в callback завершения `planLoading`-анимации
   (там, где появляется CTA «План готов»): `playPlanReady(); void hapticSuccess();`

4. **Успешная оплата** — `onboarding.tsx:1733`, заменить `hap();` на:
   ```ts
   playPurchaseSuccess(); void hapticSuccess();
   ```
   (`hap` = `hapticTap` — слабый «тик»; для момента оплаты нужен `hapticSuccess`.)

> Уважать настройку звука пользователя: если в проекте есть глобальный флаг «звук
> выключен» — обернуть вызовы `play*()` им (как сделано для haptics).

---

## B. Включить мини-игру (демо) — «ага-момент» ПЕРЕД пейволом

Демо (`step === 'demo'` квиз «I'm fed up with this job» и `step === 'demo2'`
сборка фразы «Please turn off the TV») полностью реализованы, но **отключены**:
`onboardingSimpleStepForVariant()` (`onboarding.tsx:160-164`) всегда возвращает `'name'`.

**Цель:** дать пользователю интерактивную победу до просьбы денег.

Рекомендуемый вариант — вставить демо МЕЖДУ `planResult` и переходом на пейвол:
- В `openSelectedPlanAbPaywall` (`onboarding.tsx:1563`) перед `onPersonalPlanPaywallStart()`
  сделать заход на `goToStep('demo2')`, а из demo2 по успеху вести на пейвол.
- После победы показать мост к плану: «Это была фраза из твоего плана. Дальше — ещё N».

Минимальная альтернатива (A/B-тест): связать `onboardingSimpleStepForVariant` с
вариантом — для `quiz` вернуть `'demo2'`, чтобы группа реально отличалась.

---

## C. Убрать двойной пейвол → оставить ВНЕШНИЙ `paywall_a/b/c`

**Решение владельца: главный пейвол — внешний `paywall_a/b/c`.**

Сейчас два пейвола:
- `planResult` CTA «Это мой план» (`onboarding.tsx:2312`) → `openSelectedPlanAbPaywall`
  → `onPersonalPlanPaywallStart` → `router.replace('/paywall_a|b|c')` (`_layout.tsx:2145`). **ОСТАВИТЬ.**
- Шаг `planPaywall` (`onboarding.tsx:2330`) — встроенный полный пейвол с ценами и
  inline-покупкой (`handlePaywallPurchase`). **ДУБЛЬ — упростить.**

Действие: убрать у шага `planPaywall` блок выбора план/цена + кнопку покупки;
оставить его как экран «Твой план готов» (превью недель + таймлайн доверия),
а единственную точку оплаты оставить на внешнем `paywall_a/b/c`. Проверить, что
никакой путь не ведёт на `planPaywall` как на покупочный экран
(`goToStep('planPaywall')` / `restore @ onboarding.tsx:1127`).

---

## D. Дочинить локализацию (языки: ru / uk / es — других в онбординге нет)

Другая сессия уже добавила uk/es к `PLAN_GOAL_CHOICES` / `PLAN_LEVEL_CHOICES`
(`titleUk/titleEs/subtitleUk/subtitleEs`). Осталось:

1. **Объекты планов** `PERSONAL_PLAN_ONBOARDING_PLANS` (`onboarding.tsx:444-514`):
   добавить поля `nameUk/nameEs`, `pitchUk/pitchEs`, `outcomeUk/outcomeEs`,
   `levelSubUk/levelSubEs`, `shortUk/shortEs`, `goalUk/goalEs`, `horizonUk/horizonEs`
   и выбирать через `triOb(...)` по `lang`.
2. **Подписи экрана результата** (`onboarding.tsx`): «Дней занятий» (1952),
   «Рекомендуемый старт: {level}» (1984), «Уже к середине срока» (1994) — обернуть в `triOb`.
   Локализовать `dayWord()` (склонение «день/дня/дней») для uk/es.
3. **planLoading** заголовок «Собираем твой план» + пункты чек-листа — в `triOb`.
4. **planPicker** brand/заголовок/подзаголовок + кнопки planDetails — в `triOb`.
5. **auth** подзаголовок: привести uk/es к тёплому тону русского (убрать loss-framing
   «может потеряться прогресс» → выгода «твой путь будет с тобой на любом телефоне»).

---

## E. Вернувшийся после переустановки → авто-restore ДО пейвола

Сейчас восстановление работает (`firebaseAuthUid` в облаке + `Purchases.restorePurchases()`),
но кнопка «Восстановить» спрятана на пейволе (`onboarding.tsx:2519`) — человек доходит
до неё, уже испугавшись ценой.

Действия:
1. При старте онбординга (или сразу после auth-логина) тихо вызвать
   `Purchases.restorePurchases()`. Если есть активная подписка → пропустить пейвол,
   активировать премиум, вести домой. Прогресс подтянется через `restoreFromCloud`.
2. Вынести «Восстановить покупки» на первый экран (`planEntry`) как заметную ссылку,
   а не прятать на пейволе.

---

## F. Перфекционист: конкретика и отличие от конкурентов на пейволе

На внешнем пейволе (`paywall_a/b/c`) добавить блок-витрину с числами и отличием:
- «N недель · 350+ живых фраз · разбор твоих слабых мест» (числа из `selectedPlan.days`).
- Строку-отличие «Не зубрёжка слов, а разговор и разбор ошибок под твою цель»
  (сейчас спрятана в confirm-модалке — вынести на витрину).
- Соц.доказательство: «50 000+ учеников» (реальное число) вместо рискового рейтинга.

---

## G. Прочие быстрые победы (из аудита)

- `planResult` (`onboarding.tsx:2299-2327`): убрать «Продолжить без плана» (escape оставить
  только на пейволе); «Другие планы» сделать мелкой ссылкой, а не кнопкой равного веса.
- Годовой план: показать «−XX%» и «≈ X/мес» + зачёркнутый якорь 12×месяц
  (цвет бейджа уже есть в `paywallThemeConfig.ts`: `savingsBadgeBg`).
- `planResult`: персонализировать — «{Имя}, вот твой маршрут» + резюме выборов
  «Ты выбрал: {цель} · старт {уровень} · {минуты} мин/день».
- `planLevel` (`onboarding.tsx:2171-2202`): добавить поддерживающий подзаголовок
  для неуверенных новичков («короткие шаги, всё с переводом — справится любой»).
- A/B-вход: связать `onboardingEntryStepRef`/`simpleStep` с вариантом
  (`onboarding.tsx:160-164,1082,1093`) ИЛИ убрать мёртвый сплит.
- broadcast-модал: отфильтровать по `onboarding_done` (`app/global_broadcast_modal.ts` /
  `_layout.tsx:1278`), чтобы не выскакивал сразу после онбординга.

---

## Honest психологические приёмы (в рамках правил сторов)

anchoring (якорь цены на годовом) · social proof (число учеников) · IKEA-эффект
(«ты собрал этот план сам») · loss aversion (заблокированные недели с темами) ·
peak-end (яркий пик «План готов» перед пейволом) · reciprocity (первая победа
бесплатно) · default bias (предвыбрать годовой + «10 мин (рекомендуем)»).
