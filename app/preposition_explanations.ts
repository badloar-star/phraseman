import { PREPOSITION_OVERRIDES } from './preposition_overrides';

export type PrepositionExplanationLevel = 'specific' | 'context' | 'generic' | 'fallback';

type Explanation = {
  ru: string;
  uk: string;
  es: string;
  level?: PrepositionExplanationLevel;
};

type Rule = {
  preposition: string;
  matches: RegExp[];
  explain: Explanation;
};

function normalizeSentence(sentence: string): string {
  return ` ${sentence.toLowerCase().replace(/[_-]+/g, ' ').replace(/[.,!?;:()"]/g, ' ')} `.replace(/\s+/g, ' ');
}

function makeOverrideKey(sentence: string, preposition: string): string {
  const cleaned = sentence
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
  return `${cleaned}::${preposition}`;
}

function wordsOf(sentence: string): string[] {
  return normalizeSentence(sentence).trim().split(/\s+/).filter(Boolean);
}

function wordsAfter(sentence: string, preposition: string, count = 3): string {
  const words = wordsOf(sentence);
  const idx = words.indexOf(preposition);
  if (idx < 0) return '';
  return words.slice(idx + 1, idx + 1 + count).join(' ');
}

function phraseAfter(sentence: string, preposition: string): string {
  const phrase = wordsAfter(sentence, preposition, 3);
  return phrase ? `${preposition} ${phrase}` : preposition;
}

function chunkUntil(sentence: string, preposition: string, stopWords: RegExp, maxAfter = 4): string {
  const words = normalizeSentence(sentence).trim().split(/\s+/).filter(Boolean);
  const idx = words.indexOf(preposition);
  if (idx < 0) return preposition;
  const tail: string[] = [];
  for (let i = idx + 1; i < words.length && tail.length < maxAfter; i++) {
    tail.push(words[i]);
    if (stopWords.test(words[i])) break;
  }
  return tail.length ? `${preposition} ${tail.join(' ')}` : preposition;
}

const phraseRules: Rule[] = [
  {
    preposition: 'on',
    matches: [/\bon (my|your|his|her|our|their|the) way\b/],
    explain: {
      ru: 'Сочетание "on + my/your/our/the + way" - устойчивое выражение: быть в пути, идти или ехать куда-то. Поэтому со словом "way" нужен именно "on".',
      uk: 'Сполучення "on + my/your/our/the + way" - сталий вираз: бути в дорозі, іти або їхати кудись. Тому зі словом "way" потрібен саме "on".',
      es: '«On my/your/our/the way» es una locución fija: ir de camino o estar yendo a algún lugar. Por eso con «way» corresponde «on», no otros prepositivos.',
    },
  },
  {
    preposition: 'at',
    matches: [/\bat home\b/],
    explain: {
      ru: '"At home" - фиксированное сочетание для значения "дома". Для такого места-точки используем "at", а не "in" или "on".',
      uk: '"At home" - фіксоване сполучення зі значенням "удома". Для такої точки-місця використовуємо "at", а не "in" чи "on".',
      es: '«At home» es una combinación establecida («en casa»). Para ese punto‑lugar suele irse «at», no «in» ni «on».',
    },
  },
  {
    preposition: 'at',
    matches: [/\bat (work|school|university|the office|the airport|the station|the door|the desk|the table|the counter)\b/],
    explain: {
      ru: '"At" показывает конкретную точку или место действия: at work, at school, at the door. Здесь важно не "внутри", а где происходит действие.',
      uk: '"At" показує конкретну точку або місце дії: at work, at school, at the door. Тут важливо не "всередині", а де відбувається дія.',
      es: '«At» marca un punto de referencia donde ocurre algo: «at work», «at school», «at the door». Prioriza «dónde» se sitúa la acción, no «estar dentro como volumen cerrado».',
    },
  },
  {
    preposition: 'on',
    matches: [/\bon time\b/],
    explain: {
      ru: '"On time" значит "вовремя", без опоздания. Это устойчивое сочетание, поэтому выбираем "on".',
      uk: '"On time" означає "вчасно", без запізнення. Це сталий вираз, тому обираємо "on".',
      es: '«On time» equivale a «a tiempo» o «punto»: sin retrasos. Es colocación fija; lleva «on», no otros prepositivos temporales aquí.',
    },
  },
  {
    preposition: 'in',
    matches: [/\bin time\b/],
    explain: {
      ru: '"In time" значит "успеть до нужного момента". Здесь "in" подчёркивает запас времени перед событием.',
      uk: '"In time" означає "встигнути до потрібного моменту". Тут "in" підкреслює запас часу перед подією.',
      es: '«In time» indica llegar antes de que pase algo o con margen suficiente. «In» resalta el intervalo antes del momento límite, no la puntualidad de «on time».',
    },
  },
  {
    preposition: 'in',
    matches: [/\bin (the )?(morning|afternoon|evening)\b/],
    explain: {
      ru: 'С частями дня обычно используем "in": in the morning, in the afternoon, in the evening. Это период времени, а не точный момент.',
      uk: 'З частинами дня зазвичай використовуємо "in": in the morning, in the afternoon, in the evening. Це період часу, а не точний момент.',
      es: 'Con partes generales del día se usa «in»: «in the morning», «in the afternoon». Es marco temporal amplio, no un instante concreto (distinto de «at six»).',
    },
  },
  {
    preposition: 'at',
    matches: [/\bat (night|noon|midnight|the moment|the same time)\b/],
    explain: {
      ru: 'С точками времени используем "at": at night, at noon, at the moment. Предлог показывает конкретный момент или короткую точку на шкале времени.',
      uk: 'З точками часу використовуємо "at": at night, at noon, at the moment. Прийменник показує конкретний момент або коротку точку на часовій шкалі.',
      es: 'Con momentos‑punta del día (o equivalentes muy acotados) va «at»: «at night», «at noon», «at the moment». Presenta tiempo como instante, no como franja abierta.',
    },
  },
  {
    preposition: 'on',
    matches: [/\bon (vacation|holiday|holidays|leave|sabbatical)\b/],
    explain: {
      ru: '"On vacation / on holiday" - устойчивое выражение: "в отпуске, на каникулах". Перед словом vacation или holiday в этом значении всегда стоит "on".',
      uk: '"On vacation / on holiday" - сталий вираз: "у відпустці, на канікулах". Перед словом vacation або holiday в цьому значенні завжди стоїть "on".',
      es: '«On vacation» / «on holiday» equivalen a «de vacaciones» / «en período festivo‑descanso». En este sentido, «vacation» / «holiday» combinan siempre con «on».',
    },
  },
  {
    preposition: 'on',
    matches: [/\bon (christmas|easter|new year|new year's eve|halloween|thanksgiving|birthday|birthdays|anniversary)\b/],
    explain: {
      ru: 'С праздниками и значимыми датами говорим "on": on Christmas, on Easter, on my birthday. "On" помещает действие внутрь конкретного события.',
      uk: 'Зі святами та важливими датами кажемо "on": on Christmas, on Easter, on my birthday. "On" розміщує дію всередині конкретної події.',
      es: 'Con festivos o fechas concretas («on Christmas», «on my birthday») se usa «on»: la escena está anclada dentro de ese día‑evento en el calendario.',
    },
  },
  {
    preposition: 'on',
    matches: [/\bon (monday|tuesday|wednesday|thursday|friday|saturday|sunday|weekends?|the weekend|[a-z]+day)\b/],
    explain: {
      ru: 'С днями недели и датами всегда ставим "on": on Monday, on Friday, on the weekend. Это правило для конкретного дня, в который что-то происходит.',
      uk: 'З днями тижня та датами завжди ставимо "on": on Monday, on Friday, on the weekend. Це правило для конкретного дня, у який щось відбувається.',
      es: 'Días de la semana y menciones tipo «weekend» llevan «on» («on Monday», «on the weekend»): el hito temporal es ese día nominado.',
    },
  },
  {
    preposition: 'by',
    matches: [/\bby (car|bus|train|plane|taxi|bike|bicycle|metro|subway|email|phone)\b/],
    explain: {
      ru: '"By" используется для способа или транспорта: by car, by bus, by email. Здесь предлог отвечает на вопрос "каким способом?".',
      uk: '"By" використовується для способу або транспорту: by car, by bus, by email. Тут прийменник відповідає на питання "яким способом?".',
      es: '«By» marca medio o medio de transporte: «by car», «by train», «by email». Equivale a responder «¿cómo?» o «¿con qué?» ante el medio empleado.',
    },
  },
  {
    preposition: 'for',
    matches: [/\b(famous|known|good|bad|responsible|sorry|grateful|ready|thankful|late|important|necessary|useful)\s+for\b/],
    explain: {
      ru: '"Famous / known / responsible / sorry + for" - устойчивое сочетание прилагательного с "for". Например: famous for art = известный благодаря искусству.',
      uk: '"Famous / known / responsible / sorry + for" - стале сполучення прикметника з "for". Наприклад: famous for art = відомий завдяки мистецтву.',
      es: 'Muchos adjetivos forman pareja estable con «for» («famous for», «sorry for»). Describe la razón o el ámbito: «famosa por sus museos», etc.',
    },
  },
  {
    preposition: 'for',
    matches: [/\b(ask|asks|asked|asking|wait|waits|waited|waiting|look|looks|looked|looking|search|searches|searched|searching|hope|hopes|hoped|hoping)\b.*\bfor\b/],
    explain: {
      ru: '"For" нужен после глаголов ask/wait/look/hope: они требуют именно "for" для указания того, чего просят, ждут или ищут.',
      uk: '"For" потрібен після дієслів ask/wait/look/hope: вони вимагають саме "for" для вказівки того, чого просять, чекають або шукають.',
      es: 'Tras «ask», «wait», «look for», «hope for» aparece siempre «for» para orientar «qué se pide», «por qué se espera», «qué se busca».',
    },
  },
  {
    preposition: 'for',
    matches: [/\bfor (some |any |that |this |the |no )?reason\b/],
    explain: {
      ru: '"For some reason / for a reason" - устойчивое выражение: показывает причину или повод. Здесь "for" обозначает "по какой-то причине".',
      uk: '"For some reason / for a reason" - сталий вираз: показує причину або привід. Тут "for" означає "з якоїсь причини".',
      es: '«For some reason», «for a reason» equivalen a «por alguna razón», «por un motivo». «For» encadena la idea causal de forma estable.',
    },
  },
  {
    preposition: 'for',
    matches: [/\b(time|chance|need|reason|excuse|space|opportunity|place|room)\s+for\b/],
    explain: {
      ru: '"For" после слов time/chance/need/space/opportunity показывает, для чего предназначено: time for lunch = время для обеда. Это устойчивая конструкция существительного с "for".',
      uk: '"For" після слів time/chance/need/space/opportunity показує, для чого призначено: time for lunch = час для обіду. Це стала конструкція іменника з "for".',
      es: 'Tras «time», «chance», «need», «room» aparece «for» cuando el segundo término indica función o destinación («time for lunch» = momento de almorzar).',
    },
  },
  {
    preposition: 'for',
    matches: [/\bfor (me|you|him|her|us|them|my|your|his|her|our|their|a|an|the|this|that|these|those)\b/],
    explain: {
      ru: '"For" часто показывает цель, пользу или адресата: for you, for the meeting, for this reason. В этой фразе действие направлено "для" кого-то или чего-то.',
      uk: '"For" часто показує мету, користь або адресата: for you, for the meeting, for this reason. У цій фразі дія спрямована "для" когось або чогось.',
      es: '«For» marca destinatario, beneficio u orientación práctica («for you», «for the meeting», «for this reason»): la idea «para / a favor / en razón» encaja mejor con «for».',
    },
  },
  {
    preposition: 'about',
    matches: [/\b(think|talk|speak|read|write|know|learn|worry|ask|tell|hear|heard|complain|complaining)[a-z]*\b.*\babout\b|\babout\b.*\b(problem|lesson|story|book|plan|idea|question|news|policy|incident|application|noise)\b/],
    explain: {
      ru: '"About" вводит тему разговора, мысли или текста: talk about, think about, a story about. Здесь предлог отвечает на вопрос "о чём?".',
      uk: '"About" вводить тему розмови, думки або тексту: talk about, think about, a story about. Тут прийменник відповідає на питання "про що?".',
      es: '«About» introduce el tema del discurso o del pensamiento («talk about», «think about», «a story about»): responde a «¿de qué va?», no sólo lugar o tiempo.',
    },
  },
  {
    preposition: 'into',
    matches: [/\bturns? into\b|\bchanged? into\b|\bgo(es)? into\b|\bput[s]? .* into\b|\bthrows? .* into\b|\binto (the|a|an|this|that|deep|cold|warm|clear|dark)\b/],
    explain: {
      ru: '"Into" показывает движение внутрь или превращение: go into the room, turn into water. Здесь есть переход из одного состояния или места в другое.',
      uk: '"Into" показує рух усередину або перетворення: go into the room, turn into water. Тут є перехід з одного стану або місця в інше.',
      es: '«Into» expresa entrada física («go into») o transformación («turn into»). Siempre comunica cambio desde un punto o estado hacia dentro u otro estado.',
    },
  },
  {
    preposition: 'onto',
    matches: [/\bonto\b/],
    explain: {
      ru: '"Onto" показывает движение на поверхность: положить/перейти на что-то. Важно именно направление "на", а не просто положение.',
      uk: '"Onto" показує рух на поверхню: покласти/перейти на щось. Важливий саме напрям "на", а не просто положення.',
      es: '«Onto» resalta el movimiento hacia la superficie («put it onto the table»), no solo ubicación ya fijada sin trayectoria aparente.',
    },
  },
  {
    preposition: 'after',
    matches: [/\b(look|looks|looked|looking)\s+after\b/],
    explain: {
      ru: '"Look after" - фразовый глагол: "заботиться о ком-то". Здесь "after" не значит "после", а служит частью устойчивой пары глагол + предлог.',
      uk: '"Look after" - фразове дієслово: "піклуватися про когось". Тут "after" не означає "після", а є частиною сталої пари дієслово + прийменник.',
      es: '«Look after» es un verbo frasal («cuidar de alguien o algo»). «After» no expresa tiempo lineal típico, sino que forma parte fija del verbo conjunto.',
    },
  },
  {
    preposition: 'out',
    matches: [/\b(find|finds|found|finding|figure|figures|figured)\s+out\b/],
    explain: {
      ru: '"Find out / figure out" - фразовый глагол: "узнать, выяснить". Здесь "out" не про движение наружу, а часть устойчивого сочетания со значением "до конца, до результата".',
      uk: '"Find out / figure out" - фразове дієслово: "дізнатися, з\'ясувати". Тут "out" не про рух назовні, а частина сталого сполучення зі значенням "до кінця, до результату".',
      es: '«Find out» / «figure out» son verbos frasales con resultado intelectivo («averiguar», «darse cuenta tras analizar»). «Out» no expresa sólo dirección física.',
    },
  },
  {
    preposition: 'out',
    matches: [/\b(give|gives|gave|giving|hand|hands|handed|handing|bring|brings|brought|bringing|pass|passes|passed|passing)\s+out\b/],
    explain: {
      ru: '"Give out / hand out / bring out" - фразовый глагол: "раздавать, выдавать, выносить". Здесь "out" значит "до людей, до получателей", а не направление наружу.',
      uk: '"Give out / hand out / bring out" - фразове дієслово: "роздавати, видавати, виносити". Тут "out" означає "до людей, до отримувачів", а не напрям назовні.',
      es: '«Give out», «hand out», «bring out» indican dispersar o entregar («repartir»). «Out» marca salida hasta los destinatarios, no sólo abandonar interior.',
    },
  },
  {
    preposition: 'out',
    matches: [/\b(get|gets|got|getting)\s+out\b/],
    explain: {
      ru: '"Get out" - фразовый глагол: "выйти, выбраться, покинуть". Это устойчивое сочетание, в котором "out" указывает на выход из помещения или ситуации.',
      uk: '"Get out" - фразове дієслово: "вийти, вибратися, покинути". Це стале сполучення, у якому "out" вказує на вихід з приміщення або ситуації.',
      es: '«Get out» combina dirección física («salir» del espacio cerrado o salir literalmente fuera); «out» fija ese movimiento desde interior hacia fuera.',
    },
  },
  {
    preposition: 'up',
    matches: [/\b(get|gets|got|getting|wake|wakes|woke|waking|stand|stands|stood|standing)\s+up\b/],
    explain: {
      ru: '"Get up / wake up / stand up" - фразовый глагол: "вставать, просыпаться, подниматься". "Up" здесь часть устойчивой пары, а не отдельное направление.',
      uk: '"Get up / wake up / stand up" - фразове дієслово: "вставати, прокидатися, підніматися". "Up" тут частина сталої пари, а не окремий напрям.',
      es: 'Expresiones como «wake up», «stand up», «get up» usan «up» como partícula del verbo frasal (despertarse, erguirse), no como dirección aparte.',
    },
  },
  {
    preposition: 'up',
    matches: [/\b(heat|heats|heated|heating|warm|warms|warmed|warming|blow|blows|blew|blowing|fill|fills|filled|filling|clean|cleans|cleaned|cleaning)\s+up\b/],
    explain: {
      ru: '"Heat up / warm up / blow up / fill up" - фразовый глагол со значением полного завершения действия. "Up" здесь подчёркивает результат: до конца, полностью.',
      uk: '"Heat up / warm up / blow up / fill up" - фразове дієслово зі значенням повного завершення дії. "Up" тут підкреслює результат: до кінця, повністю.',
      es: 'Con «heat up», «warm up», «fill up», etc., «up» acentúa el proceso o resultado completo («calentarse del todo», «llenarse»). Va lexicalizado junto al verbo.',
    },
  },
  {
    preposition: 'down',
    matches: [/\b(sit|sits|sat|sitting|lie|lies|lay|lying|put|puts|putting|calm|calms|calmed|calming|slow|slows|slowed|slowing)\s+down\b/],
    explain: {
      ru: '"Sit down / lie down / calm down" - фразовый глагол с устойчивым "down". Это часть сочетания, а не просто движение вниз.',
      uk: '"Sit down / lie down / calm down" - фразове дієслово зі сталим "down". Це частина сполучення, а не просто рух донизу.',
      es: '«Sit down», «lie down», «calm down» incorporan «down» como elemento fijo del verbo («sentarse», «calmarse», etc.), no solo como flecha física literal.',
    },
  },
  {
    preposition: 'after',
    matches: [/\b(take|takes|took|taking|run|runs|ran|running)\s+after\b/],
    explain: {
      ru: '"Take after / run after" - фразовый глагол: "быть похожим на / гнаться за". "After" здесь часть устойчивой пары, не значение времени.',
      uk: '"Take after / run after" - фразове дієслово: "бути схожим на / гнатися за". "After" тут частина сталої пари, не значення часу.',
      es: '«Take after» (parentesco de rasgos), «run after» (perseguir) lexicalizan la secuencia verbal + «after»; no marca horario lineal habitual.',
    },
  },
  {
    preposition: 'through',
    matches: [/\bthrough\s+(this|that|these|those|the|a|an|my|your|his|her|our|their)?\s*(\w+\s+){0,2}(app|application|website|service|platform|portal|system|company|email|software|program|tool|page|site|account|browser)\b/],
    explain: {
      ru: '"Through" здесь значит "через = с помощью": заказывать через приложение, бронировать через сайт. Это инструмент или посредник, а не движение сквозь пространство.',
      uk: '"Through" тут означає "через = за допомогою": замовляти через застосунок, бронювати через сайт. Це інструмент або посередник, а не рух крізь простір.',
      es: '«Through» marca canal o intermediario tecnológico («through the website», «through the app»): «mediante», no sólo física tridimensional de atravesar un corredor.',
    },
  },
  {
    preposition: 'through',
    matches: [/\bthrough\s+(this|that|these|those|the|a|an|my|your|his|her|our|their)?\s*(\w+\s+){0,2}(headphones|earphones|speakers|microphone|interpreter|translator|representative|agent)\b/],
    explain: {
      ru: '"Through" здесь значит "через = с помощью": слушать через наушники, говорить через переводчика. Это посредник для передачи звука или информации.',
      uk: '"Through" тут означає "через = за допомогою": слухати через навушники, говорити через перекладача. Це посередник для передачі звуку або інформації.',
      es: '«Listen through headphones», «speak through an interpreter»: «through» marca el medio acústico o interpretativo («a través de ese canal», no sólo atravesar un espacio).',
    },
  },
  {
    preposition: 'by',
    matches: [/\bby\s+hand\b/],
    explain: {
      ru: '"By hand" - устойчивое сочетание: "руками, вручную". Здесь "by" показывает способ выполнения, в противоположность машинному изготовлению.',
      uk: '"By hand" - стале сполучення: "руками, вручну". Тут "by" показує спосіб виконання, на противагу машинному виготовленню.',
      es: '«By hand» significa hecho manualmente («a mano»). «By» marca el método, opuesto por contraste a procesos automatizados.',
    },
  },
  {
    preposition: 'by',
    matches: [/\bby\s+(heart|chance|mistake|accident|the way|nature|night|day)\b/],
    explain: {
      ru: '"By heart / by chance / by mistake / by the way" - устойчивые сочетания. "By" здесь часть фиксированного оборота, не самостоятельное значение.',
      uk: '"By heart / by chance / by mistake / by the way" - сталі сполучення. "By" тут частина фіксованого звороту, не самостійне значення.',
      es: 'Expresiones como «by heart», «by chance» o «by the way» son fijas: «by» entra lexicalizado y no admite otros prepositivos sin alterar el sentido.',
    },
  },
  {
    preposition: 'in',
    matches: [/\bin (my|your|his|her|our|their|the)?\s*childhood\b/],
    explain: {
      ru: '"In childhood / in my childhood" - устойчивое сочетание: "в детстве". "In" показывает период жизни, а не местоположение.',
      uk: '"In childhood / in my childhood" - стале сполучення: "в дитинстві". "In" показує період життя, а не місцезнаходження.',
      es: '«In childhood», «in my childhood» encapsulan un tramo temporal («durante la infancia»). Aquí «in» es marco cronológico, no mapa físico literal.',
    },
  },
  {
    preposition: 'to',
    matches: [/\b(listen|listens|listened|listening)\s+to\b/],
    explain: {
      ru: '"Listen to" - фиксированное сочетание: глагол listen всегда требует "to" перед объектом. Без "to" фраза будет неграмотной.',
      uk: '"Listen to" - фіксоване сполучення: дієслово listen завжди вимагає "to" перед об\'єктом. Без "to" фраза буде неграмотною.',
      es: 'El verbo inglés «listen» exige «to» antes del objeto de escucha («listen to»); sin «to», la combinación estándar rompe.',
    },
  },
  {
    preposition: 'to',
    matches: [/\b(belong|belongs|belonged|belonging)\s+to\b/],
    explain: {
      ru: '"Belong to" - фиксированное сочетание: "принадлежать кому-то". "To" здесь - часть глагольной конструкции, без неё фраза не работает.',
      uk: '"Belong to" - фіксоване сполучення: "належати комусь". "To" тут - частина дієслівної конструкції, без неї фраза не працює.',
      es: '«Belong to» marca pertenencia («pertenece a»). Aquí «to» es parte inseparable del patrón léxico habitual.',
    },
  },
  {
    preposition: 'to',
    matches: [/\b(am|is|are|was|were|been|being|get|gets|got|getting)\s+(not\s+)?used\s+to\b/],
    explain: {
      ru: '"Be used to + N / V-ing" - устойчивая конструкция: "привык к чему-то / к тому, что..." После "used to" идёт существительное или глагол с "-ing", а не инфинитив. Не путайте с "used to + инфинитив" (когда-то делал).',
      uk: '"Be used to + N / V-ing" - стала конструкція: "звик до чогось / до того, що..." Після "used to" іде іменник або дієслово з "-ing", а не інфінітив. Не плутайте з "used to + інфінітив" (колись робив).',
      es: 'Estructura habitual «be used to + noun / gerund»: «estar acostumbrado a». No confundir con «used to + infinitive» (acción habitual en el pasado).',
    },
  },
  {
    preposition: 'with',
    matches: [/\b(help|helps|helped|helping)\s+\w+\s+with\b/],
    explain: {
      ru: '"Help someone with something" - устойчивая конструкция: "помочь с чем-то". "With" здесь обязателен после help + объект.',
      uk: '"Help someone with something" - стала конструкція: "допомогти з чимось". "With" тут обов\'язковий після help + об\'єкт.',
      es: 'Tras «help + objeto + persona», «with» introduce el área de ayuda (p. ej. «help them with grammar» «ayuda con gramática»).',
    },
  },
  {
    preposition: 'off',
    matches: [/\bday\s+off\b/],
    explain: {
      ru: '"Day off" - устойчивое сочетание: "выходной день". "Off" здесь часть существительного, а не отдельный предлог.',
      uk: '"Day off" - стале сполучення: "вихідний день". "Off" тут частина іменника, а не окремий прийменник.',
      es: '«Day off» es colocación fija («franco», «día libre laboral»). «Off» integra el sintagma nominal, no funciona aisladamente como otro predicado.',
    },
  },
  {
    preposition: 'off',
    matches: [/\b(turn|turns|turned|turning|switch|switches|switched|switching|take|takes|took|taking|put|puts|putting|cut|cuts|cutting)\s+off\b/],
    explain: {
      ru: '"Turn off / switch off / take off" - фразовый глагол: выключить, снять, отменить. "Off" здесь часть устойчивой пары, значит "прочь, в нерабочее состояние".',
      uk: '"Turn off / switch off / take off" - фразове дієслово: вимкнути, зняти, скасувати. "Off" тут частина сталої пари, означає "геть, у неробочий стан".',
      es: '«Turn off», «take off», etc.: «off» marca apagar, quitar físicamente o frenar proceso; sirve como partícula lexicalizada del verbo frasal.',
    },
  },
  {
    preposition: 'around',
    matches: [/\baround the corner\b/],
    explain: {
      ru: '"Around the corner" - устойчивое выражение: "за углом / совсем рядом". "Around" здесь фиксированная часть идиомы, не движение по кругу.',
      uk: '"Around the corner" - сталий вираз: "за рогом / зовсім поруч". "Around" тут фіксована частина ідіоми, не рух по колу.',
      es: '«Around the corner» comunica cercanía inminente física o figurada. «Around» forma parte fija del modismo habitual en inglés.',
    },
  },
];

const descriptor = '(?:the|a|an|my|your|his|her|our|their|this|that|these|those)?\\s*(?:\\w+\\s+){0,3}';

const onSurfaceFlat = /(table|desk|shelf|wall|floor|roof|ceiling|surface|panel|board|map|page|shoulder|head|face|menu|stage|cover|lid|counter|plate|tray|cliff|hill|rock|island|coast|grass|ground|sand|carpet)/;
const onLine = /(road|street|streets|highway|path|trail|river|coast|line|edge|border)/;
const onMedia = /(list|menu|map|page|screen|tv|television|radio|website|internet|news|cover|invitation)/;
const onSeat = /(chair|sofa|bed|seat|bench|couch)/;
const onTransportPublic = /(bus|train|plane|airplane|metro|subway|tram|ship|boat|ferry)/;

const inRoomLike = /(room|bedroom|bathroom|kitchen|classroom|hall|office|garage|corridor|laboratory|cinema|library|museum|mall|supermarket|pharmacy|shop|store|backyard|garden|park|forest|cinema|theater|theatre|stadium|station|airport|hospital|building|elevator|cabin|courtyard)/;
const inContainer = /(bag|box|drawer|folder|fridge|basket|pocket|cup|glass|bottle|jar|envelope|wallet|backpack|case|cup|bowl|pot|pan|tray|sink|safe)/;
const inVehicle = /(car|taxi|truck|van|cab|jeep|tractor)/;
const inCityCountry = /(city|country|town|village|district|area|state|province|region|world|capital|suburb|metropolis|countryside|neighborhood|neighbourhood|street|london|paris|rome|moscow|kyiv|kiev|berlin|tokyo|spain|italy|france|england|germany|ukraine|china|japan|usa|america|europe|asia|africa)/;
const inWaterSky = /(water|sea|ocean|river|pool|lake|sky|clouds|space|air|rain|snow|fog|smoke)/;
const inAbstract = /(danger|trouble|love|peace|silence|hurry|secret|debt|need|risk|action|charge|control|fashion|shape|order|tears|pain|shock|pieces|mood|line|advance|public|private|particular|general|practice|theory|stock|trap|debt|fear|panic|chaos|jail|prison|court|tune|time|use|stock|charge|focus)/;

function ruleFor(preposition: string, sentence: string): Explanation | null {
  const normalized = normalizeSentence(sentence);

  for (const rule of phraseRules) {
    if (rule.preposition !== preposition) continue;
    if (rule.matches.some(rx => rx.test(normalized))) return { ...rule.explain, level: 'specific' };
  }

  if (preposition === 'on') {
    const onChunk = chunkUntil(sentence, 'on', /^(yet|now|today|tomorrow|yesterday|already|still|soon|early|late|please|here|there|too|carefully)$/);
    if (new RegExp(`\\bon ${descriptor}${onTransportPublic.source}\\b`).test(normalized)) {
      return {
        ru: `С общественным транспортом используем "on": "${onChunk}" - речь не о поверхности, а о том, что человек находится внутри транспорта во время поездки. Сравните: on the bus, on the train, on the plane.`,
        uk: `З громадським транспортом використовуємо "on": "${onChunk}" - ідеться не про поверхню, а про те, що людина знаходиться всередині транспорту під час поїздки. Порівняйте: on the bus, on the train, on the plane.`,
        es: `En transporte público se usa «on» («${onChunk}»): no es contacto con la «cubierta» de un avión, sino viajar montado en ese vehículo (on the bus, on the plane).`,
        level: 'context',
      };
    }
    if (new RegExp(`\\bon ${descriptor}${onSeat.source}\\b`).test(normalized)) {
      return {
        ru: `Когда садимся или сидим на мебели для сидения, используем "on": "${onChunk}". Тело опирается на поверхность сиденья - отсюда "on".`,
        uk: `Коли сідаємо або сидимо на меблях для сидіння, використовуємо "on": "${onChunk}". Тіло спирається на поверхню сидіння - звідси "on".`,
        es: `En asientos o mobiliario para sentarse («${onChunk}») corresponde «on»: el peso apoya sobre el asiento.`,
        level: 'context',
      };
    }
    if (new RegExp(`\\bon ${descriptor}${onMedia.source}\\b`).test(normalized)) {
      return {
        ru: `С носителями информации используем "on": "${onChunk}". Имя, дата или объект находится "на" странице, экране, в списке или на карте.`,
        uk: `З носіями інформації використовуємо "on": "${onChunk}". Ім'я, дата або об'єкт знаходиться "на" сторінці, екрані, у списку чи на карті.`,
        es: `Con soportes digitales o impresos («${onChunk}») aparece «on»: el dato está “sobre” página, pantalla, lista o mapa.`,
        level: 'context',
      };
    }
    if (new RegExp(`\\bon ${descriptor}${onLine.source}\\b`).test(normalized)) {
      return {
        ru: `С линиями и протяжёнными объектами говорим "on": "${onChunk}". Дорога, улица или граница - это линия, на которой что-то находится или движется.`,
        uk: `З лініями та протяжними об'єктами кажемо "on": "${onChunk}". Дорога, вулиця або межа - це лінія, на якій щось знаходиться або рухається.`,
        es: `Para trayectos lineales (calle, ribera, frontera…) se usa «on» («${onChunk}»): actúa como eje sobre el que hay posición o movimiento.`,
        level: 'context',
      };
    }
    if (new RegExp(`\\bon ${descriptor}${onSurfaceFlat.source}\\b`).test(normalized)) {
      return {
        ru: `Когда предмет лежит или закреплён на ровной поверхности, ставим "on": "${onChunk}". Контакт сверху или соприкосновение с плоскостью - типичный случай для "on".`,
        uk: `Коли предмет лежить або закріплений на рівній поверхні, ставимо "on": "${onChunk}". Контакт зверху або дотик з площиною - типовий випадок для "on".`,
        es: `Si el objeto descansa o se fija en una superficie plana («${onChunk}»), «on» marca contacto superior habitual con el plano.`,
        level: 'context',
      };
    }
  }

  if (preposition === 'in') {
    const inChunk = chunkUntil(sentence, 'in', /^(now|today|tomorrow|yesterday|here|there|too|please|already|still|soon)$/);
    if (new RegExp(`\\bin ${descriptor}${inAbstract.source}\\b`).test(normalized)) {
      return {
        ru: `"In" с абстрактными состояниями работает как русское "в": "${inChunk}". Человек находится внутри ситуации, настроения или положения.`,
        uk: `"In" з абстрактними станами працює як українське "в": "${inChunk}". Людина знаходиться всередині ситуації, настрою або стану.`,
        es: `«In» con estados abstractos («${inChunk}») sitúa dentro de un marco figurado: peligro, deuda, duda, etc.`,
        level: 'context',
      };
    }
    if (new RegExp(`\\bin ${descriptor}${inVehicle.source}\\b`).test(normalized)) {
      return {
        ru: `С личным транспортом, куда садятся, говорим "in": "${inChunk}". В машину, такси, грузовик нужно "залезть внутрь" - отсюда "in", в отличие от автобуса/поезда (on).`,
        uk: `З особистим транспортом, у який сідають, кажемо "in": "${inChunk}". У машину, таксі, вантажівку потрібно "залізти всередину" - звідси "in", на відміну від автобуса/потяга (on).`,
        es: `En coches o taxis privados («${inChunk}») suele irse «in» (entrar al habitáculo pequeño); distinto de «on the bus/train» abiertos.`,
        level: 'context',
      };
    }
    if (new RegExp(`\\bin ${descriptor}${inContainer.source}\\b`).test(normalized)) {
      return {
        ru: `Когда что-то лежит внутри ёмкости, всегда "in": "${inChunk}". Сумка, коробка, ящик, карман - закрытое пространство с границами.`,
        uk: `Коли щось лежить усередині ємності, завжди "in": "${inChunk}". Сумка, коробка, шухляда, кишеня - закритий простір з межами.`,
        es: `Interior de recipiente con bordes claros («${inChunk}») → «in»: bolsa, caja, maletero.`,
        level: 'context',
      };
    }
    if (new RegExp(`\\bin ${descriptor}${inWaterSky.source}\\b`).test(normalized)) {
      return {
        ru: `Со стихиями и большими "массами" говорим "in": "${inChunk}". Вода, небо, воздух воспринимаются как объём, в который что-то погружено.`,
        uk: `Зі стихіями та великими "масами" кажемо "in": "${inChunk}". Вода, небо, повітря сприймаються як об'єм, у який щось занурено.`,
        es: `Masas fluidas o amplias («${inChunk}»): agua, niebla, espacio se entienden como volumen tridimensional donde «in» encaja mejor.`,
        level: 'context',
      };
    }
    if (new RegExp(`\\bin ${descriptor}${inCityCountry.source}\\b`).test(normalized)) {
      return {
        ru: `С городами, странами и большими территориями используем "in": "${inChunk}". Это крупные географические зоны, и мы находимся внутри их границ.`,
        uk: `З містами, країнами та великими територіями використовуємо "in": "${inChunk}". Це великі географічні зони, і ми знаходимося всередині їхніх меж.`,
        es: `Grandes entidades geográficas («${inChunk}») combinan con «in»: la idea es «dentro» de la ciudad, región o país.`,
        level: 'context',
      };
    }
    if (new RegExp(`\\bin ${descriptor}${inRoomLike.source}\\b`).test(normalized)) {
      return {
        ru: `С помещениями и закрытыми пространствами всегда "in": "${inChunk}". У комнаты, здания или зала есть стены - человек находится внутри них.`,
        uk: `З приміщеннями та закритими просторами завжди "in": "${inChunk}". У кімнати, будівлі або зали є стіни - людина знаходиться всередині них.`,
        es: `Estancias o recintos acotados («${inChunk}») llevan habitualmente «in»: interior delimitado por muros.`,
        level: 'context',
      };
    }
  }

  const after = wordsAfter(sentence, preposition, 3);
  const chunk = phraseAfter(sentence, preposition);
  const durationWords = /\b(minute|minutes|hour|hours|day|days|week|weeks|month|months|year|years|long|while)\b/;
  const periodWords = /\b(january|february|march|april|may|june|july|august|september|october|november|december|spring|summer|autumn|fall|winter|childhood|morning|mornings|evening|evenings|future|past)\b/;
  const recipientWords = /\b(me|you|him|her|us|them|friend|friends|family|teacher|student|students|children|customer|client|team|group)\b/;
  const toolWords = /\b(key|knife|pen|pencil|phone|computer|tool|tools|machine|camera|card|hand|hands)\b/;
  const deadlineWords = /\b(today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday|morning|evening|noon|midnight|deadline|time|then|end)\b/;
  const timeWords = /\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|o'clock|noon|midnight)\b/;
  const numericTime = /\b\d{1,2}(:\d{2})?\b/;
  const movementVerbs = /\b(go|goes|went|come|comes|came|walk|walks|run|runs|move|moves|travel|travels|drive|drives|return|returns|send|sends|bring|brings|take|takes|fly|flies)\b/;
  const mediaWords = /\b(tv|television|radio|internet|website|official page|page|screen|phone|computer)\b/;

  if (preposition === 'in' && /\bin line\b/.test(normalized)) {
    return {
      ru: '"In line" - устойчивое выражение: стоять или быть в очереди. Здесь "in" показывает нахождение внутри порядка/ряда людей.',
      uk: '"In line" - сталий вираз: стояти або бути в черзі. Тут "in" показує перебування всередині порядку/ряду людей.',
      es: '«In line» es colocación fija para «estar en la fila / cola»; «in» marca pertenencia a la hilera esperando.',
      level: 'specific',
    };
  }

  if (preposition === 'at' && /\b(shout|shouts|shouted|look|looks|looked|laugh|laughs|laughed|smile|smiles|smiled)\b/.test(normalized)) {
    const trimmed = chunkUntil(sentence, 'at', /^(me|you|him|her|us|them|it|this|that)$/);
    return {
      ru: `"At" после таких глаголов показывает цель действия: "${trimmed}" = на кого направлен взгляд, крик или реакция. Поэтому здесь нужен "at".`,
      uk: `"At" після таких дієслів показує ціль дії: "${trimmed}" = на кого спрямований погляд, крик або реакція. Тому тут потрібен "at".`,
      es: `Tras «look», «shout», «laugh», etc., «${trimmed}» marca el blanco («at someone» «hacia», «contra», «mirando» a alguien).`,
      level: 'context',
    };
  }

  if (preposition === 'at' && /\b(meeting|cinema|lecture|concert|party|exam|event|conference|airport|station|door|desk|table|counter)\b/.test(after)) {
    const trimmed = chunkUntil(sentence, 'at', /^(meeting|cinema|lecture|concert|party|exam|event|conference|airport|station|door|desk|table|counter)$/);
    return {
      ru: `"At" используется для события или места как точки: "${trimmed}" = на встрече/в кино/на лекции. Здесь важен сам пункт события, а не внутреннее пространство.`,
      uk: `"At" використовується для події або місця як точки: "${trimmed}" = на зустрічі/у кіно/на лекції. Тут важливий сам пункт події, а не внутрішній простір.`,
      es: `«${trimmed}» marca el punto de encuentro («at the cinema», «at the station» «en ese lugar‑evento»), no sólo estar «dentro del volumen».`,
      level: 'context',
    };
  }

  if (preposition === 'in' && durationWords.test(after)) {
    return {
      ru: `"In" с периодом времени означает "через / спустя": "${chunk}" показывает, через сколько действие произойдёт. Поэтому здесь нужен "in", а не "for".`,
      uk: `"In" з періодом часу означає "через / за": "${chunk}" показує, через скільки дія відбудеться. Тому тут потрібен "in", а не "for".`,
      es: `"${chunk}" con «in» expresa posterioridad («en tres días»: pasado ese lapso ocurre algo). Para duración estable usa «for».`,
      level: 'context',
    };
  }

  if (preposition === 'in' && periodWords.test(after)) {
    return {
      ru: `"In" используется с месяцами, сезонами и большими периодами: "${chunk}". Это не точная дата, а промежуток времени.`,
      uk: `"In" використовується з місяцями, сезонами та великими періодами: "${chunk}". Це не точна дата, а проміжок часу.`,
      es: `"${chunk}" marca marco temporal amplio («in spring», «in 2026»): no es día concreto (para eso «on Monday»).`,
      level: 'context',
    };
  }

  if (preposition === 'in' && /\b(believe|believes|believed|trust|trusts|interested|succeed|succeeds)\b/.test(normalized)) {
    const trimmed = chunkUntil(sentence, 'in', /^(luck|god|me|you|him|her|us|them|myself|yourself|himself|herself|ourselves|themselves|magic|miracles|future|fate|destiny|truth|love|life|science)$/);
    return {
      ru: `"In" нужен в устойчивой конструкции с глаголом/прилагательным: "${trimmed}". Например: believe in, interested in, succeed in.`,
      uk: `"In" потрібен у сталій конструкції з дієсловом або прикметником: "${trimmed}". Наприклад: believe in, interested in, succeed in.`,
      es: `"${trimmed}" entra en colocaciones fijas («believe in», «interested in»): «in» marca foco objeto de creencia / interés.`,
      level: 'specific',
    };
  }

  if (preposition === 'on' && mediaWords.test(after)) {
    const trimmed = chunkUntil(sentence, 'on', /^(tv|television|radio|internet|website|page|screen|phone|computer)$/);
    return {
      ru: `"On" используется с экраном, страницей или медиа: "${trimmed}" = "на экране/странице/ТВ". Здесь информация находится на носителе.`,
      uk: `"On" використовується з екраном, сторінкою або медіа: "${trimmed}" = "на екрані/сторінці/ТБ". Тут інформація знаходиться на носії.`,
      es: `"${trimmed}" (pantalla, página, medio) combina «on»: el contenido se muestra sobre ese nivel superficial visible.`,
      level: 'context',
    };
  }

  if (preposition === 'on' && /\b(knock|knocked|press|pressed|click|clicked|tap|tapped)\b/.test(normalized)) {
    const trimmed = chunkUntil(sentence, 'on', /^(door|button|key|table|wall|screen|panel|surface|keyboard|window|link|icon|tab)$/);
    return {
      ru: `"On" часто используется при контакте с поверхностью: "${trimmed}". Мы стучим, нажимаем или кликаем именно "on" объект.`,
      uk: `"On" часто використовується при контакті з поверхнею: "${trimmed}". Ми стукаємо, натискаємо або клікаємо саме "on" об'єкт.`,
      es: `Tras golpear, clicar… «${trimmed}» usa «on» sobre la superficie o control de contacto inmediato.`,
      level: 'context',
    };
  }

  if (preposition === 'for' && durationWords.test(after)) {
    return {
      ru: `"For" используется с длительностью: "${chunk}" отвечает на вопрос "как долго?". Поэтому здесь нужен "for", а не предлог места или направления.`,
      uk: `"For" використовується з тривалістю: "${chunk}" відповідає на питання "як довго?". Тому тут потрібен "for", а не прийменник місця чи напряму.`,
      es: `"${chunk}" con «for» marca duración («cuánto tiempo dura»: «for three days» «durante tres días» como extensión).`,
      level: 'context',
    };
  }

  if (preposition === 'for' && recipientWords.test(after)) {
    return {
      ru: `"For" показывает адресата или пользу: "${chunk}" значит "для кого-то". В этой фразе действие делается для этого человека или группы.`,
      uk: `"For" показує адресата або користь: "${chunk}" означає "для когось". У цій фразі дія робиться для цієї людини або групи.`,
      es: `"${chunk}" marca destinatario o beneficio («for you»: «para ti» dentro de ese marco léxico).`,
      level: 'context',
    };
  }

  if (preposition === 'with' && toolWords.test(after)) {
    return {
      ru: `"With" здесь показывает инструмент: "${chunk}" значит "с помощью чего-то". Поэтому выбираем "with", когда предмет помогает выполнить действие.`,
      uk: `"With" тут показує інструмент: "${chunk}" означає "за допомогою чогось". Тому обираємо "with", коли предмет допомагає виконати дію.`,
      es: `En «${chunk}», «with» marca el instrumento o medio («with a knife» «con ese objeto/medio»).`,
      level: 'context',
    };
  }

  if (preposition === 'with' && recipientWords.test(after)) {
    return {
      ru: `"With" означает совместность: "${chunk}" = "с кем-то". Здесь действие происходит вместе с человеком или группой.`,
      uk: `"With" означає спільність: "${chunk}" = "з кимось". Тут дія відбувається разом із людиною або групою.`,
      es: `"${chunk}" indica co‑participación («with friends» «junto con»: compañía durante la acción).`,
      level: 'context',
    };
  }

  const passiveActor = /\b(is|are|am|was|were|be|been|being)\b[^.]{0,40}\bby\s+(a|an|the|this|that|these|those|my|your|his|her|our|their|them|him|us|me|you|every|some|many|few|two|three|four|five|new|old|young|reliable|skilled|polite|professional|kind|busy|smart|talented|local|noisy|hard\s?working|security|management|secretaries?|chef|chefs|brother|sisters?|teacher|students?|police|workers?|engineers?|lawyer|lawyers?|intern|interns?|jeweler|spy|cleaner|cleaners?|driver|drivers?|child|children|woman|women|man|men|people)/;
  const strongDeadlineWords = /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday|noon|midnight|deadline|today|tomorrow|then)\b/;
  if (preposition === 'by') {
    if (passiveActor.test(normalized)) {
      const trimmed = chunkUntil(sentence, 'by', /^(chef|chefs|brother|sisters?|teacher|students?|engineers?|workers?|police|management|secretary|secretaries|them|him|her|us|me|you)$/);
      return {
        ru: `"By" в пассивных конструкциях вводит исполнителя действия: "${trimmed}" отвечает на вопрос "кем сделано?". Поэтому здесь нужен "by", а не другой предлог.`,
        uk: `"By" у пасивних конструкціях вводить виконавця дії: "${trimmed}" відповідає на питання "ким зроблено?". Тому тут потрібен "by", а не інший прийменник.`,
        es: `En pasiva inglés («${trimmed}») «by» introduce el agente («por/quien ejecuta» tras verbo predicativo pasivo).`,
        level: 'context',
      };
    }
    if (strongDeadlineWords.test(after) || numericTime.test(after)) {
      const trimmed = chunkUntil(sentence, 'by', /^(monday|tuesday|wednesday|thursday|friday|saturday|sunday|noon|midnight|deadline|today|tomorrow|then|\d+([:.]\d+)?)$/);
      return {
        ru: `"By" указывает крайний срок: "${trimmed}" значит "к этому моменту / не позже". Здесь важно завершить действие до указанного времени.`,
        uk: `"By" указує крайній строк: "${trimmed}" означає "до цього моменту / не пізніше". Тут важливо завершити дію до вказаного часу.`,
        es: `«${trimmed}» con «by» limita plazo límite («para el lunes», «antes de medianoche»): la acción debe cerrarse no después de ese hito.`,
        level: 'context',
      };
    }
  }

  if (preposition === 'at' && numericTime.test(after)) {
    const trimmed = chunkUntil(sentence, 'at', /^(o'clock|am|pm|noon|midnight|\d{1,2}([:.]\d{2})?)$/);
    return {
      ru: `"At" ставится с точным временем: "${trimmed}" - точный момент на часах. Поэтому здесь не "in" и не "on".`,
      uk: `"At" ставиться з точним часом: "${trimmed}" - точний момент на годиннику. Тому тут не "in" і не "on".`,
      es: `«${trimmed}» con «at» fija hora exacta (reloj). No emplees «in» ni «on» para números puntuales de tiempo.`,
      level: 'context',
    };
  }

  if (preposition === 'at' && timeWords.test(after)) {
    const trimmed = chunkUntil(sentence, 'at', /^(o'clock|noon|midnight|am|pm)$/);
    return {
      ru: `"At" ставится с точным временем: "${trimmed}" - точный момент. Во фразах с конкретным часом всегда "at".`,
      uk: `"At" ставиться з точним часом: "${trimmed}" - точний момент. У фразах з конкретною годиною завжди "at".`,
      es: `«${trimmed}» con «at» representa instante horario concreto (como «at six»).`,
      level: 'context',
    };
  }

  if (preposition === 'at' && /\bat the end\b/.test(normalized)) {
    return {
      ru: `"At the end" - устойчивое сочетание: "в конце". Здесь "end" понимается как конкретная точка, поэтому нужен "at".`,
      uk: `"At the end" - сталий вираз: "у кінці". Тут "end" сприймається як конкретна точка, тому потрібен "at".`,
      es: '«At the end» es colocación fija («al final»); «at» ancla el cierre como punto en la línea temporal o secuencia.',
      level: 'specific',
    };
  }

  if (preposition === 'to' && /\bto\s+([a-z]+)\b/.test(normalized)) {
    const m = normalized.match(/\bto\s+([a-z]+)\b/);
    const candidate = m?.[1] ?? '';
    const infinitiveLike = /^(achieve|leave|finish|wear|check|buy|repair|bring|deliver|come|see|go|make|do|read|write|listen|cook|stay|start|stop|forget|remember|wait|watch|work|play|study|learn|understand|find|get|take|tell|say|know|think|believe|help|use|wash|clean|sleep|drink|eat|build|create|prepare|change|move|teach|catch|meet|call|send|return|sing|dance|drive|walk|run|live|love|like|want|need|try|continue|begin|hope|plan|decide|agree|refuse|enjoy|avoid|imagine|consider|suggest|prefer|expect|allow|let|confirm|repeat|review|fix|develop|design|test|prove|apologize|admit|deny|answer|reply|respond|join|attend|watch|complete|cancel|schedule|reschedule|sign|approve|reject|deliver|install|launch|protect|defend|cover|hide|appear|disappear|recover|continue|maintain|control|manage|handle|share|donate|accept|notice|recognize|forgive|trust|defend|impress|offend|escape|survive|invent|discover|explain|describe|present|introduce|reduce|increase|achieve|practice|practise|repeat|memorize|memorise|publish|register|enroll|enrol|graduate|hire|fire|dismiss|reward|punish|celebrate|invite|congratulate|thank|greet|welcome|host|serve|order|purchase|donate|borrow|lend|rent|exchange|repair|replace|recycle|throw|catch|pick|choose|select|volunteer)$/;
    if (infinitiveLike.test(candidate)) {
      return {
        ru: `"To" перед глаголом "${candidate}" - инфинитивная частица, а не предлог места. Конструкция "${chunkUntil(sentence, 'to', new RegExp(`^${candidate}$`))}" означает цель или соединяет два действия.`,
        uk: `"To" перед дієсловом "${candidate}" - інфінітивна частка, а не прийменник місця. Конструкція "${chunkUntil(sentence, 'to', new RegExp(`^${candidate}$`))}" означає мету або з'єднує дві дії.`,
        es: `Ante «${candidate}», «to» introduce infinitivo (partícula de objetivo/enlace verbal), no preposición de lugar: véase «${chunkUntil(sentence, 'to', new RegExp(`^${candidate}$`))}».`,
        level: 'specific',
      };
    }
  }

  if (preposition === 'before' && /\bbefore\s+\w+ing\b/.test(normalized)) {
    const trimmed = chunkUntil(sentence, 'before', /\w+ing/);
    return {
      ru: `"Before + V-ing" - устойчивая модель: "${trimmed}" значит "перед тем как / до того, как". После before действие идёт в форме герундия (-ing).`,
      uk: `"Before + V-ing" - стала модель: "${trimmed}" означає "перед тим як / до того, як". Після before дія йде у формі герундія (-ing).`,
      es: `Patrón «before + gerundio» («${trimmed}»): antecede la acción en -ing al evento principal sin infinitivo directo aquí.`,
      level: 'specific',
    };
  }

  if (preposition === 'after' && /\bafter\s+\w+ing\b/.test(normalized)) {
    const trimmed = chunkUntil(sentence, 'after', /\w+ing/);
    return {
      ru: `"After + V-ing" - устойчивая модель: "${trimmed}" значит "после того, как сделали". После after действие идёт в форме герундия (-ing).`,
      uk: `"After + V-ing" - стала модель: "${trimmed}" означає "після того, як зробили". Після after дія йде у формі герундія (-ing).`,
      es: `«After + -ing» («${trimmed}») sitúa la acción en gerundio tras completar el primer hecho.`,
      level: 'specific',
    };
  }

  if (preposition === 'without' && /\bwithout\s+\w+ing\b/.test(normalized)) {
    const trimmed = chunkUntil(sentence, 'without', /\w+ing/);
    return {
      ru: `"Without + V-ing" - устойчивая модель: "${trimmed}" значит "без того, чтобы / не делая". После without глагол всегда идёт в форме герундия (-ing).`,
      uk: `"Without + V-ing" - стала модель: "${trimmed}" означає "без того, щоб / не роблячи". Після without дієслово завжди йде у формі герундія (-ing).`,
      es: `Tras «without» va gerundio («${trimmed}»): significa «sin hacer X» en contraste con infinitivo preposicional raro aquí.`,
      level: 'specific',
    };
  }

  if (preposition === 'from' && /\b(turn|turns|turned|change|changes|changed|become|becomes|became|grow|grows|grew|fade|fades|faded|hurt|hurts|suffer|suffers|suffered)\b/.test(normalized) && !movementVerbs.test(normalized)) {
    return {
      ru: `"From" во фразе "${chunk}" указывает на причину или источник изменения: что-то происходит "из-за / от" этого фактора.`,
      uk: `"From" у фразі "${chunk}" вказує на причину або джерело зміни: щось відбувається "через / від" цього чинника.`,
      es: `«${chunk}»: «from» introduce causa o origen del cambio («por culpa de», «como resultado de»).`,
      level: 'context',
    };
  }

  if (preposition === 'to' && /\b(heat|heats|heated|cool|cools|cooled|warm|warms|warmed|raise|raises|raised)\b.*\bto\b/.test(normalized) && /\b(temperature|degree|degrees|level|point|state)\b/.test(after)) {
    const trimmed = chunkUntil(sentence, 'to', /^(temperature|degree|degrees|level|point|state)$/);
    return {
      ru: `"To" показывает достижение состояния или уровня: "${trimmed}" отвечает на вопрос "до чего?". Здесь действие доводит объект до конкретной точки.`,
      uk: `"To" показує досягнення стану або рівня: "${trimmed}" відповідає на питання "до чого?". Тут дія доводить об'єкт до конкретної точки.`,
      es: `«${trimmed}» con «to» marca meta numérica o de estado al que se eleva o baja (temperatura, nivel).`,
      level: 'context',
    };
  }

  if (preposition === 'to' && /\b(give|gives|gave|giving|send|sends|sent|sending|pass|passes|passed|passing|show|shows|showed|showing|tell|tells|told|telling|write|writes|wrote|writing|read|reads|reading|sell|sells|sold|selling|offer|offers|offered|offering|bring|brings|brought|bringing|return|returns|returned|returning|deliver|delivers|delivered|delivering|hand|hands|handed|handing|teach|teaches|taught|teaching|explain|explains|explained|explaining|introduce|introduces|introduced|introducing|present|presents|presented|presenting|recommend|recommends|recommended|recommending)\b/.test(normalized) && /\b(me|you|him|her|us|them|my|your|his|her|our|their|the|a|an|this|that|these|those)\b/.test(after)) {
    const trimmed = chunkUntil(sentence, 'to', /^(me|you|him|her|us|them|manager|boss|teacher|client|customer|colleague|friend|neighbor|chef|family|brother|sister|mother|father|guest|visitor|tourist|tourists?|delegation|department|partner|supplier)$/);
    return {
      ru: `"To" показывает адресата передачи: "${trimmed}" - тот, кому что-то передают, отправляют или говорят. Это конструкция глагола передачи + "to".`,
      uk: `"To" показує адресата передачі: "${trimmed}" - той, кому щось передають, надсилають або говорять. Це конструкція дієслова передачі + "to".`,
      es: `«${trimmed}»: «to» señala destinatario de entrega o mensaje (patrón verbo de transferencia + «to»).`,
      level: 'context',
    };
  }

  if (preposition === 'to' && movementVerbs.test(normalized)) {
    return {
      ru: `"To" показывает направление к цели: "${chunk}" отвечает на вопрос "куда?". Во фразе есть движение или отправка к месту/человеку.`,
      uk: `"To" показує напрям до цілі: "${chunk}" відповідає на питання "куди?". У фразі є рух або надсилання до місця/людини.`,
      es: `«${chunk}» con «to» orienta el movimiento o envío hacia meta espacial o interlocutor («adónde»).`,
      level: 'context',
    };
  }

  if (preposition === 'from' && movementVerbs.test(normalized)) {
    return {
      ru: `"From" показывает начальную точку движения: "${chunk}" отвечает на вопрос "откуда?". Здесь важно место или источник, от которого начинается действие.`,
      uk: `"From" показує початкову точку руху: "${chunk}" відповідає на питання "звідки?". Тут важливе місце або джерело, від якого починається дія.`,
      es: `«${chunk}»: «from» indica arranque del trayecto o procedencia («de dónde» sale el movimiento).`,
      level: 'context',
    };
  }

  if (preposition === 'during') {
    const eventWords = /\b(meeting|dinner|lunch|breakfast|excursion|conference|class|lecture|lesson|trip|journey|holiday|holidays|vacation|interview|presentation|exam|game|match|concert|party|ceremony|wedding|funeral|festival|war|crisis|earthquake|storm|night|day|year|month|week|summer|winter|spring|fall|autumn)\b/;
    if (eventWords.test(after)) {
      const trimmed = chunkUntil(sentence, 'during', eventWords);
      return {
        ru: `"During" указывает на событие или промежуток, во время которого происходит действие: "${trimmed}" отвечает на вопрос "во время чего?". Поэтому здесь нужен "during", а не "in" или "for".`,
        uk: `"During" вказує на подію або проміжок, під час якого відбувається дія: "${trimmed}" відповідає на питання "під час чого?". Тому тут потрібен "during", а не "in" чи "for".`,
        es: `«${trimmed}» con «during» encaja la acción dentro de un evento o periodo nombrado (no confundir con duración pura «for»).`,
        level: 'context',
      };
    }
  }

  if (preposition === 'of') {
    const possessorWords = /\b(department|company|team|family|group|country|city|world|history|story|book|page|month|year|week|day|night|building|house|room|car|computer|phone|table|wall|end|beginning|start|middle|center|top|bottom|side|edge|part|kind|sort|type|piece|number|amount|kilo|kilos|liter|liters|cup|cups|bottle|bottles|owner|king|queen|president|director|manager|teacher|student|brother|sister|mother|father|wife|husband)\b/;
    if (possessorWords.test(after)) {
      const trimmed = chunkUntil(sentence, 'of', possessorWords);
      return {
        ru: `"Of" связывает два существительных в значении принадлежности: "${trimmed}" - кто-то/что-то относится к другому объекту. По-русски часто переводится родительным падежом.`,
        uk: `"Of" пов'язує два іменники у значенні належності: "${trimmed}" - хтось/щось належить до іншого об'єкта. Українською часто перекладається родовим відмінком.`,
        es: `«${trimmed}» con «of» articula posesión o parte respecto de un conjunto (equivalente a «de» posesivo en español).`,
        level: 'context',
      };
    }
  }

  if (preposition === 'before' && /\bbefore\b\s*[.?!]?$/.test(normalized + ' ')) {
    return {
      ru: '"Before" в конце предложения значит "когда-либо раньше / прежде": здесь говорящий вспоминает о прошлом опыте. Часто используется с perfect tense.',
      uk: '"Before" наприкінці речення означає "колись раніше / перш": тут мовець згадує про минулий досвід. Часто використовується з perfect tense.',
      es: '«Before» al final de la oración remite a «alguna vez antes»; combina a menudo con tiempos perfectos en inglés.',
      level: 'context',
    };
  }

  if (preposition === 'after' && /\bafter\s+(a|an|the)?\s*(meal|dinner|lunch|breakfast|class|lesson|work|school|game|party|meeting|interview|holiday|vacation)\b/.test(normalized)) {
    const trimmed = chunkUntil(sentence, 'after', /^(meal|dinner|lunch|breakfast|class|lesson|work|school|game|party|meeting|interview|holiday|vacation)$/);
    return {
      ru: `"After" указывает событие, после которого происходит действие: "${trimmed}" отвечает на вопрос "после чего?". Здесь важна последовательность во времени.`,
      uk: `"After" вказує подію, після якої відбувається дія: "${trimmed}" відповідає на питання "після чого?". Тут важлива послідовність у часі.`,
      es: `«${trimmed}» encadena dos hitos («después del almuerzo», etc.) señalando orden temporal explícito.`,
      level: 'context',
    };
  }

  const hasChunk = !!chunk && chunk.length > 0 && chunk.toLowerCase() !== preposition.toLowerCase();
  const trim = hasChunk ? chunk : preposition;
  const phraseRu = hasChunk ? `во фразе "${trim}"` : 'здесь';
  const phraseUk = hasChunk ? `у фразі "${trim}"` : 'тут';
  const phraseEs = hasChunk ? `en la expresión «${trim}»` : 'aquí';
  switch (preposition) {
    case 'to':
      return {
        ru: `"To" ${phraseRu} задаёт направление к цели: к месту, человеку или результату. По-русски это часто переводится как "к / в / до".`,
        uk: `"To" ${phraseUk} задає напрям до цілі: до місця, людини або результату. Українською це часто перекладається як "до / у".`,
        es: `"To" ${phraseEs} marca dirección meta hacia lugar, persona o resultado (en español suelen usarse equivalentes de «a», «hacia» o «hasta»).`,
        level: 'context',
      };
    case 'from':
      return {
        ru: `"From" ${phraseRu} указывает на источник или отправную точку: откуда что-то идёт, приходит или берётся.`,
        uk: `"From" ${phraseUk} вказує на джерело або відправну точку: звідки щось іде, приходить або береться.`,
        es: `"From" ${phraseEs} señala origen o punto de partida.`,
        level: 'context',
      };
    case 'with':
      return {
        ru: `"With" ${phraseRu} означает "с": вместе с человеком, предметом или инструментом, с которым выполняется действие.`,
        uk: `"With" ${phraseUk} означає "з": разом з людиною, предметом або інструментом, яким виконується дія.`,
        es: `"With" ${phraseEs} marca compañía o instrumento.`,
        level: 'context',
      };
    case 'of':
      return {
        ru: `"Of" ${phraseRu} связывает два существительных и показывает принадлежность или часть целого. По-русски обычно передаётся родительным падежом.`,
        uk: `"Of" ${phraseUk} пов'язує два іменники й показує належність або частину цілого. Українською зазвичай передається родовим відмінком.`,
        es: `"Of" ${phraseEs} relaciona posesión o parte respecto de un conjunto (equivalente frecuente a «de» en español).`,
        level: 'context',
      };
    case 'for':
      return {
        ru: `"For" ${phraseRu} отвечает на вопрос "для чего / для кого / зачем". Здесь он указывает на цель, пользу или адресата.`,
        uk: `"For" ${phraseUk} відповідає на питання "для чого / для кого / навіщо". Тут він вказує на мету, користь або адресата.`,
        es: `"For" ${phraseEs} orienta finalidad o destinatario práctico.`,
        level: 'context',
      };
    case 'by':
      return {
        ru: `"By" ${phraseRu} показывает способ действия, автора или средство, с помощью которого что-то происходит.`,
        uk: `"By" ${phraseUk} показує спосіб дії, виконавця або засіб, за допомогою якого щось відбувається.`,
        es: `"By" ${phraseEs} marca modo, agente o medio según el contexto.`,
        level: 'context',
      };
    case 'before':
      return {
        ru: `"Before" ${phraseRu} означает "до / перед": одно действие или событие предшествует другому во времени.`,
        uk: `"Before" ${phraseUk} означає "до / перед": одна дія або подія передує іншій у часі.`,
        es: `"Before" ${phraseEs} encadena anterioridad temporal respecto siguiente hecho.`,
        level: 'context',
      };
    case 'after':
      return {
        ru: `"After" ${phraseRu} означает "после": одно действие происходит позже другого во времени или порядке.`,
        uk: `"After" ${phraseUk} означає "після": одна дія відбувається пізніше за іншу у часі чи порядку.`,
        es: `"After" ${phraseEs} marca sucesión posterior.`,
        level: 'context',
      };
    case 'during':
      return {
        ru: `"During" ${phraseRu} означает "во время": действие происходит внутри указанного события или периода.`,
        uk: `"During" ${phraseUk} означає "під час": дія відбувається всередині вказаної події або періоду.`,
        es: `"During" ${phraseEs} sitúa la acción dentro de un evento o de un periodo concreto.`,
        level: 'context',
      };
    case 'under':
      return {
        ru: `"Under" ${phraseRu} означает "под": положение ниже предмета или под его покрытием/контролем.`,
        uk: `"Under" ${phraseUk} означає "під": положення нижче предмета або під його покриттям/контролем.`,
        es: `"Under" ${phraseEs} indica posición «por debajo» o, en sentido figurado, sometimiento o cobertura (protección, control).`,
        level: 'context',
      };
    case 'over':
      return {
        ru: `"Over" ${phraseRu} означает "над / через / поверх": положение выше или движение поперёк предмета.`,
        uk: `"Over" ${phraseUk} означає "над / через / поверх": положення вище або рух упоперек предмета.`,
        es: `"Over" ${phraseEs} marca estar «por encima» de algo o moverse «por encima / al otro lado».`,
        level: 'context',
      };
    case 'above':
      return {
        ru: `"Above" ${phraseRu} означает "выше" по уровню или положению. Важна сама высота относительно объекта, без движения.`,
        uk: `"Above" ${phraseUk} означає "вище" за рівнем або положенням. Важлива сама висота відносно об'єкта, без руху.`,
        es: `"Above" ${phraseEs} expresa mayor altura o nivel respecto del punto de referencia, sin atravesarlo.`,
        level: 'context',
      };
    case 'behind':
      return {
        ru: `"Behind" ${phraseRu} означает "позади / за": предмет или человек находится с задней стороны другого объекта.`,
        uk: `"Behind" ${phraseUk} означає "позаду / за": предмет або людина знаходиться з заднього боку іншого об'єкта.`,
        es: `"Behind" ${phraseEs} ubica algo detrás del frente habitual del objeto de referencia.`,
        level: 'context',
      };
    case 'between':
      return {
        ru: `"Between" ${phraseRu} означает "между" двумя отдельными объектами: что-то находится в промежутке между ними.`,
        uk: `"Between" ${phraseUk} означає "між" двома окремими об'єктами: щось знаходиться у проміжку між ними.`,
        es: `"Between" ${phraseEs} usa dos referencias claras: algo situado «entre» ambas.`,
        level: 'context',
      };
    case 'among':
      return {
        ru: `"Among" ${phraseRu} означает "среди" группы: объект находится внутри множества людей или предметов.`,
        uk: `"Among" ${phraseUk} означає "серед" групи: об'єкт знаходиться всередині множини людей або предметів.`,
        es: `"Among" ${phraseEs} encaja dentro de un grupo plural: «entre» varios.`,
        level: 'context',
      };
    case 'near':
      return {
        ru: `"Near" ${phraseRu} означает "рядом с / недалеко от": важно близкое расстояние, а не прямой контакт.`,
        uk: `"Near" ${phraseUk} означає "поруч із / недалеко від": важлива близька відстань, а не прямий контакт.`,
        es: `"Near" ${phraseEs} marca proximidad sin contacto forzoso.`,
        level: 'context',
      };
    case 'inside':
      return {
        ru: `"Inside" ${phraseRu} прямо подчёркивает нахождение во внутренней части объекта или помещения. Сильнее, чем "in".`,
        uk: `"Inside" ${phraseUk} прямо підкреслює перебування у внутрішній частині об'єкта чи приміщення. Сильніший за "in".`,
        es: `"Inside" ${phraseEs} refuerza «en el interior» (con más fuerza semántica que «in» en muchos ejemplos).`,
        level: 'context',
      };
    case 'outside':
      return {
        ru: `"Outside" ${phraseRu} означает "снаружи / вне": предмет или человек находится не внутри, а за пределами места.`,
        uk: `"Outside" ${phraseUk} означає "ззовні / поза": предмет або людина знаходиться не всередині, а за межами місця.`,
        es: `"Outside" ${phraseEs} marca exterioridad.`,
        level: 'context',
      };
    case 'opposite':
      return {
        ru: `"Opposite" ${phraseRu} означает "напротив": два объекта находятся лицом друг к другу или по разные стороны.`,
        uk: `"Opposite" ${phraseUk} означає "навпроти": два об'єкти знаходяться один навпроти одного або по різні боки.`,
        es: `"Opposite" ${phraseEs} indica «enfrente», del otro lado de la vía o del espacio compartido.`,
        level: 'context',
      };
    case 'around':
      return {
        ru: `"Around" ${phraseRu} означает "вокруг / по периметру" либо "примерно". В этой фразе он показывает охват или приблизительное значение.`,
        uk: `"Around" ${phraseUk} означає "навколо / по периметру" або "приблизно". У цій фразі він показує охоплення чи приблизне значення.`,
        es: `"Around" ${phraseEs} sirve para «alrededor» (perímetro) o para cantidades aproximadas («unos…»).`,
        level: 'context',
      };
    case 'across':
      return {
        ru: `"Across" ${phraseRu} означает "через / поперёк": переход с одной стороны на другую через пространство.`,
        uk: `"Across" ${phraseUk} означає "через / упоперек": перехід з одного боку на інший через простір.`,
        es: `"Across" ${phraseEs} describe cruzar de un lado al otro (calle, plaza, superficie).`,
        level: 'context',
      };
    case 'through':
      return {
        ru: `"Through" ${phraseRu} означает движение "сквозь / через внутренность": важно пройти внутри объекта от начала до конца.`,
        uk: `"Through" ${phraseUk} означає рух "крізь / через середину": важливо пройти всередині об'єкта від початку до кінця.`,
        es: `"Through" ${phraseEs} suele expresar atravesar el interior y salir por el otro lado.`,
        level: 'context',
      };
    case 'along':
      return {
        ru: `"Along" ${phraseRu} означает движение или расположение вдоль протяжённого объекта: улица, река, граница.`,
        uk: `"Along" ${phraseUk} означає рух або розташування вздовж протяжного об'єкта: вулиця, річка, межа.`,
        es: `"Along" ${phraseEs} describe paralelismo a eje longitudinal.`,
        level: 'context',
      };
    case 'against':
      return {
        ru: `"Against" ${phraseRu} означает "против" или контакт впритык к поверхности: показывает сопротивление либо опору.`,
        uk: `"Against" ${phraseUk} означає "проти" або контакт упритул до поверхні: показує опір або опору.`,
        es: `"Against" ${phraseEs} señala oposición o contacto adhesivo.`,
        level: 'context',
      };
    case 'without':
      return {
        ru: `"Without" ${phraseRu} означает "без": действие происходит при отсутствии указанного человека, предмета или условия.`,
        uk: `"Without" ${phraseUk} означає "без": дія відбувається за відсутності вказаної людини, предмета або умови.`,
        es: `"Without" ${phraseEs} indica ausencia de persona, objeto o condición.`,
        level: 'context',
      };
    case 'off':
      return {
        ru: `"Off" ${phraseRu} показывает отделение, снятие или удаление от поверхности: "прочь / не на".`,
        uk: `"Off" ${phraseUk} показує відокремлення, зняття або віддалення від поверхні: "геть / не на".`,
        es: `"Off" ${phraseEs} en verbos frasales expresa separar, quitar, apagar… según el verbo base.`,
        level: 'context',
      };
    case 'up':
      return {
        ru: `"Up" ${phraseRu} показывает движение вверх либо завершённость действия в составе фразового глагола.`,
        uk: `"Up" ${phraseUk} показує рух угору або завершеність дії у складі фразового дієслова.`,
        es: `"Up" ${phraseEs} indica dirección ascendente o partícula fija en el verbo frasal («wake up», etc.).`,
        level: 'context',
      };
    case 'down':
      return {
        ru: `"Down" ${phraseRu} показывает движение вниз или снижение: направление либо уменьшение значения.`,
        uk: `"Down" ${phraseUk} показує рух униз або зниження: напрям або зменшення значення.`,
        es: `"Down" ${phraseEs} indica bajar, disminuir o partícula de verbos frasales («calm down», etc.).`,
        level: 'context',
      };
    case 'out':
      return {
        ru: `"Out" ${phraseRu} показывает движение наружу или результат "вне": действие выводит что-то изнутри.`,
        uk: `"Out" ${phraseUk} показує рух назовні або результат "поза": дія виводить щось зсередини.`,
        es: `"Out" ${phraseEs} expresa exteriorización o componente verbal compuesto.`,
        level: 'context',
      };
    case 'at':
      return {
        ru: `"At" ${phraseRu} указывает на конкретную точку: место как пункт, момент времени или цель действия.`,
        uk: `"At" ${phraseUk} вказує на конкретну точку: місце як пункт, момент часу або ціль дії.`,
        es: `"At" ${phraseEs} fija un punto en espacio, tiempo o foco de la acción.`,
        level: 'context',
      };
    case 'on':
      return {
        ru: `"On" ${phraseRu} показывает контакт с поверхностью или связь с конкретным днём/носителем. Между предметом и опорой есть прямой контакт.`,
        uk: `"On" ${phraseUk} показує контакт із поверхнею або зв'язок з конкретним днем/носієм. Між предметом і опорою є прямий контакт.`,
        es: `"On" ${phraseEs} expresa contacto con superficie o fijación a día/medio («on TV», «on Monday»…).`,
        level: 'context',
      };
    case 'in':
      return {
        ru: `"In" ${phraseRu} показывает нахождение внутри объёма, области или периода. Действие или предмет находится в пределах указанного пространства.`,
        uk: `"In" ${phraseUk} показує перебування всередині об'єму, області або періоду. Дія або предмет знаходиться в межах вказаного простору.`,
        es: `"In" ${phraseEs} sitúa dentro de un volumen, ámbito o periodo.`,
        level: 'context',
      };
    default:
      return null;
  }
}

export function explainPrepositionChoice(preposition: string, sentence: string): Explanation {
  const answer = preposition.trim().toLowerCase();

  const overrideKey = makeOverrideKey(sentence, answer);
  const override = overrideKey ? PREPOSITION_OVERRIDES[overrideKey] : undefined;
  if (override) {
    return { ru: override.ru, uk: override.uk, es: override.es, level: 'specific' };
  }

  const matched = ruleFor(answer, sentence);
  if (matched) return matched;

  const chunk = phraseAfter(sentence, answer);
  const trim = chunk && chunk.length > 0 ? chunk : answer;
  return {
    ru: `Здесь нужен предлог "${answer}" в сочетании "${trim}". Именно он передаёт нужное отношение между словами этой фразы; сравни смысл всей конструкции, а не отдельный перевод.`,
    uk: `Тут потрібен прийменник "${answer}" у сполученні "${trim}". Саме він передає потрібне відношення між словами цієї фрази; порівнюй зміст усієї конструкції, а не окремий переклад.`,
    es: `En esta frase corresponde la preposición «${answer}» en la colocación «${trim}». Es esa relación léxica y no un sustituto cualquiera; valora el significado global, no sólo una traducción palabra por palabra.`,
    level: 'context',
  };
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
