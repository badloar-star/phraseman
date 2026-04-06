# Roadmap развития PhraseMan

## 1. Технические улучшения (Refactoring)

### 1.1 Производительность и оптимизация

#### Проблема: Большой размер home.tsx (825 строк)
**Решение:**
- Вынести баннеры (loginBonus, comebackBanner, repairCard) в отдельный компонент `HomeBanners.tsx`
- Вынести герой-секцию (уровень + цепочка) в `HomeHeroSection.tsx`
- Вынести карточку продолжения урока в `ContinueLessonCard.tsx`
- Вынести сетку быстрого доступа в `QuickAccessGrid.tsx`
- Вынести карточку повторения SRS в `SRSReviewCard.tsx`
- Вынести основную сетку 2×2 в `HomeActionGrid.tsx`

#### Проблема: Множественные useEffect без зависимостей
**Решение:**
```typescript
// Сейчас:
useEffect(() => { loadData(); }); // без зависимостей
useEffect(() => { if (activeIdx === 0) loadData(); }, [activeIdx]);

// Следует: объединить в один useEffect с правильными зависимостями
useEffect(() => {
  if (activeIdx === 0 || langChanged) {
    loadData();
  }
}, [activeIdx, lang, focusTick]);
```

#### Проблема: Частые ререндеры из-за context updates
**Решение:**
- Использовать `useMemo` для вычислений (leagueFromEngine, quickItems, gridItems)
- Использовать `useCallback` для обработчиков (go, showEnergyTooltip, dismissLevelUp)
- Разделить контексты: вынести themeMode-specific данные в отдельный контекст

#### Проблема: Тяжёлые анимации в AnimatedFrame (1067 строк)
**Решение:**
- Вынести каждый тип анимации в отдельную функцию-компонент
- Использовать `useNativeDriver: true` везде, где возможно
- Кэшировать интерполяции (I объект уже хорош, но можно оптимизировать)

### 1.2 Архитектурные улучшения

#### Проблема: Смешение логики и представления
**Решение:**
- Создать хук `useHomeData()` для выноса всей логики из home.tsx
- Создать хук `useLevelUpAnimation()` для анимации level-up
- Создать хук `useEnergyTooltip()` для тултипа энергии

#### Проблема: Магические числа и строки
**Решение:**
```typescript
// Вынести в constants/home.ts
export const HOME_CONFIG = {
  LESSON_COUNT: 32,
  MAX_ENERGY: 5,
  ENERGY_RECOVERY_MS: 30 * 60 * 1000,
  GREETINGS_POOL_SIZE: 61,
  REPAIR_LESSONS_REQUIRED: 2,
  TASKS_PER_DAY: 3,
};
```

#### Проблема: Дублирование кода локализации
**Решение:**
- Создать хук `useHomeLocalization()` для всех локализованных строк в home.tsx
- Использовать `s.home.*` из LangContext вместо хардкода

### 1.3 Типизация и безопасность

#### Проблема: any типы в home.tsx
**Решение:**
```typescript
// Заменить:
const lastLesson = useState<{id:number;name:string;progress:number;score:string}|null>(null);
const [engineLeague, setEngineLeague] = useState<typeof LEAGUES[0] | null>(null);

// На более строгие:
interface LastLesson {
  id: number;
  name: string;
  progress: number;
  score: string;
}
interface LeagueState {
  leagueId: number;
  nameRU: string;
  nameUK: string;
  ionIcon: string;
  color: string;
  imageUri?: any;
}
```

#### Проблема: TypeScript ошибка на line 667 (Image source type)
**Решение:**
```typescript
// Сейчас:
<Image source={engineLeague.imageUri} ... />

// Следует:
{engineLeague?.imageUri && typeof engineLeague.imageUri === 'number' && (
  <Image source={engineLeague.imageUri} ... />
)}
```

## 2. Пять новых механик для изучения английского

### 2.1 Механика 1: "Битва слов" (Word Battle)
**Описание:** Пользователь соревнуется с ИИ или другим пользователем в скорости перевода фраз.
**Реализация:**
- Экран `word_battle.tsx`
- Таймер на каждую фразу (5-10 секунд)
- СистемаELO-рейтинга для подбора соперников
- Награды: XP, медали, уникальные аватары

**Шаги реализации:**
1. Создать `app/word_battle.tsx` с базовым UI
2. Создать `app/battle_engine.ts` с логикой подбора вопросов
3. Добавить `app/battle_matchmaking.ts` для поиска соперника
4. Интегрировать с `hall_of_fame_utils.ts` для рейтинга
5. Добавить в навигацию home.tsx

### 2.2 Механика 2: "Аудио-диктант" (Listening Dictation)
**Описание:** Пользователь слушает фразу и должен её записать.
**Реализация:**
- Экран `dictation.tsx`
- Использование expo-av для воспроизведения аудио
- Проверка с учётом опечаток (levenshtein distance)
- Прогрессивная сложность (от отдельных слов к предложениям)

**Шаги реализации:**
1. Создать `app/dictation.tsx`
2. Создать `app/audio_system.ts` для управления аудио
3. Добавить генерацию аудио через Web Speech API или предзаписанные файлы
4. Создать компонент проверки с подсветкой ошибок
5. Интегрировать с системой XP

### 2.3 Механика 3: "Конструктор предложений" (Sentence Builder)
**Описание:** Пользователь собирает предложение из разрозненных слов в правильном порядке.
**Реализация:**
- Экран `sentence_builder.tsx`
- Drag-and-drop интерфейс
- Разные типы предложений (утвердительные, вопросительные, отрицательные)
- Подсказки с грамматическими правилами

**Шаги реализации:**
1. Создать `app/sentence_builder.tsx`
2. Создать компонент `SentenceWordTile.tsx` с drag-and-drop
3. Добавить базу шаблонов предложений в `app/sentence_templates.ts`
4. Реализовать валидацию порядка слов
5. Добавить систему подсказок

### 2.4 Механика 4: "Социальные группы" (Study Groups)
**Описание:** Пользователи объединяются в группы для совместного изучения.
**Реализация:**
- Экран `study_groups.tsx`
- Лидер группы, общие цели, чат
- Групповые челленджи с общими наградами
- Таблица лидеров между группами

**Шаги реализации:**
1. Создать `app/study_groups.tsx`
2. Создать `app/group_engine.ts` для управления группами
3. Добавить `app/group_chat.tsx` для общения
4. Создать `app/group_challenges.ts` для групповых заданий
5. Интегрировать с системой достижений

### 2.5 Механика 5: "AR-карточки" (Augmented Reality Flashcards)
**Описание:** Карточки с фразами проецируются на реальные объекты через камеру.
**Реализация:**
- Экран `ar_flashcards.tsx`
- Использование expo-camera и expo-gl
- Распознавание объектов (простое, по цветам/формам)
- Контекстные фразы для разных ситуаций (кафе, аэропорт, магазин)

**Шаги реализации:**
1. Создать `app/ar_flashcards.tsx`
2. Настроить expo-camera с наложением UI
3. Создать базу контекстных фраз по локациям
4. Добавить простое распознавание через цветовые маркеры
5. Интегрировать с системой карточек

## 3. UI/UX улучшения главного экрана

### 3.1 Найденные противоречия

#### Проблема 1: Перегруженность информацией
**Наблюдение:** На главном экране одновременно отображаются:
- Уровень + XP прогресс
- Цепочка дней
- 4 быстрые кнопки (Уроки, Диалоги, Квизы, Карточки)
- 4 основные кнопки (Задания, Клуб, Тест, Экзамен)
- Карточка повторения SRS
- Фраза дня
- Баннеры (бонус, возвращение, ремонт стрика)
- Энергия с тултипом

**Решение:**
- Скрыть баннеры после первого просмотра (сохранять в AsyncStorage)
- Свернуть карточку "Продолжить урок" в компактный вид после завершения
- Переместить "Фразу дня" на отдельную вкладку или показывать только по клику
- Объединить быстрые и основные кнопки в единую сетку 3×3

#### Проблема 2: Непонятная навигация
**Наблюдение:** 
- Кнопка "Уроки" ведёт на `index`, но "Продолжить урок" ведёт на `lesson_menu`
- "Квизы" в быстрых кнопках и "Клуб" в основных дублируют премиум-контент
- Нет очевидного способа вернуться на главную из вложенных экранов

**Решение:**
- Унифицировать навигацию: все уроки через `lesson_menu`
- Добавить явную кнопку "На главную" в хедер каждого экрана
- Переименовать "Квизы" → "Тренировки" для ясности

#### Проблема 3: Энергетическая система сбивает с толку
**Наблюдение:**
- Энергия показана в хедере, но неясно, когда она тратится
- Тултип появляется при клике, но исчезает через 3 секунды
- Нет индикации, какие действия тратят энергию

**Решение:**
- Добавить подпись "1 энергия = 1 урок" под иконкой
- Показывать тултип только при первой загрузке (сохранять флаг)
- Показывать подтверждение перед тратой энергии: "Потратить 1 энергию?"

### 3.2 Компоненты для изменения

| Компонент | Изменения |
|-----------|-----------|
| `home.tsx` | Разделить на подсекции, убрать дублирование навигации |
| `EnergyIcon.tsx` | Добавить текстовую подпись, изменить тултип |
| `DailyPhraseCard.tsx` | Сделать сворачиваемой по умолчанию |
| `PremiumCard.tsx` | Добавить варианты размеров (compact, full) |
| `TabContext.tsx` | Добавить метод `showHomeBanner()` для уведомлений |

## 4. Стратегия тестирования

### 4.1 Анализ текущих тестов

В папке `tests/` уже есть 9 тестовых файлов:
- `club_boosts.test.ts`
- `daily_phrase_system.test.ts`
- `energy_system.test.ts`
- `feedback_engine.test.ts`
- `league_engine.test.ts`
- `lesson_lock_system.test.ts`
- `phrasemen_system.test.ts`
- `user_profile.test.ts`
- `variable_reward_system.test.ts`

**Отсутствуют тесты для:**
- `home.tsx` и связанных компонентов
- Контекстов (ThemeContext, LangContext, EnergyContext, TabContext)
- Хуков (use-haptics, use-flashcards, use-user-profile)
- Навигации и маршрутизации
- Интеграционных сценариев

### 4.2 Приоритеты тестирования

#### Уровень 1 (Критично — покрыть в первую очередь)
1. **EnergyContext** — проверка восстановления энергии, траты, премиум-статуса
2. **home.tsx loadData()** — загрузка всех данных при старте
3. **active_recall.getDueItems()** — корректность SRS расчётов
4. **daily_tasks** — генерация и отслеживание ежедневных заданий

#### Уровень 2 (Важно — покрыть во вторую очередь)
5. **ThemeContext** — смена тем, сохранение настроек
6. **LangContext** — переключение языков, получение переводов
7. **TabContext** — навигация между вкладками, focusTick
8. **league_engine** — расчёт лиг, сохранение состояния

#### Уровень 3 (Желательно — покрыть при возможности)
9. **Компоненты UI** — рендеринг без падений
10. **Хуки** — use-haptics, use-flashcards
11. **Интеграционные тесты** — полные сценарии пользователя

### 4.3 План создания тестов

#### Файл 1: `tests/home_screen.test.tsx`
```typescript
describe('HomeScreen', () => {
  describe('loadData', () => {
    it('should load user data from AsyncStorage', async () => {...});
    it('should verify premium status via RevenueCat', async () => {...});
    it('should calculate dueCount from active_recall', async () => {...});
    it('should handle errors gracefully', async () => {...});
  });
  
  describe('rendering', () => {
    it('should render hero section with level and streak', () => {...});
    it('should render quick access buttons', () => {...});
    it('should render action grid', () => {...});
    it('should show SRS card when dueCount > 0', () => {...});
    it('should hide SRS card when dueCount = 0', () => {...});
  });
  
  describe('interactions', () => {
    it('should navigate to lesson on continue button press', () => {...});
    it('should show energy tooltip on energy icon press', () => {...});
    it('should dismiss banners on close button press', () => {...});
  });
});
```

#### Файл 2: `tests/contexts.test.tsx`
```typescript
describe('ThemeContext', () => {
  it('should provide default theme', () => {...});
  it('should toggle between themes', () => {...});
  it('should persist theme selection', async () => {...});
});

describe('LangContext', () => {
  it('should provide translations', () => {...});
  it('should switch language', async () => {...});
  it('should persist language selection', async () => {...});
});

describe('EnergyContext', () => {
  it('should initialize with max energy', () => {...});
  it('should recover energy over time', async () => {...});
  it('should spend energy on action', async () => {...});
  it('should respect premium unlimited energy', async () => {...});
});

describe('TabContext', () => {
  it('should track active tab', () => {...});
  it('should update focusTick on tab change', () => {...});
});
```

#### Файл 3: `tests/hooks.test.tsx`
```typescript
describe('use-haptics', () => {
  it('should call Haptics.selectionAsync when enabled', async () => {...});
  it('should not call when disabled', async () => {...});
  it('should cache haptic setting', async () => {...});
});

describe('use-flashcards', () => {
  it('should add phrase to flashcards', async () => {...});
  it('should remove phrase from flashcards', async () => {...});
  it('should check if phrase is in flashcards', async () => {...});
});
```

#### Файл 4: `tests/integration.test.tsx`
```typescript
describe('User Journey', () => {
  it('should complete full learning session', async () => {
    // 1. Start on home screen
    // 2. Click "Continue lesson"
    // 3. Complete lesson questions
    // 4. See completion screen
    // 5. Return to home with updated progress
    // 6. Verify XP increased, lesson progress saved
  });
  
  it('should handle energy depletion', async () => {
    // 1. Start with 1 energy
    // 2. Start lesson
    // 3. Energy becomes 0
    // 4. Cannot start another lesson
    // 5. Wait for recovery (mock time)
    // 6. Can start lesson again
  });
});
```

### 4.4 Инструменты и настройка

```json
// package.json devDependencies
{
  "@testing-library/react-native": "^12.x",
  "@testing-library/jest-native": "^5.x",
  "jest": "^29.x",
  "jest-expo": "^49.x",
  "react-test-renderer": "^18.x"
}
```

```javascript
// jest.config.js
module.exports = {
  preset: 'jest-expo',
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg)'
  ],
  setupFilesAfterEnv: ['@testing-library/jest-native/extend-expect'],
  moduleNameMapper: {
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$': '<rootDir>/__mocks__/fileMock.js',
  },
};
```

## 5. Календарный план

### Спринт 1 (Неделя 1-2): Технический долг
- [ ] Рефакторинг home.tsx на компоненты
- [ ] Оптимизация ререндеров (useMemo, useCallback)
- [ ] Исправление TypeScript ошибок
- [ ] Вынос констант и локализованных строк

### Спринт 2 (Неделя 3-4): Тестирование
- [ ] Тесты для EnergyContext
- [ ] Тесты для home.tsx
- [ ] Тесты для контекстов
- [ ] Интеграционные тесты

### Спринт 3 (Неделя 5-6): UI/UX улучшения
- [ ] Упрощение навигации
- [ ] Оптимизация баннеров
- [ ] Улучшение энергетической системы
- [ ] A/B тестирование изменений

### Спринт 4 (Неделя 7-10): Новые механики
- [ ] "Битва слов" (MVP)
- [ ] "Аудио-диктант" (MVP)
- [ ] "Конструктор предложений" (MVP)
- [ ] "Социальные группы" (прототип)
- [ ] "AR-карточки" (исследование)