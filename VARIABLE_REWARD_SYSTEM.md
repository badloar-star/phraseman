# Variable Reward System (Система Переменных Наград)

## Описание

Система случайных XP бонусов для повышения мотивации пользователя через механику Variable Reward (переменных вознаграждений).

## Принцип работы

При завершении **урока** с оценкой >= 4.5 (all correct) или **квиза** с оценкой >= 70% вероятностно добавляется дополнительный XP сверху базовой суммы.

### Вероятностные тиеры

- **10% шанс**: +0-10 XP (тиер "мало")
- **5% шанс**: +10-20 XP (тиер "среднее")
- **3% шанс**: +20-30 XP (тиер "большое")
- **82% шанс**: 0 XP (нет бонуса)

**Общая вероятность получить хотя бы бонус: 18%**

## Интеграция

### 1. Урок (`app/lesson_complete.tsx`)

При завершении урока:
1. Рассчитывается базовый бонус (500 XP)
2. Применяется `calculateRewardWithBonus()` для расчета переменной награды
3. Если выигран бонус → показывается `BonusXPCard` на экране результата
4. XP сохраняется в `AsyncStorage` и обновляется через `addOrUpdateScore()`

```typescript
// В grantBonus()
const reward = calculateRewardWithBonus(BONUS);
const totalXPToAdd = reward.totalXP;
if (reward.hasBonusWon) {
  setBonusXP(reward.bonusXP);
  setShowBonus(true);
}
```

### 2. Квиз (`app/(tabs)/quizzes.tsx`)

При завершении квиза:
1. Вычисляется процент правильных ответов
2. Если >= 70%: применяется `calculateRewardWithBonus()` к базовому score
3. Если выигран бонус → показывается `BonusXPCard` на финальном экране

```typescript
// В useEffect(done, score)
const reward = calculateRewardWithBonus(score);
if (reward.hasBonusWon) {
  setBonusXP(reward.bonusXP);
  setShowBonus(true);
}
```

## Компоненты

### `app/variable_reward_system.ts`

**Основной модуль** с чистыми функциями для расчета награды.

#### Главные функции

- **`calculateRandomBonus(): number`**
  - Возвращает случайный бонус (0-30 XP)
  - Использует вероятностные тиеры как выше

- **`calculateRewardWithBonus(baseXP: number): XPRewardResult`**
  - Входные данные: базовый XP
  - Выходные данные: объект с baseXP, bonusXP, totalXP, флагом и информацией о тиере

- **`getTierLabel(bonusXP: number): 'small' | 'medium' | 'large' | 'none'`**
  - Вспомогательная функция для определения категории бонуса

### `components/BonusXPCard.tsx`

**UI компонент** анимированной карточки бонуса.

#### Особенности

- **Анимация**: slide-up (снизу вверх) + масштабирование
- **Звук**: позитивный эффект через `Speech.speak()`
- **Хаптика**: `Haptics.impactAsync()` при появлении
- **Автоисчезновение**: через 2 сек или при тапе
- **Цветная система**: разные цвета для разных тиеров
  - Зелёный (#4ADE80): малый бонус
  - Оранжевый (#FB923C): средний бонус
  - Фиолетовый (#A78BFA): большой бонус

#### Props

```typescript
interface BonusXPCardProps {
  bonusXP: number;           // Размер бонуса
  onDismiss: () => void;     // Callback при исчезновении
  position?: 'bottom' | 'center';  // Позиция (по умолчанию bottom)
  duration?: number;         // Время показа в мс (по умолчанию 2000)
}
```

## Тестирование

### Файл: `tests/variable_reward_system.test.ts`

18 тестов покрывают:

1. **calculateRandomBonus()**
   - Возвращает валидное число
   - Соответствует тиер-распределению
   - Вероятности близки к ожидаемым

2. **calculateRewardWithBonus()**
   - Базовый XP не изменяется
   - Общий XP рассчитывается правильно
   - Флаг hasBonusWon корректен
   - bonusInfo присутствует при выигрыше

3. **getTierLabel()**
   - Правильно определяет категорию

4. **Статистическая валидация**
   - ~18% win rate (для выигрыша хотя бы бонуса)
   - Все значения в корректных диапазонах

#### Запуск тестов

```bash
# Все тесты Variable Reward System
npm test -- --testNamePattern="Variable Reward System"

# С отчётом о покрытии
npm run test:coverage -- tests/variable_reward_system.test.ts
```

## Дизайн решения

### Почему Variable Reward?

Переменные вознаграждения (Variable Reward Schedule) согласно психологии:
- Более аддиктивны чем предсказуемые награды
- Повышают мотивацию к повторению действия
- Создают позитивное ожидание

### Почему эти вероятности?

- **10%**: достаточно частая (1 из 10) чтобы почувствовать сюрприз
- **5%**: редкая (1 из 20) чтобы ценить больше
- **3%**: супер редкая (1 из 33) для эпических моментов
- **82%** без бонуса: остаётся "нормальной" базой

## Интеграция с существующей системой

### XP сохранение

Использует существующий механизм:
- `AsyncStorage.setItem('user_total_xp', ...)`
- `addOrUpdateScore(name, xp, lang)` из `hall_of_fame_utils`
- Совместимо с Уровнями и Медалями

### Ачивки и Задания

Бонус учитывается в общем XP:
- Пересчитывается прогресс уровня
- Считается в дневных заданиях
- Влияет на достижения

## Примеры использования

### Урок (после завершения)

```typescript
import { calculateRewardWithBonus } from './variable_reward_system';

const BONUS = 500;
const reward = calculateRewardWithBonus(BONUS);

// reward = {
//   baseXP: 500,
//   bonusXP: 15,           // если выигран
//   totalXP: 515,
//   hasBonusWon: true,
//   bonusInfo: {
//     tier: 'medium',
//     percentage: 5,
//     range: '10-20'
//   }
// }

if (reward.hasBonusWon) {
  setShowBonus(true);
  setBonusXP(reward.bonusXP);
}
```

### Квиз (при >= 70%)

```typescript
const reward = calculateRewardWithBonus(score);
if (reward.hasBonusWon) {
  // Показать карточку бонуса
  setShowBonus(true);
  setBonusXP(reward.bonusXP);
}
```

## Возможные расширения

1. **Комбо-бонусы**: увеличить вероятность если серия побед
2. **Временные буфы**: удвоить бонусы на выходные
3. **Социальное**: показать друзьям выигрыш бонуса
4. **Аналитика**: отслеживать статистику выигрышей
5. **Персонализация**: разные вероятности для разных уровней сложности

## Заметки для разработчика

- Система полностью детерминирована для тестирования
- Нет зависимостей от сервера
- Работает оффлайн
- Анимация использует `Animated.Value` для производительности
- `BonusXPCard` может переиспользоваться для других типов бонусов

## История версий

- **v1.0** (2026-03-29): Начальная реализация
  - Поддержка уроков и квизов
  - 3-тиерная система вероятностей
  - Анимированная UI карточка
  - 18 тестов с полным покрытием
