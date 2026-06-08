# PHRASEMAN EXERCISE UI — КАНОНИЧЕСКИЙ СТАНДАРТ v5

> Финальный документ. После него — только имплементация.
> Дата: 2026-06-07. Следующая версия создаётся только при кардинальном редизайне.

---

## 1. ФИЛОСОФИЯ

### Принцип 1: Фраза — единственный герой экрана
Всё визуальное внимание направлено на изучаемую фразу. Вся декорация (фон, рамки, тени) существует чтобы поднять фразу, а не конкурировать с ней. Ни один UI-элемент не должен перетягивать взгляд от текста задания.

### Принцип 2: Тактильность — честный язык интерфейса
Каждое нажатие должно ощущаться физически: 3D-тень кнопки схлопывается при нажатии, карточка светится при выборе, плитка гаснет после использования. Анимация — не украшение, а feedback-петля. Без тактильного отклика пользователь не знает, что произошло.

### Принцип 3: Мотивация важнее точности формулировок
Нет слова "НЕВЕРНО". Есть "Почти!" + правильный ответ. Нет пустого экрана загрузки. Есть streak-счётчик. Каждый экран должен оставлять пользователя в состоянии "хочу ещё" — не "облажался". Дизайн работает на дофаминовую петлю, а не на порицание.

---

## 2. ДИЗАЙН-ТОКЕНЫ

Единственный источник правды. Все компоненты используют только эти значения.

### 2.1 Цвета — Поверхности

| Токен | Hex | Применение |
|---|---|---|
| `surface.background` | `#0F0D13` | Корневой фон приложения |
| `surface.base` | `#16131E` | Главные экраны |
| `surface.card` | `#1E1A2E` | Карточки упражнения |
| `surface.elevated` | `#252035` | Варианты ответа, чипы |
| `surface.overlay` | `#2D2842` | Active/hover состояния |
| `surface.modal` | `#1A1726` | Bottom sheets, модалки |

### 2.2 Цвета — Акцент

| Токен | Значение | Применение |
|---|---|---|
| `accent.primary` | `#7C6FF7` | Кнопки CTA, прогресс-бар, выбранное состояние |
| `accent.muted` | `rgba(124,111,247,0.15)` | Фон выбранного варианта |
| `accent.subtle` | `rgba(124,111,247,0.08)` | Заполненный слот |
| `accent.glow` | `rgba(124,111,247,0.45)` | Shadow на wrapper-карточке |

### 2.3 Цвета — Семантика

| Токен | Значение | Применение |
|---|---|---|
| `semantic.correct` | `#22C55E` | Правильный ответ |
| `semantic.correctMuted` | `rgba(34,197,94,0.12)` | Фон правильного варианта |
| `semantic.correctGlow` | `rgba(34,197,94,0.35)` | Shadow правильного ответа |
| `semantic.error` | `#F87171` | Ошибка (поднятый lightness — не чистый красный) |
| `semantic.errorMuted` | `rgba(248,113,113,0.12)` | Фон неверного варианта |
| `semantic.streak` | `#FB923C` | Стрик-счётчик |
| `semantic.streakMuted` | `rgba(251,146,60,0.15)` | Фон стрик-бейджа |

### 2.4 Цвета — Текст

| Токен | Значение | Применение |
|---|---|---|
| `text.primary` | `#F0EEF8` | Основной текст (off-white с фиолетовым подтоном) |
| `text.secondary` | `#9B98B8` | Вторичный текст, бейджи |
| `text.tertiary` | `#6B6882` | Placeholder, подсказки, ghost-кнопки |
| `text.disabled` | `#3D3A55` | Неактивные элементы |
| `text.onAccent` | `#FFFFFF` | Текст поверх accent-кнопки |
| `text.onCorrect` | `#FFFFFF` | Текст поверх correct-кнопки |

### 2.5 Цвета — Границы

| Токен | Значение | Применение |
|---|---|---|
| `border.subtle` | `rgba(255,255,255,0.06)` | Едва заметные разделители |
| `border.default` | `rgba(255,255,255,0.10)` | Стандарт для карточек |
| `border.medium` | `rgba(255,255,255,0.15)` | Усиленный акцент |
| `border.accent` | `rgba(124,111,247,0.30)` | Выбранное состояние |
| `border.correct` | `rgba(34,197,94,0.40)` | Правильный ответ |
| `border.error` | `rgba(248,113,113,0.40)` | Неверный ответ |

### 2.6 Радиусы

| Токен | px | Применение |
|---|---|---|
| `radius.sm` | 8 | Бейджи, заполненные слоты |
| `radius.md` | 12 | Слот-контейнер |
| `radius.lg` | 16 | Варианты ответа, кнопки (Duolingo standard) |
| `radius.xl` | 20 | Карточки упражнения |
| `radius.full` | 999 | Чипы-слова (pill) |

### 2.7 Отступы

| Токен | px |
|---|---|
| `spacing.xs` | 4 |
| `spacing.sm` | 8 |
| `spacing.md` | 12 |
| `spacing.lg` | 16 |
| `spacing.xl` | 20 |
| `spacing.xxl` | 24 |
| `spacing.xxxl` | 32 |

### 2.8 Типографика

| Роль | fontSize | fontWeight | letterSpacing | lineHeight |
|---|---|---|---|---|
| Фраза (главная) | 28 | 700 | -0.5 | 38 |
| Перевод | 17 | 400 | 0 | 24 |
| Вариант ответа | 16 | 500 | 0.1 | 22 |
| Буква-бейдж | 13 | 700 | 0.5 | — |
| Кнопка CTA | 17 | 700 | 0.8 | — |
| Чип-слово | 15 | 500 | 0.2 | — |
| Метка типа | 11 | 600 | 1.2 | — |
| Feedback-заголовок | 18 | 700 | — | — |

---

## 3. КОМПОНЕНТНАЯ БИБЛИОТЕКА

### 3.1 Карточка упражнения

**Структура:** wrapper (glow-тень) → card (tonal elevation) → контент.

```typescript
// StyleSheet
const exerciseCardStyles = StyleSheet.create({
  wrapper: {
    shadowColor:   '#7C6FF7',
    shadowOffset:  { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius:  24,
    elevation:     12,
    borderRadius:  20,
    marginHorizontal: 16,
  },
  card: {
    backgroundColor: '#1E1A2E',
    borderWidth:     1,
    borderColor:     'rgba(255,255,255,0.15)',
    borderRadius:    20,
    padding:         24,
    shadowColor:     '#000000',
    shadowOffset:    { width: 0, height: 4 },
    shadowOpacity:   0.4,
    shadowRadius:    12,
  },
  typeLabel: {
    fontSize: 11, fontWeight: '600', letterSpacing: 1.2,
    textTransform: 'uppercase', color: '#6B6882', marginBottom: 12,
  },
  phraseText: {
    fontSize: 28, fontWeight: '700', letterSpacing: -0.5,
    lineHeight: 38, color: '#F0EEF8', marginBottom: 8,
  },
  translitText: {
    fontSize: 14, fontWeight: '400', color: '#6B6882',
    fontStyle: 'italic', marginBottom: 16,
  },
  divider: {
    height: 1, backgroundColor: 'rgba(255,255,255,0.06)', marginVertical: 12,
  },
});
```

```jsx
// JSX-шаблон
<View style={exerciseCardStyles.wrapper}>
  <View style={exerciseCardStyles.card}>
    <Text style={exerciseCardStyles.typeLabel}>ПЕРЕВЕДИ ФРАЗУ</Text>
    <Text style={exerciseCardStyles.phraseText}>She is learning English</Text>
    <Text style={exerciseCardStyles.translitText}>Она учит английский</Text>
  </View>
</View>
```

---

### 3.2 Вариант ответа (горизонтальная строка)

**Структура:** Pressable → [badge | text | status-icon]. Только горизонтальные строки — НИКАКИХ квадратных карточек.

```typescript
const optionStyles = StyleSheet.create({
  list: {
    gap: 8, marginTop: 16, paddingHorizontal: 16,
  },
  row: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#252035',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)',
    borderRadius: 16, paddingVertical: 12, paddingHorizontal: 12,
    minHeight: 56,
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25, shadowRadius: 4, elevation: 3,
  },
  rowSelected: {
    backgroundColor: '#2D2842',
    borderColor: 'rgba(124,111,247,0.30)',
    shadowColor: '#7C6FF7', shadowOpacity: 0.3, shadowRadius: 8,
  },
  rowCorrect: {
    backgroundColor: 'rgba(34,197,94,0.12)',
    borderColor: '#22C55E',
    shadowColor: '#22C55E', shadowOpacity: 0.3, shadowRadius: 8,
  },
  rowError: {
    backgroundColor: 'rgba(248,113,113,0.12)',
    borderColor: '#F87171',
    shadowColor: '#F87171', shadowOpacity: 0.2, shadowRadius: 6,
  },
  badge: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)',
    alignItems: 'center', justifyContent: 'center',
    marginRight: 12, flexShrink: 0,
  },
  badgeSelected: {
    backgroundColor: 'rgba(124,111,247,0.15)',
    borderColor: 'rgba(124,111,247,0.30)',
  },
  badgeCorrect: {
    backgroundColor: 'rgba(34,197,94,0.12)',
    borderColor: '#22C55E',
  },
  badgeText: {
    fontSize: 13, fontWeight: '700', letterSpacing: 0.5, color: '#9B98B8',
  },
  badgeTextSelected: { color: '#7C6FF7' },
  optionText: {
    fontSize: 16, fontWeight: '500', letterSpacing: 0.1,
    lineHeight: 22, color: '#F0EEF8', flex: 1,
  },
  optionTextCorrect: { color: '#22C55E' },
  optionTextError:   { color: '#F87171' },
  statusIcon: {
    width: 24, height: 24, marginLeft: 8,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
});
```

```jsx
// JSX-шаблон
<Pressable
  style={({ pressed }) => [
    optionStyles.row,
    isSelected && optionStyles.rowSelected,
    isCorrect  && optionStyles.rowCorrect,
    isError    && optionStyles.rowError,
    pressed    && { opacity: 0.85 },
  ]}
  onPress={onSelect}
>
  <View style={[
    optionStyles.badge,
    isSelected && optionStyles.badgeSelected,
    isCorrect  && optionStyles.badgeCorrect,
  ]}>
    <Text style={[
      optionStyles.badgeText,
      isSelected && optionStyles.badgeTextSelected,
    ]}>
      {letter}
    </Text>
  </View>
  <Text style={[
    optionStyles.optionText,
    isCorrect && optionStyles.optionTextCorrect,
    isError   && optionStyles.optionTextError,
  ]}>
    {text}
  </Text>
  {isCorrect && <CheckIcon size={16} color="#22C55E" />}
  {isError   && <XIcon     size={16} color="#F87171" />}
</Pressable>
```

---

### 3.3 Word Bank Chips (слова-плитки)

```typescript
const chipStyles = StyleSheet.create({
  container: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8,
    paddingHorizontal: 16, marginTop: 12,
  },
  chip: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#252035',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)',
    borderRadius: 999,
    paddingVertical: 6, paddingHorizontal: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3, shadowRadius: 0, elevation: 3,
  },
  chipUsed:   { opacity: 0.35, shadowOpacity: 0, elevation: 0 },
  chipActive: {
    backgroundColor: 'rgba(124,111,247,0.15)',
    borderColor: 'rgba(124,111,247,0.30)',
    shadowColor: '#7C6FF7', shadowOpacity: 0.4, shadowRadius: 6,
  },
  chipText:       { fontSize: 15, fontWeight: '500', letterSpacing: 0.2, color: '#F0EEF8' },
  chipTextActive: { color: '#7C6FF7' },
  // Слоты для собранной фразы
  slotContainer: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 4,
    paddingHorizontal: 16, minHeight: 44, paddingVertical: 8,
    backgroundColor: '#16131E',
    borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
    marginHorizontal: 16, marginBottom: 12,
  },
  slotEmpty: {
    width: 64, height: 28,
    borderBottomWidth: 2, borderBottomColor: '#6B6882',
    borderStyle: 'dashed',
  },
  slotFilled: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(124,111,247,0.08)',
    borderWidth: 1, borderColor: 'rgba(124,111,247,0.30)',
    borderRadius: 8, paddingVertical: 4, paddingHorizontal: 8,
  },
});
```

```jsx
// JSX-шаблон chip
<Pressable
  style={[chipStyles.chip, isUsed && chipStyles.chipUsed, isActive && chipStyles.chipActive]}
  onPress={onTap}
  disabled={isUsed}
>
  <Text style={[chipStyles.chipText, isActive && chipStyles.chipTextActive]}>
    {word}
  </Text>
</Pressable>
```

---

### 3.4 Primary Button (Duolingo 3D tactile)

```typescript
const buttonStyles = StyleSheet.create({
  primary: {
    backgroundColor: '#7C6FF7',
    borderRadius: 16,
    paddingVertical: 14, paddingHorizontal: 32,
    alignItems: 'center', justifyContent: 'center',
    minHeight: 52,
    // 3D-тень — схлопывается при нажатии
    shadowColor: '#4A3FD4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1, shadowRadius: 0, elevation: 6,
  },
  primaryPressed: {
    transform: [{ translateY: 4 }],
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0, elevation: 0,
  },
  primaryCorrect: { backgroundColor: '#22C55E', shadowColor: '#16A34A' },
  primaryError:   { backgroundColor: '#F87171', shadowColor: '#DC2626' },
  secondary: {
    backgroundColor: 'transparent',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 16, paddingVertical: 12, paddingHorizontal: 20,
    alignItems: 'center', minHeight: 48,
  },
  ghost: {
    paddingVertical: 8, paddingHorizontal: 16, alignItems: 'center',
  },
  buttonText:          { fontSize: 17, fontWeight: '700', letterSpacing: 0.8, color: '#FFFFFF' },
  buttonTextSecondary: { fontSize: 17, fontWeight: '700', letterSpacing: 0.8, color: '#9B98B8' },
  buttonTextGhost:     { fontSize: 15, fontWeight: '600', letterSpacing: 0.3, color: '#6B6882' },
});
```

```jsx
// JSX-шаблон
<Pressable
  style={({ pressed }) => [
    buttonStyles.primary,
    isCorrect && buttonStyles.primaryCorrect,
    isError   && buttonStyles.primaryError,
    pressed   && buttonStyles.primaryPressed,
  ]}
  onPress={onPress}
>
  <Text style={buttonStyles.buttonText}>{label.toUpperCase()}</Text>
</Pressable>
```

---

### 3.5 Прогресс-бар

```typescript
const progressStyles = StyleSheet.create({
  container: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12, gap: 12,
  },
  track: {
    flex: 1, height: 8, backgroundColor: '#252035',
    borderRadius: 999, overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: '#7C6FF7',
    borderRadius: 999,
    shadowColor: '#7C6FF7',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6, shadowRadius: 4,
  },
  streakContainer: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  streakText: { fontSize: 14, fontWeight: '700', color: '#FB923C' },
});
```

---

### 3.6 Feedback Banner

```typescript
const feedbackStyles = StyleSheet.create({
  banner: {
    paddingHorizontal: 24, paddingVertical: 20,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    borderWidth: 1,
  },
  bannerCorrect: {
    backgroundColor: 'rgba(34,197,94,0.12)', borderColor: '#22C55E',
  },
  bannerError: {
    backgroundColor: 'rgba(248,113,113,0.12)', borderColor: '#F87171',
  },
  feedbackTitle: { fontSize: 18, fontWeight: '700', marginBottom: 4 },
  feedbackTitleCorrect: { color: '#22C55E' },
  feedbackTitleError:   { color: '#F87171' },
  feedbackSubtext: {
    fontSize: 14, fontWeight: '400', color: '#9B98B8', lineHeight: 20,
  },
});
```

```jsx
// JSX-шаблон
<View style={[
  feedbackStyles.banner,
  isCorrect ? feedbackStyles.bannerCorrect : feedbackStyles.bannerError,
]}>
  <Text style={[
    feedbackStyles.feedbackTitle,
    isCorrect ? feedbackStyles.feedbackTitleCorrect : feedbackStyles.feedbackTitleError,
  ]}>
    {isCorrect ? 'Правильно!' : 'Почти!'}
  </Text>
  <Text style={feedbackStyles.feedbackSubtext}>
    {isCorrect
      ? 'Отличная работа, продолжай!'
      : `Правильный ответ: "${correctAnswer}"`
    }
  </Text>
</View>
```

---

### 3.7 Экран результата (урок завершён)

```typescript
const resultStyles = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: '#0F0D13',
    alignItems: 'center', justifyContent: 'center', padding: 24,
  },
  trophyWrapper: {
    width: 96, height: 96, borderRadius: 999,
    backgroundColor: 'rgba(124,111,247,0.15)',
    borderWidth: 1, borderColor: 'rgba(124,111,247,0.30)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 24,
    shadowColor: '#7C6FF7', shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5, shadowRadius: 32,
  },
  title: {
    fontSize: 32, fontWeight: '700', color: '#F0EEF8',
    letterSpacing: -0.5, textAlign: 'center', marginBottom: 8,
  },
  subtitle: {
    fontSize: 16, fontWeight: '400', color: '#9B98B8',
    textAlign: 'center', marginBottom: 32,
  },
  statsRow: {
    flexDirection: 'row', gap: 12, marginBottom: 32,
  },
  statCard: {
    flex: 1, backgroundColor: '#1E1A2E',
    borderRadius: 16, padding: 16, alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)',
  },
  statValue: { fontSize: 24, fontWeight: '700', color: '#F0EEF8' },
  statLabel: { fontSize: 12, fontWeight: '500', color: '#6B6882', marginTop: 2 },
});
```

---

## 4. РЕЖИМЫ (7 типов упражнений)

### 4.1 Multiple Choice — выбор перевода

```
[Прогресс-бар + стрик]
[Карточка с фразой на иностранном]
[4 варианта — горизонтальные строки A/B/C/D]
[Кнопка ПРОВЕРИТЬ → становится ДАЛЕЕ после ответа]
[Feedback Banner снизу при ответе]
```

**Высота строки варианта:** minHeight 56px. Между вариантами gap 8px.

---

### 4.2 Word Order — собери фразу из слов

```
[Прогресс-бар + стрик]
[Карточка с заданием]
[Слот-контейнер (пустой → заполняется)]
[Банк слов-чипов — wrap layout]
[Кнопка ПРОВЕРИТЬ]
[Feedback Banner]
```

**Поведение:** тап по чипу → переносит в слот. Тап по слоту → возвращает в банк. Использованный чип opacity 0.35.

---

### 4.3 Listening — услышь и выбери

```
[Прогресс-бар + стрик]
[Аудио-карточка с большой кнопкой Play (80×80px, accent-цвет)]
[Подпись "Нажми чтобы прослушать" — text.tertiary]
[4 варианта]
[Кнопка ПРОВЕРИТЬ]
[Feedback Banner]
```

**Play button:** circle 80px, backgroundColor accent.muted, border accent. При воспроизведении — pulse-анимация (scale 1.0→1.08→1.0, 600ms loop).

---

### 4.4 Speaking — произнеси фразу

```
[Прогресс-бар + стрик]
[Карточка с фразой для произношения]
[Микрофон-кнопка (96×96px, круглая)]
[Waveform визуализация при записи]
[Кнопка ОТПРАВИТЬ → ДАЛЕЕ]
[Feedback Banner]
```

**Mic button states:** idle (elevated bg) → recording (error-цвет + pulse) → processing (disabled + spinner).

---

### 4.5 Translation Input — напечатай перевод

```
[Прогресс-бар + стрик]
[Карточка с исходной фразой]
[TextInput — styled под карточку: bg surface.card, border accent при фокусе]
[Подсказка (первая буква) — chip-стиль, ghost]
[Кнопка ПРОВЕРИТЬ]
[Feedback Banner]
```

**TextInput:** minHeight 56px, fontSize 17, padding 16, borderRadius 16. При фокусе: borderColor → border.accent.

---

### 4.6 Matching Pairs — сопоставь пары

```
[Прогресс-бар]
[Заголовок "Соедини пары"]
[Левая колонка (оригинал) | Правая колонка (перевод)]
[Линия-соединитель при выборе]
[Автопроверка при последней паре]
[Анимация победы → Feedback]
```

**Карточки пар:** ширина (screenWidth/2 - 24px), minHeight 48px, borderRadius 12. Выбранная — border.accent. Совпавшая — correct-цвета, scale 0 анимация исчезновения.

---

### 4.7 Cloze — вставь пропущенное слово

```
[Прогресс-бар + стрик]
[Карточка с фразой: пропуск подчёркнут (___)]
[3-4 варианта — горизонтальные строки (как 4.1 но меньше)]
[Кнопка ПРОВЕРИТЬ]
[Feedback Banner]
```

**Пропуск в фразе:** TextStyle underline, color accent.primary, fontSize 28 (одинаков с остальным текстом фразы).

---

## 5. АНИМАЦИИ

### 5.1 Выбор варианта (immediate feedback)
- **Длительность:** 150ms
- **Что:** borderColor и backgroundColor плавно меняются через `Animated.timing` с `useNativeDriver: false`
- **Easing:** `Easing.out(Easing.quad)`

### 5.2 Нажатие кнопки (3D press)
- **Длительность:** 80ms down / 120ms up
- **Что:** `translateY: 0 → 4` при нажатии, обратно при отпускании
- **Реализация:** `Animated.spring` с `useNativeDriver: true`, или через `Pressable` transform

### 5.3 Появление Feedback Banner
- **Длительность:** 250ms
- **Что:** `translateY: 120 → 0` + `opacity: 0 → 1`
- **Easing:** `Easing.out(Easing.back(1.2))` — лёгкий bounce

### 5.4 Правильный ответ — celebration
- **Длительность:** 400ms
- **Что:** карточка варианта scale `1.0 → 1.03 → 1.0` + checkmark появляется через `scale: 0 → 1.2 → 1.0`
- **Delay после feedback:** 100ms

### 5.5 Неверный ответ — shake
- **Длительность:** 400ms total
- **Что:** `translateX: 0 → -8 → 8 → -6 → 6 → -4 → 4 → 0` (horizontal shake)
- **useNativeDriver: true**

### 5.6 Прогресс-бар заполнение
- **Длительность:** 500ms
- **Что:** width через `Animated.timing`
- **Easing:** `Easing.out(Easing.cubic)`
- **Glow:** shadowOpacity синхронно 0.2 → 0.6 → 0.3

### 5.7 Появление экрана (screen transition)
- **Длительность:** 200ms
- **Что:** `opacity: 0 → 1` + `translateY: 12 → 0`
- **Применяется к:** контейнеру карточки упражнения при переходе к следующему вопросу

### 5.8 Chip tap (word bank)
- **Длительность:** 100ms
- **Что:** scale `1.0 → 0.92 → 1.0` при тапе (spring)
- **При перемещении в слот:** opacity fade to 0.35, 200ms

### 5.9 Pulse (аудио-кнопка, mic-кнопка)
- **Длительность:** 600ms loop
- **Что:** scale `1.0 → 1.08 → 1.0`, `Animated.loop(Animated.sequence(...))`

### 5.10 Экран результата
- **Trophy wrapper:** scale `0 → 1.15 → 1.0`, 500ms, `Easing.out(Easing.back(1.5))`
- **Stat cards:** staggered появление: card1 delay 0ms, card2 delay 100ms, card3 delay 200ms
- **Каждый stat card:** translateY `20 → 0` + opacity `0 → 1`, 300ms

---

## 6. ЧЕКЛИСТ КАЧЕСТВА (30 пунктов)

### Цвета и поверхности
- [ ] 1. Фон экрана не чище `#0F0D13` — никакого чистого чёрного
- [ ] 2. Все белые тексты используют `#F0EEF8`, не `#FFFFFF`
- [ ] 3. Все границы через `rgba(255,255,255, 0.06–0.20)`, не hex-серые
- [ ] 4. Акцентный цвет на dark фоне — `#7C6FF7` или светлее, не тёмный фиолетовый
- [ ] 5. Semantic.error — `#F87171` (raised lightness), не `#FF0000` и не `#EF4444`

### Типографика
- [ ] 6. Фраза 28px 700w — всегда, на всех экранах
- [ ] 7. Letter-spacing кнопки — 0.8px
- [ ] 8. Метки типа упражнения — uppercase, 11px, letterSpacing 1.2
- [ ] 9. Нет шрифтов с fontWeight ниже 400 в UI
- [ ] 10. Feedback title — 18px 700w, не мельче

### Компоненты
- [ ] 11. Варианты ответа — только горизонтальные строки, minHeight 56px
- [ ] 12. Буква-бейдж 28×28px, borderRadius 8 (не circle, не square)
- [ ] 13. Все кнопки CTA — borderRadius 16px (Duolingo standard)
- [ ] 14. Primary button имеет 3D bottom-shadow (`shadowOffset: { width: 0, height: 4 }`)
- [ ] 15. Word chips — borderRadius 999 (pill), не 16 и не 8
- [ ] 16. Карточка упражнения — borderRadius 20px

### Состояния
- [ ] 17. Каждый интерактивный элемент имеет минимум 3 состояния: default/selected/result
- [ ] 18. Disabled-состояние — opacity 0.35 или color text.disabled, не скрытие
- [ ] 19. Нажатое состояние кнопки — translateY(4) + убрать shadow
- [ ] 20. Правильный ответ — зелёный border + bg, не только цвет текста

### Feedback и мотивация
- [ ] 21. Нет слова "НЕВЕРНО" или "ОШИБКА" — только "Почти!" с правильным ответом
- [ ] 22. Feedback banner появляется снизу (не alert, не toast вверху)
- [ ] 23. Стрик-счётчик виден на каждом экране упражнения
- [ ] 24. Правильный ответ сопровождается анимацией (scale + checkmark)
- [ ] 25. Неверный ответ сопровождается shake-анимацией (не мигание)

### Анимации
- [ ] 26. Все анимации состояния ≤ 200ms (не дольше — иначе тормозит)
- [ ] 27. Celebration-анимации ≤ 500ms
- [ ] 28. Используется `useNativeDriver: true` везде где возможно (transform, opacity)
- [ ] 29. Нет анимаций без easing (linear выглядит механически)
- [ ] 30. Feedback banner — easing back(1.2) для лёгкого bounce

---

## 7. ЗАПРЕЩЁННЫЕ ПАТТЕРНЫ (20 пунктов)

### Цвета — абсолютные запреты

1. **`backgroundColor: '#000000'`** — минимальный фон `#0F0D13`. Чистый чёрный убивает premium-ощущение.

2. **`color: '#FFFFFF'` для текста** — только `#F0EEF8`. Чистый белый на тёмном фоне — слишком высокий контраст, режет глаза.

3. **`borderColor: '#333333'` или любой hex-серый** — только `rgba(255,255,255, 0.06–0.20)`. Hex-серые не адаптируются к подтонам фона.

4. **Тёмный accent (#4B3FCC и темнее) как основной цвет** — в dark mode акцент должен иметь повышенный lightness. `#7C6FF7` — минимум.

5. **`backgroundColor: '#FFFFFF'` или светлые поверхности** — это light mode. В Phraseman только dark.

### Компоновка — запреты

6. **4 квадратных карточки ABCD в сетке 2×2** — убивает motivation loop, сложно читать. Только горизонтальные строки.

7. **`borderRadius: 0` или `borderRadius < 8`** — острые углы нарушают визуальный язык. Минимум radius.sm = 8px.

8. **Варианты ответа без минимальной высоты** — touch target не менее 56px. Мелкие кнопки = промахи пальцем.

9. **Плоские кнопки без тени** — 3D-тень обязательна для primary CTA. Плоская кнопка не ощущается интерактивной.

10. **Word chips с прямоугольными углами** — только `borderRadius: 999` (pill). Чипы-слова — это органические объекты, не кнопки.

### UX-паттерны — запреты

11. **Текст "НЕВЕРНО", "ОШИБКА", "НЕПРАВИЛЬНО"** — негативный фрейминг ломает мотивацию. Только "Почти!" + показ правильного ответа.

12. **Alert/dialog для feedback** — блокирует экран, нет контекста. Только inline Feedback Banner снизу.

13. **Длинное объяснение задания (> 140 символов)** — пользователь пришёл учить, не читать. Mimo rule: краткий инструктаж.

14. **Скрытие элемента вместо disabled-состояния** — скрытые элементы дезориентируют. Всегда показывай с opacity 0.35.

15. **Переход к следующему вопросу без победной анимации** — пропускает момент дофамина. Всегда: checkmark + scale + 400ms до перехода.

### Техника — запреты

16. **`blur()` без `saturate(180%)`** — glassmorphism без насыщенности выглядит грязно на тёмном фоне.

17. **`useNativeDriver: false` для transform и opacity** — такие анимации идут через JS-bridge, дропают фреймы. Только `useNativeDriver: true`.

18. **Linear easing для UI-анимаций** — механически, нет физики. Всегда `Easing.out(...)` или spring.

19. **Hardcoded hex-цвета в компонентах** — всегда через токены (`tokens.accent.primary`, etc.). Иначе рефакторинг темы = катастрофа.

20. **StyleSheet за пределами модуля токенов без импорта tokens** — любые отступы, размеры, цвета должны идти из `tokens`. Магические числа в компонентах запрещены.

---

## ПРИЛОЖЕНИЕ: Числовые константы для дизайн-брифа

| Параметр | Значение |
|---|---|
| Card border-radius | 20px |
| Button border-radius | 16px |
| Button 3D shadow depth | 4px вниз |
| Option row min-height | 56px |
| Badge size | 28×28px |
| Badge border-radius | 8px |
| Progress bar height | 8px |
| Chip border-radius | 999px (pill) |
| Glow shadowRadius | 16–24px |
| Border opacity range | 6%–20% |
| Feedback title size | 18px 700w |
| Phrase font size | 28px 700w |
| Letter-spacing button | 0.8px |
| Letter-spacing type label | 1.2px |
| Play button size | 80×80px |
| Mic button size | 96×96px |
| Screen transition duration | 200ms |
| Select animation duration | 150ms |
| Press animation duration | 80ms/120ms |
| Celebration animation | 400ms |
| Result trophy animation | 500ms |
