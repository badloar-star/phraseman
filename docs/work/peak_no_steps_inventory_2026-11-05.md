# Пик: инвентаризация слов «ступени» (запрет владельца, 05.11)

Запрет: в Пике только монеты и этажи. Слова «ступень / ступени / steps» и их переводы в строках ранжирования и тура убираются.

## A. Ранжирование и место (менять первым)

| файл | ключ | сейчас (ru) | должно быть |
|---|---|---|---|
| components/spire/spire_game_strings.ts | rankedBySteps | «место по ступеням» | удалить; подзаголовок «<лига> · N человек» |
| components/spire/spire_strings.ts | stepsShort | «ступ.» | удалить; значение в строке — число монет без слова |
| components/spire/spire_plurals.ts | spireStepsWord, spireStepsCount, spireStepsShort, spireStepsWordAfterOf | формы «ступень» | не вызывать в Пике |
| components/spire/moments/moments_strings.ts | promoCountingPlaces | «Считаем ступени недели…» | «Считаем места недели…» |
| components/spire/moments/moments_strings.ts | promoShortBodySteps | «N место · N ступеней за неделю» | «N место · N монет за неделю» |
| components/spire/moments/moments_strings.ts | promoShareTextSteps | текст шаринга со ступенями | тот же смысл, монеты |
| components/spire/moments/moments_strings.ts | stayBodyStepsNoGap | «разрыв в ступенях» | разрыв в монетах |
| components/spire/moments/moments_strings.ts | downBodyNoSteps | «Неделя без единой ступени…» | «Неделя без монет…» (уточнить по смыслу спуска) |
| components/spire/moments/position_moment_strings.ts | overtakeSubSteps | «на N ступеней» | «на N монет» |
| components/spire/moments/position_moment_strings.ts | gapSteps | «ступени до топ-5» | «монеты до топ-5» |
| components/spire/spire_record_copy.ts | title | «Рекорд ступени» | «Рекорд этажа» (уточнить) |

## B. Тур и подсказки (менять вторым)

| файл | ключ | замечание |
|---|---|---|
| components/spire/spire_game_strings.ts | tour1Text | «15 этажей из ступеней… место считается по ступеням» |
| components/spire/spire_game_strings.ts | tour1TextCoins | «15 этажей из ступеней…» |
| components/spire/spire_game_strings.ts | tour2Text | «Один таймер на всю ступень» |
| components/spire/spire_game_strings.ts | tour3Text | «все без ступеней спускаются» |

## C. Ход игры: «ступень» как единица прохождения (ВОПРОС КООРДИНАТОРУ)

Ключи: step, exitTitle, exitText, continueStep, preparing, stepPassed, oneHigher, stepFailed, failHearts, failBack, saveFailed, stepNotCounted, peakStepRecord.

Нужно решение: это тоже запрет (тогда нужна новая единица вместо «ступени») или только ранжирование и места. Пока не меняются.

## Для Ревизора (сторож): запрещённые корни по 9 языкам

- ru: ступен, ступень, ступени, ступ.
- uk: сходин, сход.
- en: step, steps
- es: escalón, escalones, esc.
- pt-BR: degrau, degraus, deg.
- vi: bậc
- id: anak tangga, lgk
- tr: basamak, bsm
- pl: stopień, stopni, stopnie, st.
