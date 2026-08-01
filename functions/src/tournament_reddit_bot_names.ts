/**
 * Tournament display-name corpus: 100 public Reddit handles sampled from
 * language-learning discussions plus 100 localized aliases for Russian UI.
 * Runtime never contacts Reddit; this reviewed snapshot is the complete source.
 * Corpus SHA-256 (names joined with `\n`):
 * b0b148c7b5122b92b74a84be08117f5e5d6188701edb500167323d65dbeca7af
 */
export const TOURNAMENT_REDDIT_BOT_PROFILE_COUNT = 200;
export const TOURNAMENT_REDDIT_BOT_SEED_VERSION = 'tournament-bots-v3-multilingual-20260801';
const TOURNAMENT_REDDIT_BOT_LEGACY_SEED_VERSION = 'tournament-bots-v2-reddit-20260801';
/** Freezes rank, color, titles, and win rate; avatar visuals use their own versioned stream. */
export const TOURNAMENT_REDDIT_BOT_PERSONA_SEED = TOURNAMENT_REDDIT_BOT_LEGACY_SEED_VERSION;
export const TOURNAMENT_REDDIT_BOT_NAMES_SHA256 = 'b0b148c7b5122b92b74a84be08117f5e5d6188701edb500167323d65dbeca7af';
export const TOURNAMENT_REDDIT_BOT_PROFILE_IDS = Object.freeze(
  Array.from(
    { length: TOURNAMENT_REDDIT_BOT_PROFILE_COUNT },
    (_, index) => `bot_${String(index + 1).padStart(3, '0')}`,
  ),
);

const REDDIT_SOURCE_HANDLES = Object.freeze([
  'bartqk',
  'Gulbasaur',
  'jxanne',
  'NoTakaru',
  'unsafeideas',
  'jragonfyre',
  'Excellent_Potential',
  'pantuso_eth',
  'simiform',
  'enanigaxei',
  'LinguoBuxo',
  'Artgor',
  'Ponbe',
  'BeckyLiBei',
  'paralianeyes',
  'Longjumping_Read_684',
  'JakBandiFan',
  'vercertorix',
  'valeriethesinger',
  'ZestycloseSample7403',
  'CreolePolyglot',
  'Llama-Armada',
  'mrggy',
  'transnochator',
  'Starthreads',
  'TayoEXE',
  'sherrymelove',
  'Some_Useless_Person',
  'Fox_gamer001',
  'AlanTalarczyk',
  'idonthatespinach',
  'GrimmestTrigger',
  'Xefjord',
  'Anon125',
  'Damsauro',
  'BrStFr',
  'wereriddl3',
  'greydalf_the_gan',
  'possiblegoat',
  'peacefulsky11',
  'anneomoly',
  'RabidTangerine',
  'FeikSneik',
  'XyloPlayer',
  'Zdrastvutye',
  'IAmNotAMeatPopsicle',
  'renegadeyakuza',
  'sweet-cuppin-cakes',
  'jiangyou',
  'jegikke',
  'adventuringraw',
  'nonneb',
  'bcgroom',
  'preitje',
  'Cartolina_',
  'antoniocesarm',
  'The_Real_Mongoose',
  'mastersword83',
  'tea-drinker',
  'Swordsmith53',
  'GiveMeNotTheBoots',
  'nevereverreddit',
  'In_connu',
  'JDFidelius',
  'JNightShadows',
  'xemearg',
  'LangLangLang',
  'benk4',
  'dzcFrench',
  'HatOk4084',
  'Aggressive_Chicken63',
  'carissa0816',
  'Flat_Percentage_998',
  'The-Dmguy',
  'pabloneruda',
  'racercowan',
  'araxhiel',
  'Saimdusan',
  'bigbossodin',
  'Bezbojnicul',
  'ButterFlamingo',
  'Etiennera',
  'Shotgun_squirtle',
  'carpenter20m',
  'Nephtis25',
  'MeMoiMyselfAndI',
  'peteroh9',
  'Zarradhoustra',
  'fax5jrj',
  'GoodAtExplaining',
  '5oj',
  'ConspicuousPineapple',
  'nenyim',
  'babyjman',
  'wakkawakka18',
  'Thisisdansaccount',
  'fibojoly',
  'Meewah',
  'le_epic',
  'VoxUmbra',
  'taytay9955',
  'Lextube',
  'Bastette54',
  'Bright-Garden-4347',
  'purplemoonlite',
  'zachar3',
  'quiet_polyglot',
  'apokako',
  'Teb-Tenggeri',
  'Toc_a_Somaten',
  'Eiram42',
  'starlinguk',
  'supreme232',
  'PronunciationIsKey',
  'onlosmakelijk',
  'TheFreeloader',
  'TheLinesInTheSand',
  'Rosbj',
  'firedrake242',
  'Agentzap',
  'chennyalan',
  'Systral',
  'ComradeNik',
  'Yuana_',
  'Rift3N',
  'Plasma_eel',
  'JakePops',
  'Nardalang',
  'AltCrow',
  'viktorbir',
  'NorthernSpectre',
  'Kraigius',
  'player-piano',
  'Ochd12',
  'cygnenoire',
  'aczkasow',
  'taubnetzdornig',
  'Romanos_The_Blind',
  'El_Dumfuco',
  'ThatsJustUn-American',
  'Degeyter',
  'IronedSandwich',
  'KorianHUN',
  'clowergen',
  '360Logic',
  'jl2352',
  'LordDestrus',
  'Allittle1970',
  'Daahkness',
  'The_Cult_Of_Skaro',
  'trytrietree',
  'Megneous',
  'Rumicon',
  'Zopieux',
  'ACardAttack',
  'GalerionTheMystic',
  'GJokaero',
  'Trewdub',
  'whuebel',
  'Cagnaccioo',
  'ScreamingFreakShow',
  'dghughes',
  'SpeedLinkDJ',
  'Karoya',
  'King--of--the--Juice',
  'QueenOfTonga',
  'AmorphousGamer',
  'DenkouNova',
  'melocoton_helado',
  'elchulow',
  'Pinuzzo',
  'SharqZadegi',
  'onceuponatimeinza',
  'Whisper-O-G',
  'yankee-white',
  'Quinlov',
  'ETerribleT',
  'folbec',
  'haolime',
  'Proda',
  'elmutanto',
  'itskylemeyer',
  'wolfstiel',
  'NomDeCompte',
  'FlashGuy12',
  'SteveIsAMonster',
  'defpepi',
  'continous',
  'NoInkling',
  'hj17',
  'r_m_8_8',
  'itsalrightt',
  'Umarill',
  '_zepar',
  'Mariomariamario',
  'niqomi',
  'CoffeeAndKarma',
  'Zephs',
  'Chinglaner',
  'BeautyAndGlamour',
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
