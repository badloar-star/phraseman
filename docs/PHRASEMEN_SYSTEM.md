# Система валюты "Фразмены" (⭐)

## Обзор

Фразмены — это валюта в приложении Phraseman, которую пользователи зарабатывают за выполнение задач и могут тратить на различные товары и услуги.

## Структура файлов

```
app/
├── phrasemen_system.ts          # Основная логика системы валюты
├── phrasemen_integration.ts     # Интеграция с дневными задачами
├── daily_tasks.ts               # Обновлено: добавлено поле phrasemenReward
└── types/
    └── shop.ts                  # Интерфейсы для магазина

tests/
└── phrasemen_system.test.ts     # Юнит-тесты для системы
```

## Как зарабатывать фразмены

### 1. Дневные задачи (5-30 фразменов за задачу)

Каждая дневная задача имеет поле `phrasemenReward`:

```typescript
{
  id: 'da1',
  type: 'daily_active',
  titleRU: 'Просто зайди',
  xp: 15,
  phrasemenReward: 5,  // Награда в фразменах
  // ...
}
```

**Вознаграждения по типам задач:**
- daily_active (простые): 5 фразменов
- total_answers: 8-30 фразменов (в зависимости от сложности)
- correct_streak: 10-25 фразменов
- lesson_no_mistakes: 20-30 фразменов
- quiz_hard: 12-30 фразменов
- quiz_score: 10-30 фразменов
- words_learned: 10-25 фразменов
- verb_learned: 10-25 фразменов
- open_theory: 5-8 фразменов

### 2. Бонус за стрик (10 фразменов каждые 7 дней)

```typescript
await checkAndRewardStreakBonus(7);  // +10 фразменов
await checkAndRewardStreakBonus(14); // +10 фразменов
```

### 3. Дневной бонус (5 фразменов раз в день)

```typescript
const bonusGiven = await checkAndRewardDailyBonus();
// true если бонус был выдан, false если уже был выдан сегодня
```

### 4. Просмотр рекламы (5 фразменов)

```typescript
await rewardAdWatch();  // +5 фразменов
```

### 5. Реферальный бонус (50 фразменов)

```typescript
await rewardReferral('username');  // +50 фразменов
```

## Как тратить фразмены

### 1. Энергия (10 = +5 энергии)

```typescript
const success = await buyEnergy(5);  // Потратить 10 фразменов, получить 5 энергии
```

**Цены:**
- 5 энергии = 10 фразменов
- 15 энергии = 30 фразменов (стоит дешевле за единицу)
- 30 энергии = 50 фразменов

### 2. Бустер x2 XP (15-50 фразменов)

```typescript
await buyXPBooster(30);   // 15 фразменов на 30 минут
await buyXPBooster(60);   // 25 фразменов на 1 час
await buyXPBooster(1440); // 50 фразменов на 24 часа
```

### 3. Рамка профиля (50-150 фразменов)

```typescript
await buyProfileFrame('gold');      // 50 фразменов
await buyProfileFrame('diamond');   // 100 фразменов
await buyProfileFrame('platinum');  // 150 фразменов
```

### 4. Премиум подписка (99 фразменов/месяц)

```typescript
await buyPremium();  // 99 фразменов
```

## API-интерфейсы

### phrasemen_system.ts

```typescript
// Получить текущий баланс
export const getPhrasemenBalance = async (): Promise<number>

// Добавить фразмены (зарабатывание)
export const addPhrasemen = async (
  amount: number,
  type: TransactionType,
  reason: string
): Promise<void>

// Потратить фразмены (возвращает успех)
export const spendPhrasemen = async (
  amount: number,
  type: TransactionType,
  reason: string
): Promise<boolean>

// История транзакций
export const getTransactionHistory = async (limit: number = 100): Promise<Transaction[]>

// Статистика
export const getPhrasemenStats = async () => Promise<{
  balance: number
  totalEarned: number
  totalSpent: number
  transactionCount: number
}>

// Управление дневным бонусом
export const setLastDailyBonus = async (timestamp: number): Promise<void>
export const getLastDailyBonus = async (): Promise<number | undefined>
```

### phrasemen_integration.ts

```typescript
// Выдать награду за задачу
export const rewardPhrasemenForTask = async (taskId: string): Promise<void>

// Проверить и выдать бонус за стрик
export const checkAndRewardStreakBonus = async (currentStreak: number): Promise<void>

// Дневной бонус (раз в 24 часа)
export const checkAndRewardDailyBonus = async (): Promise<boolean>

// Покупки
export const buyEnergy = async (amountNeeded: number): Promise<boolean>
export const buyXPBooster = async (durationMinutes: number): Promise<boolean>
export const buyProfileFrame = async (frameName: string): Promise<boolean>
export const buyPremium = async (): Promise<boolean>

// Награды
export const rewardAdWatch = async (): Promise<void>
export const rewardReferral = async (referredUserName: string): Promise<void>

// Проверить доступные покупки
export const getAvailableShopActions = async () => Promise<{
  canBuySmallEnergy: boolean
  canBuyMediumEnergy: boolean
  // ... и т.д.
}>
```

## Типы транзакций

```typescript
type TransactionType =
  | 'daily_task'              // Дневные задачи
  | 'streak_bonus'            // Бонус за 7-дневный стрик
  | 'daily_chest'             // Сундук дневной
  | 'ad_watch'                // Просмотр рекламы
  | 'referral'                // Реферальный бонус
  | 'energy_purchase'         // Покупка энергии
  | 'xp_booster_purchase'     // Покупка бустера XP
  | 'profile_frame_purchase'  // Покупка рамки профиля
  | 'premium_purchase'        // Покупка премиума
  | 'adjustment';             // Ручная корректировка
```

## Интеграция с UI

### Пример: Отображение баланса

```typescript
import { getPhrasemenBalance } from '@/app/phrasemen_system';

export default function Header() {
  const [balance, setBalance] = useState(0);

  useEffect(() => {
    (async () => {
      const current = await getPhrasemenBalance();
      setBalance(current);
    })();
  }, []);

  return <Text>⭐ {balance}</Text>;
}
```

### Пример: Получение награды за задачу

```typescript
import { claimTaskWithReward, getTaskById } from '@/app/daily_tasks';
import { registerXP } from '@/app/xp_manager';

export async function handleTaskClaim(
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
    // Обновить UI (фактический XP с множителями — awardedXp)
  }
}
```

### Пример: Магазин фразменов

```typescript
import { getPhrasemenBalance } from '@/app/phrasemen_system';
import { buyEnergy, getAvailableShopActions } from '@/app/phrasemen_integration';
import { SHOP_ITEMS } from '@/app/types/shop';

export default function ShopScreen() {
  const [balance, setBalance] = useState(0);
  const [available, setAvailable] = useState<any>({});

  useEffect(() => {
    (async () => {
      setBalance(await getPhrasemenBalance());
      setAvailable(await getAvailableShopActions());
    })();
  }, []);

  const handleBuyEnergy = async () => {
    const success = await buyEnergy(5);
    if (success) {
      // Обновить баланс и доступные покупки
    } else {
      // Показать сообщение об ошибке
    }
  };

  return (
    <View>
      <Text>Баланс: ⭐ {balance}</Text>
      <Button
        onPress={handleBuyEnergy}
        disabled={!available.canBuySmallEnergy}
      >
        Купить энергию (10 ⭐)
      </Button>
    </View>
  );
}
```

## Сохранение данных

Все данные фразменов сохраняются в AsyncStorage под ключом `'phrasemen_state'`:

```typescript
interface PhrasemenState {
  balance: number;                // Текущий баланс
  totalEarned: number;            // Всего заработано
  totalSpent: number;             // Всего потрачено
  lastDailyBonus?: number;        // Когда был выдан последний дневной бонус
  transactions: Transaction[];    // История транзакций
}
```

## Примечания по безопасности

1. **Валидация на сервере**: Все критические операции (покупки, выдача наград за контент) должны быть проверены на сервере.

2. **Отслеживание**: История транзакций ведётся локально и должна синхронизироваться с сервером для аудита.

3. **Предотвращение читов**:
   - Не давайте фразмены за действия, которые не были проверены на сервере
   - Используйте подписи транзакций для верификации
   - Логируйте необычные действия

## Будущие расширения

- [ ] Сундук дневной (15-30 фразменов)
- [ ] Реферальная программа с отслеживанием
- [ ] Сезонные события с повышенными наградами
- [ ] Внутриигровые турниры с призовыми фондами
- [ ] Интеграция с платёжными системами для обмена реальных денег

## Тестирование

```bash
npm test -- tests/phrasemen_system.test.ts
npm test:coverage -- tests/phrasemen_system.test.ts
```

## Контакты

По вопросам и предложениям по системе фразменов открывайте issue в репозитории.
