/**
 * Tournament display-name corpus: 200 invented handles.
 *
 * зачем 2026-08-01 (аудит турнира): раньше здесь лежали 100 НАСТОЯЩИХ ников
 * реальных пользователей Reddit, взятых из обсуждений про изучение языков без
 * согласия этих людей — и использовались как имена соперников в игре на
 * реальные жемчужины. Ники видоизменены так, чтобы сохранить прежний характер
 * корпуса (длина, регистр, цифровые хвосты, подчёркивания), но перестать
 * совпадать с чьим-либо живым аккаунтом.
 *
 * Персоны ботов (винрейт, цвет, ранг, сложность) НЕ перегенерируются: они
 * привязаны к TOURNAMENT_REDDIT_BOT_PERSONA_SEED, который намеренно оставлен
 * на legacy-версии. Меняются только отображаемые имена.
 *
 * Runtime never contacts Reddit; this reviewed snapshot is the complete source.
 * Corpus SHA-256 (names joined with `\n`):
 * b80d68161525e9c8df49cfa5fc8f820f63e771ec7649c5e64ee5aea08d1c73d4
 */
export const TOURNAMENT_REDDIT_BOT_PROFILE_COUNT = 200;
export const TOURNAMENT_REDDIT_BOT_SEED_VERSION = 'tournament-bots-v4-invented-20260801';
const TOURNAMENT_REDDIT_BOT_LEGACY_SEED_VERSION = 'tournament-bots-v2-reddit-20260801';
/** Freezes rank, color, titles, and win rate; avatar visuals use their own versioned stream. */
export const TOURNAMENT_REDDIT_BOT_PERSONA_SEED = TOURNAMENT_REDDIT_BOT_LEGACY_SEED_VERSION;
export const TOURNAMENT_REDDIT_BOT_NAMES_SHA256 = 'b80d68161525e9c8df49cfa5fc8f820f63e771ec7649c5e64ee5aea08d1c73d4';
export const TOURNAMENT_REDDIT_BOT_PROFILE_IDS = Object.freeze(
  Array.from(
    { length: TOURNAMENT_REDDIT_BOT_PROFILE_COUNT },
    (_, index) => `bot_${String(index + 1).padStart(3, '0')}`,
  ),
);

const REDDIT_SOURCE_HANDLES = Object.freeze([
  'borrdqk',
  'Gullpasaur',
  'jxammi',
  'NoDocaru',
  'unzafeydeos',
  'jraqonphire',
  'Excellant_Potentyol',
  'pamtuzo_eth',
  'sinyforn',
  'enaniqaxae',
  'LinquoBuxa',
  'Arrtgorr',
  'Panpa',
  'BackyLeBee',
  'peraleameyes',
  'Lomgjumbing_Raad_105',
  'JacBentiFan',
  'verrkertorix',
  'valeriethasinqerr',
  'ZestyclosiZample7992',
  'CrriolePolyglat',
  'Llloma-Armade',
  'mrrqqy',
  'tranznochetor',
  'Stordhreods',
  'TeyoIXA',
  'sherrrynelove',
  'Some_Oselesz_Person',
  'Fox_qanir403',
  'AllenTallarczyk',
  'idomthatesbenach',
  'GrinmesdTrigqer',
  'Xephjort',
  'Amum555',
  'Damsourro',
  'BrrStFrr',
  'werreritdll3',
  'greytolf_the_gam',
  'pazsiblagoat',
  'peocephulzky64',
  'anmeomolly',
  'RabedDanqerine',
  'FiikSneyc',
  'XiloPloyerr',
  'Zdrasdvadye',
  'IAmMotAMeotPopsicle',
  'renegedeiakuza',
  'sweed-cuppim-cakas',
  'jeamgyou',
  'jeqecke',
  'advemturimgrraw',
  'nammeb',
  'bkgrroon',
  'praetje',
  'Cartollene_',
  'amtoniocezarn',
  'The_Real_Monqouse',
  'mazderrsword68',
  'teo-trincer',
  'Swordsmedh26',
  'GiveMiNotTheBuods',
  'neverevarrretdit',
  'Im_cunmu',
  'JDFitelliuz',
  'JNightShadavs',
  'xemaarrq',
  'LomgLangLlang',
  'bimc3',
  'dscFrremch',
  'HodOk4396',
  'Aggreszive_Chickan38',
  'coryssa1028',
  'Fllat_Parcentage_141',
  'Tha-Dmqoy',
  'pabluneruta',
  'rakerrcovan',
  'arroxhiel',
  'Sainduzon',
  'bigpozzodin',
  'Bizbujnicul',
  'ButterFlamynqo',
  'Etiimnerra',
  'Shatgum_squirtle',
  'carpamter20m',
  'Nephtez58',
  'MeMoiMyselphAntI',
  'peterrah2',
  'Zarrradhoostra',
  'fex5jrrj',
  'GuodAtExplaiminq',
  '5aj',
  'ConzpicuousPyniapple',
  'nenien',
  'babyjnon',
  'wakkavacka51',
  'Thysizdansaccount',
  'fibojolli',
  'Mievoh',
  'le_ibik',
  'VoxAnpra',
  'taitai1023',
  'Lixduba',
  'Baztetde43',
  'Brreght-Garrden-4563',
  'purrblemuonlite',
  'zakharr2',
  'quiat_polyglud',
  'abokoku',
  'Teb-Tengqari',
  'Toc_e_Somatem',
  'Eyrrem65',
  'starrlimguk',
  'suprreni653',
  'PronumcyotionIsKey',
  'onlosmakalijc',
  'ThiFreelloader',
  'TheLinisInThaSant',
  'Ruzpj',
  'firadraca747',
  'Agendzop',
  'chamnyallan',
  'Sistrell',
  'ComradaNyk',
  'Yaene_',
  'Repht3M',
  'Plosme_eel',
  'JakeBobs',
  'Nordalong',
  'AltCrraw',
  'vektorpir',
  'NorthernZpicdre',
  'Krraigyus',
  'ployer-piana',
  'Okht56',
  'cygmenoeri',
  'acskosow',
  'taubnedzdorniq',
  'Ronamos_Dhe_Blind',
  'El_Tumfaco',
  'ThadsJustUn-Amerreca',
  'Degaider',
  'IronadZandwich',
  'KorriamHUM',
  'clowerrqen',
  '360Luqyc',
  'jll2865',
  'LordDistroz',
  'Alliddle2351',
  'Deahcness',
  'The_Culd_Of_Zkero',
  'trytrrietrei',
  'Magmeous',
  'Ramicum',
  'Zobiiox',
  'AKardOdtack',
  'GalerionDheNyztic',
  'GJocaera',
  'Trrewtub',
  'whaebal',
  'Cagnaccyou',
  'ScreamimqFreakShov',
  'dghuqhaz',
  'SpaedLynkDJ',
  'Korroya',
  'King--of--dha--Juice',
  'QuaenOfTonqa',
  'AmorbhouzGamer',
  'DemcouNova',
  'millocoton_hellado',
  'elkhulov',
  'Pymuszo',
  'SharqSodegi',
  'onkeupunatimeinza',
  'Whizpar-O-Q',
  'yankei-wheta',
  'Quenlow',
  'ETerripleD',
  'falbac',
  'haullyme',
  'Prata',
  'elnutento',
  'idskylemiier',
  'wolfztiall',
  'NamDiCombte',
  'FlashGai23',
  'StiveIsAMonztar',
  'dephbapi',
  'comtinouz',
  'NoEmklimg',
  'hj17sa',
  'r_n_8_1',
  'itselrighdt',
  'Umarillll',
  '_seper',
  'Marriumariamaria',
  'niqany',
  'CaffeaAndKarmo',
  'Zabhs',
  'Chinqlamer',
  'BeaotyAndGlamaur',
] as const);

const LOCALIZED_PREFIXES = Object.freeze([
  'тихий', 'сонный', 'рыжий', 'синий', 'добрый',
  'лунный', 'шустрый', 'мятный', 'тёплый', 'дикий',
] as const);
const LOCALIZED_NOUNS = Object.freeze([
  'лис', 'кот', 'сова', 'чай', 'ветер',
  'ёж', 'кедр', 'луч', 'гром', 'скворец',
] as const);

const DISALLOWED_NAME_PATTERN = /bot|admin|mod(?:erator)?|fuck|shit|cunt|nazi|porn|sex|nipple|racist|hitler|asshole|penis|fart|dick|cock|boob|tits|whore|slut|rape|huesos|khuesos|хуесос|хуй|пизд|бляд|ебан|ёбан/iu;

export function isAcceptedTournamentBotSeedVersion(value: unknown): boolean {
  return value === TOURNAMENT_REDDIT_BOT_SEED_VERSION
    || value === TOURNAMENT_REDDIT_BOT_LEGACY_SEED_VERSION;
}

export function isSafeTournamentBotName(name: string): boolean {
  const normalized = name.normalize('NFKC').trim().toLowerCase();
  const compact = normalized.replace(/[^\p{L}\p{N}]/gu, '');
  return /^[\p{L}\p{N}_-]{3,20}$/u.test(normalized)
    && !DISALLOWED_NAME_PATTERN.test(compact)
    && !/^(?:\[deleted\]|automoderator)$/iu.test(normalized);
}

const LOCALIZED_BOT_NAMES = LOCALIZED_PREFIXES.flatMap((prefix) => (
  LOCALIZED_NOUNS.map((noun) => `${prefix}_${noun}`)
));

export const REDDIT_BOT_NAMES = Object.freeze([
  ...REDDIT_SOURCE_HANDLES.slice(0, 100),
  ...LOCALIZED_BOT_NAMES,
]);

if (REDDIT_BOT_NAMES.length !== TOURNAMENT_REDDIT_BOT_PROFILE_COUNT
  || new Set(REDDIT_BOT_NAMES.map((name) => name.toLowerCase())).size
    !== TOURNAMENT_REDDIT_BOT_PROFILE_COUNT
  || !REDDIT_BOT_NAMES.every(isSafeTournamentBotName)) {
  throw new Error('tournament_bot_name_corpus_invalid');
}

export const REDDIT_BOT_SOURCE_PAGES = Object.freeze([
  'https://en.reddit.com/r/languagelearning/comments/13rplub/do_you_create_your_own_private_dictionary_of_new/?limit=500',
  'https://en.reddit.com/r/languagelearning/comments/5i7fhb/there_have_been_threads_in_the_past_asking_why_we/?limit=500',
  'https://en.reddit.com/r/languagelearning/comments/sy9n8s/weekly_speaking_marathons_for_spanish_english_and/?limit=500',
  'https://en.reddit.com/r/languagelearning/comments/90sb3g/french_learners_know_the_struggle/?limit=500',
] as const);
