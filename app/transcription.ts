/**
 * Offline English → IPA transcription.
 * Strategy: dictionary lookup first, conservative rules for regular spellings.
 *
 * зачем: пользователь прислал репорт — на карточке "Where do we meet guests?"
 * слово guests показывалось как /gdʒʌːsts/ вместо /ɡests/. Проверка правил
 * показала, что выдумка была массовой: girl → dʒɪrl, school → stʃʌːl,
 * ghost → ɒst, two → twɒ, know → knæʊ, heart → hɪːt. Английская орфография
 * не выводится побуквенными правилами, поэтому прежняя гарантия «вернуть
 * результат для любой строки» означала «врать, когда не знаем».
 *
 * Новая гарантия: либо правда, либо ничего. Неуверенное слово даёт пустую
 * строку, и карточка показывается без транскрипции — отсутствие подсказки
 * честнее ложной подсказки, за которую пользователь справедливо ловит нас
 * на Cambridge/Oxford.
 */

/**
 * Версия генератора. Транскрипция сохраняется в документ карточки навсегда,
 * поэтому карточки, записанные более старой версией, нужно перегенерировать.
 * Поднимай число при каждом изменении словаря или правил.
 */
// зачем (3, 21.10): словарь пополнен словами, которые версия 2 собирала неверно (feet /fɪːt/,
// apps /æpps/) — сохранённые ею карточки нужно перегенерировать один раз.
export const TRANSCRIPTION_ENGINE_VERSION = 3;

// ─── Dictionary ───────────────────────────────────────────────────────────────
// Common A1–B2 words + all system flashcard vocabulary
const DICT: Record<string, string> = {
  // Articles / determiners
  a: 'ə', an: 'æn', the: 'ðə',
  this: 'ðɪs', that: 'ðæt', these: 'ðiːz', those: 'ðoʊz',
  some: 'sʌm', any: 'ˈeni', every: 'ˈevri', each: 'iːtʃ',
  all: 'ɔːl', both: 'boʊθ', many: 'ˈmeni', much: 'mʌtʃ',
  few: 'fjuː', more: 'mɔːr', most: 'moʊst', less: 'les', least: 'liːst',
  enough: 'ɪˈnʌf', no: 'noʊ', own: 'oʊn', other: 'ˈʌðər',
  // Pronouns
  i: 'aɪ', me: 'miː', my: 'maɪ', myself: 'maɪˈself',
  you: 'juː', your: 'jɔːr', yourself: 'jɔːrˈself',
  he: 'hiː', him: 'hɪm', his: 'hɪz', himself: 'hɪmˈself',
  she: 'ʃiː', her: 'hɜːr', hers: 'hɜːrz', herself: 'hɜːrˈself',
  it: 'ɪt', its: 'ɪts', itself: 'ɪtˈself',
  we: 'wiː', us: 'ʌs', our: 'aʊər', ourselves: 'aʊərˈselvz',
  they: 'ðeɪ', them: 'ðem', their: 'ðeər', themselves: 'ðəmˈselvz',
  who: 'huː', what: 'wʌt', which: 'wɪtʃ', where: 'weər', when: 'wen',
  why: 'waɪ', how: 'haʊ',
  someone: 'ˈsʌmwʌn', something: 'ˈsʌmθɪŋ', somewhere: 'ˈsʌmweər',
  anyone: 'ˈeniˌwʌn', anything: 'ˈeniˌθɪŋ', anywhere: 'ˈeniˌweər',
  everyone: 'ˈevrɪˌwʌn', everything: 'ˈevrɪˌθɪŋ', everywhere: 'ˈevrɪˌweər',
  nobody: 'ˈnoʊˌbɒdi', nothing: 'ˈnʌθɪŋ', nowhere: 'ˈnoʊˌweər',
  // Prepositions
  in: 'ɪn', on: 'ɒn', at: 'æt', to: 'tuː', for: 'fɔːr', of: 'ɒv',
  with: 'wɪð', from: 'frɒm', by: 'baɪ', about: 'əˈbaʊt', as: 'æz',
  into: 'ˈɪntʊ', through: 'θruː', during: 'ˈdjʊərɪŋ', before: 'bɪˈfɔːr',
  after: 'ˈæftər', above: 'əˈbʌv', below: 'bɪˈloʊ', between: 'bɪˈtwiːn',
  under: 'ˈʌndər', over: 'ˈoʊvər', out: 'aʊt', up: 'ʌp', down: 'daʊn',
  off: 'ɒf', around: 'əˈraʊnd', along: 'əˈlɒŋ', against: 'əˈɡenst',
  without: 'wɪˈðaʊt', within: 'wɪˈðɪn', upon: 'əˈpɒn', toward: 'tɔːrd',
  // Conjunctions
  and: 'ænd', but: 'bʌt', or: 'ɔːr', so: 'soʊ', yet: 'jet', nor: 'nɔːr',
  if: 'ɪf', because: 'bɪˈkɒz', since: 'sɪns', while: 'waɪl',
  although: 'ɔːlˈðoʊ', though: 'ðoʊ', unless: 'ənˈles', until: 'ənˈtɪl',
  // Auxiliaries / modals
  be: 'biː', am: 'æm', is: 'ɪz', are: 'ɑːr', was: 'wɒz', were: 'wɜːr',
  been: 'biːn', being: 'ˈbiːɪŋ',
  have: 'hæv', has: 'hæz', had: 'hæd', having: 'ˈhævɪŋ',
  do: 'duː', does: 'dʌz', did: 'dɪd', done: 'dʌn', doing: 'ˈduːɪŋ',
  will: 'wɪl', would: 'wʊd', can: 'kæn', could: 'kʊd',
  may: 'meɪ', might: 'maɪt', shall: 'ʃæl', should: 'ʃʊd', must: 'mʌst',
  // Contractions
  "i\'m": 'aɪm', "you\'re": 'jʊər', "he\'s": 'hiːz', "she\'s": 'ʃiːz',
  "it\'s": 'ɪts', "we\'re": 'wɪər', "they\'re": 'ðeər',
  "i\'ve": 'aɪv', "you\'ve": 'juːv', "we\'ve": 'wiːv', "they\'ve": 'ðeɪv',
  "i\'ll": 'aɪl', "you\'ll": 'juːl', "he\'ll": 'hiːl', "she\'ll": 'ʃiːl', "we\'ll": 'wiːl',
  "won\'t": 'woʊnt', "can\'t": 'kænt', "couldn\'t": 'ˈkʊdnt', "shouldn\'t": 'ˈʃʊdnt',
  "wouldn\'t": 'ˈwʊdnt', "isn\'t": 'ˈɪznt', "aren\'t": 'ɑːrnt',
  "wasn\'t": 'ˈwɒznt', "weren\'t": 'ˈwɜːrnt',
  "don\'t": 'doʊnt', "doesn\'t": 'ˈdʌznt', "didn\'t": 'ˈdɪdnt',
  "haven\'t": 'ˈhævnt', "hasn\'t": 'ˈhæznt', "hadn\'t": 'ˈhædnt',
  "let\'s": 'lets', "that\'s": 'ðæts', "there\'s": 'ðeərz', "what\'s": 'wʌts',
  "here\'s": 'hɪərz', "gonna": 'ˈɡɒnə', "gotta": 'ˈɡɒtə',
  "wanna": 'ˈwɒnə', "kinda": 'ˈkaɪndə', "sorta": 'ˈsɔːrtə',
  // Core verbs
  go: 'ɡoʊ', goes: 'ɡoʊz', went: 'went', gone: 'ɡɒn', going: 'ˈɡoʊɪŋ',
  get: 'ɡet', got: 'ɡɒt', getting: 'ˈɡetɪŋ',
  come: 'kʌm', came: 'keɪm', coming: 'ˈkʌmɪŋ',
  give: 'ɡɪv', gave: 'ɡeɪv', given: 'ˈɡɪvn', giving: 'ˈɡɪvɪŋ',
  take: 'teɪk', took: 'tʊk', taken: 'ˈteɪkən', taking: 'ˈteɪkɪŋ',
  make: 'meɪk', made: 'meɪd', making: 'ˈmeɪkɪŋ',
  know: 'noʊ', knew: 'njuː', known: 'noʊn', knowing: 'ˈnoʊɪŋ',
  think: 'θɪŋk', thought: 'θɔːt', thinking: 'ˈθɪŋkɪŋ',
  see: 'siː', saw: 'sɔː', seen: 'siːn', seeing: 'ˈsiːɪŋ',
  look: 'lʊk', looked: 'lʊkt', looking: 'ˈlʊkɪŋ',
  want: 'wɒnt', wanted: 'ˈwɒntɪd', wanting: 'ˈwɒntɪŋ',
  need: 'niːd', needed: 'ˈniːdɪd', needing: 'ˈniːdɪŋ',
  feel: 'fiːl', felt: 'felt', feeling: 'ˈfiːlɪŋ',
  say: 'seɪ', says: 'sez', said: 'sed', saying: 'ˈseɪɪŋ',
  tell: 'tel', told: 'toʊld', telling: 'ˈtelɪŋ',
  ask: 'æsk', asked: 'æskt', asking: 'ˈæskɪŋ',
  use: 'juːz', used: 'juːzd', using: 'ˈjuːzɪŋ',
  find: 'faɪnd', found: 'faʊnd', finding: 'ˈfaɪndɪŋ',
  try: 'traɪ', tried: 'traɪd', trying: 'ˈtraɪɪŋ',
  work: 'wɜːrk', worked: 'wɜːrkt', working: 'ˈwɜːrkɪŋ',
  call: 'kɔːl', called: 'kɔːld', calling: 'ˈkɔːlɪŋ',
  keep: 'kiːp', kept: 'kept', keeping: 'ˈkiːpɪŋ',
  let: 'let', letting: 'ˈletɪŋ',
  show: 'ʃoʊ', showed: 'ʃoʊd', shown: 'ʃoʊn', showing: 'ˈʃoʊɪŋ',
  hear: 'hɪər', heard: 'hɜːrd', hearing: 'ˈhɪərɪŋ',
  play: 'pleɪ', played: 'pleɪd', playing: 'ˈpleɪɪŋ',
  run: 'rʌn', ran: 'ræn', running: 'ˈrʌnɪŋ',
  move: 'muːv', moved: 'muːvd', moving: 'ˈmuːvɪŋ',
  live: 'lɪv', lived: 'lɪvd', living: 'ˈlɪvɪŋ',
  put: 'pʊt', putting: 'ˈpʊtɪŋ',
  bring: 'brɪŋ', brought: 'brɔːt', bringing: 'ˈbrɪŋɪŋ',
  turn: 'tɜːrn', turned: 'tɜːrnd', turning: 'ˈtɜːrnɪŋ',
  write: 'raɪt', wrote: 'roʊt', written: 'ˈrɪtən', writing: 'ˈraɪtɪŋ',
  read: 'riːd', reading: 'ˈriːdɪŋ',
  start: 'stɑːrt', started: 'ˈstɑːrtɪd', starting: 'ˈstɑːrtɪŋ',
  stop: 'stɒp', stopped: 'stɒpt', stopping: 'ˈstɒpɪŋ',
  wait: 'weɪt', waited: 'ˈweɪtɪd', waiting: 'ˈweɪtɪŋ',
  help: 'help', helped: 'helpt', helping: 'ˈhelpɪŋ',
  talk: 'tɔːk', talked: 'tɔːkt', talking: 'ˈtɔːkɪŋ',
  lose: 'luːz', lost: 'lɒst', losing: 'ˈluːzɪŋ',
  win: 'wɪn', won: 'wʌn', winning: 'ˈwɪnɪŋ',
  break: 'breɪk', broke: 'broʊk', broken: 'ˈbroʊkən', breaking: 'ˈbreɪkɪŋ',
  fall: 'fɔːl', fell: 'fel', fallen: 'ˈfɔːlən', falling: 'ˈfɔːlɪŋ',
  grow: 'ɡroʊ', grew: 'ɡruː', grown: 'ɡroʊn', growing: 'ˈɡroʊɪŋ',
  hold: 'hoʊld', held: 'held', holding: 'ˈhoʊldɪŋ',
  stand: 'stænd', stood: 'stʊd', standing: 'ˈstændɪŋ',
  leave: 'liːv', left: 'left', leaving: 'ˈliːvɪŋ',
  sleep: 'sliːp', slept: 'slept', sleeping: 'ˈsliːpɪŋ',
  eat: 'iːt', ate: 'eɪt', eaten: 'ˈiːtən', eating: 'ˈiːtɪŋ',
  drink: 'drɪŋk', drank: 'dræŋk', drunk: 'drʌŋk', drinking: 'ˈdrɪŋkɪŋ',
  buy: 'baɪ', bought: 'bɔːt', buying: 'ˈbaɪɪŋ',
  pay: 'peɪ', paid: 'peɪd', paying: 'ˈpeɪɪŋ',
  meet: 'miːt', met: 'met', meeting: 'ˈmiːtɪŋ',
  sit: 'sɪt', sat: 'sæt', sitting: 'ˈsɪtɪŋ',
  catch: 'kætʃ', caught: 'kɔːt', catching: 'ˈkætʃɪŋ',
  send: 'send', sent: 'sent', sending: 'ˈsendɪŋ',
  miss: 'mɪs', missed: 'mɪst', missing: 'ˈmɪsɪŋ',
  pass: 'pæs', passed: 'pæst', passing: 'ˈpæsɪŋ',
  learn: 'lɜːrn', learned: 'lɜːrnd', learning: 'ˈlɜːrnɪŋ',
  teach: 'tiːtʃ', taught: 'tɔːt', teaching: 'ˈtiːtʃɪŋ',
  understand: 'ˌʌndərˈstænd', understood: 'ˌʌndərˈstʊd',
  remember: 'rɪˈmembər', remembered: 'rɪˈmembərd',
  forget: 'fərˈɡet', forgot: 'fərˈɡɒt', forgotten: 'fərˈɡɒtn',
  decide: 'dɪˈsaɪd', decided: 'dɪˈsaɪdɪd', deciding: 'dɪˈsaɪdɪŋ',
  happen: 'ˈhæpən', happened: 'ˈhæpənd', happening: 'ˈhæpənɪŋ',
  change: 'tʃeɪndʒ', changed: 'tʃeɪndʒd', changing: 'ˈtʃeɪndʒɪŋ',
  agree: 'əˈɡriː', agreed: 'əˈɡriːd', agreeing: 'əˈɡriːɪŋ',
  allow: 'əˈlaʊ', allowed: 'əˈlaʊd',
  plan: 'plæn', planned: 'plænd', planning: 'ˈplænɪŋ',
  check: 'tʃek', checked: 'tʃekt', checking: 'ˈtʃekɪŋ',
  build: 'bɪld', built: 'bɪlt', building: 'ˈbɪldɪŋ',
  explain: 'ɪkˈspleɪn', explained: 'ɪkˈspleɪnd',
  compare: 'kəmˈpeər', compared: 'kəmˈpeərd',
  consider: 'kənˈsɪdər', considered: 'kənˈsɪdərd',
  believe: 'bɪˈliːv', believed: 'bɪˈliːvd', believing: 'bɪˈliːvɪŋ',
  worry: 'ˈwʌri', worried: 'ˈwʌrid', worrying: 'ˈwʌriɪŋ',
  care: 'keər', cared: 'keərd', caring: 'ˈkeərɪŋ',
  offer: 'ˈɒfər', offered: 'ˈɒfərd',
  accept: 'əkˈsept', accepted: 'əkˈseptɪd',
  suggest: 'səˈdʒest', suggested: 'səˈdʒestɪd',
  suppose: 'səˈpoʊz', supposed: 'səˈpoʊzd',
  realize: 'ˈriːəlaɪz', realized: 'ˈriːəlaɪzd',
  pretend: 'prɪˈtend', pretended: 'prɪˈtendɪd',
  admit: 'ədˈmɪt', admitted: 'ədˈmɪtɪd',
  promise: 'ˈprɒmɪs', promised: 'ˈprɒmɪst',
  apologize: 'əˈpɒlədʒaɪz',
  visit: 'ˈvɪzɪt', visited: 'ˈvɪzɪtɪd',
  travel: 'ˈtrævəl', traveled: 'ˈtrævəld',
  drive: 'draɪv', drove: 'droʊv', driven: 'ˈdrɪvən', driving: 'ˈdraɪvɪŋ',
  walk: 'wɔːk', walked: 'wɔːkt', walking: 'ˈwɔːkɪŋ',
  smile: 'smaɪl', smiled: 'smaɪld', smiling: 'ˈsmaɪlɪŋ',
  laugh: 'læf', laughed: 'læft', laughing: 'ˈlæfɪŋ',
  cry: 'kraɪ', cried: 'kraɪd', crying: 'ˈkraɪɪŋ',
  // Adjectives
  good: 'ɡʊd', bad: 'bæd', great: 'ɡreɪt', big: 'bɪɡ', small: 'smɔːl',
  large: 'lɑːrdʒ', little: 'ˈlɪtl', long: 'lɒŋ', short: 'ʃɔːrt',
  high: 'haɪ', low: 'loʊ', right: 'raɪt', wrong: 'rɒŋ',
  new: 'njuː', old: 'oʊld', young: 'jʌŋ', next: 'nekst', last: 'læst',
  first: 'fɜːrst', second: 'ˈsekənd', third: 'θɜːrd',
  same: 'seɪm', different: 'ˈdɪfrənt',
  hard: 'hɑːrd', easy: 'ˈiːzi', fast: 'fæst', slow: 'sloʊ',
  full: 'fʊl', empty: 'ˈempti',
  real: 'riːəl', true: 'truː', sure: 'ʃɔːr', clear: 'klɪər',
  free: 'friː', busy: 'ˈbɪzi', ready: 'ˈredi', late: 'leɪt', early: 'ˈɜːrli',
  important: 'ɪmˈpɔːrtənt', possible: 'ˈpɒsɪbl',
  interesting: 'ˈɪntrɪstɪŋ', boring: 'ˈbɔːrɪŋ', funny: 'ˈfʌni',
  happy: 'ˈhæpi', sad: 'sæd', angry: 'ˈæŋɡri', scared: 'skeərd',
  excited: 'ɪkˈsaɪtɪd', tired: 'ˈtaɪərd', surprised: 'səˈpraɪzd',
  beautiful: 'ˈbjuːtɪfl', nice: 'naɪs', lovely: 'ˈlʌvli',
  smart: 'smɑːrt', clever: 'ˈklevər',
  rich: 'rɪtʃ', poor: 'pɔːr', expensive: 'ɪkˈspensɪv', cheap: 'tʃiːp',
  strong: 'strɒŋ', weak: 'wiːk', heavy: 'ˈhevi', light: 'laɪt',
  hot: 'hɒt', cold: 'koʊld', warm: 'wɔːrm', cool: 'kuːl',
  dark: 'dɑːrk', bright: 'braɪt', clean: 'kliːn', dirty: 'ˈdɜːrti',
  safe: 'seɪf', careful: 'ˈkeərfl',
  serious: 'ˈsɪərɪəs', normal: 'ˈnɔːrməl', strange: 'streɪndʒ',
  special: 'ˈspeʃəl', perfect: 'ˈpɜːrfɪkt',
  terrible: 'ˈterɪbl', wonderful: 'ˈwʌndərfl',
  amazing: 'əˈmeɪzɪŋ', fantastic: 'fænˈtæstɪk', excellent: 'ˈeksələnt',
  awful: 'ˈɔːfl',
  // Emotions (system cards)
  frustrated: 'frʌˈstreɪtɪd', overwhelmed: 'ˌoʊvərˈwelmd', anxious: 'ˈæŋkʃəs',
  exhausted: 'ɪɡˈzɔːstɪd', relieved: 'rɪˈliːvd', devastated: 'ˈdevəsteɪtɪd',
  thrilled: 'θrɪld', nervous: 'ˈnɜːrvəs', terrified: 'ˈterɪfaɪd', gutted: 'ˈɡʌtɪd',
  homesick: 'ˈhoʊmsɪk', heartbroken: 'ˈhɑːrtˌbroʊkən', awkward: 'ˈɔːkwərd',
  jealous: 'ˈdʒeləs', nostalgic: 'nɒˈstældʒɪk', hyped: 'haɪpt',
  pumped: 'pʌmpt', burnt: 'bɜːrnt', stressed: 'strest', fed: 'fed',
  // Fillers
  basically: 'ˈbeɪsɪkli', literally: 'ˈlɪtərəli',
  anyway: 'ˈeniweɪ', whatever: 'wɒtˈevər', obviously: 'ˈɒbvɪəsli',
  apparently: 'əˈpærəntli', honestly: 'ˈɒnɪstli', personally: 'ˈpɜːrsənəli',
  kind: 'kaɪnd', sort: 'sɔːrt',
  // Reactions
  seriously: 'ˈsɪərɪəsli', bummer: 'ˈbʌmər', fair: 'feər',
  // Connectors
  also: 'ˈɔːlsoʊ', moreover: 'mɔːrˈoʊvər', besides: 'bɪˈsaɪdz',
  however: 'haʊˈevər', therefore: 'ˈðeərfɔːr', consequently: 'ˈkɒnsɪkwəntli',
  whereas: 'weərˈæz', meanwhile: 'ˈmiːnˌwaɪl',
  instead: 'ɪnˈsted', otherwise: 'ˈʌðərwaɪz', indeed: 'ɪnˈdiːd',
  due: 'djuː', finally: 'ˈfaɪnəli',
  firstly: 'ˈfɜːrstli', secondly: 'ˈsekəndli', similarly: 'ˈsɪmɪlərli',
  likewise: 'ˈlaɪkwaɪz', specifically: 'spəˈsɪfɪkli',
  // Traps
  actually: 'ˈæktʃuəli', eventually: 'ɪˈventʃuəli', embarrassed: 'ɪmˈbærəst',
  accurate: 'ˈækjərət', sympathetic: 'ˌsɪmpəˈθetɪk', magazine: 'ˌmæɡəˈziːn',
  upset: 'ʌpˈset', sensible: 'ˈsensɪbl', decade: 'ˈdekeɪd',
  ordinary: 'ˈɔːrdɪneri', intelligent: 'ɪnˈtelɪdʒənt', prospect: 'ˈprɒspekt',
  brilliant: 'ˈbrɪlɪənt', cabinet: 'ˈkæbɪnɪt', phrase: 'freɪz',
  proper: 'ˈprɒpər', comprehensive: 'ˌkɒmprɪˈhensɪv',
  // Nouns
  time: 'taɪm', year: 'jɪər', day: 'deɪ', week: 'wiːk', month: 'mʌnθ',
  way: 'weɪ', man: 'mæn', woman: 'ˈwʊmən', child: 'tʃaɪld', people: 'ˈpiːpl',
  place: 'pleɪs', world: 'wɜːrld', life: 'laɪf', hand: 'hænd', part: 'pɑːrt',
  name: 'neɪm', home: 'hoʊm', house: 'haʊs', door: 'dɔːr', room: 'ruːm',
  school: 'skuːl', job: 'dʒɒb', city: 'ˈsɪti', country: 'ˈkʌntri',
  water: 'ˈwɔːtər', food: 'fuːd', money: 'ˈmʌni', book: 'bʊk',
  car: 'kɑːr', phone: 'foʊn',
  // зачем: точная транскрипция вместо приблизительной из правил (репорт про [k] в pharmacy).
  pharmacy: 'ˈfɑːrməsi', pharmacies: 'ˈfɑːrməsiz',
  // зачем: репорт пользователя 21.09.2026 — guests показывалось как /gdʒʌːsts/.
  // Немой "u" после "g" правилами не выводится, поэтому всё гнездо — в словарь.
  guest: 'ɡest', guests: 'ɡests', guess: 'ɡes', guessed: 'ɡest', guessing: 'ˈɡesɪŋ',
  guide: 'ɡaɪd', guides: 'ɡaɪdz', guided: 'ˈɡaɪdɪd', guitar: 'ɡɪˈtɑːr',
  guard: 'ɡɑːrd', guards: 'ɡɑːrdz', guilty: 'ˈɡɪlti', league: 'liːɡ',
  tongue: 'tʌŋ', vague: 'veɪɡ', colleague: 'ˈkɒliːɡ', dialogue: 'ˈdaɪəlɒɡ',
  // зачем: слова, где побуквенные правила давали мусор (замер 21.09.2026):
  // girl → dʒɪrl, school → stʃʌːl, ghost → ɒst, two → twɒ, know → knæʊ.
  girl: 'ɡɜːrl', girls: 'ɡɜːrlz', boy: 'bɔɪ', boys: 'bɔɪz',
  two: 'tuː', once: 'wʌns', one: 'wʌn', ghost: 'ɡoʊst',
  island: 'ˈaɪlənd', knife: 'naɪf', knee: 'niː', knock: 'nɒk',
  half: 'hɑːf', castle: 'ˈkæsl', listen: 'ˈlɪsən',
  bread: 'bred', field: 'fiːld', piece: 'piːs', receive: 'rɪˈsiːv',
  weight: 'weɪt', eight: 'eɪt', height: 'haɪt',
  hour: 'ˈaʊər', honest: 'ˈɒnɪst', rhythm: 'ˈrɪðəm',
  sign: 'saɪn', design: 'dɪˈzaɪn', column: 'ˈkɒləm', autumn: 'ˈɔːtəm',
  debt: 'det', doubt: 'daʊt', subtle: 'ˈsʌtl', scissors: 'ˈsɪzərz',
  science: 'ˈsaɪəns', muscle: 'ˈmʌsl',
  character: 'ˈkærəktər', machine: 'məˈʃiːn', chef: 'ʃef',
  ocean: 'ˈoʊʃən', nation: 'ˈneɪʃən', picture: 'ˈpɪktʃər',
  future: 'ˈfjuːtʃər', usually: 'ˈjuːʒuəli', measure: 'ˈmeʒər',
  vision: 'ˈvɪʒən', bird: 'bɜːrd', earth: 'ɜːrθ',
  women: 'ˈwɪmɪn',
  cost: 'kɒst', costs: 'kɒsts', bag: 'bæɡ', bags: 'bæɡz',
  psychology: 'saɪˈkɒlədʒi', pneumonia: 'njuːˈmoʊniə',
  // зачем: слова, которые новый консервативный фильтр отсекает как
  // r-окрашенные / с удвоением, но которые часто встречаются на карточках.
  desk: 'desk', grass: 'ɡrɑːs', glass: 'ɡlɑːs', class: 'klɑːs',
  sword: 'sɔːrd', worth: 'wɜːrθ',
  story: 'ˈstɔːri', problem: 'ˈprɒbləm', question: 'ˈkwesʃən', answer: 'ˈænsər',
  idea: 'aɪˈdiːə', reason: 'ˈriːzən', point: 'pɔɪnt',
  fact: 'fækt', news: 'njuːz',
  friend: 'frend', family: 'ˈfæmɪli', parent: 'ˈpeərənt',
  brother: 'ˈbrʌðər', sister: 'ˈsɪstər', son: 'sʌn', daughter: 'ˈdɔːtər',
  heart: 'hɑːrt', head: 'hed', face: 'feɪs', eye: 'aɪ', ear: 'ɪər',
  arm: 'ɑːrm', leg: 'leɡ', foot: 'fʊt', back: 'bæk',
  morning: 'ˈmɔːrnɪŋ', evening: 'ˈiːvnɪŋ', night: 'naɪt',
  today: 'təˈdeɪ', tomorrow: 'təˈmɒroʊ', yesterday: 'ˈjestərdeɪ',
  here: 'hɪər', there: 'ðeər', now: 'naʊ',
  again: 'əˈɡen', still: 'stɪl', already: 'ɔːlˈredi',
  always: 'ˈɔːlweɪz', never: 'ˈnevər', sometimes: 'ˈsʌmtaɪmz', often: 'ˈɒfən',
  just: 'dʒʌst', really: 'ˈriːəli', very: 'ˈveri', quite: 'kwaɪt', too: 'tuː',
  only: 'ˈoʊnli', even: 'ˈiːvən',
  yes: 'jes', okay: 'oʊˈkeɪ', ok: 'oʊˈkeɪ', well: 'wel', oh: 'oʊ',
  wow: 'waʊ', hey: 'heɪ', hi: 'haɪ', hello: 'həˈloʊ', bye: 'baɪ',
  please: 'pliːz', thanks: 'θæŋks', thank: 'θæŋk', welcome: 'ˈwelkəm',
  sorry: 'ˈsɒri', excuse: 'ɪkˈskjuːz',
  mind: 'maɪnd', word: 'wɜːrd', hands: 'hændz', owe: 'oʊ',
  touch: 'tʌtʃ', base: 'beɪs', bear: 'beər', favor: 'ˈfeɪvər',
  slipped: 'slɪpt', reschedule: 'riːˈʃedjuːl',
  figure: 'ˈfɪɡər', follow: 'ˈfɒloʊ', apart: 'əˈpɑːrt',
  // зачем (репорты #6 #7 #25 #26, 21.10): слова фраз дня и уроков, которые правила по буквам
  // собирали неверно (ee→ɪː, ow→æʊ, th не читается, двойные буквы, глухая -s). Словарь стоит
  // раньше правил, поэтому запись здесь закрывает неверную сборку. «drivers» и «isnt» —
  // так слово выглядит после снятия апострофа в getTranscription.
  drivers: 'ˈdraɪvərz', seat: 'siːt', lines: 'laɪnz', table: 'ˈteɪbl', uses: 'ˈjuːzɪz',
  app: 'æp', apps: 'æps', isnt: 'ˈɪznt',
  bills: 'bɪlz', blow: 'bloʊ', boat: 'boʊt', body: 'ˈbɒdi', bush: 'bʊʃ', calls: 'kɔːlz',
  calm: 'kɑːm', cloud: 'klaʊd', feels: 'fiːlz', feet: 'fiːt', finds: 'faɪndz', gold: 'ɡoʊld',
  group: 'ɡruːp', hoops: 'huːps', icing: 'ˈaɪsɪŋ', july: 'dʒuˈlaɪ', keeps: 'kiːps',
  lazy: 'ˈleɪzi', loop: 'luːp', loud: 'laʊd', moon: 'muːn', mouth: 'maʊθ', needs: 'niːdz',
  noisy: 'ˈnɔɪzi', noon: 'nuːn', pins: 'pɪnz', plans: 'plænz', push: 'pʊʃ', puts: 'pʊts',
  riot: 'ˈraɪət', rooms: 'ruːmz', row: 'roʊ', runs: 'rʌnz', salt: 'sɔːlt', shoot: 'ʃuːt',
  shout: 'ʃaʊt', slowly: 'ˈsloʊli', sold: 'soʊld', soon: 'suːn', sounds: 'saʊndz',
  soup: 'suːp', south: 'saʊθ', street: 'striːt', study: 'ˈstʌdi', sweet: 'swiːt',
  teeth: 'tiːθ', than: 'ðæn', thick: 'θɪk', thin: 'θɪn', things: 'θɪŋz', throw: 'θroʊ',
  throws: 'θroʊz', tooth: 'tuːθ', trees: 'triːz', truth: 'truːθ', waking: 'ˈweɪkɪŋ',
  walls: 'wɔːlz', wants: 'wɒnts', wasting: 'ˈweɪstɪŋ', watch: 'wɒtʃ', watching: 'ˈwɒtʃɪŋ',
  wild: 'waɪld', wind: 'wɪnd', cooking: 'ˈkʊkɪŋ', drawing: 'ˈdrɔːɪŋ', fixing: 'ˈfɪksɪŋ',
  // зачем (21.10, координатор): слова фраз дня и уроков, у которых транскрипции не было
  // совсем (568 шт.) — иначе фраза с любым из них показывалась без транскрипции.
  documents: 'ˈdɒkjʊmənts', messages: 'ˈmesɪdʒɪz', keys: 'kiːz', tickets: 'ˈtɪkɪts',
  outside: 'ˌaʊtˈsaɪd', key: 'kiː', coffee: 'ˈkɒfi', english: 'ˈɪŋɡlɪʃ', ticket: 'ˈtɪkɪt',
  near: 'nɪər', dinner: 'ˈdɪnər', tv: 'ˌtiːˈviː', charger: 'ˈtʃɑːrdʒər', later: 'ˈleɪtər',
  better: 'ˈbetər', glasses: 'ˈɡlæsɪz', finished: 'ˈfɪnɪʃt', cleaned: 'kliːnd', open: 'ˈoʊpən',
  cannot: 'ˈkænɒt', message: 'ˈmesɪdʒ', whose: 'huːz', music: 'ˈmjuːzɪk', finish: 'ˈfɪnɪʃ',
  questions: 'ˈkwestʃənz', works: 'wɜːrks', order: 'ˈɔːrdər', option: 'ˈɒpʃən',
  together: 'təˈɡeðər', inside: 'ˌɪnˈsaɪd', helps: 'helps', mistakes: 'mɪˈsteɪks',
  problems: 'ˈprɒbləmz', passport: 'ˈpæspɔːrt', wake: 'weɪk', chair: 'tʃeər', mine: 'maɪn',
  like: 'laɪk', close: 'kloʊz', cooked: 'kʊkt', opened: 'ˈoʊpənd', lights: 'laɪts', shoes: 'ʃuːz',
  listening: 'ˈlɪsənɪŋ', cleaning: 'ˈkliːnɪŋ', hurt: 'hɜːrt', sell: 'sel', rest: 'rest',
  knows: 'noʊz', takes: 'teɪks', wear: 'weər', friday: 'ˈfraɪdeɪ', answered: 'ˈænsərd',
  letter: 'ˈletər', yours: 'jɔːrz', bed: 'bed', tea: 'tiː', friends: 'frendz',
  dangerous: 'ˈdeɪndʒərəs', cars: 'kɑːrz', umbrella: 'ʌmˈbrelə', phones: 'foʊnz', closed: 'kloʊzd',
  hours: 'ˈaʊərz', ago: 'əˈɡoʊ', faster: 'ˈfæstər', lesson: 'ˈlesən', ours: 'ˈaʊərz',
  theirs: 'ðeərz', jacket: 'ˈdʒækɪt', speaking: 'ˈspiːkɪŋ', wallet: 'ˈwɒlɪt', solved: 'sɒlvd',
  ever: 'ˈevər', burn: 'bɜːrn', midnight: 'ˈmɪdnaɪt', pull: 'pʊl', nine: 'naɪn', meat: 'miːt',
  speak: 'spiːk', monday: 'ˈmʌndeɪ', weekends: 'ˈwiːkendz', studies: 'ˈstʌdiz', summer: 'ˈsʌmər',
  chose: 'tʃoʊz', hotel: 'hoʊˈtel', studying: 'ˈstʌdiɪŋ', enjoy: 'ɪnˈdʒɔɪ', hate: 'heɪt',
  password: 'ˈpæswɜːrd', quickly: 'ˈkwɪkli', rules: 'ruːlz', invited: 'ɪnˈvaɪtɪd',
  arrived: 'əˈraɪvd', spend: 'spend', person: 'ˈpɜːrsən', teacher: 'ˈtiːtʃər',
  student: 'ˈstjuːdənt', experienced: 'ɪkˈspɪəriənst', someones: 'ˈsʌmwʌnz', cake: 'keɪk',
  best: 'best', hungry: 'ˈhʌŋɡri', lives: 'lɪvz', smoke: 'smoʊk', waste: 'weɪst', share: 'ʃeər',
  'wi-fi': 'ˈwaɪfaɪ', winter: 'ˈwɪntər', sunday: 'ˈsʌndeɪ', rent: 'rent', ideas: 'aɪˈdɪəz',
  prepared: 'prɪˈpeərd', fixed: 'fɪkst', discussed: 'dɪˈskʌst', tonight: 'təˈnaɪt', worse: 'wɜːrs',
  easier: 'ˈiːziər', away: 'əˈweɪ', behind: 'bɪˈhaɪnd', somebody: 'ˈsʌmbədi', online: 'ˌɒnˈlaɪn',
  clearly: 'ˈklɪərli', prepare: 'prɪˈpeər', driver: 'ˈdraɪvər', huge: 'hjuːdʒ',
  noticed: 'ˈnoʊtɪst', rather: 'ˈræðər', bite: 'baɪt', steal: 'stiːl', wrap: 'ræp', tree: 'triː',
  square: 'skweər', spill: 'spɪl', beans: 'biːnz', ice: 'aɪs', nose: 'noʊz', steam: 'stiːm',
  heat: 'hiːt', ball: 'bɔːl', horses: 'ˈhɔːrsɪz', rabbit: 'ˈræbɪt', storm: 'stɔːrm', eyes: 'aɪz',
  chew: 'tʃuː', straight: 'streɪt', ears: 'ɪərz', whole: 'hoʊl', system: 'ˈsɪstəm',
  shoulder: 'ˈʃoʊldər', fence: 'fens', envelope: 'ˈenvəloʊp', horse: 'hɔːrs', afraid: 'əˈfreɪd',
  speaks: 'spiːks', dishes: 'ˈdɪʃɪz', names: 'neɪmz', pizza: 'ˈpiːtsə', carry: 'ˈkæri',
  breakfast: 'ˈbrekfəst', reserve: 'rɪˈzɜːrv', doors: 'dɔːrz', mail: 'meɪl', windows: 'ˈwɪndoʊz',
  leaves: 'liːvz', tuesday: 'ˈtjuːzdeɪ', five: 'faɪv', reads: 'riːdz', passwords: 'ˈpæswɜːrdz',
  washed: 'wɒʃt', ordered: 'ˈɔːrdərd', charged: 'tʃɑːrdʒd', returned: 'rɪˈtɜːrnd',
  parked: 'pɑːrkt', cheaper: 'ˈtʃiːpər', harder: 'ˈhɑːrdər', newer: 'ˈnjuːər',
  cheapest: 'ˈtʃiːpɪst', papers: 'ˈpeɪpərz', ordering: 'ˈɔːrdərɪŋ', opposite: 'ˈɒpəzɪt',
  sends: 'sendz', knocked: 'nɒkt', anybody: 'ˈeniˌbɒdi', likes: 'laɪks', hates: 'heɪts',
  avoid: 'əˈvɔɪd', carefully: 'ˈkeərfəli', document: 'ˈdɒkjʊmənt', oclock: 'əˈklɒk',
  raining: 'ˈreɪnɪŋ', rains: 'reɪnz', stay: 'steɪ', save: 'seɪv', mistake: 'mɪˈsteɪk',
  yourselves: 'jɔːrˈselvz', control: 'kənˈtroʊl', blame: 'bleɪm', shy: 'ʃaɪ', stayed: 'steɪd',
  famous: 'ˈfeɪməs', shake: 'ʃeɪk', sharp: 'ʃɑːrp', furious: 'ˈfjʊəriəs', manager: 'ˈmænɪdʒər',
  wooden: 'ˈwʊdən', local: 'ˈloʊkəl', engine: 'ˈendʒɪn', chase: 'tʃeɪs', weather: 'ˈweðər',
  bullet: 'ˈbʊlɪt', blue: 'bluː', grain: 'ɡreɪn', thunder: 'ˈθʌndər', elephant: 'ˈelɪfənt',
  hay: 'heɪ', bridges: 'ˈbrɪdʒɪz', chin: 'tʃɪn', spilled: 'spɪld', bark: 'bɑːrk',
  blessing: 'ˈblesɪŋ', disguise: 'dɪsˈɡaɪz', curiosity: 'ˌkjʊəriˈɒsəti', killed: 'kɪld',
  'win-win': 'ˌwɪnˈwɪn', biggie: 'ˈbɪɡi', nutshell: 'ˈnʌtʃel', 'catch-22': 'ˌkætʃ ˌtwentiˈtuː',
  fingers: 'ˈfɪŋɡərz', crossed: 'krɒst', beat: 'biːt', nail: 'neɪl', sweat: 'swet', red: 'red',
  air: 'eər', extra: 'ˈekstrə', mile: 'maɪl', rule: 'ruːl', thumb: 'θʌm', bell: 'bel',
  moment: 'ˈmoʊmənt', bandwagon: 'ˈbændˌwæɡən', bent: 'bent', shape: 'ʃeɪp', court: 'kɔːrt',
  worlds: 'wɜːrldz', candle: 'ˈkændəl', ends: 'endz', board: 'bɔːrd', belt: 'belt', hole: 'hoʊl',
  bridge: 'brɪdʒ', humble: 'ˈhʌmbəl', pie: 'paɪ', page: 'peɪdʒ', corners: 'ˈkɔːrnərz',
  breeze: 'briːz', wolf: 'wʊlf', teacup: 'ˈtiːkʌp', bay: 'beɪ', fiddle: 'ˈfɪdəl', kill: 'kɪl',
  birds: 'bɜːrdz', stone: 'stoʊn', steer: 'stɪər', arms: 'ɑːrmz', devils: 'ˈdevəlz',
  advocate: 'ˈædvəkət', loose: 'luːs', cannon: 'ˈkænən', dime: 'daɪm', dozen: 'ˈdʌzən',
  wire: 'ˈwaɪər', plain: 'pleɪn', sailing: 'ˈseɪlɪŋ', iceberg: 'ˈaɪsbɜːrɡ', pickle: 'ˈpɪkəl',
  rain: 'reɪn', yards: 'jɑːrdz', radar: 'ˈreɪdɑːr', bluff: 'blʌf', caution: 'ˈkɔːʃən',
  turkey: 'ˈtɜːrki', grapevine: 'ˈɡreɪpvaɪn', camels: 'ˈkæməlz', potato: 'pəˈteɪtoʊ',
  skeleton: 'ˈskelɪtən', closet: 'ˈklɒzɪt', bone: 'boʊn', limelight: 'ˈlaɪmlaɪt',
  posted: 'ˈpoʊstɪd', sky: 'skaɪ', limit: 'ˈlɪmɪt', floor: 'flɔːr', flames: 'fleɪmz',
  handle: 'ˈhændəl', mustard: 'ˈmʌstərd', towel: 'ˈtaʊəl', bacon: 'ˈbeɪkən', forest: 'ˈfɒrɪst',
  stiff: 'stɪf', upper: 'ˈʌpər', tight: 'taɪt', shark: 'ʃɑːrk', 'pear-shaped': 'ˈpeərʃeɪpt',
  oar: 'ɔːr', curveball: 'ˈkɜːrvbɔːl', daisies: 'ˈdeɪziz', bucket: 'ˈbʌkɪt', mickey: 'ˈmɪki',
  wet: 'wet', blanket: 'ˈblæŋkɪt', needles: 'ˈniːdəlz', scary: 'ˈskeəri', far: 'fɑːr',
  eats: 'iːts', loves: 'lʌvz', writes: 'raɪts', washes: 'ˈwɒʃɪz', teaches: 'ˈtiːtʃɪz',
  wears: 'weərz', remembers: 'rɪˈmembərz', sugar: 'ˈʃʊɡər', cards: 'kɑːrdz', taxes: 'ˈtæksɪz',
  vegetables: 'ˈvedʒtəbəlz', reports: 'rɪˈpɔːrts', exits: 'ˈeɡzɪts', groceries: 'ˈɡroʊsəriz',
  meetings: 'ˈmiːtɪŋz', luggage: 'ˈlʌɡɪdʒ', routes: 'ruːts', cafe: 'ˈkæfeɪ',
  chargers: 'ˈtʃɑːrdʒərz', tuesdays: 'ˈtjuːzdeɪz', wednesdays: 'ˈwenzdeɪz', saturday: 'ˈsætərdeɪ',
  shower: 'ˈʃaʊər', january: 'ˈdʒænjuəri', finishes: 'ˈfɪnɪʃɪz', birthday: 'ˈbɜːrθdeɪ',
  october: 'ɒkˈtoʊbər', checks: 'tʃeks', mondays: 'ˈmʌndeɪz', enter: 'ˈentər', watched: 'wɒtʃt',
  clothes: 'kloʊðz', listened: 'ˈlɪsənd', packed: 'pækt', booked: 'bʊkt', rented: 'ˈrentɪd',
  printed: 'ˈprɪntɪd', tables: 'ˈteɪbəlz', painted: 'ˈpeɪntɪd', saved: 'seɪvd',
  canceled: 'ˈkænsəld', deleted: 'dɪˈliːtɪd', mailed: 'meɪld', delivered: 'dɪˈlɪvərd',
  locked: 'lɒkt', brushed: 'brʌʃt', hair: 'heər', headphones: 'ˈhedfoʊnz', advice: 'ədˈvaɪs',
  juice: 'dʒuːs', spoke: 'spoʊk', wore: 'wɔːr', ten: 'ten', minutes: 'ˈmɪnɪts', days: 'deɪz',
  choose: 'tʃuːz', happier: 'ˈhæpiər', slower: 'ˈsloʊər', safer: 'ˈseɪfər', colder: 'ˈkoʊldər',
  warmer: 'ˈwɔːrmər', lighter: 'ˈlaɪtər', heavier: 'ˈheviər', older: 'ˈoʊldər',
  shorter: 'ˈʃɔːrtər', longer: 'ˈlɒŋɡər', clearer: 'ˈklɪərər', confusing: 'kənˈfjuːzɪŋ',
  worst: 'wɜːrst', fastest: 'ˈfæstɪst', slowest: 'ˈsloʊɪst', easiest: 'ˈiːziɪst',
  hardest: 'ˈhɑːrdɪst', safest: 'ˈseɪfɪst', gives: 'ɡɪvz', woke: 'woʊk', inbox: 'ˈɪnbɒks',
  everybody: 'ˈevriˌbɒdi', understands: 'ˌʌndərˈstændz', simple: 'ˈsɪmpəl', useful: 'ˈjuːsfəl',
  practice: 'ˈpræktɪs', enjoys: 'ɪnˈdʒɔɪz', traveling: 'ˈtrævəlɪŋ', spending: 'ˈspendɪŋ',
  avoids: 'əˈvɔɪdz', finishing: 'ˈfɪnɪʃɪŋ', answers: 'ˈænsərz', supported: 'səˈpɔːrtɪd',
  signed: 'saɪnd', chosen: 'ˈtʃoʊzən', then: 'ðen', discussing: 'dɪˈskʌsɪŋ', movie: 'ˈmuːvi',
  improve: 'ɪmˈpruːv', invite: 'ɪnˈvaɪt', restart: 'ˌriːˈstɑːrt', gets: 'ɡets', comes: 'kʌmz',
  press: 'pres', button: 'ˈbʌtən', starts: 'stɑːrts', arrive: 'əˈraɪv', warned: 'wɔːrnd',
  replied: 'rɪˈplaɪd', protected: 'prəˈtektɪd', protect: 'prəˈtekt', force: 'fɔːrs',
  forgive: 'fərˈɡɪv', remind: 'rɪˈmaɪnd', saves: 'seɪvz', patient: 'ˈpeɪʃənt',
  fridays: 'ˈfraɪdeɪz', confidently: 'ˈkɒnfɪdəntli', learns: 'lɜːrnz', doctor: 'ˈdɒktər',
  nearby: 'ˌnɪərˈbaɪ', correctly: 'kəˈrektli', words: 'wɜːrdz', inexperienced: 'ˌɪnɪkˈspɪəriənst',
  fine: 'faɪn', pilot: 'ˈpaɪlət', complex: 'ˈkɒmpleks', flight: 'flaɪt', procedure: 'prəˈsiːdʒər',
  raindrop: 'ˈreɪndrɒp', suspicious: 'səˈspɪʃəs', visitor: 'ˈvɪzɪtər', contents: 'ˈkɒntents',
  leather: 'ˈleðər', briefcase: 'ˈbriːfkeɪs', singer: 'ˈsɪŋər', jazz: 'dʒæz',
  composition: 'ˌkɒmpəˈzɪʃən', chocolate: 'ˈtʃɒklət', powerful: 'ˈpaʊərfəl', tremor: 'ˈtremər',
  wall: 'wɔːl', unknown: 'ˌʌnˈnoʊn', protesters: 'prəˈtestərz', political: 'pəˈlɪtɪkəl',
  slogans: 'ˈsloʊɡənz', lightning: 'ˈlaɪtnɪŋ', strike: 'straɪk', lonely: 'ˈloʊnli', hill: 'hɪl',
  pale: 'peɪl', boss: 'bɒs', skillful: 'ˈskɪlfəl', carpenter: 'ˈkɑːrpəntər', ladder: 'ˈlædər',
  workers: 'ˈwɜːrkərz', discuss: 'dɪˈskʌs', production: 'prəˈdʌkʃən', quota: 'ˈkwoʊtə',
  reliable: 'rɪˈlaɪəbəl', supplier: 'səˈplaɪər', deliver: 'dɪˈlɪvər', necessary: 'ˈnesəseri',
  construction: 'kənˈstrʌkʃən', materials: 'məˈtɪəriəlz', foreign: 'ˈfɒrən',
  delegation: 'ˌdelɪˈɡeɪʃən', inspect: 'ɪnˈspekt', modern: 'ˈmɒdərn', chemical: 'ˈkemɪkəl',
  laboratory: 'ˈlæbrətɔːri', inspector: 'ɪnˈspektər', needle: 'ˈniːdəl', pierce: 'pɪərs',
  protective: 'prəˈtektɪv', layer: 'ˈleɪər', genius: 'ˈdʒiːniəs', secret: 'ˈsiːkrət',
  government: 'ˈɡʌvərnmənt', farmer: 'ˈfɑːrmər', irrigation: 'ˌɪrɪˈɡeɪʃən',
  efficiently: 'ɪˈfɪʃəntli', customer: 'ˈkʌstəmər', demand: 'dɪˈmænd', immediate: 'ɪˈmiːdiət',
  refund: 'ˈriːfʌnd', woolen: 'ˈwʊlən', fabric: 'ˈfæbrɪk', sensitive: 'ˈsensətɪv',
  archaeologist: 'ˌɑːrkiˈɒlədʒɪst', rare: 'reər', wise: 'waɪz', mentor: 'ˈmentɔːr',
  rewrite: 'ˌriːˈraɪt', graduation: 'ˌɡrædʒuˈeɪʃən', thesis: 'ˈθiːsɪs', talented: 'ˈtæləntɪd',
  violinist: 'ˌvaɪəˈlɪnɪst', perform: 'pərˈfɔːrm', melody: 'ˈmelədi', reporter: 'rɪˈpɔːrtər',
  interview: 'ˈɪntərvjuː', mayor: 'ˈmeɪər', landlord: 'ˈlændlɔːrd', tenant: 'ˈtenənt',
  electricity: 'ɪˌlekˈtrɪsəti', bill: 'bɪl', object: 'əbˈdʒekt', engineer: 'ˌendʒɪˈnɪər',
  test: 'test', solar: 'ˈsoʊlər', stray: 'streɪ', cross: 'krɒs', quiet: 'ˈkwaɪət',
  difficult: 'ˈdɪfɪkəlt', sunlight: 'ˈsʌnlaɪt', reach: 'riːtʃ', tall: 'tɔːl',
  stranger: 'ˈstreɪndʒər', crowded: 'ˈkraʊdɪd', station: 'ˈsteɪʃən', brave: 'breɪv',
  firefighter: 'ˈfaɪərˌfaɪtər', panicked: 'ˈpænɪkt', emergency: 'ɪˈmɜːrdʒənsi', exit: 'ˈeɡzɪt',
  couple: 'ˈkʌpəl', wedding: 'ˈwedɪŋ', candidate: 'ˈkændɪdət', official: 'əˈfɪʃəl',
  artist: 'ˈɑːrtɪst', paint: 'peɪnt', massive: 'ˈmæsɪv', mural: 'ˈmjʊərəl', cart: 'kɑːrt',
  nurse: 'nɜːrs', bitter: 'ˈbɪtər', medicine: 'ˈmedɪsən', metal: 'ˈmetəl', drain: 'dreɪn',
  judge: 'dʒʌdʒ', announce: 'əˈnaʊns', surprising: 'sərˈpraɪzɪŋ', verdict: 'ˈvɜːrdɪkt',
  earthquake: 'ˈɜːrθkweɪk', helpful: 'ˈhelpfəl', ancient: 'ˈeɪnʃənt', tourist: 'ˈtʊərɪst',
  firm: 'fɜːrm', employee: 'ɪmˈplɔɪiː', report: 'rɪˈpɔːrt', skilled: 'skɪld', mechanic: 'məˈkænɪk',
  onto: 'ˈɒntuː', bare: 'beər', earlier: 'ˈɜːrliər', vibrate: 'vaɪˈbreɪt',
  // Multi-word phrases (checked before word-by-word)
  'kind of': 'kaɪnd ɒv', 'sort of': 'sɔːrt ɒv',
  'you know': 'juː noʊ', 'i mean': 'aɪ miːn',
  'by the way': 'baɪ ðə weɪ', 'to be fair': 'tuː biː feər',
  'no offense': 'noʊ əˈfens', 'to be honest': 'tuː biː ˈɒnɪst',
  'you see': 'juː siː',
  'at the end of the day': 'æt ðə end ɒv ðə deɪ',
  'come to think of it': 'kʌm tuː θɪŋk ɒv ɪt',
  'fair enough': 'feər ɪˈnʌf', 'no way': 'noʊ weɪ', 'come on': 'kʌm ɒn',
  'my bad': 'maɪ bæd',
  'fed up': 'fed ʌp', 'burnt out': 'bɜːrnt aʊt', 'pumped up': 'pʌmpt ʌp',
  'stressed out': 'strest aʊt',
  'figure out': 'ˈfɪɡər aʊt', 'follow up': 'ˈfɒloʊ ʌp', 'grow apart': 'ɡroʊ əˈpɑːrt',
  'give up': 'ɡɪv ʌp', 'look into': 'lʊk ˈɪntʊ', 'come up with': 'kʌm ʌp wɪð',
  'run out of': 'rʌn aʊt ɒv', 'put off': 'pʊt ɒf', 'get along': 'ɡet əˈlɒŋ',
  'bring up': 'brɪŋ ʌp', 'let down': 'let daʊn', 'catch up': 'kætʃ ʌp',
  'deal with': 'diːl wɪð', 'end up': 'end ʌp', 'fall apart': 'fɔːl əˈpɑːrt',
  'get over': 'ɡet ˈoʊvər', 'hold on': 'hoʊld ɒn', 'make up': 'meɪk ʌp',
  'point out': 'pɔɪnt aʊt', 'turn out': 'tɜːrn aʊt',
  'break a leg': 'breɪk ə leɡ', 'cut to the chase': 'kʌt tuː ðə tʃeɪs',
  'under the weather': 'ˈʌndər ðə ˈweðər', 'bite the bullet': 'baɪt ðə ˈbʊlɪt',
  'first of all': 'fɜːrst ɒv ɔːl', 'to begin with': 'tuː bɪˈɡɪn wɪð',
  'in addition': 'ɪn əˈdɪʃən', 'in the same way': 'ɪn ðə seɪm weɪ',
  'compared to': 'kəmˈpeərd tuː', 'just like': 'dʒʌst laɪk',
  'due to': 'djuː tuː', "that\'s why": 'ðæts waɪ',
  'in fact': 'ɪn fækt', 'in other words': 'ɪn ˈʌðər wɜːrdz',
  'that is to say': 'ðæt ɪz tuː seɪ', 'after that': 'ˈæftər ðæt',
  'i think': 'aɪ θɪŋk', 'i believe': 'aɪ bɪˈliːv',
  'in my opinion': 'ɪn maɪ əˈpɪnjən',
  'from my point of view': 'frɒm maɪ pɔɪnt ɒv vjuː',
  "i\'m on my way": 'aɪm ɒn maɪ weɪ',
  'that works for me': 'ðæt wɜːrks fɔːr miː',
  'it slipped my mind': 'ɪt slɪpt maɪ maɪnd',
  'i owe you one': 'aɪ oʊ juː wʌn',
  'just checking in': 'dʒʌst ˈtʃekɪŋ ɪn',
  "bear with me": 'beər wɪð miː',
  'long story short': 'lɒŋ ˈstɔːri ʃɔːrt',
  'my hands are full': 'maɪ hændz ɑːr fʊl',
  "i\'ll keep that in mind": 'aɪl kiːp ðæt ɪn maɪnd',
  "sorry, i\'m running late": 'ˈsɒri aɪm ˈrʌnɪŋ leɪt',
  'you had me worried': 'juː hæd miː ˈwʌrid',
  'could you do me a favor': 'kʊd juː duː miː ə ˈfeɪvər',
  "let\'s touch base": 'lets tʌtʃ beɪs',
  "i\'ll take your word for it": 'aɪl teɪk jɔːr wɜːrd fɔːr ɪt',
  "what\'s taking so long": 'wʌts ˈteɪkɪŋ soʊ lɒŋ',
  'something came up': 'ˈsʌmθɪŋ keɪm ʌp',
  "let\'s call it a day": 'lets kɔːl ɪt ə deɪ',
  "i\'ll get back to you": 'aɪl ɡet bæk tuː juː',
  'can we reschedule': 'kæn wiː riːˈʃedjuːl',
  'sorry to keep you waiting': 'ˈsɒri tuː kiːp juː ˈweɪtɪŋ',
};

// ─── Conservative rule-based IPA ──────────────────────────────────────────────
// зачем: прежняя версия обещала результат для ЛЮБОГО слова и потому врала.
// Замер 21.09.2026 на 70 частотных словах: 40+ мусорных выдач
// (guests → gdʒʌːsts, girl → dʒɪrl, school → stʃʌːl, ghost → ɒst, two → twɒ).
// Теперь правила применяются только к словам с регулярной орфографией,
// а всё, что похоже на исключение, честно отдаётся как "не знаю" (null).

/**
 * Написания, которые побуквенными правилами не берутся никогда.
 * Слово с таким куском обязано жить в словаре, иначе транскрипции не будет.
 */
const IRREGULAR_SPELLINGS: RegExp[] = [
  /^gu[ei]/,          // guest, guess, guide — немой u
  /^kn/,              // knife, know — немой k
  /^wr/,              // write, wrong — немой w
  /^ps/, /^pn/, /^mn/, // psychology, pneumonia — немой первый согласный
  /^rh/,              // rhythm, rhyme
  /gh/,               // ghost, night, enough, laugh — читается тремя разными способами
  /ough|augh/,        // though, through, bought, laugh — классика непредсказуемости
  /mb$/, /mn$/,       // climb, column — немой конец
  /^wh?o/,            // who, whose, one, once — отдельный класс
  /ea/,               // bread/great/heart/bead — четыре разных чтения
  /ie|ei/,            // field/friend/receive/eight
  /^ch/,              // chef/character/chair — три чтения
  /tion|sion|ture|sure|cious|tious/, // nation, picture, measure — нужен словарь
  /^[^aeiou]*[aeiou][^aeiou]*e$/,    // silent-e: come/some/done ломают правило
  /ould|alk|alf|sten|stle|^is(l)/,   // could, walk, half, listen, castle, island
  /bt|mn|sc(?=[ei])/, // debt, autumn, science, muscle
  /^o(n|nce)$/,       // one, once
  /^sw?or/,           // sword (немой w), word, work — "or" после s/w нестабильно
  /^[wq]u?o/,         // who, quote, work
  /ar$|er$|or$|ir$|ur$|[aeiou]r[^aeiou]/, // r-окрашенные гласные: car, bird,
                      // word, turn — долгота и качество правилами не берутся
  /ss$|ll$|ff$|zz$/,  // grass, will, off — удвоение меняет гласную (grass /ɑː/)
];

/**
 * Приблизительная IPA по правилам — только для регулярных написаний.
 * Возвращает null, когда уверенности нет: лучше не показать транскрипцию,
 * чем показать выдуманную.
 */
function ruleBasedIPA(word: string): string | null {
  const w = word.toLowerCase();

  // зачем: слишком короткое или слишком длинное — доверия нет.
  // Короткие служебные слова уже есть в словаре, длинные почти всегда
  // содержат ударение, которое правилами не расставить.
  if (w.length < 3 || w.length > 8) return null;
  if (!/^[a-z]+$/.test(w)) return null;

  for (const irregular of IRREGULAR_SPELLINGS) {
    if (irregular.test(w)) return null;
  }

  // Регулярная слоговая структура: согласные + гласная + согласные,
  // опционально с обычным окончанием. Всё сложнее — в словарь.
  const regular = /^([bcdfghjklmnpqrstvwxyz]{0,3})([aeiou]{1,2})([bcdfghjklmnpqrstvwxyz]{1,3})(s|es|ed|ing)?$/;
  if (!regular.test(w)) return null;

  const rules: [RegExp, string][] = [
    // Диграфы, читающиеся однозначно
    [/tch/g, 'tʃ'], [/ch/g, 'tʃ'], [/sh/g, 'ʃ'],
    [/ph/g, 'f'], [/ng/g, 'ŋ'], [/nk/g, 'ŋk'],
    [/ck/g, 'k'], [/qu/g, 'kw'],
    // Гласные диграфы с устойчивым чтением
    [/oo/g, 'ʊ'], [/ee/g, 'iː'], [/oa/g, 'oʊ'],
    [/ou/g, 'aʊ'], [/ow/g, 'aʊ'], [/oi/g, 'ɔɪ'], [/oy/g, 'ɔɪ'],
    [/au/g, 'ɔː'], [/aw/g, 'ɔː'], [/ai/g, 'eɪ'], [/ay/g, 'eɪ'],
    // Согласные
    // зачем: мягкая "c" — перед e, i и y (pharmacy, agency, policy, fancy);
    // без "y" в классе все слова на -cy читались через [k] (старый репорт).
    [/c(?=[eiy])/g, 's'], [/c/g, 'k'],
    // зачем: "g" перед e/i мягкая НЕ всегда (get, give, girl, gift),
    // поэтому в надёжном режиме всегда твёрдая — мягкие случаи в словаре.
    [/g/g, 'ɡ'],
    [/x/g, 'ks'], [/j/g, 'dʒ'],
    [/y(?=[aeiou])/g, 'j'], [/y\b/g, 'i'],
    // Краткие гласные
    [/a/g, 'æ'], [/e/g, 'e'], [/i/g, 'ɪ'], [/o/g, 'ɒ'], [/u/g, 'ʌ'],
  ];

  let result = w;
  for (const [pattern, replacement] of rules) {
    result = result.replace(pattern, replacement);
  }

  // зачем: согласные b d f h k l m n p r s t v w z в IPA пишутся теми же
  // знаками, что и в латинице, — они законны. А вот буквы, у которых в IPA
  // есть отдельный символ (c, g, j, q, x, y) или которые должны были стать
  // гласными (a e i o u), остаться не имеют права: их наличие означает,
  // что правила не справились. Такой результат не показываем.
  if (/[aeiougcjqxy]/.test(result)) return null;

  return result;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Нужно ли перегенерировать сохранённую транскрипцию?
 *
 * зачем: транскрипция пишется в документ карточки навсегда, поэтому у
 * пострадавших от версии 1 в поле лежит выдумка ("/gdʒʌːsts/" вместо
 * "/ɡests/"). Миграция «чиним только пустые» их бы не тронула никогда.
 *
 * ВАЖНО, как НЕ надо: распознавать порчу по виду строки нельзя. Проверка
 * «есть латинские гласные → мусор» выглядит логично и полностью неверна:
 * замер на словаре (872 записи) пометил бы 525 ПРАВИЛЬНЫХ записей как мусор
 * (ðem, ˈeni, skuːl, aɪ — в IPA эти буквы законны) и при этом не поймал бы
 * реальный мусор /dʒɪrl/, собранный из легальных символов. Такая миграция
 * стёрла бы верные транскрипции у всех пользователей.
 *
 * Единственный надёжный признак — ЧЕМ сгенерировано. Карточка несёт версию
 * движка; всё, что записано версией ниже текущей, перегенерируется один раз.
 */
export function needsTranscriptionRefresh(engineVersion: number | undefined): boolean {
  return (engineVersion ?? 1) < TRANSCRIPTION_ENGINE_VERSION;
}

/**
 * Откуда берётся транскрипция одного слова: словарь, побуквенные правила или ничего.
 *
 * зачем (10.10): сторож «правда или молчание» ловил выдумку по латинице, а правильная IPA сама
 * содержит латинские буквы (см. 525 из 872 словарных записей). Честный признак — источник ответа.
 */
export function transcriptionWordSource(word: string): 'dictionary' | 'rules' | 'none' {
  const cleaned = word.trim().replace(/[.,!?;:'"()[\]{}]/g, '').toLowerCase();
  if (!cleaned) return 'none';
  if (DICT[cleaned]) return 'dictionary';
  return ruleBasedIPA(cleaned) ? 'rules' : 'none';
}

/**
 * Returns IPA transcription for any English phrase.
 * Возвращает пустую строку, когда уверенности нет хотя бы в одном слове:
 * карточка тогда показывается без транскрипции.
 *
 * зачем: показать фразу с одним выдуманным словом хуже, чем не показать
 * ничего — пользователь сверяет с Cambridge/Oxford и ловит нас на вранье
 * (репорт 21.09.2026 про guests → /gdʒʌːsts/).
 */
export function getTranscription(text: string): string {
  const cleaned = text.trim().replace(/[.,!?;:'"()[\]{}]/g, '').toLowerCase();
  if (!cleaned) return '';

  // 1. Full phrase lookup
  if (DICT[cleaned]) return `/${DICT[cleaned]}/`;

  // 2. Try 4-word windows, then 3-word, then 2-word, then single words
  const words = cleaned.split(/\s+/);
  const parts: string[] = [];
  let i = 0;

  while (i < words.length) {
    let matched = false;
    // Try longest window first
    for (const len of [4, 3, 2]) {
      if (i + len <= words.length) {
        const chunk = words.slice(i, i + len).join(' ');
        if (DICT[chunk]) {
          parts.push(DICT[chunk]);
          i += len;
          matched = true;
          break;
        }
      }
    }
    if (!matched) {
      const word = words[i];
      const known = DICT[word] ?? ruleBasedIPA(word);
      // зачем: ранний выход с причиной — ни одно слово не имеет права
      // попасть на экран выдуманным, поэтому молчим про всю фразу целиком.
      if (!known) return '';
      parts.push(known);
      i++;
    }
  }

  return `/${parts.join(' ')}/`;
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
