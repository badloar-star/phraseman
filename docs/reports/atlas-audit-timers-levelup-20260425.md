# Аудит таймеров, загрузок и цепочки level-up — 2026-04-25

**Режим Atlas:** Smart Hybrid (`docs/atlas/atlas.prompts.md` §3) — прочитаны `docs/MASTER_MAP.md` (снимок), `docs/atlas/atlas.critical.md`, критичный путь **XP → `_layout` → модалки**; полный `atlas.full.json` не требовался для точечного фикса.

---

## 1. Инцидент: повтор «УРОВЕНЬ 2» до модалки подарка

### Причина

1. **Дубликаты в `pending_level_up_queue` (xp_manager)**  
   При level-up в очередь дописывались уровни `prevLvl+1…newLvl` поверх уже прочитанного из storage массива **без проверки на уже существующий уровень**. Если в storage уже лежал `[2]` (UI ещё не «съел» событие), повторное начисление могло дать `[2, 2]`.

2. **Гонка `flushQueue` (GlobalLevelUpHandler в `app/_layout.tsx`)**  
   Два почти одновременных async-вызова `flushQueue` могли оба выполнить `getItem('pending_level_up_queue')` **до** `removeItem`, оба сняли одну и ту же запись и **дважды** смержили `arr` в `queueRef` → снова `[2, 2]`.

3. **Поведение при `[2, 2]`**  
   После нажатия «Продолжаем!» и закрытия подарка `onGift` делал `slice(1)`; в очереди оставался ещё один `2` → `showNext` снова показывал **тот же** level-up, затем второй gift — это выглядело как «обновилась та же модалка».

### Исправление (код)

| Файл | Изменение |
|------|-----------|
| `app/xp_manager.ts` | В цикл добавления уровней: `if (!queue.includes(lvl)) queue.push(lvl)` |
| `app/_layout.tsx` | Mutex + флаг «повторить flush» после busy; дедуп при merge в `queueRef` через `Set`; `setTimeout(showNext, 600/400)` заменён на `queueMicrotask(showNext)` для мгновенного перехода без искусственной задержки |

---

## 2. Сводка: где в приложении стоят таймеры / отложенная логика

Ниже — ориентир по репозиторию (поиск `setTimeout` / `setInterval` / `queueMicrotask` в `*.ts` / `*.tsx`). Это **инвентаризация**, не призыв всё убрать: часть задержек — анимации и анти-спам.

### Корень и навигация

- `app/_layout.tsx` — `setTimeout(flushQueue, 2000)` при старте (не перекрывать онбординг), safety `setReady` ~4s, `checkShardRewards` ~3.5s, прочие отложенные `flushPending` / first-lesson sheet. **Level-up:** после фикса — `queueMicrotask` для `showNext`.

### Уроки

- `app/lesson1.tsx` — таймеры подсказки грамматики, авто-переход, shake, haptics, focus input.
- `app/lesson_words.tsx`, `lesson_verbs.tsx`, `lesson_irregular_verbs.tsx` — аналогично (энергия, TTS через `queueMicrotask`).
- `app/lesson_complete.tsx` — задержки уведомлений/закрытия.

### Квизы

- `app/quizzes.tsx`, `app/(tabs)/quizzes.tsx` — `setInterval` таймеры сессии, `setTimeout` для XP-анимаций, перерывов, auto-advance.

### Арена / матчмейкинг

- `hooks/use-arena-session.ts` — `setInterval` (тики, вопросы, обратный отсчёт).
- `app/club_screen.tsx` — буст-таймер и т.п.

### Стрик / клуб / холл славы

- `app/streak_stats.tsx` — `setInterval` 1s для отображения таймеров множителей.
- `app/(tabs)/hall_of_fame.tsx` — периодическое обновление кэша.
- `app/home.tsx` — таймеры тултипов/анимаций.

### Модалки / тосты

- `components/ClubResultModal.tsx` — confetti + таймеры.
- `components/DailyTaskToast.tsx` — auto-dismiss, анимация выхода.
- `components/LevelGiftModal.tsx` — `setTimeout` 1200ms как safety, если анимация «открытия» подарка зависнет.

### Синхронизация и сеть (фон)

- `app/cloud_sync.ts` — debounce таймер.
- `app/firestore_leaderboard.ts` — debounce push.
- Это **фон**; на UX модалок level-up не влияет при корректной локальной очереди.

### Прочее

- `app/dialogs.tsx` — много `setTimeout` (диалоговый движок).
- `components/AchievementToast.tsx`, `EnergyContext.tsx`, `BonusXPCard.tsx` — короткие UI-задержки.

---

## 3. Рекомендации (без обязательных правок в этой итерации)

- **GlobalLevelUpHandler:** стартовая задержка 2000ms для `flushQueue` оставлена, чтобы не пересечься с онбордингом; при смене логики онбординга можно уменьшить, но это отдельный UX-тест.
- **LevelGiftModal:** safety 1200ms — страховка, не «загрузка»; при желании можно сократить, сохранив гарантию `reveal`.
- Полный граф вызовов: при необходимости расширить анализ через **Atlas Deep Mode** и `docs/atlas/atlas.full.json`.

---

## 4. Верификация фикса

- Повысить уровень в сценарии, где раньше дублировалась модалка: после «Продолжаем!» сразу открывается **подарок** для того же уровня, без повторного полного экрана «УРОВЕНЬ N!».
- Повторить с быстрыми подряд начислениями XP (тестерский экран, если есть): очередь не должна содержать подряд два одинаковых `N`.
