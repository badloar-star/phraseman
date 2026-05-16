# Аудит правдоподобности фраз (уроки 1–32)

Данные из актуального `lesson_data_all.ts`. **Всего фраз:** 1600.

## Методика

- Автоматические правила: кальки и неестественные сочетания (в т.ч. know/knew + время + песня/история/кино), грубые ошибки в английском, отдельные паттерны в RU.
- Сверка с ручным отчётом: идентификаторы из `docs/reports/lessons_translation_semantic_audit_1_32.md`.
- После исправления урока 12 проверка **know/knew + время + существительное типа song/story/book…** даёт **0** вхождений — аналога старой «несуществующей» фразы про песню не найдено.

## Сводка

- **Высокий приоритет (автоправила):** 0
- **Средний приоритет:** 0
- **Низкий (только эвристики, не из семантического списка):** 0
- **Фразы, перечисленные в семантическом аудите:** 43 (см. список ниже)

## Высокий приоритет — автоматические находки

_Совпадений нет._

## Средний приоритет

_Совпадений нет._

## Низкий приоритет (доп. эвристики)

_Нет записей._

## Идентификаторы из `lessons_translation_semantic_audit_1_32.md`

**Всего:** 43. В том файле — обоснования (пассив, косвенная речь, украинские формы, согласование и т.д.). Часть пунктов уже могла быть исправлена в коде — сверяйте с актуальными строками в TS.

```
lesson1_phrase_17, lesson1_phrase_46, lesson4_phrase_40, lesson6_phrase_34, lesson7_phrase_44, lesson8_phrase_14, lesson9_phrase_45, lesson10_phrase_39, lesson11_phrase_21, lesson11_phrase_25, lesson11_phrase_36, lesson13_phrase_1, lesson13_phrase_34, lesson14_phrase_20, lesson15_phrase_1, lesson16_phrase_46, lesson17_phrase_35, lesson19_phrase_17, lesson19_phrase_42, lesson21_phrase_37, lesson23_phrase_10, lesson23_phrase_17, lesson23_phrase_19, lesson23_phrase_43, lesson24_phrase_4, lesson26_phrase_1, lesson26_phrase_13, lesson27_phrase_2, lesson27_phrase_7, lesson27_phrase_29, lesson27_phrase_43, lesson28_phrase_22, lesson29_phrase_4, lesson29_phrase_28, lesson29_phrase_40, lesson30_phrase_18, lesson30_phrase_34, lesson31_phrase_26, lesson31_phrase_33, lesson31_phrase_46, lesson32_phrase_23, lesson32_phrase_29, lesson32_phrase_35
```

## Повторный запуск

`node scripts/audit_phrase_plausibility.mjs` — обновляет этот файл, `phrase_plausibility_audit.md` и JSON.
