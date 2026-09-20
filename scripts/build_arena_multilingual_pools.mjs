import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const TARGETS = ['es', 'fr', 'de'];
const QUOTAS = Object.freeze({
  'fill_gap:1': 160, 'fill_gap:2': 180, 'fill_gap:3': 160,
  'find_oddity:1': 110, 'find_oddity:2': 205, 'find_oddity:3': 0,
  'guess_phrase:1': 470, 'guess_phrase:2': 554, 'guess_phrase:3': 469,
  'speed_match:1': 60, 'speed_match:2': 70, 'speed_match:3': 62,
  'translate_build:1': 400, 'translate_build:2': 700, 'translate_build:3': 400,
});
const REQUIRED = 4000;
const MAX_SPEED_MATCH_PAIR_SURFACE_REUSE = 3;
const CEFR_BY_DIFFICULTY = Object.freeze({ 1: 'A1', 2: 'A2', 3: 'A2' });
const DIFFICULTY_PROFILE = Object.freeze({
  1: { lexicalLimit: 20, timeLimit: 0, frameComplexity: 'core_single_clause_no_adjunct' },
  2: { lexicalLimit: 20, timeLimit: 12, frameComplexity: 'single_clause_with_one_adjunct' },
  3: { lexicalLimit: 20, timeLimit: 20, frameComplexity: 'longer_a2_clause_with_two_adjuncts' },
});
const lex = (target, ru) => target.map((text, index) => ({ text, ru: ru[index] }));
function spanishPluralAdjective(value) {
  if (value === 'feliz') return 'felices';
  if (value === 'joven') return 'jóvenes';
  if (value.endsWith('or')) return `${value}es`;
  return value.endsWith('o') || value.endsWith('e') || value.endsWith('a') ? `${value}s` : value;
}
const RU_PLURAL_ADJECTIVES = Object.freeze({
  счастлив: 'счастливы', устал: 'устали', готов: 'готовы', спокоен: 'спокойны', занят: 'заняты', доволен: 'довольны', болен: 'больны', свободен: 'свободны', силён: 'сильны', молод: 'молоды', серьёзен: 'серьёзны', добр: 'добры', нервен: 'нервны', один: 'одни', уверен: 'уверены', горд: 'горды', активен: 'активны', любопытен: 'любопытны', терпелив: 'терпеливы', внимателен: 'внимательны', умён: 'умны', трудолюбив: 'трудолюбивы', творческий: 'творческие', честен: 'честны', щедр: 'щедры', смел: 'смелы', ответственен: 'ответственны', осторожен: 'осторожны', оптимистичен: 'оптимистичны', реалистичен: 'реалистичны', общителен: 'общительны', искренен: 'искренни', обеспокоен: 'обеспокоены', скучаю: 'скучаем', удивлён: 'удивлены', заинтересован: 'заинтересованы', бодр: 'бодры', потерян: 'потеряны', расслаблен: 'расслаблены', растерян: 'растеряны', зол: 'злы',
});
function ruAdjective(value, subject) { return subject === 'Мы' ? (RU_PLURAL_ADJECTIVES[value] ?? value) : value; }
function russianPrompt(kind, x) {
  const subject = x.subject[1]; const time = x.time.ru ? ` ${x.time.ru}` : '';
  if (kind === 'adjective') return `${subject}${time} ${ruAdjective(x.adjective.ru, subject)}.`;
  if (kind === 'location') return `${subject}${time} ${{ Я: 'нахожусь', Ты: 'находишься', Он: 'находится', Мы: 'находимся' }[subject]} ${x.atPlace.ru}.`;
  if (kind === 'possession') return `${{ Я: 'У меня', Ты: 'У тебя', Он: 'У него', Мы: 'У нас' }[subject]}${time} есть ${x.noun.ru}.`;
  return `${subject}${time} ${{ Я: 'иду', Ты: 'идёшь', Он: 'идёт', Мы: 'идём' }[subject]} ${x.goPlace.ru}.`;
}
function frenchPluralAdjective(value) {
  return ({ heureux: 'heureux', fatigué: 'fatigués', prêt: 'prêts', calme: 'calmes', occupé: 'occupés', content: 'contents', malade: 'malades', libre: 'libres', fort: 'forts', jeune: 'jeunes', sérieux: 'sérieux', gentil: 'gentils', nerveux: 'nerveux', seul: 'seuls', sûr: 'sûrs', fier: 'fiers', actif: 'actifs', curieux: 'curieux', patient: 'patients', attentif: 'attentifs' })[value] ?? value;
}
function germanAccusativeNoun(value) {
  return ({ 'ein Freund': 'einen Freund', 'ein Hund': 'einen Hund', 'ein Bleistift': 'einen Bleistift', 'ein Mantel': 'einen Mantel', 'ein Plan': 'einen Plan', 'ein Traum': 'einen Traum' })[value] ?? value;
}

// Language-specific declarative lexical inventories and natural render families.
// English contributes neither vocabulary nor grammar.
const LANG = Object.freeze({
  es: {
    subject: { presente_1sg: ['Yo', 'Я'], presente_2sg: ['Tú', 'Ты'], presente_3sg: ['Él', 'Он'], presente_1pl: ['Nosotros', 'Мы'] },
    adjectiveByLemma: {
      ser: lex(['fuerte','joven','serio','amable','sincero','activo','curioso','paciente','atento','inteligente','trabajador','creativo','honesto','generoso','valiente','responsable','prudente','optimista','realista','sociable'], ['силён','молод','серьёзен','добр','искренен','активен','любопытен','терпелив','внимателен','умён','трудолюбив','творческий','честен','щедр','смел','ответственен','осторожен','оптимистичен','реалистичен','общителен']),
      estar: lex(['feliz','cansado','listo','tranquilo','ocupado','contento','enfermo','libre','nervioso','solo','orgulloso','preocupado','aburrido','sorprendido','interesado','despierto','perdido','relajado','confundido','enfadado'], ['счастлив','устал','готов','спокоен','занят','доволен','болен','свободен','нервен','один','горд','обеспокоен','скучаю','удивлён','заинтересован','бодр','потерян','расслаблен','растерян','зол']),
    },
    noun: lex(['un libro','un café','un mapa','un teléfono','un gato','un problema','un vaso','un billete','un cuaderno','un regalo','un amigo','un mensaje','un coche','un perro','un lápiz','un abrigo','un plan','un trabajo','un minuto','un sueño'], ['книга','кофе','карта','телефон','кот','проблема','стакан','билет','тетрадь','подарок','друг','сообщение','машина','собака','карандаш','пальто','план','работа','минута','мечта']),
    goPlace: lex(['al parque','a la escuela','a la tienda','a la oficina','al restaurante','al museo','al cine','al mercado','al banco','al hospital','a la estación','a la biblioteca','a la playa','al centro','al aeropuerto','al hotel','al gimnasio','al teatro','al jardín','a la universidad'], ['в парк','в школу','в магазин','в офис','в ресторан','в музей','в кино','на рынок','в банк','в больницу','на станцию','в библиотеку','на пляж','в центр','в аэропорт','в отель','в спортзал','в театр','в сад','в университет']),
    atPlace: lex(['en casa','en la escuela','en la tienda','en la oficina','en el restaurante','en el museo','en el cine','en el mercado','en el banco','en el hospital','en la estación','en la biblioteca','en la playa','en el centro','en el aeropuerto','en el hotel','en el gimnasio','en el teatro','en el jardín','en la universidad'], ['дома','в школе','в магазине','в офисе','в ресторане','в музее','в кинотеатре','на рынке','в банке','в больнице','на станции','в библиотеке','на пляже','в центре','в аэропорту','в отеле','в спортзале','в театре','в саду','в университете']),
    time: lex(['hoy','ahora','esta mañana','esta tarde','esta noche','los lunes','los martes','los miércoles','los jueves','los viernes','en verano','en invierno','en primavera','en otoño','cada día','este mes','esta semana','mañana','temprano','tarde'], ['сегодня','сейчас','этим утром','днём','этой ночью','по понедельникам','по вторникам','по средам','по четвергам','по пятницам','летом','зимой','весной','осенью','каждый день','в этом месяце','на этой неделе','завтра','рано','поздно']),
    render(fact, x) {
      if (fact.lemma === 'ser') {
        const adjective = x.subject[0] === 'Nosotros' ? spanishPluralAdjective(x.adjective.text) : x.adjective.text;
        return [`${x.subject[0]} `, ` ${adjective}${x.time.text ? ` ${x.time.text}` : ''}.`, russianPrompt('adjective', x)];
      }
      if (fact.lemma === 'estar') return [`${x.subject[0]} `, ` ${x.atPlace.text}${x.time.text ? ` ${x.time.text}` : ''}.`, russianPrompt('location', x)];
      if (fact.lemma === 'tener') return [`${x.subject[0]} `, ` ${x.noun.text}${x.time.text ? ` ${x.time.text}` : ''}.`, russianPrompt('possession', x)];
      return [`${x.subject[0]} `, ` ${x.goPlace.text}${x.time.text ? ` ${x.time.text}` : ''}.`, russianPrompt('go', x)];
    },
  },
  fr: {
    subject: { present_1sg: ['Je', 'Я'], present_2sg: ['Tu', 'Ты'], present_3sg: ['Il', 'Он'], present_1pl: ['Nous', 'Мы'] },
    adjective: lex(['heureux','fatigué','prêt','calme','occupé','content','malade','libre','fort','jeune','sérieux','gentil','nerveux','seul','sûr','fier','actif','curieux','patient','attentif'], ['счастлив','устал','готов','спокоен','занят','доволен','болен','свободен','силён','молод','серьёзен','добр','нервен','один','уверен','горд','активен','любопытен','терпелив','внимателен']),
    noun: lex(['un livre','un café','un plan','un téléphone','un chat','un problème','un verre','un billet','un cahier','un cadeau','un ami','un message','un vélo','un chien','un crayon','un manteau','un projet','un travail','un moment','un rêve'], ['книга','кофе','план','телефон','кот','проблема','стакан','билет','тетрадь','подарок','друг','сообщение','велосипед','собака','карандаш','пальто','проект','работа','момент','мечта']),
    goPlace: lex(['au parc',"à l'école",'au magasin','au bureau','au restaurant','au musée','au cinéma','au marché','à la banque',"à l'hôpital",'à la gare','à la bibliothèque','à la plage','au centre','à l’aéroport',"à l'hôtel",'à la salle','au théâtre','au jardin',"à l'université"], ['в парк','в школу','в магазин','в офис','в ресторан','в музей','в кино','на рынок','в банк','в больницу','на вокзал','в библиотеку','на пляж','в центр','в аэропорт','в отель','в зал','в театр','в сад','в университет']),
    time: lex(["aujourd'hui",'maintenant','ce matin',"cet après-midi",'ce soir','le lundi','le mardi','le mercredi','le jeudi','le vendredi','en été','en hiver','au printemps',"en automne",'chaque jour','ce mois-ci','cette semaine','demain','tôt','tard'], ['сегодня','сейчас','этим утром','днём','этим вечером','по понедельникам','по вторникам','по средам','по четвергам','по пятницам','летом','зимой','весной','осенью','каждый день','в этом месяце','на этой неделе','завтра','рано','поздно']),
    render(fact, x) {
      const prefix = fact.lemma === 'avoir' && x.subject[0] === 'Je' && fact.target === 'ai' ? "J'" : `${x.subject[0]} `;
      if (fact.lemma === 'être') {
        const adjective = x.subject[0] === 'Nous' ? frenchPluralAdjective(x.adjective.text) : x.adjective.text;
        return [prefix, ` ${adjective}${x.time.text ? ` ${x.time.text}` : ''}.`, russianPrompt('adjective', x)];
      }
      if (fact.lemma === 'avoir') return [prefix, ` ${x.noun.text}${x.time.text ? ` ${x.time.text}` : ''}.`, russianPrompt('possession', x)];
      return [prefix, ` ${x.goPlace.text}${x.time.text ? ` ${x.time.text}` : ''}.`, russianPrompt('go', x)];
    },
  },
  de: {
    subject: { praesens_1sg: ['Ich', 'Я'], praesens_2sg: ['Du', 'Ты'], praesens_3sg: ['Er', 'Он'], praesens_1pl: ['Wir', 'Мы'] },
    adjective: lex(['glücklich','müde','bereit','ruhig','beschäftigt','zufrieden','krank','frei','stark','jung','ernst','freundlich','nervös','allein','sicher','stolz','aktiv','neugierig','geduldig','aufmerksam'], ['счастлив','устал','готов','спокоен','занят','доволен','болен','свободен','силён','молод','серьёзен','добр','нервен','один','уверен','горд','активен','любопытен','терпелив','внимателен']),
    noun: lex(['ein Buch','ein Foto','ein Problem','ein Museum','ein Auto','ein Haus','ein Glas','ein Ticket','ein Heft','ein Geschenk','ein Freund','eine Nachricht','ein Fahrrad','ein Hund','ein Bleistift','ein Mantel','ein Plan','eine Arbeit','eine Minute','ein Traum'], ['книга','фото','проблема','музей','машина','дом','стакан','билет','тетрадь','подарок','друг','сообщение','велосипед','собака','карандаш','пальто','план','работа','минута','мечта']),
    goPlace: lex(['in den Park','in die Schule','in den Laden','ins Büro','ins Restaurant','ins Museum','ins Kino','zum Markt','zur Bank','ins Krankenhaus','zum Bahnhof','in die Bibliothek','an den Strand','ins Zentrum','zum Flughafen','ins Hotel','ins Fitnessstudio','ins Theater','in den Garten','zur Universität'], ['в парк','в школу','в магазин','в офис','в ресторан','в музей','в кино','на рынок','в банк','в больницу','на вокзал','в библиотеку','на пляж','в центр','в аэропорт','в отель','в спортзал','в театр','в сад','в университет']),
    time: lex(['heute','jetzt','heute Morgen','heute Nachmittag','heute Abend','montags','dienstags','mittwochs','donnerstags','freitags','im Sommer','im Winter','im Frühling','im Herbst','jeden Tag','diesen Monat','diese Woche','morgen','früh','spät'], ['сегодня','сейчас','этим утром','днём','этим вечером','по понедельникам','по вторникам','по средам','по четвергам','по пятницам','летом','зимой','весной','осенью','каждый день','в этом месяце','на этой неделе','завтра','рано','поздно']),
    render(fact, x) {
      if (fact.lemma === 'sein') return [`${x.subject[0]} `, `${x.time.text ? ` ${x.time.text}` : ''} ${x.adjective.text}.`, russianPrompt('adjective', x)];
      if (fact.lemma === 'haben') return [`${x.subject[0]} `, `${x.time.text ? ` ${x.time.text}` : ''} ${germanAccusativeNoun(x.noun.text)}.`, russianPrompt('possession', x)];
      return [`${x.subject[0]} `, `${x.time.text ? ` ${x.time.text}` : ''} ${x.goPlace.text}.`, russianPrompt('go', x)];
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
  if (target === 'es' && lemma === 'ser') return lex(['en general', 'por naturaleza', 'normalmente', 'en mi vida diaria'], ['в целом', 'по природе', 'обычно', 'в повседневной жизни']);
  if ((target === 'fr' && lemma === 'être') || (target === 'de' && lemma === 'sein')) return times.filter((time) => !/(?:lunes|martes|miércoles|jueves|viernes|lundi|mardi|mercredi|jeudi|vendredi|montags|dienstags|mittwochs|donnerstags|freitags|cada día|chaque jour|jeden Tag)/u.test(time.text));
  if ((target === 'es' && lemma === 'tener') || (target === 'fr' && lemma === 'avoir') || (target === 'de' && lemma === 'haben')) return times.filter((time) => !/(?:lunes|martes|miércoles|jueves|viernes|lundi|mardi|mercredi|jeudi|vendredi|montags|dienstags|mittwochs|donnerstags|freitags|cada día|chaque jour|jeden Tag|en verano|en invierno|en primavera|en otoño|en été|en hiver|au printemps|en automne|im Sommer|im Winter|im Frühling|im Herbst)/u.test(time.text));
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
  const profile = DIFFICULTY_PROFILE[difficulty]; const timePool = compatibleTimes(target, fact.lemma).slice(0, profile.timeLimit);
  const timeIndex = profile.timeLimit ? Math.floor(variant / profile.lexicalLimit) % timePool.length : 0;
  const baseTime = profile.timeLimit ? timePool[timeIndex] : { text: '', ru: '' };
  const secondary = difficulty === 3 ? ({ es: ['en mi contexto diario', 'в моём повседневном контексте'], fr: ['dans mon contexte quotidien', 'в моём повседневном контексте'], de: ['in meinem Alltag', 'в моей повседневной жизни'] })[target] : null;
  const time = secondary ? { text: `${baseTime.text} ${secondary[0]}`, ru: `${baseTime.ru} ${secondary[1]}` } : baseTime;
  const adjectives = language.adjectiveByLemma?.[fact.lemma] ?? language.adjective ?? language.adjectiveByLemma?.ser;
  const lexicalIndex = variant % profile.lexicalLimit;
  const x = { fact, subject: language.subject[fact.grammar], subjectIndex: Object.keys(language.subject).indexOf(fact.grammar), adjective: adjectives[lexicalIndex], adjectiveIndex: lexicalIndex, noun: language.noun[lexicalIndex], nounIndex: lexicalIndex, goPlace: language.goPlace[lexicalIndex], goPlaceIndex: lexicalIndex, atPlace: language.atPlace?.[lexicalIndex], atPlaceIndex: lexicalIndex, time, timeIndex };
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
  return normalize({ mode, promptRu: payload.promptRu, pairs: payload.pairs.map(({ left, right }) => ({ left, right })) });
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
function makeTask(target, pack, mode, difficulty, ordinal) {
  const current = frame(target, pack, ordinal, difficulty); let payload; let distractorReasons; let sourceFactIds = current.sourceFactIds;
  if (mode === 'guess_phrase' || mode === 'fill_gap') { payload = choicePayload(target, pack, current); distractorReasons = payload.grammarMatrix.options.filter((option) => !option.grammatical).map((option) => ({ token: option.token, reason: option.reason })); }
  else if (mode === 'find_oddity') { payload = oddityPayload(target, pack, current); distractorReasons = [{ factId: payload.inverseProof.options[payload.oddityIndex].factId, reason: 'subject_verb_person_mismatch' }]; }
  else if (mode === 'translate_build') { const correctTokens = target === 'fr' && current.sentence.startsWith("J'ai ") ? ["J'", 'ai', ...current.sentence.slice(5).split(' ')] : current.sentence.split(' '); const decoy = paradigm(pack, current.fact).find((fact) => fact.id !== current.fact.id); const tokenBank = shuffledTokenBank(correctTokens, decoy.target, ordinal); const initialDecoyIndex = Math.floor(ordinal / 12) % tokenBank.length; const rotation = Math.floor(current.variant / current.difficultyProfile.lexicalLimit) % tokenBank.length; if (rotation) tokenBank.push(...tokenBank.splice(0, rotation)); const decoyIndex = (initialDecoyIndex - rotation + tokenBank.length) % tokenBank.length; const visibleIndexes = tokenBank.map((_, index) => index).filter((index) => index !== decoyIndex); if (visibleIndexes.every((index, order) => tokenBank[index] === correctTokens[order])) [tokenBank[visibleIndexes[0]], tokenBank[visibleIndexes[1]]] = [tokenBank[visibleIndexes[1]], tokenBank[visibleIndexes[0]]]; payload = { promptRu: current.promptRu, correctAnswer: current.sentence, correctTokens, correctTokenCount: correctTokens.length, samePosDecoy: { factId: decoy.id, pos: decoy.pos, token: decoy.target }, tokenBank, decoyIndex, tokenizationProof: { separator: 'single_space_with_french_elision_split', joined: correctTokens.join(' '), reconstruction: target === 'fr' && correctTokens[0] === "J'" ? "J' + ai => J'ai" : 'identity', decoyCount: 1 } }; sourceFactIds = [...current.sourceFactIds, decoy.id]; distractorReasons = [{ factId: decoy.id, reason: 'same_pos_wrong_person_form' }]; }
  else { const groupOrdinal = ordinal * 7; const pairs = [0,1,2,3,4,5].map((offset) => frame(target, pack, groupOrdinal + offset, difficulty)).map((item) => ({ left: item.promptRu, right: item.sentence, factId: item.fact.id, senseEvidence: { sourceFactIds: item.sourceFactIds, lemma: item.fact.lemma, grammar: item.fact.grammar } })); payload = { promptRu: 'Соедините полный русский перевод с фразой.', pairs, bijectionProof: { leftCount: 6, rightCount: 6, unique: true, factIds: pairs.map((pair) => pair.factId), independentGroupOrdinal: groupOrdinal } }; sourceFactIds = [...new Set(pairs.flatMap((pair) => pair.senseEvidence.sourceFactIds))]; distractorReasons = []; }
  // CEFR level is part of the learner task contract: the same surface cannot be
  // silently reused for a different curriculum band.
  payload = { ...payload, cefrBand: CEFR_BY_DIFFICULTY[difficulty] };
  const semanticSignature = sha(learnerPayload(mode, payload));
  return { schemaVersion: 'arena-multilingual-task-v1', taskId: `arena-${target}-${mode}-${difficulty}-${String(ordinal).padStart(4,'0')}`, studyTarget: target, mode, difficulty, cefrBand: CEFR_BY_DIFFICULTY[difficulty], cefrProfile: current.difficultyProfile, semanticSignature, sourceFactIds, payload, distractorReasons };
}
function build(target, pack) {
  const result = []; let ordinal = 0; for (const [cell, quota] of Object.entries(QUOTAS)) { const [mode, diff] = cell.split(':'); for (let count = 0; count < quota; count += 1) result.push(makeTask(target, pack, mode, Number(diff), ordinal++)); }
  const surface = result.map((task) => canonical(learnerPayload(task.mode, task.payload)));
  const signatureCount = new Set(result.map((task) => task.semanticSignature)).size; const surfaceCount = new Set(surface).size;
  if (result.length !== REQUIRED || signatureCount !== REQUIRED || surfaceCount !== REQUIRED) {
    const seen = new Map(); const duplicate = result.find((task, index) => { const previous = seen.get(surface[index]); if (previous) return true; seen.set(surface[index], task.taskId); return false; });
    throw new Error(`duplicate_learner_surface:${target}:${signatureCount}:${surfaceCount}:${duplicate?.taskId}`);
  }
  const speedPairCounts = new Map();
  for (const task of result.filter((item) => item.mode === 'speed_match')) for (const pair of task.payload.pairs) {
    const key = `${pair.factId}\u0000${pair.right}`;
    speedPairCounts.set(key, (speedPairCounts.get(key) ?? 0) + 1);
  }
  if ([...speedPairCounts.values()].some((count) => count > MAX_SPEED_MATCH_PAIR_SURFACE_REUSE)) throw new Error(`speed_match_pair_source_cap_exceeded:${target}`);
  return result;
}
function write(path, text) { mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, text, 'utf8'); }
function manifest(target, pack, tasks) { const body = { schemaVersion: 'arena-multilingual-pool-manifest-v1', studyTarget: target, verdict: 'BLOCK', blockReason: 'independent_review_and_admin_publication_required;lexical_facts_pending_native_review', releaseEligible: false, requiredTaskCount: REQUIRED, generatedTaskCount: tasks.length, quotas: QUOTAS, evidencePackSha256: sha(pack), tasksSha256: sha(tasks), semanticLedgerSha256: sha(tasks.map((task) => task.semanticSignature)), coverage: { provenFactCount: pack.facts.length, lexicalFactInventoryStatus: 'pending_native_review', sourceFactIds: [...pack.facts, ...pack.lexicalFacts].map((fact) => fact.id).sort() }, structuralRequirements: { choiceModes: 'one_grammatical_and_three_invalid_same_frame', findOddity: 'three_agree_one_mismatch', translateBuild: 'one_same_pos_decoy_and_tokenization_proof', speedMatch: 'six_pair_bijection_with_independent_ordinal_groups', maxSpeedMatchPairSurfaceReuse: MAX_SPEED_MATCH_PAIR_SURFACE_REUSE, learnerSurfaceUniqueness: 'metadata_excluded', taskFields: ['studyTarget','cefrBand','semanticSignature','sourceFactIds','distractorReasons'] } }; return { ...body, manifestSha256: sha(body) }; }
for (const target of TARGETS) { const pack = load(target); if (!validate(target, pack)) throw new Error(`invalid_target_specific_fact_pack:${target}`); const tasks = build(target, pack); const base = resolve(outputRoot(), target); write(resolve(base, 'tasks.jsonl'), `${tasks.map((task) => JSON.stringify(task)).join('\n')}\n`); write(resolve(base, 'manifest.json'), `${JSON.stringify(manifest(target, pack, tasks), null, 2)}\n`); }
