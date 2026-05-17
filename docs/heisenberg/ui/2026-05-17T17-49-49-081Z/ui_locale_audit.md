# Heisenberg UI Locale Audit

Generated: 2026-05-17T17:49:49.080Z
Activation ready: no
Planned locales: pt-BR, vi, id, tr, pl

## Summary
- Files scanned: 580
- triLang calls: 1510
- Static triLang calls: 1508
- Dynamic triLang calls: 2
- Legacy L(lang, ru, uk, es) helper calls: 180
- triLang missing locale units: 20
- triLang calls missing all planned locales: 4
- Helper missing locale units: 900
- Bundle missing locale units: 10

## Finding Codes
- trilang-missing-all-planned-locales: 4
- legacy-lang-helper-missing-planned-locales: 180
- dynamic-trilang-copy: 2
- lang-context-bundle-missing-planned-locale: 5
- i18n-t-bundle-missing-planned-locales: 1

## Top Files
- app/hint.tsx: 180 findings, 900 missing locale units
- app/diagnostic_test.tsx: 2 findings, 10 missing locale units
- components/LangContext.tsx: 5 findings, 5 missing locale units
- app/lesson_help.tsx: 1 findings, 5 missing locale units
- app/premium_modal.tsx: 1 findings, 5 missing locale units
- constants/i18n.ts: 1 findings, 5 missing locale units
- components/DeleteAccountConfirmModal.tsx: 1 findings, 0 missing locale units
- components/ReleaseNotesModal.tsx: 1 findings, 0 missing locale units

## First Findings
- [warning] trilang-missing-all-planned-locales app/diagnostic_test.tsx:1141 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: q.hintRU, uk: q.hintUK, es: q.hintES }
- [warning] trilang-missing-all-planned-locales app/diagnostic_test.tsx:1290 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: q.hintRU, uk: q.hintUK, es: q.hintES }
- [warning] legacy-lang-helper-missing-planned-locales app/hint.tsx:121 missing: pt-BR, vi, id, tr, pl: Legacy L(lang, ru, uk, es) helper bypasses planned interface locales. | L(lang,'Подлежащее','Підмет','Sujeto')
- [warning] legacy-lang-helper-missing-planned-locales app/hint.tsx:121 missing: pt-BR, vi, id, tr, pl: Legacy L(lang, ru, uk, es) helper bypasses planned interface locales. | L(lang,'Утверждение','Ствердження','Afirmación')
- [warning] legacy-lang-helper-missing-planned-locales app/hint.tsx:121 missing: pt-BR, vi, id, tr, pl: Legacy L(lang, ru, uk, es) helper bypasses planned interface locales. | L(lang,'Отрицание','Заперечення','Negación')
- [warning] legacy-lang-helper-missing-planned-locales app/hint.tsx:121 missing: pt-BR, vi, id, tr, pl: Legacy L(lang, ru, uk, es) helper bypasses planned interface locales. | L(lang,'Вопрос','Питання','Pregunta')
- [warning] legacy-lang-helper-missing-planned-locales app/hint.tsx:140 missing: pt-BR, vi, id, tr, pl: Legacy L(lang, ru, uk, es) helper bypasses planned interface locales. | L(lang,'Отрицание (нет «являться» у глагола)','Заперечення (не є)','Negación')
- [warning] legacy-lang-helper-missing-planned-locales app/hint.tsx:141 missing: pt-BR, vi, id, tr, pl: Legacy L(lang, ru, uk, es) helper bypasses planned interface locales. | L(lang,'Подлежащее','Підмет','Sujeto')
- [warning] legacy-lang-helper-missing-planned-locales app/hint.tsx:141 missing: pt-BR, vi, id, tr, pl: Legacy L(lang, ru, uk, es) helper bypasses planned interface locales. | L(lang,'Полная форма','Повна форма','Forma completa')
- [warning] legacy-lang-helper-missing-planned-locales app/hint.tsx:141 missing: pt-BR, vi, id, tr, pl: Legacy L(lang, ru, uk, es) helper bypasses planned interface locales. | L(lang,'Сокращение','Скорочення','Forma corta')
- [warning] legacy-lang-helper-missing-planned-locales app/hint.tsx:149 missing: pt-BR, vi, id, tr, pl: Legacy L(lang, ru, uk, es) helper bypasses planned interface locales. | L(lang,'Вопросы и краткие ответы','Питання та короткі відповіді','Preguntas y respuestas breves')
- [warning] legacy-lang-helper-missing-planned-locales app/hint.tsx:150 missing: pt-BR, vi, id, tr, pl: Legacy L(lang, ru, uk, es) helper bypasses planned interface locales. | L(lang,'Вопрос','Питання','Pregunta')
- [warning] legacy-lang-helper-missing-planned-locales app/hint.tsx:150 missing: pt-BR, vi, id, tr, pl: Legacy L(lang, ru, uk, es) helper bypasses planned interface locales. | L(lang,'Да','Так','Sí')
- [warning] legacy-lang-helper-missing-planned-locales app/hint.tsx:150 missing: pt-BR, vi, id, tr, pl: Legacy L(lang, ru, uk, es) helper bypasses planned interface locales. | L(lang,'Нет','Ні','No')
- [warning] legacy-lang-helper-missing-planned-locales app/hint.tsx:166 missing: pt-BR, vi, id, tr, pl: Legacy L(lang, ru, uk, es) helper bypasses planned interface locales. | L(lang,'Глагол','Дієслово','Verbo')
- [warning] legacy-lang-helper-missing-planned-locales app/hint.tsx:166 missing: pt-BR, vi, id, tr, pl: Legacy L(lang, ru, uk, es) helper bypasses planned interface locales. | L(lang,'Пример','Приклад','Ejemplo')
- [warning] legacy-lang-helper-missing-planned-locales app/hint.tsx:171 missing: pt-BR, vi, id, tr, pl: Legacy L(lang, ru, uk, es) helper bypasses planned interface locales. | L(lang,'Правило','Правило','Regla')
- [warning] legacy-lang-helper-missing-planned-locales app/hint.tsx:171 missing: pt-BR, vi, id, tr, pl: Legacy L(lang, ru, uk, es) helper bypasses planned interface locales. | L(lang,'Пример','Приклад','Ejemplo')
- [warning] legacy-lang-helper-missing-planned-locales app/hint.tsx:197 missing: pt-BR, vi, id, tr, pl: Legacy L(lang, ru, uk, es) helper bypasses planned interface locales. | L(lang,'Подлежащее','Підмет','Sujeto')
- [warning] legacy-lang-helper-missing-planned-locales app/hint.tsx:197 missing: pt-BR, vi, id, tr, pl: Legacy L(lang, ru, uk, es) helper bypasses planned interface locales. | L(lang,'Отрицание','Заперечення','Negación')
- [warning] legacy-lang-helper-missing-planned-locales app/hint.tsx:197 missing: pt-BR, vi, id, tr, pl: Legacy L(lang, ru, uk, es) helper bypasses planned interface locales. | L(lang,'Вопрос','Питання','Pregunta')
- [warning] legacy-lang-helper-missing-planned-locales app/hint.tsx:204 missing: pt-BR, vi, id, tr, pl: Legacy L(lang, ru, uk, es) helper bypasses planned interface locales. | L(lang,'Примеры','Приклади','Ejemplos')
- [warning] legacy-lang-helper-missing-planned-locales app/hint.tsx:205 missing: pt-BR, vi, id, tr, pl: Legacy L(lang, ru, uk, es) helper bypasses planned interface locales. | L(lang,'Утверждение','Ствердження','Afirmación')
- [warning] legacy-lang-helper-missing-planned-locales app/hint.tsx:205 missing: pt-BR, vi, id, tr, pl: Legacy L(lang, ru, uk, es) helper bypasses planned interface locales. | L(lang,'Отрицание','Заперечення','Negación')
- [warning] legacy-lang-helper-missing-planned-locales app/hint.tsx:220 missing: pt-BR, vi, id, tr, pl: Legacy L(lang, ru, uk, es) helper bypasses planned interface locales. | L(lang,'Общие вопросы','Загальні питання','Preguntas generales')
- [warning] legacy-lang-helper-missing-planned-locales app/hint.tsx:221 missing: pt-BR, vi, id, tr, pl: Legacy L(lang, ru, uk, es) helper bypasses planned interface locales. | L(lang,'Подлежащее','Підмет','Sujeto')
- [warning] legacy-lang-helper-missing-planned-locales app/hint.tsx:221 missing: pt-BR, vi, id, tr, pl: Legacy L(lang, ru, uk, es) helper bypasses planned interface locales. | L(lang,'Вопрос','Питання','Pregunta')
- [warning] legacy-lang-helper-missing-planned-locales app/hint.tsx:221 missing: pt-BR, vi, id, tr, pl: Legacy L(lang, ru, uk, es) helper bypasses planned interface locales. | L(lang,'Ответ','Відповідь','Respuesta')
- [warning] legacy-lang-helper-missing-planned-locales app/hint.tsx:228 missing: pt-BR, vi, id, tr, pl: Legacy L(lang, ru, uk, es) helper bypasses planned interface locales. | L(lang,'Специальные вопросы (Wh-)','Спеціальні питання (Wh-)','Preguntas Wh-')
- [warning] legacy-lang-helper-missing-planned-locales app/hint.tsx:229 missing: pt-BR, vi, id, tr, pl: Legacy L(lang, ru, uk, es) helper bypasses planned interface locales. | L(lang,'Пример','Приклад','Ejemplo')
- [warning] legacy-lang-helper-missing-planned-locales app/hint.tsx:246 missing: pt-BR, vi, id, tr, pl: Legacy L(lang, ru, uk, es) helper bypasses planned interface locales. | L(lang,'Значение','Значення','Significado')
- [warning] legacy-lang-helper-missing-planned-locales app/hint.tsx:246 missing: pt-BR, vi, id, tr, pl: Legacy L(lang, ru, uk, es) helper bypasses planned interface locales. | L(lang,'Пример','Приклад','Ejemplo')
- [warning] legacy-lang-helper-missing-planned-locales app/hint.tsx:277 missing: pt-BR, vi, id, tr, pl: Legacy L(lang, ru, uk, es) helper bypasses planned interface locales. | L(lang,'Формула специального вопроса','Формула спеціального питання','Estructura de la pregunta Wh-')
- [warning] legacy-lang-helper-missing-planned-locales app/hint.tsx:278 missing: pt-BR, vi, id, tr, pl: Legacy L(lang, ru, uk, es) helper bypasses planned interface locales. | L(lang,'Подлежащее','Підмет','Sujeto')
- [warning] legacy-lang-helper-missing-planned-locales app/hint.tsx:278 missing: pt-BR, vi, id, tr, pl: Legacy L(lang, ru, uk, es) helper bypasses planned interface locales. | L(lang,'Формула','Формула','Estructura')
- [warning] legacy-lang-helper-missing-planned-locales app/hint.tsx:278 missing: pt-BR, vi, id, tr, pl: Legacy L(lang, ru, uk, es) helper bypasses planned interface locales. | L(lang,'Пример','Приклад','Ejemplo')
- [warning] legacy-lang-helper-missing-planned-locales app/hint.tsx:296 missing: pt-BR, vi, id, tr, pl: Legacy L(lang, ru, uk, es) helper bypasses planned interface locales. | L(lang,'Подлежащее','Підмет','Sujeto')
- [warning] legacy-lang-helper-missing-planned-locales app/hint.tsx:296 missing: pt-BR, vi, id, tr, pl: Legacy L(lang, ru, uk, es) helper bypasses planned interface locales. | L(lang,'Утверждение','Ствердження','Afirmación')
- [warning] legacy-lang-helper-missing-planned-locales app/hint.tsx:296 missing: pt-BR, vi, id, tr, pl: Legacy L(lang, ru, uk, es) helper bypasses planned interface locales. | L(lang,'Отрицание','Заперечення','Negación')
- [warning] legacy-lang-helper-missing-planned-locales app/hint.tsx:296 missing: pt-BR, vi, id, tr, pl: Legacy L(lang, ru, uk, es) helper bypasses planned interface locales. | L(lang,'Вопрос','Питання','Pregunta')
- [warning] legacy-lang-helper-missing-planned-locales app/hint.tsx:303 missing: pt-BR, vi, id, tr, pl: Legacy L(lang, ru, uk, es) helper bypasses planned interface locales. | L(lang,'Примеры','Приклади','Ejemplos')
- [warning] legacy-lang-helper-missing-planned-locales app/hint.tsx:304 missing: pt-BR, vi, id, tr, pl: Legacy L(lang, ru, uk, es) helper bypasses planned interface locales. | L(lang,'Предложение','Речення','Oración')
- [warning] legacy-lang-helper-missing-planned-locales app/hint.tsx:318 missing: pt-BR, vi, id, tr, pl: Legacy L(lang, ru, uk, es) helper bypasses planned interface locales. | L(lang,'Предлог','Прийменник','Preposición')
- [warning] legacy-lang-helper-missing-planned-locales app/hint.tsx:318 missing: pt-BR, vi, id, tr, pl: Legacy L(lang, ru, uk, es) helper bypasses planned interface locales. | L(lang,'Употребляется с','Вживається з','Va con')
- [warning] legacy-lang-helper-missing-planned-locales app/hint.tsx:318 missing: pt-BR, vi, id, tr, pl: Legacy L(lang, ru, uk, es) helper bypasses planned interface locales. | L(lang,'Примеры','Приклади','Ejemplos')
- [warning] legacy-lang-helper-missing-planned-locales app/hint.tsx:341 missing: pt-BR, vi, id, tr, pl: Legacy L(lang, ru, uk, es) helper bypasses planned interface locales. | L(lang,'Число','Число','Número')
- [warning] legacy-lang-helper-missing-planned-locales app/hint.tsx:341 missing: pt-BR, vi, id, tr, pl: Legacy L(lang, ru, uk, es) helper bypasses planned interface locales. | L(lang,'Утверждение','Ствердження','Afirmación')
- [warning] legacy-lang-helper-missing-planned-locales app/hint.tsx:341 missing: pt-BR, vi, id, tr, pl: Legacy L(lang, ru, uk, es) helper bypasses planned interface locales. | L(lang,'Отрицание','Заперечення','Negación')
- [warning] legacy-lang-helper-missing-planned-locales app/hint.tsx:341 missing: pt-BR, vi, id, tr, pl: Legacy L(lang, ru, uk, es) helper bypasses planned interface locales. | L(lang,'Вопрос','Питання','Pregunta')
- [warning] legacy-lang-helper-missing-planned-locales app/hint.tsx:343 missing: pt-BR, vi, id, tr, pl: Legacy L(lang, ru, uk, es) helper bypasses planned interface locales. | L(lang,'Ед.ч.','Одн.','Sing.')
- [warning] legacy-lang-helper-missing-planned-locales app/hint.tsx:344 missing: pt-BR, vi, id, tr, pl: Legacy L(lang, ru, uk, es) helper bypasses planned interface locales. | L(lang,'Мн.ч.','Мн.','Plur.')
- [warning] legacy-lang-helper-missing-planned-locales app/hint.tsx:348 missing: pt-BR, vi, id, tr, pl: Legacy L(lang, ru, uk, es) helper bypasses planned interface locales. | L(lang,'Предлоги места','Прийменники місця','Preposiciones de lugar')
- [warning] legacy-lang-helper-missing-planned-locales app/hint.tsx:349 missing: pt-BR, vi, id, tr, pl: Legacy L(lang, ru, uk, es) helper bypasses planned interface locales. | L(lang,'Предлог','Прийменник','Prep.')
- [warning] legacy-lang-helper-missing-planned-locales app/hint.tsx:349 missing: pt-BR, vi, id, tr, pl: Legacy L(lang, ru, uk, es) helper bypasses planned interface locales. | L(lang,'Значение','Значення','Significado')
- [warning] legacy-lang-helper-missing-planned-locales app/hint.tsx:349 missing: pt-BR, vi, id, tr, pl: Legacy L(lang, ru, uk, es) helper bypasses planned interface locales. | L(lang,'Пример','Приклад','Ejemplo')
- [warning] legacy-lang-helper-missing-planned-locales app/hint.tsx:387 missing: pt-BR, vi, id, tr, pl: Legacy L(lang, ru, uk, es) helper bypasses planned interface locales. | L(lang,'Глагол','Дієслово','Verbo')
- [warning] legacy-lang-helper-missing-planned-locales app/hint.tsx:387 missing: pt-BR, vi, id, tr, pl: Legacy L(lang, ru, uk, es) helper bypasses planned interface locales. | L(lang,'Значение','Значення','Significado')
- [warning] legacy-lang-helper-missing-planned-locales app/hint.tsx:387 missing: pt-BR, vi, id, tr, pl: Legacy L(lang, ru, uk, es) helper bypasses planned interface locales. | L(lang,'Пример','Приклад','Ejemplo')
- [warning] legacy-lang-helper-missing-planned-locales app/hint.tsx:425 missing: pt-BR, vi, id, tr, pl: Legacy L(lang, ru, uk, es) helper bypasses planned interface locales. | L(lang,'Форма','Форма','Forma')
- [warning] legacy-lang-helper-missing-planned-locales app/hint.tsx:425 missing: pt-BR, vi, id, tr, pl: Legacy L(lang, ru, uk, es) helper bypasses planned interface locales. | L(lang,'Структура','Структура','Estructura')
- [warning] legacy-lang-helper-missing-planned-locales app/hint.tsx:425 missing: pt-BR, vi, id, tr, pl: Legacy L(lang, ru, uk, es) helper bypasses planned interface locales. | L(lang,'Пример','Приклад','Ejemplo')
- [warning] legacy-lang-helper-missing-planned-locales app/hint.tsx:433 missing: pt-BR, vi, id, tr, pl: Legacy L(lang, ru, uk, es) helper bypasses planned interface locales. | L(lang,'Правила написания','Правила написання','Reglas ortográficas')
- [warning] legacy-lang-helper-missing-planned-locales app/hint.tsx:434 missing: pt-BR, vi, id, tr, pl: Legacy L(lang, ru, uk, es) helper bypasses planned interface locales. | L(lang,'Правило','Правило','Regla')
- [warning] legacy-lang-helper-missing-planned-locales app/hint.tsx:434 missing: pt-BR, vi, id, tr, pl: Legacy L(lang, ru, uk, es) helper bypasses planned interface locales. | L(lang,'Пример','Приклад','Ejemplo')
- [warning] legacy-lang-helper-missing-planned-locales app/hint.tsx:460 missing: pt-BR, vi, id, tr, pl: Legacy L(lang, ru, uk, es) helper bypasses planned interface locales. | L(lang,'Форма','Форма','Forma')
- [warning] legacy-lang-helper-missing-planned-locales app/hint.tsx:460 missing: pt-BR, vi, id, tr, pl: Legacy L(lang, ru, uk, es) helper bypasses planned interface locales. | L(lang,'Структура','Структура','Estructura')
- [warning] legacy-lang-helper-missing-planned-locales app/hint.tsx:460 missing: pt-BR, vi, id, tr, pl: Legacy L(lang, ru, uk, es) helper bypasses planned interface locales. | L(lang,'Пример','Приклад','Ejemplo')
- [warning] legacy-lang-helper-missing-planned-locales app/hint.tsx:468 missing: pt-BR, vi, id, tr, pl: Legacy L(lang, ru, uk, es) helper bypasses planned interface locales. | L(lang,'Частые глаголы','Часті дієслова','Verbos frecuentes')
- [warning] legacy-lang-helper-missing-planned-locales app/hint.tsx:469 missing: pt-BR, vi, id, tr, pl: Legacy L(lang, ru, uk, es) helper bypasses planned interface locales. | L(lang,'Значение','Значення','Significado')
- [warning] legacy-lang-helper-missing-planned-locales app/hint.tsx:513 missing: pt-BR, vi, id, tr, pl: Legacy L(lang, ru, uk, es) helper bypasses planned interface locales. | L(lang,'Форма','Форма','Forma')
- [warning] legacy-lang-helper-missing-planned-locales app/hint.tsx:513 missing: pt-BR, vi, id, tr, pl: Legacy L(lang, ru, uk, es) helper bypasses planned interface locales. | L(lang,'Структура','Структура','Estructura')
- [warning] legacy-lang-helper-missing-planned-locales app/hint.tsx:513 missing: pt-BR, vi, id, tr, pl: Legacy L(lang, ru, uk, es) helper bypasses planned interface locales. | L(lang,'Пример','Приклад','Ejemplo')
- [warning] legacy-lang-helper-missing-planned-locales app/hint.tsx:518 missing: pt-BR, vi, id, tr, pl: Legacy L(lang, ru, uk, es) helper bypasses planned interface locales. | L(lang,'Сокр.','Скор.','Contr.')
- [warning] legacy-lang-helper-missing-planned-locales app/hint.tsx:522 missing: pt-BR, vi, id, tr, pl: Legacy L(lang, ru, uk, es) helper bypasses planned interface locales. | L(lang,'Когда использовать','Коли вживать','Cuándo usarlo')
- [warning] legacy-lang-helper-missing-planned-locales app/hint.tsx:523 missing: pt-BR, vi, id, tr, pl: Legacy L(lang, ru, uk, es) helper bypasses planned interface locales. | L(lang,'Ситуация','Ситуація','Uso')
- [warning] legacy-lang-helper-missing-planned-locales app/hint.tsx:523 missing: pt-BR, vi, id, tr, pl: Legacy L(lang, ru, uk, es) helper bypasses planned interface locales. | L(lang,'Пример','Приклад','Ejemplo')
- [warning] legacy-lang-helper-missing-planned-locales app/hint.tsx:549 missing: pt-BR, vi, id, tr, pl: Legacy L(lang, ru, uk, es) helper bypasses planned interface locales. | L(lang,'Короткие прилагательные','Короткі прикметники','Adjetivos cortos')
- [warning] legacy-lang-helper-missing-planned-locales app/hint.tsx:550 missing: pt-BR, vi, id, tr, pl: Legacy L(lang, ru, uk, es) helper bypasses planned interface locales. | L(lang,'Обычное','Звичайне','Positivo')
- [warning] legacy-lang-helper-missing-planned-locales app/hint.tsx:550 missing: pt-BR, vi, id, tr, pl: Legacy L(lang, ru, uk, es) helper bypasses planned interface locales. | L(lang,'Сравнит.','Порівняльне','Comparativo')
- [warning] legacy-lang-helper-missing-planned-locales app/hint.tsx:550 missing: pt-BR, vi, id, tr, pl: Legacy L(lang, ru, uk, es) helper bypasses planned interface locales. | L(lang,'Превосх.','Найвищий','Superlativo')
