# Аудит словаря + дистракторов (2026-05-12)

Запуск: `node scripts/audit_vocab_and_distractors.mjs`

## Сводка по типам
- **D_FP_CROSS_CLASS**: 20

**Всего замечаний:** 20

## Как читать `D_FP_CROSS_CLASS`

Один отпечаток набора distractors встречается у слотов с разными типами правильного слова (предлог vs местоимение, отрицание vs обычное слово и т.д.). Часть строк — следствие того, что в данных один и тот же пул дистракторов намеренно повторяют для разных форм (*are*/*is*). Строки с явным смешением (**prep** + **pronoun**, **prep** + **neg**) стоит проверять в первую очередь.

## Другие аудиты в репозитории

- `npm run audit:lessons` — актуальная строгая проверка уроков 1-32: фразы, словари, предлоги, drill, intro, correct-options.
- `npm run audit:translations` — эвристики по переводам фраз (`scripts/audit_translations_1_32.mjs`).
- `npm run audit:correct-presence` — слоты фраз vs токены `getPhraseWords`, дубликат correct в distractors (`scripts/audit_correct_word_presence.ts`).
- `node tools/audit/audit_lessons_1_32.mjs` — словарь vs фразы, дубликаты.
- `node scripts/audit_fake_distractors.mjs` — не-словарные англ. distractors (пакет `an-array-of-english-words` в devDependencies).

## Детали (до 400 строк)
- `D_FP_CROSS_CLASS` L6 fp=ayuda|ella|por|quiere|qué — один distractor-set для разных грамм. классов [marker, open]: L6:lesson6_phrase_24:¿; L6:lesson6_phrase_24:
- `D_FP_CROSS_CLASS` L6 fp=cash|ella|lleva|por|qué — один distractor-set для разных грамм. классов [marker, open]: L6:lesson6_phrase_29:¿; L6:lesson6_phrase_29:
- `D_FP_CROSS_CLASS` L6 fp=ayuda|ellos|necesitan|por|qué — один distractor-set для разных грамм. классов [marker, open]: L6:lesson6_phrase_33:¿; L6:lesson6_phrase_33:
- `D_FP_CROSS_CLASS` L6 fp=ella|habla|por|qué|tan — один distractor-set для разных грамм. классов [marker, open]: L6:lesson6_phrase_39:¿; L6:lesson6_phrase_39:despacio; L6:lesson6_phrase_39:
- `D_FP_CROSS_CLASS` L6 fp=cierra|ella|por|qué|ventanas — один distractor-set для разных грамм. классов [marker, open]: L6:lesson6_phrase_44:¿; L6:lesson6_phrase_44:
- `D_FP_CROSS_CLASS` L6 fp=ayuda|ella|por|qué|siempre — один distractor-set для разных грамм. классов [marker, open]: L6:lesson6_phrase_49:¿; L6:lesson6_phrase_49:
- `D_FP_CROSS_CLASS` L7 fp=billetes|mal|no|poco|tienen — один distractor-set для разных грамм. классов [marker, open]: L7:lesson7_phrase_13:; L7:lesson7_phrase_43:bolsos
- `D_FP_CROSS_CLASS` L7 fp=no|para|tengo|tiempo|un — один distractor-set для разных грамм. классов [marker, open]: L7:lesson7_phrase_50:café; L7:lesson7_phrase_50:
- `D_FP_CROSS_CLASS` L8 fp=ella|la|llama|mañana|por — один distractor-set для разных грамм. классов [marker, open]: L8:lesson8_phrase_17:¿; L8:lesson8_phrase_17:
- `D_FP_CROSS_CLASS` L8 fp=a|empieza|las|ocho|él — один distractor-set для разных грамм. классов [marker, open]: L8:lesson8_phrase_19:¿; L8:lesson8_phrase_19:
- `D_FP_CROSS_CLASS` L8 fp=el|hoy|lunes|nos|reunimos — один distractor-set для разных грамм. классов [marker, open]: L8:lesson8_phrase_20:¿; L8:lesson8_phrase_20:
- `D_FP_CROSS_CLASS` L8 fp=el|ella|tiempo|tiene|viernes — один distractor-set для разных грамм. классов [marker, open]: L8:lesson8_phrase_37:¿; L8:lesson8_phrase_37:
- `D_FP_CROSS_CLASS` L8 fp=el|haces|hoy|lunes|qué — один distractor-set для разных грамм. классов [marker, open]: L8:lesson8_phrase_41:¿; L8:lesson8_phrase_41:
- `D_FP_CROSS_CLASS` L8 fp=cuándo|la|llaman|por|tarde — один distractor-set для разных грамм. классов [marker, open]: L8:lesson8_phrase_42:¿; L8:lesson8_phrase_42:
- `D_FP_CROSS_CLASS` L8 fp=noche|por|qué|trabaja|él — один distractor-set для разных грамм. классов [marker, open]: L8:lesson8_phrase_43:¿; L8:lesson8_phrase_43:
- `D_FP_CROSS_CLASS` L8 fp=dónde|el|nos|reunimos|viernes — один distractor-set для разных грамм. классов [marker, open]: L8:lesson8_phrase_44:¿; L8:lesson8_phrase_44:
- `D_FP_CROSS_CLASS` L8 fp=cuesta|cuánto|en|hoy|invierno — один distractor-set для разных грамм. классов [marker, open]: L8:lesson8_phrase_45:¿; L8:lesson8_phrase_45:
- `D_FP_CROSS_CLASS` L8 fp=bien|duermes|la|noche|por — один distractor-set для разных грамм. классов [marker, open]: L8:lesson8_phrase_46:¿; L8:lesson8_phrase_46:
- `D_FP_CROSS_CLASS` L10 fp=bien|llamar|puede|tarde|ya — один distractor-set для разных грамм. классов [marker, open]: L10:lesson10_phrase_3:más; L10:lesson10_phrase_3:
- `D_FP_CROSS_CLASS` L10 fp=con|de|en|para|por — один distractor-set для разных грамм. классов [article, open]: L10:lesson10_phrase_11:al; L10:lesson10_phrase_28:a; L11:lesson11_phrase_11:a; L11:lesson11_phrase_12:a; L11:lesson11_phrase_12:a; L11:lesson11_phrase_44:a; L11:lesson11_phrase_45:a; L11:lesson11_phrase_46:a …