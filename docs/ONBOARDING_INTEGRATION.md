# Расширенный онбординг с персональным планом

## Обзор

Реализован многоэтапный процесс онбординга с новыми экранами для выбора цели обучения и создания персонального плана.

## Новые экраны

### 1. Выбор цели (Goal Selection)
- **Шаг**: goal
- **Варианты**: Туризм (🌍), Работа (💼), Эмиграция (🏠), Хобби (🎬)
- **Сохраняется**: `learningGoal` в UserProfile

### 2. Интенсивность обучения (Daily Minutes)
- **Шаг**: minutes
- **Варианты**: 5⚡, 15💪, 30🔥, 60+💯 минут в день
- **Сохраняется**: `minutesPerDay` в UserProfile

### 3. Текущий уровень (Current Level)
- **Шаг**: level
- **Варианты**: A1 (начинающий), A2 (основы), B1 (среднее), B2 (хорошо)
- **Сохраняется**: `currentLevel` в UserProfile

### 4. Персональный план (Personal Plan)
- **Шаг**: plan
- **Показывает**:
  - Выбранную цель и интенсивность
  - Текущий и целевой уровень (A1 → B1)
  - Ориентировочное время: ~120 дней
  - Количество уроков: 32 урока в твоём темпе
  - Часы в неделю: ~2 часа в неделю обучения
  - Дата достижения цели
- **Визуализация**: Карточка с прогнозом и рассчётом

### 5. Время напоминаний (Notification Time)
- **Шаг**: time
- **Варианты**: 08:00, 12:00, 18:00, 20:00, 22:00
- **Toggle**: Включить/выключить ежедневные напоминания
- **Сохраняется**: `preferredNotificationTime` + `notificationsEnabled` статус

### 6. Затем — Тест уровня или Premium (Существующие экраны)

## Структура данных

### UserProfile (app/types/user_profile.ts)

```typescript
interface UserProfile {
  name: string;
  learningGoal: LearningGoal; // 'tourism' | 'work' | 'emigration' | 'hobby'
  minutesPerDay: MinutesPerDay; // 5 | 15 | 30 | 60
  currentLevel: CurrentLevel; // 'a1' | 'a2' | 'b1' | 'b2'
  targetLevel: TargetLevel; // 'a1' | 'a2' | 'b1' | 'b2' | 'c1'
  preferredNotificationTime: string; // "08:00"
  onboardingCompleted: boolean;
  createdAt: string; // ISO date
  estimatedDaysToTarget?: number;
  estimatedTargetDate?: string; // ISO date
}
```

Сохраняется в AsyncStorage под ключом `user_profile`.

## Функции расчёта

### estimateDaysToTarget(fromLevel, toLevel, minutesPerDay)

Рассчитывает приблизительное количество дней до достижения целевого уровня:

- Базовая траектория: ~45 дней на уровень (при 15 мин/день)
- Коэффициенты интенсивности:
  - 5 мин/день: ×3.0 (в 3 раза дольше)
  - 15 мин/день: ×1.0 (базовая скорость)
  - 30 мин/день: ×0.6 (в 1.67 раза быстрее)
  - 60+ мин/день: ×0.4 (в 2.5 раза быстрее)

**Примеры расчётов:**
- A1 → B1, 5 мин/день: ~270 дней (9 месяцев)
- A1 → B1, 15 мин/день: ~90 дней (3 месяца)
- A1 → B1, 30 мин/день: ~54 дня (1.8 месяца)
- A1 → B1, 60+ мин/день: ~36 дней (1.2 месяца)

## Интеграция с фронтендом

### Использование в компонентах

```typescript
import { useUserProfile } from '../hooks/use-user-profile';
import { PersonalPlanCard } from '../components/PersonalPlanCard';

function MyComponent() {
  const { profile, loading } = useUserProfile();
  const { lang } = useLang();

  return (
    <>
      {/* Показываем план на главной странице */}
      <PersonalPlanCard profile={profile} lang={lang} />
    </>
  );
}
```

### Обновление профиля

```typescript
const { profile, updateProfile } = useUserProfile();

// Обновить предпочитаемое время
await updateProfile({
  preferredNotificationTime: '18:00',
});
```

## Интернационализация

Все строки добавлены в `constants/i18n.ts` для поддержки русского и украинского языков:

- `whyLearnEnglish` — вопрос "Зачем учить английский?"
- `hoursPerDay` — вопрос о времени обучения
- `currentLevel` — вопрос о текущем уровне
- `personalPlan` — заголовок плана
- `planForGoal` — описание цели
- `planIntensity` — описание интенсивности
- `yourForecast` — заголовок прогноза
- И другие строки для всех элементов UI

## Endowed Progress (Психология)

После завершения онбординга:
1. Пользователю показывается "Поздравляем! Ты завершил онбординг"
2. Это засчитывается как "выполнено 2 из 10 шагов" для первого достижения
3. Создаёт ощущение прогресса и мотивирует продолжить

## Примечания для дальнейшего развития

### Push-уведомления
- Интегрировать `preferredNotificationTime` с системой push-уведомлений
- Планировать ежедневные напоминания в выбранное время

### Содержание, зависящее от профиля
- Фильтровать уроки по `learningGoal` (добавить специализированный контент)
- Показывать актуальный контент в зависимости от `currentLevel`
- Корректировать сложность квизов и тестов

### Аналитика
- Отслеживать, сколько пользователей проходит каждый этап онбординга
- Измерять выполнение целей vs. прогноз
- A/B тестирование разных целей и интенсивности

### Прогресс плана
- На главной странице показывать прогресс к цели (PersonalPlanCard)
- Обновлять `estimatedTargetDate` по мере продвижения
- Показывать "ты достигаешь цели 20 дней раньше" при хорошем прогрессе

## Файлы

- **Типы**: `app/types/user_profile.ts`
- **Компонент онбординга**: `components/onboarding.tsx` (новые шаги)
- **Хук профиля**: `hooks/use-user-profile.ts`
- **Карточка плана**: `components/PersonalPlanCard.tsx`
- **Интернационализация**: `constants/i18n.ts`
- **Документация**: `docs/ONBOARDING_INTEGRATION.md` (этот файл)
