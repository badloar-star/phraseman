# Шаблоны историй v1 — патч для Codex: 16 новых типов событий (28.10)

От: 8 · Моменты. Для: координатор → Codex (файлы `modules/story_events/*` сейчас в незакоммиченной работе Codex — сам я их не трогаю).

Кадры уже в коде: `components/stories/templates/*` (23 кадра макета `docs/design/v2-app/stories-templates-v1.html`).
Разбор событий в кадры — `components/stories/templates/story_template_from_event.ts`: пять существующих типов работают сейчас,
16 новых — как только тип появится в `StoryEventType` и источник начнёт писать событие. Больше ничего менять не нужно.

## 1. `modules/story_events/story_events_core.ts`

```diff
-export type StoryEventType = 'spire_week' | 'streak_milestone' | 'coin_rank_up' | 'achievement' | 'theme_unlock' | 'announcement';
+export type StoryEventType = 'spire_week' | 'streak_milestone' | 'coin_rank_up' | 'achievement' | 'theme_unlock' | 'announcement'
+  // шаблоны историй v1 (макет stories-templates-v1.html, 28.10): разбор payload — components/stories/templates/story_template_from_event.ts
+  | 'level_up' | 'lesson_done' | 'chapter_exam_passed' | 'spire_summit' | 'duel_won' | 'friend_passed' | 'friend_joined' | 'pack_learned'
+  | 'pack_added_by_others' | 'phrase_of_day' | 'week_recap' | 'month_recap' | 'invite_prompt' | 'coins_milestone' | 'mistakes_cleared' | 'dialog_done';
```

```diff
 const STORY_TYPES: ReadonlySet<string> = new Set<StoryEventType>([
   'spire_week', 'streak_milestone', 'coin_rank_up', 'achievement', 'theme_unlock', 'announcement',
+  'level_up', 'lesson_done', 'chapter_exam_passed', 'spire_summit', 'duel_won', 'friend_passed', 'friend_joined', 'pack_learned',
+  'pack_added_by_others', 'phrase_of_day', 'week_recap', 'month_recap', 'invite_prompt', 'coins_milestone', 'mistakes_cleared', 'dialog_done',
 ]);
```

В `storyEventKey` (после `case 'theme_unlock'`), один факт — одна история:

```diff
+    case 'level_up': return `level_up:${part(payload, 'toLevel')}`;
+    case 'lesson_done': return `lesson_done:${part(payload, 'lessonNo')}:${part(payload, 'dayKey')}`;
+    case 'chapter_exam_passed': return `chapter_exam_passed:${part(payload, 'chapter')}`;
+    case 'spire_summit': return `spire_summit:${part(payload, 'weekId')}`;
+    case 'duel_won': return `duel_won:${part(payload, 'duelId')}`;
+    case 'friend_passed': return `friend_passed:${part(payload, 'friendUid')}:${part(payload, 'weekId')}`;
+    case 'friend_joined': return `friend_joined:${part(payload, 'friendUid')}`;
+    case 'pack_learned': return `pack_learned:${part(payload, 'packId')}`;
+    case 'pack_added_by_others': return `pack_added_by_others:${part(payload, 'packId')}:${part(payload, 'weekId')}`;
+    case 'phrase_of_day': return `phrase_of_day:${part(payload, 'dayKey')}`;
+    case 'week_recap': return `week_recap:${part(payload, 'startDayKey')}`;
+    case 'month_recap': return `month_recap:${part(payload, 'monthKey')}`;
+    case 'invite_prompt': return `invite_prompt:${part(payload, 'inviteCode')}`;
+    case 'coins_milestone': return `coins_milestone:${part(payload, 'milestone')}`;
+    case 'mistakes_cleared': return `mistakes_cleared:${part(payload, 'dayKey')}`;
+    case 'dialog_done': return `dialog_done:${part(payload, 'dialogId')}:${part(payload, 'dayKey')}`;
```

## 2. Плоский контракт payload (`StoryEventPayload` — только строки, числа, флаги)

Списки — строкой: числа через `,`, тексты через `|`. Нет обязательного поля — кадр не рисуется (прежний кадр тоже не нужен: у новых типов его нет).

| Тип | Поля payload (обязательные **жирным**) | Кадр |
|---|---|---|
| level_up | fromLevel, **toLevel**, chapters, lessons | Новый уровень |
| lesson_done | lessonNo, correct, **total** (> 0), coins, minutes, noHints, dayKey | Урок пройден |
| chapter_exam_passed | chapter, correct, **total** (> 0), nextChapter, firstTry | Экзамен главы |
| spire_summit | tier, floor (15), floors (15), weekCoins, weekId | Пик · вершина недели |
| duel_won | **friendName**, friendRank, myScore, theirScore, rounds (5), seconds, duelId | Дуэль выиграна |
| friend_passed | **friendName**, friendRank, friendCoins, myCoins, daysLeft, friendUid, weekId | Друг обогнал |
| friend_joined | **friendName**, friendRank, friendUid | Новый друг |
| pack_learned | **packTitle**, cards, knownPct, days, samples `hire=нанимать\|fire=увольнять`, packId | Набор выучен |
| pack_added_by_others | **packTitle**, cards, addedCount, ranks `1,7,12`, packId, weekId | Твой набор добавляют |
| phrase_of_day | **phrase**, meaning, audioSec, dayKey | Фраза дня |
| week_recap | **startDayKey** `YYYY-MM-DD`, dailyMinutes `42,70,…` (7), lessons, coins, minutes, streak | Твоя неделя |
| month_recap | **monthKey** `YYYY-MM`, daysInMonth, activeDays `1,2,5,…`, lessons, exams, best | Итог месяца |
| invite_prompt | **inviteCode** | Пригласи друга |
| coins_milestone | **milestone** (> 0), days, rank | Отметка монет |
| mistakes_cleared | cleared, left, noNew, samples `to look forward to\|would rather`, dayKey | Ошибки разобраны |
| dialog_done | **title**, goalsDone, goalsTotal, turns, minutes, noHints, bubbles `them:¿Me pones…\|me:Claro…`, dialogId, dayKey | Диалог пройден |

Дополнения к существующим событиям (необязательные — без них кадр честно проще):

- `spire_week`: тройка недели для пьедестала — `p1Name/p1Rank/p1Coins`, `p2…`, `p3…`, своё место — `pNMe: true` (имя не нужно).
  Без них кадр показывает свою монету без соседей.
- `achievement`: `opened`, `total` — обзор «Ачивка · 3 из 24»; без них — «Ачивка».
- `theme_unlock`: `opened`, `total` — «Открыто тем: 7 из 29»; без них — только условие темы.

## 3. Данные и приватность

События живут только на устройстве (локальное хранилище историй), на сервер не уходят. Имена друзей уже есть в локальных данных
приложения (список друзей). Политику конфиденциальности это не меняет — пока события не начнут отправляться на сервер.

## 4. Что ещё не подключено

- «Улучшенная» ачивка вершины (`stage: 'upgraded'`, `spireUpgradeLabel`, проп `upgraded` у `AchievementArt`) — незакоммиченная
  работа другой сессии; кадр ачивки подключит её одной строкой, когда она будет в HEAD.
- Праздник — новый вид объявления (заголовок, текст, дата от администратора): нужен контракт объявления и редактор; пока только в фотостудии.
