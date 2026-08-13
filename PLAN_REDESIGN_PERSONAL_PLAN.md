# План редизайна: персональный план → эталон урока

**Дата:** 2026-06-08
**Цель:** Привести интерфейс ВСЕХ экранов персонального плана (Гавань / Митап / Вояж / Эхо / Импульс) к дизайну-эталону экранов урока (`lesson1.tsx`, `quizzes.tsx`). Урок не трогаем.
**Решения пользователя:** дистракторы — авто по длине (короткие → сетка 2 кол., длинные → список). Подход — план → утверждение → код.

---

## ЭТАЛОН — канонические значения (из кода урока, источник скриншотов)

### Палитра (токены темы, `t.*`)
| Назначение | Токен | DARK hex |
|---|---|---|
| Фон карточки/кнопки | `t.bgCard` | `#152019` |
| Текст основной | `t.textPrimary` | `#F0F7F2` |
| Текст приглушённый | `t.textMuted` | `#8AB49A` |
| Граница | `t.border` | `rgba(255,255,255,0.07)` |
| Акцент | `t.accent` | `#47C870` |
| Верно / фон | `t.correct` / `t.correctBg` | `#47C870` / `rgba(71,200,112,0.16)` |
| Неверно / фон | `t.wrong` / `t.wrongBg` | `#F05454` / `rgba(240,84,84,0.12)` |

### Шапка урока (`lesson1.tsx:759`)
- `paddingHorizontal: 15`, `paddingVertical: 12`, `gap: 6`, `flexDirection:'row'`, `alignItems:'center'`
- Кнопка назад = пилюля: `bg t.bgCard`, `borderRadius: 20`, `borderWidth: 0.5`, `borderColor t.border`, `paddingH 12`, `paddingV 7`, иконка `chevron-back 18` + текст `fontSize f.bodyLg, fontWeight '600'`
- Справа счётчики: `★{score}` `t.gold`, `●{correct}` `t.correct`, `●{wrong}` `t.wrong` — все `fontSize f.label, fontWeight '700'`, `gap 6`

### Дистрактор СЕТКА 2 кол. (`lesson1.tsx:1084`) — для коротких
- обёртка: `width '48%'`, `marginBottom 10`
- кнопка: `bg t.bgCard`, `borderRadius 12`, `borderWidth 0.5`, `borderColor t.border`, `paddingVertical 14`, `alignItems 'center'`, тень `getCardShadow`
- текст: `color t.textPrimary`, `fontSize f.numMd`, `fontWeight '500'`

### Дистрактор СПИСОК на всю ширину (`quizzes.tsx:2528`) — для длинных
- контейнер: `gap 10`
- карточка: `bg t.bgCard`, `borderRadius 14`, `borderWidth 1`, `borderColor t.border`, `padding 18`, `justifyContent 'center'`
- текст: `color t.textPrimary`, `fontSize f.h2 + 2`, `lineHeight ×1.22`, `fontWeight '600'`

### Прогресс-точки (`lesson1.tsx:1142`)
- ряд: `flexDirection 'row'`, `gap 2`
- ячейка: `flex 1`, `height 8`, `borderRadius 4`, цвет по состоянию (`getProgressCellColor`)
- счётчик справа: `fontSize f.label`, `color t.textMuted`, `minWidth 34`, `textAlign 'right'`

### Футер (`lesson1.tsx:1158`)
- `flexDirection 'row'`, `paddingVertical 14`, `borderTopWidth 0.5`, `borderTopColor t.border`
- кнопки flex=1: иконка `26` + подпись `fontSize f.label, color t.textMuted, marginTop 4`

### Состояния ответа (правильный/неверный) — токены, НЕ хардкод
- верно: bg `t.correctBg`, border `t.correct`, текст `t.correct`
- неверно: bg `t.wrongBg`, border `t.wrong`, текст `t.wrong`

---

## ПОЭКРАННЫЙ ПЛАН «было → стало»

### Экран 1 — `personal_plan_exercise.tsx` (режимы отработки) — ГЛАВНЫЙ ПО ВАЖНОСТИ

| Элемент | Было | Стало (эталон) |
|---|---|---|
| Шапка `styles.back` | 50×50, radius 17, bg `t.bgSurface2` | пилюля «← Гавань»: radius 20, bg `t.bgCard`, border 0.5, padH 12 padV 7 |
| Иконка режима справа (44×44) | `accent+'16'` рамка | **убрать** — заменить счётчиками `★/●/●` как в уроке |
| Счётчик `X/Y` (20px accent) | сплошной | оставить `X/Y` но стилем `f.label` + точки прогресса |
| Прогресс-рейл (`height 10`, сплошная полоса) | сплошная заливка | **точки**: ряд ячеек `flex1 height8 radius4 gap2` |
| `phraseCard` (radius 30, градиент, тень, minHeight 196) | большая градиентная карточка | **убрать карточку** — вопрос текстом на фоне (как урок): prompt `t.textMuted`, english `fontSize 27 fontWeight '700' textAlign center` |
| `modeIcon`/`modeStrip` (52×52, eyebrow) | полоса режима | удалить визуально или свести к подзаголовку шапки |
| Кнопки опций `styles.option` (minHeight 60, radius 18, badge A/B/C/D) | badge-буквы, radius 18 | **авто**: короткие → сетка 48% radius 12 padV 14; длинные → список radius 14 padding 18. **Badge-буквы убрать** (в эталоне их нет) |
| Цвет верного `#22C55E` / неверного `#F87171` (хардкод) | хардкод hex | → токены `t.correct`/`t.correctBg`, `t.wrong`/`t.wrongBg` |
| `wordBank`/`wordTile` (listen_build) radius 24/17 | radius крупный | radius 14, bg `t.bgCard`, border `t.border` |
| `recallInput` radius 18, border 1.5 | — | radius 12, borderWidth 0.5, линия как в уроке |
| `primaryButton` minHeight 72, radius 22, градиент | большая | привести к стилю урока: высота умереннее, акцент сплошной/градиент `t.accent`, текст `t.correctText` |
| Футер | нет фиксированного | добавить нижний бар как в уроке (Теория/Отменить) — **по согласованию, опционально** |

### Экран 2 — `personal_plan.tsx` (главный экран выбора заданий)

| Элемент | Было | Стало |
|---|---|---|
| Header кнопка назад 46×46 radius 15 | квадрат | пилюля radius 20 bg `t.bgCard` (как урок) ИЛИ оставить квадрат, но radius 14 |
| Hero card radius 28, тени | крупная | radius 14, bg `t.bgCard`, border `t.border`, padding 18 |
| Section card radius 26 | крупная | radius 14 |
| TaskRow radius 20, minHeight 70 | radius 20 | radius 12–14, bg `t.bgCard` |
| DayCard radius 20 88×96 | — | radius 12 |
| CTA `heroButton` h62 radius20 градиент | — | radius 14, акцент `t.accent` |
| Все хардкод-цвета chrome.* по темам | свитч | свести к токенам `t.*` где возможно |

### Экран 3 — `personal_plan_exercise_transition.tsx`

| Элемент | Было | Стало |
|---|---|---|
| CloseBtn 44×44 radius 14 | — | radius 14 (ок) или пилюля |
| ProgressTrack сплошная h6 | сплошная | **точки** как эталон |
| IconRing 120 radius 60 | крупный | оставить (интро-экран), но цвет → `t.accent` вместо meta hex |
| meta-цвета (#FF9F43 и т.д.) хардкод | 7 разных hex | → единый `t.accent` |
| StartButton h68 radius22 `'#fff'` хардкод текст | — | radius 14, текст `t.correctText` |

### Экран 4 — `personal_plan_stats_screen.tsx` (статистика)

| Элемент | Было | Стало |
|---|---|---|
| Hero radius 26 padding 20 | крупная | radius 14, bg `t.bgCard` |
| StatCard radius 22 | — | radius 12–14 |
| WeekBar track radius 7 | — | согласовать с эталоном прогресса |
| chrome.* свитч | хардкод | токены `t.*` |

### Экран 5 — `personal_plan_task_done.tsx` + `personal_plan_thank_you.tsx`

| Элемент | Было | Стало |
|---|---|---|
| CheckCircle 130 / IconWrap 76 | — | оставить (финальные экраны), radius согласовать |
| StatBox radius 20 | — | radius 14 |
| PrimaryButton h68 radius22 / h56 radius18 | — | radius 14, `t.accent`, текст `t.correctText` |
| `#4ECDC4` хардкод бирюза | хардкод | → `t.accent` |

---

## Принципы переписывания (применяются ко всем экранам)
1. **Радиусы:** карточки/кнопки → 12–14 (не 18–30).
2. **Фон элементов:** `t.bgCard` (#152019), граница `t.border` (0.5–1).
3. **Состояния ответа:** только токены `t.correct/t.correctBg/t.wrong/t.wrongBg` — НИКАКИХ хардкод `#22C55E`/`#F87171`/`#4ECDC4`/meta-hex.
4. **Дистракторы:** авто по длине текста (порог ~ длина строки), сетка 48% / список 100%.
5. **Прогресс:** точки-ячейки `height8 radius4 gap2`, не сплошная полоса.
6. **Шрифты:** через токены `f.*` (`f.numMd`, `f.h2`, `f.bodyLg`, `f.label`), не хардкод px где возможно.
7. **Шапка:** пилюля-назад radius 20 + счётчики `★/●/●`.
8. **Не ломать логику:** меняем только стили/верстку, обработчики и state не трогаем.

---

## Порядок работ
1. Экран 1 (`personal_plan_exercise.tsx`) — самый видимый, режимы отработки. ← начать здесь.
2. Экран 2 (`personal_plan.tsx`) — главный экран.
3. Экран 3 (`exercise_transition.tsx`).
4. Экран 4 (`stats_screen.tsx`).
5. Экран 5 (`task_done.tsx`, `thank_you.tsx`).

После каждого — `tsc` проверка (baseline ненулевой, новых ошибок не вносить) и визуальная сверка на эмуляторе (свой AVD + порт, не трогать чужие сессии).
