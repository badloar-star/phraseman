# Система Энергии - Быстрый старт

## Что было реализовано?

Полная система энергии для ограничения количества уроков в день:
- Максимум 5 уроков в день (5 единиц энергии)
- +1 энергия каждые 2 часа (автоматически)
- 1 энергия тратится при НАЧАЛЕ урока
- Ошибки в уроке НЕ влияют на энергию

## Файлы

### Основной модуль
**`/app/energy_system.ts`** (177 строк)

Экспортирует:
```typescript
getEnergyState() -> Promise<EnergyState>
checkAndRecover() -> Promise<EnergyState>
spendEnergy(amount?: number) -> Promise<boolean>
addEnergy(amount?: number) -> Promise<EnergyState>
resetEnergyToMax() -> Promise<EnergyState>
getTimeUntilNextRecovery() -> Promise<number>
formatTimeUntilRecovery(ms: number) -> string
```

### Интеграции
1. **`/app/lesson1.tsx`** - проверка энергии перед уроком + модальное окно
2. **`/app/(tabs)/home.tsx`** - UI компонент энергии на главном экране

### Тесты
**`/tests/energy_system.test.ts`** (186 строк)
- 11 unit-тестов
- Все проходят успешно ✓

### Документация
1. **`/docs/ENERGY_SYSTEM.md`** - полная документация API
2. **`/docs/ENERGY_SYSTEM_INTEGRATION.md`** - план интеграции и FAQ

## Как использовать?

### Получить энергию
```typescript
import { getEnergyState } from './app/energy_system';

const state = await getEnergyState();
console.log(`Энергия: ${state.current}/${state.max}`);
```

### Потратить энергию (для уроков)
```typescript
import { spendEnergy } from './app/energy_system';

const success = await spendEnergy(1);
if (!success) {
  console.log('Недостаточно энергии!');
}
```

### Добавить энергию (премиум/достижения)
```typescript
import { addEnergy } from './app/energy_system';

const newState = await addEnergy(1);
```

### Проверить восстановление
```typescript
import { checkAndRecover } from './app/energy_system';

const state = await checkAndRecover();
// Если прошло 2+ часа, энергия восстановится на +1
```

### Узнать время до восстановления
```typescript
import { getTimeUntilNextRecovery, formatTimeUntilRecovery } from './app/energy_system';

const ms = await getTimeUntilNextRecovery();
const formatted = formatTimeUntilRecovery(ms);
console.log(`Энергия восстановится через: ${formatted}`);
// Вывод: "1ч 30м" или "45м"
```

## Как это работает в приложении?

### 1. При открытии урока
- Проверяется текущая энергия
- Если энергии нет (0) → показывается модальное окно
- Если энергия есть → урок загружается и тратится 1 энергия

### 2. На главном экране
- Отображается компонент энергии с прогресс-баром
- Синий прогресс-бар = нормально (3+ энергии)
- Оранжевый = низкая энергия (1-2)
- Красный = нет энергии (0)
- Показывается время до следующего восстановления

### 3. Восстановление
- Проверяется автоматически при каждом фокусе на главный экран
- +1 энергия каждые 2 часа
- Максимум 5 единиц энергии

## Примеры

### Пример 1: Проверить перед началом урока
```typescript
// В lesson1.tsx - loadData():
const energyState = await checkAndRecover();
if (energyState.current <= 0) {
  setShowEnergyModal(true);
  return; // Не загружаем урок
}
// ... загрузить урок ...
await spendEnergy(1);
```

### Пример 2: Отобразить энергию на главном экране
```typescript
// В home.tsx - loadData():
const [energyState, timeToRecovery] = await Promise.all([
  getEnergyState(),
  getTimeUntilNextRecovery(),
]);

setEnergyCurrent(energyState.current);
setEnergyMax(energyState.max);
setTimeUntilRecovery(timeToRecovery);

// В JSX:
<Text>{energyCurrent}/{energyMax}</Text>
<Text>{formatTimeUntilRecovery(timeUntilRecovery)}</Text>
```

### Пример 3: Добавить энергию для премиум
```typescript
// Когда пользователь покупает премиум:
if (isPremium) {
  const state = await addEnergy(2);
  console.log(`Новая энергия: ${state.current}`);
}
```

## Параметры

| Параметр | Значение |
|----------|----------|
| Max Energy | 5 единиц |
| Recovery Interval | 2 часа |
| Cost per Lesson | 1 единица |
| Cost per Wrong Answer | 0 единиц |
| Storage Key | 'energy_state' |

## Поддерживаемые языки

- Русский (ru)
- Украинский (uk)

## Проверки качества

- Синтаксис: ✓ (expo lint)
- Типизация: ✓ (TypeScript)
- Тесты: ✓ (11/11 проходят)
- Документация: ✓ (полная)

## Для разработчиков

### Сброс энергии на максимум (для тестирования)
```typescript
import { resetEnergyToMax } from './app/energy_system';

await resetEnergyToMax();
// Энергия = 5, lastRecoveryTime = сейчас
```

### Запуск тестов
```bash
npm test -- energy_system.test
```

## Дальнейшие расширения

1. **Премиум бонус**: +2 энергии в день вместо +1
2. **Достижения**: За прохождение 50 уроков - восстановить энергию
3. **Быстрое восстановление**: Премиум-фича за 50 монет
4. **Специальные события**: День рождения - полная энергия

## Файлы к ревью

1. `/app/energy_system.ts` - основной модуль (177 строк)
2. `/app/lesson1.tsx` - интеграция проверки энергии
3. `/app/(tabs)/home.tsx` - UI компонент энергии
4. `/tests/energy_system.test.ts` - unit-тесты (11 тестов)
5. `/docs/ENERGY_SYSTEM.md` - полная документация
6. `/docs/ENERGY_SYSTEM_INTEGRATION.md` - план интеграции

## Статус

**ГОТОВО К ПРОДАКШЕНУ** ✓

Все требования выполнены, код протестирован, документация полная.
