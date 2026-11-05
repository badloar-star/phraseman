# Схема «Неправильные глаголы» классических курсов fr / es / de / it (шаг A, 05.11)

Владелец: раздел должен быть НАСТОЯЩИМ (без заглушек). Пока список не проверен — в меню раздел скрыт (hidden). Возвращается только после зелёной сверки + аудита.
Исполнитель шагов B–E: сессия «9 · Сайт»; рецензент (программная сверка `scripts/classic_irregular_verbs_check.mjs` — пишет Теория после схемы): сессия «12 · Теория».

## Файл и расположение
`modules/classic-courses/<lang>/irregular_verbs.json` (lang ∈ fr|es|de|it). Не править app/ — подключение делает Learning V2.

```json
{
  "schema": "phraseman.classic-irregular-verbs/1",
  "lang": "de",
  "formsLayout": [ {"key":"inf","label":{"ru":"Инфинитив","uk":"Інфінітив"}},
                   {"key":"praet","label":{"ru":"Претерит (3 л. ед.)","uk":"Претерит (3 ос. одн.)"}},
                   {"key":"pp","label":{"ru":"Партицип II","uk":"Партицип II"}} ],
  "lessons": {
    "3": [
      { "lemma": "sein",
        "meaning": {"ru":"быть","uk":"бути"},
        "forms": {"inf":"sein","praet":"war","pp":"gewesen"},
        "aux": "sein",
        "note": {"ru":"…коротко, 1 строка, без жаргона","uk":"…"},
        "examples": ["de:03:07","de:17:46"] }
    ]
  }
}
```
- `lessons[N]` — глаголы, которые ВПЕРВЫЕ нужны в уроке N (первое вхождение в фразах курса: формулы ниже). Если в уроке нет — ключ отсутствует (раздел для урока скрыт).
- `examples` — id фраз курса (`<lang>:LL:PP`), где реально встречается любая форма глагола; минимум 1, максимум 3. Форма из `forms` должна встречаться в target этой фразы (проверка сверки).
- `meaning`, `note` — ru и uk обязательны, полные естественные тексты, без обратных кавычек/markdown.

## formsLayout по языкам (ровно эти ключи)
- fr: `inf` (infinitif), `present` (je/il — présent: «je vais / il va»), `pc` (passé composé: «je suis allé»), `futur` («j’irai»). Форма записывается с местоимением, `aux` = avoir|être.
- es: `inf`, `presente` (yo / él), `preterito` (yo / él), `participio`. Для стемовых глаголов — все четыре.
- de: `inf`, `praet` (er/sie/es), `pp` (Partizip II), `aux` = haben|sein; для сильных глаголов также `pres3` (er/sie/es Präsens) если меняется корневая гласная (fahren → fährt).
- it: `inf`, `presente` (io / lui), `pp` (participio passato), `aux` = avere|essere.

## Что считается «неправильным»
Только глаголы, форма которых не выводится правилом: fr — все глаголы-исключения 3-й группы + aller, être, avoir, faire, pouvoir, vouloir, savoir, venir, voir, prendre, dire, mettre, devoir…; es — стемовые (e→ie, o→ue, e→i), irregular pretérito, ser/estar/ir/tener/hacer/decir…; de — сильные и смешанные (sein, haben, werden, gehen, kommen, fahren, nehmen, geben, sehen, essen, wissen, können…), модальные; it — essere, avere, andare, fare, dare, stare, venire, volere, potere, dovere, dire, uscire, bere, scegliere…
Правильные глаголы в список НЕ входят.

## Сбор кандидатов (шаг B)
Берём все токены target+accepted+alternatives фраз урока, приводим к лемме по `glossary.json` (поля `lemma`, `firstLesson`, `phraseIds`), оставляем те, что в словаре неправильных глаголов языка. `lessons[N]` = глаголы с `firstLesson == N`.

## Контроль качества (шаг C — программная сверка, Теория)
`node scripts/classic_irregular_verbs_check.mjs <lang>` проверяет: валидность схемы; ru и uk есть и не пустые; нет «пока/скоро/TODO/…»; `examples` существуют и в их target встречается одна из форм; формы не дублируют друг друга; одна лемма — один урок; все глаголы урока есть среди кандидатов (нет выдуманных). Красная сверка — не принимаем.

## Аудит (шаг D)
Opus-аудитор: формы, вспомогательный глагол, ru/uk смысл и естественность; ошибка формы = блокер. Цель — 0 ошибок форм, ≤1% замечаний по ru/uk.

## Тест-сторож (шаг E)
`tests/classic_irregular_verbs_data.test.ts` — запускает те же проверки; в приложении раздел показывается только если файл есть и `lessons[N]` непусто (иначе hidden, без текста-заглушки).
