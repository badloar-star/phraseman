# Paywall Redesign Plan — Phraseman
## Цель: дорого, элитно, без скролла, высокая конверсия

---

## Обзор изменений

| Что меняем | Текущее | Новое |
|---|---|---|
| Layout | Скроллируемый экран | Всё влезает без скролла |
| Бенефиты | 9-строчная таблица Free vs Premium | 3-4 главных бенефита + коллапс "ещё N преимуществ" |
| Триал | Exit offer (после закрытия) | Главный CTA — "3 дня бесплатно" |
| Urgency | Нет | "Цена вырастет через 24ч" + реальная doubled цена |
| Дизайн | Один стиль для всех тем | Тема-адаптивные цвета/акценты |
| Plan selector | Два равных варианта | Yearly huge + prominent, monthly small |
| Social proof | Нет | Рейтинг + короткий testimonial |

---

## ФАЗА 0 — Документация и паттерны

**Перед началом кода прочитать:**

1. `app/premium_modal.tsx` — весь render раздел (lines 3157–4300)
2. `components/paywallModalPalette.ts` — палитра (line 1–17)
3. `components/paywallGlass.ts` — стеклянные цвета (line 1–44)
4. `constants/theme.ts` — все ThemeMode и их цвета (line 1–400)
5. `constants/compassTheme.ts` — COMPASS_RICH, COMPASS_GRADIENTS
6. `constants/motion.ts` — MOTION_SPRING_LEGACY (паттерны анимаций)

**Ключевые API (использовать именно их, не изобретать):**
- `paywallGlassColor(color, themeMode, role)` — glassmorphic цвет
- `paywallGlassAlpha(themeMode, role)` — прозрачность по теме
- `useTheme()` → `{ t, themeMode }` — доступ к цветам темы
- `storePriceTrim()`, `storePricePerMonthTrim()` — цены из стора (ТОЛЬКО их, не хардкодить)
- `Animated.Value`, `Animated.timing`, `Animated.loop` — анимации
- `hapticTap()` — тактильный отклик на нажатие
- `PAYWALL_MODAL` (paywallModalPalette.ts) — золотые акценты
- `COMPASS_RICH` (compassTheme.ts) — compass-специфичные цвета

---

## ФАЗА 1 — Urgency система (цена × 2 + таймер)

**Файл:** `app/paywall_urgency.ts` (новый)

### Что реализовать:

**1.1 — Хранение состояния urgency**

```typescript
const URGENCY_SHOWN_AT_KEY = 'paywall_urgency_shown_at_v1';
const URGENCY_DURATION_MS = 24 * 60 * 60 * 1000; // 24 часа
```

- При первом открытии пейвола → записываем timestamp в AsyncStorage
- При повторном открытии → читаем timestamp → считаем оставшееся время
- После истечения 24ч → сбрасываем (новый цикл)

**1.2 — Функция подсчёта оставшегося времени**

```typescript
export async function getUrgencyState(): Promise<{
  isActive: boolean;         // true = urgency в силе
  remainingMs: number;       // сколько мс осталось
  remainingFormatted: string; // "23:47:12"
}>;

export async function activateUrgencyIfNeeded(): Promise<void>;
// Записывает shown_at если не существует (идемпотентно)
```

**1.3 — Функция doubled цены**

```typescript
export function getDoubledPrice(originalPrice: string): string;
// Парсит число из строки стора ("$4.99" → "$9.99", "₽299" → "₽598")
// Multiplier: x2, округлить вверх до целого числа в валюте
// Если парсинг не удался → вернуть originalPrice (fallback)
```

**Важно:** Doubled price — только для отображения urgency label. НЕ передавать в RevenueCat. Реальная цена покупки всегда берётся из стора.

**1.4 — Форматирование таймера**

```typescript
export function formatCountdown(ms: number): string;
// ms → "23:47:12"
// Обновляется через setInterval каждую секунду в компоненте
```

**Верификация фазы:**
- `getUrgencyState()` возвращает `isActive: false` при первом вызове, `isActive: true` после `activateUrgencyIfNeeded()`
- `getDoubledPrice("$4.99")` → `"$9.99"`, `getDoubledPrice("₽299")` → `"₽598"`
- `formatCountdown(86399000)` → `"23:59:59"`
- Если нет цены из стора — не показываем urgency block вообще

---

## ФАЗА 2 — No-scroll layout архитектура

**Файл:** `app/premium_modal.tsx` (рефакторинг purchase view, lines ~3157–4300)

### Что реализовать:

**2.1 — Новая структура purchase view (без ScrollView)**

```
SafeAreaView (flex: 1)
  ├── CloseButton (top-right, absolute)
  ├── HeroBlock (flex: 2.2) — emoji + title + subtitle
  ├── BenefitsPillsBlock (flex: 1.2) — 3 главных бенефита горизонтально
  ├── [ExpandBenefitsButton] — "ещё N преимуществ ▼" (если нажать → Modal)
  ├── SocialProofBar — рейтинг + счётчик пользователей
  ├── PlanSelectorBlock (flex: 1.5) — yearly (большой) + monthly (маленький)
  ├── UrgencyBlock — "⏰ Цена вырастет через HH:MM:SS — потом $X"
  └── CTAButton + legalLinks (bottom)
```

Использовать `flex` вместо фиксированных высот чтобы адаптировалось под экраны.

**2.2 — BenefitsPills (3 главных, горизонтально)**

Заменяет 9-строчную таблицу. Показывать 3 наиболее релевантных для контекста:

```typescript
type BenefitPill = {
  emoji: string;
  label: string; // короткий, 2-3 слова
};

function getTopBenefitsForContext(ctx: PremiumContext, lang: Lang): BenefitPill[];
// arena → [⚡ Безлимит энергии, ⚔️ Дуэли без лимита, 📊 Аналитика]
// no_energy → [⚡ Безлимит энергии, 📚 Все уроки, 🔥 Защита серии]
// course_after_lesson3 → [📚 Все уроки, ⚡ Безлимит, 🔁 Повторы]
// etc — по контексту, наиболее острое — первым
```

Стиль: горизонтальный ряд, каждый pill = `borderRadius: 20`, `paddingHorizontal: 14`, `paddingVertical: 8`, цвет из темы.

**2.3 — ExpandBenefitsModal**

При нажатии "ещё N преимуществ ▼" — показать `Modal` поверх экрана с полным списком (текущие CONTEXT_BENEFITS из premium_modal.tsx).

```typescript
const [benefitsExpanded, setBenefitsExpanded] = useState(false);
// Modal с полным списком benefits, закрывается на кнопку или tap outside
```

**2.4 — SocialProofBar**

```tsx
// Компонент: горизонтальная строка
<View style={...}>
  <Text>★ 4.8</Text>
  <Text>·</Text>
  <Text>{LP('50 000+ учеников', 'uk: ...', 'es: ...')}</Text>
</View>
```

Цифры — статичные (не из API). Обновлять вручную раз в квартал.

**Верификация фазы:**
- На экране 390×844 (iPhone 14) пейвол не требует скролла
- На экране 375×667 (iPhone SE) всё влезает (может быть tight но без скролла)
- На Android 360×800 — без скролла
- Кнопка "ещё N преимуществ" открывает Modal с полным списком

---

## ФАЗА 3 — Тема-адаптивные цвета пейвола

**Файл:** `components/paywallThemeConfig.ts` (новый)

### Что реализовать:

**3.1 — ThemePaywallConfig структура**

```typescript
export interface ThemePaywallConfig {
  // Hero section
  heroAccentColor: string;        // главный акцент заголовка
  heroBg: string[];               // градиент hero секции (2-3 цвета)
  
  // Plan cards
  selectedCardBorder: string;     // цвет рамки выбранного плана
  selectedCardBg: string;         // фон выбранного плана
  unselectedCardBg: string;       // фон невыбранного плана
  savingsBadgeBg: string;         // фон badge "Экономия X%"
  savingsBadgeText: string;       // текст badge
  
  // CTA Button
  ctaBg: string;                  // фон кнопки
  ctaText: string;                // текст кнопки
  ctaShadow: string;              // тень кнопки
  
  // Pills & accents
  pillBg: string;                 // фон benefit pill
  pillText: string;               // текст pill
  pillBorder: string;             // рамка pill
  
  // Urgency block
  urgencyBg: string;              // фон urgency блока
  urgencyText: string;            // текст таймера
  urgencyStrikethrough: string;   // цвет перечёркнутой старой цены
}
```

**3.2 — Конфиги для каждой темы**

```typescript
export const PAYWALL_THEME_CONFIG: Record<ThemeMode, ThemePaywallConfig> = {
  dark: {
    heroAccentColor: '#58CC89',      // зелёный акцент dark темы
    heroBg: ['rgba(0,0,0,0.0)', 'rgba(7,16,10,0.95)'],
    selectedCardBorder: '#58CC89',
    selectedCardBg: 'rgba(88,204,137,0.12)',
    unselectedCardBg: 'rgba(21,32,25,0.86)',
    savingsBadgeBg: '#FFC800',
    savingsBadgeText: '#07100A',
    ctaBg: '#58CC89',
    ctaText: '#07100A',
    ctaShadow: '#58CC89',
    pillBg: 'rgba(88,204,137,0.14)',
    pillText: '#58CC89',
    pillBorder: 'rgba(88,204,137,0.30)',
    urgencyBg: 'rgba(255,200,0,0.10)',
    urgencyText: '#FFC800',
    urgencyStrikethrough: '#6B7C74',
  },
  neon: {
    // cyan/electric акцент neon темы
    heroAccentColor: '#00F5FF',
    ctaBg: '#00F5FF',
    ctaText: '#000',
    // ...
  },
  gold: {
    // богатый золотой
    heroAccentColor: '#FFD700',
    ctaBg: '#FFD700',
    ctaText: '#1A1000',
    // ...
  },
  coral: {
    heroAccentColor: '#FF7C5C',
    ctaBg: '#FF7C5C',
    ctaText: '#fff',
    // ...
  },
  minimalLight: {
    heroAccentColor: '#1A1A1A',
    ctaBg: '#1A1A1A',
    ctaText: '#FFFFFF',
    // ...
  },
  minimalDark: {
    heroAccentColor: '#E8E8E8',
    ctaBg: '#E8E8E8',
    ctaText: '#0A0A0A',
    // ...
  },
  compass: {
    // существующие COMPASS_RICH цвета
    heroAccentColor: COMPASS_RICH.cream,
    ctaBg: COMPASS_RICH.creamSoft,
    ctaText: COMPASS_RICH.textDark,
    // ... (перенести существующую compass-логику)
  },
};

export function getPaywallThemeConfig(themeMode: ThemeMode): ThemePaywallConfig;
```

**3.3 — Применение в premium_modal.tsx**

Заменить все inline `isCompassPaywall ? ... : t.textSecond` на:
```typescript
const paywallTheme = getPaywallThemeConfig(themeMode);
// Везде использовать paywallTheme.ctaBg вместо t.textSecond
```

**Верификация фазы:**
- Переключить тему в настройках → пейвол меняет акценты
- Compass тема визуально не изменилась (существующие цвета)
- Dark тема: зелёный акцент; Gold тема: золотой акцент; Neon: cyan
- Нет `isCompassPaywall` кроме legacy fallback

---

## ФАЗА 4 — Plan selector redesign (Yearly-first)

**Файл:** `app/premium_modal.tsx` (секция plan selector, lines ~3849–4117)

### Что реализовать:

**4.1 — Yearly карточка — большая, prominent**

```tsx
// YEARLY — занимает ~70% высоты блока, большой, с badge
<TouchableOpacity onPress={() => setSelected('yearly')}>
  {/* "POPULAR" / "Лучший выбор" badge сверху */}
  <View style={popularBadge}>
    <Text>🏆 {LP('Лучший выбор', 'uk: Найкращий вибір', 'es: Mejor opción')}</Text>
  </View>
  
  {/* "Экономия 62%" badge — справа вверху */}
  <View style={savingsBadge}>
    <Text>-62%</Text>  {/* вычислять из (monthly*12 - yearly)/monthly*12 */}
  </View>
  
  {/* Цена — большим шрифтом */}
  <Text style={priceText}>{yearlyMonthlyEquivalent} / мес</Text>
  <Text style={billingText}>≈ {yearlyPrice} в год</Text>
  
  {/* Trial: если есть */}
  {hasTrial && <Text>3 дня бесплатно</Text>}
  
  {/* Checkmark если выбран */}
  {selected === 'yearly' && <CheckmarkIcon />}
</TouchableOpacity>

// MONTHLY — маленький, под yearly
<TouchableOpacity onPress={() => setSelected('monthly')}>
  <Text>{monthlyPrice} / мес</Text>
  <Text style={mutedText}>{LP('Без скидки', 'uk: Без знижки', 'es: Sin descuento')}</Text>
</TouchableOpacity>
```

**4.2 — Savings badge расчёт**

```typescript
function calcSavingsPercent(
  yearlyPkg: PurchasesPackage | undefined,
  monthlyPkg: PurchasesPackage | undefined
): number | null;
// Берёт числа из pricePerMonthString (yearly) и priceString (monthly)
// Считает: Math.round((1 - yearlyPerMonth / monthlyPrice) * 100)
// Возвращает null если не удалось распарсить → не показываем badge
```

**4.3 — Yearly карточка ВСЕГДА selected по умолчанию**

Уже есть `useState<Plan>('yearly')` (line 1592) — не менять.
Но визуально yearly должен быть явно prominent: большой шрифт цены, тень, рамка цветом акцента.

**Верификация фазы:**
- Yearly выбран при открытии
- Savings badge показывает корректный процент (проверить на $2.99/мес vs $19.99/год → 44%)
- Если нет цены из стора (loadingPackages) → badge скрыт (не показывать "NaN%")
- Monthly карточка заметно меньше yearly визуально

---

## ФАЗА 5 — Urgency блок в UI

**Файл:** `app/premium_modal.tsx` (добавить UrgencyBlock компонент)

### Что реализовать:

**5.1 — UrgencyBlock компонент**

```tsx
function UrgencyBlock({
  timerFormatted,   // "23:47:12"
  originalPrice,    // из стора: "$19.99"
  doubledPrice,     // из getDoubledPrice(): "$39.99"
  themeMode,
  lang,
}: UrgencyBlockProps) {
  if (!originalPrice || !doubledPrice) return null; // нет цены → не показывать
  
  return (
    <View style={urgencyContainer}>
      {/* Иконка часов + таймер */}
      <Text>⏰</Text>
      <Text style={timerText}>{timerFormatted}</Text>
      
      {/* Текст об ограничении */}
      <Text>{LP('Цена вырастет через', 'uk: Ціна зросте через', 'es: El precio sube en')}</Text>
      
      {/* Перечёркнутая "будущая" цена */}
      <Text style={strikethrough}>{doubledPrice}</Text>
      
      {/* Текущая цена (подсвечена) */}
      <Text style={currentPrice}>{originalPrice}</Text>
    </View>
  );
}
```

**5.2 — Timer hook**

```typescript
function useCountdownTimer(remainingMs: number): string {
  const [formatted, setFormatted] = useState(formatCountdown(remainingMs));
  useEffect(() => {
    const interval = setInterval(() => {
      setFormatted(formatCountdown(remainingMs - (Date.now() - startTime)));
    }, 1000);
    return () => clearInterval(interval);
  }, []);
  return formatted;
}
```

**5.3 — Загрузка urgency state**

В основном `useEffect` пейвола (при mount):
```typescript
const [urgencyState, setUrgencyState] = useState<UrgencyState | null>(null);

useEffect(() => {
  activateUrgencyIfNeeded().then(() => {
    getUrgencyState().then(setUrgencyState);
  });
}, []);
```

**5.4 — Doubled price вычисляется из yearly цены**

```typescript
const doubledYearlyPrice = useMemo(() => {
  if (!yearlyPrice) return null;
  return getDoubledPrice(yearlyPrice);
}, [yearlyPrice]);
```

**Поведение:**
- Показывается только когда `selected === 'yearly'` (годовой план)
- Блок находится между plan selector и CTA кнопкой
- Urgency относится к yearly цене (самая конверсионная точка)
- Если urgency истёк (24ч прошло) → сбрасываем и пересоздаём при следующем открытии

**Верификация фазы:**
- Таймер тикает каждую секунду
- Doubled price = ровно x2 от yearly цены стора
- При переключении на monthly → urgency блок скрывается
- При повторном открытии пейвола в течение 24ч → таймер продолжает с той же точки

---

## ФАЗА 6 — Exit trial offer улучшение

**Файл:** `app/premium_modal.tsx` (exitTrialOffer секция)

### Текущее состояние:
Exit trial offer работает только для `course_after_lesson3`. Показывается после закрытия.

### Что добавить:

**6.1 — Urgency в exit trial offer**

Существующий exit trial Modal (`exitTrialOfferVisible`) дополнить urgency сообщением:

```tsx
// Внутри ExitTrialOfferModal добавить:
<View style={exitUrgencyNote}>
  <Text>
    {LP(
      '⏰ Это предложение действует 24 часа',
      'uk: ⏰ Ця пропозиція діє 24 години',
      'es: ⏰ Esta oferta dura 24 horas',
    )}
  </Text>
</View>
```

**6.2 — Расширить контексты для exit trial**

В `paywall_trial_offer.ts`, функция `shouldShowExitTrialOffer` — добавить контексты:
```typescript
// Было: params.context === 'course_after_lesson3'
// Стало:
const EXIT_TRIAL_CONTEXTS = new Set([
  'course_after_lesson3',
  'no_energy',        // частая боль — показать триал при закрытии
  'quiz_limit',       // тоже частая
]);
return EXIT_TRIAL_CONTEXTS.has(params.context) && ... (остальные условия те же)
```

**Верификация фазы:**
- Exit trial offer появляется при закрытии `no_energy` пейвола (при наличии store trial)
- Urgency текст виден в exit offer Modal
- Логика `hasStoreTrial` не меняется — только контексты расширяются

---

## ФАЗА 7 — quiz_hard/medium/level копи улучшение

**Файл:** `app/premium_modal.tsx` (секция PAYWALL_COPY и CONTEXT_BENEFITS)

### Что изменить:

**7.1 — quiz_hard — aspirational копи**

```typescript
// Заменить PAYWALL_COPY.quiz_hard:
quiz_hard: {
  titleRu: 'Ты дошёл до Hard — иди до конца',
  titleUk: 'Ти дійшов до Hard — йди до кінця',
  titleEs: 'Llegaste a Hard — ve hasta el final',
  subtitleRu: 'Hard и Expert открыты только в Premium. Ты уже доказал серьёзность — держи темп без ограничений.',
  subtitleUk: 'Hard та Expert відкриті лише у Premium. Ти вже довів серйозність — тримай темп без обмежень.',
  subtitleEs: 'Hard y Expert son solo Premium. Ya demostraste que vas en serio: mantén el ritmo sin límites.',
},
```

**7.2 — quiz_medium — промежуточный копи**

```typescript
quiz_medium: {
  titleRu: 'Medium — это ещё не предел',
  titleUk: 'Medium — це ще не межа',
  titleEs: 'Medium no es tu límite',
  subtitleRu: 'Переходи на Hard и Expert без дневных лимитов. Продолжай расти.',
  subtitleUk: 'Переходь на Hard та Expert без денних лімітів. Продовжуй рости.',
  subtitleEs: 'Pasa a Hard y Expert sin límites diarios. Sigue creciendo.',
},
```

**7.3 — Обновить CONTEXT_BENEFITS для quiz_hard**

Заменить 3 generic строки на aspirational:
```typescript
quiz_hard: [
  { ru: 'Hard и Expert — полный доступ', ... },
  { ru: 'Без дневного лимита — сколько хочешь', ... },
  { ru: 'Докажи что можешь лучший результат', ... },
],
```

**Верификация фазы:**
- Открыть пейвол с `context=quiz_hard` — новый заголовок виден
- Открыть с `context=quiz_medium` — свой заголовок
- `context=quiz_level` можно пока оставить generic или тоже обновить

---

## ФАЗА 8 — Финальная полировка и проверка

### 8.1 — Визуальная проверка всех тем

Для каждой из 7 тем проверить:
- [ ] Hero секция использует правильный акцент из `PAYWALL_THEME_CONFIG`
- [ ] CTA кнопка цвет соответствует теме (не везде зелёный)
- [ ] Yearly карточка выделена цветом акцента темы
- [ ] Urgency блок виден и стилизован под тему

### 8.2 — No-scroll проверка (размеры экранов)

- [ ] iPhone SE (375×667) — без скролла
- [ ] iPhone 14 (390×844) — без скролла, комфортно
- [ ] iPhone 14 Pro Max (430×932) — без скролла, нет пустого места
- [ ] Android 360×800 — без скролла

### 8.3 — Urgency логика QA

- [ ] Первое открытие: urgency активируется, таймер ~24:00:00
- [ ] Закрыть и открыть снова (в течение 24ч): таймер продолжает
- [ ] `getDoubledPrice` тест: "$9.99" → "$19.98" (или округлить до "$19.99")
- [ ] Нет цены из стора → urgency блок полностью скрыт

### 8.4 — A/B метрики (firebase)

Добавить события для новых элементов:
```typescript
logPaywallUrgencyShown(context, remainingMs);
logPaywallBenefitsExpanded(context);
logPaywallSavingsBadgeSeen(context, savingsPercent);
```

### 8.5 — Существующие тесты

Проверить что не сломались:
- `tests/premium_modal_hero_layout_contract.test.ts`
- `tests/premium_modal_locale.test.ts`
- `tests/paywall_trial_offer.test.ts`

---

## Порядок выполнения (рекомендуемый)

```
Фаза 1 (urgency логика) → Фаза 3 (тема конфиги) → 
Фаза 4 (plan selector) → Фаза 2 (no-scroll layout) → 
Фаза 5 (urgency в UI) → Фаза 6 (exit trial) → 
Фаза 7 (копи) → Фаза 8 (QA)
```

Фазы 1 и 3 независимы — можно параллельно.
Фаза 2 зависит от Фаз 3 и 4 (нужны конфиги и новый plan selector).
Фаза 5 зависит от Фазы 1 (urgency логика должна существовать).

---

## Антипаттерны (не делать)

- ❌ Хардкодить цены ("$9.99") — только через `storePriceTrim()` из RevenueCat
- ❌ Передавать doubled price в `Purchases.purchasePackage()` — только оригинальная
- ❌ Использовать `ScrollView` в purchase view — layout через flex
- ❌ Изобретать новые функции для цветов — использовать `paywallGlassColor()`
- ❌ Дублировать `isCompassPaywall` логику — перенести в `getPaywallThemeConfig()`
- ❌ Создавать новые AnimatedValue без `useNativeDriver: true`
- ❌ Блокировать `handlePurchase` urgency-кодом — urgency только display-level

---

## Ключевые файлы для изменения

| Файл | Изменение |
|---|---|
| `app/paywall_urgency.ts` | **НОВЫЙ** — urgency state, doubled price, countdown |
| `components/paywallThemeConfig.ts` | **НОВЫЙ** — ThemePaywallConfig для всех тем |
| `app/premium_modal.tsx` | **РЕФАКТОРИНГ** — no-scroll layout, new plan selector, urgency UI |
| `app/paywall_trial_offer.ts` | **РАСШИРЕНИЕ** — добавить контексты для exit trial |
| `components/paywallModalPalette.ts` | Возможно мелкие правки цветов |
