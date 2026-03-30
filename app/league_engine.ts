/**
 * LEAGUE ENGINE — LOCAL version
 * FIREBASE MIGRATION: см. комментарии // FIREBASE: внутри
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { loadWeekLeaderboard, getMyWeekPoints } from './hall_of_fame_utils'; // FIREBASE: удалить

export interface ClubDef {
  id:         number;
  nameRU:     string;  // «Клуб Инициаторов»
  nameUK:     string;  // «Клуб Ініціаторів»
  shortRU:    string;  // «Инициаторы»
  shortUK:    string;  // «Ініціатори»
  ionIcon:    string;
  imageUri?:  string;  // PNG изображение клуба
  color:      string;
  frameId:    string;  // id рамки в FRAMES
  descRU:     string;
  descUK:     string;
  greetingRU: string;
  greetingUK: string;
}

export const CLUBS: ClubDef[] = [
  {
    id: 0, ionIcon: 'flag-outline', imageUri: require('../../assets/images/levels/The Initiators' Club.png'), color: '#7B9BB5', frameId: 'club_initiator',
    nameRU: 'Клуб Инициаторов',  nameUK: 'Клуб Ініціаторів',
    shortRU: 'Инициаторы',        shortUK: 'Ініціатори',
    descRU: 'Первый шаг — самый важный. Здесь собираются те, кто решился начать путь к знаниям. Каждое занятие — вклад в будущее.',
    descUK: 'Перший крок — найважливіший. Тут збираються ті, хто наважився розпочати шлях до знань. Кожне заняття — внесок у майбутнє.',
    greetingRU: 'Добро пожаловать, инициатор! Каждый эксперт когда-то стоял на твоём месте. Главное — начать.',
    greetingUK: 'Ласкаво просимо, ініціаторе! Кожен експерт колись стояв на твоєму місці. Головне — почати.',
  },
  {
    id: 1, ionIcon: 'flame', imageUri: require('../../assets/images/levels/The Adepts' Club.png'), color: '#5BA88B', frameId: 'club_adept',
    nameRU: 'Клуб Адептов',      nameUK: 'Клуб Адептів',
    shortRU: 'Адепты',            shortUK: 'Адепти',
    descRU: 'Огонь знаний разгорается. Адепты верны своей цели и не останавливаются. Постоянство — их главная суперсила.',
    descUK: 'Вогонь знань розгорається. Адепти вірні своїй меті і не зупиняються. Постійність — їхня головна суперсила.',
    greetingRU: 'Твоя преданность замечена! Адепты знают: повторение — мать учения. Продолжай в том же духе!',
    greetingUK: 'Твою відданість помічено! Адепти знають: повторення — мати навчання. Продовжуй в тому ж дусі!',
  },
  {
    id: 2, ionIcon: 'compass-outline', imageUri: require('../../assets/images/levels/The Seekers' Club.png'), color: '#4A90A4', frameId: 'club_seeker',
    nameRU: 'Клуб Искателей',    nameUK: 'Клуб Шукачів',
    shortRU: 'Искатели',          shortUK: 'Шукачі',
    descRU: 'Искатели не боятся неизвестного. Они задают вопросы и находят ответы. Язык для них — это карта к новым мирам.',
    descUK: 'Шукачі не бояться невідомого. Вони задають питання і знаходять відповіді. Мова для них — це карта до нових світів.',
    greetingRU: 'Ты на верном пути, искатель! Каждый новый урок — это открытие нового горизонта.',
    greetingUK: 'Ти на вірному шляху, шукачу! Кожен новий урок — це відкриття нового горизонту.',
  },
  {
    id: 3, ionIcon: 'hammer-outline', imageUri: require('../../assets/images/levels/The Practitioners' Club.png'), color: '#7BA84A', frameId: 'club_practitioner',
    nameRU: 'Клуб Практиков',    nameUK: 'Клуб Практиків',
    shortRU: 'Практики',          shortUK: 'Практики',
    descRU: 'Практики превращают теорию в навык. Они знают: язык учится в действии, а не из книг. Говори, пиши, практикуй!',
    descUK: 'Практики перетворюють теорію на навичку. Вони знають: мова вчиться в дії, а не з книг. Говори, пиши, практикуй!',
    greetingRU: 'Дело мастера боится! Практики строят знания кирпич за кирпичом. Ты в отличной форме!',
    greetingUK: 'Справа майстра боїться! Практики будують знання цеглина за цеглиною. Ти у відмінній формі!',
  },
  {
    id: 4, ionIcon: 'analytics-outline', imageUri: require('../../assets/images/levels/The Analysts' Club.png'), color: '#C8A84A', frameId: 'club_analyst',
    nameRU: 'Клуб Аналитиков',   nameUK: 'Клуб Аналітиків',
    shortRU: 'Аналитики',         shortUK: 'Аналітики',
    descRU: 'Аналитики видят паттерны там, где другие видят хаос. Грамматика для них — это система, а не набор правил.',
    descUK: 'Аналітики бачать патерни там, де інші бачать хаос. Граматика для них — це система, а не набір правил.',
    greetingRU: 'Твой разум острее, чем вчера! Аналитики превращают сложность в ясность. Ты мыслишь системно!',
    greetingUK: 'Твій розум гостріший, ніж учора! Аналітики перетворюють складність на ясність. Ти мислиш системно!',
  },
  {
    id: 5, ionIcon: 'library-outline', imageUri: require('../../assets/images/levels/The Erudites' Club.png'), color: '#CD7F32', frameId: 'club_erudite',
    nameRU: 'Клуб Эрудитов',     nameUK: 'Клуб Ерудитів',
    shortRU: 'Эрудиты',           shortUK: 'Ерудити',
    descRU: 'Эрудиты — это люди широкого кругозора. Их словарный запас и понимание грамматики открывают любые двери.',
    descUK: 'Ерудити — це люди широкого кругозору. Їхній словниковий запас і розуміння граматики відкривають будь-які двері.',
    greetingRU: 'Знания — твоя сила! Эрудиты — люди, которым всегда есть что сказать. Ты заслуженно здесь!',
    greetingUK: 'Знання — твоя сила! Ерудити — люди, яким завжди є що сказати. Ти заслужено тут!',
  },
  {
    id: 6, ionIcon: 'diamond', imageUri: require('../../assets/images/levels/The Connoisseurs' Club.png'), color: '#4A90D9', frameId: 'club_connoisseur',
    nameRU: 'Клуб Знатоков',     nameUK: 'Клуб Знавців',
    shortRU: 'Знатоки',           shortUK: 'Знавці',
    descRU: 'Знатоки понимают тонкости языка: идиомы, фразовые глаголы, нюансы. Для них язык — это не набор слов, а живая система.',
    descUK: 'Знавці розуміють тонкощі мови: ідіоми, фразові дієслова, нюанси. Для них мова — це не набір слів, а жива система.',
    greetingRU: 'Ты знаешь язык изнутри! Знатоки замечают то, что другие пропускают. Ты в элите!',
    greetingUK: 'Ти знаєш мову зсередини! Знавці помічають те, що інші пропускають. Ти в еліті!',
  },
  {
    id: 7, ionIcon: 'medal', imageUri: require('../../assets/images/levels/The Experts' Club.png'), color: '#9B59B6', frameId: 'club_expert',
    nameRU: 'Клуб Экспертов',    nameUK: 'Клуб Експертів',
    shortRU: 'Эксперты',          shortUK: 'Експерти',
    descRU: 'Экспертиза — это когда язык перестаёт быть усилием и становится инструментом. Ты говоришь — и это звучит естественно.',
    descUK: 'Експертиза — це коли мова перестає бути зусиллям і стає інструментом. Ти говориш — і це звучить природно.',
    greetingRU: 'Экспертный уровень! Твои знания выходят за рамки учебника. Ты говоришь — все слушают!',
    greetingUK: 'Експертний рівень! Твої знання виходять за межі підручника. Ти говориш — всі слухають!',
  },
  {
    id: 8, ionIcon: 'school-outline', imageUri: require('../../assets/images/levels/The Magistri Club.png'), color: '#A8B4C0', frameId: 'club_magister',
    nameRU: 'Клуб Магистров',    nameUK: 'Клуб Магістрів',
    shortRU: 'Магистры',          shortUK: 'Магістри',
    descRU: 'Магистры стоят выше большинства пользователей. Их уровень — предмет зависти и восхищения. Это уже почти вершина.',
    descUK: 'Магістри стоять вище більшості користувачів. Їхній рівень — предмет заздрості та захоплення. Це вже майже вершина.',
    greetingRU: 'Магистрская мантия тебе к лицу! Ты в абсолютной элите изучающих английский. Снимаем шляпу!',
    greetingUK: 'Магістерська мантія тобі личить! Ти в абсолютній еліті тих, хто вивчає англійську. Капелюх долу!',
  },
  {
    id: 9, ionIcon: 'bulb-outline', imageUri: require('../../assets/images/levels/The Thinkers' Club.png'), color: '#E87E30', frameId: 'club_thinker',
    nameRU: 'Клуб Мыслителей',   nameUK: 'Клуб Мислителів',
    shortRU: 'Мыслители',         shortUK: 'Мислителі',
    descRU: 'Мыслители не просто учат язык — они думают на нём. Язык становится способом мышления, а не средством перевода.',
    descUK: 'Мислителі не просто вчать мову — вони думають нею. Мова стає способом мислення, а не засобом перекладу.',
    greetingRU: 'Ты мыслишь по-английски! Это высший уровень погружения. Мыслители — редкость и гордость клуба!',
    greetingUK: 'Ти мислиш по-англійськи! Це найвищий рівень занурення. Мислителі — рідкість і гордість клубу!',
  },
  {
    id: 10, ionIcon: 'hammer', imageUri: require('../../assets/images/levels/The Masters' Club.png'), color: '#D4A017', frameId: 'club_master',
    nameRU: 'Клуб Мастеров',     nameUK: 'Клуб Майстрів',
    shortRU: 'Мастера',           shortUK: 'Майстри',
    descRU: 'Мастерство — это когда можешь всё: говорить, писать, понимать, шутить. Язык — не инструмент, а часть личности.',
    descUK: 'Майстерність — це коли можеш все: говорити, писати, розуміти, жартувати. Мова — не інструмент, а частина особистості.',
    greetingRU: 'Мастер слова! Ты среди лучших в приложении. Твой английский — это искусство. Мы гордимся тобой!',
    greetingUK: 'Майстер слова! Ти серед найкращих у додатку. Твоя англійська — це мистецтво. Ми пишаємось тобою!',
  },
  {
    id: 11, ionIcon: 'trophy-outline', imageUri: require('../../assets/images/levels/The Professors' Club.png'), color: '#FFD700', frameId: 'club_professor',
    nameRU: 'Клуб Профессоров',   nameUK: 'Клуб Професорів',
    shortRU: 'Профессора',         shortUK: 'Професори',
    descRU: 'Высший клуб приложения. Профессора — легенды, на которых равняются другие. Достичь этого уровня — значит стать примером.',
    descUK: 'Найвищий клуб додатку. Професори — легенди, на яких рівняються інші. Досягти цього рівня — означає стати прикладом.',
    greetingRU: '🏆 Легендарный статус! Ты достиг вершины. Добро пожаловать в зал славы — Клуб Профессоров!',
    greetingUK: '🏆 Легендарний статус! Ти досяг вершини. Ласкаво просимо до зали слави — Клубу Професорів!',
  },
];

/** @deprecated использовать CLUBS */
export const LEAGUES = CLUBS.map(c => ({
  id: c.id, nameRU: c.nameRU, nameUK: c.nameUK,
  shortRU: c.shortRU, shortUK: c.shortUK,
  ionIcon: c.ionIcon, imageUri: c.imageUri, color: c.color, frameId: c.frameId,
  icon: '', descRU: c.descRU, descUK: c.descUK,
  greetingRU: c.greetingRU, greetingUK: c.greetingUK,
}));

export interface GroupMember {
  name:   string;
  points: number; // НЕДЕЛЬНЫЕ очки, не накопительные
  isMe:   boolean;
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

const savePendingResult = async (r: LeagueResult) => {
  try { await AsyncStorage.setItem(RESULT_KEY, JSON.stringify(r)); } catch {}
};

export const clearPendingResult = async () => {
  try { await AsyncStorage.removeItem(RESULT_KEY); } catch {}
};

// FIREBASE: заменить на Firestore запрос
// Строит группу из week_leaderboard (НЕДЕЛЬНЫЕ очки, не накопительные)
const fetchGroupForUser = async (
  leagueId: number,
  myName: string,
  myWeekPoints: number,
): Promise<GroupMember[]> => {
  // Читаем недельный рейтинг — там только очки за текущую неделю
  const weekBoard = await loadWeekLeaderboard();

  const members: GroupMember[] = weekBoard
    .filter(e => e.name !== myName)
    .slice(0, 19)
    .map(e => ({ name: e.name, points: e.points, isMe: false }));

  // Добавляем себя с актуальными недельными очками
  members.push({ name: myName, points: myWeekPoints, isMe: true });

  return members.sort((a, b) => b.points - a.points);
};

export const submitMyPoints = async (points: number) => {
  // LOCAL: ничего, очки уже в week_leaderboard через addOrUpdateScore
};

const calculateResult = (state: LeagueState, myWeekPoints: number): LeagueResult => {
  const updated = state.group
    .map(m => m.isMe ? { ...m, points: myWeekPoints } : m)
    .sort((a, b) => b.points - a.points);

  const total        = updated.length;
  const myRank       = updated.findIndex(m => m.isMe) + 1;
  const topCutoff    = Math.max(1, Math.ceil(total * 0.15));
  const bottomCutoff = total - Math.ceil(total * 0.15) + 1;
  const promoted     = myRank <= topCutoff    && state.leagueId < CLUBS.length - 1;
  const demoted      = myRank >= bottomCutoff && state.leagueId > 0 && !promoted;

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

  const pending = await loadPendingResult();
  if (pending) {
    const state = await loadLeagueState();
    return { needShowResult: true, result: pending, state: state! };
  }

  let state = await loadLeagueState();

  // Первый запуск
  if (!state) {
    const group = await fetchGroupForUser(0, myName, myWeekPoints);
    state = { leagueId: 0, weekId: currentWeekId, group };
    await saveLeagueState(state);
    return { needShowResult: false, result: null, state };
  }

  // Новая неделя — считаем итоги
  if (currentWeekId !== state.weekId) {
    const result = calculateResult(state, myWeekPoints);
    await savePendingResult(result);

    const newGroup = await fetchGroupForUser(result.newLeagueId, myName, 0);
    const newState: LeagueState = {
      leagueId: result.newLeagueId,
      weekId:   currentWeekId,
      group:    newGroup,
    };
    await saveLeagueState(newState);
    return { needShowResult: true, result, state: newState };
  }

  // Та же неделя — обновляем мои недельные очки в группе
  const updatedGroup = state.group
    .map(m => m.isMe ? { ...m, name: myName, points: myWeekPoints } : m)
    .sort((a, b) => b.points - a.points);

  const updatedState = { ...state, group: updatedGroup };
  await saveLeagueState(updatedState);
  return { needShowResult: false, result: null, state: updatedState };
};

export default {};

