# Аудит предлогов: уроки 1–32

Источник данных: `category: "preposition"` во фразах `LESSON_X_PHRASES`.
Тренажёр строится `getLessonPrepositionPack()` из `app/lesson_prepositions.ts`.
Предлоги внутри одного урока не дублируются (для списка), но между уроками — повторяются.
Тренажёр отдаёт максимум 12 заданий на урок.

## Сводка

- Уроков всего: **32**
- Уроков с тренажёром предлогов: **32**
- Уроков без предлогов (тренажёр скрыт): **0**
- Всего заданий в тренажёрах: **315**
- Сумма уникальных предлогов по урокам: **258**

## По урокам

Колонка «Заданий» = `новых / повторных` в очереди тренажёра (новые всегда идут первыми, лимит 12).

| Урок | Новых | Повторных | Заданий (н/п) | Новые предлоги | Повторные |
|------|-------|-----------|---------------|----------------|-----------|
| 1 | 3 | 0 | 12 (12/0) | at, on, in | — |
| 2 | 0 | 3 | 12 (0/12) | — | at, in, on |
| 3 | 1 | 2 | 3 (1/2) | to | in, on |
| 4 | 1 | 1 | 2 (1/1) | for | to |
| 5 | 1 | 2 | 3 (1/2) | inside | in, for |
| 6 | 0 | 2 | 2 (0/2) | — | to, for |
| 7 | 2 | 1 | 5 (3/2) | with, about | for |
| 8 | 2 | 4 | 12 (2/10) | off, up | on, at, in, to |
| 9 | 0 | 3 | 12 (0/12) | — | in, on, at |
| 10 | 0 | 6 | 12 (0/12) | — | at, to, with, on, for, in |
| 11 | 0 | 2 | 2 (0/2) | — | on, off |
| 12 | 0 | 4 | 7 (0/7) | — | to, on, at, in |
| 13 | 0 | 3 | 11 (0/11) | — | in, up, for |
| 14 | 1 | 3 | 10 (1/9) | into | in, to, for |
| 15 | 0 | 2 | 6 (0/6) | — | on, in |
| 16 | 10 | 9 | 12 (12/0) | out, of, from, after, down, around, by, without, over, across | up, in, on, for, off, at, to, into, with |
| 17 | 3 | 8 | 12 (7/5) | outside, through, behind | in, to, on, for, by, into, of, at |
| 18 | 3 | 13 | 12 (5/7) | under, onto, near | to, on, into, in, with, for, at, of, from, around, off, after, without |
| 19 | 5 | 13 | 12 (12/0) | above, between, opposite, among, along | on, in, under, behind, near, inside, of, around, at, to, outside, onto, over |
| 20 | 0 | 10 | 12 (0/12) | — | in, on, without, to, under, from, behind, for, over, about |
| 21 | 1 | 12 | 12 (2/10) | during | on, at, to, in, for, about, after, of, into, under, near, inside |
| 22 | 0 | 10 | 12 (0/12) | — | in, by, at, for, without, on, with, to, from, along |
| 23 | 0 | 10 | 12 (0/12) | — | by, on, in, at, of, to, from, with, for, into |
| 24 | 1 | 11 | 12 (1/11) | before | in, for, at, to, about, on, of, with, from, across, during |
| 25 | 0 | 11 | 12 (0/12) | — | to, at, in, during, of, for, on, with, under, up, around |
| 26 | 0 | 7 | 12 (0/12) | — | up, to, on, into, in, for, at |
| 27 | 0 | 8 | 12 (0/12) | — | in, on, before, for, to, from, near, at |
| 28 | 0 | 15 | 12 (0/12) | — | in, with, after, to, at, around, of, before, through, for, off, during, on, up, by |
| 29 | 0 | 16 | 12 (0/12) | — | to, in, before, for, across, during, near, without, up, at, after, behind, of, with, on, from |
| 30 | 0 | 10 | 12 (0/12) | — | for, on, in, over, to, before, by, from, with, through |
| 31 | 0 | 7 | 12 (0/12) | — | on, of, into, at, to, during, onto |
| 32 | 1 | 15 | 12 (1/11) | against | to, on, by, during, about, around, for, with, in, before, into, along, over, at, of |

## Замечания по построению заданий

- Урок 8: пропущено 1 (нет места для пропуска в шаблоне) + 0 (мало вариантов).
- Урок 20: пропущено 1 (нет места для пропуска в шаблоне) + 0 (мало вариантов).
- Урок 25: пропущено 11 (нет места для пропуска в шаблоне) + 0 (мало вариантов).
