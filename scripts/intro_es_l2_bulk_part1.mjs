/** Lessons 3–17 intro blocks (Spanish L2). Merged in intro_es_l2_bulk.mjs */

export const INTROS_3_17 = {
  3: [
    {
      kind: 'why',
      textRU:
        'О настоящих привычках и фактах по-испански говорят прежде всего формами настоящего времени: «работаю», «живу здесь», «учу испанский». Это то, чем ты заполняешь 80% бытовых диалогов.',
      textUK:
        'Про поточні звички й факти іспанською насамперед через теперішній час: «працюю», «живу тут», «вивчаю іспанську». Це основа побутової розмови.',
      textES:
        'Los hábitos y hechos cotidianos van en presente: trabajo aquí, estudio español. Es la forma más usada en la vida diaria.',
    },
    {
      kind: 'how',
      textRU:
        'Для регулярных глаголов: тема + окончание по типу (-ar: hablo/hablas; -er: como/comes; -ir: vivo/vives). Местоимение можно опустить, если ясно, о ком речь: Hablo español.',
      textUK:
        'У регулярних моделях: основа + закінчення (-ar: hablo/hablas; -er: como/comes; -ir: vivo/vives). Займенник часто опускають, якщо зрозуміло: Hablo español.',
      textES:
        'Verbos regulares: raíz + desinencia (-ar: hablo; -er: como; -ir: vivo). El pronombre suele omitirse si el verbo lo deja claro.',
      examples: [
        { en: 'I speak Spanish.', trRU: 'Я говорю по-испански.', trUK: 'Я говорю іспанською.', trES: 'Hablo español.' },
        { en: 'You eat here.', trRU: 'Ты ешь здесь.', trUK: 'Ти їси тут.', trES: 'Comes aquí.' },
        { en: 'We live in Madrid.', trRU: 'Мы живём в Мадриде.', trUK: 'Ми живемо в Мадриді.', trES: 'Vivimos en Madrid.' },
      ],
    },
    {
      kind: 'trap',
      textRU:
        'Не переноси русский порядок «я очень люблю» дословно как *Yo mucho amo*: усилители типа mucho/muy ставятся по правилам испанской порядковости (часто muy antes del adjetivo; mucho con verbo de acción). На старте держи modelo simple: Me gusta mucho.',
      textUK:
        'Не калькуй порядок слів російської/української з усилителями: *Yo mucho amo* не звучить. Вчи простий каркас: Me gusta mucho.',
      textES:
        'Evita calcos del orden eslavo con cuantificadores: no construyas *Yo mucho amo*. Prefiere patrones naturales como Me gusta mucho.',
    },
  ],
  4: [
    {
      kind: 'why',
      textRU:
        'Отказ и контраст строятся через no + глагол: спокойно сказать «не знаю», «не работаю здесь», «не понимаю». Это вежливее безличной блокировки на языке жестов.',
      textUK:
        'Відмова й контраст — через no + дієслово: «не знаю», «не працюю тут». Так ти звучиш доросло й ясно.',
      textES:
        'Negar con claridad: no + verbo conjugado (no sé, no trabajo aquí). Marca límites sin gritar.',
    },
    {
      kind: 'how',
      textRU:
        'No всегда примыкает к спрягаемой форме: No hablo / No como / No vivo. Остальная группа слов идёт как в утверждении: No hablo español aquí.',
      textUK:
        'No стоїть безпосередньо перед формою дієслова: No hablo / No como. Решта порядку як у ствердженні.',
      textES:
        'No va pegado al verbo flexionado; el resto mantiene el orden afirmativo.',
      examples: [
        { en: 'I don\'t understand.', trRU: 'Я не понимаю.', trUK: 'Я не розумію.', trES: 'No entiendo.' },
        { en: 'We don\'t live here.', trRU: 'Мы не живём здесь.', trUK: 'Ми не живемо тут.', trES: 'No vivimos aquí.' },
        { en: 'They don\'t work today.', trRU: 'Они сегодня не работают.', trUK: 'Вони сьогодні не працюють.', trES: 'No trabajan hoy.' },
      ],
    },
    {
      kind: 'trap',
      textRU:
        'Не раздувай цепочку отрицаний как в разговорном русском «ничего не знаю» калькой *No sé nada* допустимо в испанском, но не смешивай no + nunca + nadie без нужды — одна отрицательная полярность на слот. На начальном этапе: одно no на глагол либо nadie/nada в именной части.',
      textUK:
        'Не насипай зайвих заперечень одразу: одне логічне негатування на речення спрощує мовлення.',
      textES:
        'No acumules negativos innecesarios; una polaridad clara suena más natural al principio.',
    },
  ],
  5: [
    {
      kind: 'why',
      textRU:
        'Без вопросов да/нет ты не проверяешь факты: «Ты живёшь здесь?», «У вас есть время?». Испанец ждёт инверсию или чёткую интонацию — иначе фраза звучит как утверждение.',
      textUK:
        'Питання так/ні перевіряють факти: «ти живеш тут?». У SP очікують інверсію або підняття тону.',
      textES:
        'Las preguntas de sí/no confirman datos: ¿Vives aquí? Sin entonación o sin orden interrogativo suena afirmación.',
    },
    {
      kind: 'how',
      textRU:
        'Два рабочих пути: ¿ + та же порядок что в утверждении + ? с повышением тона (разговорная Испания и ЛатАм), или инверсия sujeto-verbo: ¿Hablas español? / ¿Tú hablas español? На письме всегда ¿ … ?.',
      textUK:
        'Або інтонація на тій самій послідовності, або інверсія підмет-присудок; у тексті — ¿ … ?.',
      textES:
        'Orden de palabras igual que en afirmación + entonación, o inversión sujeto-verbo; escribe ¿ … ?.',
      examples: [
        { en: 'Do you speak Spanish?', trRU: 'Ты говоришь по-испански?', trUK: 'Ти говориш іспанською?', trES: '¿Hablas español?' },
        { en: 'Are they at home?', trRU: 'Они дома?', trUK: 'Вони вдома?', trES: '¿Están en casa?' },
        { en: 'Does he work here?', trRU: 'Он здесь работает?', trUK: 'Він тут працює?', trES: '¿Él trabaja aquí?' },
      ],
    },
    {
      kind: 'trap',
      textRU:
        'Не калькируй английское вспомогательное do/does: в испанском спрягается один главный глагол. Неверно *¿Do tú hablas?* — только ¿Hablas (tú)?.',
      textUK:
        'Не перенось англійський do/does: іспанською лише одне спряжене дієслово в питанні.',
      textES:
        'No importes do/does del inglés: basta un verbo flexionado en la pregunta.',
    },
  ],
  6: [
    {
      kind: 'why',
      textRU:
        'Открытые ответы начинаются с qué, quién, dónde, cuándo, cómo, por qué, cuánto. Так ты получаешь не «да/нет», а конкретику: время встречи, адрес, причину.',
      textUK:
        'Відкриті відповіді — з qué, quién, dónde, cuándo, cómo, por qué, cuánto: це конкретика, не просто так/ні.',
      textES:
        'Los interrogativos abren la información: qué, quién, dónde, cuándo, cómo, por qué, cuánto.',
    },
    {
      kind: 'how',
      textRU:
        'Вопросительное слово почти всегда первое: ¿Dónde vives? ¿Por qué estudias español? После por qué два слова и ударение на qué в отличие от porque «потому что» (слитно).',
      textUK:
        'Питальне слово зазвичай на початку: ¿Dónde vives? Розрізняй por qué (питання) і porque (причина).',
      textES:
        'Palabra interrogativa al inicio: ¿Dónde vives? Ojo: por qué ≠ porque.',
      examples: [
        { en: 'Where do you live?', trRU: 'Где ты живёшь?', trUK: 'Де ти живеш?', trES: '¿Dónde vives?' },
        { en: 'Why are you studying?', trRU: 'Почему ты учишься?', trUK: 'Чому ти вчишся?', trES: '¿Por qué estudias?' },
        { en: 'How much does it cost?', trRU: 'Сколько это стоит?', trUK: 'Скільки це коштує?', trES: '¿Cuánto cuesta?' },
      ],
    },
    {
      kind: 'trap',
      textRU:
        'Не пиши *¿Qué es tu nombre?* — так испанский почти не спрашивают имя; норма ¿Cómo te llamas? / ¿Cuál es tu nombre?. Калька с английского what is your name здесь ложная.',
      textUK:
        'Ім\'я питають ¿Cómo te llamas?, а не кальку з англійського what is your name.',
      textES:
        'Para el nombre usa ¿Cómo te llamas?; «¿Qué es tu nombre?» suena extraño.',
    },
  ],
  7: [
    {
      kind: 'why',
      textRU:
        'Иметь / обладать по-испански чаще через tener; «есть что-то» в мире — через hay. Иначе ты перепутаешь *tengo tiempo* и *hay tiempo*, «у меня холод» и «на улице холодно».',
      textUK:
        'Володіння — tener; наявність у світі — hay. Це різні конструкції, як і в español meta.',
      textES:
        'Posesión / experiencia con tener; existencia general con hay (Hay tiempo vs Tengo tiempo).',
    },
    {
      kind: 'how',
      textRU:
        'Tengo / tienes / tiene + объект: Tengo hermana. Для болезней и состояний часто Me duele la cabeza (не калькируй I have headache буквально без modelo). Hay + sustantivo: Hay pan.',
      textUK:
        'tengo / tienes + об\'єкт. Hay + іменник для «є щось».',
      textES:
        'Conjugaciones de tener según persona; hay para «existe».',
      examples: [
        { en: 'I have two sisters.', trRU: 'У меня две сестры.', trUK: 'У мене дві сестри.', trES: 'Tengo dos hermanas.' },
        { en: 'She has time.', trRU: 'У неё есть время.', trUK: 'У неї є час.', trES: 'Ella tiene tiempo.' },
        { en: 'There is bread.', trRU: 'Есть хлеб.', trUK: 'Є хліб.', trES: 'Hay pan.' },
      ],
    },
    {
      kind: 'trap',
      textRU:
        '«Мне нравится» не строится как русское «я люблю это» глаголом gustar одним в один в один: Me gusta el café — структура с дативом me. Не *Yo gusto el café* для «мне нравится».',
      textUK:
        'Конструкція gustar: Me gusta…; не кажи *Yo gusto…* у значенні «мені подобається».',
      textES:
        'Me gusta(n)… no equivale a *Yo gusto…* para «me gusta».',
    },
  ],
  8: [
    {
      kind: 'why',
      textRU:
        'Чтобы назначить встречу и рассказать расписание, нужны en / el / los / a las / por la mañana. Ошибка в предлоге времени сразу выдаёт иностранца.',
      textUK:
        'Для зустрічей і розкладу потрібні en / el / los / a las / por la mañana.',
      textES:
        'Para citas y rutinas: en / el / los / a las / por la mañana.',
    },
    {
      kind: 'how',
      textRU:
        'Дни недели часто с артикулём: el lunes. Месяцы и сезоны — en enero, en verano. Конкретный час — a las tres. Части дня — por la mañana / tarde / noche.',
      textUK:
        'Дні тижня з el: el lunes; місяці — en + назва; години — a las + число.',
      textES:
        'el + día de la semana; en + mes/estación; a las + hora; por la tarde…',
      examples: [
        { en: 'On Monday I work.', trRU: 'В понедельник я работаю.', trUK: 'У понеділок я працюю.', trES: 'El lunes trabajo.' },
        { en: 'At three o\'clock.', trRU: 'В три часа.', trUK: 'О третій.', trES: 'A las tres.' },
        { en: 'In May.', trRU: 'В мае.', trUK: 'У травні.', trES: 'En mayo.' },
      ],
    },
    {
      kind: 'trap',
      textRU:
        'Не русифицируй порядок «в понедельник утром» как *en lunes mañana*: используй две опоры — El lunes por la mañana.',
      textUK:
        'Не зливаєш день і частину дня без моделі: El lunes por la mañana.',
      textES:
        'Combina día + parte del día con preposiciones claras: El lunes por la mañana.',
    },
  ],
  9: [
    {
      kind: 'why',
      textRU:
        'Hay отвечает «есть ли что-то вообще», estar/located отвечает «где конкретный объект». Без этого различия ты скажешь неловко про наличие людей и вещей.',
      textUK:
        'Hay — про існування; estar — про розташування конкретики.',
      textES:
        'Hay = existencia; estar = ubicación de algo conocido.',
    },
    {
      kind: 'how',
      textRU:
        'Hay + sustantivo: Hay un problema. Для локации объекта La llave está en la mesa. Вопросы ¿Hay…? vs ¿Dónde está…?.',
      textUK:
        'Hay + іменник; для «де річ» — ¿Dónde está…?.',
      textES:
        '¿Hay café? vs ¿Dónde está el café?',
      examples: [
        { en: 'There is a problem.', trRU: 'Есть проблема.', trUK: 'Є проблема.', trES: 'Hay un problema.' },
        { en: 'The keys are on the table.', trRU: 'Ключи на столе.', trUK: 'Ключі на столі.', trES: 'Las llaves están en la mesa.' },
        { en: 'Is there milk?', trRU: 'Есть молоко?', trUK: 'Є молоко?', trES: '¿Hay leche?' },
      ],
    },
    {
      kind: 'trap',
      textRU:
        'Не отождествляй hay и está как синонимы в любых контекстах: Hay dos coches (факт наличия) ≠ Los coches están en la calle (где они).',
      textUK:
        'Hay два автомобілі ≠ Вони стоять на вулиці — різні конструкції.',
      textES:
        'Hay dos coches ≠ Los coches están en la calle.',
    },
  ],
  10: [
    {
      kind: 'why',
      textRU:
        'Способности и долженствование по-испански передают poder, deber, querer + инфинитив без частицы «to»: puedo ayudarte, debo irme.',
      textUK:
        'Здатність і необхідність — poder / deber / querer + інфінітив без to.',
      textES:
        'Modalidad básica: poder, deber, querer + infinitivo.',
    },
    {
      kind: 'how',
      textRU:
        'Модальный глагол спрягается, второй идёт в инфинитиве: Puedo hablar / Debes estudiar / Quiero comer. Отрицание перед модальным: No puedo venir.',
      textUK:
        'Спрягається модальне, друге — інфінітив; заперечення перед модальним.',
      textES:
        'Verbo modal conjugado + infinitivo; negación delante del modal.',
      examples: [
        { en: 'I can help you.', trRU: 'Я могу тебе помочь.', trUK: 'Я можу тобі допомогти.', trES: 'Puedo ayudarte.' },
        { en: 'You should rest.', trRU: 'Тебе следует отдохнуть.', trUK: 'Тобі варто відпочити.', trES: 'Debes descansar.' },
        { en: 'I want to leave.', trRU: 'Я хочу уйти.', trUK: 'Я хочу піти.', trES: 'Quiero irme.' },
      ],
    },
    {
      kind: 'trap',
      textRU:
        'Не вставляй «a» перед голым инфинитивом после модальных как во французском: *puedo a hablar* неверно — Puedo hablar.',
      textUK:
        'Без зайвої a перед інфінітивом після poder/deber/querer.',
      textES:
        'No insertes a antes del infinitivo tras poder/deber/querer.',
    },
  ],
  11: [
    {
      kind: 'why',
      textRU:
        'Прошедшее завершённое действие — pretérito indefinido: ayer hablé, el año pasado viví allí. Без него ты не расскажешь историю «что случилось».',
      textUK:
        'Завершена подія в минулому — pretérito: ayer hablé.',
      textES:
        'Hechos cerrados en el pasado: pretérito indefinido.',
    },
    {
      kind: 'how',
      textRU:
        'Регулярные темы: -ar → -é/-aste; -er/-ir → -í/-iste: hablé/hablaste, comí/comiste. Маркеры: ayer, la semana pasada, en 2020.',
      textUK:
        'Регулярні закінчення -é/-aste або -í/-iste; маркери минулого часу.',
      textES:
        'Desinencias regulares; marcadores temporales claros.',
      examples: [
        { en: 'I worked yesterday.', trRU: 'Я работал вчера.', trUK: 'Я працював учора.', trES: 'Trabajé ayer.' },
        { en: 'You arrived late.', trRU: 'Ты опоздал.', trUK: 'Ти запізнився.', trES: 'Llegaste tarde.' },
        { en: 'We studied a lot.', trRU: 'Мы много учились.', trUK: 'Ми багато вчилися.', trES: 'Estudiamos mucho.' },
      ],
    },
    {
      kind: 'trap',
      textRU:
        'Не смешивай русское совершенное/несовершенное без маркеров: если есть точка во времени (ayer), это обычно pretérito, не imperfecto.',
      textUK:
        'Якщо є точний маркер (ayer), це зазвичай pretérito, не imperfecto.',
      textES:
        'Con tiempo puntual (ayer) suele ir pretérito, no imperfecto.',
    },
  ],
  12: [
    {
      kind: 'why',
      textRU:
        'Частые irregularidades ломят кальку «просто добавь окончание»: ir/saber/venir/hacer/estar имеют свои корни. Их нужно выучить пакетом — без них Past звучит ломано.',
      textUK:
        'Неправильні минули форми треба заучувати блоками: ir, hacer, estar…',
      textES:
        'Los pretéritos irregulares son memorización guiada por uso.',
    },
    {
      kind: 'how',
      textRU:
        'Примеры якорей: fui (ir/ser context!), hice (hacer), estuve (estar), tuve (tener), vine (venir). Смотри субъект и перевод смысла.',
      textUK:
        'Якорі: fui, hice, estuve, tuve, vine — перевіряй значення з контекстом.',
      textES:
        'Anclas frecuentes: fui, hice, estuve, tuve, vine.',
      examples: [
        { en: 'I went home.', trRU: 'Я пошёл домой.', trUK: 'Я пішов додому.', trES: 'Fui a casa.' },
        { en: 'She did it.', trRU: 'Она это сделала.', trUK: 'Вона це зробила.', trES: 'Ella lo hizo.' },
        { en: 'We were there.', trRU: 'Мы были там.', trUK: 'Ми були там.', trES: 'Estuvimos allí.' },
      ],
    },
    {
      kind: 'trap',
      textRU:
        'Fui совпадает для ir и ser в pretérito — смысл только из контекста: Fui médico (был врачом) vs Fui al médico (ходил к врачу).',
      textUK:
        'Fui може бути ir або ser — лише контекст.',
      textES:
        'Fui admite dos lecturas (ir/ser); el contexto decide.',
    },
  ],
  13: [
    {
      kind: 'why',
      textRU:
        'Будущие планы по-испански чаще через ir a + infinitivo или простое будущее tiempo verbal: Voy a llamarte / Llamaré. Выбирай регистр разговора.',
      textUK:
        'Плани: ir a + інфінітив або майбутній час: Voy a llamarte.',
      textES:
        'Futuro próximo (ir a + infinitivo) vs futuro simple según registro.',
    },
    {
      kind: 'how',
      textRU:
        'Voy/vas/va + a + verbo: Voy a estudiar. Futuro simple на Whole infinitivo + desinencias futuras: hablaré. Will английского не калькируй словом futuro отдельным.',
      textUK:
        'Voy a estudiar або hablaré — без кальки англійського will окремим словом.',
      textES:
        'Patrones: ir a + infinitivo; futuro morphológico en -ré, -rás…',
      examples: [
        { en: 'I\'m going to call you.', trRU: 'Я собираюсь тебе позвонить.', trUK: 'Я збираюся тобі подзвонити.', trES: 'Voy a llamarte.' },
        { en: 'She will travel.', trRU: 'Она поедет.', trUK: 'Вона поїде.', trES: 'Ella viajará.' },
        { en: 'We\'ll see.', trRU: 'Посмотрим.', trUK: 'Побачимо.', trES: 'Ya veremos.' },
      ],
    },
    {
      kind: 'trap',
      textRU:
        'Не ставь предлог de перед infinitivo после ir a: *voy de comer* → Voy a comer.',
      textUK:
        'Після ir — a + інфінітив, не de.',
      textES:
        'Voy a comer, no *voy de comer*.',
    },
  ],
  14: [
    {
      kind: 'why',
      textRU:
        'Сравнения описывают опыт: más rápido, menos caro, tan alto como. Это нужно в шопинге, транспорте, учёбе.',
      textUK:
        'Порівняння: más / menos / tan … como — у побуті постійно.',
      textES:
        'Comparar con más / menos / tan … como es indispensable.',
    },
    {
      kind: 'how',
      textRU:
        'más + adjetivo + que; menos + adj + que; tan + adj + como: más alto que, tan caro como. Независимые формы bueno/mejor, malo/peor.',
      textUK:
        'más … que; menos … que; tan … como; mejor/peor — особливі форми.',
      textES:
        'Estructuras más/menos/tan … como; irregulares mejor/peor.',
      examples: [
        { en: 'He is taller than me.', trRU: 'Он выше меня.', trUK: 'Він вищий за мене.', trES: 'Él es más alto que yo.' },
        { en: 'This is less expensive.', trRU: 'Это дешевле.', trUK: 'Це дешевше.', trES: 'Esto es menos caro.' },
        { en: 'She is as busy as you.', trRU: 'Она так же занята, как ты.', trUK: 'Вона так само зайнята, як ти.', trES: 'Ella está tan ocupada como tú.' },
      ],
    },
    {
      kind: 'trap',
      textRU:
        'Не путай que и como после tan: *tan alto que tú* для сравнения неверно — tan alto como tú.',
      textUK:
        'Після tan використовуй como, не que.',
      textES:
        'tan … como, no *tan … que* para igualdad.',
    },
  ],
  15: [
    {
      kind: 'why',
      textRU:
        'Мои/твои вещи передаются через mi/mis, tu/tus, su/sus — и они согласуются с родом и числом существительного, не с «владельцем» как в русском его/её.',
      textUK:
        'Mi/mis, tu/tus, su/sus узгоджуються з іменником, не з «носієм».',
      textES:
        'Los posesivos concuerdan con el nombre poseído, no con el poseedor.',
    },
    {
      kind: 'how',
      textRU:
        'Mi libro / mis libros; tu casa / tus cosas; su teléfono может быть «его/её/их» — ясность из контекста или de él/de ella.',
      textUK:
        'Mi/mis + іменник; su двозначний — уточнюй контекстом.',
      textES:
        'mi/mis + sustantivo; su puede ambiguar → de él/de ellos.',
      examples: [
        { en: 'My phone.', trRU: 'Мой телефон.', trUK: 'Мій телефон.', trES: 'Mi teléfono.' },
        { en: 'Your friends.', trRU: 'Твои друзья.', trUK: 'Твої друзі.', trES: 'Tus amigos.' },
        { en: 'Their house.', trRU: 'Их дом.', trUK: 'Їхній дім.', trES: 'Su casa.' },
      ],
    },
    {
      kind: 'trap',
      textRU:
        'Не добавляй артикль между possessivo и существительным как во французском: *el mi libro* неверно — mi libro.',
      textUK:
        'Без артикля між possessivo та іменником: mi libro.',
      textES:
        'mi libro, no *el mi libro*.',
    },
  ],
  16: [
    {
      kind: 'why',
      textRU:
        'Устойчивые глагольные обороты по-испански часто перифразируются: dar un paseo, echar una siesta, hacer cola — не всегда один глагол как в английском phrasal.',
      textUK:
        'Ідіоми руху й побуту часто фразові перифрази, не дослівний один глагол.',
      textES:
        'Las perífrasis cotidianas suelen ser colocaciones fijas.',
    },
    {
      kind: 'how',
      textRU:
        'Учи блоками: hacer caso (слушаться), llevarse bien (ладить), volver a + inf (снова), dejar de + inf (перестать). Это не «перевод по словам», а чанки.',
      textUK:
        'Вчи блоками: hacer caso, volver a + інф., dejar de + інф.',
      textES:
        'Memoriza chunks: hacer caso, volver a + inf., dejar de + inf.',
      examples: [
        { en: 'Take a walk.', trRU: 'Прогуляться.', trUK: 'Прогулятися.', trES: 'Dar un paseo.' },
        { en: 'Take a nap.', trRU: 'Вздремнуть.', trUK: 'Подрімати.', trES: 'Echar una siesta.' },
        { en: 'Wait in line.', trRU: 'Стоять в очереди.', trUK: 'Стояти в черзі.', trES: 'Hacer cola.' },
      ],
    },
    {
      kind: 'trap',
      textRU:
        'Не калькируй английский phrasal буквально: «встретиться случайно» — encontrarse con alguien, не *toparse* без регистра во всех регионах.',
      textUK:
        'Не перекладай phrasal verbs англійські слово в слово.',
      textES:
        'Evita traducción palabra por palabra del phrasal inglés.',
    },
  ],
  17: [
    {
      kind: 'why',
      textRU:
        'Происходящее прямо сейчас по-испански чаще estar + gerundio: Estoy trabajando. Это не копия английского списка «статических» глаголов на 100%, но основа та же.',
      textUK:
        'Дія «прямо зараз» — estar + gerundio.',
      textES:
        'Progresivo actual: estar + gerundio.',
    },
    {
      kind: 'how',
      textRU:
        'Estar conjugado + gerundio en -ando/-iendo: estoy hablando, está comiendo. Используй для временного процесса; для будущего рядом часто ya / ahora.',
      textUK:
        'estar + -ando/-iendo для тимчасового процесу.',
      textES:
        'estar + gerundio (-ando / -iendo).',
      examples: [
        { en: 'I am working.', trRU: 'Я работаю (сейчас).', trUK: 'Я працюю (зараз).', trES: 'Estoy trabajando.' },
        { en: 'She is eating.', trRU: 'Она ест.', trUK: 'Вона їсть.', trES: 'Ella está comiendo.' },
        { en: 'We are waiting.', trRU: 'Мы ждём.', trUK: 'Ми чекаємо.', trES: 'Estamos esperando.' },
      ],
    },
    {
      kind: 'trap',
      textRU:
        'Не распространяй английский запрет на все «verbs of state» без проверки: в español иногда estar + gerundio возможно для усиления процесса в разговоре — но на уроке держи безопасный минимум: избегай estar queriendo / estar sabiendo для простых случаев.',
      textUK:
        'Обмеження типу англійських stative verbs не автоматичні для español; на базовому рівні уникай неконтрольованих поєднань.',
      textES:
        'Los verbos de estado no se calculan igual que en inglés; en nivel básico evita combinaciones raras.',
    },
  ],
};
