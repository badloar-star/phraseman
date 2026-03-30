# Примеры использования Daily Phrase System

## 1. Получить фразу дня в компоненте

```typescript
import { useEffect, useState } from 'react';
import { getTodayPhrase, DailyPhrase } from '../app/daily_phrase_system';

export function MyComponent() {
  const [phrase, setPhrase] = useState<DailyPhrase | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPhrase = async () => {
      try {
        const dailyPhrase = await getTodayPhrase('B1', false);
        setPhrase(dailyPhrase);
      } catch (error) {
        console.error('Failed to load phrase:', error);
      } finally {
        setLoading(false);
      }
    };

    loadPhrase();
  }, []);

  if (loading) return <Text>Loading...</Text>;
  if (!phrase) return <Text>No phrase available</Text>;

  return (
    <View>
      <Text>{phrase.russian}</Text>
      <Text>→ {phrase.english}</Text>
      <Text>Level: {phrase.level}</Text>
    </View>
  );
}
```

## 2. Использовать DailyPhraseCard на любой странице

```typescript
import DailyPhraseCard from '../components/DailyPhraseCard';

export function AnyScreen() {
  return (
    <ScrollView>
      {/* ... other content ... */}
      <DailyPhraseCard userLevel="B1" />
      {/* ... more content ... */}
    </ScrollView>
  );
}
```

## 3. Установить время уведомления

```typescript
import {
  setNotificationTime,
  getNotificationTime,
  schedulePushNotifications,
} from '../app/daily_phrase_system';

async function handleSetTime(time: string) {
  // time format: "HH:mm" (e.g., "14:30")
  await setNotificationTime(time);

  // Re-schedule notifications with new time
  await schedulePushNotifications();
}

async function showCurrentTime() {
  const time = await getNotificationTime();
  console.log(`Current notification time: ${time}`);
}
```

## 4. Создать push-уведомление вручную

```typescript
import {
  createDailyPhraseNotification,
  createStreakReminderNotification,
} from '../app/push_notifications';

// Daily phrase notification
const phraseNotif = await createDailyPhraseNotification();
console.log(phraseNotif.title);   // "✨ Фраза дня"
console.log(phraseNotif.body);    // "Я ходил в офис вчера"
console.log(phraseNotif.data);    // { action, lessonId, phraseIndex }

// Streak reminder
const streakNotif = await createStreakReminderNotification();
console.log(streakNotif.title);   // "🔥 Твой стрик важен"
console.log(streakNotif.body);    // "Ты на 7 днях!..."
```

## 5. Получить информацию об уведомлении

```typescript
import {
  getTimeUntilNotification,
  getNextPushNotificationTime,
} from '../app/daily_phrase_system';

// Get time until next notification
const timeMs = getTimeUntilNotification('08:00');
const minutes = Math.floor(timeMs / 60000);
console.log(`Next notification in ${minutes} minutes`);

// Get exact time of next notification
const nextTime = getNextPushNotificationTime('08:00');
console.log(nextTime); // Date object: 2026-03-30T08:00:00.000Z
```

## 6. Debug информация системы

```typescript
import { getDebugInfo } from '../app/daily_phrase_system';

async function showDebugInfo() {
  const debug = await getDebugInfo();

  console.log('Today:', debug.today);                           // "2026-03-29"
  console.log('Next notification:', debug.nextNotificationTime); // Date
  console.log('Preferred time:', debug.preferredTime);          // "08:00"

  if (debug.cachedPhrase) {
    console.log('Cached phrase:', debug.cachedPhrase.russian);
  }
}
```

## 7. Обработать клик по фразе дня

```typescript
import { useRouter } from 'expo-router';
import DailyPhraseCard from '../components/DailyPhraseCard';

export function HomeScreen() {
  const router = useRouter();

  const handlePhraseLoaded = (phrase) => {
    // фраза загружена и готова
    console.log(`Phrase loaded: ${phrase.russian}`);
  };

  return (
    <ScrollView>
      <DailyPhraseCard
        userLevel="A1"
        onPhraseLoaded={handlePhraseLoaded}
      />
    </ScrollView>
  );
}

// Когда пользователь нажимает на карточку,
// автоматически открывается lesson1.tsx с параметрами:
// - fromDailyPhrase: "true"
// - lessonId: "5"
// - phraseIndex: "2"
```

## 8. Очистить кэш (для тестирования)

```typescript
import { clearPhraseCache, getTodayPhrase } from '../app/daily_phrase_system';

async function resetPhraseOfDay() {
  // Очистить кэш
  await clearPhraseCache();

  // Загрузить новую фразу (будет выбрана случайно)
  const newPhrase = await getTodayPhrase('B1', false);
  console.log('New phrase:', newPhrase.russian);
}
```

## 9. Обработать ошибку загрузки фразы

```typescript
import { getTodayPhrase } from '../app/daily_phrase_system';

async function loadWithErrorHandling() {
  try {
    const phrase = await getTodayPhrase('B1', false);

    if (!phrase.russian) {
      throw new Error('Phrase data is incomplete');
    }

    return phrase;
  } catch (error) {
    if (error instanceof Error) {
      console.error('Failed to load phrase:', error.message);
    }

    // Return fallback phrase
    return {
      russian: 'Практикуйте английский каждый день',
      english: 'Practice English every day',
      lessonId: 1,
      level: 'A1' as const,
      phraseIndex: 0,
    };
  }
}
```

## 10. Фильтровать фразы по уровню в массиве

```typescript
// Если нужно получить ВСЕ фразы для уровня (не только одну дневную)
import { ALL_LESSONS_RU } from '../app/lesson_data_all';

function getAllPhrasesForLevel(level: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2') {
  const phrases = [];
  const levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
  const userLevelIdx = levels.indexOf(level);

  for (let lessonId = 1; lessonId <= 32; lessonId++) {
    const lessonPhrases = ALL_LESSONS_RU[lessonId] || [];

    lessonPhrases.forEach((phrase) => {
      if (!phrase.level) return; // skip phrases without level

      const phraseLevelIdx = levels.indexOf(phrase.level);
      if (phraseLevelIdx <= userLevelIdx) {
        phrases.push({
          lessonId,
          ...phrase,
        });
      }
    });
  }

  return phrases;
}
```

## Тестирование

**Запустить тесты:**
```bash
npm test -- daily_phrase_system.test.ts
```

**Запустить с покрытием:**
```bash
npm run test:coverage -- daily_phrase_system.test.ts
```

**Watch mode:**
```bash
npm run test:watch -- daily_phrase_system.test.ts
```

## Интеграция с существующими системами

### С системой энергии
```typescript
import { getEnergyState } from '../app/energy_system';
import { getTodayPhrase } from '../app/daily_phrase_system';

async function startDailyLessonIfEnoughEnergy() {
  const energy = await getEnergyState();
  const phrase = await getTodayPhrase('B1', false);

  if (energy.current > 0) {
    // Start lesson with phrase
    router.push({
      pathname: '/lesson1',
      params: {
        fromDailyPhrase: 'true',
        lessonId: phrase.lessonId.toString(),
      },
    });
  }
}
```

### С системой стрика
```typescript
import { getTodayPhrase } from '../app/daily_phrase_system';
import AsyncStorage from '@react-native-async-storage/async-storage';

async function completeStreakWithPhrase() {
  const streak = await AsyncStorage.getItem('streak_count');
  const phrase = await getTodayPhrase('B1', false);

  // Пользователь завершил урок с фразой дня
  if (streak) {
    console.log(`${streak} day streak! Today's phrase: ${phrase.russian}`);
  }
}
```

### С системой достижений
```typescript
import { getTodayPhrase } from '../app/daily_phrase_system';
import { checkAchievements } from '../app/achievements';

async function checkDailyPhraseAchievement() {
  const phrase = await getTodayPhrase('B1', false);

  // Check if user learned this phrase today
  const learned = await AsyncStorage.getItem(`phrase_learned_${phrase.lessonId}_${phrase.phraseIndex}`);

  if (learned) {
    await checkAchievements({
      type: 'daily_phrase_learned',
      level: phrase.level,
    });
  }
}
```

## Performance Tips

1. **Кэширование** - фраза кэшируется на весь день, не перезагружается
2. **Асинхронность** - все операции асинхронные, не блокируют UI
3. **Error Handling** - система gracefully fallback на любой ошибке
4. **Память** - кэш занимает ~500 байт, не критично

## Возможные проблемы

### "Фраза дня не меняется"
- Проверить AsyncStorage: `clearPhraseCache()`
- Проверить время сервера (система использует местное время)
- Убедиться, что `lesson_data_all.ts` содержит данные

### "Уведомления не приходят"
- Система пока только placeholder
- Требует Firebase Cloud Messaging
- Требует background task scheduler
- Запланировано для production version

### "Фраза для неправильного уровня"
- Проверить, что `userLevel` передан правильно
- Убедиться, что фразы имеют поле `level` в данных
- Использовать `getDebugInfo()` для проверки

## Лицензия

Part of Phraseman app. All rights reserved.
