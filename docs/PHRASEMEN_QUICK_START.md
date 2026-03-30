# Система Фразменов - Быстрый старт

## Файлы системы

```
app/
├── phrasemen_system.ts           # Основная логика (низкий уровень)
├── phrasemen_integration.ts      # Интеграция с приложением (высокий уровень)
├── daily_tasks.ts                # Дневные задачи (с phrasemenReward)
└── types/shop.ts                 # Определения товаров

components/
├── PhrasemenDisplay.tsx          # Отображение баланса
└── ShopCard.tsx                  # Карточка товара

tests/
└── phrasemen_system.test.ts      # Тесты

docs/
├── PHRASEMEN_SYSTEM.md           # Полная документация
└── PHRASEMEN_QUICK_START.md      # Этот файл
```

## 5-минутный старт

### 1. Отобразить баланс в UI

```tsx
import { PhrasemenDisplay } from '@/components/PhrasemenDisplay';

export default function Header() {
  return <PhrasemenDisplay style={{ marginRight: 8 }} />;
}
```

### 2. Выдать фразмены за выполненную задачу

```tsx
import { rewardPhrasemenForTask } from '@/app/phrasemen_integration';
import { claimTask } from '@/app/daily_tasks';

export async function handleClaimTask(taskId: string) {
  // 1. Отметить задачу как выполненную
  await claimTask(taskId);

  // 2. Выдать фразмены
  await rewardPhrasemenForTask(taskId);

  // 3. Обновить UI (показать сообщение об получении)
  toast.success('Получено 15 ⭐');
}
```

### 3. Создать экран магазина

```tsx
import { useState, useEffect } from 'react';
import { FlatList, View } from 'react-native';
import { SHOP_ITEMS } from '@/app/types/shop';
import { ShopCard } from '@/components/ShopCard';
import {
  buyEnergy,
  buyXPBooster,
  getAvailableShopActions
} from '@/app/phrasemen_integration';

export default function ShopScreen() {
  const [available, setAvailable] = useState<any>({});
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    loadAvailable();
  }, [refreshKey]);

  async function loadAvailable() {
    const actions = await getAvailableShopActions();
    setAvailable(actions);
  }

  async function handleBuy(itemId: string) {
    let success = false;

    if (itemId === 'energy_small') {
      success = await buyEnergy(5);
    } else if (itemId === 'xp_booster_short') {
      success = await buyXPBooster(30);
    }

    if (success) {
      toast.success('Куплено!');
      setRefreshKey(prev => prev + 1);
    } else {
      toast.error('Недостаточно фразменов');
    }
  }

  const isAffordable = (item: ShopItem) => {
    const mapping: Record<string, boolean> = {
      energy_small: available.canBuySmallEnergy,
      energy_medium: available.canBuyMediumEnergy,
      energy_large: available.canBuyLargeEnergy,
      xp_booster_short: available.canBuyXPBoosterShort,
      xp_booster_medium: available.canBuyXPBoosterMedium,
      xp_booster_long: available.canBuyXPBoosterLong,
      frame_gold: available.canBuyFrameGold,
      frame_diamond: available.canBuyFrameDiamond,
      frame_platinum: available.canBuyFramePlatinum,
      premium_monthly: available.canBuyPremium,
    };
    return mapping[item.id] ?? false;
  };

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <FlatList
        data={SHOP_ITEMS}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <ShopCard
            item={item}
            isAffordable={isAffordable(item)}
            onPress={() => handleBuy(item.id)}
          />
        )}
      />
    </View>
  );
}
```

## Шпаргалка API

```typescript
// ── Получить информацию ───────────────────────────────────────────────────
getPhrasemenBalance()           // текущий баланс
getPhrasemenStats()             // баланс + история
getTransactionHistory(50)       // последние 50 транзакций

// ── Выдать фразмены ──────────────────────────────────────────────────────
rewardPhrasemenForTask(taskId)  // за задачу
checkAndRewardStreakBonus(7)    // за стрик (каждые 7 дней)
checkAndRewardDailyBonus()      // дневной бонус
rewardAdWatch()                 // за просмотр рекламы
rewardReferral(username)        // реферальный бонус

// ── Потратить фразмены ───────────────────────────────────────────────────
buyEnergy(5)                    // +5 энергии (стоит 10)
buyXPBooster(30|60|1440)        // x2 XP на время
buyProfileFrame('gold'|...)     // рамка профиля
buyPremium()                    // 99 фразменов за месяц

// ── Проверить возможности ────────────────────────────────────────────────
getAvailableShopActions()       // что может купить пользователь
```

## Примеры использования

### Пример 1: Награда за дневную активность

```typescript
// Когда пользователь впервые откроет приложение в день
useEffect(() => {
  const setupDaily = async () => {
    const bonusGiven = await checkAndRewardDailyBonus();
    if (bonusGiven) {
      console.log('Дневной бонус выдан');
    }
  };
  setupDaily();
}, []);
```

### Пример 2: Проверка стрика при сохранении

```typescript
async function saveStreak(currentStreak: number) {
  // Сохранить стрик в базу...

  // Проверить бонус
  await checkAndRewardStreakBonus(currentStreak);
}
```

### Пример 3: Покупка энергии с обработкой ошибок

```typescript
async function purchaseEnergy() {
  const success = await buyEnergy(5);

  if (success) {
    // Обновить энергию пользователя
    updateUserEnergy(5);
    showSuccess('Куплено 5 энергии');
  } else {
    showError('Недостаточно фразменов');
  }
}
```

### Пример 4: Получение истории для аналитики

```typescript
async function showPhrasemenHistory() {
  const history = await getTransactionHistory(20);

  const summary = history.reduce((acc, tx) => {
    if (!acc[tx.type]) acc[tx.type] = 0;
    acc[tx.type] += tx.isSpending ? -tx.amount : tx.amount;
    return acc;
  }, {} as Record<string, number>);

  console.log('Фразмены по типам:', summary);
}
```

## Отладка

### Очистить данные (для тестирования)

```typescript
import { clearPhrasemenData } from '@/app/phrasemen_system';

await clearPhrasemenData();
```

### Посмотреть все данные

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';

const data = await AsyncStorage.getItem('phrasemen_state');
console.log(JSON.parse(data || '{}'));
```

## Контрольный список интеграции

- [ ] Добавлен импорт `PhrasemenDisplay` в заголовок приложения
- [ ] При выполнении дневной задачи вызывается `rewardPhrasemenForTask`
- [ ] Создан экран магазина с товарами
- [ ] Функции покупки обновляют баланс пользователя
- [ ] Тесты проходят: `npm test -- tests/phrasemen_system.test.ts`
- [ ] Документация прочитана: `docs/PHRASEMEN_SYSTEM.md`

## Частые вопросы

**Q: Как сделать так, чтобы фразмены синхронизировались на сервер?**
A: Используйте `getTransactionHistory()` и отправьте транзакции на ваш бэкенд для аудита и верификации.

**Q: Можно ли давать фразмены за кастомные события?**
A: Да! Используйте низкоуровневую функцию:
```typescript
import { addPhrasemen } from '@/app/phrasemen_system';
await addPhrasemen(10, 'adjustment', 'Кастомное событие');
```

**Q: Как ограничить покупки (например, максимум 1 премиум в день)?**
A: Ведите счётчик покупок в AsyncStorage и проверяйте его перед покупкой.

**Q: Почему не выдаются фразмены за задачу?**
A: Убедитесь, что:
1. У задачи есть `phrasemenReward > 0`
2. Вызывается `rewardPhrasemenForTask(taskId)`
3. `getPhrasemenBalance()` вернул правильное значение
