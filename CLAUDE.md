# PhraseMan

## Описание проекта

**PhraseMan** — это мобильное образовательное приложение для изучения английского языка, сфокусированное на запоминании фразовых глаголов и идиом. Приложение построено на React Native + Expo с использованием TypeScript.

## Краткая структура проекта

```
phraseman/
├── app/                    # Основное приложение (React Native + Expo Router)
│   ├── (tabs)/            # Вкладки навигации
│   ├── achievements*      # Достижения
│   ├── daily_phrase*      # Система ежедневных фраз
│   ├── energy_system*     # Система энергии
│   ├── flashcards*        # Карточки для запоминания
│   ├── exam*              # Тестирование
│   ├── dialogs*           # Диалоги
│   ├── hint*              # Подсказки
│   ├── diagnostic_test*   # Диагностический тест
│   └── ...                # Другие экраны и модули
├── components/            # Переиспользуемые UI компоненты
├── constants/             # Константы приложения
├── hooks/                 # Кастомные React хуки
├── scripts/               # Скрипты для генерации данных и утилит
├── tests/                 # Тесты
├── assets/                # Статические ресурсы (изображения, шрифты)
├── docs/                  # Документация
├── package.json           # Зависимости проекта
├── tsconfig.json          # Конфигурация TypeScript
└── app.json               # Конфигурация Expo
```

## Карта зависимостей home.tsx

Главный экран `app/(tabs)/home.tsx` (825 строк) — центральный хаб приложения, агрегирующий данные со всех модулей.

### 1. Контексты (глобальное состояние)

| Контекст | Файл | Что предоставляет | Использование в home.tsx |
|----------|------|-------------------|-------------------------|
| **useTheme** | `components/ThemeContext.tsx` | `theme` (цвета), `isDark`, `themeMode`, `toggle`, `setThemeMode`, `fontSize`, `setFontSize`, `f` (размеры шрифтов) | Все стили, цвета, тени, шрифты |
| **useLang** | `components/LangContext.tsx` | `lang` ('ru'\|'uk'), `s` (строки переводов), `setLang`, `getLeague()` | Локализация UI, названия лиг |
| **useEnergy** | `components/EnergyContext.tsx` | `energy` (0-5), `maxEnergy`, `timeUntilNextMs`, `formattedTime`, `isUnlimited`, `restoringPremium`, `spendOne()`, `reload()` | Отображение энергии, таймер восстановления |
| **useTabNav** | `app/TabContext.tsx` | `activeIdx`, `goToTab()`, `goHome()`, `focusTick` | Навигация между вкладками, обновление данных при фокусе |

### 2. Навигационные переходы (router.push / goToTab)

| Маршрут | Экран | Описание |
|---------|-------|----------|
| `index` | Уроки | Список из 32 уроков |
| `/dialogs` | Диалоги | 20 диалоговых сценариев |
| `/(tabs)/quizzes` | Квизы | 3 уровня квизов (премиум) |
| `/flashcards` | Карточки | Сохранённые фразы |
| `/daily_tasks_screen` | Задания | 3 ежедневных задания |
| `/league_screen` | Клуб | Экран лиги/клуба недели |
| `/diagnostic_test` | Тест | Диагностический тест (20 вопросов) |
| `/exam` | Экзамен | Итоговый экзамен по урокам |
| `/review` | Повторение | SRS сессия (active_recall) |
| `/avatar_select` | Аватар | Выбор аватара и рамки |
| `/streak_stats` | Стрики | Статистика серий |
| `/premium_modal` | Премиум | Модальное окно подписки |
| `/lesson_menu` | Меню урока | Детали конкретного урока |

### 3. UI компоненты (из `components/`)

| Компонент | Назначение | Зависимости |
|-----------|------------|-------------|
| **ScreenGradient** | Фоновый градиент на весь экран | `useTheme`, `expo-linear-gradient` |
| **PremiumCard** | Объёмная карточка с проверкой премиума (level 1-3) | `useTheme`, `hapticTap`, `expo-linear-gradient` |
| **CircularProgress** | Круговой прогресс бар (процент внутри) | Чистый React Native (View, Text) |
| **AnimatedFrame** | Анимированная рамка аватара (40+ типов анимации) | `useTheme` (через LevelBadge), `constants/avatars` |
| **LevelBadge** | Бейдж уровня (GIF 1-50) | `expo-image`, `assets/images/levels/` |
| **EnergyIcon** | Иконка энергии с анимацией (заполнена/пуста) | `assets/images/levels/ENERGY_*.png` |
| **DailyPhraseCard** | Карточка фразы дня (расширяемая) | `useTheme`, `useLang`, `daily_phrase_system`, `AddToFlashcard` |

### 4. Модули данных и утилиты (из `app/`)

| Модуль | Экспортируемые функции | Назначение |
|--------|----------------------|------------|
| **active_recall.ts** | `getDueItems(limit)`, `SESSION_LIMIT` | SRS алгоритм (SM-2), возврат фраз на повторение |
| **daily_tasks.ts** | `getTodayTasks()`, `loadTodayProgress()` | 3 ежедневных задания, прогресс выполнения |
| **league_engine.ts** | `loadLeagueState()`, `LEAGUES` (массив лиг) | Текущая лига пользователя, данные лиг |
| **hall_of_fame_utils.ts** | `getMyWeekPoints()`, `checkStreakLossPending()`, `getWeekKey()` | Очки недели, проверка потери стрика |
| **streak_repair.ts** | `isRepairEligible()`, `getRepairProgress()` | Право на восстановление стрика, прогресс |
| **medal_utils.ts** | `loadAllMedals()`, `countMedals()` | Медали пользователя (бронза/серебро/золото) |
| **dialogs_data.ts** | `DIALOGS` (массив из 20 диалогов) | Данные для разблокировки при level-up |
| **debug-logger.ts** | `DebugLogger.error()` | Логирование ошибок (warning level) |
| **config.ts** | `DEV_MODE`, `IS_EXPO_GO` | Флаги разработки и среды |

### 5. Константы (из `constants/`)

| Модуль | Экспортируемые функции/значения | Назначение |
|--------|--------------------------------|------------|
| **avatars.ts** | `getBestAvatarForLevel()`, `getBestFrameForLevel()`, `getAvatarImageByIndex()` | Аватары и рамки по уровню |
| **theme.ts** | `getXPProgress()`, `getLevelFromXP()`, `BASE_FONTS`, `FONT_SCALE` | Расчёт уровня (1-50) из XP, прогресс до следующего |
| **lessons.ts** | `LESSON_NAMES_RU`, `LESSON_NAMES_UK` | Названия 32 уроков на RU/UK |

### 6. Хуки (из `hooks/`)

| Хук | Экспортируемые функции | Назначение |
|-----|----------------------|------------|
| **use-haptics.ts** | `hapticTap()` (функция, не хук) | Тактильный отклик при нажатии (использует `expo-haptics`) |

### 7. Взаимосвязи с другими экранами

| Экран | Связь с home.tsx |
|-------|-----------------|
| **lesson1.tsx** | Импортирует `AddToFlashcard`; home показывает `getDueItems().length` |
| **review.tsx** | После сессии: `router.back()` → `focusTick` → `getDueItems()` → `dueCount=0` → карточка "Повторить сегодня" исчезает |

### 8. Архитектурная схема

```
home.tsx (центральный хаб)
├── Контексты: useTheme, useLang, useEnergy, useTabNav
├── Навигация: useRouter (expo-router)
├── Хранилище: AsyncStorage (пользователь, прогресс, премиум)
├── UI компоненты: ScreenGradient, PremiumCard, CircularProgress, AnimatedFrame, LevelBadge, EnergyIcon, DailyPhraseCard
├── Модули данных: active_recall, daily_tasks, league_engine, hall_of_fame_utils, streak_repair, medal_utils, dialogs_data
├── Константы: avatars, theme, lessons
├── Утилиты: debug-logger, config, use-haptics
└── RevenueCat: Purchases.getCustomerInfo() (верификация премиума)
```

## Ключевые особенности

- **Система ежедневных фраз** — ежедневное изучение новых фразовых глаголов
- **Система энергии** — ограничение количества попыток для мотивации
- **Карточки для запоминания** — интервальные повторения
- **Тестирование и экзамены** — проверка знаний
- **Диалоги** — контекстное использование фраз
- **Достижения** — геймификация обучения
- **Подсказки** — помощь при затруднениях

## Как использовать этот файл

**ВАЖНО**: Этот файл (CLAUDE.md) следует использовать как **основной контекст** при работе с проектом. Вместо того чтобы перечитывать всю структуру проекта каждый раз, обращайся к этому файлу для быстрого понимания:

1. Что это за приложение (PhraseMan)
2. Основная архитектура и структура проекта
3. Ключевые особенности и модули

При необходимости углубиться в конкретный модуль или компонент, читай соответствующие файлы в папках `app/`, `components/` или других директориях, указанных выше.

## Технологии

- **React Native + Expo** — кроссплатформенная мобильная разработка
- **TypeScript** — типизация JavaScript кода
- **Expo Router** — файловая маршрутизация
- **Node.js** — серверная часть и скрипты

## Запуск проекта

```bash
# Установка зависимостей
npm install

# Запуск проекта
npx expo start
```

## Дополнительные документы

- `README.md` — основная документация проекта
- `PHRASEMEN_IMPLEMENTATION.md` — детали реализации
- `DAILY_PHRASE_SYSTEM_GUIDE.md` — руководство по системе ежедневных фраз
- `ENERGY_SYSTEM_QUICKSTART.md` — быстрый старт системы энергии
- `ROADMAP_RETENTION.md` — дорожная карта развития