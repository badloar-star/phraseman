# Примеры использования расширенного онбординга

## 1. Отображение персонального плана на главной странице

### app/(tabs)/home.tsx

```typescript
import { useUserProfile } from '../../hooks/use-user-profile';
import { PersonalPlanCard } from '../../components/PersonalPlanCard';

export default function HomeScreen() {
  const { profile, loading } = useUserProfile();
  const { lang } = useLang();

  // ... в JSX:
  return (
    <ScrollView>
      {/* Существующий контент */}
      <GreetingCard />
      <StreakCard />

      {/* Новый компонент: персональный план */}
      {!loading && profile && (
        <PersonalPlanCard profile={profile} lang={lang} />
      )}

      {/* Остальной контент */}
      <TasksCard />
    </ScrollView>
  );
}
```

## 2. Интеграция с push-уведомлениями

### Использование preferredNotificationTime

```typescript
import { useUserProfile } from '../../hooks/use-user-profile';
import * as Notifications from 'expo-notifications';

async function scheduleNotifications() {
  const { profile } = useUserProfile();

  if (!profile?.preferredNotificationTime) return;

  const [hours, minutes] = profile.preferredNotificationTime.split(':').map(Number);

  // Планируем уведомление на каждый день в выбранное время
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(hours, minutes, 0, 0);

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Время учиться! 📚',
      body: `${profile.minutesPerDay} минут английского?`,
      data: { type: 'daily_reminder' },
    },
    trigger: {
      hour: hours,
      minute: minutes,
      repeats: true,
    },
  });
}
```

## 3. Фильтрация контента по цели

### Специализированные уроки по целям

```typescript
import { UserProfile } from '../app/types/user_profile';

interface LessonWithMeta {
  id: number;
  title: string;
  tags: string[];
  level: 'a1' | 'a2' | 'b1' | 'b2';
  goalFocused?: 'tourism' | 'work' | 'emigration' | 'hobby';
}

// Фильтруем уроки по целям пользователя
function filterLessonsByProfile(lessons: LessonWithMeta[], profile: UserProfile) {
  return lessons.filter(lesson => {
    // Только уроки подходящего уровня
    const levelIndex = { a1: 0, a2: 1, b1: 2, b2: 3 };
    if (levelIndex[lesson.level] < levelIndex[profile.currentLevel]) {
      return false;
    }

    // Если урок специализирован под цель пользователя, показываем в первую очередь
    if (lesson.goalFocused === profile.learningGoal) {
      return true;
    }

    // Показываем универсальные уроки
    return !lesson.goalFocused;
  });
}
```

## 4. Отслеживание прогресса к цели

### Обновление прогресса плана

```typescript
import { useUserProfile } from '../../hooks/use-user-profile';
import { estimateDaysToTarget, addDays } from '../app/types/user_profile';

async function updateProgressAfterLesson(lessonCompleted: boolean) {
  const { profile, updateProfile } = useUserProfile();

  if (!profile || !lessonCompleted) return;

  // Рассчитываем новые сроки на основе прогресса
  const completedLessons = await getCompletedLessonsCount();
  const estimatedNewDays = Math.max(
    0,
    profile.estimatedDaysToTarget - Math.ceil(completedLessons / 2)
  );

  const newTargetDate = addDays(
    new Date(profile.createdAt),
    estimatedNewDays
  );

  await updateProfile({
    estimatedDaysToTarget: estimatedNewDays,
    estimatedTargetDate: newTargetDate.toISOString().split('T')[0],
  });
}
```

## 5. Мотивационные карточки на основе цели

### Контекстные поощрения

```typescript
import { UserProfile } from '../app/types/user_profile';

const GOAL_MOTIVATIONS: Record<string, string> = {
  tourism: '🌍 Представь себя путешествующим по миру и говорящим на английском!',
  work: '💼 Это откроет перед тобой новые карьерные возможности',
  emigration: '🏠 Скоро ты сможешь комфортно жить за границей',
  hobby: '🎬 Наслаждайся любимыми фильмами и сериалами в оригинале',
};

function MotivationCard({ profile }: { profile: UserProfile }) {
  const motivation = GOAL_MOTIVATIONS[profile.learningGoal];

  return (
    <View style={styles.card}>
      <Text style={styles.emoji}>✨</Text>
      <Text style={styles.text}>{motivation}</Text>
    </View>
  );
}
```

## 6. Analytics и отслеживание

### Отправка событий аналитики

```typescript
import { useUserProfile } from '../../hooks/use-user-profile';
import analytics from '@react-native-firebase/analytics'; // или любой другой сервис

async function trackOnboardingCompletion(profile: UserProfile) {
  await analytics().logEvent('onboarding_completed', {
    learning_goal: profile.learningGoal,
    minutes_per_day: profile.minutesPerDay,
    current_level: profile.currentLevel,
    target_level: profile.targetLevel,
    estimated_days: profile.estimatedDaysToTarget,
  });
}

// Отслеживаем прогресс к цели
async function trackGoalProgress(profile: UserProfile) {
  const daysElapsed = Math.floor(
    (Date.now() - new Date(profile.createdAt).getTime()) / (1000 * 60 * 60 * 24)
  );

  const daysRemaining = profile.estimatedDaysToTarget - daysElapsed;
  const onTrack = daysRemaining >= 0;

  await analytics().logEvent('goal_progress_check', {
    goal: profile.learningGoal,
    days_elapsed: daysElapsed,
    days_remaining: daysRemaining,
    on_track: onTrack,
  });
}
```

## 7. A/B тестирование онбординга

### Экспериментирование с целевыми уровнями

```typescript
interface OnboardingVariant {
  name: string;
  targetLevelOffset: number; // 1 для +1 уровня, 2 для +2 уровней
  estimatedDaysMultiplier: number; // коэффициент времени
}

const VARIANTS: OnboardingVariant[] = [
  { name: 'realistic', targetLevelOffset: 1, estimatedDaysMultiplier: 1.0 },
  { name: 'ambitious', targetLevelOffset: 2, estimatedDaysMultiplier: 1.5 },
  { name: 'conservative', targetLevelOffset: 1, estimatedDaysMultiplier: 0.8 },
];

function selectOnboardingVariant(): OnboardingVariant {
  const variant = Math.random() > 0.66 ? 1 : Math.random() > 0.5 ? 2 : 0;
  return VARIANTS[variant];
}
```

## Интеграционные контрольные списки

### Перед выпуском в production

- [ ] UserProfile сохраняется в AsyncStorage после каждого шага онбординга
- [ ] PersonalPlanCard отображается на главной странице правильно
- [ ] Все строки интернационализации добавлены для RU и UK
- [ ] Push-уведомления интегрированы с preferredNotificationTime
- [ ] Analytics отслеживает завершение онбординга и прогресс
- [ ] Тесты для estimateDaysToTarget и addDays проходят
- [ ] Нет ошибок TypeScript в новых файлах
- [ ] Визуальный дизайн совпадает с остальным приложением
- [ ] Работает на iOS, Android и Web
- [ ] Нет утечек памяти в useUserProfile хуке

## Переходная логика

```
beta → lang → name → goal → minutes → level → plan → time → test_offer/premium
```

**Ключевая особенность**: Если пользователь пропускает все шаги и выбирает "полный ноль в English", то `currentLevel` остаётся 'a1' и план калькулируется соответственно.
