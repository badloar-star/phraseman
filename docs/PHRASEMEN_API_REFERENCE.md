# API Справочник - Система Фразменов

## Импорты

```typescript
// Основная система
import {
  getPhrasemenBalance,
  addPhrasemen,
  spendPhrasemen,
  getTransactionHistory,
  getPhrasemenStats,
  setLastDailyBonus,
  getLastDailyBonus,
  clearPhrasemenData,
} from '@/app/phrasemen_system';

// Интеграция с приложением
import {
  rewardPhrasemenForTask,
  checkAndRewardStreakBonus,
  checkAndRewardDailyBonus,
  buyEnergy,
  buyXPBooster,
  buyProfileFrame,
  buyPremium,
  rewardAdWatch,
  rewardReferral,
  getAvailableShopActions,
} from '@/app/phrasemen_integration';

// Типы и данные
import {
  SHOP_ITEMS,
  getShopItemById,
  getShopItemsByCategory,
} from '@/app/types/shop';

// Компоненты
import { PhrasemenDisplay } from '@/components/PhrasemenDisplay';
import { ShopCard } from '@/components/ShopCard';
```

## Основная система (`phrasemen_system.ts`)

### getPhrasemenBalance()

Получить текущий баланс фразменов пользователя.

```typescript
const balance = await getPhrasemenBalance();
console.log(`Баланс: ⭐ ${balance}`);
```

**Возвращает:** `Promise<number>`
**Побочные эффекты:** None

---

### addPhrasemen()

Добавить фразмены пользователю (заработок).

```typescript
await addPhrasemen(50, 'daily_task', 'Награда за задачу');
```

**Параметры:**
- `amount: number` — количество (не может быть отрицательным)
- `type: TransactionType` — тип транзакции
- `reason: string` — описание для истории

**Возвращает:** `Promise<void>`
**Выбрасывает:** Error если amount < 0
**Побочные эффекты:** Сохраняет в AsyncStorage

---

### spendPhrasemen()

Потратить фразмены (возвращает, удалась ли операция).

```typescript
const success = await spendPhrasemen(25, 'energy_purchase', 'Энергия +5');

if (success) {
  console.log('Успешно потрачено 25 фразменов');
} else {
  console.log('Недостаточно средств');
}
```

**Параметры:**
- `amount: number` — количество
- `type: TransactionType` — тип расхода
- `reason: string` — описание

**Возвращает:** `Promise<boolean>` — true если успешно, false если недостаточно
**Выбрасывает:** Error если amount < 0
**Побочные эффекты:** Сохраняет в AsyncStorage

---

### getTransactionHistory()

Получить историю транзакций (сортировка: новые первыми).

```typescript
const transactions = await getTransactionHistory(50);

transactions.forEach(tx => {
  console.log(`${tx.type}: ${tx.isSpending ? '-' : '+'} ${tx.amount}`);
});
```

**Параметры:**
- `limit?: number` — максимально транзакций (default: 100)

**Возвращает:** `Promise<Transaction[]>`

**Transaction структура:**
```typescript
{
  id: string;              // уникальный ID
  type: TransactionType;   // тип (daily_task, energy_purchase и т.д.)
  amount: number;          // сумма
  reason: string;          // описание
  timestamp: number;       // когда произошла (Date.now())
  isSpending: boolean;     // это трата или заработок
}
```

---

### getPhrasemenStats()

Получить статистику по фразменам.

```typescript
const stats = await getPhrasemenStats();
console.log(`Баланс: ${stats.balance}`);
console.log(`Всего заработано: ${stats.totalEarned}`);
console.log(`Всего потрачено: ${stats.totalSpent}`);
console.log(`Транзакций: ${stats.transactionCount}`);
```

**Возвращает:**
```typescript
Promise<{
  balance: number;
  totalEarned: number;
  totalSpent: number;
  transactionCount: number;
}>
```

---

### setLastDailyBonus() / getLastDailyBonus()

Управление дневным бонусом (для отслеживания 24-часового интервала).

```typescript
// Сохранить текущее время
await setLastDailyBonus(Date.now());

// Получить время последнего бонуса
const lastTime = await getLastDailyBonus();

if (lastTime) {
  const dayInMs = 24 * 60 * 60 * 1000;
  const timePassed = Date.now() - lastTime;

  if (timePassed > dayInMs) {
    console.log('Можно выдать дневной бонус');
  }
}
```

**Возвращает:** `Promise<number | undefined>`

---

### clearPhrasemenData()

Очистить все данные фразменов (только для тестирования!).

```typescript
if (__DEV__) {
  await clearPhrasemenData();
}
```

**Возвращает:** `Promise<void>`

---

## Интеграция (`phrasemen_integration.ts`)

### rewardPhrasemenForTask()

Выдать фразмены за выполненную дневную задачу.

```typescript
await rewardPhrasemenForTask('da1');
// Ищет task с ID 'da1' и выдаёт phrasemenReward
```

**Параметры:**
- `taskId: string` — ID задачи из daily_tasks.ts

**Возвращает:** `Promise<void>`

---

### checkAndRewardStreakBonus()

Выдать бонус за 7-дневный стрик (если кратно 7).

```typescript
const currentStreak = 7;
await checkAndRewardStreakBonus(currentStreak);
// Выдаст +10 фразменов

await checkAndRewardStreakBonus(14);
// Выдаст ещё +10 фразменов
```

**Параметры:**
- `currentStreak: number` — текущий стрик

**Возвращает:** `Promise<void>`
**Логика:** Выдаёт +10 если `currentStreak % 7 === 0`

---

### checkAndRewardDailyBonus()

Выдать дневной бонус (раз в 24 часа).

```typescript
const bonusGiven = await checkAndRewardDailyBonus();

if (bonusGiven) {
  console.log('Дневной бонус +5 ⭐');
} else {
  console.log('Бонус уже был сегодня');
}
```

**Параметры:** None

**Возвращает:** `Promise<boolean>` — true если выдан, false если уже был
**Внутренняя логика:** Использует `setLastDailyBonus()` и `getLastDailyBonus()`

---

### buyEnergy()

Потратить фразмены на энергию.

```typescript
const success = await buyEnergy(5);

if (success) {
  // Обновить энергию пользователя на +5
  updateUserEnergy(5);
} else {
  toast.error('Недостаточно фразменов');
}
```

**Параметры:**
- `amountNeeded: number` — сколько энергии купить

**Возвращает:** `Promise<boolean>`
**Расчёт:** 5 энергии = 10 фразменов (ENERGY_COST_PER_5 = 10)

---

### buyXPBooster()

Потратить фразмены на бустер x2 XP.

```typescript
const success = await buyXPBooster(30);   // 30 минут, стоит 15
const success = await buyXPBooster(60);   // 1 час, стоит 25
const success = await buyXPBooster(1440); // 24 часа, стоит 50
```

**Параметры:**
- `durationMinutes: number` — длительность (30, 60, или 1440)

**Возвращает:** `Promise<boolean>`
**Выбрасывает:** Error если дата неподдерживаемая

---

### buyProfileFrame()

Потратить фразмены на рамку профиля.

```typescript
const success = await buyProfileFrame('gold');      // 50 ⭐
const success = await buyProfileFrame('diamond');   // 100 ⭐
const success = await buyProfileFrame('platinum');  // 150 ⭐
```

**Параметры:**
- `frameName: string` — 'gold' | 'diamond' | 'platinum'

**Возвращает:** `Promise<boolean>`
**Выбрасывает:** Error если имя неизвестно

---

### buyPremium()

Потратить фразмены на премиум подписку.

```typescript
const success = await buyPremium();

if (success) {
  // Активировать премиум на 30 дней
  activatePremium(30 * 24 * 60 * 60 * 1000);
}
```

**Параметры:** None

**Возвращает:** `Promise<boolean>`
**Стоимость:** 99 фразменов

---

### rewardAdWatch()

Выдать фразмены за просмотр рекламы.

```typescript
await rewardAdWatch();
// Выдаст +5 фразменов
```

**Параметры:** None

**Возвращает:** `Promise<void>`

---

### rewardReferral()

Выдать фразмены за приглашение друга.

```typescript
await rewardReferral('john_doe');
// Выдаст +50 фразменов
```

**Параметры:**
- `referredUserName: string` — имя приглашённого пользователя

**Возвращает:** `Promise<void>`

---

### getAvailableShopActions()

Получить информацию о том, что может купить пользователь.

```typescript
const available = await getAvailableShopActions();

if (available.canBuySmallEnergy) {
  // Показать кнопку покупки
}

if (available.canBuyPremium) {
  // Показать премиум как доступный
}
```

**Параметры:** None

**Возвращает:**
```typescript
Promise<{
  canBuySmallEnergy: boolean;        // 10 ⭐
  canBuyMediumEnergy: boolean;       // 25 ⭐
  canBuyLargeEnergy: boolean;        // 50 ⭐
  canBuyXPBoosterShort: boolean;     // 15 ⭐
  canBuyXPBoosterMedium: boolean;    // 25 ⭐
  canBuyXPBoosterLong: boolean;      // 50 ⭐
  canBuyFrameGold: boolean;          // 50 ⭐
  canBuyFrameDiamond: boolean;       // 100 ⭐
  canBuyFramePlatinum: boolean;      // 150 ⭐
  canBuyPremium: boolean;            // 99 ⭐
}>
```

---

## Типы и Данные (`types/shop.ts`)

### SHOP_ITEMS

Массив всех товаров в магазине.

```typescript
import { SHOP_ITEMS } from '@/app/types/shop';

SHOP_ITEMS.forEach(item => {
  console.log(`${item.titleRU} - ${item.price} ⭐`);
});

// ShopItem структура:
{
  id: string;                      // уникальный ID
  category: ShopItemCategory;      // energy | booster | cosmetic | premium
  titleRU: string;                 // название на русском
  titleUK: string;                 // название на украинском
  descriptionRU: string;           // описание на русском
  descriptionUK: string;           // описание на украинском
  icon: string;                    // эмодзи
  price: number;                   // цена в фразменах
  effect?: {
    type: 'energy' | 'xp_multiplier' | 'unlock';
    value: number;
    duration?: number;             // в миллисекундах
  }
}
```

---

### getShopItemById()

Получить товар по ID.

```typescript
const item = getShopItemById('energy_small');
console.log(item?.titleRU); // "Малая энергия"
```

**Параметры:**
- `id: string` — ID товара

**Возвращает:** `ShopItem | undefined`

---

### getShopItemsByCategory()

Получить все товары категории.

```typescript
const boosters = getShopItemsByCategory('booster');
const energy = getShopItemsByCategory('energy');
```

**Параметры:**
- `category: ShopItemCategory` — 'energy' | 'booster' | 'cosmetic' | 'premium'

**Возвращает:** `ShopItem[]`

---

## React Компоненты

### PhrasemenDisplay

Компонент для отображения баланса в заголовке.

```typescript
import { PhrasemenDisplay } from '@/components/PhrasemenDisplay';

export default function Header() {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <View style={styles.header}>
      <Text>Phraseman</Text>
      <PhrasemenDisplay
        refreshTrigger={refreshKey}
        style={{ marginRight: 16 }}
      />
    </View>
  );
}
```

**Props:**
```typescript
interface PhrasemenDisplayProps {
  refreshTrigger?: number;  // число для срабатывания перезагрузки
  style?: any;              // стили View
}
```

---

### ShopCard

Компонент карточки товара в магазине.

```typescript
import { ShopCard } from '@/components/ShopCard';

<ShopCard
  item={shopItem}
  isAffordable={balance >= shopItem.price}
  onPress={() => handleBuy(shopItem.id)}
  isLoading={false}
/>
```

**Props:**
```typescript
interface ShopCardProps {
  item: ShopItem;
  isAffordable: boolean;     // может ли купить
  onPress: () => void;       // обработчик клика
  isLoading?: boolean;       // показать загрузку
}
```

---

## Типы для использования в коде

```typescript
// Типы транзакций
type TransactionType =
  | 'daily_task'
  | 'streak_bonus'
  | 'daily_chest'
  | 'ad_watch'
  | 'referral'
  | 'energy_purchase'
  | 'xp_booster_purchase'
  | 'profile_frame_purchase'
  | 'premium_purchase'
  | 'adjustment';

// Категории товаров
type ShopItemCategory = 'energy' | 'booster' | 'cosmetic' | 'premium';

// Состояние фразменов
interface PhrasemenState {
  balance: number;
  totalEarned: number;
  totalSpent: number;
  lastDailyBonus?: number;
  transactions: Transaction[];
}

// Транзакция
interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  reason: string;
  timestamp: number;
  isSpending: boolean;
}

// Товар в магазине
interface ShopItem {
  id: string;
  category: ShopItemCategory;
  titleRU: string;
  titleUK: string;
  descriptionRU: string;
  descriptionUK: string;
  icon: string;
  price: number;
  effect?: {
    type: 'energy' | 'xp_multiplier' | 'unlock';
    value: number;
    duration?: number;
  };
}
```

---

## Примеры использования

### Полный цикл: Задача → Награда → Покупка

```typescript
import { claimTaskWithReward, getTaskById } from '@/app/daily_tasks';
import { registerXP } from '@/app/xp_manager';

/** Забрать награду за ежедневное задание (XP начисляется только при успешном grant). */
async function claimDailyTaskXp(
  taskId: string,
  userName: string,
  lang: 'ru' | 'uk',
) {
  const task = getTaskById(taskId);
  if (!task) return;

  const { claimed, awardedXp } = await claimTaskWithReward(taskId, async () => {
    const r = await registerXP(task.xp, 'daily_task_reward', userName, lang);
    return r.finalDelta;
  });

  if (claimed) {
    console.log(`Начислено XP: ${awardedXp}`);
  }
}
```

### Интеграция с магазином

```typescript
import { ShopCard } from '@/components/ShopCard';
import { SHOP_ITEMS } from '@/app/types/shop';
import { getAvailableShopActions, buyEnergy } from '@/app/phrasemen_integration';

async function renderShop() {
  const available = await getAvailableShopActions();

  return (
    <FlatList
      data={SHOP_ITEMS}
      renderItem={({ item }) => (
        <ShopCard
          item={item}
          isAffordable={available[`canBuy${capitalize(item.id)}`]}
          onPress={async () => {
            if (item.category === 'energy') {
              await buyEnergy(item.effect?.value || 5);
            }
          }}
        />
      )}
    />
  );
}
```

---

## Состояния ошибок

Все функции обрабатывают ошибки внутри себя. Основные случаи:

| Функция | Ошибка | Решение |
|---------|--------|--------|
| `addPhrasemen()` | amount < 0 | Выбросит Error |
| `spendPhrasemen()` | недостаточно | Вернёт false |
| `buyXPBooster()` | неподдерживаемое время | Выбросит Error |
| `buyProfileFrame()` | неизвестная рамка | Выбросит Error |

---

## Хранилище данных

Все данные сохраняются в AsyncStorage:

```typescript
AsyncStorage.getItem('phrasemen_state') // возвращает JSON строку
```

Структура:
```json
{
  "balance": 150,
  "totalEarned": 200,
  "totalSpent": 50,
  "lastDailyBonus": 1711732800000,
  "transactions": [
    {
      "id": "1711732800000_abc123",
      "type": "daily_task",
      "amount": 5,
      "reason": "Награда за задачу",
      "timestamp": 1711732800000,
      "isSpending": false
    }
  ]
}
```
