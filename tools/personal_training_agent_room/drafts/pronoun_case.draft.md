# pronoun_case draft

Training id: `pronoun_case`

Room: Jesse Pinkman

Scope: one beginner mistake only - choosing between English words for "who does" and words for "whom / who receives it".

Do not use grammar jargon in learner copy. Main learner rule:

RU: Есть слова для "кто делает": `I`, `he`, `she`, `we`, `they`. А после действия нужны слова для "кого": `me`, `him`, `her`, `us`, `them`. После коротких слов `to`, `for`, `with`, `between` тоже нужны слова для "кого": `to me`, `with him`, `between you and me`.

UK: Є слова для "хто робить": `I`, `he`, `she`, `we`, `they`. А після дії потрібні слова для "кого": `me`, `him`, `her`, `us`, `them`. Після коротких слів `to`, `for`, `with`, `between` теж потрібні слова для "кого": `to me`, `with him`, `between you and me`.

ES: Hay palabras para "quien hace": `I`, `he`, `she`, `we`, `they`. Despues de la accion usamos palabras para "a quien": `me`, `him`, `her`, `us`, `them`. Despues de palabras cortas como `to`, `for`, `with`, `between`, tambien usamos palabras de "a quien": `to me`, `with him`, `between you and me`.

## Training Copy

Title:

RU: `I/me, he/him: кто делает и кого`

UK: `I/me, he/him: хто робить і кого`

ES: `I/me, he/him: quien hace y a quien`

Short diagnosis:

RU: Ты путаешь слова для "кто делает" и слова для "кого после действия": `I/me`, `he/him`, `she/her`, `we/us`, `they/them`.

UK: Ти плутаєш слова для "хто робить" і слова для "кого після дії": `I/me`, `he/him`, `she/her`, `we/us`, `they/them`.

ES: Confundes las palabras para "quien hace" y las palabras para "a quien despues de la accion": `I/me`, `he/him`, `she/her`, `we/us`, `they/them`.

Mental model:

RU: Сначала спроси: это слово делает действие? Тогда `I/he/she/we/they`. Если действие уже направлено на человека, или слово стоит после `to/for/with/between`, тогда `me/him/her/us/them`.

UK: Спочатку запитай: це слово робить дію? Тоді `I/he/she/we/they`. Якщо дія вже спрямована на людину, або слово стоїть після `to/for/with/between`, тоді `me/him/her/us/them`.

ES: Primero pregunta: esta palabra hace la accion? Entonces `I/he/she/we/they`. Si la accion va hacia la persona, o la palabra va despues de `to/for/with/between`, entonces `me/him/her/us/them`.

## 12 Steps

### Step 1

Id: `pronoun_case_001`

Prompt: `___ called him yesterday.`

Translation:

RU: Я позвонил ему вчера.

UK: Я подзвонив йому вчора.

ES: Lo llame ayer.

Options: `I`, `Me`, `He`

Correct: `I`

Correct feedback:

RU: Да. В начале стоит тот, кто делает действие `called`: `I`.

UK: Так. На початку стоїть той, хто робить дію `called`: `I`.

ES: Si. Al principio va quien hace la accion `called`: `I`.

Wrong feedback:

`Me`

RU: Ты выбрал `Me`, но `Me` нужно после действия, когда действие направлено на меня. Здесь слово само звонит, значит нужно `I`.

UK: Ти вибрав `Me`, але `Me` потрібне після дії, коли дія спрямована на мене. Тут слово саме телефонує, тому потрібно `I`.

ES: Elegiste `Me`, pero `Me` va despues de la accion cuando la accion va hacia mi. Aqui la palabra llama, asi que necesitamos `I`.

`He`

RU: `He` тоже может делать действие, но это "он". Перевод говорит "я", поэтому нужен `I`.

UK: `He` теж може робити дію, але це "він". Переклад каже "я", тому потрібно `I`.

ES: `He` tambien puede hacer la accion, pero significa "el". La traduccion dice "yo", asi que necesitamos `I`.

### Step 2

Id: `pronoun_case_002`

Prompt: `He called ___.`

Translation:

RU: Он позвонил мне.

UK: Він подзвонив мені.

ES: El me llamo.

Options: `I`, `me`, `he`

Correct: `me`

Correct feedback:

RU: Да. После действия `called` нужен вариант для "кого/кому": `me`.

UK: Так. Після дії `called` потрібне слово для "кого/кому": `me`.

ES: Si. Despues de la accion `called` necesitamos la palabra para "a quien": `me`.

Wrong feedback:

`I`

RU: Ты выбрал `I`, но `I` говорит "я делаю". После `called` действие направлено на меня, поэтому нужно `me`.

UK: Ти вибрав `I`, але `I` каже "я роблю". Після `called` дія спрямована на мене, тому потрібно `me`.

ES: Elegiste `I`, pero `I` dice "yo hago". Despues de `called`, la accion va hacia mi, asi que necesitamos `me`.

`he`

RU: `he` значит "он делает". Здесь звонят мне, и слово стоит после `called`, поэтому нужно `me`.

UK: `he` означає "він робить". Тут телефонують мені, і слово стоїть після `called`, тому потрібно `me`.

ES: `he` significa "el hace". Aqui me llaman a mi, y la palabra va despues de `called`, asi que necesitamos `me`.

### Step 3

Id: `pronoun_case_003`

Prompt: `___ helped us.`

Translation:

RU: Она помогла нам.

UK: Вона допомогла нам.

ES: Ella nos ayudo.

Options: `She`, `Her`, `Us`

Correct: `She`

Correct feedback:

RU: Да. Она делает действие `helped`, поэтому нужно `She`.

UK: Так. Вона робить дію `helped`, тому потрібно `She`.

ES: Si. Ella hace la accion `helped`, asi que necesitamos `She`.

Wrong feedback:

`Her`

RU: Ты выбрал `Her`, но `Her` нужно, когда действие направлено на нее. Здесь она помогает, значит нужно `She`.

UK: Ти вибрав `Her`, але `Her` потрібне, коли дія спрямована на неї. Тут вона допомагає, тому потрібно `She`.

ES: Elegiste `Her`, pero `Her` se usa cuando la accion va hacia ella. Aqui ella ayuda, asi que necesitamos `She`.

`Us`

RU: `Us` значит "нас/нам" после действия. В пустом месте нужна "она делает", поэтому нужен `She`.

UK: `Us` означає "нас/нам" після дії. У пропуску потрібно "вона робить", тому потрібно `She`.

ES: `Us` significa "a nosotros" despues de la accion. En el espacio necesitamos "ella hace", por eso va `She`.

### Step 4

Id: `pronoun_case_004`

Prompt: `We saw ___ at school.`

Translation:

RU: Мы видели ее в школе.

UK: Ми бачили її в школі.

ES: La vimos en la escuela.

Options: `she`, `her`, `we`

Correct: `her`

Correct feedback:

RU: Да. После действия `saw` нужен вариант для "кого": `her`.

UK: Так. Після дії `saw` потрібне слово для "кого": `her`.

ES: Si. Despues de la accion `saw` necesitamos la palabra para "a quien": `her`.

Wrong feedback:

`she`

RU: `she` значит "она делает". Но здесь ее увидели после `saw`, поэтому нужно `her`.

UK: `she` означає "вона робить". Але тут її побачили після `saw`, тому потрібно `her`.

ES: `she` significa "ella hace". Pero aqui la vieron despues de `saw`, asi que necesitamos `her`.

`we`

RU: `we` значит "мы делаем". В предложении уже есть `We`; после `saw` нужна "ее": `her`.

UK: `we` означає "ми робимо". У реченні вже є `We`; після `saw` потрібно "її": `her`.

ES: `we` significa "nosotros hacemos". La frase ya tiene `We`; despues de `saw` necesitamos "a ella": `her`.

### Step 5

Id: `pronoun_case_005`

Prompt: `This is for ___.`

Translation:

RU: Это для меня.

UK: Це для мене.

ES: Esto es para mi.

Options: `I`, `me`, `my`

Correct: `me`

Correct feedback:

RU: Да. После `for` нужен вариант для "кого/для кого": `me`.

UK: Так. Після `for` потрібне слово для "кого/для кого": `me`.

ES: Si. Despues de `for` necesitamos la palabra para "para quien": `me`.

Wrong feedback:

`I`

RU: `I` нужно, когда я делаю действие. После `for` нужно "для меня": `me`.

UK: `I` потрібне, коли я роблю дію. Після `for` потрібно "для мене": `me`.

ES: `I` se usa cuando yo hago la accion. Despues de `for` necesitamos "para mi": `me`.

`my`

RU: `my` требует предмет после себя: `my phone`, `my bag`. Здесь предмета нет, нужно `me`.

UK: `my` потребує предмет після себе: `my phone`, `my bag`. Тут предмета немає, потрібно `me`.

ES: `my` necesita una cosa despues: `my phone`, `my bag`. Aqui no hay cosa, necesitamos `me`.

### Step 6

Id: `pronoun_case_006`

Prompt: `I spoke to ___.`

Translation:

RU: Я поговорил с ним.

UK: Я поговорив з ним.

ES: Hable con el.

Options: `he`, `him`, `his`

Correct: `him`

Correct feedback:

RU: Да. После `to` нужен вариант для "кому/к кому": `him`.

UK: Так. Після `to` потрібне слово для "кому/до кого": `him`.

ES: Si. Despues de `to` necesitamos la palabra para "a quien": `him`.

Wrong feedback:

`he`

RU: `he` значит "он делает". После `to` нужно "к нему/ему": `him`.

UK: `he` означає "він робить". Після `to` потрібно "до нього/йому": `him`.

ES: `he` significa "el hace". Despues de `to` necesitamos "a el": `him`.

`his`

RU: `his` значит "его" как принадлежность: `his phone`. Здесь нужно не "его телефон", а "с ним": `him`.

UK: `his` означає "його" як належність: `his phone`. Тут потрібно не "його телефон", а "з ним": `him`.

ES: `his` significa posesion: `his phone`. Aqui no es "su telefono", sino "con el": `him`.

### Step 7

Id: `pronoun_case_007`

Prompt: `___ invited them.`

Translation:

RU: Они пригласили их.

UK: Вони запросили їх.

ES: Ellos los invitaron.

Options: `They`, `Them`, `Their`

Correct: `They`

Correct feedback:

RU: Да. В начале стоят те, кто делает действие `invited`: `They`.

UK: Так. На початку стоять ті, хто робить дію `invited`: `They`.

ES: Si. Al principio van quienes hacen la accion `invited`: `They`.

Wrong feedback:

`Them`

RU: `Them` нужно после действия, когда действие направлено на них. Здесь они сами приглашают, поэтому нужно `They`.

UK: `Them` потрібне після дії, коли дія спрямована на них. Тут вони самі запрошують, тому потрібно `They`.

ES: `Them` va despues de la accion cuando la accion va hacia ellos. Aqui ellos invitan, asi que necesitamos `They`.

`Their`

RU: `Their` значит "их" как принадлежность: `their house`. Здесь не дом и не вещь, а "они пригласили", поэтому нужно `They`.

UK: `Their` означає "їхній" як належність: `their house`. Тут не дім і не річ, а "вони запросили", тому потрібно `They`.

ES: `Their` significa posesion: `their house`. Aqui no hay casa ni cosa; es "ellos invitaron", por eso va `They`.

### Step 8

Id: `pronoun_case_008`

Prompt: `The teacher asked ___.`

Translation:

RU: Учитель спросил нас.

UK: Учитель запитав нас.

ES: El profesor nos pregunto.

Options: `we`, `us`, `our`

Correct: `us`

Correct feedback:

RU: Да. После действия `asked` нужен вариант для "кого": `us`.

UK: Так. Після дії `asked` потрібне слово для "кого": `us`.

ES: Si. Despues de la accion `asked` necesitamos la palabra para "a quien": `us`.

Wrong feedback:

`we`

RU: `we` значит "мы делаем". Здесь учитель спросил нас после `asked`, поэтому нужно `us`.

UK: `we` означає "ми робимо". Тут учитель запитав нас після `asked`, тому потрібно `us`.

ES: `we` significa "nosotros hacemos". Aqui el profesor nos pregunto despues de `asked`, asi que necesitamos `us`.

`our`

RU: `our` требует предмет: `our class`, `our teacher`. Здесь нужно просто "нас": `us`.

UK: `our` потребує предмет: `our class`, `our teacher`. Тут потрібно просто "нас": `us`.

ES: `our` necesita una cosa: `our class`, `our teacher`. Aqui necesitamos simplemente "a nosotros": `us`.

### Step 9

Id: `pronoun_case_009`

Prompt: `Between you and ___.`

Translation:

RU: Между тобой и мной.

UK: Між тобою і мною.

ES: Entre tu y yo.

Options: `I`, `me`, `my`

Correct: `me`

Correct feedback:

RU: Да. После `between` нужен вариант для "кого": `between you and me`.

UK: Так. Після `between` потрібне слово для "кого": `between you and me`.

ES: Si. Despues de `between` necesitamos la palabra para "a quien": `between you and me`.

Wrong feedback:

`I`

RU: `I` нужно, когда я делаю действие. После `between` нужно `me`: `between you and me`.

UK: `I` потрібне, коли я роблю дію. Після `between` потрібно `me`: `between you and me`.

ES: `I` se usa cuando yo hago la accion. Despues de `between` necesitamos `me`: `between you and me`.

`my`

RU: `my` требует предмет после себя: `my idea`. В фразе "между тобой и мной" предмета нет, нужно `me`.

UK: `my` потребує предмет після себе: `my idea`. У фразі "між тобою і мною" предмета немає, потрібно `me`.

ES: `my` necesita una cosa despues: `my idea`. En "entre tu y yo" no hay cosa, necesitamos `me`.

### Step 10

Id: `pronoun_case_010`

Prompt: `You and ___ need to talk.`

Translation:

RU: Нам с тобой нужно поговорить.

UK: Нам з тобою потрібно поговорити.

ES: Tu y yo necesitamos hablar.

Options: `I`, `me`, `my`

Correct: `I`

Correct feedback:

RU: Да. `You and I` вместе делают действие `need`, поэтому нужен `I`.

UK: Так. `You and I` разом роблять дію `need`, тому потрібно `I`.

ES: Si. `You and I` juntos hacen la accion `need`, por eso va `I`.

Wrong feedback:

`me`

RU: `me` нужно после действия или после `to/for/with/between`. Здесь `You and ___` вместе делают `need`, поэтому нужно `I`.

UK: `me` потрібне після дії або після `to/for/with/between`. Тут `You and ___` разом роблять `need`, тому потрібно `I`.

ES: `me` va despues de la accion o despues de `to/for/with/between`. Aqui `You and ___` juntos hacen `need`, asi que necesitamos `I`.

`my`

RU: `my` требует предмет: `my friend`. Здесь нужен человек в паре `You and I`, поэтому `my` не подходит.

UK: `my` потребує предмет: `my friend`. Тут потрібна людина в парі `You and I`, тому `my` не підходить.

ES: `my` necesita una cosa o persona despues: `my friend`. Aqui necesitamos la persona en la pareja `You and I`, por eso `my` no encaja.

### Step 11

Id: `pronoun_case_011`

Prompt: Choose the correct sentence.

Translation:

RU: Выбери правильное предложение: она помогла ему.

UK: Обери правильне речення: вона допомогла йому.

ES: Elige la frase correcta: ella lo ayudo.

Options: `She helped him.`, `Her helped him.`, `She helped he.`, `Her helped he.`

Correct: `She helped him.`

Correct feedback:

RU: Да. `She` делает действие `helped`, а после `helped` нужен `him`.

UK: Так. `She` робить дію `helped`, а після `helped` потрібне `him`.

ES: Si. `She` hace la accion `helped`, y despues de `helped` necesitamos `him`.

Wrong feedback:

`Her helped him.`

RU: В твоем варианте первая часть неверная: `Her` не делает действие. Перед `helped` нужна она как "кто делает": `She`.

UK: У твоєму варіанті перша частина неправильна: `Her` не робить дію. Перед `helped` потрібна вона як "хто робить": `She`.

ES: En tu opcion, la primera parte esta mal: `Her` no hace la accion. Antes de `helped` necesitamos ella como "quien hace": `She`.

`She helped he.`

RU: В твоем варианте начало правильное, но после `helped` нельзя `he`. Действие направлено на него, поэтому нужно `him`.

UK: У твоєму варіанті початок правильний, але після `helped` не можна `he`. Дія спрямована на нього, тому потрібно `him`.

ES: En tu opcion, el inicio esta bien, pero despues de `helped` no va `he`. La accion va hacia el, por eso necesitamos `him`.

`Her helped he.`

RU: В твоем варианте перепутаны обе позиции: перед `helped` нужна `She`, а после `helped` нужен `him`.

UK: У твоєму варіанті переплутані обидві позиції: перед `helped` потрібна `She`, а після `helped` потрібне `him`.

ES: En tu opcion, las dos posiciones estan cambiadas: antes de `helped` necesitamos `She`, y despues de `helped` necesitamos `him`.

### Step 12

Id: `pronoun_case_012`

Prompt: Choose the correct sentence.

Translation:

RU: Выбери правильное предложение: они дали это нам.

UK: Обери правильне речення: вони дали це нам.

ES: Elige la frase correcta: ellos nos dieron esto.

Options: `They gave it to us.`, `Them gave it to us.`, `They gave it to we.`, `Them gave it to we.`

Correct: `They gave it to us.`

Correct feedback:

RU: Да. `They` делают действие `gave`, а после `to` нужно `us`.

UK: Так. `They` роблять дію `gave`, а після `to` потрібне `us`.

ES: Si. `They` hacen la accion `gave`, y despues de `to` necesitamos `us`.

Wrong feedback:

`Them gave it to us.`

RU: В твоем варианте первая часть неверная: `Them` не делает действие. Перед `gave` нужны те, кто делает: `They`.

UK: У твоєму варіанті перша частина неправильна: `Them` не робить дію. Перед `gave` потрібні ті, хто робить: `They`.

ES: En tu opcion, la primera parte esta mal: `Them` no hace la accion. Antes de `gave` necesitamos quienes hacen: `They`.

`They gave it to we.`

RU: В твоем варианте `They` правильно делает действие, но после `to` нельзя `we`. Нужно "нам": `us`.

UK: У твоєму варіанті `They` правильно робить дію, але після `to` не можна `we`. Потрібно "нам": `us`.

ES: En tu opcion, `They` hace la accion correctamente, pero despues de `to` no va `we`. Necesitamos "a nosotros": `us`.

`Them gave it to we.`

RU: В твоем варианте перепутаны обе позиции: перед `gave` нужно `They`, а после `to` нужно `us`.

UK: У твоєму варіанті переплутані обидві позиції: перед `gave` потрібно `They`, а після `to` потрібно `us`.

ES: En tu opcion, las dos posiciones estan cambiadas: antes de `gave` necesitamos `They`, y despues de `to` necesitamos `us`.

## Mastery Notes

Minimum pass shape: 10 correct out of 12, including at least 3 correct in the mixed sentence steps 9-12.

Repeat logic:

- If the learner chooses a "who does" word after an action twice, repeat steps 2, 4, 8.
- If the learner chooses a "whom" word before an action twice, repeat steps 1, 3, 7.
- If the learner misses `between you and me`, repeat step 9 with `for me` and `with me`.

Tone rule: feedback names the selected option first, then gives the one concrete reason it fails.
