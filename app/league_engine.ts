/**
 * LEAGUE ENGINE — LOCAL version
 * FIREBASE MIGRATION: см. комментарии // FIREBASE: внутри
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { loadWeekLeaderboard } from './hall_of_fame_utils';
import { getOrCreateLeagueGroup, updateMyGroupPoints } from './firestore_leagues';

import type { Lang } from '../constants/i18n';

export interface ClubDef {
  id:         number;
  nameRU:     string;  // «Клуб Инициаторов»
  nameUK:     string;  // «Клуб Ініціаторів»
  nameES:     string;
  shortRU:    string;  // «Инициаторы»
  shortUK:    string;  // «Ініціатори»
  ionIcon:    string;
  imageUri?:  any;  // PNG изображение клуба (require() asset)
  color:      string;
  frameId:    string;  // id рамки в FRAMES
  tagRU:      string;
  tagUK:      string;
  tagES:      string;
  descRU:     string;
  descUK:     string;
  greetingRU: string;
  greetingUK: string;
}

export const CLUBS: ClubDef[] = [
  {
    id: 0, ionIcon: 'flag-outline', imageUri: require("../assets/images/levels/LIG MED.png"), color: '#7B9BB5', frameId: 'club_initiator',
    nameRU: 'Медь',  nameUK: 'Мідь', nameES: 'Cobre',
    shortRU: 'Медь', shortUK: 'Мідь',
    tagRU: 'Бонус: +0% XP', tagUK: 'Бонус: +0% XP', tagES: 'Bonificación: +0% XP',
    descRU: 'Твой старт — это уже победа! Ты не просто скачал приложение, ты бросил вызов своей лени. Главное сейчас — не дать меди окислиться. Просто продолжай заходить каждый день, и твой мозг сам поймет, что обратной дороги нет. Пока без бонусов, зато с чистой совестью.',
    descUK: 'Твій старт — це вже перемога! Ти не просто встановив застосунок, ти кинув виклик своїй ліні. Головне зараз — не дати міді окислитися. Просто заходь щодня, і твій мозок сам зрозуміє, що дороги назад уже немає. Поки без бонусів, зате з чистою совістю.',
    greetingRU: 'Добро пожаловать, инициатор! Каждый эксперт когда-то стоял на твоём месте. Главное — начать.',
    greetingUK: 'Ласкаво просимо, ініціаторе! Кожен експерт колись стояв на твоєму місці. Головне — почати.',
  },
  {
    id: 1, ionIcon: 'flame', imageUri: require("../assets/images/levels/LIG BRONZ.png"), color: '#5BA88B', frameId: 'club_adept',
    nameRU: 'Бронза',         nameUK: 'Бронза', nameES: 'Bronce',
    shortRU: 'Бронза',        shortUK: 'Бронза',
    tagRU: 'Бонус: +10% XP',  tagUK: 'Бонус: +10% XP', tagES: 'Bonificación: +10% XP',
    descRU: 'Укрепляем базу! Бронза — металл тех, кто пережил первый порыв и решил остаться. Твои нейронные связи становятся крепче, а рука уже сама тянется к иконке приложения. Первый шаг сделан, и система это ценит — забирай свои законные +10% опыта к каждому уроку.',
    descUK: 'Зміцнюємо базу! Бронза — метал тих, хто пережив перший порив і вирішив залишитися. Твої нейронні зв\'язки стають міцнішими, а рука вже сама тягнеться до іконки застосунку. Перший крок зроблено, і система це цінує — отримуй законні +10% досвіду до кожного уроку.',
    greetingRU: 'Твоя преданность замечена! Адепты знают: повторение — мать учения. Продолжай в том же духе!',
    greetingUK: 'Твою відданість помічено! Адепти знають: повторення — мати навчання. Продовжуй в тому ж дусі!',
  },
  {
    id: 2, ionIcon: 'compass-outline', imageUri: require("../assets/images/levels/LIG SEREBRO.png"), color: '#4A90A4', frameId: 'club_seeker',
    nameRU: 'Серебро',     nameUK: 'Срібло', nameES: 'Plata',
    shortRU: 'Серебро',    shortUK: 'Срібло',
    tagRU: 'Бонус: +20% XP', tagUK: 'Бонус: +20% XP', tagES: 'Bonificación: +20% XP',
    descRU: 'Твое любопытство — твой двигатель. Ты ищешь новые знания, и это круто. На этом этапе многие сдаются, но ты блестишь на их фоне, как начищенная монета. Не бойся ошибаться, ведь именно так рождается истина и приятный бонус в +20% опыта.',
    descUK: 'Твоя допитливість — твій двигун. Ти шукаєш нові знання, і це круто. На цьому етапі багато хто здається, але ти сяєш на їхньому фоні, як начищена монета. Не бійся помилятися, адже саме так народжується істина і приємний бонус у +20% досвіду.',
    greetingRU: 'Ты на верном пути, искатель! Каждый новый урок — это открытие нового горизонта.',
    greetingUK: 'Ти на вірному шляху, шукачу! Кожен новий урок — це відкриття нового горизонту.',
  },
  {
    id: 3, ionIcon: 'hammer-outline', imageUri: require("../assets/images/levels/LIG ZOLOTO.png"), color: '#7BA84A', frameId: 'club_practitioner',
    nameRU: 'Золото',         nameUK: 'Золото', nameES: 'Oro',
    shortRU: 'Золото',        shortUK: 'Золото',
    tagRU: 'Бонус: +30% XP', tagUK: 'Бонус: +30% XP', tagES: 'Bonificación: +30% XP',
    descRU: 'Дело мастера боится! Ты берешь не зубрежкой, а делом. Теперь ты понимаешь, что каждый твой "клик" — это кирпичик в фундаменте будущего свободного общения. Золотой стандарт достигнут, и награда соответствующая — практика приносит плоды и +30% к прогрессу.',
    descUK: 'Справі майстра страх! Ти береш не зубрінням, а практикою. Тепер ти розумієш, що кожен твій "клік" — це цеглинка у фундаменті майбутнього вільного спілкування. Золотий стандарт досягнуто, і нагорода відповідна — практика дає плоди та +30% до прогресу.',
    greetingRU: 'Дело мастера боится! Практики строят знания кирпич за кирпичом. Ты в отличной форме!',
    greetingUK: 'Справа майстра боїться! Практики будують знання цеглина за цеглиною. Ти у відмінній формі!',
  },
  {
    id: 4, ionIcon: 'analytics-outline', imageUri: require("../assets/images/levels/LIG PLATINA.png"), color: '#C8A84A', frameId: 'club_analyst',
    nameRU: 'Платина',      nameUK: 'Платина', nameES: 'Platino',
    shortRU: 'Платина',     shortUK: 'Платина',
    tagRU: 'Бонус: +40% XP', tagUK: 'Бонус: +40% XP', tagES: 'Bonificación: +40% XP',
    descRU: 'Твой ум ищет закономерности. Ты больше не просто повторяешь — ты вникаешь в самую суть, видишь структуру там, где другие видят хаос. С таким подходом даже самые сложные правила станут понятными. Острый ум — острый рост: получай +40% опыта за свою стабильность.',
    descUK: 'Твій розум шукає закономірності. Ти більше не просто повторюєш — ти вникаєш у саму суть, бачиш структуру там, де інші бачать хаос. Із таким підходом навіть найскладніші правила стануть зрозумілими. Гострий розум — стрімке зростання: отримуй +40% досвіду за свою стабільність.',
    greetingRU: 'Твой разум острее, чем вчера! Аналитики превращают сложность в ясность. Ты мыслишь системно!',
    greetingUK: 'Твій розум гостріший, ніж учора! Аналітики перетворюють складність на ясність. Ти мислиш системно!',
  },
  {
    id: 5, ionIcon: 'library-outline', imageUri: require("../assets/images/levels/LIG IZUMRUD.png"), color: '#CD7F32', frameId: 'club_erudite',
    nameRU: 'Изумруд',      nameUK: 'Смарагд', nameES: 'Esmeralda',
    shortRU: 'Изумруд',     shortUK: 'Смарагд',
    tagRU: 'Бонус: +50% XP', tagUK: 'Бонус: +50% XP', tagES: 'Bonificación: +50% XP',
    descRU: 'Порог в высшее общество. Изумрудный блеск твоих успехов виден издалека. Ты прошел экватор и доказал, что твоя дисциплина — это не случайность, а характер. Теперь прогресс идет в полтора раза быстрее. Наслаждайся видом, ты это заслужил!',
    descUK: 'Поріг у вище суспільство. Смарагдовий блиск твоїх успіхів видно здалеку. Ти пройшов екватор і довів, що твоя дисципліна — це не випадковість, а характер. Тепер прогрес іде в півтора раза швидше. Насолоджуйся видом — ти це заслужив!',
    greetingRU: 'Знания — твоя сила! Эрудиты — люди, которым всегда есть что сказать. Ты заслуженно здесь!',
    greetingUK: 'Знання — твоя сила! Ерудити — люди, яким завжди є що сказати. Ти заслужено тут!',
  },
  {
    id: 6, ionIcon: 'diamond', imageUri: require("../assets/images/levels/LIG SAPFIR.png"), color: '#4A90D9', frameId: 'club_connoisseur',
    nameRU: 'Сапфир',          nameUK: 'Сапфір', nameES: 'Zafiro',
    shortRU: 'Сапфир',         shortUK: 'Сапфір',
    tagRU: 'Бонус: +60% XP', tagUK: 'Бонус: +60% XP', tagES: 'Bonificación: +60% XP',
    descRU: 'Глубокий синий цвет сапфира символизирует твое полное погружение. Ты уже не просто учишься, ты начинаешь "чувствовать" материал. Ты стал тверже камня в своих намерениях, и твоя награда в +60% XP — прямое подтверждение твоей исключительности.',
    descUK: 'Глибокий синій колір сапфіра символізує твоє повне занурення. Ти вже не просто вчишся, ти починаєш "відчувати" матеріал. Ти став твердішим за камінь у своїх намірах, а твоя нагорода в +60% XP — пряме підтвердження твоєї винятковості.',
    greetingRU: 'Ты знаешь язык изнутри! Знатоки замечают то, что другие пропускают. Ты в элите!',
    greetingUK: 'Ти знаєш мову зсередини! Знавці помічають те, що інші пропускають. Ти в еліті!',
  },
  {
    id: 7, ionIcon: 'medal', imageUri: require("../assets/images/levels/LIG RUBIN.png"), color: '#9B59B6', frameId: 'club_expert',
    nameRU: 'Рубин',        nameUK: 'Рубін', nameES: 'Rubí',
    shortRU: 'Рубин',       shortUK: 'Рубін',
    tagRU: 'Бонус: +70% XP', tagUK: 'Бонус: +70% XP', tagES: 'Bonificación: +70% XP',
    descRU: 'Настоящая страсть к знаниям! В лиге Рубина остаются только те, у кого горят глаза. Твоя продуктивность зашкаливает, а скорость обучения заставляет окружающих завидовать. Мы лишь подливаем масла в огонь твоих достижений — держи +70% к опыту.',
    descUK: 'Справжня пристрасть до знань! У лізі Рубіна залишаються тільки ті, у кого горять очі. Твоя продуктивність зашкалює, а швидкість навчання змушує оточення заздрити. Ми лише підливаємо олії у вогонь твоїх досягнень — тримай +70% до досвіду.',
    greetingRU: 'Экспертный уровень! Твои знания выходят за рамки учебника. Ты говоришь — все слушают!',
    greetingUK: 'Експертний рівень! Твої знання виходять за межі підручника. Ти говориш — всі слухають!',
  },
  {
    id: 8, ionIcon: 'school-outline', imageUri: require("../assets/images/levels/LIG ALMAZ.png"), color: '#A8B4C0', frameId: 'club_magister',
    nameRU: 'Алмаз',        nameUK: 'Діамант', nameES: 'Diamante',
    shortRU: 'Алмаз',       shortUK: 'Діамант',
    tagRU: 'Бонус: +80% XP',  tagUK: 'Бонус: +80% XP', tagES: 'Bonificación: +80% XP',
    descRU: 'Идеальная огранка. Алмаз рождается под колоссальным давлением, и ты выдержал его, став практически несокрушимым. Твои знания теперь крепки как никогда, а интеллект сияет под любым углом. За твою фантастическую выдержку — ошеломительные +80% опыта.',
    descUK: 'Ідеальна огранка. Алмаз народжується під колосальним тиском, і ти витримав його, ставши майже незламним. Твої знання тепер міцні як ніколи, а інтелект сяє під будь-яким кутом. За твою фантастичну витримку — приголомшливі +80% досвіду.',
    greetingRU: 'Магистрская мантия тебе к лицу! Ты в абсолютной элите изучающих английский. Снимаем шляпу!',
    greetingUK: 'Магістерська мантія тобі личить! Ти в абсолютній еліті тих, хто вивчає англійську. Капелюх долу!',
  },
  {
    id: 9, ionIcon: 'bulb-outline', imageUri: require("../assets/images/levels/LIG CHERNIY ALMAZ.png"), color: '#E87E30', frameId: 'club_thinker',
    nameRU: 'Черный Алмаз', nameUK: 'Чорний Діамант', nameES: 'Diamante negro',
    shortRU: 'Черный Алмаз', shortUK: 'Чорний Діамант',
    tagRU: 'Бонус: +90% XP',   tagUK: 'Бонус: +90% XP', tagES: 'Bonificación: +90% XP',
    descRU: 'Редчайший экземпляр. Ты — элита из элит. Черный алмаз встречается в природе реже всего, как и игроки с твоим уровнем упорства. Ты поглощаешь информацию, не оставляя шансов конкурентам. Ты почти у цели, и бонус в +90% XP — твой реактивный двигатель.',
    descUK: 'Найрідкісніший екземпляр. Ти — еліта з еліт. Чорний алмаз трапляється в природі найрідше, як і гравці з твоїм рівнем наполегливості. Ти поглинаєш інформацію, не залишаючи шансів конкурентам. Ти майже біля цілі, а бонус у +90% XP — твій реактивний двигун.',
    greetingRU: 'Ты мыслишь по-английски! Это высший уровень погружения. Мыслители — редкость и гордость лиги!',
    greetingUK: 'Ти мислиш англійською! Це найвищий рівень занурення. Мислителі — рідкість і гордість ліги!',
  },
  {
    id: 10, ionIcon: 'hammer', imageUri: require("../assets/images/levels/LIG EFIR.png"), color: '#D4A017', frameId: 'club_master',
    nameRU: 'Эфир',          nameUK: 'Ефір', nameES: 'Éter',
    shortRU: 'Эфир',         shortUK: 'Ефір',
    tagRU: 'Бонус: +100% XP',   tagUK: 'Бонус: +100% XP', tagES: 'Bonificación: +100% XP',
    descRU: 'За пределами физики. Ты перешел в состояние чистого разума, где знания усваиваются мгновенно, прямо из воздуха. Ты стал легендой, о которой шепчутся в медной лиге. Твой опыт удваивается автоматически, ведь ты и есть само воплощение обучения.',
    descUK: 'За межами фізики. Ти перейшов у стан чистого розуму, де знання засвоюються миттєво, просто з повітря. Ти став легендою, про яку шепочуться в мідній лізі. Твій досвід автоматично подвоюється, бо ти і є саме втілення навчання.',
    greetingRU: 'Мастер слова! Ты среди лучших в приложении. Твой английский — это искусство. Мы гордимся тобой!',
    greetingUK: 'Майстер слова! Ти серед найкращих у додатку. Твоя англійська — це мистецтво. Ми пишаємось тобою!',
  },
  {
    id: 11, ionIcon: 'trophy-outline', imageUri: require("../assets/images/levels/LIG VISHAYA.png"), color: '#FFD700', frameId: 'club_professor',
    nameRU: 'Высшая Лига',   nameUK: 'Вища Ліга', nameES: 'Liga suprema',
    shortRU: 'Высшая Лига',  shortUK: 'Вища Ліга',
    tagRU: 'Бонус: +110% XP', tagUK: 'Бонус: +110% XP', tagES: 'Bonificación: +110% XP',
    descRU: 'Абсолютный триумф. Выше — только звезды, но и они кажутся мелкими с твоей вершины. Ты доказал, что для тебя нет границ. Ты — мастер, эталон и вдохновение для каждого. Забирай максимальный бонус в +110% опыта и просто правь этим миром знаний.',
    descUK: 'Абсолютний тріумф. Вище — тільки зірки, але й вони здаються дрібними з твоєї вершини. Ти довів, що для тебе немає меж. Ти — майстер, еталон і натхнення для кожного. Забирай максимальний бонус у +110% досвіду і просто керуй цим світом знань.',
    greetingRU: '🏆 Легендарный статус! Ты достиг вершины. Добро пожаловать в зал славы — Лигу Профессоров!',
    greetingUK: '🏆 Легендарний статус! Ти досяг вершини. Ласкаво просимо до зали слави — Ліги Професорів!',
  },
];

/**
 * Textos largos de ligas para estudiantes de interfaz en español (por id de club).
 */
export const CLUB_DESC_ES: Record<number, string> = {
  0: 'Tu primer paso ya cuenta: entra cada día y mantén el hábito; aún sin bonificación de XP.',
  1: 'Afianzas la base y demuestras que te quedas: tu constancia se traduce en un +10% de XP por lección.',
  2: 'Sigues explorando cuando otros paran; mantén la curiosidad y obtén un +20% de XP.',
  3: 'Construyes con práctica real; cada repetición cuenta y sumas un +30% de XP.',
  4: 'Buscas patrones y estructura; tu constancia se premia con un +40% de XP.',
  5: 'Tu disciplina se nota en los resultados; el ritmo sube con un +50% de XP.',
  6: 'Dominas cada vez más el idioma; tu progreso merece un +60% de XP.',
  7: 'Pasión y buen ritmo en el ranking; mantén el impulso con un +70% de XP.',
  8: 'Mucha fuerza de voluntad y claridad; tu esfuerzo se traduce en un +80% de XP.',
  9: 'Élite entre las élites; casi nadie llega hasta aquí: tu bonificación es de un +90% de XP.',
  10: 'Estás en una zona legendaria: tu XP se duplica (+100%).',
  11: 'La cima del ranking en la app; bonificación máxima de un +110% de XP.',
};

/** @deprecated использовать CLUBS */
export const LEAGUES = CLUBS.map(c => ({
  id: c.id, nameRU: c.nameRU, nameUK: c.nameUK, nameES: c.nameES,
  shortRU: c.shortRU, shortUK: c.shortUK,
  ionIcon: c.ionIcon, imageUri: c.imageUri, color: c.color, frameId: c.frameId,
  icon: '', tagRU: c.tagRU, tagUK: c.tagUK, tagES: c.tagES, descRU: c.descRU, descUK: c.descUK,
  greetingRU: c.greetingRU, greetingUK: c.greetingUK,
}));

/** Короткое имя яруса клуба на экране (металл / лига). */
export function clubTierShortName(club: Pick<ClubDef, 'nameRU' | 'nameUK' | 'nameES'>, lang: Lang): string {
  if (lang === 'uk') return club.nameUK;
  if (lang === 'es') return club.nameES;
  return club.nameRU;
}

export interface GroupMember {
  name:      string;
  points:    number; // НЕДЕЛЬНЫЕ очки, не накопительные
  isMe:      boolean;
  uid?:      string;
  botId?:    string;
  isBot?:    boolean;
  isPremium?: boolean;
  avatar?:   string;
  frame?:    string;
  streak?:   number;
  totalXp?:  number;
  leagueId?: number;
}

export interface LeagueState {
  leagueId: number;
  weekId:   string;
  group:    GroupMember[];
}

export interface LeagueResult {
  prevLeagueId: number;
  newLeagueId:  number;
  myRank:       number;
  totalInGroup: number;
  promoted:     boolean;
  demoted:      boolean;
  group:        GroupMember[];
}

const STATE_KEY  = 'league_state_v3';
const RESULT_KEY = 'league_result_pending';

// ISO week number — граница в понедельник (как в hall_of_fame_utils)
export const getWeekId = (): string => {
  const d = new Date();
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(weekNum).padStart(2, '0')}`;
};

export const loadLeagueState = async (): Promise<LeagueState | null> => {
  try {
    const s = await AsyncStorage.getItem(STATE_KEY);
    return s ? JSON.parse(s) : null;
  } catch { return null; }
};

const saveLeagueState = async (s: LeagueState) => {
  try { await AsyncStorage.setItem(STATE_KEY, JSON.stringify(s)); } catch {}
};

export const loadPendingResult = async (): Promise<LeagueResult | null> => {
  try {
    const s = await AsyncStorage.getItem(RESULT_KEY);
    return s ? JSON.parse(s) : null;
  } catch { return null; }
};

export const savePendingResult = async (r: LeagueResult) => {
  try { await AsyncStorage.setItem(RESULT_KEY, JSON.stringify(r)); } catch {}
};

export const clearPendingResult = async () => {
  try { await AsyncStorage.removeItem(RESULT_KEY); } catch {}
};

let _groupCache: { group: GroupMember[]; ts: number } | null = null;
const GROUP_CACHE_TTL = 60_000; // 60 сек

/** Скинути кеш групи (екран клубу / після фокусу), щоб fetchGroupForUser знову пішов у Firestore. */
export const invalidateLeagueGroupCache = () => {
  _groupCache = null;
};

/**
 * Возвращает группу из Firestore. null = remote недоступен / пуст —
 * вызывающий должен решить (использовать предыдущий state, fallback и т.д.).
 * Раньше при недоступности возвращался локальный fallback с одним пользователем,
 * который записывался в league_state_v3 и затирал ранее загруженных участников
 * группы (и блокировал их через 6-часовой throttle).
 */
const fetchGroupForUser = async (
  leagueId: number,
  myName: string,
  myWeekPoints: number,
  weekId?: string,
): Promise<GroupMember[] | null> => {
  // Кэш на 60 сек чтобы не спамить Firestore при каждом рендере
  const now = Date.now();
  if (_groupCache && now - _groupCache.ts < GROUP_CACHE_TTL) {
    return _groupCache.group.map(m => m.isMe ? { ...m, points: myWeekPoints } : m);
  }
  // Пробуем получить реальную группу из Firestore
  const remoteGroup = await getOrCreateLeagueGroup(
    weekId ?? getWeekId(),
    leagueId,
    myName,
    myWeekPoints,
  );
  if (remoteGroup && remoteGroup.length > 0) {
    _groupCache = { group: remoteGroup, ts: Date.now() };
    return remoteGroup;
  }
  return null;
};

/**
 * Локальный fallback (week_leaderboard) для самого первого запуска,
 * когда state ещё не существует и Firestore недоступен.
 * Возвращает минимум одного пользователя — UI должен что-то показать.
 */
const buildLocalFallbackGroup = async (
  myName: string,
  myWeekPoints: number,
): Promise<GroupMember[]> => {
  const weekBoard = await loadWeekLeaderboard();
  const members: GroupMember[] = weekBoard
    .filter(e => e.name !== myName)
    .slice(0, 19)
    .map(e => ({ name: e.name, points: e.points, isMe: false }));
  members.push({ name: myName, points: myWeekPoints, isMe: true });
  return members.sort((a, b) => b.points - a.points);
};

export const submitMyPoints = async (points: number) => {
  // Обновляем очки в реальной группе Firestore (fire-and-forget)
  updateMyGroupPoints(points).catch(() => {});
};

export const calculateResult = (state: LeagueState, myWeekPoints: number): LeagueResult => {
  const updated = state.group
    .map(m => m.isMe ? { ...m, points: myWeekPoints } : m)
    .sort((a, b) => b.points - a.points);

  const total        = updated.length;
  const myRank       = updated.findIndex(m => m.isMe) + 1;

  // Need at least 2 participants for meaningful ranking
  const hasValidGroup = total >= 2;
  const topCutoff    = hasValidGroup ? Math.max(1, Math.ceil(total * 0.15)) : 0;
  const bottomCutoff = hasValidGroup ? total - Math.ceil(total * 0.15) + 1 : total + 1;
  const promoted     = hasValidGroup && myRank <= topCutoff && state.leagueId < CLUBS.length - 1;
  const demoted      = hasValidGroup && myRank >= bottomCutoff && state.leagueId > 0 && !promoted;

  return {
    prevLeagueId: state.leagueId,
    newLeagueId:  promoted ? state.leagueId + 1 : demoted ? state.leagueId - 1 : state.leagueId,
    myRank,
    totalInGroup: total,
    promoted,
    demoted,
    group: updated,
  };
};

export const checkLeagueOnAppOpen = async (
  myName: string,
  myWeekPoints: number, // передаём НЕДЕЛЬНЫЕ очки
): Promise<{ needShowResult: boolean; result: LeagueResult | null; state: LeagueState }> => {
  const currentWeekId = getWeekId();

  // Batch both reads into a single multiGet
  const [[, pendingRaw], [, stateRaw]] = await AsyncStorage.multiGet([RESULT_KEY, STATE_KEY]);

  let pending: LeagueResult | null = null;
  try { pending = pendingRaw ? JSON.parse(pendingRaw) : null; } catch { pending = null; }

  let state: LeagueState | null = null;
  try { state = stateRaw ? JSON.parse(stateRaw) : null; } catch { state = null; }

  if (pending) {
    return { needShowResult: true, result: pending, state: state! };
  }

  // Первый запуск — state ещё нет, нужно показать хоть что-то
  if (!state) {
    const remote = await fetchGroupForUser(0, myName, myWeekPoints);
    const group = remote ?? (await buildLocalFallbackGroup(myName, myWeekPoints));
    state = { leagueId: 0, weekId: currentWeekId, group };
    // Записываем в стабильный state только если получили реальную группу из Firestore.
    // Иначе fallback (1 человек) затрёт настоящих участников при следующем открытии.
    if (remote) await saveLeagueState(state);
    return { needShowResult: false, result: null, state };
  }

  // Новая неделя — считаем итоги
  if (currentWeekId !== state.weekId) {
    const result = calculateResult(state, myWeekPoints);
    await savePendingResult(result);

    const remote = await fetchGroupForUser(result.newLeagueId, myName, 0);
    const newGroup = remote ?? [{ name: myName, points: 0, isMe: true }];
    const newState: LeagueState = {
      leagueId: result.newLeagueId,
      weekId:   currentWeekId,
      group:    newGroup,
    };
    if (remote) await saveLeagueState(newState);
    return { needShowResult: true, result, state: newState };
  }

  // Та же неделя — обновляем группу из Firestore (свежие данные всех участников).
  // Если remote недоступен — НЕ переписываем state.group (там могут быть реальные
  // участники, загруженные ранее), только обновляем мои очки.
  const freshGroup = await fetchGroupForUser(state.leagueId, myName, myWeekPoints, currentWeekId);
  const updatedGroup = freshGroup ?? state.group
    .map(m => m.isMe ? { ...m, name: myName, points: myWeekPoints } : m)
    .sort((a, b) => b.points - a.points);

  const updatedState = { ...state, group: updatedGroup };
  // Сохраняем только если remote отдал данные — иначе оставляем предыдущий state
  // как был (включая прошлый список участников, чтобы не терять их при разовом сбое).
  if (freshGroup) await saveLeagueState(updatedState);
  return { needShowResult: false, result: null, state: updatedState };
};

export default {};
