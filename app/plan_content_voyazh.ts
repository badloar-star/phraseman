import type { PlanContentDay } from './plan_content_schema';

/**
 * Generated plan content for "voyazh" (travel) — produced through the content-agent
 * pipeline (writers -> checkers -> judge -> adversarial -> code gate). The brain is
 * Claude at build time; the runtime ships this statically (no LLM at runtime).
 *
 * Day 1 is the verified ETALON. Grammar stays within the day-1 lesson gate (To Be /
 * Present Simple — lessons 1-8). Phrases are conversational, explanations are
 * friendly-coach (rule + why + common mistake), 6 phrases + 6 key words. Each word
 * carries an authored part of speech and 3-5 same-class distractors so the build /
 * missing-word exercises work without guessing.
 */

export const VOYAZH_DAY_1: PlanContentDay = {
  planId: 'voyazh',
  dayIndex: 1,
  topic: { ru: 'Аэропорт: попросить помощь', uk: 'Аеропорт: попросити допомогу', es: 'Aeropuerto: pedir ayuda' },
  outcome: {
    ru: 'Сможешь спокойно попросить помощь в аэропорту и сказать, что не понимаешь.',
    uk: 'Зможеш спокійно попросити допомогу в аеропорту й сказати, що не розумієш.',
    es: 'Podrás pedir ayuda con calma en el aeropuerto y decir que no entiendes.',
  },
  level: 'A1',
  prerequisiteLessons: [1, 2, 3, 4],
  intro: [
    {
      kind: 'why',
      title: { ru: 'Зачем эти фразы', uk: 'Навіщо ці фрази', es: 'Por qué estas frases' },
      body: {
        ru: 'Ты в аэропорту, чуть растерялся. Эти 6 фраз — как кнопка SOS: позвать на помощь и сказать «я не понял».',
        uk: 'Ти в аеропорту, трохи розгубився. Ці 6 фраз — як кнопка SOS: покликати на допомогу й сказати «я не зрозумів».',
        es: 'Estás en el aeropuerto, un poco perdido. Estas 6 frases son tu botón SOS: pedir ayuda y decir «no entendí».',
      },
    },
    {
      kind: 'how',
      title: { ru: 'Как это работает', uk: 'Як це працює', es: 'Cómo funciona' },
      body: {
        ru: 'Секрет простой: почти везде есть слово am/is (это как «=») и слово need («надо»). Соберёшь их — и фраза готова.',
        uk: 'Секрет простий: майже всюди є слово am/is (це як «=») і слово need («треба»). Збереш їх — і фраза готова.',
        es: 'El truco es simple: casi siempre hay am/is (como un «=») y need («necesito»). Júntalos y la frase está lista.',
      },
      examples: [
        { en: "I'm lost.", gloss: { ru: 'Я заблудился.', uk: 'Я заблукав.', es: 'Estoy perdido.' } },
        { en: 'I need help.', gloss: { ru: 'Мне нужна помощь.', uk: 'Мені потрібна допомога.', es: 'Necesito ayuda.' } },
      ],
    },
    {
      kind: 'trap',
      title: { ru: 'Частая ошибка', uk: 'Часта помилка', es: 'Error común' },
      body: {
        ru: 'Маленькое am — как шнурки. Забыл — и фраза «спотыкается»: I lost вместо I am lost. Не теряй его.',
        uk: 'Маленьке am — як шнурки. Забув — і фраза «спотикається»: I lost замість I am lost. Не губи його.',
        es: 'El pequeño am es como los cordones. Si lo olvidas, la frase «tropieza»: I lost en vez de I am lost.',
      },
    },
  ],
  phrases: [
    {
      id: 'voyazh_d1_p1',
      english: "I'm lost.",
      meaning: { ru: 'Я заблудился.', uk: 'Я заблукав.', es: 'Estoy perdido.' },
      constructions: ['to-be'],
      explanation: {
        title: { ru: "Словечко I'm", uk: "Слівце I'm", es: "La palabra I'm" },
        rule: { ru: "I'm — это «я есть». lost = «потерялся», I'm lost = «я потерялся».", uk: "I'm — це «я є». lost = «загубився», I'm lost = «я загубився».", es: "I'm es «yo estoy». lost = «perdido», I'm lost = «estoy perdido»." },
        why: { ru: 'I am почти всегда сжимают до I\'m — так говорят в жизни. Смысл тот же.', uk: 'I am майже завжди стискають до I\'m — так кажуть у житті. Зміст той самий.', es: 'I am casi siempre se acorta a I\'m, así se habla. El sentido es el mismo.' },
        commonMistake: { ru: 'Не теряй am: говори I\'m lost, а не I lost — без am фраза неполная.', uk: 'Не губи am: кажи I\'m lost, а не I lost — без am фраза неповна.', es: 'No pierdas am: di I\'m lost, no I lost; sin am la frase queda coja.' },
      },
      words: [
        { text: "I'm", partOfSpeech: 'to-be', distractors: ["You're", "He's", "We're", "It's", "She's"] },
        { text: 'lost', partOfSpeech: 'adjective', distractors: ['late', 'tired', 'ready', 'busy', 'happy'] },
      ],
    },
    {
      id: 'voyazh_d1_p2',
      english: 'I need help.',
      meaning: { ru: 'Мне нужна помощь.', uk: 'Мені потрібна допомога.', es: 'Necesito ayuda.' },
      constructions: ['present-simple'],
      explanation: {
        title: { ru: 'Слово need', uk: 'Слово need', es: 'La palabra need' },
        rule: { ru: 'need — это «надо, нужно». help = «помощь», I need help = «мне нужна помощь».', uk: 'need — це «треба, потрібно». help = «допомога», I need help = «мені потрібна допомога».', es: 'need es «necesito». help = «ayuda», I need help = «necesito ayuda».' },
        why: { ru: 'Скажи need + что тебе нужно — этого хватает, чтобы тебя поняли.', uk: 'Скажи need + що тобі потрібно — цього досить, щоб тебе зрозуміли.', es: 'Di need + lo que necesitas; con eso basta para que te entiendan.' },
        commonMistake: { ru: 'Перед help не нужно a: говори need help, а не need a help.', uk: 'Перед help не потрібне a: кажи need help, а не need a help.', es: 'Antes de help no va a: di need help, no need a help.' },
      },
      words: [
        { text: 'I', partOfSpeech: 'pronoun', distractors: ['You', 'We', 'They', 'He', 'She'] },
        { text: 'need', partOfSpeech: 'verb', distractors: ['want', 'have', 'see', 'find', 'take'] },
        { text: 'help', partOfSpeech: 'noun', distractors: ['water', 'time', 'food', 'air', 'money'] },
      ],
    },
    {
      id: 'voyazh_d1_p3',
      english: "I don't understand.",
      meaning: { ru: 'Я не понимаю.', uk: 'Я не розумію.', es: 'No entiendo.' },
      constructions: ['present-simple-negation'],
      explanation: {
        title: { ru: "Словечко don't", uk: "Слівце don't", es: "La palabra don't" },
        rule: { ru: "don't — это «не». understand = «понимаю», don't understand = «не понимаю».", uk: "don't — це «не». understand = «розумію», don't understand = «не розумію».", es: "don't es «no». understand = «entiendo», don't understand = «no entiendo»." },
        why: { ru: 'Это «не» ставят отдельным словом впереди — и оно отменяет то, что идёт следом.', uk: 'Це «не» ставлять окремим словом попереду — і воно скасовує те, що йде далі.', es: 'Ese «no» va como palabra aparte delante y cancela lo que viene después.' },
        commonMistake: { ru: 'Нельзя сказать I no understand. Нужно именно don\'t understand.', uk: 'Не можна I no understand. Потрібно саме don\'t understand.', es: 'No se dice I no understand: hace falta don\'t understand.' },
      },
      words: [
        { text: 'I', partOfSpeech: 'pronoun', distractors: ['You', 'We', 'They', 'She', 'He'] },
        { text: "don't", partOfSpeech: 'verb', distractors: ["doesn't", "can't", "won't", "isn't", "aren't"] },
        { text: 'understand', partOfSpeech: 'verb', distractors: ['know', 'hear', 'speak', 'read', 'remember'] },
      ],
    },
    {
      id: 'voyazh_d1_p4',
      english: 'I need the exit.',
      meaning: { ru: 'Мне нужен выход.', uk: 'Мені потрібен вихід.', es: 'Necesito la salida.' },
      constructions: ['present-simple'],
      explanation: {
        title: { ru: 'Словечко the', uk: 'Слівце the', es: 'La palabra the' },
        rule: { ru: 'the — это «тот самый». exit = «выход», the exit = «тот самый, нужный выход».', uk: 'the — це «той самий». exit = «вихід», the exit = «той самий, потрібний вихід».', es: 'the es «ese mismo». exit = «salida», the exit = «esa salida concreta».' },
        why: { ru: 'the говорит, что выход конкретный — тот, к которому ты идёшь, а не любой.', uk: 'the каже, що вихід конкретний — той, до якого ти йдеш, а не будь-який.', es: 'the indica que la salida es concreta, esa a la que vas, no una cualquiera.' },
        commonMistake: { ru: 'Без the звучит, будто подойдёт любой выход. А тебе нужен тот самый.', uk: 'Без the звучить, ніби підійде будь-який вихід. А тобі потрібен той самий.', es: 'Sin the suena a que vale cualquier salida, y tú quieres esa.' },
      },
      words: [
        { text: 'I', partOfSpeech: 'pronoun', distractors: ['You', 'We', 'They', 'He', 'She'] },
        { text: 'need', partOfSpeech: 'verb', distractors: ['want', 'see', 'find', 'have', 'take'] },
        { text: 'the', partOfSpeech: 'article', distractors: ['a', 'an', 'this', 'that', 'my'] },
        { text: 'exit', partOfSpeech: 'noun', distractors: ['gate', 'door', 'desk', 'sign', 'map'] },
      ],
    },
    {
      id: 'voyazh_d1_p5',
      english: 'Where is the gate?',
      meaning: { ru: 'Где выход на посадку?', uk: 'Де вихід на посадку?', es: '¿Dónde está la puerta?' },
      constructions: ['to-be-questions'],
      explanation: {
        title: { ru: 'Вопрос Where', uk: 'Питання Where', es: 'La pregunta Where' },
        rule: { ru: 'Where — это «где». gate = «выход на посадку», Where is the gate? = «где выход на посадку?».', uk: 'Where — це «де». gate = «вихід на посадку», Where is the gate? = «де вихід на посадку?».', es: 'Where es «dónde». gate = «puerta», Where is the gate? = «¿dónde está la puerta?».' },
        why: { ru: 'В вопросе is встаёт сразу после Where: Where is. Дальше называешь, что ищешь.', uk: 'У питанні is стоїть одразу після Where: Where is. Далі називаєш, що шукаєш.', es: 'En la pregunta is va justo tras Where: Where is. Luego dices qué buscas.' },
        commonMistake: { ru: 'Здесь не нужно do: говори Where is the gate, а не Where do the gate.', uk: 'Тут не потрібне do: кажи Where is the gate, а не Where do the gate.', es: 'Aquí no va do: di Where is the gate, no Where do the gate.' },
      },
      words: [
        { text: 'Where', partOfSpeech: 'adverb', distractors: ['When', 'What', 'Who', 'Why', 'How'] },
        { text: 'is', partOfSpeech: 'to-be', distractors: ['are', 'am', 'be', 'was', 'do'] },
        { text: 'the', partOfSpeech: 'article', distractors: ['a', 'an', 'this', 'my', 'that'] },
        { text: 'gate', partOfSpeech: 'noun', distractors: ['exit', 'desk', 'door', 'sign', 'map'] },
      ],
    },
    {
      id: 'voyazh_d1_p6',
      english: 'Thank you, that helps.',
      meaning: { ru: 'Спасибо, это помогает.', uk: 'Дякую, це допомагає.', es: 'Gracias, eso ayuda.' },
      constructions: ['present-simple'],
      explanation: {
        title: { ru: 'Фраза that helps', uk: 'Фраза that helps', es: 'La frase that helps' },
        rule: { ru: 'that helps — «это помогает». help = «помощь, помогать», that helps = «это помогает».', uk: 'that helps — «це допомагає». help = «допомога, допомагати», that helps = «це допомагає».', es: 'that helps — «eso ayuda». help = «ayuda, ayudar», that helps = «eso ayuda».' },
        why: { ru: 'Добавь это к «спасибо» — получится теплее: не просто thank you, а спасибо за пользу.', uk: 'Додай це до «дякую» — вийде тепліше: не просто thank you, а дякую за користь.', es: 'Añádelo a «gracias» y suena mejor: no solo thank you, sino gracias por la ayuda.' },
        commonMistake: { ru: 'После that слово берёт -s: говори that helps, а не that help.', uk: 'Після that слово бере -s: кажи that helps, а не that help.', es: 'Tras that la palabra lleva -s: di that helps, no that help.' },
      },
      words: [
        { text: 'Thank', partOfSpeech: 'verb', distractors: ['Help', 'Show', 'Tell', 'Give', 'Take'] },
        { text: 'you', partOfSpeech: 'pronoun', distractors: ['me', 'us', 'them', 'him', 'her'] },
        { text: 'that', partOfSpeech: 'pronoun', distractors: ['this', 'it', 'these', 'those', 'they'] },
        { text: 'helps', partOfSpeech: 'verb', distractors: ['works', 'fits', 'counts', 'matters', 'fixes'] },
      ],
    },
  ],
  vocabulary: [
    { word: 'lost', partOfSpeech: 'adjective', translation: { ru: 'потерянный / заблудился', uk: 'загублений / заблукав', es: 'perdido' }, example: "I'm lost." },
    { word: 'help', partOfSpeech: 'noun', translation: { ru: 'помощь', uk: 'допомога', es: 'ayuda' }, example: 'I need help.' },
    { word: 'understand', partOfSpeech: 'verb', translation: { ru: 'понимать', uk: 'розуміти', es: 'entender' }, example: "I don't understand." },
    { word: 'exit', partOfSpeech: 'noun', translation: { ru: 'выход', uk: 'вихід', es: 'salida' }, example: 'I need the exit.' },
    { word: 'gate', partOfSpeech: 'noun', translation: { ru: 'выход на посадку', uk: 'вихід на посадку', es: 'puerta de embarque' }, example: 'Where is the gate?' },
    { word: 'need', partOfSpeech: 'verb', translation: { ru: 'нуждаться', uk: 'потребувати', es: 'necesitar' }, example: 'I need the exit.' },
  ],
};

export const VOYAZH_DAY_3: PlanContentDay = {
  planId: 'voyazh',
  dayIndex: 3,
  topic: { ru: 'Багаж и регистрация', uk: 'Багаж і реєстрація', es: 'Equipaje y facturación' },
  outcome: {
    ru: 'Сможешь сдать сумку, показать посадочный и спросить про вес и выход.',
    uk: 'Зможеш здати валізу, показати посадковий і спитати про вагу та вихід.',
    es: 'Podrás facturar la maleta, mostrar el embarque y preguntar por el peso y la puerta.',
  },
  level: 'A2',
  prerequisiteLessons: [1, 3, 7, 9],
  intro: [
    {
      kind: 'why',
      title: { ru: 'Зачем эти фразы', uk: 'Навіщо ці фрази', es: 'Por qué estas frases' },
      body: {
        ru: 'Ты у стойки с чемоданом. Тут всё быстро: сдать сумку, показать билет, ответить про вес. Эти фразы — твоя шпаргалка.',
        uk: 'Ти біля стійки з валізою. Тут усе швидко: здати сумку, показати квиток, відповісти про вагу. Ці фрази — твоя шпаргалка.',
        es: 'Estás en el mostrador con la maleta. Todo es rápido: facturar, mostrar el billete, decir el peso. Estas frases son tu chuleta.',
      },
    },
    {
      kind: 'how',
      title: { ru: 'Как это работает', uk: 'Як це працює', es: 'Cómo funciona' },
      body: {
        ru: 'Два главных слова: have («у меня есть») и there is («тут есть»). Покажи вещь и назови деталь — этого хватает.',
        uk: 'Два головні слова: have («у мене є») і there is («тут є»). Покажи річ і назви деталь.',
        es: 'Dos palabras clave: have («tengo») y there is («hay»). Muestra algo y di un detalle.',
      },
      examples: [
        { en: 'I have one bag.', gloss: { ru: 'У меня одна сумка.', uk: 'У мене одна валіза.', es: 'Tengo una maleta.' } },
        { en: 'Here is my ticket.', gloss: { ru: 'Вот мой билет.', uk: 'Ось мій квиток.', es: 'Aquí está mi billete.' } },
      ],
    },
    {
      kind: 'trap',
      title: { ru: 'Частая ошибка', uk: 'Часта помилка', es: 'Error común' },
      body: {
        ru: 'С have не нужен do. Говори I have a bag, а не I do have a bag. Лишнее do тут как пятое колесо.',
        uk: 'З have не потрібен do. Кажи I have a bag, а не I do have a bag.',
        es: 'Con have no hace falta do. Di I have a bag, no I do have a bag.',
      },
    },
  ],
  phrases: [
    {
      id: 'voyazh_d3_p1',
      english: 'I have one bag.',
      meaning: { ru: 'У меня одна сумка.', uk: 'У мене одна валіза.', es: 'Tengo una maleta.' },
      constructions: ['to-have'],
      explanation: {
        title: { ru: 'Слово have', uk: 'Слово have', es: 'La palabra have' },
        rule: { ru: 'have — это «есть, имею». bag = «сумка», I have one bag = «у меня одна сумка».', uk: 'have — це «є, маю». bag = «валіза», I have one bag = «у мене одна валіза».', es: 'have es «tengo». bag = «maleta», I have one bag = «tengo una maleta».' },
        why: { ru: 'Скажи I have + сколько + вещь — и у стойки сразу знают, что у тебя с собой.', uk: 'Скажи I have + скільки + річ — і біля стійки одразу знають, що в тебе із собою.', es: 'Di I have + cuántas + cosa y en el mostrador saben qué llevas.' },
        commonMistake: { ru: 'Здесь не нужно do: говори I have one bag, а не I do have one bag.', uk: 'Тут не потрібне do: кажи I have one bag, а не I do have one bag.', es: 'Aquí no va do: di I have one bag, no I do have one bag.' },
      },
      words: [
        { text: 'I', partOfSpeech: 'pronoun', distractors: ['You', 'We', 'They', 'He', 'She'] },
        { text: 'have', partOfSpeech: 'verb', distractors: ['has', 'had', 'need', 'see', 'want'] },
        { text: 'one', partOfSpeech: 'determiner', distractors: ['two', 'a', 'the', 'some', 'my'] },
        { text: 'bag', partOfSpeech: 'noun', distractors: ['ticket', 'seat', 'gate', 'card', 'box'] },
      ],
    },
    {
      id: 'voyazh_d3_p2',
      english: 'Here is my ticket.',
      meaning: { ru: 'Вот мой билет.', uk: 'Ось мій квиток.', es: 'Aquí está mi billete.' },
      constructions: ['to-be'],
      explanation: {
        title: { ru: 'Фраза Here is', uk: 'Фраза Here is', es: 'La frase Here is' },
        rule: { ru: 'Here is — это «вот, держите». ticket = «билет», Here is my ticket = «вот мой билет».', uk: 'Here is — це «ось, тримайте». ticket = «квиток», Here is my ticket = «ось мій квиток».', es: 'Here is es «aquí tiene». ticket = «billete», Here is my ticket = «aquí está mi billete».' },
        why: { ru: 'Говоришь Here is, когда что-то протягиваешь и показываешь собеседнику.', uk: 'Кажеш Here is, коли щось простягаєш і показуєш співрозмовнику.', es: 'Dices Here is cuando entregas o muestras algo a la otra persona.' },
        commonMistake: { ru: 'Не пропускай is: говори Here is my ticket, а не Here my ticket.', uk: 'Не пропускай is: кажи Here is my ticket, а не Here my ticket.', es: 'No te saltes is: di Here is my ticket, no Here my ticket.' },
      },
      words: [
        { text: 'Here', partOfSpeech: 'adverb', distractors: ['There', 'Now', 'Then', 'Where', 'When'] },
        { text: 'is', partOfSpeech: 'to-be', distractors: ['are', 'am', 'be', 'was', 'do'] },
        { text: 'my', partOfSpeech: 'pronoun', distractors: ['your', 'his', 'the', 'a', 'her'] },
        { text: 'ticket', partOfSpeech: 'noun', distractors: ['bag', 'seat', 'gate', 'card', 'box'] },
      ],
    },
    {
      id: 'voyazh_d3_p3',
      english: 'The bag is not heavy.',
      meaning: { ru: 'Сумка не тяжёлая.', uk: 'Валіза не важка.', es: 'La maleta no es pesada.' },
      constructions: ['to-be-negation'],
      explanation: {
        title: { ru: 'Фраза is not', uk: 'Фраза is not', es: 'La frase is not' },
        rule: { ru: 'is not — это «не». heavy = «тяжёлая», is not heavy = «не тяжёлая».', uk: 'is not — це «не». heavy = «важка», is not heavy = «не важка».', es: 'is not es «no es». heavy = «pesada», is not heavy = «no es pesada».' },
        why: { ru: 'Ставишь is not перед словом — и говоришь, что вещь такой НЕ является.', uk: 'Ставиш is not перед словом — і кажеш, що річ такою НЕ є.', es: 'Pones is not delante de la palabra para decir que la cosa NO es así.' },
        commonMistake: { ru: 'Нужно is not, а не просто no: говори is not heavy, а не no heavy.', uk: 'Потрібно is not, а не просто no: кажи is not heavy, а не no heavy.', es: 'Hace falta is not, no solo no: di is not heavy, no «no heavy».' },
      },
      words: [
        { text: 'The', partOfSpeech: 'article', distractors: ['A', 'An', 'This', 'My', 'That'] },
        { text: 'bag', partOfSpeech: 'noun', distractors: ['ticket', 'seat', 'gate', 'card', 'box'] },
        { text: 'is', partOfSpeech: 'to-be', distractors: ['are', 'am', 'be', 'was', 'do'] },
        { text: 'not', partOfSpeech: 'adverb', distractors: ['no', 'now', 'note', 'none', 'never'] },
        { text: 'heavy', partOfSpeech: 'adjective', distractors: ['light', 'small', 'full', 'wide', 'soft'] },
      ],
    },
    {
      id: 'voyazh_d3_p4',
      english: 'There is a fragile item.',
      meaning: { ru: 'Здесь есть хрупкая вещь.', uk: 'Тут є крихка річ.', es: 'Hay un objeto frágil.' },
      constructions: ['there-is'],
      explanation: {
        title: { ru: 'Фраза There is', uk: 'Фраза There is', es: 'La frase There is' },
        rule: { ru: 'There is — это «тут есть». item = «вещь», There is a fragile item = «тут есть хрупкая вещь».', uk: 'There is — це «тут є». item = «річ», There is a fragile item = «тут є крихка річ».', es: 'There is es «hay». item = «objeto», There is a fragile item = «hay un objeto frágil».' },
        why: { ru: 'Скажи There is, когда сообщаешь, что что-то есть или лежит внутри.', uk: 'Кажи There is, коли повідомляєш, що щось є або лежить усередині.', es: 'Di There is cuando avisas de que algo existe o está dentro.' },
        commonMistake: { ru: 'Для «тут есть» нужно There is, а не It has.', uk: 'Для «тут є» потрібно There is, а не It has.', es: 'Para «hay» se usa There is, no It has.' },
      },
      words: [
        { text: 'There', partOfSpeech: 'existential', distractors: ['Here', 'It', 'This', 'That', 'Where'] },
        { text: 'is', partOfSpeech: 'to-be', distractors: ['are', 'am', 'has', 'be', 'do'] },
        { text: 'a', partOfSpeech: 'article', distractors: ['the', 'an', 'one', 'my', 'this'] },
        { text: 'fragile', partOfSpeech: 'adjective', distractors: ['heavy', 'small', 'open', 'full', 'soft'] },
        { text: 'item', partOfSpeech: 'noun', distractors: ['bag', 'seat', 'gate', 'card', 'box'] },
      ],
    },
    {
      id: 'voyazh_d3_p5',
      english: 'I need a receipt.',
      meaning: { ru: 'Мне нужна квитанция.', uk: 'Мені потрібна квитанція.', es: 'Necesito un recibo.' },
      constructions: ['present-simple'],
      explanation: {
        title: { ru: 'Снова слово need', uk: 'Знову слово need', es: 'Otra vez need' },
        rule: { ru: 'need — это «надо, нужно». receipt = «квитанция», I need a receipt = «мне нужна квитанция».', uk: 'need — це «треба, потрібно». receipt = «квитанція», I need a receipt = «мені потрібна квитанція».', es: 'need es «necesito». receipt = «recibo», I need a receipt = «necesito un recibo».' },
        why: { ru: 'Квитанция — это бумажка-доказательство, что сумку приняли. Полезно её попросить.', uk: 'Квитанція — папірець-доказ, що валізу прийняли. Корисно її попросити.', es: 'El recibo prueba que aceptaron tu maleta; conviene pedirlo.' },
        commonMistake: { ru: 'Перед receipt нужно a: говори need a receipt, а не need receipt.', uk: 'Перед receipt потрібне a: кажи need a receipt, а не need receipt.', es: 'Antes de receipt va a: di need a receipt, no need receipt.' },
      },
      words: [
        { text: 'I', partOfSpeech: 'pronoun', distractors: ['You', 'We', 'They', 'He', 'She'] },
        { text: 'need', partOfSpeech: 'verb', distractors: ['have', 'want', 'see', 'find', 'take'] },
        { text: 'a', partOfSpeech: 'article', distractors: ['the', 'an', 'one', 'my', 'this'] },
        { text: 'receipt', partOfSpeech: 'noun', distractors: ['ticket', 'bag', 'seat', 'gate', 'box'] },
      ],
    },
    {
      id: 'voyazh_d3_p6',
      english: 'Where is the gate?',
      meaning: { ru: 'Где выход на посадку?', uk: 'Де вихід на посадку?', es: '¿Dónde está la puerta?' },
      constructions: ['to-be-questions'],
      explanation: {
        title: { ru: 'Вопрос Where', uk: 'Питання Where', es: 'La pregunta Where' },
        rule: { ru: 'Where — это «где». gate = «выход на посадку», Where is the gate? = «где выход на посадку?».', uk: 'Where — це «де». gate = «вихід на посадку», Where is the gate? = «де вихід на посадку?».', es: 'Where es «dónde». gate = «puerta», Where is the gate? = «¿dónde está la puerta?».' },
        why: { ru: 'Сумку сдал — теперь нужно найти выход на посадку. Этот вопрос приведёт к нему.', uk: 'Валізу здав — тепер треба знайти вихід на посадку. Це питання приведе до нього.', es: 'Ya facturaste; ahora hay que encontrar la puerta. Esta pregunta te lleva a ella.' },
        commonMistake: { ru: 'Здесь не нужно do: говори Where is the gate, а не Where do the gate.', uk: 'Тут не потрібне do: кажи Where is the gate, а не Where do the gate.', es: 'Aquí no va do: di Where is the gate, no Where do the gate.' },
      },
      words: [
        { text: 'Where', partOfSpeech: 'adverb', distractors: ['When', 'What', 'Who', 'Why', 'How'] },
        { text: 'is', partOfSpeech: 'to-be', distractors: ['are', 'am', 'be', 'was', 'do'] },
        { text: 'the', partOfSpeech: 'article', distractors: ['a', 'an', 'this', 'my', 'that'] },
        { text: 'gate', partOfSpeech: 'noun', distractors: ['bag', 'seat', 'desk', 'sign', 'box'] },
      ],
    },
  ],
  vocabulary: [
    { word: 'bag', partOfSpeech: 'noun', translation: { ru: 'сумка', uk: 'валіза', es: 'maleta' }, example: 'I have one bag.' },
    { word: 'ticket', partOfSpeech: 'noun', translation: { ru: 'билет', uk: 'квиток', es: 'billete' }, example: 'Here is my ticket.' },
    { word: 'heavy', partOfSpeech: 'adjective', translation: { ru: 'тяжёлый', uk: 'важкий', es: 'pesado' }, example: 'The bag is not heavy.' },
    { word: 'fragile', partOfSpeech: 'adjective', translation: { ru: 'хрупкий', uk: 'крихкий', es: 'frágil' }, example: 'There is a fragile item.' },
    { word: 'receipt', partOfSpeech: 'noun', translation: { ru: 'квитанция', uk: 'квитанція', es: 'recibo' }, example: 'I need a receipt.' },
    { word: 'gate', partOfSpeech: 'noun', translation: { ru: 'выход на посадку', uk: 'вихід на посадку', es: 'puerta de embarque' }, example: 'Where is the gate?' },
  ],
};

export const VOYAZH_CONTENT_DAYS: PlanContentDay[] = [
  VOYAZH_DAY_1,
  VOYAZH_DAY_3,
];
