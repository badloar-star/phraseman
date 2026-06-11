# «Чёрное кино» × выбор урока — готовая вставка для app/(tabs)/lessons.tsx

Файл `app/(tabs)/lessons.tsx` в момент работы (2026-06-11) редактировался другой сессией,
поэтому правка отложена. Без неё кино-темы в списке уроков падают в фолбэк:
`LESSON_LEVEL_PALETTES[themeMode] ?? PALETTE_SKETCH` (бумажные бежевые обложки на чёрном)
и `EXAM_META_BY_THEME[themeMode] ?? EXAM_META_SKETCH` (серые экзамены).

## 1. В `LESSON_LEVEL_PALETTES` (после ключа `compass`) добавить:

```ts
  midnight: {
    A1: '#8FA0FF',
    A2: '#B79CFF',
    B1: '#5FE0B0',
    B2: '#FFD27A',
  },
  ember: {
    A1: '#FFA245',
    A2: '#FFC894',
    B1: '#5FE8A8',
    B2: '#FF4D6E',
  },
  aurora: {
    A1: '#3DE8A6',
    A2: '#9FF2D4',
    B1: '#3FA9FF',
    B2: '#F2D27A',
  },
  volt: {
    A1: '#D6FF3D',
    A2: '#EAFF8C',
    B1: '#4FE8AC',
    B2: '#FF8A3D',
  },
```

## 2. В `EXAM_META_BY_THEME` (после ключа `compass`) добавить:

```ts
  midnight: {
    A1: { bg: '#0E1430', accent: '#8FA0FF', icon: 'school-outline' },
    A2: { bg: '#141937', accent: '#B79CFF', icon: 'school-outline' },
    B1: { bg: '#08221A', accent: '#5FE0B0', icon: 'school-outline' },
    B2: { bg: '#1C0E30', accent: '#FFD27A', icon: 'trophy' },
  },
  ember: {
    A1: { bg: '#2A1606', accent: '#FFA245', icon: 'school-outline' },
    A2: { bg: '#2E1A08', accent: '#FFC894', icon: 'school-outline' },
    B1: { bg: '#082218', accent: '#5FE8A8', icon: 'school-outline' },
    B2: { bg: '#2A0814', accent: '#FF4D6E', icon: 'trophy' },
  },
  aurora: {
    A1: { bg: '#08241B', accent: '#3DE8A6', icon: 'school-outline' },
    A2: { bg: '#0C2A20', accent: '#9FF2D4', icon: 'school-outline' },
    B1: { bg: '#08182B', accent: '#3FA9FF', icon: 'school-outline' },
    B2: { bg: '#2A2208', accent: '#F2D27A', icon: 'trophy' },
  },
  volt: {
    A1: { bg: '#1C2406', accent: '#D6FF3D', icon: 'school-outline' },
    A2: { bg: '#222B08', accent: '#EAFF8C', icon: 'school-outline' },
    B1: { bg: '#08241B', accent: '#4FE8AC', icon: 'school-outline' },
    B2: { bg: '#2A1606', accent: '#FF8A3D', icon: 'trophy' },
  },
```

Логика расцветки: каждый CEFR-уровень получает свой голос из спектра темы
(A1 = главный акцент, A2 = вторичный, B1 = «правильно/прогресс», B2 = золото/предупреждающий),
экзамены — тёмная плашка в тон + тот же акцент. После вставки удалить этот файл.
