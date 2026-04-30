# Карта зависимостей home.tsx

Главный экран `app/(tabs)/home.tsx` (825 строк) — центральный хаб приложения.

## 1. Контексты

| Контекст | Файл | Что предоставляет |
|----------|------|-------------------|
| **useTheme** | `components/ThemeContext.tsx` | `theme`, `isDark`, `themeMode`, `toggle`, `setThemeMode`, `fontSize`, `setFontSize`, `f` |
| **useLang** | `components/LangContext.tsx` | `lang` ('ru'\|'uk'), `s`, `setLang`, `getLeague()` |
| **useEnergy** | `components/EnergyContext.tsx` | `energy` (0-5), `maxEnergy`, `timeUntilNextMs`, `formattedTime`, `isUnlimited`, `restoringPremium`, `spendOne()`, `reload()` |
| **useTabNav** | `app/TabContext.tsx` | `activeIdx`, `goToTab()`, `goHome()`, `focusTick` |

## 2. Навигационные переходы

| Маршрут | Экран |
|---------|-------|
| `index` | Уроки (32 урока) |
| `/dialogs` | Диалоги (20 сценариев) |
| `/(tabs)/quizzes` | Квизы (премиум) |
| `/flashcards` | Карточки |
| `/daily_tasks_screen` | Задания |
| `/league_screen` | Клуб |
| `/diagnostic_test` | Диагностический тест |
| `/exam` | Экзамен |
| `/review` | Повторение (SRS) |
| `/avatar_select` | Аватар |
| `/streak_stats` | Стрики |
| `/premium_modal` | Премиум |
| `/lesson_menu` | Меню урока |

## 3. UI компоненты

| Компонент | Назначение |
|-----------|------------|
| **ScreenGradient** | Фоновый градиент |
| **PremiumCard** | Карточка с проверкой премиума (level 1-3) |
| **CircularProgress** | Круговой прогресс бар |
| **AnimatedFrame** | Анимированная рамка аватара (40+ типов) |
| **LevelBadge** | Бейдж уровня (GIF 1-50) |
| **EnergyIcon** | Иконка энергии с анимацией |
| **DailyPhraseCard** | Карточка фразы дня |

## 4. Модули данных

| Модуль | Функции |
|--------|---------|
| **active_recall.ts** | `getDueItems(limit)`, `SESSION_LIMIT` |
| **daily_tasks.ts** | `getTodayTasks()`, `loadTodayProgress()` |
| **league_engine.ts** | `loadLeagueState()`, `LEAGUES` |
| **hall_of_fame_utils.ts** | `getMyWeekPoints()`, `checkStreakLossPending()`, `getWeekKey()` |
| **streak_repair.ts** | `isRepairEligible()`, `getRepairProgress()` |
| **medal_utils.ts** | `loadAllMedals()`, `countMedals()` |
| **dialogs_data.ts** | `DIALOGS` (20 диалогов) |
| **debug-logger.ts** | `DebugLogger.error()` |
| **config.ts** | `DEV_MODE`, `IS_EXPO_GO` |

## 5. Константы

| Модуль | Экспорты |
|--------|---------|
| **avatars.ts** | `getBestAvatarForLevel()`, `getBestFrameForLevel()`, `getAvatarImageByIndex()` |
| **theme.ts** | `getXPProgress()`, `getLevelFromXP()`, `BASE_FONTS`, `FONT_SCALE` |
| **lessons.ts** | `LESSON_NAMES_RU`, `LESSON_NAMES_UK` |

## 6. Взаимосвязи

- **lesson1.tsx** → импортирует `AddToFlashcard`; home показывает `getDueItems().length`
- **review.tsx** → после сессии `router.back()` → `focusTick` → `getDueItems()` → dueCount=0

## Архитектурная схема

```
home.tsx
├── Контексты: useTheme, useLang, useEnergy, useTabNav
├── Навигация: useRouter (expo-router)
├── Хранилище: AsyncStorage
├── UI: ScreenGradient, PremiumCard, CircularProgress, AnimatedFrame, LevelBadge, EnergyIcon, DailyPhraseCard
├── Данные: active_recall, daily_tasks, league_engine, hall_of_fame_utils, streak_repair, medal_utils, dialogs_data
├── Константы: avatars, theme, lessons
└── RevenueCat: Purchases.getCustomerInfo()
```
