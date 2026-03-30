# Система Блокировки Уроков (Lesson Lock System)

## Обзор

Система управляет доступностью уроков в приложении на основе прогресса пользователя. Логика блокировки гарантирует, что пользователи проходят уроки в последовательности и достигают минимальной оценки перед переходом к следующему уроку.

## Основные Требования

1. **Урок 1 (A1)** всегда доступен для открытия
2. **Уроки 2-32** заблокированы по умолчанию
3. Для разблокировки урока N требуется:
   - Пройти урок N-1
   - Получить оценку **≥ 4.5** за урок N-1
4. После разблокировки урок остается доступным

## Архитектура

### Основной Модуль: `app/lesson_lock_system.ts`

Модуль экспортирует следующие функции:

#### `isLessonUnlocked(lessonId: number): Promise<boolean>`
Проверяет, разблокирован ли урок.

```typescript
const isUnlocked = await isLessonUnlocked(5);
if (isUnlocked) {
  // Урок доступен для открытия
}
```

#### `getLessonLockInfo(lessonId: number): Promise<{...}>`
Получает информацию о статусе блокировки урока.

```typescript
const info = await getLessonLockInfo(3);
console.log(info.isLocked);          // true/false
console.log(info.lockedByLesson);    // 2 (нужно пройти урок 2)
console.log(info.minRequiredScore);  // 4.5
```

#### `tryUnlockNextLesson(completedLessonId: number, score: number): Promise<boolean>`
Пытается разблокировать следующий урок после завершения текущего.

```typescript
const wasUnlocked = await tryUnlockNextLesson(5, 4.8);
if (wasUnlocked) {
  console.log('Урок 6 разблокирован!');
}
```

#### `getLockMessageText(lessonId: number, lang: 'ru' | 'uk'): string`
Возвращает пользовательское сообщение об ограничении доступа.

```typescript
const message = getLockMessageText(3, 'ru');
// "Сначала пройди Урок 2 с оценкой ≥ 4.5"
```

#### `checkUnlockRequirements(lessonId: number, score: number): {...}`
Проверяет, будет ли разблокирован следующий урок и возвращает статистику.

```typescript
const info = checkUnlockRequirements(5, 4.7);
console.log(info.willUnlockNext);  // true
console.log(info.scoreGap);        // -0.2 (хватает на 0.2)
```

### Хранилище Данных

Состояние разблокировки хранится в `AsyncStorage` с ключом `'unlocked_lessons'`:

```json
{
  "1": { "unlockedAt": 0, "unlockedByScore": 5 },
  "2": { "unlockedAt": 1648575235000, "unlockedByScore": 4.5 },
  "5": { "unlockedAt": 1648578910000, "unlockedByScore": 4.8 }
}
```

## Интеграция с UI

### В `lesson_menu.tsx`

1. **Проверка блокировки** при загрузке экрана меню урока:

```typescript
const [isLessonLocked, setIsLessonLocked] = useState(false);

useEffect(() => {
  (async () => {
    const unlocked = await isLessonUnlocked(lessonId);
    setIsLessonLocked(!unlocked);
  })();
}, [lessonId]);
```

2. **UI для заблокированного урока:**
   - Иконка замка 🔐 вместо обычной иконки
   - Кнопка с `disabled` состоянием (opacity: 0.5)
   - При клике показывается модальное окно с объяснением

```typescript
{
  label: s.lessonMenu.continue,
  icon: isLessonLocked ? 'lock-closed' : 'rocket-outline',
  disabled: isLessonLocked,
  onPress: isLessonLocked ? handleLockedLessonPress : handleStartLesson,
}
```

3. **Модальное окно блокировки:**

```typescript
<Modal transparent animationType="fade" visible={showLockModal}>
  <View style={{...}}>
    <Text style={{fontSize: 56}}>🔐</Text>
    <Text>{lang === 'uk' ? 'Урок заблокований' : 'Урок заблокирован'}</Text>
    <Text>{getLockMessageText(lessonId, lang as 'ru'|'uk')}</Text>
    {/* Кнопка "Понимаю" */}
  </View>
</Modal>
```

### В `lesson1.tsx`

При завершении урока с успехом (все 50 ячеек ответлены правильно):

```typescript
setTimeout(async () => {
  // Получаем финальную оценку урока
  const correct = np.filter(x => x === 'correct' || x === 'replay_correct').length;
  const finalScore = parseFloat((correct / TOTAL * 5).toFixed(1));

  // Пытаемся разблокировать следующий урок
  await tryUnlockNextLesson(lessonId, finalScore);

  // Переходим на экран completion
  router.replace({ pathname: '/lesson_complete', params: { id: lessonId } });
}, 1500);
```

## Сценарии Тестирования

### Сценарий 1: Первый проход урока
1. Пользователь открывает приложение
2. Урок 1 доступен для открытия ✅
3. Уроки 2-32 показывают иконку замка 🔐
4. При клике на урок 2 показывается: "Сначала пройди Урок 1 с оценкой ≥ 4.5"

### Сценарий 2: Успешное прохождение урока
1. Пользователь проходит Урок 1 и получает оценку **4.5** (все 50 правильно)
2. На экране `lesson_complete` показывается логотип медали
3. Урок 2 **автоматически разблокируется**
4. При возвращении в меню, Урок 2 теперь доступен (без замка)

### Сценарий 3: Недостаточная оценка
1. Пользователь проходит Урок 1 с оценкой **4.4** (49 правильно)
2. Урок 2 **остаётся заблокирован**
3. Пользователь может пройти Урок 1 снова для повышения оценки

### Сценарий 4: Повторный проход
1. Пользователь уже разблокировал Урок 5
2. Может проходить Урок 1 сколько угодно раз для практики
3. Это не влияет на статус разблокировки других уроков

### Сценарий 5: Последовательная разблокировка
1. Урок 1 ✅ → Урок 2 разблокирован
2. Урок 2 ✅ (score ≥ 4.5) → Урок 3 разблокирован
3. Урок 3 ✅ → Урок 4 разблокирован
4. И так далее до Урока 32

## Хранение и Персистентность

### AsyncStorage
- **Ключ:** `'unlocked_lessons'`
- **Формат:** JSON с объектом `{lessonId: {unlockedAt, unlockedByScore}}`
- **Безопасность:** Не содержит чувствительных данных
- **Синхронизация:** Локальна, без облака (как и остальное приложение)

### Восстановление
Если `AsyncStorage` повреждается или очищается:
- Урок 1 всегда восстанавливается как разблокированный
- Остальные уроки требуют повторного прохождения

### Сброс для Разработки
```typescript
// Сбросить в начальное состояние (только Урок 1)
import { resetLockSystem } from './lesson_lock_system';
await resetLockSystem();
```

## Тестирование

### Запуск Тестов
```bash
npm test -- lesson_lock_system.test.ts
```

### Покрытие
Тесты покрывают:
- ✅ Урок 1 всегда разблокирован
- ✅ Уроки 2-32 заблокированы по умолчанию
- ✅ Разблокировка требует score ≥ 4.5
- ✅ Не разблокировать дважды один урок
- ✅ Граничные случаи (урок 0, 33, отрицательные)
- ✅ Сообщения о блокировке на русском и украинском
- ✅ Проверка требований к разблокировке

## Возможные Расширения

### 1. Бонусный Контент
```typescript
// Разблокировка дополнительных уроков за достижения
await unlockBonus(lessonId, bonusType);
```

### 2. Временные Блокировки
```typescript
// Блокировка на определённое время после неудачного прохождения
await temporaryLock(lessonId, durationMs);
```

### 3. Анализ Прогресса
```typescript
// Получить статистику по всем урокам
const stats = await getLessonProgressStats();
// {completed: 5, unlocked: 8, total: 32, averageScore: 4.2}
```

### 4. Интеграция с Облаком
```typescript
// Синхронизация с бэкендом
await syncLessonLockStatus(userId);
```

## Поиск и Исправление Ошибок

### Проблема: Урок остаётся заблокирован после прохождения
**Решение:** Проверить:
1. Убедиться что `tryUnlockNextLesson` вызывается в `lesson1.tsx`
2. Проверить что `finalScore >= 4.5`
3. Перезагрузить приложение (в крайнем случае)

### Проблема: Все уроки разблокированы без причины
**Решение:** Проверить:
1. Убедиться что не вызывается `resetLockSystem` где-нибудь случайно
2. Проверить что `AsyncStorage.getItem` возвращает правильные данные

### Отладка
```typescript
// Вывести текущий статус всех уроков
const ids = await getUnlockedLessonIds();
console.log('Разблокированные уроки:', ids);

// Проверить информацию конкретного урока
const info = await getLessonLockInfo(5);
console.log('Урок 5 информация:', info);
```

## Файлы

- **Основной модуль:** `/app/lesson_lock_system.ts`
- **Интеграция в меню:** `/app/lesson_menu.tsx`
- **Интеграция в урок:** `/app/lesson1.tsx`
- **Тесты:** `/tests/lesson_lock_system.test.ts`
- **Документация:** `/docs/LESSON_LOCK_SYSTEM.md`
