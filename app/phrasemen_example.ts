// ════════════════════════════════════════════════════════════════════════════
// phrasemen_example.ts — Примеры интеграции системы фразменов
// Удалите или используйте как справочник при разработке
// ════════════════════════════════════════════════════════════════════════════

import {
  getPhrasemenBalance,
  addPhrasemen,
  spendPhrasemen,
  getPhrasemenStats,
  getTransactionHistory,
} from './phrasemen_system';
import {
  rewardPhrasemenForTask,
  checkAndRewardStreakBonus,
  checkAndRewardDailyBonus,
  buyEnergy,
  buyXPBooster,
  buyPremium,
  rewardAdWatch,
} from './phrasemen_integration';

// ── Пример 1: Показать баланс пользователя ────────────────────────────────
export async function exampleShowBalance() {
  const balance = await getPhrasemenBalance();
  console.log(`Текущий баланс: ⭐ ${balance}`);
}

// ── Пример 2: Выдать награду за выполненную задачу ───────────────────────
export async function exampleRewardTask() {
  // Когда пользователь выполнит дневную задачу с ID 'da1'
  const taskId = 'da1';

  // Выдаём фразмены (сумма берётся из daily_tasks.ts)
  await rewardPhrasemenForTask(taskId);

  // Проверяем новый баланс
  const newBalance = await getPhrasemenBalance();
  console.log(`После награды за задачу: ⭐ ${newBalance}`);
}

// ── Пример 3: Проверить и выдать дневной бонус ──────────────────────────
export async function exampleDailyBonus() {
  // Вызовите это один раз при открытии приложения
  const bonusGiven = await checkAndRewardDailyBonus();

  if (bonusGiven) {
    console.log('Дневной бонус выдан: +5 ⭐');
  } else {
    console.log('Бонус уже был выдан сегодня');
  }
}

// ── Пример 4: Проверить и выдать бонус за стрик ──────────────────────────
export async function exampleStreakBonus() {
  // Вызовите это при сохранении стрика
  const currentStreak = 7; // Пользователь имеет 7-дневный стрик

  await checkAndRewardStreakBonus(currentStreak);
  // Если currentStreak % 7 === 0, то выдаётся +10 фразменов

  const balance = await getPhrasemenBalance();
  console.log(`После бонуса за стрик: ⭐ ${balance}`);
}

// ── Пример 5: Купить энергию ──────────────────────────────────────────────
export async function exampleBuyEnergy() {
  const energyNeeded = 5;

  const success = await buyEnergy(energyNeeded);

  if (success) {
    console.log(`Энергия куплена: +${energyNeeded} 🔋`);
    // Обновите энергию пользователя в приложении
  } else {
    console.log('Недостаточно фразменов для покупки энергии');
  }
}

// ── Пример 6: Купить XP бустер ────────────────────────────────────────────
export async function exampleBuyXPBooster() {
  // Бустер x2 XP на 1 час (стоит 25 фразменов)
  const success = await buyXPBooster(60);

  if (success) {
    console.log('XP бустер активирован на 1 час (x2)');
    // Начните отслеживание окончания бустера
  } else {
    console.log('Недостаточно фразменов');
  }
}

// ── Пример 7: Купить премиум ──────────────────────────────────────────────
export async function exampleBuyPremium() {
  const success = await buyPremium();

  if (success) {
    console.log('Премиум активирован на месяц');
    // Сохраните дату активации премиума
  } else {
    console.log('Недостаточно фразменов (нужно 99)');
  }
}

// ── Пример 8: Показать статистику ─────────────────────────────────────────
export async function exampleShowStats() {
  const stats = await getPhrasemenStats();

  console.log('Статистика фразменов:');
  console.log(`  Текущий баланс: ⭐ ${stats.balance}`);
  console.log(`  Всего заработано: ⭐ ${stats.totalEarned}`);
  console.log(`  Всего потрачено: ⭐ ${stats.totalSpent}`);
  console.log(`  Транзакций всего: ${stats.transactionCount}`);
}

// ── Пример 9: Показать историю транзакций ─────────────────────────────────
export async function exampleShowHistory() {
  const history = await getTransactionHistory(10); // Последние 10 транзакций

  console.log('История фразменов (последние 10):');
  history.forEach((tx, idx) => {
    const sign = tx.isSpending ? '-' : '+';
    const emoji = tx.isSpending ? '📤' : '📥';
    console.log(
      `${idx + 1}. ${emoji} ${sign}${tx.amount} (${tx.type}): ${tx.reason}`,
    );
  });
}

// ── Пример 10: Цикл игровой сессии ────────────────────────────────────────
export async function exampleGameSession() {
  // 1. При открытии приложения
  console.log('=== Открытие приложения ===');
  await exampleDailyBonus();

  // 2. Пользователь выполняет задачу
  console.log('\n=== Пользователь выполнил задачу ===');
  await exampleRewardTask();

  // 3. Смотрит рекламу
  console.log('\n=== Просмотр рекламы ===');
  await rewardAdWatch();

  // 4. Покупает энергию
  console.log('\n=== Покупка энергии ===');
  await exampleBuyEnergy();

  // 5. Показываем статистику
  console.log('\n=== Финальная статистика ===');
  await exampleShowStats();

  // 6. Показываем историю
  console.log('\n=== История ===');
  await exampleShowHistory();
}

// ── Утилита: Сбросить данные для тестирования ─────────────────────────────
export async function resetPhrasemenForTesting() {
  const { clearPhrasemenData } = await import('./phrasemen_system');
  await clearPhrasemenData();
  console.log('Данные фразменов очищены (для тестирования)');
}

// ── Утилита: Получить данные из AsyncStorage для отладки ──────────────────
export async function debugPhrasemenStorage() {
  const AsyncStorage = await import('@react-native-async-storage/async-storage');
  const data = await AsyncStorage.default.getItem('phrasemen_state');

  if (data) {
    console.log('Фразмены в AsyncStorage:', JSON.parse(data));
  } else {
    console.log('Данные фразменов не найдены в AsyncStorage');
  }
}

// ── Утилита: Выдать фразмены вручную (для тестирования) ────────────────────
export async function adminAddPhrasemen(amount: number) {
  await addPhrasemen(amount, 'adjustment', 'Ручная выдача (администратор)');
  console.log(`Выдано ${amount} фразменов`);
}

// ── Утилита: Отнять фразмены (для тестирования) ───────────────────────────
export async function adminSpendPhrasemen(amount: number) {
  const success = await spendPhrasemen(amount, 'adjustment', 'Ручное вычитание (администратор)');

  if (success) {
    console.log(`Отнято ${amount} фразменов`);
  } else {
    console.log('Недостаточно фразменов');
  }
}

// ── Запуск всех примеров ──────────────────────────────────────────────────
export async function runAllExamples() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║       ПРИМЕРЫ ИСПОЛЬЗОВАНИЯ СИСТЕМЫ ФРАЗМЕНОВ              ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  try {
    await exampleGameSession();
  } catch (error) {
    console.error('Ошибка при запуске примеров:', error);
  }

  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║                    ПРИМЕРЫ ЗАВЕРШЕНЫ                       ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
}
