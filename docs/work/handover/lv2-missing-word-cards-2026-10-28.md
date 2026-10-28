# Learning V2: новые слова без карточки слова — передача для Codex / фабрики курса (28.10)

От: Learning V2 (по поручению координатора 28.10). Сторож: `tests/learning_v2_live_new_word_before_phrase.test.ts`,
тест «every declared new word has its own word card in the session» — красный.

## Что не так

В `content/learning-v2-course/sessions/en/<урок>/<занятие>/final.ru.md` строка `**Новые слова:**` объявляет слово новым,
а в выпущенном `modules/learning-v2/content/factory_native/generated_release/en/<урок>/<занятие>/learner.json` нет карточки
этого слова (`modePayload.isWordCard` + `wordCard.word`). Человек встречает «новое» слово сразу во фразе, без знакомства.
Появилось с выпуском английского курса целиком (cf3e41b2b): все случаи в уроках 24–26.

## Почему не исправлено в Learning V2

`content/learning-v2-course` — у фабрики/Codex (там же незакоммиченные правки: pipeline/check.mjs, испанский урок 7);
по правилу владельца курс не дописывается руками, а уходит редактору. Сторож оставлен красным намеренно, в KNOWN_HOLES не добавлено.

## Что сделать

Для каждого занятия ниже: либо добавить карточку слова перед первой фразой с ним, либо убрать слово из «Новые слова»,
если оно не новое. Пересобрать релиз (`build_release.mjs`) и манифест; прогнать сторож.

## Список (84 слова, 29 занятий; скрипт-копия scan() сторожа, HEAD 28.10 вечер)

- l24/s48: cuddle, sob, groan, yell
- l25/s17: redo, rebuild, rewash
- l25/s18: rewrite, retell, revisit, reunite
- l25/s19: confuse, embarrass, scare, satisfy
- l25/s20: blend, dissolve, thicken, shred
- l25/s21: curl, wrinkle, shorten, lengthen
- l25/s22: accuse, forbid, beg, applaud
- l25/s23: land, flee, hunt, release
- l25/s24: brighten, widen, deepen, expand
- l25/s25: reverse, overtake, skid, collide
- l25/s26: grumble, nag, scold, whine
- l25/s27: spoil, stink
- l25/s33: insert, undo, pile, unhook
- l25/s34: fingernail, toenail
- l25/s36: entertain, amaze, irritate, flatter
- l25/s40: bang, crash, beep, honk
- l25/s45: recall, predict, examine, insist
- l25/s48: paw, claw
- l25/s50: mealtime
- l25/s51: regain, reconsider, endure, retrieve
- l25/s54: herb, spice
- l26/s01: evaporate, condense, splatter
- l26/s02: roar
- l26/s03: vibrate, rotate
- l26/s06: throb
- l26/s08: chunk, lack
- l26/s09: kid
- l26/s11: gum
- l26/s13: raisin
