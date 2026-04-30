/**
 * Offline English → IPA transcription.
 * Strategy: dictionary lookup first, rule-based fallback for unknown words.
 * Guarantees a result for every non-empty English string.
 */

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
  "i'm": 'aɪm', "you're": 'jʊər', "he's": 'hiːz', "she's": 'ʃiːz',
  "it's": 'ɪts', "we're": 'wɪər', "they're": 'ðeər',
  "i've": 'aɪv', "you've": 'juːv', "we've": 'wiːv', "they've": 'ðeɪv',
  "i'll": 'aɪl', "you'll": 'juːl', "he'll": 'hiːl', "she'll": 'ʃiːl', "we'll": 'wiːl',
  "won't": 'woʊnt', "can't": 'kænt', "couldn't": 'ˈkʊdnt', "shouldn't": 'ˈʃʊdnt',
  "wouldn't": 'ˈwʊdnt', "isn't": 'ˈɪznt', "aren't": 'ɑːrnt',
  "wasn't": 'ˈwɒznt', "weren't": 'ˈwɜːrnt',
  "don't": 'doʊnt', "doesn't": 'ˈdʌznt', "didn't": 'ˈdɪdnt',
  "haven't": 'ˈhævnt', "hasn't": 'ˈhæznt', "hadn't": 'ˈhædnt',
  "let's": 'lets', "that's": 'ðæts', "there's": 'ðeərz', "what's": 'wʌts',
  "here's": 'hɪərz', "gonna": 'ˈɡɒnə', "gotta": 'ˈɡɒtə',
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
  'due to': 'djuː tuː', "that's why": 'ðæts waɪ',
  'in fact': 'ɪn fækt', 'in other words': 'ɪn ˈʌðər wɜːrdz',
  'that is to say': 'ðæt ɪz tuː seɪ', 'after that': 'ˈæftər ðæt',
  'i think': 'aɪ θɪŋk', 'i believe': 'aɪ bɪˈliːv',
  'in my opinion': 'ɪn maɪ əˈpɪnjən',
  'from my point of view': 'frɒm maɪ pɔɪnt ɒv vjuː',
  "i'm on my way": 'aɪm ɒn maɪ weɪ',
  'that works for me': 'ðæt wɜːrks fɔːr miː',
  'it slipped my mind': 'ɪt slɪpt maɪ maɪnd',
  'i owe you one': 'aɪ oʊ juː wʌn',
  'just checking in': 'dʒʌst ˈtʃekɪŋ ɪn',
  "bear with me": 'beər wɪð miː',
  'long story short': 'lɒŋ ˈstɔːri ʃɔːrt',
  'my hands are full': 'maɪ hændz ɑːr fʊl',
  "i'll keep that in mind": 'aɪl kiːp ðæt ɪn maɪnd',
  "sorry, i'm running late": 'ˈsɒri aɪm ˈrʌnɪŋ leɪt',
  'you had me worried': 'juː hæd miː ˈwʌrid',
  'could you do me a favor': 'kʊd juː duː miː ə ˈfeɪvər',
  "let's touch base": 'lets tʌtʃ beɪs',
  "i'll take your word for it": 'aɪl teɪk jɔːr wɜːrd fɔːr ɪt',
  "what's taking so long": 'wʌts ˈteɪkɪŋ soʊ lɒŋ',
  'something came up': 'ˈsʌmθɪŋ keɪm ʌp',
  "let's call it a day": 'lets kɔːl ɪt ə deɪ',
  "i'll get back to you": 'aɪl ɡet bæk tuː juː',
  'can we reschedule': 'kæn wiː riːˈʃedjuːl',
  'sorry to keep you waiting': 'ˈsɒri tuː kiːp juː ˈweɪtɪŋ',
};

// ─── Rule-based IPA fallback ──────────────────────────────────────────────────
// Converts unknown English words to approximate IPA using spelling rules.
// Not perfect, but guarantees a result for every word.
function ruleBasedIPA(word: string): string {
  let w = word.toLowerCase();
  // Order matters — longer patterns first
  const rules: [RegExp, string][] = [
    // Common digraphs and trigraphs
    [/tch/g, 'tʃ'], [/ch/g, 'tʃ'], [/sh/g, 'ʃ'], [/th/g, 'ð'],
    [/ph/g, 'f'], [/wh/g, 'w'], [/ng/g, 'ŋ'], [/nk/g, 'ŋk'],
    [/ck/g, 'k'], [/qu/g, 'kw'], [/gh/g, ''],
    // Vowel digraphs
    [/oo/g, 'uː'], [/ee/g, 'iː'], [/ea/g, 'iː'], [/oa/g, 'oʊ'],
    [/ou/g, 'aʊ'], [/ow/g, 'aʊ'], [/oi/g, 'ɔɪ'], [/oy/g, 'ɔɪ'],
    [/au/g, 'ɔː'], [/aw/g, 'ɔː'], [/ai/g, 'eɪ'], [/ay/g, 'eɪ'],
    [/ie/g, 'iː'], [/ei/g, 'eɪ'], [/ue/g, 'juː'],
    // Silent e patterns (approximate)
    [/a([^aeiou])e\b/g, 'eɪ$1'], [/i([^aeiou])e\b/g, 'aɪ$1'],
    [/o([^aeiou])e\b/g, 'oʊ$1'], [/u([^aeiou])e\b/g, 'juː$1'],
    // Consonants
    [/c(?=[ei])/g, 's'], [/c/g, 'k'],
    [/g(?=[ei])/g, 'dʒ'],
    [/x/g, 'ks'], [/z/g, 'z'],
    [/j/g, 'dʒ'], [/y(?=[aeiou])/g, 'j'], [/y\b/g, 'i'],
    // Vowels (simple)
    [/a/g, 'æ'], [/e/g, 'e'], [/i/g, 'ɪ'], [/o/g, 'ɒ'], [/u/g, 'ʌ'],
  ];
  let result = w;
  for (const [pattern, replacement] of rules) {
    result = result.replace(pattern, replacement);
  }
  return result;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Returns IPA transcription for any English phrase.
 * Always returns a non-empty string (uses rule-based fallback for unknown words).
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
      // Single word: dict or rule-based fallback
      parts.push(DICT[words[i]] ?? ruleBasedIPA(words[i]));
      i++;
    }
  }

  return `/${parts.join(' ')}/`;
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
