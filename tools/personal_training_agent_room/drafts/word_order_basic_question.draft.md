# Draft: word_order_basic_question

Status: draft for Jesse Pinkman room
Scope: only `word_order_basic_question`
Goal: repair one mistake: the learner builds an English question like a statement and forgets that a helper often goes before the person.

## Training Voice

RU: В английском вопросе помощник часто выходит перед человеком: `Do you like coffee?` Не делаем из этого грамматический доклад. Просто тренируем движение помощника вперед.

UK: В англійському питанні помічник часто виходить перед людиною: `Do you like coffee?` Не робимо з цього граматичну лекцію. Просто тренуємо рух помічника вперед.

ES: En una pregunta en inglés, el ayudante suele ir antes de la persona: `Do you like coffee?` No lo convertimos en una clase de gramática. Solo practicamos mover el ayudante al frente.

## Learner Pattern

RU: Ученик пишет `You like coffee?`, `Where you live?`, `Does she likes tea?`, `Did you went?`. Исправление: поставить нужного помощника перед человеком и оставить главный глагол простым после `do/does/did`.

UK: Учень пише `You like coffee?`, `Where you live?`, `Does she likes tea?`, `Did you went?`. Виправлення: поставити потрібного помічника перед людиною і лишити головне дієслово простим після `do/does/did`.

ES: El alumno escribe `You like coffee?`, `Where you live?`, `Does she likes tea?`, `Did you went?` La corrección: poner el ayudante correcto antes de la persona y dejar el verbo principal simple después de `do/does/did`.

## Core Rule Card

RU: Спроси себя: где человек? Перед ним часто должен выйти помощник. `Do you work?`, `Does she work?`, `Did they call?`, `Are you ready?`, `Can you help?`

UK: Запитай себе: де людина? Перед нею часто має вийти помічник. `Do you work?`, `Does she work?`, `Did they call?`, `Are you ready?`, `Can you help?`

ES: Pregúntate: dónde está la persona? Antes de ella suele salir el ayudante. `Do you work?`, `Does she work?`, `Did they call?`, `Are you ready?`, `Can you help?`

## Steps

### 1. Do before you

Prompt:
- RU: Выбери правильный вопрос: "Ты любишь кофе?"
- UK: Обери правильне питання: "Ти любиш каву?"
- ES: Elige la pregunta correcta: "Te gusta el café?"

Options:
- A. `Do you like coffee?` correct
- B. `You like coffee?`
- C. `Are you like coffee?`
- D. `Does you like coffee?`

Feedback:
- A RU: Да. Помощник `Do` вышел перед человеком `you`: `Do you like coffee?`
- A UK: Так. Помічник `Do` вийшов перед людиною `you`: `Do you like coffee?`
- A ES: Sí. El ayudante `Do` va antes de la persona `you`: `Do you like coffee?`
- B RU: Это звучит как утверждение с интонацией. В базовом вопросе нужен помощник перед `you`: `Do you like coffee?`
- B UK: Це звучить як твердження з інтонацією. У базовому питанні потрібен помічник перед `you`: `Do you like coffee?`
- B ES: Suena como una frase con entonación. En una pregunta básica necesitas el ayudante antes de `you`: `Do you like coffee?`
- C RU: `Are` не помогает глаголу `like`. Для обычного действия нужен `Do`.
- C UK: `Are` не допомагає дієслову `like`. Для звичайної дії потрібен `Do`.
- C ES: `Are` no ayuda al verbo `like`. Para una acción normal usa `Do`.
- D RU: С `you` нужен `Do`, не `Does`: `Do you like coffee?`
- D UK: З `you` потрібен `Do`, не `Does`: `Do you like coffee?`
- D ES: Con `you` usa `Do`, no `Does`: `Do you like coffee?`

Similar phrases:
- `Do you like tea?`
- `Do you need help?`
- `Do you speak English?`

### 2. Do before they

Prompt:
- RU: Выбери правильный вопрос: "Они живут здесь?"
- UK: Обери правильне питання: "Вони живуть тут?"
- ES: Elige la pregunta correcta: "Viven aquí?"

Options:
- A. `Do they live here?` correct
- B. `They live here?`
- C. `Are they live here?`
- D. `Does they live here?`

Feedback:
- A RU: Верно. Перед `they` выходит `Do`: `Do they live here?`
- A UK: Правильно. Перед `they` виходить `Do`: `Do they live here?`
- A ES: Correcto. Antes de `they` va `Do`: `Do they live here?`
- B RU: Не оставляй вопрос только на интонации. Нужен помощник: `Do they live here?`
- B UK: Не лишай питання тільки на інтонації. Потрібен помічник: `Do they live here?`
- B ES: No dejes la pregunta solo a la entonación. Necesitas el ayudante: `Do they live here?`
- C RU: `Are they live` смешивает `are` с обычным глаголом `live`. Здесь нужен `Do`.
- C UK: `Are they live` змішує `are` зі звичайним дієсловом `live`. Тут потрібен `Do`.
- C ES: `Are they live` mezcla `are` con el verbo normal `live`. Aquí necesitas `Do`.
- D RU: `Does` не подходит к `they`. Поставь `Do` перед `they`.
- D UK: `Does` не підходить до `they`. Постав `Do` перед `they`.
- D ES: `Does` no va con `they`. Pon `Do` antes de `they`.

Similar phrases:
- `Do they work here?`
- `Do they know you?`
- `Do they play chess?`

### 3. Does before she, verb stays simple

Prompt:
- RU: Выбери правильный вопрос: "Она говорит по-английски?"
- UK: Обери правильне питання: "Вона говорить англійською?"
- ES: Elige la pregunta correcta: "Habla inglés?"

Options:
- A. `Does she speak English?` correct
- B. `She speaks English?`
- C. `Do she speak English?`
- D. `Does she speaks English?`

Feedback:
- A RU: Да. `Does` выходит перед `she`, а `speak` остается простым.
- A UK: Так. `Does` виходить перед `she`, а `speak` лишається простим.
- A ES: Sí. `Does` va antes de `she`, y `speak` queda simple.
- B RU: Здесь вопрос снова сделан как утверждение. Нужен помощник перед человеком: `Does she speak English?`
- B UK: Тут питання знову зроблене як твердження. Потрібен помічник перед людиною: `Does she speak English?`
- B ES: Aquí la pregunta está hecha como una frase. Necesitas el ayudante antes de la persona: `Does she speak English?`
- C RU: С `she` нужен `Does`, не `Do`.
- C UK: З `she` потрібен `Does`, не `Do`.
- C ES: Con `she` usa `Does`, no `Do`.
- D RU: После `Does` глагол без `-s`: `Does she speak`, не `Does she speaks`.
- D UK: Після `Does` дієслово без `-s`: `Does she speak`, не `Does she speaks`.
- D ES: Después de `Does`, el verbo no lleva `-s`: `Does she speak`, no `Does she speaks`.

Similar phrases:
- `Does she like tea?`
- `Does he work today?`
- `Does it cost much?`

### 4. Did before you, verb goes back to simple

Prompt:
- RU: Выбери правильный вопрос: "Ты позвонил ему?"
- UK: Обери правильне питання: "Ти подзвонив йому?"
- ES: Elige la pregunta correcta: "Lo llamaste?"

Options:
- A. `Did you call him?` correct
- B. `You called him?`
- C. `Do you called him?`
- D. `Did you called him?`

Feedback:
- A RU: Да. `Did` вышел перед `you`, а главный глагол стал простым: `call`.
- A UK: Так. `Did` вийшов перед `you`, а головне дієслово стало простим: `call`.
- A ES: Sí. `Did` va antes de `you`, y el verbo principal vuelve a la forma simple: `call`.
- B RU: Это опять вопрос через интонацию. В обычном вопросе о прошлом нужен `Did`: `Did you call him?`
- B UK: Це знову питання через інтонацію. У звичайному питанні про минуле потрібен `Did`: `Did you call him?`
- B ES: Es otra pregunta solo con entonación. Para una pregunta normal en pasado necesitas `Did`: `Did you call him?`
- C RU: `Do` не показывает прошлое здесь. Нужен `Did`.
- C UK: `Do` тут не показує минуле. Потрібен `Did`.
- C ES: `Do` no marca pasado aquí. Necesitas `Did`.
- D RU: После `Did` не оставляем `called`. Правильно: `Did you call him?`
- D UK: Після `Did` не лишаємо `called`. Правильно: `Did you call him?`
- D ES: Después de `Did` no dejamos `called`. Correcto: `Did you call him?`

Similar phrases:
- `Did you see her?`
- `Did you finish it?`
- `Did you buy milk?`

### 5. Did before they, no past verb after it

Prompt:
- RU: Выбери правильный вопрос: "Они ушли рано?"
- UK: Обери правильне питання: "Вони пішли рано?"
- ES: Elige la pregunta correcta: "Se fueron temprano?"

Options:
- A. `Did they leave early?` correct
- B. `They left early?`
- C. `Did they left early?`
- D. `Do they left early?`

Feedback:
- A RU: Верно. `Did` показывает прошлое, поэтому дальше `leave`, не `left`.
- A UK: Правильно. `Did` показує минуле, тому далі `leave`, не `left`.
- A ES: Correcto. `Did` ya muestra el pasado, así que después va `leave`, no `left`.
- B RU: В английском базовом вопросе не хватает помощника перед `they`: `Did they leave early?`
- B UK: В англійському базовому питанні бракує помічника перед `they`: `Did they leave early?`
- B ES: En la pregunta básica falta el ayudante antes de `they`: `Did they leave early?`
- C RU: `Did` уже сделал вопрос прошлым. Не ставь второй прошлый глагол `left`.
- C UK: `Did` уже зробив питання минулим. Не став друге минуле дієслово `left`.
- C ES: `Did` ya hizo la pregunta pasada. No pongas otro verbo en pasado, `left`.
- D RU: `Do` не подходит для вопроса о прошлом. Нужен `Did`.
- D UK: `Do` не підходить для питання про минуле. Потрібен `Did`.
- D ES: `Do` no sirve para esta pregunta en pasado. Necesitas `Did`.

Similar phrases:
- `Did they arrive late?`
- `Did they find it?`
- `Did they send the file?`

### 6. Where plus do

Prompt:
- RU: Выбери правильный вопрос: "Где ты живешь?"
- UK: Обери правильне питання: "Де ти живеш?"
- ES: Elige la pregunta correcta: "Dónde vives?"

Options:
- A. `Where do you live?` correct
- B. `Where you live?`
- C. `Where are you live?`
- D. `Where does you live?`

Feedback:
- A RU: Да. Сначала `Where`, потом помощник перед человеком: `do you`.
- A UK: Так. Спочатку `Where`, потім помічник перед людиною: `do you`.
- A ES: Sí. Primero `Where`, luego el ayudante antes de la persona: `do you`.
- B RU: После `Where` все равно нужен помощник. Правильно: `Where do you live?`
- B UK: Після `Where` усе одно потрібен помічник. Правильно: `Where do you live?`
- B ES: Después de `Where` todavía necesitas el ayudante. Correcto: `Where do you live?`
- C RU: `Are you live` не работает: `live` обычное действие, ему нужен `do`.
- C UK: `Are you live` не працює: `live` звичайна дія, їй потрібен `do`.
- C ES: `Are you live` no funciona: `live` es una acción normal, necesita `do`.
- D RU: С `you` нужен `do`, не `does`.
- D UK: З `you` потрібен `do`, не `does`.
- D ES: Con `you` usa `do`, no `does`.

Similar phrases:
- `Where do you work?`
- `Where do they live?`
- `Where do we meet?`

### 7. What plus does, verb stays simple

Prompt:
- RU: Выбери правильный вопрос: "Что он хочет?"
- UK: Обери правильне питання: "Що він хоче?"
- ES: Elige la pregunta correcta: "Qué quiere él?"

Options:
- A. `What does he want?` correct
- B. `What he wants?`
- C. `What do he want?`
- D. `What does he wants?`

Feedback:
- A RU: Да. `What`, потом `does` перед `he`, потом простой `want`.
- A UK: Так. `What`, потім `does` перед `he`, потім простий `want`.
- A ES: Sí. `What`, luego `does` antes de `he`, luego `want` simple.
- B RU: После `What` вопросу нужен помощник: `What does he want?`
- B UK: Після `What` питанню потрібен помічник: `What does he want?`
- B ES: Después de `What`, la pregunta necesita el ayudante: `What does he want?`
- C RU: С `he` помощник `does`, не `do`.
- C UK: З `he` помічник `does`, не `do`.
- C ES: Con `he`, el ayudante es `does`, no `do`.
- D RU: `Does` уже взял `-s` на себя. Глагол должен быть `want`, не `wants`.
- D UK: `Does` уже взяв `-s` на себе. Дієслово має бути `want`, не `wants`.
- D ES: `Does` ya lleva la marca. El verbo debe ser `want`, no `wants`.

Similar phrases:
- `What does she need?`
- `What does he mean?`
- `What does it say?`

### 8. Are before you

Prompt:
- RU: Выбери правильный вопрос: "Ты готов?"
- UK: Обери правильне питання: "Ти готовий?"
- ES: Elige la pregunta correcta: "Estás listo?"

Options:
- A. `Are you ready?` correct
- B. `You are ready?`
- C. `Do you ready?`
- D. `Are do you ready?`

Feedback:
- A RU: Да. Здесь помощник `Are` сам выходит перед человеком: `Are you ready?`
- A UK: Так. Тут помічник `Are` сам виходить перед людиною: `Are you ready?`
- A ES: Sí. Aquí `Are` sale antes de la persona: `Are you ready?`
- B RU: Это снова утверждение с вопросительной интонацией. Для базового вопроса вынеси `Are` вперед.
- B UK: Це знову твердження з питальною інтонацією. Для базового питання винеси `Are` вперед.
- B ES: Es una frase con entonación de pregunta. Para la pregunta básica mueve `Are` al frente.
- C RU: `Ready` идет с `are`, не с `do`: `Are you ready?`
- C UK: `Ready` іде з `are`, не з `do`: `Are you ready?`
- C ES: `Ready` va con `are`, no con `do`: `Are you ready?`
- D RU: Не нужно два помощника. Достаточно `Are you ready?`
- D UK: Не потрібно два помічники. Достатньо `Are you ready?`
- D ES: No necesitas dos ayudantes. Basta `Are you ready?`

Similar phrases:
- `Are you busy?`
- `Are you tired?`
- `Are you at home?`

### 9. Is before he

Prompt:
- RU: Выбери правильный вопрос: "Он дома?"
- UK: Обери правильне питання: "Він удома?"
- ES: Elige la pregunta correcta: "Está él en casa?"

Options:
- A. `Is he at home?` correct
- B. `He is at home?`
- C. `Does he at home?`
- D. `Is at home he?`

Feedback:
- A RU: Верно. `Is` выходит перед человеком `he`: `Is he at home?`
- A UK: Правильно. `Is` виходить перед людиною `he`: `Is he at home?`
- A ES: Correcto. `Is` va antes de la persona `he`: `Is he at home?`
- B RU: Это утверждение с интонацией. В базовом вопросе `Is` нужно поставить перед `he`.
- B UK: Це твердження з інтонацією. У базовому питанні `Is` треба поставити перед `he`.
- B ES: Es una frase con entonación. En la pregunta básica pon `Is` antes de `he`.
- C RU: Для "он дома" не нужен `does`; нужен `is`.
- C UK: Для "він удома" не потрібен `does`; потрібен `is`.
- C ES: Para "él está en casa" no necesitas `does`; necesitas `is`.
- D RU: Человек должен идти сразу после помощника: `Is he at home?`
- D UK: Людина має йти одразу після помічника: `Is he at home?`
- D ES: La persona debe ir justo después del ayudante: `Is he at home?`

Similar phrases:
- `Is she here?`
- `Is it open?`
- `Is he your friend?`

### 10. Can before you

Prompt:
- RU: Выбери правильный вопрос: "Ты можешь мне помочь?"
- UK: Обери правильне питання: "Ти можеш мені допомогти?"
- ES: Elige la pregunta correcta: "Puedes ayudarme?"

Options:
- A. `Can you help me?` correct
- B. `You can help me?`
- C. `Do you can help me?`
- D. `Can help you me?`

Feedback:
- A RU: Да. `Can` сам выходит перед человеком: `Can you help me?`
- A UK: Так. `Can` сам виходить перед людиною: `Can you help me?`
- A ES: Sí. `Can` va antes de la persona: `Can you help me?`
- B RU: Это утверждение с интонацией. Для базового вопроса поставь `Can` перед `you`.
- B UK: Це твердження з інтонацією. Для базового питання постав `Can` перед `you`.
- B ES: Es una frase con entonación. Para la pregunta básica pon `Can` antes de `you`.
- C RU: С `can` не нужен `do`. Правильно: `Can you help me?`
- C UK: З `can` не потрібен `do`. Правильно: `Can you help me?`
- C ES: Con `can` no necesitas `do`. Correcto: `Can you help me?`
- D RU: После `Can` сразу идет человек `you`, потом действие `help`: `Can you help me?`
- D UK: Після `Can` одразу йде людина `you`, потім дія `help`: `Can you help me?`
- D ES: Después de `Can` va la persona `you`, luego la acción `help`: `Can you help me?`

Similar phrases:
- `Can you call me?`
- `Can you wait here?`
- `Can they join us?`

### 11. What plus can

Prompt:
- RU: Выбери правильный вопрос: "Что ты можешь сделать?"
- UK: Обери правильне питання: "Що ти можеш зробити?"
- ES: Elige la pregunta correcta: "Qué puedes hacer?"

Options:
- A. `What can you do?` correct
- B. `What you can do?`
- C. `What do you can do?`
- D. `What can do you?`

Feedback:
- A RU: Да. `What`, потом `can` перед человеком: `What can you do?`
- A UK: Так. `What`, потім `can` перед людиною: `What can you do?`
- A ES: Sí. `What`, luego `can` antes de la persona: `What can you do?`
- B RU: После `What` все равно нужен помощник перед человеком: `What can you do?`
- B UK: Після `What` усе одно потрібен помічник перед людиною: `What can you do?`
- B ES: Después de `What` todavía necesitas el ayudante antes de la persona: `What can you do?`
- C RU: С `can` не ставим `do`. Сам `can` выходит вперед.
- C UK: З `can` не ставимо `do`. Сам `can` виходить уперед.
- C ES: Con `can` no ponemos `do`. `Can` sale al frente por sí mismo.
- D RU: После помощника должен идти человек: `can you`, не `can do you`.
- D UK: Після помічника має йти людина: `can you`, не `can do you`.
- D ES: Después del ayudante debe ir la persona: `can you`, no `can do you`.

Similar phrases:
- `What can she say?`
- `What can they bring?`
- `What can we change?`

### 12. Mixed check

Prompt:
- RU: Выбери правильный вопрос: "Когда она начинает работу?"
- UK: Обери правильне питання: "Коли вона починає роботу?"
- ES: Elige la pregunta correcta: "Cuándo empieza ella a trabajar?"

Options:
- A. `When does she start work?` correct
- B. `When she starts work?`
- C. `When do she start work?`
- D. `When does she starts work?`

Feedback:
- A RU: Отлично. `When`, потом `does` перед `she`, потом простой `start`.
- A UK: Чудово. `When`, потім `does` перед `she`, потім простий `start`.
- A ES: Excelente. `When`, luego `does` antes de `she`, luego `start` simple.
- B RU: После `When` вопросу все равно нужен помощник перед человеком: `When does she start work?`
- B UK: Після `When` питанню все одно потрібен помічник перед людиною: `When does she start work?`
- B ES: Después de `When`, la pregunta todavía necesita el ayudante antes de la persona: `When does she start work?`
- C RU: С `she` нужен `does`, не `do`.
- C UK: З `she` потрібен `does`, не `do`.
- C ES: Con `she` usa `does`, no `do`.
- D RU: После `does` глагол без `-s`: `start`, не `starts`.
- D UK: Після `does` дієслово без `-s`: `start`, не `starts`.
- D ES: Después de `does`, el verbo no lleva `-s`: `start`, no `starts`.

Similar phrases:
- `When does he finish?`
- `When does she arrive?`
- `When does it open?`

## Mastery Check

Pass when:
- The learner chooses the helper-before-person option in at least 10 of 12 steps.
- The learner fixes at least one `does + -s` trap after feedback.
- The learner fixes at least one `did + past verb` trap after feedback.
- The learner passes two question-word steps without reverting to statement shape.

Do not pass when:
- The learner keeps choosing statement-shaped questions like `You work?`
- The learner keeps using `do` with `are/is/can`.
- The learner keeps using `does` but leaves `-s` on the main verb.
