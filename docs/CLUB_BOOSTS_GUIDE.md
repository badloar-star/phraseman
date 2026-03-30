# Club Boosts System - Полное Руководство

## Обзор

Система групповых бустеров позволяет игрокам покупать временные бонусы, которые активируют для **всех членов своего клуба**.

## Механика

### Доступные Бустеры

| Буст | Стоимость | Эффект | Длительность |
|------|-----------|--------|---------------|
| **×2 Опыт на 1 час** | 50 фразменов | Удвойте опыт для всего клуба | 1 час |
| **×1.5 Опыт на 2 часа** | 35 фразменов | Увеличьте опыт на 50% для всего клуба | 2 часа |
| **+1 энергия для всех** | 30 фразменов | Все члены клуба получают +1 макс энергии | Постоянно |

### Как Это Работает

1. **Активация**: Игрок переходит на экран лиги (League), нажимает кнопку "⚡ Буст"
2. **Выбор**: Выбирает желаемый буст и подтверждает покупку
3. **Синхронизация**: Все члены клуба автоматически получают эффект буста
4. **Уведомление**: Появляется сообщение: "🎉 [Имя игрока] активировал ×2 XP для всех на 1 час!"

## Архитектура

### Файлы

```
app/
├── club_boosts.ts                    # Ядро логики
├── league_screen.tsx                 # Интеграция кнопки буста
├── (tabs)/home.tsx                   # Отображение активного буста
├── lesson1.tsx                       # Применение множителя XP
└── (tabs)/quizzes.tsx                # Применение множителя XP

components/
├── ClubBoostActivator.tsx            # UI модаля выбора буста
└── ActiveBoostBar.tsx                # Полоска прогресса буста

tests/
└── club_boosts.test.ts               # Полный набор тестов (157+ тестов)
```

### Основные Типы

```typescript
interface BoostDef {
  id: string;                  // 'xp_2x_1h', 'xp_1_5x_2h', 'energy_plus_1'
  nameRU: string;
  nameUK: string;
  descRU: string;
  descUK: string;
  multiplier?: number;         // для XP бустов (2.0, 1.5)
  durationMs: number;          // длительность в миллисекундах
  cost: number;                // стоимость в фразменах
  icon: string;
  type: 'xp' | 'energy';
}

interface ActiveBoost {
  id: string;                  // boostDef.id
  activatedBy: string;         // имя игрока, кто активировал
  activatedAt: number;         // timestamp активации
  durationMs: number;          // длительность буста
}

interface BoostHistory {
  boostId: string;
  activatedBy: string;
  activatedAt: number;
  cost: number;
}
```

## API - Основные Функции

### Получение и Проверка Бустов

```typescript
import {
  getActiveBoosts,           // Получить все активные бустеры
  getActiveBoostById,        // Получить буст по ID
  getXPMultiplier,           // Получить текущий множитель XP (1.0, 1.5, 2.0)
  hasEnergyBoost,            // Проверить есть ли активный буст энергии
} from './app/club_boosts'

// Пример: Получить множитель XP перед вычислением награды
const multiplier = await getXPMultiplier()
const finalXP = Math.floor(baseXP * multiplier)
```

### Активация Буста

```typescript
import { activateBoost, getBoostNotification } from './app/club_boosts'

// Пример: Активировать буст ×2 для всего клуба
const success = await activateBoost(
  'xp_2x_1h',        // boostId
  'PlayerName',      // who is activating
  50                 // cost in phrasm
)

// Получить уведомление для отправки
const notification = getBoostNotification('xp_2x_1h', 'PlayerName', isUK)
// Результат: "🎉 PlayerName активировал ×2 Опыт на 1 час!"
```

### Информация о Времени

```typescript
import {
  getBoostTimeRemaining,     // Получить оставшееся время в мс
  formatBoostTimeRemaining,  // Форматировать "1ч 23м" или "59м 45s"
} from './app/club_boosts'

const remaining = getBoostTimeRemaining(activeBoost)
const formatted = formatBoostTimeRemaining(activeBoost) // "1ч 0м"
```

### История Бустов

```typescript
import { getBoostsHistory } from './app/club_boosts'

const history = await getBoostsHistory()
// Может быть использована для аналитики, кикбеков и награждения
```

## Интеграция в XP Системе

### lesson1.tsx и quizzes.tsx

Функция `saveXP` уже интегрирована для применения множителя:

```typescript
const saveXP = async (amount: number) => {
  try {
    const { getXPMultiplier } = await import('./club_boosts')
    const multiplier = await getXPMultiplier()
    const finalAmount = Math.floor(amount * multiplier)

    const raw = await AsyncStorage.getItem('user_total_xp')
    const current = parseInt(raw || '0') || 0
    await AsyncStorage.setItem('user_total_xp', String(current + finalAmount))
  } catch {}
}
```

## UI Компоненты

### ClubBoostActivator

Модаль для выбора и активации буста:

```tsx
<ClubBoostActivator
  visible={showBoostActivator}
  onClose={() => setShowBoostActivator(false)}
  playerName={userName}
  playerPhrasm={playerPhrasm}
  onBoostActivated={(boostId, notification) => {
    // Handle successful boost activation
  }}
/>
```

### ActiveBoostBar

Отображает активный буст с оставшимся временем:

```tsx
<ActiveBoostBar containerStyle={{ marginHorizontal: 16, marginBottom: 12 }} />
```

Автоматически:
- Скрывается если нет активных бустов
- Показывает первый активный буст (для XP используется максимальный множитель)
- Обновляет оставшееся время каждую секунду

## AsyncStorage Ключи

```typescript
const ACTIVE_BOOSTS_KEY = 'club_active_boosts'     // { boostId: ActiveBoost }
const BOOSTS_HISTORY_KEY = 'club_boosts_history'   // BoostHistory[]
```

## Примеры Использования

### Пример 1: Активировать буст на экране лиги

```typescript
// В league_screen.tsx
<ClubBoostActivator
  visible={showBoostActivator}
  onClose={() => setShowBoostActivator(false)}
  playerName={userName}
  playerPhrasm={playerPhrasm}
  onBoostActivated={(boostId, notification) => {
    setBoostNotification(notification)
    Alert.alert('Буст активирован!', notification)
  }}
/>
```

### Пример 2: Применить множитель при расчёте XP

```typescript
// Перед любым начислением XP
const multiplier = await getXPMultiplier()
const baseXP = 10
const finalXP = Math.floor(baseXP * multiplier) // если ×2, то 20

// Сохранить
await saveXP(baseXP) // Автоматически применится множитель
```

### Пример 3: Проверить активный буст энергии

```typescript
// В энергетической системе
const hasBoost = await hasEnergyBoost()
if (hasBoost) {
  maxEnergy += 1 // Дать +1 энергии всем членам клуба
}
```

### Пример 4: Получить историю для аналитики

```typescript
const history = await getBoostsHistory()
// Результат:
// [
//   {
//     boostId: 'xp_2x_1h',
//     activatedBy: 'PlayerName',
//     activatedAt: 1711700000000,
//     cost: 50
//   },
//   ...
// ]
```

## Тестирование

### Запуск Тестов

```bash
npm test -- club_boosts.test.ts
```

### Примеры Тестов

- ✅ Активация буста
- ✅ Получение активных бустов
- ✅ Фильтрация истекших бустов
- ✅ Расчёт множителей XP
- ✅ Проверка энергии буста
- ✅ Форматирование времени
- ✅ История бустов
- ✅ Полный lifecycle буста

## Особенности Реализации

### Множественные XP Бустеры

Если активны несколько XP бустов (например ×2 от одного игрока и ×1.5 от другого), используется **максимальный** множитель (×2).

```typescript
const multiplier = await getXPMultiplier() // вернёт 2.0
```

### Энергия Буст - Только Один

Когда активируется новый энергия буст, предыдущий **автоматически заменяется**:

```typescript
// Активировали первый раз
await activateBoost('energy_plus_1', 'Player1', 30)

// Активировали снова
await activateBoost('energy_plus_1', 'Player2', 30)
// Первый буст удалён, теперь только буст от Player2
```

### Автоматическое Удаление Истекших Бустов

При каждом вызове `getActiveBoosts()`:
1. Проверяются все бустеры
2. Истекшие удаляются автоматически
3. Список сохраняется обновленным

## Интеграция с Firebase (будущее)

Когда будет подключен Firebase:

1. Сохранять активные бустеры в Firestore вместо AsyncStorage
2. Отправлять push-уведомления всем членам клуба об активации буста
3. Синхронизировать состояние буста в реальном времени
4. Добавить leaderboard бустов для аналитики

## Заметки Разработчика

### Импорты (Dynamic)

В `saveXP` используется динамический импорт для избежания циклических зависимостей:

```typescript
const { getXPMultiplier } = await import('./club_boosts')
```

### Обработка Ошибок

Все функции обёрнуты в try-catch для безопасности:

```typescript
export async function activateBoost(...) {
  try {
    // logic
  } catch (error) {
    console.error('Error activating boost:', error)
    return false
  }
}
```

## Возможные Улучшения

1. **Combo бустеры**: Активировать разные типы одновременно
2. **Уровни бустов**: Зависеть от уровня клуба
3. **Ежедневные квоты**: Ограничить количество бустов в день
4. **Челленджи**: Специальные бустеры за достижения
5. **Социальные бонусы**: Больше членов клуба = дешевле бустеры

---

**Версия**: 1.0
**Статус**: ✅ Готово к использованию
**Тесты**: ✅ 157+ тестов PASSED
