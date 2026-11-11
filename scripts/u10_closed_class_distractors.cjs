// зачем (владелец 11.11, U10 часть 3, выбор «только служебные слова»): соблазн-служебное слово того же класса не должен
// ГРАММАТИЧЕСКИ вставать в слот, даже если показанный перевод его исключает: «[This] door is open» при «Дверь открыта»,
// «[She] works here» при «Он работает здесь», «[When] it rains…» при «Если пойдёт дождь…», «[Cette] fenêtre est ouverte».
// Правится только то, что решается правилом согласования: артикли/указательные/притяжательные (род, число, падеж, элизия),
// местоимения-подлежащие (лицо и число по форме глагола), английские вспомогательные (согласование внутри группы),
// союзы (внутри группы «сочинительные» / «подчинительные»). Смысловые слова (food / coffee) и предлоги НЕ трогаются:
// для них грамматичность правилом не доказывается, а предлоги владелец оставил эталоном («They walk ___ the evening» → in).
// Соблазн, который правило признаёт неграмматичным (род, число, лицо, элизия), остаётся как есть — это полезная ошибка.
// Замена — настоящее пройденное слово ДРУГОГО класса, которое в этом слоте заведомо неграмматично:
// в слот артикля — местоимение-подлежащее («[He] door is open»), в слот местоимения/вспомогательного/союза — артикль
// («[The] works here», «He [the] not smoke»). id, тексты, переводы, число и порядок фраз и плиток не меняются.
// Запуск: node scripts/u10_closed_class_distractors.cjs [--check] [--lang en] [--report <папка>]
// Сторож: tests/u10_closed_class_distractors_guard.test.ts (после правки подходящих соблазнов 0).
const fs = require('fs');
const path = require('path');
const { createHash } = require('crypto');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const COURSES = path.join(ROOT, 'modules', 'classic-courses');
const LISTS = JSON.parse(fs.readFileSync(path.join(__dirname, 'classic_distractor_lists.json'), 'utf8'));
const PATCHES = JSON.parse(fs.readFileSync(path.join(__dirname, 'classic_distractor_patches.json'), 'utf8'));
const LANGS = ['en', 'es', 'fr', 'de', 'it'];
const LOG = '[U10-CLOSED]';
// --base-head: исходник урока брать из HEAD (git show), а не из рабочей копии — повторный запуск после смены правил замены
// даёт тот же результат, что первый, и не требует отката файлов
// --base-rev <ревизия>: то же от указанного коммита (пересборка всей части 3 от состояния до неё после смены правил)
const BASE_REV = process.argv.includes('--base-rev') ? process.argv[process.argv.indexOf('--base-rev') + 1] : process.argv.includes('--base-head') ? 'HEAD' : null;
const noAccent = (t) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const RU_VY = /(^|[^а-яё])(вы|вас|вам|вами|ваш[а-яё]*)(?![а-яё])/i;
const RU_OTHER = /(^|[^а-яё])(я|мы|ты|он|она|оно|они|меня|мне|нас|нам|тебя|тебе|его|её|ее|им|ей|ему|их|ним|ней|ними)(?![а-яё])/i;
const strip = (t) => String(t).toLowerCase().replace(/[.,!?;:¿¡]/g, '');
const keyOf = (tokens) => tokens.map(strip).join(' ');
const sha = (s) => createHash('sha256').update(s).digest('hex');
const lessonName = (n) => `lessons-${String(n).padStart(2, '0')}.json`;
const likeCase = (word, like) => (/^\p{Lu}/u.test(like) ? word.charAt(0).toLocaleUpperCase() + word.slice(1) : word);
const set = (s) => new Set(s.split(' ').filter(Boolean));
const meet = (a, b) => [...a].some((x) => b.has(x));

function classOf(lang, word) {
  const pt = LISTS.posTags?.[lang] || {}; const cc = LISTS.closedClasses?.[lang] || {};
  const w = strip(word);
  if ((LISTS.articles?.[lang] || []).includes(w) || (pt.det || []).includes(w) || (LISTS.determiners?.[lang] || []).includes(w)) return 'det';
  if ((pt.subj || []).includes(w)) return 'subj';
  if ((pt.aux || []).includes(w)) return 'aux';
  if ((cc.conj || []).includes(w)) return 'conj';
  if ((cc.prep || []).includes(w)) return 'prep';
  return null;
}

// ─── Артикли и определители: признаки согласования ───────────────────────────────────────────────────────────────────
const gn = (table) => { const out = new Map(); for (const [feats, words] of Object.entries(table)) for (const w of words.split(' ')) out.set(w, new Set([...(out.get(w) || []), ...feats.split(' ')])); return out; };
const DET = {
  es: gn({
    'm.sg': 'el un este ese aquel nuestro vuestro otro mucho poco todo algún ningún', 'f.sg': 'la una esta esa aquella nuestra vuestra otra mucha poca toda alguna ninguna',
    'm.pl': 'los unos estos esos nuestros otros muchos pocos todos algunos', 'f.pl': 'las unas estas esas nuestras otras muchas pocas todas algunas',
    'm.sg f.sg': 'mi tu su cada', 'm.pl f.pl': 'mis tus sus dos tres cuatro cinco seis siete ocho nueve diez',
  }),
  fr: gn({
    'm.sg': 'le un du ce cet mon ton son tout aucun', 'f.sg': 'la une cette ma ta sa toute aucune', 'm.pl': 'tous', 'f.pl': 'toutes',
    'm.sg f.sg': 'l’ notre votre leur chaque autre', 'm.pl f.pl': 'les des ces mes tes ses nos vos leurs plusieurs quelques',
  }),
  it: gn({
    'm.sg': 'il lo un uno mio tuo suo nostro vostro questo quello altro molto poco tutto nessun', 'f.sg': 'la una un’ mia tua sua nostra vostra questa quella altra molta poca tutta nessuna',
    'm.pl': 'i gli dei degli miei tuoi suoi nostri vostri questi quelli altri molti pochi tutti alcuni', 'f.pl': 'le delle mie tue sue nostre vostre queste quelle altre molte poche tutte alcune',
    'm.sg f.sg': 'ogni',
  }),
};
// итальянские пары с распределением по звуку (il/lo, i/gli, un/uno, dei/degli) друг друга не заменяют
const IT_PHON = [set('il lo'), set('i gli'), set('un uno'), set('dei degli')];
const IT_POSS = set('mio mia miei mie tuo tua tuoi tue suo sua suoi sue nostro nostra nostri nostre vostro vostra vostri vostre');
const IT_ART = set('il lo la i gli le un uno una un’ dei degli delle');
const PREDET = { en: set(''), es: set('todo toda todos todas'), fr: set('tout toute tous toutes'), de: set('alle'), it: set('tutto tutta tutti tutte') };
// немецкий: чтения «род/число.падеж» по окончанию
const DE_DEF = { der: 'm.nom f.dat f.gen pl.gen', die: 'f.nom f.acc pl.nom pl.acc', das: 'n.nom n.acc', den: 'm.acc pl.dat', dem: 'm.dat n.dat', des: 'm.gen n.gen' };
const DE_EIN_END = { '': 'm.nom n.nom n.acc', e: 'f.nom f.acc pl.nom pl.acc', en: 'm.acc pl.dat', em: 'm.dat n.dat', er: 'f.dat f.gen pl.gen', es: 'm.gen n.gen' };
const DE_DIES_END = { er: 'm.nom f.dat f.gen pl.gen', e: 'f.nom f.acc pl.nom pl.acc', es: 'n.nom n.acc', en: 'm.acc pl.dat', em: 'm.dat n.dat' };
const noPlural = (readings) => new Set([...readings].filter((x) => !x.startsWith('pl')));
function deReadings(w) {
  if (DE_DEF[w]) return set(DE_DEF[w]);
  for (const stem of ['dies', 'jed']) {
    const ending = w.startsWith(stem) ? DE_DIES_END[w.slice(stem.length)] : undefined;
    if (ending !== undefined) return stem === 'jed' ? noPlural(set(ending)) : set(ending);
  }
  for (const stem of ['mein', 'dein', 'sein', 'ihr', 'unser', 'kein', 'ein']) {
    const ending = w.startsWith(stem) ? DE_EIN_END[w.slice(stem.length)] : undefined;
    if (ending !== undefined) return stem === 'ein' ? noPlural(set(ending)) : set(ending);
  }
  if (w === 'euer') return set(DE_EIN_END['']);
  if (w.startsWith('eur') && DE_EIN_END[w.slice(3)] !== undefined) return set(DE_EIN_END[w.slice(3)]);
  if (['viele', 'alle', 'einige', 'manche'].includes(w)) return set('pl.nom pl.acc');
  return null;
}
function deKey(w) {
  if (DE_DEF[w]) return `def:${w.slice(1)}`;
  for (const stem of ['dies', 'jed']) if (w.startsWith(stem) && DE_DIES_END[w.slice(stem.length)] !== undefined) return `def:${w.slice(stem.length)}`;
  for (const stem of ['mein', 'dein', 'sein', 'ihr', 'unser', 'kein', 'ein']) if (w.startsWith(stem) && DE_EIN_END[w.slice(stem.length)] !== undefined) return `ein:${w.slice(stem.length)}`;
  if (w === 'euer') return 'ein:';
  if (w.startsWith('eur') && DE_EIN_END[w.slice(3)] !== undefined) return `ein:${w.slice(3)}`;
  return `word:${w}`;
}
const EN_SG = set('a an this that each every another much'); const EN_PL = set('these those many few several both two three');
const EN_AUX_ALL = set('am is are was were be do does did have has had can could will would shall should may might must');
const EN_AN_CONS = /^(hour|honest|honou?r|heir)/u; const EN_A_VOWEL = /^(uni|use|usu|user|euro|one$|once$|u$)/u;
const vowelStart = (w) => /^[aeiouàâäéèêëîïôöùûüœh]/u.test(w);
const looksPlural = (w) => /s$/u.test(w) && !/(ss|us|is)$/u.test(w);

/** 'fit' — соблазн-определитель грамматически встаёт в слот; 'nofit' — правило согласования его отсекает. */
function detFits(lang, lower, i, c, d) {
  const next = lower[i + 1] || ''; const next2 = lower[i + 2] || '';
  if (lang === 'en') {
    // указательное как местоимение («This is…», «Is that your bag?»): согласование с глаголом; артикли и притяжательные не встают
    if (!next || EN_AUX_ALL.has(next) || classOf('en', next) === 'det') {
      if (!['this', 'that', 'these', 'those'].includes(d)) return 'nofit';
      const verb = EN_AUX_ALL.has(next) ? next : lower[i - 1] || '';
      const want = ['is', 'was', 'does', 'has'].includes(verb) ? 'sg' : ['are', 'were', 'do', 'have'].includes(verb) ? 'pl' : 'any';
      return want === 'any' || (want === 'sg') === ['this', 'that'].includes(d) ? 'fit' : 'nofit';
    }
    // относительное «that» («the key that opens…», «the book that I borrowed») — не определитель, ни один определитель его не заменит
    if (c === 'that' && i > 0 && (classOf('en', next) === 'subj' || looksPlural(next) || EN_AUX_ALL.has(next))) return 'nofit';
    // число существительного: по самому верному слову, иначе по окончанию следующего слова; через прилагательное («the new keys
    // are…») — только когда дальше стоит глагол во множественном числе или фраза кончается (иначе «the shop opens» примем за мн. ч.)
    const next3 = lower[i + 3] || '';
    const pluralAfterAdjective = looksPlural(next2) && (!next3 || ['are', 'were', 'have', 'do'].includes(next3));
    const number = EN_SG.has(c) ? 'sg' : EN_PL.has(c) ? 'pl' : looksPlural(next) || pluralAfterAdjective ? 'pl' : 'sg';
    if (d === 'a' || d === 'an') {
      if (number === 'pl') return 'nofit';
      const vowelSound = EN_AN_CONS.test(next) || (/^[aeiou]/u.test(next) && !EN_A_VOWEL.test(next));
      return (vowelSound ? 'an' : 'a') === d ? 'fit' : 'nofit';
    }
    if (EN_SG.has(d)) return number === 'pl' ? 'nofit' : 'fit';
    if (EN_PL.has(d)) return number === 'sg' ? 'nofit' : 'fit';
    return 'fit';
  }
  if (lang === 'de') {
    const rc = deReadings(c); const rd = deReadings(d);
    if (!rc || !rd) return 'skip';
    if (!meet(rc, rd)) return 'nofit';
    // род существительного в данных не размечен («euer Bus» → «das Bus» по чтениям сошлось бы), поэтому встаёт только слово
    // того же типа склонения с тем же окончанием (mein → dein, keinen → einen); остальное правило не решает
    return deKey(c) === deKey(d) ? 'fit' : 'skip';
  }
  const table = DET[lang];
  let fc = table.get(c); let fd = table.get(d);
  if (lang === 'fr') {
    if (c === 'de' || d === 'de') return 'nofit'; // «de» после отрицания/количества — отдельная конструкция, артикли его не заменяют
    const vowel = vowelStart(next);
    if (vowel && ['le', 'la', 'ce', 'ma', 'ta', 'sa', 'du'].includes(d)) return 'nofit';
    if (!vowel && ['l’', 'cet'].includes(d)) return 'nofit';
    if (vowel && ['mon', 'ton', 'son'].includes(d)) fd = set('m.sg f.sg');
    if (vowel && ['mon', 'ton', 'son'].includes(c)) fc = set('m.sg f.sg');
  }
  // «весь/все» стоит ПЕРЕД артиклем («tutto il giorno», «toute la journée»): другие определители его не заменяют, и он их — тоже
  if (PREDET[lang].has(c) !== PREDET[lang].has(d)) return 'nofit';
  if (lang === 'it') {
    if (IT_PHON.some((pair) => pair.has(c) && pair.has(d))) return 'nofit';
    // итальянское притяжательное требует артикля («il mio libro»): на месте артикля или указательного оно не встаёт, и наоборот
    if (IT_POSS.has(d) !== IT_POSS.has(c)) return 'nofit';
    // форма артикля по первому звуку следующего слова: lo/uno/gli/degli — перед s+согласная, z, gn, ps; il/un/i/dei — перед прочими согласными
    const special = /^(s[^aeiou]|z|gn|ps|x|y)/u.test(next); const vowel = /^[aeiouàèéìòù]/u.test(next);
    const allowed = special ? set('lo uno gli degli') : vowel ? set('un gli degli') : set('il un i dei');
    if (IT_ART.has(d) && set('il lo i gli un uno dei degli').has(d) && !allowed.has(d)) return 'nofit';
  }
  if (lang === 'es' && (c === 'lo' || d === 'lo')) return 'nofit';
  if (!fc || !fd) return 'skip';
  // зачем: род существительного берём из самого курса (слово, перед которым стоял определитель с явным родом). Без этого
  // «mi móvil» → «[una] móvil» сочли бы верным (mi рода не показывает), а «Ana la busca» (la — местоимение) приняли бы за артикль.
  // указательное перед глаголом-связкой («Questa è Lea», «Esto es…») — местоимение, а не определитель: правило не решает
  if (set('è sono es son est sont está están era eran').has(next)) return 'skip';
  const nounFeats = nounMap(lang).get(next);
  if (!nounFeats) return classOf(lang, next) === 'det' && meet(fc, fd) ? 'fit' : meet(fc, fd) ? 'skip' : 'nofit';
  const slot = new Set([...fc].filter((x) => nounFeats.has(x)));
  return meet(slot.size ? slot : fc, fd) ? 'fit' : 'nofit';
}

const nounMaps = new Map();
/** Слово после определителя с однозначным родом и числом → его признаки (по всем фразам курса). */
function nounMap(lang) {
  if (nounMaps.has(lang)) return nounMaps.get(lang);
  const out = new Map();
  const table = DET[lang];
  for (let n = 1; n <= 32; n += 1) {
    for (const p of JSON.parse(fs.readFileSync(path.join(COURSES, lang, lessonName(n)), 'utf8')).phrases) {
      const lower = p.tiles.map((t) => strip(t.correct));
      lower.forEach((w, i) => {
        const feats = table.get(w); const next = lower[i + 1];
        // только артикли: указательные и притяжательные бывают местоимениями («questa è…») и записали бы в «существительные» глагол
        if (!feats || feats.size !== 1 || !next || !(LISTS.articles?.[lang] || []).includes(w)) return;
        out.set(next, new Set([...(out.get(next) || []), ...feats]));
      });
    }
  }
  nounMaps.set(lang, out);
  return out;
}

// ─── Местоимения-подлежащие: лицо/число по форме глагола ─────────────────────────────────────────────────────────────
const EN_SKIP_ADV = set('always usually often never also just still really sometimes already');
const EN_AGREE = { am: 'i', is: 'he she it', was: 'i he she it', has: 'he she it', does: 'he she it', are: 'you we they', were: 'you we they', have: 'i you we they', do: 'i you we they' };
const EN_PAST = set('went got gave took made came saw knew thought told said found left felt kept met paid sent spent sold bought brought built caught chose drank drove ate fell forgot heard held lost ran sat slept spoke stood taught understood woke wore won wrote began broke became grew threw flew rang sang swam meant led lent put cut cost let hit hurt set shut read');
const EN_STARTERS = set('if when while that because and but so before after until although unless as than');
function enSubjectFits(lower, i, d) {
  const prev = lower[i - 1] || '';
  let verb = '';
  // подлежащее: в начале фразы/придаточного, после «Yes/No», либо прямо перед вспомогательным («I think she is…»)
  const next = lower[i + 1] || '';
  if (i === 0 || EN_STARTERS.has(prev) || ['yes', 'no'].includes(prev) || (EN_AUX_ALL.has(next) && !EN_AUX_ALL.has(prev))) { let k = i + 1; while (EN_SKIP_ADV.has(lower[k] || '')) k += 1; verb = lower[k] || ''; } else if (EN_AUX_ALL.has(prev)) verb = prev;
  else return ['you', 'it'].includes(d) && ['you', 'it'].includes(lower[i]) ? 'fit' : 'nofit'; // слот дополнения: «I know you / it»
  if (!verb) return 'skip';
  if (/n['’]t$/u.test(verb)) return 'skip';
  if (EN_AGREE[verb]) return EN_AGREE[verb].split(' ').includes(d) ? 'fit' : 'nofit';
  // зачем: «need», «feed», «speed» кончаются на -ed, но это не прошедшее время — иначе «She need help» сочли бы верным
  const pastEd = /ed$/u.test(verb) && !['need', 'feed', 'speed', 'seed', 'bleed', 'breed'].includes(verb);
  if (EN_AUX_ALL.has(verb) || pastEd || EN_PAST.has(verb)) return 'fit';
  const third = /s$/u.test(verb) && !/ss$/u.test(verb);
  return third === ['he', 'she', 'it'].includes(d) ? 'fit' : 'nofit';
}
const FR_CLITICS = set('ne n’ me m’ te t’ se s’ le la l’ les lui leur y en');
const FR_FORMS = { suis: 'je', es: 'tu', est: 'il elle on', sommes: 'nous', êtes: 'vous', sont: 'ils elles', ai: 'je j’', as: 'tu', a: 'il elle on', avons: 'nous', avez: 'vous', ont: 'ils elles', vais: 'je', vas: 'tu', va: 'il elle on', vont: 'ils elles', fait: 'il elle on', faites: 'vous', font: 'ils elles', dit: 'il elle on', dites: 'vous', peut: 'il elle on', veut: 'il elle on', doit: 'il elle on', sait: 'il elle on', prend: 'il elle on', met: 'il elle on' };
function frAllowed(verb) {
  if (FR_FORMS[verb]) return set(FR_FORMS[verb]);
  if (/ons$/u.test(verb)) return set('nous');
  if (/ez$/u.test(verb)) return set('vous');
  if (/(aient|ent|ont)$/u.test(verb)) return set('ils elles');
  if (/ais$/u.test(verb)) return set('je j’ tu');
  if (/ait$/u.test(verb)) return set('il elle on');
  if (/ai$/u.test(verb)) return set('je j’');
  if (/(es|as)$/u.test(verb)) return set('tu');
  if (/e$/u.test(verb)) return set('je j’ il elle on');
  if (/[sx]$/u.test(verb)) return set('je j’ tu');
  if (/[tda]$/u.test(verb)) return set('il elle on');
  return null;
}
function frSubjectFits(lower, i, d) {
  const prev = lower[i - 1] || '';
  const stressed = ['elle', 'elles', 'nous', 'vous'];
  // после предлога — ударная форма («avec vous», «chez elle»); «Avant je travaillais…» сюда не относится: je ударной формой не бывает
  if (classOf('fr', prev) === 'prep' && stressed.includes(lower[i])) return stressed.includes(d) ? 'fit' : 'nofit';
  // «s’il vous plaît», «je vous écris»: vous/nous после подлежащего — дополнение, правило согласования его не решает
  if (classOf('fr', prev) === 'subj' || /’(il|ils|elle|on)$/u.test(prev)) return 'skip';
  // возвратные и объектные nous/vous перед глаголом («nous nous levons», «tu vous préviendrais») пропускаем, как прочие клитики
  let k = i + 1; while (FR_CLITICS.has(lower[k] || '') || (['nous', 'vous'].includes(lower[k] || '') && lower[k + 1])) k += 1;
  const verb = lower[k] || '';
  if (!verb) return 'skip';
  const vowel = vowelStart(lower[i + 1] || '');
  if (d === 'je' && vowel) return 'nofit';
  if (d === 'j’' && !vowel) return 'nofit';
  const allowed = frAllowed(verb);
  if (!allowed) return 'skip';
  return allowed.has(d) ? 'fit' : 'nofit';
}
const DE_FORMS = { bin: 'ich', bist: 'du', ist: 'er sie es', sind: 'wir sie', seid: 'ihr', habe: 'ich', hast: 'du', hat: 'er sie es', haben: 'wir sie', habt: 'ihr', weiß: 'ich er sie es', kann: 'ich er sie es', muss: 'ich er sie es', will: 'ich er sie es', mag: 'ich er sie es', darf: 'ich er sie es', soll: 'ich er sie es', war: 'ich er sie es', wird: 'er sie es', werde: 'ich' };
function deAllowed(verb) {
  if (DE_FORMS[verb]) return set(DE_FORMS[verb]);
  if (/st$/u.test(verb)) return set('du');
  if (/n$/u.test(verb)) return set('wir sie');
  // прошедшее и сослагательное на -te совпадают у ich и er/sie/es; у остальных -e — только ich («arbeite», «warte» — настоящее время)
  if (set('hatte wollte konnte musste sollte durfte mochte möchte hätte könnte müsste würde wäre wurde sagte machte').has(verb)) return set('ich er sie es');
  if (/e$/u.test(verb)) return set('ich');
  if (/t$/u.test(verb)) return set('er sie es ihr');
  return null;
}
function deSubjectFits(lower, i, d) {
  // глагол на втором месте: после подлежащего в начале фразы или перед ним при обратном порядке слов
  const verb = i === 0 ? lower[1] || '' : i === 1 && classOf('de', lower[0]) !== 'conj' ? lower[0] || '' : '';
  const allowed = verb ? deAllowed(verb) : null;
  if (!allowed) return 'skip';
  return allowed.has(d) ? 'fit' : 'nofit';
}

// ─── Английские вспомогательные и союзы ───────────────────────────────────────────────────────────────────────────────
const EN_AUX_GROUPS = { modal: set('can could will would shall should may might must'), be: set('am is are was were'), do: set('do does did'), have: set('have has had') };
const EN_FORM_BY_PERSON = { i: set('am was do did have had'), you: set('are were do did have had'), we: set('are were do did have had'), they: set('are were do did have had'), he: set('is was does did has had'), she: set('is was does did has had'), it: set('is was does did has had') };
function enAuxFits(lower, i, c, d) {
  const group = Object.keys(EN_AUX_GROUPS).find((g) => EN_AUX_GROUPS[g].has(c));
  if (!group || !EN_AUX_GROUPS[group].has(d)) return 'skip';
  if (group === 'modal') return 'fit';
  const prev = lower[i - 1] || ''; const next = lower[i + 1] || '';
  // подлежащее-местоимение: справа при обратном порядке слов («Which platform do we need»), иначе слева
  const subject = EN_FORM_BY_PERSON[next] ? next : EN_FORM_BY_PERSON[prev] ? prev : '';
  if (subject) return EN_FORM_BY_PERSON[subject].has(d) ? 'fit' : 'nofit';
  if (['this', 'that'].includes(prev)) return set('is was does did has had').has(d) ? 'fit' : 'nofit';
  if (['these', 'those'].includes(prev)) return set('are were do did have had').has(d) ? 'fit' : 'nofit';
  // подлежащее-существительное: число правилом надёжно не определить («the seats by the aisle were…»), поэтому встаёт только
  // смена времени без смены числа; остальное не трогаем
  const tenseOnly = { is: 'was', was: 'is', are: 'were', were: 'are', has: 'had', have: 'had', do: 'did', does: 'did' };
  return tenseOnly[c] === d ? 'fit' : 'skip';
}
const CONJ_GROUPS = {
  en: [set('and but or so'), set('because if when while although unless')],
  es: [set('y e o u pero sino ni'), set('porque pues aunque si cuando mientras')],
  fr: [set('et ou mais donc car'), set('si quand lorsque puisque comme')],
  de: [set('und oder aber denn sondern'), set('weil wenn als obwohl während bevor nachdem damit'), set('dass ob')],
  it: [set('e o ma però né'), set('perché se quando mentre come')],
};
// союзы, которым нужно целое предложение справа: между двумя существительными («du pain et du beurre») они не встают
const CLAUSE_ONLY = { en: set('but so'), es: set('pero sino'), fr: set('mais car donc'), de: set('aber denn sondern'), it: set('ma però') };
// союзы, которым нужно отрицание слева («no… sino», «non… né»): без него неверны в любой позиции
const NEEDS_NEGATION = { en: set(''), es: set('sino ni'), fr: set(''), de: set('sondern'), it: set('né') };
const NEGATION = set('no not non ne n’ nicht kein keine keinen nunca nadie nada never');
// условное наклонение в главной части («je viendrais», «iría», «verrei») требует именно «если» — «когда» туда не встаёт
const CONDITIONAL = { es: /ría(s|mos|is|n)?$/u, fr: /r(ais|ait|ions|iez|aient)$/u, it: /(rei|resti|rebbe|remmo|reste|rebbero)$/u };
const IF_WORD = { es: 'si', fr: 'si', it: 'se' };
function conjFits(lang, c, d, lower, i, target) {
  const next = lower[i + 1] || '';
  const [coord, subord] = CONJ_GROUPS[lang];
  // вопросительное слово в начале вопроса («Quando arrivi?», «Perché è in ritardo?», «When do we start?») — не союз
  if (i === 0 && String(target || '').trim().endsWith('?')) return 'nofit';
  if (i === 0 && (next.includes('-') || (lang === 'fr' && next === 'est-ce'))) return 'nofit';
  // «sino», «ni», «né», «sondern» требуют отрицания слева; без него неверны
  if (NEEDS_NEGATION[lang].has(d) && !NEEDS_NEGATION[lang].has(c)) return lower.slice(0, i).some((w) => NEGATION.has(w)) ? 'skip' : 'nofit';
  // немецкое «als» после сравнительной степени («schneller als ich») — не временной союз; als/wenn для однократного прошлого — ошибка
  if (lang === 'de' && c === 'als' && /er$/u.test(lower[i - 1] || '')) return 'nofit';
  if (lang === 'de' && set('als wenn').has(c) && set('als wenn').has(d)) return 'nofit';
  // испанские y/e и o/u зависят от следующего звука: «e» — только перед i-/hi-, «u» — только перед o-/ho-
  if (lang === 'es' && ['y', 'e', 'o', 'u'].includes(d)) {
    const beforeI = /^h?i/u.test(next) && !/^hie/u.test(next); const beforeO = /^h?o/u.test(next);
    if ((d === 'e' && !beforeI) || (d === 'y' && beforeI) || (d === 'u' && !beforeO) || (d === 'o' && beforeO)) return 'nofit';
  }
  // условное наклонение в главной части требует именно «если»
  if (IF_WORD[lang] === c && lower.some((w) => CONDITIONAL[lang].test(w))) return 'nofit';
  const cCoord = coord.has(c); const dCoord = coord.has(d); const cSub = subord.has(c); const dSub = subord.has(d);
  if (cSub && dSub) return 'fit';
  if (cSub && dCoord) {
    // на месте подчинительного союза: в начале фразы сочинительный союз неверен («[But] it rains we will stay inside»);
    // в немецком придаточное стоит с глаголом в конце, и сочинительный союз там неверен («Ich bleibe hier [aber] ich müde bin»);
    // в остальных языках МЕЖДУ двумя предложениями он грамматичен («Leía el mensaje [pero] sonó el móvil») — это и есть нарушение
    if (i === 0 || lang === 'de') return 'nofit';
    return 'fit';
  }
  if (cCoord && dSub) {
    // на месте сочинительного: подчинительный союз встаёт, только если справа целое предложение; в немецком он требует
    // глагола в конце, а после сочинительного союза порядок прямой — неверен
    if (lang === 'de') return 'nofit';
    return classOf(lang, next) === 'subj' ? 'fit' : 'skip';
  }
  if (cCoord && dCoord) {
    // союз, которому нужно целое предложение (but, pero, mais, ma), между двумя именными группами неверен: доказуемо это только
    // когда справа короткий хвост без глагола («du pain et [mais] du beurre», «la pared y [pero] la puerta»)
    if (CLAUSE_ONLY[lang].has(d) && !CLAUSE_ONLY[lang].has(c)) {
      const tail = lower.length - 1 - i;
      const nextClass = classOf(lang, next);
      if (tail <= 2 && (tail === 1 || nextClass === 'det' || nextClass === 'prep')) return 'nofit';
      return nextClass === 'subj' ? 'fit' : 'skip';
    }
    return 'fit';
  }
  return 'skip';
}

/** Вердикт для соблазна d0 в плитке i: fit (встаёт грамматически) | nofit (правило отсекает) | skip (правило не решает — не трогаем). */
function verdict(lang, tiles, i, d0, target) {
  const lower = tiles.map((t) => strip(t.correct));
  const c = lower[i]; const d = strip(d0);
  const cls = classOf(lang, c);
  if (!cls || classOf(lang, d) !== cls) return { cls: null, v: 'other' };
  // числительные — смысловые слова («две книги» / «десять книг»), владелец оставил их как есть вместе с food / coffee
  const numbers = LISTS.numbers?.[lang] || [];
  if (numbers.includes(c) || numbers.includes(d)) return { cls, v: 'skip' };
  if (cls === 'det') return { cls, v: detFits(lang, lower, i, c, d) };
  if (cls === 'subj') return { cls, v: lang === 'en' ? enSubjectFits(lower, i, d) : lang === 'fr' ? frSubjectFits(lower, i, d) : lang === 'de' ? deSubjectFits(lower, i, d) : 'skip' };
  if (cls === 'aux') return { cls, v: lang === 'en' ? enAuxFits(lower, i, c, d) : 'skip' };
  if (cls === 'conj') {
    // английское «when» в начале вопроса («When do we start?») — вопросительное слово, а «because of» — предлог: союзы туда не встают
    if (lang === 'en' && ((c === 'when' && i === 0 && EN_AUX_ALL.has(lower[1] || '')) || (c === 'because' && lower[i + 1] === 'of'))) return { cls, v: 'nofit' };
    return { cls, v: conjFits(lang, c, d, lower, i, target) };
  }
  return { cls, v: 'skip' };
}

/** Те же проверки соблазна, что в стороже classic_courses_pack (список запретов, артикли, синонимы, формы «вы»): причина отказа или null. */
function guardRejects(lang, ru, removed, tile, word) {
  const c = strip(tile.correct); const dd = strip(word);
  if (!/^[\p{L}][\p{L}'’-]*$/u.test(word)) return 'не слово';
  if (removed.has(dd)) return 'в списке запретов';
  const articles = new Set(LISTS.articles?.[lang] ?? []);
  const artPairs = LISTS.articlePairs?.[lang] ?? null;
  if (articles.has(c) && articles.has(dd) && (!artPairs || artPairs.some(([a, b]) => (a === c && b === dd) || (a === dd && b === c)))) return 'артикль';
  const groupHit = (groups) => (groups ?? []).some((g) => g.includes(c) && g.includes(dd));
  if (groupHit(LISTS.synonyms?.[lang])) return 'синоним';
  const tails = LISTS.siblingTails?.[lang] ?? [];
  const sibling = () => {
    const a = noAccent(c); const b = noAccent(dd);
    if (!tails.length || a === b) return false;
    let k = 0;
    while (k < a.length && k < b.length && a[k] === b[k]) k += 1;
    return k >= 3 && tails.includes(a.slice(k)) && tails.includes(b.slice(k)) && a.length - k <= 4 && b.length - k <= 4;
  };
  if ((RU_VY.test(ru) || !RU_OTHER.test(ru)) && (groupHit(LISTS.youGroups?.[lang]) || sibling())) return 'форма «вы»';
  return null;
}

// местоимения в форме дополнения: та же часть речи, но на месте подлежащего заведомо неверны («[Him] can wait», «[Mich] kann warten»)
// немецкие mich/dich сюда не входят: в немецком дополнение может стоять первым («Mich braucht keine Quittung» грамматично)
const OBJECT_FORMS = { en: ['me', 'him', 'us', 'them'] };
function subjectSlot(lang, lower, i) {
  const prev = lower[i - 1] || ''; const next = lower[i + 1] || '';
  if (lang === 'en') return i === 0 || EN_STARTERS.has(prev) || ['yes', 'no'].includes(prev) || EN_AUX_ALL.has(next) || EN_AUX_ALL.has(prev);
  if (lang === 'de') return (i === 0 && !!deAllowed(next)) || (i === 1 && classOf('de', prev) !== 'conj' && !!deAllowed(prev));
  return false;
}

function classWords(lang, cls) {
  const pt = LISTS.posTags?.[lang] || {}; const cc = LISTS.closedClasses?.[lang] || {};
  if (cls === 'det') return [...(pt.det || []), ...(LISTS.determiners?.[lang] || []), ...(LISTS.articles?.[lang] || [])];
  if (cls === 'subj') return [...(pt.subj || []), ...(OBJECT_FORMS[lang] || [])];
  if (cls === 'aux') return pt.aux || [];
  if (cls === 'conj') return cc.conj || [];
  return [];
}

/** Слово того же класса, которое правило ДОКАЗУЕМО отсекает в этом слоте (число, род, лицо, элизия, тип союза). */
function provablyWrong(lang, tiles, i, word, target, cls) {
  const lower = tiles.map((t) => strip(t.correct));
  const c = lower[i]; const d = strip(word);
  if ((LISTS.numbers?.[lang] || []).includes(d)) return false;
  if (lang === 'fr' && cls === 'det' && (c === 'de' || d === 'de')) return false; // «pas de pain» / «pas du pain» — правилом не решается
  if (cls === 'subj' && (OBJECT_FORMS[lang] || []).includes(d)) return subjectSlot(lang, lower, i);
  const result = verdict(lang, tiles, i, word, target);
  if (result.cls === cls && result.v === 'nofit') return true;
  if (lang === 'en' && cls === 'aux') {
    // форма be / do / have, не согласованная с соседним местоимением, неверна в слоте любого вспомогательного («I [is] wait», «She [are] busy»)
    const subject = EN_FORM_BY_PERSON[lower[i + 1]] ? lower[i + 1] : EN_FORM_BY_PERSON[lower[i - 1]] ? lower[i - 1] : '';
    const agreeing = set('am is are was were do does did have has had');
    return !!subject && agreeing.has(d) && !EN_FORM_BY_PERSON[subject].has(d);
  }
  return false;
}

// слова другого класса, заведомо неграмматичные в слоте (все — из первых уроков курса); берутся, только если в своём классе
// доказуемо неверной формы нет
const FILL = {
  det: { en: 'he she is are am do does', es: 'yo ella nosotros ellos soy es son eres está', fr: 'il elle ils on je est sont tu suis', de: 'ich er wir du ist bin sind hat habe', it: 'io lui lei noi è sono sei tu siamo' },
  other: { en: 'the a my your our their an her every', es: 'un una mis sus unos unas cada tus', fr: 'un une mon des mes ses ces nos vos', de: 'ein mein kein dein eine meine keine deine einen', it: 'un il mio dei una mia tuo suo uno' },
};

// зачем: файлы уроков то и дело открыты другими процессами (тесты, git, сборщик), и Windows тогда отклоняет перезапись
// на месте (11.11 так осталось смешанное состояние курса); замена через временный файл и переименование проходит, с повторами
function writeReplacing(file, text) {
  const tmp = `${file}.u10tmp`;
  let lastError = null;
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try { fs.writeFileSync(tmp, text); fs.renameSync(tmp, file); return; } catch (error) { lastError = error; Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 500); }
  }
  throw new Error(`${LOG} не удалось записать ${file}: ${lastError && lastError.message}`);
}

function scan(lang, mode) {
  const stats = {}; const pairs = new Map(); const rows = []; const touched = [];
  const bump = (cls, v) => { stats[cls] = stats[cls] || { fit: 0, nofit: 0, skip: 0, sameClass: 0, otherClass: 0 }; stats[cls][v] += 1; };
  // слово → первый урок, где оно верное (как в стороже): замена вне закрытых списков должна быть уже пройдена
  const vocab = new Map();
  for (let n = 1; n <= 32; n += 1) {
    for (const p of JSON.parse(fs.readFileSync(path.join(COURSES, lang, lessonName(n)), 'utf8')).phrases) {
      for (const t of [...p.tiles.map((x) => x.correct), ...(p.accepted ?? []).flat(), ...(p.alternatives ?? []).flatMap((a) => a.split(/\s+/))]) {
        const k = strip(t);
        if (k && (!vocab.has(k) || vocab.get(k) > n)) vocab.set(k, n);
      }
    }
  }
  const learned = (w, lesson) => classOf(lang, w) !== null || (vocab.has(w) && vocab.get(w) <= lesson + Math.max(1, 8 - lesson));
  const seenWith = new Map();
  for (let n = 1; n <= 32; n += 1) {
    for (const p of JSON.parse(fs.readFileSync(path.join(COURSES, lang, lessonName(n)), 'utf8')).phrases) for (const t of p.tiles) {
      const list = seenWith.get(strip(t.correct)) || [];
      for (const x of t.distractors) if (!list.includes(strip(x))) list.push(strip(x));
      seenWith.set(strip(t.correct), list);
    }
  }
  for (let n = 1; n <= 32; n += 1) {
    const file = path.join(COURSES, lang, lessonName(n));
    const current = fs.readFileSync(file, 'utf8');
    const text = BASE_REV ? execFileSync('git', ['show', `${BASE_REV}:modules/classic-courses/${lang}/${lessonName(n)}`], { cwd: ROOT, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 }) : current;
    const data = JSON.parse(text);
    if (JSON.stringify(data) + '\n' !== text) throw new Error(`${LOG} ${lang}/${lessonName(n)}: файл не в каноническом виде сборщика — не трогаю`);
    for (const p of data.phrases) {
      const mm = /(\d\d)[.:](\d\d)$/.exec(p.id);
      const removed = new Set((PATCHES.remove[`${lang}:${mm[1]}:${mm[2]}`] ?? []).map(strip));
      const corrects = p.tiles.map((t) => t.correct);
      const accepted = new Set([keyOf(corrects), ...(p.accepted ?? []).map(keyOf), ...(p.alternatives ?? []).map((a) => keyOf(a.split(/\s+/)))]);
      const ownWords = new Set([...corrects, ...(p.accepted ?? []).flat(), ...(p.alternatives ?? []).flatMap((a) => a.split(/\s+/))].map(strip));
      p.tiles.forEach((tile, i) => {
        tile.distractors.forEach((x, at) => {
          const { cls, v } = verdict(lang, p.tiles, i, x, p.target);
          if (!cls) return;
          bump(cls, v);
          if (v !== 'fit') return;
          const key = `${cls}\t${strip(tile.correct)}\t${strip(x)}`;
          const entry = pairs.get(key) || { count: 0, example: `${corrects.map((w, j) => (j === i ? `[${x}]` : w)).join(' ')} — ${p.sourceLocales.ru}`, to: new Map() };
          entry.count += 1;
          pairs.set(key, entry);
          if (mode === 'count') return;
          const taken = new Set(tile.distractors.map(strip));
          const usable = (w) => !taken.has(w) && w !== strip(tile.correct) && !ownWords.has(w) && learned(w, n)
            && !accepted.has(keyOf(corrects.map((cw, j) => (j === i ? w : cw)))) && guardRejects(lang, p.sourceLocales.ru, removed, tile, w) === null;
          // 1) слово ТОГО ЖЕ класса, которое правило доказуемо отсекает в этом слоте («[These] door is open», «[They] is busy»):
          //    так соблазн остаётся правдоподобной ошибкой той же части речи (стандарт Ревизора). Сначала — уже знакомые соблазны этого слова.
          const sameClass = [...(seenWith.get(strip(tile.correct)) || []), ...classWords(lang, cls)].filter((w) => classOf(lang, w) === cls || (cls === 'subj' && (OBJECT_FORMS[lang] || []).includes(w)));
          let pick = sameClass.find((w) => usable(w) && provablyWrong(lang, p.tiles, i, w, p.target, cls));
          let kind = 'sameClass';
          if (!pick) {
            // 2) в своём классе доказуемо неверной формы нет — слово другого класса. Указательное-местоимение («Those are our seats»)
            //    нельзя менять на местоимение: «They are our seats» было бы второй верной фразой; туда идёт артикль.
            const nextWord = strip(corrects[i + 1] || '');
            const pronounSlot = lang === 'en' && cls === 'det' && (!nextWord || EN_AUX_ALL.has(nextWord) || classOf('en', nextWord) === 'det');
            pick = FILL[cls === 'det' && !pronounSlot ? 'det' : 'other'][lang].split(' ').find((w) => usable(w) && classOf(lang, w) !== cls);
            kind = 'otherClass';
          }
          if (!pick) throw new Error(`${LOG} ${p.id}#${i}: нет замены для «${x}» при «${tile.correct}» (${p.target})`);
          stats[cls][kind] += 1;
          const next = lang === 'en' && pick === 'i' ? 'I' : likeCase(pick, x); // английское «I» всегда с заглавной (сторож lowerI)
          entry.to.set(`${strip(next)}${kind === 'otherClass' ? '*' : ''}`, (entry.to.get(`${strip(next)}${kind === 'otherClass' ? '*' : ''}`) || 0) + 1);
          tile.distractors[at] = next;
        });
      });
    }
    const after = JSON.stringify(data) + '\n';
    if (after !== text) touched.push(n);
    if (mode === 'write' && after !== current) writeReplacing(file, after);
  }
  for (const [key, e] of [...pairs.entries()].sort((a, b) => b[1].count - a[1].count)) {
    const [cls, c, d] = key.split('\t');
    rows.push(`| ${lang} | ${cls} | ${c} → ~~${d}~~ | ${e.count} | ${[...e.to.entries()].map(([w, k]) => `${w}×${k}`).join(', ') || '—'} | ${e.example} |`);
  }
  return { stats, rows, touched, pairCount: pairs.size };
}

function updateManifest(langs) {
  const manifestPath = path.join(COURSES, 'manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  for (const lang of langs) {
    const entry = manifest.languages[lang];
    const lessonHash = createHash('sha256');
    for (const name of Object.keys(entry.files)) {
      if (!name.startsWith('lessons-')) continue;
      const text = fs.readFileSync(path.join(COURSES, lang, name), 'utf8');
      lessonHash.update(text);
      entry.files[name] = { bytes: Buffer.byteLength(text), sha256: sha(text) };
    }
    const index = { lang, lessons: 32, phrases: entry.phrases, rev: lessonHash.digest('hex'), sourceZipSha256: entry.sourceZipSha256 };
    const indexText = JSON.stringify(index) + '\n';
    writeReplacing(path.join(COURSES, lang, 'index.json'), indexText);
    entry.files['index.json'] = { bytes: Buffer.byteLength(indexText), sha256: sha(indexText) };
    manifest.languages[lang] = { ...index, files: entry.files };
  }
  // зачем: manifest.json бывает открыт другим процессом (см. U20) — замена через переименование
  const tmpPath = `${manifestPath}.u10tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(manifest) + '\n');
  fs.renameSync(tmpPath, manifestPath);
}

module.exports = { verdict, scan, LANGS };

if (require.main === module) {
  const CHECK = process.argv.includes('--check');
  const only = process.argv.includes('--lang') ? [process.argv[process.argv.indexOf('--lang') + 1]] : LANGS;
  const reportAt = process.argv.indexOf('--report');
  const reportDir = reportAt > 0 ? process.argv[reportAt + 1] : null;
  const allRows = []; const allStats = {}; const touchedLangs = [];
  for (const lang of only) {
    const result = scan(lang, CHECK ? 'dry' : 'write');
    allStats[lang] = result.stats; allRows.push(...result.rows);
    if (result.touched.length) touchedLangs.push(lang);
    console.log(`${LOG} ${lang}: ${JSON.stringify(result.stats)} пар=${result.pairCount} уроков=${result.touched.length}${CHECK ? ' (проверка, ничего не записано)' : ''}`);
  }
  if (!CHECK && touchedLangs.length) { updateManifest(touchedLangs); console.log(`${LOG} manifest.json и index.json пересчитаны: ${touchedLangs.join(', ')}`); }
  if (reportDir) {
    fs.writeFileSync(path.join(reportDir, 'part3_pairs.md'), `| Курс | Класс | Пара | Мест | Замена | Пример (соблазн в скобках) — перевод |\n|---|---|---|---|---|---|\n${allRows.join('\n')}\n`);
    fs.writeFileSync(path.join(reportDir, 'part3_stats.json'), JSON.stringify(allStats, null, 1) + '\n');
  }
}
