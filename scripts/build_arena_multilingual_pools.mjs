import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const TARGETS = ['es', 'fr', 'de', 'it'];
const QUOTAS = Object.freeze({
  'fill_gap:1': 160, 'fill_gap:2': 180, 'fill_gap:3': 160,
  'find_oddity:1': 110, 'find_oddity:2': 205, 'find_oddity:3': 0,
  'guess_phrase:1': 470, 'guess_phrase:2': 554, 'guess_phrase:3': 469,
  'speed_match:1': 60, 'speed_match:2': 70, 'speed_match:3': 62,
  'translate_build:1': 400, 'translate_build:2': 700, 'translate_build:3': 400,
});
const REQUIRED = 4000;
const MAX_SPEED_MATCH_PAIR_SURFACE_REUSE = 24;
const DIFFICULTY_PROFILE = Object.freeze({
  1: { lexicalLimit: 20, timeLimit: 0, frameComplexity: 'core_single_clause_no_adjunct' },
  2: { lexicalLimit: 20, timeLimit: 12, frameComplexity: 'single_clause_with_one_adjunct' },
  3: { lexicalLimit: 20, timeLimit: 20, frameComplexity: 'longer_clause_with_two_adjuncts' },
});
const IT_DIFFICULTY_PROFILE = Object.freeze({
  1: { lexicalLimit: 20, timeLimit: 4, frameComplexity: 'core_single_clause_short_context' },
  2: DIFFICULTY_PROFILE[2],
  3: DIFFICULTY_PROFILE[3],
});
const SHORT_CONTEXT_DIFFICULTY_PROFILE = Object.freeze({
  1: { lexicalLimit: 20, timeLimit: 2, frameComplexity: 'core_single_clause_short_context' },
  2: DIFFICULTY_PROFILE[2],
  3: DIFFICULTY_PROFILE[3],
});
const DIFFICULTY3_MODIFIER = Object.freeze({
  es: Object.freeze({ ser: ['realmente', 'действительно'], estar: ['todavía', 'всё ещё'], tener: ['también', 'тоже'] }),
  fr: Object.freeze({ 'être': ['vraiment', 'действительно'], avoir: ['aussi', 'тоже'], aller: ['aussi', 'тоже'] }),
  de: Object.freeze({ sein: ['wirklich', 'действительно'], haben: ['noch', 'ещё'], gehen: ['auch', 'тоже'] }),
  it: Object.freeze({ essere: ['davvero', 'действительно'], avere: ['anche', 'тоже'], andare: ['anche', 'тоже'] }),
});
const lex = (target, ru) => target.map((text, index) => ({ text, ru: ru[index] }));
function spanishPluralAdjective(value) {
  if (value === 'feliz') return 'felices';
  if (value === 'joven') return 'jóvenes';
  if (value.endsWith('or')) return `${value}es`;
  return value.endsWith('o') || value.endsWith('e') || value.endsWith('a') ? `${value}s` : value;
}
const RU_PLURAL_ADJECTIVES = Object.freeze({
  счастлив: 'счастливы', устал: 'устали', готов: 'готовы', спокоен: 'спокойны', занят: 'заняты', доволен: 'довольны', болен: 'больны', свободен: 'свободны', силён: 'сильны', надёжен: 'надёжны', молод: 'молоды', серьёзен: 'серьёзны', добр: 'добры', дружелюбен: 'дружелюбны', нервен: 'нервны', один: 'одни', 'один, без компании': 'одни, без компании', уверен: 'уверены', горд: 'горды', активен: 'активны', любопытен: 'любопытны', терпелив: 'терпеливы', внимателен: 'внимательны', умён: 'умны', трудолюбив: 'трудолюбивы', креативен: 'креативны', реалист: 'реалисты', честен: 'честны', щедр: 'щедры', смел: 'смелы', ответственен: 'ответственны', осторожен: 'осторожны', оптимистичен: 'оптимистичны', общителен: 'общительны', искренен: 'искренни', обеспокоен: 'обеспокоены', скучаю: 'скучаем', удивлён: 'удивлены', заинтересован: 'заинтересованы', бодр: 'бодры', потерян: 'потеряны', расслаблен: 'расслаблены', растерян: 'растеряны', зол: 'злы',
});
function ruAdjective(value, subject) { return subject === 'Мы' ? (RU_PLURAL_ADJECTIVES[value] ?? value) : value; }
function russianPrompt(kind, x) {
  const subject = x.subject[1]; const time = x.time.ru ? ` ${x.time.ru}` : '';
  const modifier = x.modifier.ru ? ` ${x.modifier.ru}` : '';
  if (kind === 'adjective') {
    const trailingContexts = new Set([
      'во многих ситуациях', 'в повседневной жизни', 'в трудные моменты', 'под давлением', 'в целом',
      'в этой группе', 'для этой должности', 'в нашей команде', 'в этом сообществе', 'в этом классе',
      'в этой профессии', 'в этом секторе', 'в этой компании', 'в этом районе', 'в этом клубе',
      'на этом обучении', 'для этой ответственности', 'для этой роли', 'среди участников',
      'в этом отделе', 'в этой команде', 'на этом курсе', 'среди кандидатов', 'на этом уровне',
      'для этой функции',
      'в этой группе', 'для этой должности', 'в нашей команде', 'в этом сообществе',
      'в этом классе', 'в этой профессии', 'в этой отрасли', 'в этой компании',
      'в этом районе', 'в этом клубе', 'на этом обучении', 'для этой ответственности',
      'для этой роли', 'среди участников', 'в этом отделе', 'в этой команде',
      'на этом курсе', 'среди кандидатов', 'на этом уровне', 'для этой функции',
    ]);
    if (x.time.ru === 'когда это нужно') return `${subject}${modifier} ${ruAdjective(x.adjective.ru, subject)}, когда это нужно.`;
    if (trailingContexts.has(x.time.ru)) return `${subject}${modifier} ${ruAdjective(x.adjective.ru, subject)} ${x.time.ru}.`;
    const adjectiveTime = x.time.ru === 'как правило' ? ', как правило,' : time;
    return `${subject}${adjectiveTime}${modifier} ${ruAdjective(x.adjective.ru, subject)}.`;
  }
  if (kind === 'location') return `${subject}${time}${modifier} ${{ Я: 'нахожусь', Ты: 'находишься', Он: 'находится', Мы: 'находимся' }[subject]} ${x.atPlace.ru}.`;
  if (kind === 'possession') {
    const owner = { Я: 'У меня', Ты: 'У тебя', Он: 'У него', Мы: 'У нас' }[subject];
    if (x.time.ru === 'скоро') return `Скоро ${owner.toLocaleLowerCase()} ${x.noun.ru}.`;
    if (x.time.ru === 'позже') return `Позже ${owner.toLocaleLowerCase()} ${x.noun.ru}.`;
    if (x.fact?.lemma === 'haben' && x.noun.text === 'ein Termin') return `${owner}${time}${modifier} ${x.noun.ru}.`;
    return `${owner}${time}${modifier} есть ${x.noun.ru}.`;
  }
  const habitual = /^(?:по |летом$|зимой$|весной$|осенью$|каждый день$|часто$|регулярно$|обычно$)/u.test(x.time.ru);
  const movement = habitual
    ? { Я: 'хожу', Ты: 'ходишь', Он: 'ходит', Мы: 'ходим' }
    : { Я: 'иду', Ты: 'идёшь', Он: 'идёт', Мы: 'идём' };
  return `${subject}${time}${modifier} ${movement[subject]} ${x.goPlace.ru}.`;
}
function frenchPluralAdjective(value) {
  return ({ heureux: 'heureux', fatigué: 'fatigués', prêt: 'prêts', calme: 'calmes', occupé: 'occupés', content: 'contents', malade: 'malades', libre: 'libres', fort: 'forts', jeune: 'jeunes', sérieux: 'sérieux', gentil: 'gentils', nerveux: 'nerveux', seul: 'seuls', sûr: 'sûrs', fier: 'fiers', actif: 'actifs', curieux: 'curieux', patient: 'patients', attentif: 'attentifs' })[value] ?? value;
}
function germanAccusativeNoun(value) {
  return ({ 'ein Freund': 'einen Freund', 'ein Hund': 'einen Hund', 'ein Bleistift': 'einen Bleistift', 'ein Mantel': 'einen Mantel', 'ein Plan': 'einen Plan', 'ein Traum': 'einen Traum', 'ein Termin': 'einen Termin' })[value] ?? value;
}
function italianPluralAdjective(value) {
  if (value.endsWith('ista')) return `${value.slice(0, -4)}isti`;
  if (value === 'serio') return 'seri';
  if (value.endsWith('o')) return `${value.slice(0, -1)}i`;
  if (value.endsWith('e')) return `${value.slice(0, -1)}i`;
  return value;
}

// Language-specific declarative lexical inventories and natural render families.
// English contributes neither vocabulary nor grammar.
const LANG = Object.freeze({
  es: {
    subject: { presente_1sg: ['Yo', 'Я'], presente_2sg: ['Tú', 'Ты'], presente_3sg: ['Él', 'Он'], presente_1pl: ['Nosotros', 'Мы'] },
    adjectiveByLemma: {
      ser: lex(['fuerte','joven','serio','amable','sincero','activo','curioso','paciente','atento','inteligente','trabajador','creativo','honesto','generoso','valiente','responsable','prudente','optimista','realista','sociable'], ['силён','молод','серьёзен','добр','искренен','активен','любопытен','терпелив','внимателен','умён','трудолюбив','креативен','честен','щедр','смел','ответственен','осторожен','оптимистичен','реалист','общителен']),
      estar: lex(['feliz','cansado','listo','tranquilo','ocupado','contento','enfermo','libre','nervioso','solo','orgulloso','preocupado','aburrido','sorprendido','interesado','despierto','perdido','relajado','confundido','enfadado'], ['счастлив','устал','готов','спокоен','занят','доволен','болен','свободен','нервен','один','горд','обеспокоен','скучаю','удивлён','заинтересован','бодр','потерян','расслаблен','растерян','зол']),
    },
    noun: lex(['una cita','una reunión','una clase','un examen','una visita','una llamada','una entrevista','una reserva','un viaje','un turno','un encuentro','una fecha límite','una entrega','una presentación','un entrenamiento','una prueba','un curso','un concierto','una cena','un compromiso'], ['приём','совещание','занятие','экзамен','визит','звонок','собеседование','бронь','поездка','смена','встреча','крайний срок','сдача работы','презентация','тренировка','испытание','курс','концерт','ужин','важное дело']),
    goPlace: lex(['al parque','a la escuela','a la tienda','a la oficina','al restaurante','al museo','al cine','al mercado','al banco','al hospital','a la estación','a la biblioteca','a la playa','al centro','al aeropuerto','al hotel','al gimnasio','al teatro','al jardín','a la universidad'], ['в парк','в школу','в магазин','в офис','в ресторан','в музей','в кино','на рынок','в банк','в больницу','на станцию','в библиотеку','на пляж','в центр','в аэропорт','в отель','в спортзал','в театр','в сад','в университет']),
    atPlace: lex(['en casa','en la escuela','en la tienda','en la oficina','en el restaurante','en el museo','en el cine','en el mercado','en el banco','en el hospital','en la estación','en la biblioteca','en la playa','en el centro','en el aeropuerto','en el hotel','en el gimnasio','en el teatro','en el jardín','en la universidad'], ['дома','в школе','в магазине','в офисе','в ресторане','в музее','в кинотеатре','на рынке','в банке','в больнице','на станции','в библиотеке','на пляже','в центре','в аэропорту','в отеле','в спортзале','в театре','в саду','в университете']),
    time: lex(['hoy','ahora','esta mañana','esta tarde','esta noche','los lunes','los martes','los miércoles','los jueves','los viernes','en verano','en invierno','en primavera','en otoño','cada día','este mes','esta semana','mañana','temprano','tarde'], ['сегодня','сейчас','этим утром','сегодня днём','этой ночью','по понедельникам','по вторникам','по средам','по четвергам','по пятницам','летом','зимой','весной','осенью','каждый день','в этом месяце','на этой неделе','завтра','рано','поздно']),
    shortContextByLemma: {
      ser: lex(['muy', 'bastante'], ['очень', 'довольно']),
      estar: lex(['ya', 'aún'], ['уже', 'ещё']),
      tener: lex(['pronto', 'más tarde'], ['скоро', 'позже']),
      ir: lex(['pronto', 'siempre'], ['скоро', 'всегда']),
    },
    render(fact, x) {
      if (fact.lemma === 'ser') {
        const adjective = x.subject[0] === 'Nosotros' ? spanishPluralAdjective(x.adjective.text) : x.adjective.text;
        const shortIntensity = ['muy', 'bastante'].includes(x.time.text) ? `${x.time.text} ` : '';
        const trailingTime = shortIntensity ? '' : (x.time.text ? ` ${x.time.text}` : '');
        return [`${x.subject[0]} `, ` ${x.modifier.text ? `${x.modifier.text} ` : ''}${shortIntensity}${adjective}${trailingTime}.`, russianPrompt('adjective', x)];
      }
      if (fact.lemma === 'estar') {
        if (x.time.text === 'ahora' && x.modifier.text === 'todavía') return [`${x.subject[0]} ahora `, ` todavía ${x.atPlace.text}.`, russianPrompt('location', x)];
        if (!x.modifier.text && ['ya', 'aún'].includes(x.time.text)) return [`${x.subject[0]} ${x.time.text} `, ` ${x.atPlace.text}.`, russianPrompt('location', x)];
        return [`${x.subject[0]} `, ` ${x.modifier.text ? `${x.modifier.text} ` : ''}${x.atPlace.text}${x.time.text ? ` ${x.time.text}` : ''}.`, russianPrompt('location', x)];
      }
      if (fact.lemma === 'tener') {
        const frontAlso = x.modifier.text === 'también' || x.time.text === 'también';
        const trailingTime = x.time.text && x.time.text !== 'también' ? ` ${x.time.text}` : '';
        return [`${x.subject[0]} ${frontAlso ? 'también ' : ''}`, ` ${x.noun.text}${trailingTime}.`, russianPrompt('possession', x)];
      }
      return [`${x.subject[0]} `, ` ${x.goPlace.text}${x.time.text ? ` ${x.time.text}` : ''}.`, russianPrompt('go', x)];
    },
  },
  fr: {
    subject: { present_1sg: ['Je', 'Я'], present_2sg: ['Tu', 'Ты'], present_3sg: ['Il', 'Он'], present_1pl: ['Nous', 'Мы'] },
    adjective: lex(['heureux','fatigué','prêt','calme','occupé','content','malade','libre','fort','jeune','sérieux','gentil','nerveux','seul','sûr','fier','actif','curieux','patient','attentif'], ['счастлив','устал','готов','спокоен','занят','доволен','болен','свободен','силён','молод','серьёзен','добр','нервен','один, без компании','уверен','горд','активен','любопытен','терпелив','внимателен']),
    noun: lex(['un rendez-vous','une réunion','un cours','un examen','une visite','un appel','un entretien','une réservation','un voyage','une permanence','une rencontre','une échéance','une livraison','une présentation','un entraînement','une épreuve','une formation','un concert','un dîner','une consultation'], ['приём','совещание','занятие','экзамен','визит','звонок','собеседование','бронь','поездка','дежурство','встреча','крайний срок','доставка','презентация','тренировка','испытание','курс','концерт','ужин','консультация']),
    goPlace: lex(['au parc',"à l'école",'au magasin','au bureau','au restaurant','au musée','au cinéma','au marché','à la banque',"à l'hôpital",'à la gare','à la bibliothèque','à la plage','au centre','à l’aéroport',"à l'hôtel",'à la salle','au théâtre','au jardin',"à l'université"], ['в парк','в школу','в магазин','в офис','в ресторан','в музей','в кино','на рынок','в банк','в больницу','на вокзал','в библиотеку','на пляж','в центр','в аэропорт','в отель','в зал','в театр','в сад','в университет']),
    time: lex(["aujourd'hui",'maintenant','ce matin',"cet après-midi",'ce soir','le lundi','le mardi','le mercredi','le jeudi','le vendredi','en été','en hiver','au printemps',"en automne",'chaque jour','ce mois-ci','cette semaine','demain','tôt','tard'], ['сегодня','сейчас','этим утром','сегодня днём','этим вечером','по понедельникам','по вторникам','по средам','по четвергам','по пятницам','летом','зимой','весной','осенью','каждый день','в этом месяце','на этой неделе','завтра','рано','поздно']),
    shortContextByLemma: {
      'être': lex(['très', 'assez'], ['очень', 'довольно']),
      avoir: lex(['bientôt', 'plus tard'], ['скоро', 'позже']),
      aller: lex(['vite', 'souvent'], ['быстро', 'часто']),
    },
    render(fact, x) {
      const prefix = fact.lemma === 'avoir' && x.subject[0] === 'Je' && fact.target === 'ai' ? "J'" : `${x.subject[0]} `;
      if (fact.lemma === 'être') {
        const adjective = x.subject[0] === 'Nous' ? frenchPluralAdjective(x.adjective.text) : x.adjective.text;
        const shortIntensity = ['très', 'assez'].includes(x.time.text) ? `${x.time.text} ` : '';
        const trailingTime = shortIntensity ? '' : (x.time.text ? ` ${x.time.text}` : '');
        return [prefix, ` ${x.modifier.text ? `${x.modifier.text} ` : ''}${shortIntensity}${adjective}${trailingTime}.`, russianPrompt('adjective', x)];
      }
      if (fact.lemma === 'avoir') {
        if (!x.modifier.text && x.time.text === 'bientôt') return [prefix, ` bientôt ${x.noun.text}.`, russianPrompt('possession', x)];
        return [prefix, ` ${x.modifier.text ? `${x.modifier.text} ` : ''}${x.noun.text}${x.time.text ? ` ${x.time.text}` : ''}.`, russianPrompt('possession', x)];
      }
      const shortMovementAdverb = ['vite', 'souvent'].includes(x.time.text) ? `${x.time.text} ` : '';
      const trailingTime = shortMovementAdverb ? '' : (x.time.text ? ` ${x.time.text}` : '');
      return [prefix, ` ${x.modifier.text ? `${x.modifier.text} ` : ''}${shortMovementAdverb}${x.goPlace.text}${trailingTime}.`, russianPrompt('go', x)];
    },
  },
  de: {
    subject: { praesens_1sg: ['Ich', 'Я'], praesens_2sg: ['Du', 'Ты'], praesens_3sg: ['Er', 'Он'], praesens_1pl: ['Wir', 'Мы'] },
    adjective: lex(['glücklich','müde','bereit','ruhig','beschäftigt','zufrieden','krank','frei','stark','jung','ernst','freundlich','nervös','allein','sicher','stolz','aktiv','neugierig','geduldig','aufmerksam'], ['счастлив','устал','готов','спокоен','занят','доволен','болен','свободен','силён','молод','серьёзен','дружелюбен','нервен','один, без компании','уверен','горд','активен','любопытен','терпелив','внимателен']),
    noun: lex(['ein Buch','ein Foto','ein Problem','ein Termin','ein Auto','ein Haus','ein Glas','ein Ticket','ein Heft','ein Geschenk','ein Freund','eine Nachricht','ein Fahrrad','ein Hund','ein Bleistift','ein Mantel','ein Plan','eine Aufgabe','eine Minute','ein Traum'], ['книга','фото','проблема','приём','машина','дом','стакан','билет','тетрадь','подарок','друг','сообщение','велосипед','собака','карандаш','пальто','план','задание','минута','мечта']),
    goPlace: lex(['in den Park','in die Schule','in den Laden','ins Büro','ins Restaurant','ins Museum','ins Kino','zum Markt','zur Bank','ins Krankenhaus','zum Bahnhof','in die Bibliothek','an den Strand','ins Zentrum','zum Flughafen','ins Hotel','ins Fitnessstudio','ins Theater','in den Garten','zur Universität'], ['в парк','в школу','в магазин','в офис','в ресторан','в музей','в кино','на рынок','в банк','в больницу','на вокзал','в библиотеку','на пляж','в центр','в аэропорт','в отель','в спортзал','в театр','в сад','в университет']),
    time: lex(['heute','jetzt','heute Morgen','heute Nachmittag','heute Abend','montags','dienstags','mittwochs','donnerstags','freitags','im Sommer','im Winter','im Frühling','im Herbst','jeden Tag','diesen Monat','diese Woche','morgen','früh','spät'], ['сегодня','сейчас','этим утром','сегодня днём','этим вечером','по понедельникам','по вторникам','по средам','по четвергам','по пятницам','летом','зимой','весной','осенью','каждый день','в этом месяце','на этой неделе','завтра','рано','поздно']),
    shortContextByLemma: {
      sein: lex(['sehr', 'ziemlich'], ['очень', 'довольно']),
      haben: lex(['hier', 'dort'], ['здесь', 'там']),
      gehen: lex(['oft', 'gern'], ['часто', 'охотно']),
    },
    render(fact, x) {
      if (fact.lemma === 'sein') {
        const isAgeContext = x.adjective.text === 'jung' && /^(?:in |für |unter |auf )/u.test(x.time.text);
        const beforeAdjective = isAgeContext ? '' : (x.time.text ? ` ${x.time.text}` : '');
        const afterAdjective = isAgeContext ? ` ${x.time.text}` : '';
        return [`${x.subject[0]} `, `${beforeAdjective}${x.modifier.text ? ` ${x.modifier.text}` : ''} ${x.adjective.text}${afterAdjective}.`, russianPrompt('adjective', x)];
      }
      if (fact.lemma === 'haben') return [`${x.subject[0]} `, `${x.time.text ? ` ${x.time.text}` : ''}${x.modifier.text ? ` ${x.modifier.text}` : ''} ${germanAccusativeNoun(x.noun.text)}.`, russianPrompt('possession', x)];
      return [`${x.subject[0]} `, `${x.time.text ? ` ${x.time.text}` : ''}${x.modifier.text ? ` ${x.modifier.text}` : ''} ${x.goPlace.text}.`, russianPrompt('go', x)];
    },
  },
  it: {
    subject: { presente_1sg: ['Io', 'Я'], presente_2sg: ['Tu', 'Ты'], presente_3sg: ['Lui', 'Он'], presente_1pl: ['Noi', 'Мы'] },
    adjective: lex(['forte','affidabile','serio','gentile','sincero','attivo','curioso','paziente','attento','intelligente','laborioso','creativo','onesto','generoso','coraggioso','responsabile','prudente','ottimista','realista','socievole'], ['силён','надёжен','серьёзен','добр','искренен','активен','любопытен','терпелив','внимателен','умён','трудолюбив','креативен','честен','щедр','смел','ответственен','осторожен','оптимистичен','реалист','общителен']),
    noun: lex(['un appuntamento','una riunione','una lezione','un esame','una visita','una chiamata','un colloquio','una prenotazione','un viaggio','un turno','un incontro','una scadenza','una consegna','una presentazione','un allenamento','una prova','un corso','un concerto','una cena','un impegno'], ['приём','совещание','занятие','экзамен','визит','звонок','собеседование','бронь','поездка','смена','встреча','крайний срок','сдача работы','презентация','тренировка','испытание','курс','концерт','ужин','важное дело']),
    goPlace: lex(['al parco','a scuola','al negozio','in ufficio','al ristorante','al museo','al cinema','al mercato','in banca','in ospedale','alla stazione','in biblioteca','in spiaggia','in centro',"all'aeroporto",'in albergo','in palestra','a teatro','in giardino',"all'università"], ['в парк','в школу','в магазин','в офис','в ресторан','в музей','в кино','на рынок','в банк','в больницу','на станцию','в библиотеку','на пляж','в центр','в аэропорт','в отель','в спортзал','в театр','в сад','в университет']),
    time: lex(['oggi','adesso','stamattina','questo pomeriggio','stasera','il lunedì','il martedì','il mercoledì','il giovedì','il venerdì','in estate','in inverno','in primavera','in autunno','ogni giorno','questo mese','questa settimana','domani','presto','tardi'], ['сегодня','сейчас','этим утром','сегодня днём','этим вечером','по понедельникам','по вторникам','по средам','по четвергам','по пятницам','летом','зимой','весной','осенью','каждый день','в этом месяце','на этой неделе','завтра','рано','поздно вечером']),
    essereContext: lex(['in molte situazioni','nella vita quotidiana','quando serve','nei momenti difficili','sotto pressione','in generale'], ['во многих ситуациях','в повседневной жизни','когда это нужно','в трудные моменты','под давлением','в целом']),
    shortContextByLemma: {
      essere: lex(['sempre','spesso','generalmente','normalmente'], ['всегда','часто','как правило','обычно']),
      avere: lex(['oggi','domani','presto','stasera'], ['сегодня','завтра','скоро','этим вечером']),
      andare: lex(['oggi','domani','spesso','regolarmente'], ['сегодня','завтра','часто','регулярно']),
    },
    mediumContextByLemma: {
      essere: lex(['quasi sempre','di solito','in genere','per natura','molto','piuttosto','abbastanza','particolarmente','decisamente','insolitamente','sorprendentemente','estremamente'], ['почти всегда','обычно','в целом','по природе','очень','довольно','достаточно','особенно','определённо','необычно','удивительно','чрезвычайно']),
      avere: lex(['stamattina','questo pomeriggio','questa settimana','questo mese','lunedì','martedì','mercoledì','giovedì','venerdì','domani mattina','la settimana prossima','nel fine settimana'], ['этим утром','сегодня днём','на этой неделе','в этом месяце','в понедельник','во вторник','в среду','в четверг','в пятницу','завтра утром','на следующей неделе','на выходных']),
      andare: lex(['stamattina','questo pomeriggio','stasera','lunedì','martedì','mercoledì','giovedì','venerdì','ogni giorno','questa settimana','nel fine settimana','di solito'], ['этим утром','сегодня днём','этим вечером','в понедельник','во вторник','в среду','в четверг','в пятницу','каждый день','на этой неделе','на выходных','обычно']),
    },
    render(fact, x) {
      if (fact.lemma === 'essere') {
        const adjective = x.subject[0] === 'Noi' ? italianPluralAdjective(x.adjective.text) : x.adjective.text;
        const preAdjectiveContext = [
          'sempre', 'spesso', 'generalmente', 'normalmente',
          'quasi sempre', 'di solito', 'in genere', 'per natura', 'molto', 'piuttosto',
          'abbastanza', 'particolarmente', 'decisamente', 'insolitamente',
          'sorprendentemente', 'estremamente',
        ].includes(x.time.text);
        const beforeAdjective = `${x.modifier.text ? `${x.modifier.text} ` : ''}${preAdjectiveContext ? `${x.time.text} ` : ''}`;
        const afterAdjective = !preAdjectiveContext && x.time.text ? ` ${x.time.text}` : '';
        return [`${x.subject[0]} `, ` ${beforeAdjective}${adjective}${afterAdjective}.`, russianPrompt('adjective', x)];
      }
      if (fact.lemma === 'avere') return [`${x.subject[0]} `, ` ${x.modifier.text ? `${x.modifier.text} ` : ''}${x.noun.text}${x.time.text ? ` ${x.time.text}` : ''}.`, russianPrompt('possession', x)];
      return [`${x.subject[0]} `, ` ${x.modifier.text ? `${x.modifier.text} ` : ''}${x.goPlace.text}${x.time.text ? ` ${x.time.text}` : ''}.`, russianPrompt('go', x)];
    },
  },
});

function canonical(value) { if (value === null || ['boolean','number','string'].includes(typeof value)) return JSON.stringify(value); if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`; return `{${Object.entries(value).sort(([a],[b]) => a.localeCompare(b)).map(([k,v]) => `${JSON.stringify(k)}:${canonical(v)}`).join(',')}}`; }
const sha = (value) => createHash('sha256').update(canonical(value), 'utf8').digest('hex');
const normalize = (value) => typeof value === 'string' ? value.normalize('NFC').replace(/\s+/gu, ' ').trim().toLocaleLowerCase() : Array.isArray(value) ? value.map(normalize) : value && typeof value === 'object' ? Object.fromEntries(Object.entries(value).map(([key,item]) => [key,normalize(item)])) : value;
function outputRoot() { const index = process.argv.indexOf('--output'); return index < 0 ? resolve(ROOT, 'content/arena-multilingual/generated') : resolve(process.argv[index + 1]); }
function load(target) { return JSON.parse(readFileSync(resolve(ROOT, `content/arena-multilingual/${target}/facts.json`), 'utf8')); }
function validate(target, pack) {
  const sourceIds = new Set(pack.sources?.map((source) => source.id));
  const verbLemmas = new Set(pack.facts?.map((fact) => fact.lemma));
  const lexicalLemmas = new Set(pack.lexicalFacts?.map((fact) => fact.lemma));
  const auditedLexicalEvidenceUrl = {
    es: /^https:\/\/dle\.rae\.es\//u,
    fr: /^https:\/\/www\.cnrtl\.fr\/definition\//u,
    de: /^https:\/\/(?:www\.duden\.de\/rechtschreibung\/|www\.dwds\.de\/wb\/)/u,
  }[target];
  const lexicalEvidenceValid = !auditedLexicalEvidenceUrl || pack.lexicalFacts?.every((fact) =>
    fact.valueEvidence?.length === fact.values?.length
    && fact.valueEvidence.every((evidence, index) => evidence.value === fact.values[index]
      && typeof evidence.glossRu === 'string'
      && evidence.glossRu.trim().length > 0
      && ['lexical_entry', 'lexical_entry_plus_preposition_rule'].includes(evidence.evidenceKind)
      && auditedLexicalEvidenceUrl.test(evidence.sourceUrl)
      && evidence.sourceIds?.length > 0
      && evidence.sourceIds.every((id) => sourceIds.has(id))));
  return pack.schemaVersion === 'arena-target-fact-pack-v1'
    && pack.studyTarget === target
    && pack.englishRole === 'structure_only_not_linguistic_authority'
    && pack.lexicalFacts?.length === verbLemmas.size
    && pack.lexicalFacts.every((fact) => fact.id.startsWith(`${target}-`)
      && fact.kind === 'umbrella_lexical_fact'
      && fact.status === 'pending_native_review'
      && fact.values?.length === 20
      && fact.sourceIds?.every((id) => sourceIds.has(id)))
    && [...verbLemmas].every((lemma) => lexicalLemmas.has(lemma))
    && lexicalEvidenceValid
    && pack.facts?.length >= 12
    && pack.facts.every((fact) => fact.id.startsWith(`${target}-`)
      && fact.target
      && fact.sourceRu
      && fact.pos === 'verb'
      && fact.sourceIds?.length
      && fact.sourceIds.every((id) => sourceIds.has(id)));
}
function compatibleTimes(target, lemma) {
  const times = LANG[target].time;
  if (target === 'it' && lemma === 'essere') return LANG.it.essereContext;
  if (target === 'es' && lemma === 'ser') return lex(['por naturaleza', 'en la vida diaria', 'en este grupo', 'en esta comunidad'], ['по природе', 'в повседневной жизни', 'в этой группе', 'в этом сообществе']);
  if (target === 'fr' && lemma === 'être') return times.filter((time) => !/(?:lundi|mardi|mercredi|jeudi|vendredi|chaque jour|en été|en hiver|au printemps|en automne|demain|tôt|tard)/u.test(time.text));
  if ((target === 'de' && lemma === 'sein') || (target === 'it' && lemma === 'essere')) return times.filter((time) => !/(?:montags|dienstags|mittwochs|donnerstags|freitags|lunedì|martedì|mercoledì|giovedì|venerdì|jeden Tag|ogni giorno)/u.test(time.text));
  if (target === 'es' && lemma === 'tener') return times.filter((time) => !/(?:lunes|martes|miércoles|jueves|viernes|cada día|en verano|en invierno|en primavera|en otoño|temprano|tarde|mañana|ahora)/u.test(time.text));
  if (target === 'fr' && lemma === 'avoir') return times.filter((time) => !/(?:lundi|mardi|mercredi|jeudi|vendredi|chaque jour|en été|en hiver|au printemps|en automne|tôt|tard|demain|maintenant)/u.test(time.text));
  if ((target === 'de' && lemma === 'haben') || (target === 'it' && lemma === 'avere')) return times.filter((time) => !/(?:montags|dienstags|mittwochs|donnerstags|freitags|lunedì|martedì|mercoledì|giovedì|venerdì|jeden Tag|ogni giorno|im Sommer|im Winter|im Frühling|im Herbst|in estate|in inverno|in primavera|in autunno|früh|spät|presto|tardi|morgen|domani)/u.test(time.text));
  return times;
}
function frameFactIds(target, pack, x) {
  const lexicalFact = pack.lexicalFacts.find((fact) => fact.lemma === x.fact.lemma);
  if (!lexicalFact) throw new Error(`missing_umbrella_lexical_fact:${target}:${x.fact.lemma}`);
  return [x.fact.id, lexicalFact.id];
}
function frame(target, pack, ordinal, difficulty = 3) {
  const language = LANG[target]; const fact = pack.facts[ordinal % pack.facts.length]; const variant = Math.floor(ordinal / pack.facts.length);
  // Each lemma consumes two real learner-facing axes: lexical item × time.
  // This yields 20 × 20 distinct natural frames per paradigm without serial padding.
  const profile = (target === 'it'
    ? IT_DIFFICULTY_PROFILE
    : (target === 'es' || target === 'fr' || target === 'de') ? SHORT_CONTEXT_DIFFICULTY_PROFILE : DIFFICULTY_PROFILE)[difficulty];
  const compatible = target === 'it' && difficulty === 1
    ? language.shortContextByLemma[fact.lemma]
    : (target === 'es' || target === 'fr' || target === 'de') && difficulty === 1
      ? language.shortContextByLemma[fact.lemma]
    : target === 'it' && difficulty === 2
      ? language.mediumContextByLemma[fact.lemma]
      : compatibleTimes(target, fact.lemma);
  // Italian A1-style rows and the next difficulty use disjoint short-context
  // bands. A task is never made "new" merely by shuffling its answer options.
  const timePool = compatible.slice(0, profile.timeLimit);
  const timeIndex = profile.timeLimit ? Math.floor(variant / profile.lexicalLimit) % timePool.length : 0;
  const baseTime = profile.timeLimit ? timePool[timeIndex] : { text: '', ru: '' };
  const lexicalIndex = variant % profile.lexicalLimit;
  const adjectives = language.adjectiveByLemma?.[fact.lemma] ?? language.adjective ?? language.adjectiveByLemma?.ser;
  const jovenContexts = {
    'en general': { text: 'en este grupo', ru: 'в этой группе' },
    'por naturaleza': { text: 'para este trabajo', ru: 'для этой работы' },
    normalmente: { text: 'en nuestro equipo', ru: 'в нашей команде' },
    'en la vida diaria': { text: 'en esta comunidad', ru: 'в этом сообществе' },
  };
  const jeuneContexts = [
    ['dans ce groupe', 'в этой группе'], ['pour ce poste', 'для этой должности'],
    ['dans notre équipe', 'в нашей команде'], ['dans cette communauté', 'в этом сообществе'],
    ['dans cette classe', 'в этом классе'], ['dans ce métier', 'в этой профессии'],
    ['dans ce secteur', 'в этом секторе'], ['dans cette entreprise', 'в этой компании'],
    ['dans ce quartier', 'в этом районе'], ['dans ce club', 'в этом клубе'],
    ['dans cette formation', 'на этом обучении'], ['pour cette responsabilité', 'для этой ответственности'],
    ['pour ce rôle', 'для этой роли'], ['parmi les participants', 'среди участников'],
    ['dans ce service', 'в этом отделе'], ['dans cette équipe', 'в этой команде'],
    ['dans cette promotion', 'на этом курсе'], ['parmi les candidats', 'среди кандидатов'],
    ['à ce niveau', 'на этом уровне'], ['pour cette fonction', 'для этой функции'],
  ].map(([text, ru]) => ({ text, ru }));
  const jungContexts = [
    ['in dieser Gruppe', 'в этой группе'], ['für diese Stelle', 'для этой должности'],
    ['in unserem Team', 'в нашей команде'], ['in dieser Gemeinschaft', 'в этом сообществе'],
    ['in dieser Klasse', 'в этом классе'], ['in diesem Beruf', 'в этой профессии'],
    ['in dieser Branche', 'в этой отрасли'], ['in diesem Unternehmen', 'в этой компании'],
    ['in diesem Viertel', 'в этом районе'], ['in diesem Verein', 'в этом клубе'],
    ['in dieser Ausbildung', 'на этом обучении'], ['für diese Verantwortung', 'для этой ответственности'],
    ['für diese Rolle', 'для этой роли'], ['unter den Teilnehmenden', 'среди участников'],
    ['in dieser Abteilung', 'в этом отделе'], ['in dieser Mannschaft', 'в этой команде'],
    ['in diesem Jahrgang', 'на этом курсе'], ['unter den Bewerbern', 'среди кандидатов'],
    ['auf diesem Niveau', 'на этом уровне'], ['für diese Funktion', 'для этой функции'],
  ].map(([text, ru]) => ({ text, ru }));
  const seulContexts = lex(['en ce moment', 'ici'], ['сейчас', 'здесь']);
  const alleinContexts = lex(['im Moment', 'hier'], ['сейчас', 'здесь']);
  const terminContexts = lex(['bald', 'später'], ['скоро', 'позже']);
  const noun = language.noun[lexicalIndex];
  let time = target === 'es' && fact.lemma === 'ser' && adjectives[lexicalIndex]?.text === 'joven'
    ? (jovenContexts[baseTime.text] ?? baseTime)
    : target === 'fr' && fact.lemma === 'être' && adjectives[lexicalIndex]?.text === 'jeune' && difficulty !== 1
      ? jeuneContexts[timeIndex % jeuneContexts.length]
    : target === 'fr' && fact.lemma === 'être' && adjectives[lexicalIndex]?.text === 'seul' && difficulty === 1
      ? seulContexts[timeIndex % seulContexts.length]
    : target === 'de' && fact.lemma === 'sein' && adjectives[lexicalIndex]?.text === 'jung' && difficulty !== 1
      ? jungContexts[timeIndex % jungContexts.length]
    : target === 'de' && fact.lemma === 'sein' && adjectives[lexicalIndex]?.text === 'allein' && difficulty === 1
      ? alleinContexts[timeIndex % alleinContexts.length]
    : target === 'de' && fact.lemma === 'haben' && noun?.text === 'ein Termin' && ['hier', 'dort', 'jetzt'].includes(baseTime.text)
      ? terminContexts[timeIndex % terminContexts.length]
    : baseTime;
  const rawModifier = difficulty === 3 ? DIFFICULTY3_MODIFIER[target][fact.lemma] : null;
  const modifier = rawModifier ? { text: rawModifier[0], ru: rawModifier[1] } : { text: '', ru: '' };
  const x = { fact, subject: language.subject[fact.grammar], subjectIndex: Object.keys(language.subject).indexOf(fact.grammar), adjective: adjectives[lexicalIndex], adjectiveIndex: lexicalIndex, noun, nounIndex: lexicalIndex, goPlace: language.goPlace[lexicalIndex], goPlaceIndex: lexicalIndex, atPlace: language.atPlace?.[lexicalIndex], atPlaceIndex: lexicalIndex, time, timeIndex, modifier };
  if (!x.subject) throw new Error(`unsupported_paradigm:${target}:${fact.grammar}`);
  const [prefix, suffix, promptRu] = language.render(fact, x); return { ...x, variant, prefix, suffix, promptRu, sentence: `${prefix}${fact.target}${suffix}`, sourceFactIds: frameFactIds(target, pack, x), difficultyProfile: profile };
}
function paradigm(pack, fact) { const all = pack.facts.filter((item) => item.lemma === fact.lemma); if (all.length !== 4) throw new Error(`four_minimal_twins_required:${fact.lemma}`); return all; }
function choicePayload(target, pack, current) {
  const twins = paradigm(pack, current.fact); const shift = Math.floor(current.variant / current.difficultyProfile.lexicalLimit) % twins.length; const alternatives = [...twins.slice(shift), ...twins.slice(0, shift)]; const options = alternatives.map((fact) => fact.target); const correctIndex = alternatives.findIndex((fact) => fact.id === current.fact.id);
  return { promptRu: current.promptRu, stem: { prefix: current.prefix, suffix: current.suffix }, options, correctIndex, grammarMatrix: { lemma: current.fact.lemma, axis: 'person', subjectGrammar: current.fact.grammar, options: alternatives.map((fact) => ({ token: fact.target, grammatical: fact.id === current.fact.id, reason: fact.id === current.fact.id ? 'matches_subject_person' : 'verb_person_conflicts_with_fixed_subject' })) } };
}
function oddityPayload(target, pack, current) {
  const language = LANG[target]; const optionsFacts = paradigm(pack, current.fact); const invalidIndex = (optionsFacts.findIndex((fact) => fact.id === current.fact.id) + 1) % 4;
  const options = optionsFacts.map((fact, index) => {
    if (index !== invalidIndex) {
      const subject = language.subject[fact.grammar]; const [prefix, suffix] = language.render(fact, { ...current, subject }); return `${prefix}${fact.target}${suffix}`;
    }
    const displayedGrammar = optionsFacts.find((candidate) => candidate.grammar !== fact.grammar && !(target === 'fr' && candidate.grammar === 'present_1sg' && /^[aeiouh]/iu.test(fact.target)))?.grammar;
    const subject = language.subject[displayedGrammar]; const [prefix, suffix] = language.render(fact, { ...current, subject }); return `${prefix}${fact.target}${suffix}`;
  });
  const proof = optionsFacts.map((fact, index) => ({ factId: fact.id, grammatical: index !== invalidIndex, reason: index === invalidIndex ? 'only_error_subject_verb_person_mismatch' : 'subject_verb_person_agree' }));
  return { promptRu: 'Найдите фразу с ошибкой согласования.', options, oddityIndex: invalidIndex, inverseProof: { options: proof } };
}
function learnerPayload(mode, payload) {
  if (mode === 'guess_phrase' || mode === 'fill_gap') return normalize({ mode, promptRu: payload.promptRu, stem: payload.stem, options: payload.options });
  if (mode === 'find_oddity') return normalize({ mode, promptRu: payload.promptRu, options: payload.options });
  if (mode === 'translate_build') return normalize({ mode, promptRu: payload.promptRu, tokenBank: payload.tokenBank });
  return normalize({ mode, promptRu: payload.promptRu, pairs: payload.pairs.map(({ tileLeft, tileRight }) => ({ tileLeft, tileRight })) });
}
function semanticLearnerPayload(mode, payload) {
  if (mode === 'guess_phrase' || mode === 'fill_gap') {
    const correct = payload.options[payload.correctIndex];
    return normalize({ mode, promptRu: payload.promptRu, correctSentence: `${payload.stem.prefix}${correct}${payload.stem.suffix}`, distractors: payload.options.filter((_, index) => index !== payload.correctIndex).sort() });
  }
  if (mode === 'find_oddity') return normalize({ mode, promptRu: payload.promptRu, oddity: payload.options[payload.oddityIndex], grammatical: payload.options.filter((_, index) => index !== payload.oddityIndex).sort() });
  if (mode === 'translate_build') return normalize({ mode, promptRu: payload.promptRu, correctAnswer: payload.correctAnswer, decoy: payload.samePosDecoy.token });
  return normalize({ mode, promptRu: payload.promptRu, pairs: payload.pairs.map(({ tileLeft, tileRight }) => ({ tileLeft, tileRight })).sort((left, right) => `${left.tileLeft}\u0000${left.tileRight}`.localeCompare(`${right.tileLeft}\u0000${right.tileRight}`)) });
}

function lexicalEntriesForFact(target, lexicalFact) {
  const language = LANG[target];
  const entries = lexicalFact.role === 'trait_adjective' || lexicalFact.role === 'adjective'
    ? (language.adjectiveByLemma?.[lexicalFact.lemma] ?? language.adjective)
    : lexicalFact.role === 'location_phrase' ? language.atPlace
      : lexicalFact.role === 'possession_noun_phrase' ? language.noun
        : lexicalFact.role === 'destination_phrase' ? language.goPlace
          : null;
  if (!entries || entries.length !== lexicalFact.values.length) {
    throw new Error(`speed_match_lexicon_size_mismatch:${target}:${lexicalFact.id}`);
  }
  return entries.map((entry, valueIndex) => {
    if (entry.text !== lexicalFact.values[valueIndex]) {
      throw new Error(`speed_match_tile_not_bound:${target}:${lexicalFact.id}:${valueIndex}`);
    }
    return {
      left: entry.ru,
      right: entry.text,
      tileLeft: entry.ru,
      tileRight: entry.text,
      factId: `${lexicalFact.id}:${valueIndex}`,
      senseEvidence: { sourceFactIds: [lexicalFact.id], lemma: lexicalFact.lemma, role: lexicalFact.role },
      tileEvidence: {
      lexicalFactId: lexicalFact.id,
      role: lexicalFact.role,
      sourceIds: lexicalFact.valueEvidence?.[valueIndex]?.sourceIds ?? lexicalFact.sourceIds,
      ...(lexicalFact.valueEvidence?.[valueIndex] ? {
        glossRu: lexicalFact.valueEvidence[valueIndex].glossRu,
        evidenceKind: lexicalFact.valueEvidence[valueIndex].evidenceKind,
        sourceUrl: lexicalFact.valueEvidence[valueIndex].sourceUrl,
      } : {}),
        valueIndex,
      },
    };
  });
}
function speedPairs(target, pack, speedOrdinal) {
  const inventory = pack.lexicalFacts.flatMap((fact) => lexicalEntriesForFact(target, fact));
  const steps = [1, 7, 11, 13];
  const start = speedOrdinal % inventory.length;
  const step = steps[Math.floor(speedOrdinal / inventory.length) % steps.length];
  const indexes = Array.from({ length: 6 }, (_, offset) => (start + offset * step) % inventory.length);
  return indexes.map((index) => inventory[index]);
}
function shuffledTokenBank(correctTokens, decoyToken, ordinal) {
  const tokenBank = [...correctTokens]; let state = (ordinal + 1) * 1103515245;
  for (let index = tokenBank.length - 1; index > 0; index -= 1) {
    state = (state * 1664525 + 1013904223) >>> 0;
    const swapIndex = state % (index + 1); [tokenBank[index], tokenBank[swapIndex]] = [tokenBank[swapIndex], tokenBank[index]];
  }
  if (tokenBank.every((token, index) => token === correctTokens[index])) [tokenBank[0], tokenBank[1]] = [tokenBank[1], tokenBank[0]];
  tokenBank.splice(Math.floor(ordinal / 12) % (correctTokens.length + 1), 0, decoyToken);
  return tokenBank;
}
function makeTask(target, pack, mode, difficulty, ordinal, speedOrdinal = 0) {
  const current = frame(target, pack, ordinal, difficulty); let payload; let distractorReasons; let sourceFactIds = current.sourceFactIds;
  if (mode === 'guess_phrase' || mode === 'fill_gap') { payload = choicePayload(target, pack, current); distractorReasons = payload.grammarMatrix.options.filter((option) => !option.grammatical).map((option) => ({ token: option.token, reason: option.reason })); }
  else if (mode === 'find_oddity') { payload = oddityPayload(target, pack, current); distractorReasons = [{ factId: payload.inverseProof.options[payload.oddityIndex].factId, reason: 'subject_verb_person_mismatch' }]; }
  else if (mode === 'translate_build') { const correctTokens = target === 'fr' && current.sentence.startsWith("J'ai ") ? ["J'", 'ai', ...current.sentence.slice(5).split(' ')] : current.sentence.split(' '); const decoy = paradigm(pack, current.fact).find((fact) => fact.id !== current.fact.id); const tokenBank = shuffledTokenBank(correctTokens, decoy.target, ordinal); const initialDecoyIndex = Math.floor(ordinal / 12) % tokenBank.length; const rotation = Math.floor(current.variant / current.difficultyProfile.lexicalLimit) % tokenBank.length; if (rotation) tokenBank.push(...tokenBank.splice(0, rotation)); const decoyIndex = (initialDecoyIndex - rotation + tokenBank.length) % tokenBank.length; const visibleIndexes = tokenBank.map((_, index) => index).filter((index) => index !== decoyIndex); if (visibleIndexes.every((index, order) => tokenBank[index] === correctTokens[order])) [tokenBank[visibleIndexes[0]], tokenBank[visibleIndexes[1]]] = [tokenBank[visibleIndexes[1]], tokenBank[visibleIndexes[0]]]; payload = { promptRu: current.promptRu, correctAnswer: current.sentence, correctTokens, correctTokenCount: correctTokens.length, samePosDecoy: { factId: decoy.id, pos: decoy.pos, token: decoy.target }, tokenBank, decoyIndex, tokenizationProof: { separator: 'single_space_with_french_elision_split', joined: correctTokens.join(' '), reconstruction: target === 'fr' && correctTokens[0] === "J'" ? "J' + ai => J'ai" : 'identity', decoyCount: 1 } }; sourceFactIds = [...current.sourceFactIds, decoy.id]; distractorReasons = [{ factId: decoy.id, reason: 'same_pos_wrong_person_form' }]; }
  else { const pairs = speedPairs(target, pack, speedOrdinal); payload = { promptRu: 'Соедините русские значения со словами и короткими выражениями.', pairs, bijectionProof: { leftCount: 6, rightCount: 6, unique: true, factIds: pairs.map((pair) => pair.factId), combinationRank: speedOrdinal, tileSource: 'paired_lexicon_bound_to_umbrella_lexical_fact' } }; sourceFactIds = [...new Set(pairs.flatMap((pair) => pair.senseEvidence.sourceFactIds))]; distractorReasons = []; }
  const semanticSignature = sha(semanticLearnerPayload(mode, payload));
  return { schemaVersion: 'arena-multilingual-task-v1', taskId: `arena-${target}-${mode}-${difficulty}-${String(ordinal).padStart(4,'0')}`, studyTarget: target, mode, difficulty, difficultyProfile: current.difficultyProfile, semanticSignature, sourceFactIds, payload, distractorReasons };
}
function build(target, pack) {
  const result = []; let ordinal = 0; let speedOrdinal = 0; for (const [cell, quota] of Object.entries(QUOTAS)) { const [mode, diff] = cell.split(':'); for (let count = 0; count < quota; count += 1) { result.push(makeTask(target, pack, mode, Number(diff), ordinal++, mode === 'speed_match' ? speedOrdinal : 0)); if (mode === 'speed_match') speedOrdinal += 1; } }
  const surface = result.map((task) => canonical(learnerPayload(task.mode, task.payload)));
  const signatureCount = new Set(result.map((task) => task.semanticSignature)).size; const surfaceCount = new Set(surface).size;
  if (result.length !== REQUIRED || signatureCount !== REQUIRED || surfaceCount !== REQUIRED) {
    const seen = new Map(); const duplicate = result.find((task, index) => { const previous = seen.get(surface[index]); if (previous) return true; seen.set(surface[index], task.taskId); return false; });
    throw new Error(`duplicate_learner_surface:${target}:${signatureCount}:${surfaceCount}:${duplicate?.taskId}`);
  }
  const speedPairCounts = new Map();
  for (const task of result.filter((item) => item.mode === 'speed_match')) for (const pair of task.payload.pairs) {
    const key = `${pair.tileLeft}\u0000${pair.tileRight}`;
    speedPairCounts.set(key, (speedPairCounts.get(key) ?? 0) + 1);
  }
  if ([...speedPairCounts.values()].some((count) => count > MAX_SPEED_MATCH_PAIR_SURFACE_REUSE)) throw new Error(`speed_match_pair_source_cap_exceeded:${target}`);
  return result;
}
function write(path, text) { mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, text, 'utf8'); }
function releaseAuthorization(target, pack, tasks) {
  const path = resolve(ROOT, `content/arena-multilingual/${target}/release-authorization.json`);
  if (!existsSync(path)) return null;
  const authorization = JSON.parse(readFileSync(path, 'utf8'));
  const evidencePackSha256 = sha(pack);
  const tasksSha256 = sha(tasks);
  const valid = authorization?.schemaVersion === 'spire-multilingual-release-authorization-v1'
    && authorization.studyTarget === target
    && authorization.verdict === 'PASS'
    && authorization.reviewerIndependence === 'independent_read_only'
    && authorization.reviewerQualification === 'target_language_expert'
    && authorization.linguisticEvidenceStatus === 'approved'
    && authorization.cefrEvidenceStatus === 'not_claimed'
    && authorization.evidencePackSha256 === evidencePackSha256
    && authorization.tasksSha256 === tasksSha256
    && authorization.publicationStatus === 'approved'
    && authorization.publisherRole === 'content_admin'
    && typeof authorization.publicationId === 'string'
    && authorization.publicationId.trim().length > 0;
  if (!valid) throw new Error(`release_authorization_invalid_or_stale:${target}`);
  return authorization;
}
function manifest(target, pack, tasks) {
  const evidencePackSha256 = sha(pack);
  const tasksSha256 = sha(tasks);
  const authorization = releaseAuthorization(target, pack, tasks);
  const release = authorization ? (() => {
    const linguisticReviewBody = {
      schemaVersion: 'spire-multilingual-linguistic-review-v1', studyTarget: target, verdict: 'PASS',
      reviewerIndependence: authorization.reviewerIndependence,
      reviewerQualification: authorization.reviewerQualification,
      linguisticEvidenceStatus: authorization.linguisticEvidenceStatus,
      cefrEvidenceStatus: authorization.cefrEvidenceStatus,
      reviewerRunId: authorization.reviewerRunId,
      reviewedAt: authorization.reviewedAt,
      tasksSha256, evidencePackSha256,
    };
    const linguisticReviewReceipt = { ...linguisticReviewBody, receiptSha256: sha(linguisticReviewBody) };
    const adminPublicationBody = {
      schemaVersion: 'spire-multilingual-admin-publication-v1', studyTarget: target,
      publicationStatus: authorization.publicationStatus,
      publicationId: authorization.publicationId,
      publisherRole: authorization.publisherRole,
      ownerDecision: authorization.ownerDecision,
      tasksSha256,
      linguisticReviewReceiptSha256: linguisticReviewReceipt.receiptSha256,
    };
    return {
      verdict: 'PASS', releaseEligible: true,
      coverageStatus: 'approved',
      linguisticReviewReceipt,
      adminPublicationReceipt: { ...adminPublicationBody, receiptSha256: sha(adminPublicationBody) },
    };
  })() : {
    verdict: 'BLOCK', releaseEligible: false,
    blockReason: 'independent_review_and_admin_publication_required;lexical_facts_pending_native_review',
    coverageStatus: 'pending_native_review',
  };
  const body = {
    schemaVersion: 'arena-multilingual-pool-manifest-v1', studyTarget: target,
    verdict: release.verdict, ...('blockReason' in release ? { blockReason: release.blockReason } : {}),
    releaseEligible: release.releaseEligible, requiredTaskCount: REQUIRED, generatedTaskCount: tasks.length,
    quotas: QUOTAS, evidencePackSha256, tasksSha256,
    semanticLedgerSha256: sha(tasks.map((task) => task.semanticSignature)),
    coverage: { provenFactCount: pack.facts.length, lexicalFactInventoryStatus: release.coverageStatus, cefrEvidenceStatus: 'not_claimed', sourceFactIds: [...pack.facts, ...pack.lexicalFacts].map((fact) => fact.id).sort() },
    ...('linguisticReviewReceipt' in release ? { linguisticReviewReceipt: release.linguisticReviewReceipt, adminPublicationReceipt: release.adminPublicationReceipt } : {}),
    structuralRequirements: { choiceModes: 'one_grammatical_and_three_invalid_same_frame', findOddity: 'three_agree_one_mismatch', translateBuild: 'one_same_pos_decoy_and_tokenization_proof', speedMatch: 'six_short_pairs_from_hash_bound_lexical_inventory', maxSpeedMatchPairSurfaceReuse: MAX_SPEED_MATCH_PAIR_SURFACE_REUSE, learnerSurfaceUniqueness: 'player_visible_fields_only', taskFields: ['studyTarget','difficulty','difficultyProfile','semanticSignature','sourceFactIds','distractorReasons'] },
  };
  return { ...body, manifestSha256: sha(body) };
}
for (const target of TARGETS) { const pack = load(target); if (!validate(target, pack)) throw new Error(`invalid_target_specific_fact_pack:${target}`); const tasks = build(target, pack); const base = resolve(outputRoot(), target); write(resolve(base, 'tasks.jsonl'), `${tasks.map((task) => JSON.stringify(task)).join('\n')}\n`); write(resolve(base, 'manifest.json'), `${JSON.stringify(manifest(target, pack, tasks), null, 2)}\n`); }
