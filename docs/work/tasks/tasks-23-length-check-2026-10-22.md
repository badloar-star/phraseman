# Задания №23: длина подписей на 9 языках против ширины карточек макета (Переводчик → координатор, 2 · ДИЗАЙН)

Governance-ID: TG-9A76B25A0E82
Status: Ready — список и короткие варианты; файлы Learning V2 не правил
Owner: «10 · ПЕРЕВОДЧИК» (поручение координатора 22.10)

## Outcome

Проверены переводимые подписи из коммитов 470406078, 7bd1e403b, 500e5a4dc. Тексты ситуаций и целей приходят из
содержимого курса — их длина не в зоне переводчика.

**Как мерил.** Кегли из кода и макета: «что сделать» (`.todo .tt`) — 22/27, 800, рядом плитка значка 40 + зазор 12;
подписи-«кикеры» («Ситуация», «Скажите по-английски», «Скажи так») — 13/17, 700, по центру. Ширина экрана — 390 и
360 точек, поля по 20. Место под заголовком задания ≈ 298 точек (390) и ≈ 268 (360); у «Найди пары» справа ещё
таймер (~70) → ≈ 228 / 198. Средняя ширина знака Inter 800 на 22 кегле ≈ 12,4 точки, на 13/700 ≈ 7,5.

### Влезает без правок

- Все кикеры: самый длинный — id «Katakan dalam bahasa Inggris» (28 знаков ≈ 210 точек) — в одну строку.
- Кнопка нового слова «Понятно» и переводы (Got it / Entendido / Entendi / Đã hiểu / Mengerti / Anladım / Rozumiem / Зрозуміло).
- Заголовки заданий до ~19 знаков на всех языках.

### Переносится на вторую строку на экране 360 (макет — одна строка)

| Режим | Язык | Сейчас | Знаков | Короткий вариант |
|---|---|---|---|---|
| sound_contrast | en | Tell the sounds apart | 21 (≈ 260) | **Hear the difference** (19) — или **Spot the sound** (14) |
| sound_contrast | es | Distingue los sonidos | 21 (≈ 260) | **Distingue sonidos** (17) |
| scripted_repeat_compare | id | Ucapkan dengan keras | 20 (≈ 248) | **Ucapkan keras** (13) |
| speed_match (с таймером) | id | Cocokkan pasangan | 17 (≈ 211 при месте ≈ 198) | **Cari pasangan** (13) — дословно как ru «Найди пары» |

Остальные на грани, но в одну строку: es «Completa la palabra» (19), pt-BR «Complete a palavra» (18),
tr «Kelimeyi yerleştir» (18), id «Dengar dan susun» (16).

### Два источника одной подписи — разные переводы

Подпись над целью «Скажите по-английски» на экране берётся из `GOAL_SAY` в
`modules/learning-v2/runtime/task_prompt_parts_v1.ts`. В `components/learning-v2/learning_v2_task_body_copy.ts` есть
своя `sayInEnglish` (и `answer`), но она нигде не вызывается — и переведена иначе:
vi «Nói bằng tiếng Anh» ↔ «Hãy nói bằng tiếng Anh», id «Katakan dalam bahasa Inggris» ↔ «Ucapkan dalam bahasa Inggris».
Предложение: одна строка в одном месте; мёртвые `sayInEnglish` / `answer` убрать (решение Learning V2 / 2 · ДИЗАЙН).

### На заметку владельцу (не правлю — так в макете)

ru смешивает «вы» и «ты»: «Скажите по-английски», «Ответьте» — и рядом «Собери фразу», «Скажи так», «Скажи вслух».
Макет `learning-v2-tasks-review.html` написан именно так, по закону «текст = макет» оставляю дословно.

## Scope

In scope: переводимые подписи заданий №23. Out of scope: тексты ситуаций и целей из курса, правка файлов Learning V2
(они в работе у Learning V2 / 2 · ДИЗАЙН — короткие варианты передаю списком).

## Architecture

No architecture change.

## Security and privacy

Не применимо.

## Technical debt

- Ширина посчитана по средней ширине знака; окончательный ответ — снимок 6 · СВЕРКИ на экране 360.

## Verification

Кегли сверены с `LearningV2TaskChrome.tsx` (`titleText`, `numberOfLines={2}`), `LearningV2TaskBody.tsx`
(кикеры 13/17), макетом (`.todo .tt` 22/27).

## Rollback

Удалить файл.
