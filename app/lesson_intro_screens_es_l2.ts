/**
 * PROMPT-005 — Intro screens Spanish L2 (RU/UK explanations → español meta).
 * HYP-A: campo `en` en ejemplos = referencia en inglés / puente; `trES` = español meta.
 * Riesgo: si la UI aún arma frases EN, el texto de práctica puede no coincidir hasta migración de LessonPhrase.
 */
import type { LessonIntroScreen } from './lesson_data_types';

export const LESSON_1_INTRO_SCREENS: LessonIntroScreen[] = [
  {
    kind: "why",
    titleRU: "Зачем это в испанском",
    titleUK: "Навіщо це іспанською",
    titleES: "Por qué en español",
    textRU: "Без связки ser / estar и местоимений ты не скажешь по-испански ни профессию, ни место, ни состояние: «я здесь», «она дома», «мы заняты». Это базовый каркас предложения — без него речь не держится.",
    textUK: "Без зв'язки ser / estar і займенників ти не скажеш іспанською ні професію, ні місце, ні стан: «я тут», «вона вдома», «ми зайняті». Це базовий каркас речення.",
    textES: "Sin ser/estar y pronombres no puedes decir profesión, lugar ni estado: «estoy aquí», «ella está en casa», «estamos ocupados». Es el esqueleto de casi toda frase.",
  },
  {
    kind: "how",
    titleRU: "Как строится фраза",
    titleUK: "Як будується фраза",
    titleES: "Cómo se arma la frase",
    textRU: "Ser — про то, «кто / что ты»: soy estudiante. Estar — где ты или как ты себя чувствуешь: estoy aquí, estás cansado. Рядом с местоимением сразу ставится форма глагола: yo soy / tú eres / yo estoy / tú estás.",
    textUK: "Ser — «хто / що ти»: soy estudiante. Estar — де ти або як почуваєшся: estoy aquí, estás cansado. Одразу після займенника йде форма дієслова: yo soy / tú eres / yo estoy / tú estás.",
    textES: "Ser = identidad o clase; estar = ubicación o estado. Junto al pronombre va la forma conjugada: yo soy / tú eres / yo estoy / tú estás.",
    examples: [
      { en: "I am a student.", trRU: "Я студент.", trUK: "Я студент.", trES: "Soy estudiante." },
      { en: "You are here.", trRU: "Ты здесь.", trUK: "Ти тут.", trES: "Estás aquí." },
      { en: "She is tired.", trRU: "Она устала.", trUK: "Вона втомилась.", trES: "Ella está cansada." },
    ],
  },
  {
    kind: "trap",
    titleRU: "Главная ловушка",
    titleUK: "Головна пастка",
    titleES: "La trampa principal",
    textRU: "Русское «он студент» без глагола в испанском не работает: нельзя *él estudiante*. Нужна связка: Él es estudiante. И не путай ser и estar: профессия почти всегда с ser (soy médico), временное состояние — con estar (estoy enfermo).",
    textUK: "Українське «він студент» без дієслова іспанською не працює: не кажи *él estudiante*. Треба зв'язка: Él es estudiante. Не плутай ser і estar: професія — з ser, тимчасовий стан — з estar.",
    textES: "No digas *él estudiante* sin verbo: usa Él es estudiante. Profesión suele ir con ser; estado puntual con estar (estoy cansado vs soy médico).",
  },
  {
    kind: "mechanic",
    titleRU: "Как это работает",
    titleUK: "Як це працює",
    titleES: "Cómo funciona la app",
    textRU: "На экране видишь подсказку на языке интерфейса (русский / украинский / испанский). Собери нужную фразу из слов-кнопок в правильном порядке. Кнопка «½» убирает половину неправильных вариантов. «Теория» открывает эти экраны.",
    textUK: "На екрані підказка мовою інтерфейсу (російська / українська / іспанська). Збери потрібну фразу з кнопок у правильному порядку. «½» прибирає половину помилкових варіантів. «Теорія» відкриває ці екрани.",
    textES: "Verás la pista en el idioma de la interfaz (RU / UK / ES). Monta la frase correcta tocando las palabras en orden. El botón «½» elimina la mitad de opciones incorrectas. «Teoría» abre estas pantallas.",
  },
];

export const LESSON_2_INTRO_SCREENS: LessonIntroScreen[] = [
  {
    kind: "why",
    titleRU: "Зачем это в испанском",
    titleUK: "Навіщо це іспанською",
    titleES: "Por qué en español",
    textRU: "Чтобы спорить, уточнять и переспрашивать по-испански: «не так», «не готов», «ты дома?». Отрицание и простые вопросы — без них диалог длиной больше двух реплик невозможен.",
    textUK: "Щоб сперечатися, уточнювати й перепитувати іспанською: «не так», «не готовий», «ти вдома?». Заперечення й прості питання без них не розженеш діалог.",
    textES: "Para contradecir, aclarar y preguntar en español: no es así, no estás listo, ¿estás en casa? Sin negación ni preguntas el diálogo no arranca.",
  },
  {
    kind: "how",
    titleRU: "Как строится фраза",
    titleUK: "Як будується фраза",
    titleES: "Cómo se forma",
    textRU: "Отрицание: no ставится перед всей формой глагола: no soy / no estás / no es. Вопрос с да/нет: инверсия или интонация — ¿Eres estudiante? ¿Estás aquí? Ответы короткие: чаще всего Sí / No.",
    textUK: "Заперечення: no перед усією формою дієслова: no soy / no estás / no es. Питання так/ні: інверсія або інтонація — ¿Eres estudiante? Відповіді короткі: Sí / No.",
    textES: "Negación: no delante del verbo conjugado (no soy, no estás). Pregunta de sí/no: ¿Eres…?, ¿Estás…? Respuestas cortas: Sí / No.",
    examples: [
      { en: "I am not ready.", trRU: "Я не готов.", trUK: "Я не готовий.", trES: "No estoy listo." },
      { en: "Are you at home?", trRU: "Ты дома?", trUK: "Ти вдома?", trES: "¿Estás en casa?" },
      { en: "She is not busy.", trRU: "Она не занята.", trUK: "Вона не зайнята.", trES: "Ella no está ocupada." },
    ],
  },
  {
    kind: "trap",
    titleRU: "Главная ловушка",
    titleUK: "Головна пастка",
    titleES: "La trampa principal",
    textRU: "В испанском один маркер no на глагол не надо «усиливать» вторым перед именем как кальку с русского двойного «не»: скажи No soy médico, а не *No no soy*. И помни знак вопроса ¿…? в начале длинных вопросов — иначе для носителя это выглядит как заготовка из чата без пунктуации.",
    textUK: "Один no перед дієсловом достатньо; не калькуй подвійне «не» російською. І став знаки ¿ … ? у письмі — це норма іспанської.",
    textES: "Un solo no basta delante del verbo; evita calcos del doble «не» eslavo. En escritura usa ¿ … ? en preguntas.",
  },
  {
    kind: "tip",
    titleRU: "Полезно знать",
    titleUK: "Корисно знати",
    titleES: "Dato útil",
    textRU: "В коротком ответе на вопрос с ser/estar можно опустить повтор: ¿Estás cansado? — Sí. Вежливость добавляет por favor в просьбах с infinitivo/imperativo на следующих уроках.",
    textUK: "У короткій відповіді часто достатньо Sí / No без повного повтору фрази.",
    textES: "En respuestas cortas basta Sí/No sin repetir todo; suma cortesía con por favor cuando pidas algo.",
  },
];

export const LESSON_3_INTRO_SCREENS: LessonIntroScreen[] = [
  {
    kind: "why",
    textRU: "О настоящих привычках и фактах по-испански говорят прежде всего формами настоящего времени: «работаю», «живу здесь», «учу испанский». Это то, чем ты заполняешь 80% бытовых диалогов.",
    textUK: "Про поточні звички й факти іспанською насамперед через теперішній час: «працюю», «живу тут», «вивчаю іспанську». Це основа побутової розмови.",
    textES: "Los hábitos y hechos cotidianos van en presente: trabajo aquí, estudio español. Es la forma más usada en la vida diaria.",
  },
  {
    kind: "how",
    textRU: "Для регулярных глаголов: тема + окончание по типу (-ar: hablo/hablas; -er: como/comes; -ir: vivo/vives). Местоимение можно опустить, если ясно, о ком речь: Hablo español.",
    textUK: "У регулярних моделях: основа + закінчення (-ar: hablo/hablas; -er: como/comes; -ir: vivo/vives). Займенник часто опускають, якщо зрозуміло: Hablo español.",
    textES: "Verbos regulares: raíz + desinencia (-ar: hablo; -er: como; -ir: vivo). El pronombre suele omitirse si el verbo lo deja claro.",
    examples: [
      { en: "I speak Spanish.", trRU: "Я говорю по-испански.", trUK: "Я говорю іспанською.", trES: "Hablo español." },
      { en: "You eat here.", trRU: "Ты ешь здесь.", trUK: "Ти їси тут.", trES: "Comes aquí." },
      { en: "We live in Madrid.", trRU: "Мы живём в Мадриде.", trUK: "Ми живемо в Мадриді.", trES: "Vivimos en Madrid." },
    ],
  },
  {
    kind: "trap",
    textRU: "Не переноси русский порядок «я очень люблю» дословно как *Yo mucho amo*: усилители типа mucho/muy ставятся по правилам испанской порядковости (часто muy antes del adjetivo; mucho con verbo de acción). На старте держи modelo simple: Me gusta mucho.",
    textUK: "Не калькуй порядок слів російської/української з усилителями: *Yo mucho amo* не звучить. Вчи простий каркас: Me gusta mucho.",
    textES: "Evita calcos del orden eslavo con cuantificadores: no construyas *Yo mucho amo*. Prefiere patrones naturales como Me gusta mucho.",
  },
];

export const LESSON_4_INTRO_SCREENS: LessonIntroScreen[] = [
  {
    kind: "why",
    textRU: "Отказ и контраст строятся через no + глагол: спокойно сказать «не знаю», «не работаю здесь», «не понимаю». Это вежливее безличной блокировки на языке жестов.",
    textUK: "Відмова й контраст — через no + дієслово: «не знаю», «не працюю тут». Так ти звучиш доросло й ясно.",
    textES: "Negar con claridad: no + verbo conjugado (no sé, no trabajo aquí). Marca límites sin gritar.",
  },
  {
    kind: "how",
    textRU: "No всегда примыкает к спрягаемой форме: No hablo / No como / No vivo. Остальная группа слов идёт как в утверждении: No hablo español aquí.",
    textUK: "No стоїть безпосередньо перед формою дієслова: No hablo / No como. Решта порядку як у ствердженні.",
    textES: "No va pegado al verbo flexionado; el resto mantiene el orden afirmativo.",
    examples: [
      { en: "I don't understand.", trRU: "Я не понимаю.", trUK: "Я не розумію.", trES: "No entiendo." },
      { en: "We don't live here.", trRU: "Мы не живём здесь.", trUK: "Ми не живемо тут.", trES: "No vivimos aquí." },
      { en: "They don't work today.", trRU: "Они сегодня не работают.", trUK: "Вони сьогодні не працюють.", trES: "No trabajan hoy." },
    ],
  },
  {
    kind: "trap",
    textRU: "Не раздувай цепочку отрицаний как в разговорном русском «ничего не знаю» калькой *No sé nada* допустимо в испанском, но не смешивай no + nunca + nadie без нужды — одна отрицательная полярность на слот. На начальном этапе: одно no на глагол либо nadie/nada в именной части.",
    textUK: "Не насипай зайвих заперечень одразу: одне логічне негатування на речення спрощує мовлення.",
    textES: "No acumules negativos innecesarios; una polaridad clara suena más natural al principio.",
  },
];

export const LESSON_5_INTRO_SCREENS: LessonIntroScreen[] = [
  {
    kind: "why",
    textRU: "Без вопросов да/нет ты не проверяешь факты: «Ты живёшь здесь?», «У вас есть время?». Испанец ждёт инверсию или чёткую интонацию — иначе фраза звучит как утверждение.",
    textUK: "Питання так/ні перевіряють факти: «ти живеш тут?». У SP очікують інверсію або підняття тону.",
    textES: "Las preguntas de sí/no confirman datos: ¿Vives aquí? Sin entonación o sin orden interrogativo suena afirmación.",
  },
  {
    kind: "how",
    textRU: "Два рабочих пути: ¿ + та же порядок что в утверждении + ? с повышением тона (разговорная Испания и ЛатАм), или инверсия sujeto-verbo: ¿Hablas español? / ¿Tú hablas español? На письме всегда ¿ … ?.",
    textUK: "Або інтонація на тій самій послідовності, або інверсія підмет-присудок; у тексті — ¿ … ?.",
    textES: "Orden de palabras igual que en afirmación + entonación, o inversión sujeto-verbo; escribe ¿ … ?.",
    examples: [
      { en: "Do you speak Spanish?", trRU: "Ты говоришь по-испански?", trUK: "Ти говориш іспанською?", trES: "¿Hablas español?" },
      { en: "Are they at home?", trRU: "Они дома?", trUK: "Вони вдома?", trES: "¿Están en casa?" },
      { en: "Does he work here?", trRU: "Он здесь работает?", trUK: "Він тут працює?", trES: "¿Él trabaja aquí?" },
    ],
  },
  {
    kind: "trap",
    textRU: "Не калькируй английское вспомогательное do/does: в испанском спрягается один главный глагол. Неверно *¿Do tú hablas?* — только ¿Hablas (tú)?.",
    textUK: "Не перенось англійський do/does: іспанською лише одне спряжене дієслово в питанні.",
    textES: "No importes do/does del inglés: basta un verbo flexionado en la pregunta.",
  },
];

export const LESSON_6_INTRO_SCREENS: LessonIntroScreen[] = [
  {
    kind: "why",
    textRU: "Открытые ответы начинаются с qué, quién, dónde, cuándo, cómo, por qué, cuánto. Так ты получаешь не «да/нет», а конкретику: время встречи, адрес, причину.",
    textUK: "Відкриті відповіді — з qué, quién, dónde, cuándo, cómo, por qué, cuánto: це конкретика, не просто так/ні.",
    textES: "Los interrogativos abren la información: qué, quién, dónde, cuándo, cómo, por qué, cuánto.",
  },
  {
    kind: "how",
    textRU: "Вопросительное слово почти всегда первое: ¿Dónde vives? ¿Por qué estudias español? После por qué два слова и ударение на qué в отличие от porque «потому что» (слитно).",
    textUK: "Питальне слово зазвичай на початку: ¿Dónde vives? Розрізняй por qué (питання) і porque (причина).",
    textES: "Palabra interrogativa al inicio: ¿Dónde vives? Ojo: por qué ≠ porque.",
    examples: [
      { en: "Where do you live?", trRU: "Где ты живёшь?", trUK: "Де ти живеш?", trES: "¿Dónde vives?" },
      { en: "Why are you studying?", trRU: "Почему ты учишься?", trUK: "Чому ти вчишся?", trES: "¿Por qué estudias?" },
      { en: "How much does it cost?", trRU: "Сколько это стоит?", trUK: "Скільки це коштує?", trES: "¿Cuánto cuesta?" },
    ],
  },
  {
    kind: "trap",
    textRU: "Не пиши *¿Qué es tu nombre?* — так испанский почти не спрашивают имя; норма ¿Cómo te llamas? / ¿Cuál es tu nombre?. Калька с английского what is your name здесь ложная.",
    textUK: "Ім'я питають ¿Cómo te llamas?, а не кальку з англійського what is your name.",
    textES: "Para el nombre usa ¿Cómo te llamas?; «¿Qué es tu nombre?» suena extraño.",
  },
];

export const LESSON_7_INTRO_SCREENS: LessonIntroScreen[] = [
  {
    kind: "why",
    textRU: "Иметь / обладать по-испански чаще через tener; «есть что-то» в мире — через hay. Иначе ты перепутаешь *tengo tiempo* и *hay tiempo*, «у меня холод» и «на улице холодно».",
    textUK: "Володіння — tener; наявність у світі — hay. Це різні конструкції, як і в español meta.",
    textES: "Posesión / experiencia con tener; existencia general con hay (Hay tiempo vs Tengo tiempo).",
  },
  {
    kind: "how",
    textRU: "Tengo / tienes / tiene + объект: Tengo hermana. Для болезней и состояний часто Me duele la cabeza (не калькируй I have headache буквально без modelo). Hay + sustantivo: Hay pan.",
    textUK: "tengo / tienes + об'єкт. Hay + іменник для «є щось».",
    textES: "Conjugaciones de tener según persona; hay para «existe».",
    examples: [
      { en: "I have two sisters.", trRU: "У меня две сестры.", trUK: "У мене дві сестри.", trES: "Tengo dos hermanas." },
      { en: "She has time.", trRU: "У неё есть время.", trUK: "У неї є час.", trES: "Ella tiene tiempo." },
      { en: "There is bread.", trRU: "Есть хлеб.", trUK: "Є хліб.", trES: "Hay pan." },
    ],
  },
  {
    kind: "trap",
    textRU: "«Мне нравится» не строится как русское «я люблю это» глаголом gustar одним в один в один: Me gusta el café — структура с дативом me. Не *Yo gusto el café* для «мне нравится».",
    textUK: "Конструкція gustar: Me gusta…; не кажи *Yo gusto…* у значенні «мені подобається».",
    textES: "Me gusta(n)… no equivale a *Yo gusto…* para «me gusta».",
  },
];

export const LESSON_8_INTRO_SCREENS: LessonIntroScreen[] = [
  {
    kind: "why",
    textRU: "Чтобы назначить встречу и рассказать расписание, нужны en / el / los / a las / por la mañana. Ошибка в предлоге времени сразу выдаёт иностранца.",
    textUK: "Для зустрічей і розкладу потрібні en / el / los / a las / por la mañana.",
    textES: "Para citas y rutinas: en / el / los / a las / por la mañana.",
  },
  {
    kind: "how",
    textRU: "Дни недели часто с артикулём: el lunes. Месяцы и сезоны — en enero, en verano. Конкретный час — a las tres. Части дня — por la mañana / tarde / noche.",
    textUK: "Дні тижня з el: el lunes; місяці — en + назва; години — a las + число.",
    textES: "el + día de la semana; en + mes/estación; a las + hora; por la tarde…",
    examples: [
      { en: "On Monday I work.", trRU: "В понедельник я работаю.", trUK: "У понеділок я працюю.", trES: "El lunes trabajo." },
      { en: "At three o'clock.", trRU: "В три часа.", trUK: "О третій.", trES: "A las tres." },
      { en: "In May.", trRU: "В мае.", trUK: "У травні.", trES: "En mayo." },
    ],
  },
  {
    kind: "trap",
    textRU: "Не русифицируй порядок «в понедельник утром» как *en lunes mañana*: используй две опоры — El lunes por la mañana.",
    textUK: "Не зливаєш день і частину дня без моделі: El lunes por la mañana.",
    textES: "Combina día + parte del día con preposiciones claras: El lunes por la mañana.",
  },
];

export const LESSON_9_INTRO_SCREENS: LessonIntroScreen[] = [
  {
    kind: "why",
    textRU: "Hay отвечает «есть ли что-то вообще», estar/located отвечает «где конкретный объект». Без этого различия ты скажешь неловко про наличие людей и вещей.",
    textUK: "Hay — про існування; estar — про розташування конкретики.",
    textES: "Hay = existencia; estar = ubicación de algo conocido.",
  },
  {
    kind: "how",
    textRU: "Hay + sustantivo: Hay un problema. Для локации объекта La llave está en la mesa. Вопросы ¿Hay…? vs ¿Dónde está…?.",
    textUK: "Hay + іменник; для «де річ» — ¿Dónde está…?.",
    textES: "¿Hay café? vs ¿Dónde está el café?",
    examples: [
      { en: "There is a problem.", trRU: "Есть проблема.", trUK: "Є проблема.", trES: "Hay un problema." },
      { en: "The keys are on the table.", trRU: "Ключи на столе.", trUK: "Ключі на столі.", trES: "Las llaves están en la mesa." },
      { en: "Is there milk?", trRU: "Есть молоко?", trUK: "Є молоко?", trES: "¿Hay leche?" },
    ],
  },
  {
    kind: "trap",
    textRU: "Не отождествляй hay и está как синонимы в любых контекстах: Hay dos coches (факт наличия) ≠ Los coches están en la calle (где они).",
    textUK: "Hay два автомобілі ≠ Вони стоять на вулиці — різні конструкції.",
    textES: "Hay dos coches ≠ Los coches están en la calle.",
  },
];

export const LESSON_10_INTRO_SCREENS: LessonIntroScreen[] = [
  {
    kind: "why",
    textRU: "Способности и долженствование по-испански передают poder, deber, querer + инфинитив без частицы «to»: puedo ayudarte, debo irme.",
    textUK: "Здатність і необхідність — poder / deber / querer + інфінітив без to.",
    textES: "Modalidad básica: poder, deber, querer + infinitivo.",
  },
  {
    kind: "how",
    textRU: "Модальный глагол спрягается, второй идёт в инфинитиве: Puedo hablar / Debes estudiar / Quiero comer. Отрицание перед модальным: No puedo venir.",
    textUK: "Спрягається модальне, друге — інфінітив; заперечення перед модальним.",
    textES: "Verbo modal conjugado + infinitivo; negación delante del modal.",
    examples: [
      { en: "I can help you.", trRU: "Я могу тебе помочь.", trUK: "Я можу тобі допомогти.", trES: "Puedo ayudarte." },
      { en: "You should rest.", trRU: "Тебе следует отдохнуть.", trUK: "Тобі варто відпочити.", trES: "Debes descansar." },
      { en: "I want to leave.", trRU: "Я хочу уйти.", trUK: "Я хочу піти.", trES: "Quiero irme." },
    ],
  },
  {
    kind: "trap",
    textRU: "Не вставляй «a» перед голым инфинитивом после модальных как во французском: *puedo a hablar* неверно — Puedo hablar.",
    textUK: "Без зайвої a перед інфінітивом після poder/deber/querer.",
    textES: "No insertes a antes del infinitivo tras poder/deber/querer.",
  },
];

export const LESSON_11_INTRO_SCREENS: LessonIntroScreen[] = [
  {
    kind: "why",
    textRU: "Прошедшее завершённое действие — pretérito indefinido: ayer hablé, el año pasado viví allí. Без него ты не расскажешь историю «что случилось».",
    textUK: "Завершена подія в минулому — pretérito: ayer hablé.",
    textES: "Hechos cerrados en el pasado: pretérito indefinido.",
  },
  {
    kind: "how",
    textRU: "Регулярные темы: -ar → -é/-aste; -er/-ir → -í/-iste: hablé/hablaste, comí/comiste. Маркеры: ayer, la semana pasada, en 2020.",
    textUK: "Регулярні закінчення -é/-aste або -í/-iste; маркери минулого часу.",
    textES: "Desinencias regulares; marcadores temporales claros.",
    examples: [
      { en: "I worked yesterday.", trRU: "Я работал вчера.", trUK: "Я працював учора.", trES: "Trabajé ayer." },
      { en: "You arrived late.", trRU: "Ты опоздал.", trUK: "Ти запізнився.", trES: "Llegaste tarde." },
      { en: "We studied a lot.", trRU: "Мы много учились.", trUK: "Ми багато вчилися.", trES: "Estudiamos mucho." },
    ],
  },
  {
    kind: "trap",
    textRU: "Не смешивай русское совершенное/несовершенное без маркеров: если есть точка во времени (ayer), это обычно pretérito, не imperfecto.",
    textUK: "Якщо є точний маркер (ayer), це зазвичай pretérito, не imperfecto.",
    textES: "Con tiempo puntual (ayer) suele ir pretérito, no imperfecto.",
  },
];

export const LESSON_12_INTRO_SCREENS: LessonIntroScreen[] = [
  {
    kind: "why",
    textRU: "Частые irregularidades ломят кальку «просто добавь окончание»: ir/saber/venir/hacer/estar имеют свои корни. Их нужно выучить пакетом — без них Past звучит ломано.",
    textUK: "Неправильні минули форми треба заучувати блоками: ir, hacer, estar…",
    textES: "Los pretéritos irregulares son memorización guiada por uso.",
  },
  {
    kind: "how",
    textRU: "Примеры якорей: fui (ir/ser context!), hice (hacer), estuve (estar), tuve (tener), vine (venir). Смотри субъект и перевод смысла.",
    textUK: "Якорі: fui, hice, estuve, tuve, vine — перевіряй значення з контекстом.",
    textES: "Anclas frecuentes: fui, hice, estuve, tuve, vine.",
    examples: [
      { en: "I went home.", trRU: "Я пошёл домой.", trUK: "Я пішов додому.", trES: "Fui a casa." },
      { en: "She did it.", trRU: "Она это сделала.", trUK: "Вона це зробила.", trES: "Ella lo hizo." },
      { en: "We were there.", trRU: "Мы были там.", trUK: "Ми були там.", trES: "Estuvimos allí." },
    ],
  },
  {
    kind: "trap",
    textRU: "Fui совпадает для ir и ser в pretérito — смысл только из контекста: Fui médico (был врачом) vs Fui al médico (ходил к врачу).",
    textUK: "Fui може бути ir або ser — лише контекст.",
    textES: "Fui admite dos lecturas (ir/ser); el contexto decide.",
  },
];

export const LESSON_13_INTRO_SCREENS: LessonIntroScreen[] = [
  {
    kind: "why",
    textRU: "Будущие планы по-испански чаще через ir a + infinitivo или простое будущее tiempo verbal: Voy a llamarte / Llamaré. Выбирай регистр разговора.",
    textUK: "Плани: ir a + інфінітив або майбутній час: Voy a llamarte.",
    textES: "Futuro próximo (ir a + infinitivo) vs futuro simple según registro.",
  },
  {
    kind: "how",
    textRU: "Voy/vas/va + a + verbo: Voy a estudiar. Futuro simple на Whole infinitivo + desinencias futuras: hablaré. Will английского не калькируй словом futuro отдельным.",
    textUK: "Voy a estudiar або hablaré — без кальки англійського will окремим словом.",
    textES: "Patrones: ir a + infinitivo; futuro morphológico en -ré, -rás…",
    examples: [
      { en: "I'm going to call you.", trRU: "Я собираюсь тебе позвонить.", trUK: "Я збираюся тобі подзвонити.", trES: "Voy a llamarte." },
      { en: "She will travel.", trRU: "Она поедет.", trUK: "Вона поїде.", trES: "Ella viajará." },
      { en: "We'll see.", trRU: "Посмотрим.", trUK: "Побачимо.", trES: "Ya veremos." },
    ],
  },
  {
    kind: "trap",
    textRU: "Не ставь предлог de перед infinitivo после ir a: *voy de comer* → Voy a comer.",
    textUK: "Після ir — a + інфінітив, не de.",
    textES: "Voy a comer, no *voy de comer*.",
  },
];

export const LESSON_14_INTRO_SCREENS: LessonIntroScreen[] = [
  {
    kind: "why",
    textRU: "Сравнения описывают опыт: más rápido, menos caro, tan alto como. Это нужно в шопинге, транспорте, учёбе.",
    textUK: "Порівняння: más / menos / tan … como — у побуті постійно.",
    textES: "Comparar con más / menos / tan … como es indispensable.",
  },
  {
    kind: "how",
    textRU: "más + adjetivo + que; menos + adj + que; tan + adj + como: más alto que, tan caro como. Независимые формы bueno/mejor, malo/peor.",
    textUK: "más … que; menos … que; tan … como; mejor/peor — особливі форми.",
    textES: "Estructuras más/menos/tan … como; irregulares mejor/peor.",
    examples: [
      { en: "He is taller than me.", trRU: "Он выше меня.", trUK: "Він вищий за мене.", trES: "Él es más alto que yo." },
      { en: "This is less expensive.", trRU: "Это дешевле.", trUK: "Це дешевше.", trES: "Esto es menos caro." },
      { en: "She is as busy as you.", trRU: "Она так же занята, как ты.", trUK: "Вона так само зайнята, як ти.", trES: "Ella está tan ocupada como tú." },
    ],
  },
  {
    kind: "trap",
    textRU: "Не путай que и como после tan: *tan alto que tú* для сравнения неверно — tan alto como tú.",
    textUK: "Після tan використовуй como, не que.",
    textES: "tan … como, no *tan … que* para igualdad.",
  },
];

export const LESSON_15_INTRO_SCREENS: LessonIntroScreen[] = [
  {
    kind: "why",
    textRU: "Мои/твои вещи передаются через mi/mis, tu/tus, su/sus — и они согласуются с родом и числом существительного, не с «владельцем» как в русском его/её.",
    textUK: "Mi/mis, tu/tus, su/sus узгоджуються з іменником, не з «носієм».",
    textES: "Los posesivos concuerdan con el nombre poseído, no con el poseedor.",
  },
  {
    kind: "how",
    textRU: "Mi libro / mis libros; tu casa / tus cosas; su teléfono может быть «его/её/их» — ясность из контекста или de él/de ella.",
    textUK: "Mi/mis + іменник; su двозначний — уточнюй контекстом.",
    textES: "mi/mis + sustantivo; su puede ambiguar → de él/de ellos.",
    examples: [
      { en: "My phone.", trRU: "Мой телефон.", trUK: "Мій телефон.", trES: "Mi teléfono." },
      { en: "Your friends.", trRU: "Твои друзья.", trUK: "Твої друзі.", trES: "Tus amigos." },
      { en: "Their house.", trRU: "Их дом.", trUK: "Їхній дім.", trES: "Su casa." },
    ],
  },
  {
    kind: "trap",
    textRU: "Не добавляй артикль между possessivo и существительным как во французском: *el mi libro* неверно — mi libro.",
    textUK: "Без артикля між possessivo та іменником: mi libro.",
    textES: "mi libro, no *el mi libro*.",
  },
];

export const LESSON_16_INTRO_SCREENS: LessonIntroScreen[] = [
  {
    kind: "why",
    textRU: "Устойчивые глагольные обороты по-испански часто перифразируются: dar un paseo, echar una siesta, hacer cola — не всегда один глагол как в английском phrasal.",
    textUK: "Ідіоми руху й побуту часто фразові перифрази, не дослівний один глагол.",
    textES: "Las perífrasis cotidianas suelen ser colocaciones fijas.",
  },
  {
    kind: "how",
    textRU: "Учи блоками: hacer caso (слушаться), llevarse bien (ладить), volver a + inf (снова), dejar de + inf (перестать). Это не «перевод по словам», а чанки.",
    textUK: "Вчи блоками: hacer caso, volver a + інф., dejar de + інф.",
    textES: "Memoriza chunks: hacer caso, volver a + inf., dejar de + inf.",
    examples: [
      { en: "Take a walk.", trRU: "Прогуляться.", trUK: "Прогулятися.", trES: "Dar un paseo." },
      { en: "Take a nap.", trRU: "Вздремнуть.", trUK: "Подрімати.", trES: "Echar una siesta." },
      { en: "Wait in line.", trRU: "Стоять в очереди.", trUK: "Стояти в черзі.", trES: "Hacer cola." },
    ],
  },
  {
    kind: "trap",
    textRU: "Не калькируй английский phrasal буквально: «встретиться случайно» — encontrarse con alguien, не *toparse* без регистра во всех регионах.",
    textUK: "Не перекладай phrasal verbs англійські слово в слово.",
    textES: "Evita traducción palabra por palabra del phrasal inglés.",
  },
];

export const LESSON_17_INTRO_EXTRA: LessonIntroScreen[] = [
  {
    kind: "why",
    textRU: "Происходящее прямо сейчас по-испански чаще estar + gerundio: Estoy trabajando. Это не копия английского списка «статических» глаголов на 100%, но основа та же.",
    textUK: "Дія «прямо зараз» — estar + gerundio.",
    textES: "Progresivo actual: estar + gerundio.",
  },
  {
    kind: "how",
    textRU: "Estar conjugado + gerundio en -ando/-iendo: estoy hablando, está comiendo. Используй для временного процесса; для будущего рядом часто ya / ahora.",
    textUK: "estar + -ando/-iendo для тимчасового процесу.",
    textES: "estar + gerundio (-ando / -iendo).",
    examples: [
      { en: "I am working.", trRU: "Я работаю (сейчас).", trUK: "Я працюю (зараз).", trES: "Estoy trabajando." },
      { en: "She is eating.", trRU: "Она ест.", trUK: "Вона їсть.", trES: "Ella está comiendo." },
      { en: "We are waiting.", trRU: "Мы ждём.", trUK: "Ми чекаємо.", trES: "Estamos esperando." },
    ],
  },
  {
    kind: "trap",
    textRU: "Не распространяй английский запрет на все «verbs of state» без проверки: в español иногда estar + gerundio возможно для усиления процесса в разговоре — но на уроке держи безопасный минимум: избегай estar queriendo / estar sabiendo для простых случаев.",
    textUK: "Обмеження типу англійських stative verbs не автоматичні для español; на базовому рівні уникай неконтрольованих поєднань.",
    textES: "Los verbos de estado no se calculan igual que en inglés; en nivel básico evita combinaciones raras.",
  },
];

export const LESSON_18_INTRO_EXTRA: LessonIntroScreen[] = [
  {
    kind: "why",
    textRU: "Просьбы и указания в быту — Abre la puerta, Pasa la sal. Без императива ты останешься только на «можно…?», где лишние слова.",
    textUK: "Прохання й вказівки — Abre la puerta. Без імператива звучиш громіздко.",
    textES: "Peticiones y órdenes suaves con imperativo: Abre la puerta, Pasa la sal.",
  },
  {
    kind: "how",
    textRU: "Ты-форма часто совпадает с формой он/она в presente 3sg, но у ударения и контекста: Habla (él) vs ¡Habla! (tú). Отрицание: No hables. Рефлексивные — смещение ударения: ¡Siéntate!",
    textUK: "Форми на -a/-e для tú/usted залежать від системи, що вчиш; заперечення No + subjuntivo/imperativo за шаблоном курсу.",
    textES: "Afirmativo/negativo; reflexivos con pronombre enclítico: Siéntate, No te vayas.",
    examples: [
      { en: "Open the window.", trRU: "Открой окно.", trUK: "Відкрий вікно.", trES: "Abre la ventana." },
      { en: "Don't worry.", trRU: "Не беспокойся.", trUK: "Не хвилюйся.", trES: "No te preocupes." },
      { en: "Sit down.", trRU: "Садись.", trUK: "Сідай.", trES: "Siéntate." },
    ],
  },
  {
    kind: "trap",
    textRU: "Не переноси русский «давай» как *Давай откроем* с неправильным лицом без согласования: для предложения действия чаще Vamos a abrir / Abre tú, а не смесь лиц.",
    textUK: "Узгоджуй особу в наказах і пропозиціях; уникай змішання суб'єктів.",
    textES: "Cuida la concordancia de persona en mandatos colectivos; usa Vamos a + inf para propuestas.",
  },
];

export const LESSON_19_INTRO_EXTRA: LessonIntroScreen[] = [
  {
    kind: "why",
    textRU: "en/sobre/debajo/detras/en frente de задают сцену: где лежит, сидит, висит. Без них геолокация фразы расплывается.",
    textUK: "Місцеві прийменники малюють сцену: en, sobre, debajo de…",
    textES: "Las preposiciones de lugar dibujan la escena.",
  },
  {
    kind: "how",
    textRU: "en caja / sobre la mesa / debajo de la silla / delante del banco. Сочетай estar для положения: El libro está sobre la mesa.",
    textUK: "en/sobre/debajo de + estar для положення об'єкта.",
    textES: "en/sobre/debajo de… + estar para ubicar objetos.",
    examples: [
      { en: "The keys are on the table.", trRU: "Ключи на столе.", trUK: "Ключі на столі.", trES: "Las llaves están en la mesa." },
      { en: "The bag is under the chair.", trRU: "Сумка под стулом.", trUK: "Сумка під стільцем.", trES: "El bolso está debajo de la silla." },
      { en: "She is at the station.", trRU: "Она на вокзале.", trUK: "Вона на вокзалі.", trES: "Ella está en la estación." },
    ],
  },
  {
    kind: "trap",
    textRU: "en el aeropuerto ok, pero «на работе» часто en el trabajo / en el trabajo de… — не калькируй en trabajo sin артикля привычно.",
    textUK: "Колокації на кшталт en el trabajo — не опускай артикль без причини.",
    textES: "Colocaciones fijas: en el trabajo, en el parque; evita calcos sin artículo.",
  },
];

export const LESSON_20_INTRO_EXTRA: LessonIntroScreen[] = [
  {
    kind: "why",
    textRU: "el/la/un/una и нулевой артикль меняют смысл: quiero un café vs quiero el café. Носитель слышит «любой» vs «этот».",
    textUK: "Невизначений vs визначений артикль змінює сенс висловлення.",
    textES: "Definido/indefinido marca «este» vs «cualquiera».",
  },
  {
    kind: "how",
    textRU: "un/una primera mención; el/la acordada; без артикля — абстракты, профессии con ser, plural general: Estudiantes estudian.",
    textUK: "un/una — перша згадка; el/la — спільна відомість; без артикля — узагальнення й деякі абстракти.",
    textES: "Primera mención: un/una; conocido: el/la; omisión en plural general o profesión con ser.",
    examples: [
      { en: "I need a taxi.", trRU: "Мне нужно такси.", trUK: "Мені потрібне таксі.", trES: "Necesito un taxi." },
      { en: "The taxi is here.", trRU: "Такси здесь.", trUK: "Таксі тут.", trES: "El taxi está aquí." },
      { en: "She is a doctor.", trRU: "Она врач.", trUK: "Вона лікар.", trES: "Ella es médica." },
    ],
  },
  {
    kind: "trap",
    textRU: "Не добавляй неопределённый артикль перед неисчислямыми «как в английском»: *un agua* в значении water обычно не так; говори agua / un vaso de agua.",
    textUK: "Не кидай un перед усіма незліченними як в англійській; вчи колокації.",
    textES: "No generalices un/una con masas como el inglés; pide agua / un vaso de agua.",
  },
];

export const LESSON_21_INTRO_EXTRA: LessonIntroScreen[] = [
  {
    kind: "why",
    textRU: "algo/nada/alguien/nadie/cualquier cosa управляют отрицанием по-испански иначе, чем some/any в английском — важно для вежливых отказов и уточнений.",
    textUK: "Невизначені займенники в негації мають іспанський порядок полярності.",
    textES: "Indefinidos y polaridad negativa son distintos del inglés some/any.",
  },
  {
    kind: "how",
    textRU: "В части случаев no + verbo + nadie/nada: No veo a nadie. algún/alguna в вопросах: ¿Hay algún problema?",
    textUK: "No + verbo + nadie/nada або algún у питаннях.",
    textES: "Patrones: No veo nada; ¿Hay algún problema?",
    examples: [
      { en: "I don't see anyone.", trRU: "Я никого не вижу.", trUK: "Я нікого не бачу.", trES: "No veo a nadie." },
      { en: "Is there something wrong?", trRU: "Что-то не так?", trUK: "Щось не так?", trES: "¿Pasa algo malo?" },
      { en: "She never says anything.", trRU: "Она никогда ничего не говорит.", trUK: "Вона ніколи нічого не каже.", trES: "Ella nunca dice nada." },
    ],
  },
  {
    kind: "trap",
    textRU: "Двойное отрицание в испанском допустимо как стиль (no… nunca), не путай с английским запретом на don't… nothing.",
    textUK: "Подвійне заперечення в іспанському стилі ≠ англійське правило.",
    textES: "La doble negación española no es el «don't… nothing» inglés.",
  },
];

export const LESSON_22_INTRO_EXTRA: LessonIntroScreen[] = [
  {
    kind: "why",
    textRU: "Gerundio (-ndo) после ciertos verbos и конструкций показывает процесс; отличается от английского -ing в применимости к глаголам состояния.",
    textUK: "Gerundio показує процес, але не копія всіх випадків -ing в англійській.",
    textES: "Gerundio ≠ -ing inglés en todos los contextos.",
  },
  {
    kind: "how",
    textRU: "-ar → -ando, -er/-ir → -iendo: hablando, comiendo. Tras preposición españolской часто usa infinitivo, но regla curso-based: Sigo estudiando vs después de estudiar.",
    textUK: "-ando / -iendo; після прийменника частіше інфінітив у фіксованих колокаціях курсу.",
    textES: "Forma regular -ando / -iendo; tras preposición mira si pide infinitivo.",
    examples: [
      { en: "I keep studying.", trRU: "Я продолжаю учиться.", trUK: "Я продовжую вчитися.", trES: "Sigo estudiando." },
      { en: "Thanks for helping.", trRU: "Спасибо за помощь.", trUK: "Дякую за допомогу.", trES: "Gracias por ayudar." },
      { en: "She arrived crying.", trRU: "Она пришла в слезах.", trUK: "Вона прийшла плачучи.", trES: "Llegó llorando." },
    ],
  },
  {
    kind: "trap",
    textRU: "Не ставь gerundio после de/para без проверки: Gracias por ayudar, не *por ayudando*.",
    textUK: "Después de por / para — часто інфінітив: por ayudar.",
    textES: "por + infinitivo en agradecimiento: Gracias por ayudar.",
  },
];

export const LESSON_23_INTRO_EXTRA: LessonIntroScreen[] = [
  {
    kind: "why",
    textRU: "Пассив по-испански чаще через se vende / fue construido / están hechas — не копия английского be + V3 во всех регистрах.",
    textUK: "Іспанська пасив і перифрази (se pasiva) відрізняються від англійської.",
    textES: "Pasiva refleja (se vende) y periphrasis ser + participio según registro.",
  },
  {
    kind: "how",
    textRU: "Se + verbo 3sg/pl para обобщения: Se habla español. Ser + participio concordado: La casa fue construida en 1990.",
    textUK: "Se + форма дієслова для узагальнення; ser + пасивний причастий узгоджений.",
    textES: "Voz pasiva refleja: Se venden entradas; ser + participio concordado.",
    examples: [
      { en: "Spanish is spoken here.", trRU: "Здесь говорят по-испански.", trUK: "Тут говорять іспанською.", trES: "Aquí se habla español." },
      { en: "The house was built in 1990.", trRU: "Дом построен в 1990.", trUK: "Будинок збудовано 1990.", trES: "La casa fue construida en 1990." },
      { en: "Tickets are sold online.", trRU: "Билеты продают онлайн.", trUK: "Квитки продають онлайн.", trES: "Se venden entradas en línea." },
    ],
  },
  {
    kind: "trap",
    textRU: "Не смешивай *ser vendido* без академического контекста — в речи продавца естественнее Se vende.",
    textUK: "Для оголошень природніше se vende, ніж калькований ser vendido.",
    textES: "En carteles: Se vende; no fuerces ser vendido en oral.",
  },
];

export const LESSON_24_INTRO_EXTRA: LessonIntroScreen[] = [
  {
    kind: "why",
    textRU: "He comido / has visto — pretérito perfecto compuesto — вариативен по региону (Испания vs Латинская Америка). Пойми, что твоя цель — либо опыт без точки, либо результат недавно.",
    textUK: "Present perfect іспанською залежить від регіональної норми; в ELE тренуй узгоджену з курсом.",
    textES: "Antepresente (he comido) varía según norma peninsular/americana.",
  },
  {
    kind: "how",
    textRU: "Haber + participio: he hablado, has comido. Согласование participio sólo con objeto pronominal в некоторых постановках — на этом уровне держи форму фиксированной.",
    textUK: "Haber + participio; деталі узгодження — за рівнем курсу.",
    textES: "Auxiliar haber + participio (-ado/-ido).",
    examples: [
      { en: "I have already eaten.", trRU: "Я уже поел.", trUK: "Я вже поїв.", trES: "Ya he comido." },
      { en: "Have you seen it?", trRU: "Ты это видел?", trUK: "Ти це бачив?", trES: "¿Lo has visto?" },
      { en: "We have lived here for years.", trRU: "Мы живём здесь годами.", trUK: "Ми живемо тут роками.", trES: "Llevamos años viviendo aquí." },
    ],
  },
  {
    kind: "trap",
    textRU: "Не калькируй точное прошлое вчера с he + participio во всех вариантах испанского — в ЛатАм чаче pretérito: Ayer comí.",
    textUK: "Ayer + pretérito частіше, ніж ayer + he comido, у багатьох варіантах.",
    textES: "Con ayer suele preferirse pretérito en muchas variedades americanas.",
  },
];

export const LESSON_25_INTRO_EXTRA: LessonIntroScreen[] = [
  {
    kind: "why",
    textRU: "Imperfecto даёт фон: llovía, era niño, trabajaba ahí — не завершённый кадр. Pretérito — точка: ayer cerré la puerta.",
    textUK: "Imperfecto — тло; pretérito — подія як точка.",
    textES: "Imperfecto = fondo; pretérito = punto cerrado.",
  },
  {
    kind: "how",
    textRU: "Imperfecto темы -aba/-ía: hablaba, vivía. Pretérito: hablé, viví. Cuando + imperfecto + pretérito típico: Cuando llamaste, dormía.",
    textUK: "-aba/-ía для фону; поєднання cuando + фон + перерив.",
    textES: "Contrastar -aba/-ía con pretérito; narrativas con fondo y ruptura.",
    examples: [
      { en: "It was raining.", trRU: "Шёл дождь.", trUK: "Йшов дощ.", trES: "Llovía." },
      { en: "When you called, I was sleeping.", trRU: "Когда ты позвонил, я спал.", trUK: "Коли ти подзвонив, я спав.", trES: "Cuando llamaste, dormía." },
      { en: "I closed the door.", trRU: "Я закрыл дверь.", trUK: "Я зачинив двері.", trES: "Cerré la puerta." },
    ],
  },
  {
    kind: "trap",
    textRU: "Не выбирай imperfecto только из «долгого действия», игнорируя маркер завершения: si hay ayer + acción cerrada → pretérito.",
    textUK: "Ayer зазвичай тягне pretérito, не автоматичний imperfecto.",
    textES: "Ayer + acción puntual → pretérito, no imperfecto por inercia.",
  },
];

export const LESSON_26_INTRO_EXTRA: LessonIntroScreen[] = [
  {
    kind: "why",
    textRU: "Условные Si llueve → me quedo; Si lo supiera, ayudaría связывают гипотезу и следствие по-испански с правильным набором времён.",
    textUK: "Умовні речення з si вимагають правильних часів у іспанській.",
    textES: "Condicionales con si enlazan hipótesis y consecuencia.",
  },
  {
    kind: "how",
    textRU: "Реальное: Si + presente, presente/futuro: Si llueve, no salgo / no saldré. Второй тип: Si + imperfecto de subjuntivo (o imperfecto en enseñanza básica según nivel), condicional: Si tuviera tiempo, viajaría.",
    textUK: "Реальна умова: si + presente; ірреальна — шаблон з condicional курсу.",
    textES: "Real: Si + presente, consecuencia en presente/futuro. Irreal: plantilla del nivel con condicional.",
    examples: [
      { en: "If it rains, I stay home.", trRU: "Если дождь, остаюсь дома.", trUK: "Якщо дощ, залишаюсь удома.", trES: "Si llueve, me quedo en casa." },
      { en: "If I knew, I would help.", trRU: "Если бы знал, помог бы.", trUK: "Якби знав, допоміг би.", trES: "Si lo supiera, ayudaría." },
      { en: "If you call, I come.", trRU: "Если позвонишь, приду.", trUK: "Якщо подзвониш, прийду.", trES: "Si llamas, vengo." },
    ],
  },
  {
    kind: "trap",
    textRU: "Не ставь futuro сразу после si в простой реальной конструкции: *Si lloverá* неверно — Si llueve…",
    textUK: "Після si в реальних умовах не став future одразу.",
    textES: "No pongas futuro de indicativo justo tras si en condicional real.",
  },
];

export const LESSON_27_INTRO_EXTRA: LessonIntroScreen[] = [
  {
    kind: "why",
    textRU: "Косвенная речь передаёт чужие слова без дословных кавычек: Dijo que…, Preguntó si…. Это журнальный и бытовой стандарт.",
    textUK: "Непряма мова: dijo que…, preguntó si… без лапок.",
    textES: "Estilo indirecto: dijo que…, preguntó si…",
  },
  {
    kind: "how",
    textRU: "Verbo de dicición + que + orden de frase sin inversión: Dijo que estaba cansado. Tiempos pueden retroceder según secuencia temporal.",
    textUK: "Dijo que + нормальний порядок; часи можуть зсуватися назад.",
    textES: "Verbo introductor + que + oración en orden indirecto.",
    examples: [
      { en: "He said he was tired.", trRU: "Он сказал, что устал.", trUK: "Він сказав, що втомився.", trES: "Dijo que estaba cansado." },
      { en: "She asked if I was ready.", trRU: "Она спросила, готов ли я.", trUK: "Вона запитала, чи я готовий.", trES: "Preguntó si estaba listo." },
      { en: "Tell him to wait.", trRU: "Скажи ему подождать.", trUK: "Скажи йому зачекати.", trES: "Dile que espere." },
    ],
  },
  {
    kind: "trap",
    textRU: "Не инвертируй сказуемое в придаточной как в прямом вопросе: *Preguntó si estaba yo listo* неверно — Preguntó si yo estaba listo.",
    textUK: "У підрядному після preguntó si — прямий порядок, без інверсії.",
    textES: "Tras preguntó si usa orden directo, sin invertir.",
  },
];

export const LESSON_28_INTRO_EXTRA: LessonIntroScreen[] = [
  {
    kind: "why",
    textRU: "Возвратность отражает «себя»: me levanto, te lavas, se acuesta. В русском это «-ся», но порядок местоимений в español другой.",
    textUK: "Рефлексивні дієслова: me/te/se + форма; інший порядок, ніж рос. «-ся».",
    textES: "Pronombres reflexivos me/te/se + verbo conjugado.",
  },
  {
    kind: "how",
    textRU: "Me lavo las manos / Te levantas pronto / Se sienta aquí. В повелительном приклейка me/te/se: Levántate.",
    textUK: "Місце місцевих займенників: перед дієсловом або enclíticos в імперативі.",
    textES: "Colocación clítica: delante del verbo o enclítico en imperativo.",
    examples: [
      { en: "I get up early.", trRU: "Я встаю рано.", trUK: "Я встаю рано.", trES: "Me levanto temprano." },
      { en: "She washes her hands.", trRU: "Она моет руки.", trUK: "Вона миє руки.", trES: "Se lava las manos." },
      { en: "We sat down.", trRU: "Мы сели.", trUK: "Ми сіли.", trES: "Nos sentamos." },
    ],
  },
  {
    kind: "trap",
    textRU: "Не дублируй объект при уже reflexive: *Me lavo mi cara* избыточно — Me lavo la cara.",
    textUK: "Не дублюй possessiv з reflexive тілесними конструкціями.",
    textES: "Me lavo la cara, no *mi cara* con pleonasmo.",
  },
];

export const LESSON_29_INTRO_EXTRA: LessonIntroScreen[] = [
  {
    kind: "why",
    textRU: "Привычки в прошлом — solía + inf / antes + imperfecto / antes + pretérito según nuance. Важно отделить «раньше всегда» от «один раз».",
    textUK: "Минулі звички: solía + інф. або imperfecto з маркерами.",
    textES: "Hábitos pasados: solía + infinitivo o imperfecto marcado.",
  },
  {
    kind: "how",
    textRU: "Solía estudiar por la noche. Antes vivíamos en otro barrio. No путай с presente habitual.",
    textUK: "Solía + інф.; Antes + imperfecto для тривалих звичок.",
    textES: "solía + infinitivo; antes + imperfecto para fondo habitual.",
    examples: [
      { en: "I used to swim.", trRU: "Раньше я плавал.", trUK: "Раніше я плавав.", trES: "Solía nadar." },
      { en: "We lived there before.", trRU: "Мы раньше жили там.", trUK: "Ми раніше жили там.", trES: "Antes vivíamos allí." },
      { en: "He used to smoke.", trRU: "Он раньше курил.", trUK: "Він раніше курив.", trES: "Fumaba antes." },
    ],
  },
  {
    kind: "trap",
    textRU: "Не путай soler en pretérito (*solí*) с редкими формами — на курсе держи solía + inf или imperfecto.",
    textUK: "Не ускладнюй рідкісними формами soler — використовуй безпечні шаблони.",
    textES: "En nivel intermedio prefiero solía + inf o imperfecto claro.",
  },
];

export const LESSON_30_INTRO_EXTRA: LessonIntroScreen[] = [
  {
    kind: "why",
    textRU: "Относительные предложения с que/quien/donde/cuyo позволяют говорить компактно: el chico que vino, el lugar donde nací.",
    textUK: "Відносні речення з que/quien/donde розширюють іменник.",
    textES: "Cláusulas relativas con que/quien/donde/cuyo.",
  },
  {
    kind: "how",
    textRU: "sustantivo + que + oración: La persona que llamó. donde para lugares: la ciudad donde vivo. Sin preposición colgante rusa «о котором» — выбери en el que / sobre el que при необходимости.",
    textUK: "que для речей; donde для місць; препозиційні варіанти el que керує прийменником.",
    textES: "Núcleo + que + oración; donde para sitios; preposición + el que si hace falta.",
    examples: [
      { en: "The friend who came is here.", trRU: "Друг, который пришёл, здесь.", trUK: "Друг, що прийшов, тут.", trES: "El amigo que vino está aquí." },
      { en: "The city where I was born.", trRU: "Город, где я родился.", trUK: "Місто, де я народився.", trES: "La ciudad donde nací." },
      { en: "The book that I bought.", trRU: "Книга, которую я купил.", trUK: "Книга, яку я купив.", trES: "El libro que compré." },
    ],
  },
  {
    kind: "trap",
    textRU: "Не ставь que после preposición como en inglийском which: *la mesa en que* допустимо; но watch porque vs para la cual — учи шаблон курса.",
    textUK: "Після прийменника узгоджуй el que / la que, не голе que без правила.",
    textES: "Tras preposición usa el que / la que, no *que* suelto.",
  },
];

export const LESSON_31_INTRO_EXTRA: LessonIntroScreen[] = [
  {
    kind: "why",
    textRU: "Конструкции «хочу, чтобы» (querer que) требуют субъюнктива в español — иначе фраза звучит как ошибка статуса действия.",
    textUK: "Після want/ask + що треба subjuntivo у іспанському стандарті.",
    textES: "Verbos de influencia/desiderio + que + subjuntivo.",
  },
  {
    kind: "how",
    textRU: "Quiero que vengas. Pide que baje la música. При проверке на subjuntivo спроси: действие реально или требуемое/желаемое?",
    textUK: "Quiero que + subjuntivo; Pedir que + subjuntivo.",
    textES: "Patrones: quiero que + subjuntivo; pido que + subjuntivo.",
    examples: [
      { en: "I want you to come.", trRU: "Я хочу, чтобы ты пришёл.", trUK: "Я хочу, щоб ти прийшов.", trES: "Quiero que vengas." },
      { en: "She asked me to wait.", trRU: "Она попросила подождать.", trUK: "Вона попросила зачекати.", trES: "Me pidió que esperara." },
      { en: "It's important that he knows.", trRU: "Важно, чтобы он знал.", trUK: "Важливо, щоб він знав.", trES: "Es importante que lo sepa." },
    ],
  },
  {
    kind: "trap",
    textRU: "После creer que с фактами часто indicativo; после doubt, negación emocional — субъюнктив. Не смешивай без сигнала.",
    textUK: "Creer que + indicativo про факт; інші тригери — за правилом курсу.",
    textES: "Creo que + indicativo; dudo que + subjuntivo.",
  },
];

export const LESSON_32_INTRO_EXTRA: LessonIntroScreen[] = [
  {
    kind: "why",
    textRU: "Финальный урок сводит pretérito/imperfecto, modales, relativas y subjuntivo donde уместно — проверяешь, как стройки уживаются в одной реплике.",
    textUK: "Фінальний огляд: поєднай часи, modales й subjuntivo де треба.",
    textES: "Repaso: mezcla de tiempos, modales y subjuntivo en contextos reales.",
  },
  {
    kind: "how",
    textRU: "Сначала пойми смысл: факт, фон, желание, косвенная речь. Подбери tiempo и modo: indicativo vs subjuntivo; pretérito vs imperfecto; ser vs estar; hay vs está.",
    textUK: "Спочатку смисл — потім час і modo.",
    textES: "Primero el sentido; luego tiempo y modo.",
    examples: [
      { en: "When you arrived, I was studying.", trRU: "Когда ты приехал, я учился.", trUK: "Коли ти приїхав, я вчився.", trES: "Cuando llegaste, estaba estudiando." },
      { en: "If it rains, we cancel.", trRU: "Если дождь — отменяем.", trUK: "Якщо дощ — скасовуємо.", trES: "Si llueve, cancelamos." },
      { en: "He wants you to call.", trRU: "Он хочет, чтобы ты позвонил.", trUK: "Він хоче, щоб ти подзвонив.", trES: "Quiere que llames." },
    ],
  },
  {
    kind: "trap",
    textRU: "Не выбирай время по «похоже на английский» — сверяйся с маркерами español: ayer, cuando + pretérito, si + presente и т.д.",
    textUK: "Не обирай час «як в англійському» — маркери іспанської мають пріоритет.",
    textES: "No elijas el tiempo solo porque «así es en inglés»; mira marcadores españoles.",
  },
];

