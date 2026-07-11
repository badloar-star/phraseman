/**
 * LEAGUE ENGINE — LOCAL version
 * FIREBASE MIGRATION: см. комментарии // FIREBASE: внутри
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { loadWeekLeaderboard } from './hall_of_fame_utils';
import { getOrCreateLeagueGroup, updateMyGroupPoints } from './firestore_leagues';
import { getCanonicalUserId } from './user_id_policy';
import { rememberLeagueStateSnapshot, sanitizeLeagueState } from './league_open_cache_policy';
import { getLeagueXpPromotionThreshold, isLeagueXpPromotionEnabled } from './remote_flags';
import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from './config';

import { triLang, type Lang, type PlannedInterfaceLang } from '../constants/i18n';

export interface ClubDef {
  id:         number;
  nameRU:     string;  // «Клуб Инициаторов»
  nameUK:     string;  // «Клуб Ініціаторів»
  nameES:     string;
  shortRU:    string;  // «Инициаторы»
  shortUK:    string;  // «Ініціатори»
  ionIcon:    string;
  imageUri?:  any;  // изображение клуба (require() asset)
  cardImageUri?: any; // большая фоновая карточка лиги (require() asset)
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
    id: 0, ionIcon: 'flag-outline', imageUri: require("../assets/images/levels/league-v6-icons/league-icon-med.webp"), cardImageUri: require("../assets/images/levels/league-v6-cards/league-card-med.webp"), color: '#7B9BB5', frameId: 'club_initiator',
    nameRU: 'Медная лига',  nameUK: 'Мідь', nameES: 'Cobre',
    shortRU: 'Медная лига', shortUK: 'Мідь',
    tagRU: 'Бонус: +0% XP', tagUK: 'Бонус: +0% XP', tagES: 'Bonificación: +0% XP',
    descRU: 'Твой старт — это уже победа! Ты не просто скачал приложение, ты бросил вызов своей лени. Главное сейчас — не дать меди окислиться. Просто продолжай заходить каждый день, и твой мозг сам поймет, что обратной дороги нет. Пока без бонусов, зато с чистой совестью.',
    descUK: 'Твій старт — це вже перемога! Ти не просто встановив застосунок, ти кинув виклик своїй ліні. Головне зараз — не дати міді окислитися. Просто заходь щодня, і твій мозок сам зрозуміє, що дороги назад уже немає. Поки без бонусів, зате з чистою совістю.',
    greetingRU: 'Добро пожаловать, инициатор! Каждый эксперт когда-то стоял на твоём месте. Главное — начать.',
    greetingUK: 'Ласкаво просимо, ініціаторе! Кожен експерт колись стояв на твоєму місці. Головне — почати.',
  },
  {
    id: 1, ionIcon: 'flame', imageUri: require("../assets/images/levels/league-v6-icons/league-icon-bronz.webp"), cardImageUri: require("../assets/images/levels/league-v6-cards/league-card-bronz.webp"), color: '#5BA88B', frameId: 'club_adept',
    nameRU: 'Бронзовая лига', nameUK: 'Бронза', nameES: 'Bronce',
    shortRU: 'Бронзовая лига', shortUK: 'Бронза',
    tagRU: 'Бонус: +10% XP',  tagUK: 'Бонус: +10% XP', tagES: 'Bonificación: +10% XP',
    descRU: 'Укрепляем базу! Бронза — металл тех, кто пережил первый порыв и решил остаться. Твои нейронные связи становятся крепче, а рука уже сама тянется к иконке приложения. Первый шаг сделан, и система это ценит — забирай свои законные +10% опыта к каждому уроку.',
    descUK: 'Зміцнюємо базу! Бронза — метал тих, хто пережив перший порив і вирішив залишитися. Твої нейронні зв\'язки стають міцнішими, а рука вже сама тягнеться до іконки застосунку. Перший крок зроблено, і система це цінує — отримуй законні +10% досвіду до кожного уроку.',
    greetingRU: 'Твоя преданность замечена! Адепты знают: повторение — мать учения. Продолжай в том же духе!',
    greetingUK: 'Твою відданість помічено! Адепти знають: повторення — мати навчання. Продовжуй в тому ж дусі!',
  },
  {
    id: 2, ionIcon: 'compass-outline', imageUri: require("../assets/images/levels/league-v6-icons/league-icon-serebro.webp"), cardImageUri: require("../assets/images/levels/league-v6-cards/league-card-serebro.webp"), color: '#4A90A4', frameId: 'club_seeker',
    nameRU: 'Серебряная лига', nameUK: 'Срібло', nameES: 'Plata',
    shortRU: 'Серебряная лига', shortUK: 'Срібло',
    tagRU: 'Бонус: +20% XP', tagUK: 'Бонус: +20% XP', tagES: 'Bonificación: +20% XP',
    descRU: 'Твое любопытство — твой двигатель. Ты ищешь новые знания, и это круто. На этом этапе многие сдаются, но ты блестишь на их фоне, как начищенная монета. Не бойся ошибаться, ведь именно так рождается истина и приятный бонус в +20% опыта.',
    descUK: 'Твоя допитливість — твій двигун. Ти шукаєш нові знання, і це круто. На цьому етапі багато хто здається, але ти сяєш на їхньому фоні, як начищена монета. Не бійся помилятися, адже саме так народжується істина і приємний бонус у +20% досвіду.',
    greetingRU: 'Ты на верном пути, искатель! Каждый новый урок — это открытие нового горизонта.',
    greetingUK: 'Ти на вірному шляху, шукачу! Кожен новий урок — це відкриття нового горизонту.',
  },
  {
    id: 3, ionIcon: 'hammer-outline', imageUri: require("../assets/images/levels/league-v6-icons/league-icon-zoloto.webp"), cardImageUri: require("../assets/images/levels/league-v6-cards/league-card-zoloto.webp"), color: '#7BA84A', frameId: 'club_practitioner',
    nameRU: 'Золотая лига',   nameUK: 'Золото', nameES: 'Oro',
    shortRU: 'Золотая лига',  shortUK: 'Золото',
    tagRU: 'Бонус: +30% XP', tagUK: 'Бонус: +30% XP', tagES: 'Bonificación: +30% XP',
    descRU: 'Дело мастера боится! Ты берешь не зубрежкой, а делом. Теперь ты понимаешь, что каждый твой "клик" — это кирпичик в фундаменте будущего свободного общения. Золотой стандарт достигнут, и награда соответствующая — практика приносит плоды и +30% к прогрессу.',
    descUK: 'Справі майстра страх! Ти береш не зубрінням, а практикою. Тепер ти розумієш, що кожен твій "клік" — це цеглинка у фундаменті майбутнього вільного спілкування. Золотий стандарт досягнуто, і нагорода відповідна — практика дає плоди та +30% до прогресу.',
    greetingRU: 'Дело мастера боится! Практики строят знания кирпич за кирпичом. Ты в отличной форме!',
    greetingUK: 'Справа майстра боїться! Практики будують знання цеглина за цеглиною. Ти у відмінній формі!',
  },
  {
    id: 4, ionIcon: 'analytics-outline', imageUri: require("../assets/images/levels/league-v6-icons/league-icon-platina.webp"), cardImageUri: require("../assets/images/levels/league-v6-cards/league-card-platina.webp"), color: '#C8A84A', frameId: 'club_analyst',
    nameRU: 'Платиновая лига', nameUK: 'Платина', nameES: 'Platino',
    shortRU: 'Платиновая лига', shortUK: 'Платина',
    tagRU: 'Бонус: +40% XP', tagUK: 'Бонус: +40% XP', tagES: 'Bonificación: +40% XP',
    descRU: 'Твой ум ищет закономерности. Ты больше не просто повторяешь — ты вникаешь в самую суть, видишь структуру там, где другие видят хаос. С таким подходом даже самые сложные правила станут понятными. Острый ум — острый рост: получай +40% опыта за свою стабильность.',
    descUK: 'Твій розум шукає закономірності. Ти більше не просто повторюєш — ти вникаєш у саму суть, бачиш структуру там, де інші бачать хаос. Із таким підходом навіть найскладніші правила стануть зрозумілими. Гострий розум — стрімке зростання: отримуй +40% досвіду за свою стабільність.',
    greetingRU: 'Твой разум острее, чем вчера! Аналитики превращают сложность в ясность. Ты мыслишь системно!',
    greetingUK: 'Твій розум гостріший, ніж учора! Аналітики перетворюють складність на ясність. Ти мислиш системно!',
  },
  {
    id: 5, ionIcon: 'library-outline', imageUri: require("../assets/images/levels/league-v6-icons/league-icon-izumrud.webp"), cardImageUri: require("../assets/images/levels/league-v6-cards/league-card-izumrud.webp"), color: '#CD7F32', frameId: 'club_erudite',
    nameRU: 'Изумрудная лига', nameUK: 'Смарагд', nameES: 'Esmeralda',
    shortRU: 'Изумрудная лига', shortUK: 'Смарагд',
    tagRU: 'Бонус: +50% XP', tagUK: 'Бонус: +50% XP', tagES: 'Bonificación: +50% XP',
    descRU: 'Порог в высшее общество. Изумрудный блеск твоих успехов виден издалека. Ты прошел экватор и доказал, что твоя дисциплина — это не случайность, а характер. Теперь прогресс идет в полтора раза быстрее. Наслаждайся видом, ты это заслужил!',
    descUK: 'Поріг у вище суспільство. Смарагдовий блиск твоїх успіхів видно здалеку. Ти пройшов екватор і довів, що твоя дисципліна — це не випадковість, а характер. Тепер прогрес іде в півтора раза швидше. Насолоджуйся видом — ти це заслужив!',
    greetingRU: 'Знания — твоя сила! Эрудиты — люди, которым всегда есть что сказать. Ты заслуженно здесь!',
    greetingUK: 'Знання — твоя сила! Ерудити — люди, яким завжди є що сказати. Ти заслужено тут!',
  },
  {
    id: 6, ionIcon: 'diamond', imageUri: require("../assets/images/levels/league-v6-icons/league-icon-sapfir.webp"), cardImageUri: require("../assets/images/levels/league-v6-cards/league-card-sapfir.webp"), color: '#4A90D9', frameId: 'club_connoisseur',
    nameRU: 'Сапфировая лига', nameUK: 'Сапфір', nameES: 'Zafiro',
    shortRU: 'Сапфировая лига', shortUK: 'Сапфір',
    tagRU: 'Бонус: +60% XP', tagUK: 'Бонус: +60% XP', tagES: 'Bonificación: +60% XP',
    descRU: 'Глубокий синий цвет сапфира символизирует твое полное погружение. Ты уже не просто учишься, ты начинаешь "чувствовать" материал. Ты стал тверже камня в своих намерениях, и твоя награда в +60% XP — прямое подтверждение твоей исключительности.',
    descUK: 'Глибокий синій колір сапфіра символізує твоє повне занурення. Ти вже не просто вчишся, ти починаєш "відчувати" матеріал. Ти став твердішим за камінь у своїх намірах, а твоя нагорода в +60% XP — пряме підтвердження твоєї винятковості.',
    greetingRU: 'Ты знаешь язык изнутри! Знатоки замечают то, что другие пропускают. Ты в элите!',
    greetingUK: 'Ти знаєш мову зсередини! Знавці помічають те, що інші пропускають. Ти в еліті!',
  },
  {
    id: 7, ionIcon: 'flame-outline', imageUri: require("../assets/images/levels/league-v6-icons/league-icon-rubin.webp"), cardImageUri: require("../assets/images/levels/league-v6-cards/league-card-rubin.webp"), color: '#9B59B6', frameId: 'club_expert',
    nameRU: 'Рубиновая лига', nameUK: 'Рубін', nameES: 'Rubí',
    shortRU: 'Рубиновая лига', shortUK: 'Рубін',
    tagRU: 'Бонус: +70% XP', tagUK: 'Бонус: +70% XP', tagES: 'Bonificación: +70% XP',
    descRU: 'Настоящая страсть к знаниям! В лиге Рубина остаются только те, у кого горят глаза. Твоя продуктивность зашкаливает, а скорость обучения заставляет окружающих завидовать. Мы лишь подливаем масла в огонь твоих достижений — держи +70% к опыту.',
    descUK: 'Справжня пристрасть до знань! У лізі Рубіна залишаються тільки ті, у кого горять очі. Твоя продуктивність зашкалює, а швидкість навчання змушує оточення заздрити. Ми лише підливаємо олії у вогонь твоїх досягнень — тримай +70% до досвіду.',
    greetingRU: 'Экспертный уровень! Твои знания выходят за рамки учебника. Ты говоришь — все слушают!',
    greetingUK: 'Експертний рівень! Твої знання виходять за межі підручника. Ти говориш — всі слухають!',
  },
  {
    id: 8, ionIcon: 'school-outline', imageUri: require("../assets/images/levels/league-v6-icons/league-icon-almaz.webp"), cardImageUri: require("../assets/images/levels/league-v6-cards/league-card-almaz.webp"), color: '#A8B4C0', frameId: 'club_magister',
    nameRU: 'Алмазная лига', nameUK: 'Діамант', nameES: 'Diamante',
    shortRU: 'Алмазная лига', shortUK: 'Діамант',
    tagRU: 'Бонус: +80% XP',  tagUK: 'Бонус: +80% XP', tagES: 'Bonificación: +80% XP',
    descRU: 'Идеальная огранка. Алмаз рождается под колоссальным давлением, и ты выдержал его, став практически несокрушимым. Твои знания теперь крепки как никогда, а интеллект сияет под любым углом. За твою фантастическую выдержку — ошеломительные +80% опыта.',
    descUK: 'Ідеальна огранка. Алмаз народжується під колосальним тиском, і ти витримав його, ставши майже незламним. Твої знання тепер міцні як ніколи, а інтелект сяє під будь-яким кутом. За твою фантастичну витримку — приголомшливі +80% досвіду.',
    greetingRU: 'Магистрская мантия тебе к лицу! Ты в абсолютной элите изучающих английский. Снимаем шляпу!',
    greetingUK: 'Магістерська мантія тобі личить! Ти в абсолютній еліті тих, хто вивчає англійську. Капелюх долу!',
  },
  {
    id: 9, ionIcon: 'sparkles-outline', imageUri: require("../assets/images/levels/league-v6-icons/league-icon-cherniy-almaz.webp"), cardImageUri: require("../assets/images/levels/league-v6-cards/league-card-cherniy-almaz.webp"), color: '#E87E30', frameId: 'club_thinker',
    nameRU: 'Лига Черного Алмаза', nameUK: 'Чорний Діамант', nameES: 'Diamante negro',
    shortRU: 'Лига Черного Алмаза', shortUK: 'Чорний Діамант',
    tagRU: 'Бонус: +90% XP',   tagUK: 'Бонус: +90% XP', tagES: 'Bonificación: +90% XP',
    descRU: 'Редчайший экземпляр. Ты — элита из элит. Черный алмаз встречается в природе реже всего, как и игроки с твоим уровнем упорства. Ты поглощаешь информацию, не оставляя шансов конкурентам. Ты почти у цели, и бонус в +90% XP — твой реактивный двигатель.',
    descUK: 'Найрідкісніший екземпляр. Ти — еліта з еліт. Чорний алмаз трапляється в природі найрідше, як і гравці з твоїм рівнем наполегливості. Ти поглинаєш інформацію, не залишаючи шансів конкурентам. Ти майже біля цілі, а бонус у +90% XP — твій реактивний двигун.',
    greetingRU: 'Ты мыслишь по-английски! Это высший уровень погружения. Мыслители — редкость и гордость лиги!',
    greetingUK: 'Ти мислиш англійською! Це найвищий рівень занурення. Мислителі — рідкість і гордість ліги!',
  },
  {
    id: 10, ionIcon: 'hammer', imageUri: require("../assets/images/levels/league-v6-icons/league-icon-efir.webp"), cardImageUri: require("../assets/images/levels/league-v6-cards/league-card-efir.webp"), color: '#D4A017', frameId: 'club_master',
    nameRU: 'Эфирная лига',  nameUK: 'Ефір', nameES: 'Éter',
    shortRU: 'Эфирная лига', shortUK: 'Ефір',
    tagRU: 'Бонус: +100% XP',   tagUK: 'Бонус: +100% XP', tagES: 'Bonificación: +100% XP',
    descRU: 'За пределами физики. Ты перешел в состояние чистого разума, где знания усваиваются мгновенно, прямо из воздуха. Ты стал легендой, о которой шепчутся в медной лиге. Твой опыт удваивается автоматически, ведь ты и есть само воплощение обучения.',
    descUK: 'За межами фізики. Ти перейшов у стан чистого розуму, де знання засвоюються миттєво, просто з повітря. Ти став легендою, про яку шепочуться в мідній лізі. Твій досвід автоматично подвоюється, бо ти і є саме втілення навчання.',
    greetingRU: 'Мастер слова! Ты среди лучших в приложении. Твой английский — это искусство. Мы гордимся тобой!',
    greetingUK: 'Майстер слова! Ти серед найкращих у додатку. Твоя англійська — це мистецтво. Ми пишаємось тобою!',
  },
  {
    id: 11, ionIcon: 'trophy-outline', imageUri: require("../assets/images/levels/league-v6-icons/league-icon-vishaya.webp"), cardImageUri: require("../assets/images/levels/league-v6-cards/league-card-vishaya.webp"), color: '#FFD700', frameId: 'club_professor',
    nameRU: 'Высшая лига',   nameUK: 'Вища Ліга', nameES: 'Liga suprema',
    shortRU: 'Высшая лига',  shortUK: 'Вища Ліга',
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

export const CLUB_NAME_PLANNED: Record<number, Record<PlannedInterfaceLang, string>> = {
  0: { 'pt-BR': 'Liga de Cobre', vi: 'Đồng', id: 'Tembaga', tr: 'Bakır', pl: 'Miedź' },
  1: { 'pt-BR': 'Liga de Bronze', vi: 'Đồng', id: 'Perunggu', tr: 'Bronz', pl: 'Brąz' },
  2: { 'pt-BR': 'Liga de Prata', vi: 'Bạc', id: 'Perak', tr: 'Gümüş', pl: 'Srebro' },
  3: { 'pt-BR': 'Liga de Ouro', vi: 'Vàng', id: 'Emas', tr: 'Altın', pl: 'Złoto' },
  4: { 'pt-BR': 'Liga de Platina', vi: 'Bạch kim', id: 'Platinum', tr: 'Platin', pl: 'Platyna' },
  5: { 'pt-BR': 'Liga Esmeralda', vi: 'Ngọc lục bảo', id: 'Zamrud', tr: 'Zümrüt', pl: 'Szmaragd' },
  6: { 'pt-BR': 'Liga Safira', vi: 'Lam ngọc', id: 'Safir', tr: 'Safir', pl: 'Szafir' },
  7: { 'pt-BR': 'Liga Rubi', vi: 'Hồng ngọc', id: 'Rubi', tr: 'Yakut', pl: 'Rubin' },
  8: { 'pt-BR': 'Liga Diamante', vi: 'Kim cương', id: 'Berlian', tr: 'Elmas', pl: 'Diament' },
  9: { 'pt-BR': 'Liga Diamante Negro', vi: 'Kim cương đen', id: 'Berlian hitam', tr: 'Siyah Elmas', pl: 'Czarny Diament' },
  10: { 'pt-BR': 'Liga Éter', vi: 'Ê-te', id: 'Eter', tr: 'Eter', pl: 'Eter' },
  11: { 'pt-BR': 'Liga Suprema', vi: 'Giải đấu tối cao', id: 'Liga tertinggi', tr: 'En Üst Lig', pl: 'Liga Najwyższa' },
};

export const CLUB_DESC_PLANNED: Record<number, Record<PlannedInterfaceLang, string>> = {
  0: {
    'pt-BR': 'Seu primeiro passo já conta: entre todos os dias e mantenha o hábito; ainda sem bônus de XP.',
    vi: 'Bước đầu tiên đã được tính: vào mỗi ngày để giữ thói quen; hiện chưa có thưởng XP.',
    id: 'Langkah pertamamu sudah berarti: masuk setiap hari dan jaga kebiasaan; belum ada bonus XP.',
    tr: 'İlk adımın bile önemli: her gün gir ve alışkanlığı koru; XP bonusu henüz yok.',
    pl: 'Pierwszy krok już się liczy: wchodź codziennie i utrzymaj nawyk; na razie bez bonusu XP.',
  },
  1: {
    'pt-BR': 'Você fortalece a base e mostra constância: +10% de XP em cada aula.',
    vi: 'Bạn đang củng cố nền tảng và giữ nhịp: nhận +10% XP cho mỗi bài học.',
    id: 'Kamu memperkuat dasar dan menunjukkan konsistensi: +10% XP untuk setiap pelajaran.',
    tr: 'Temeli güçlendiriyor ve istikrar gösteriyorsun: her ders için +%10 XP.',
    pl: 'Wzmacniasz podstawy i pokazujesz regularność: +10% XP za każdą lekcję.',
  },
  2: {
    'pt-BR': 'Você continua explorando quando muitos param; mantenha a curiosidade e ganhe +20% de XP.',
    vi: 'Bạn vẫn tiếp tục khám phá khi nhiều người dừng lại; giữ sự tò mò và nhận +20% XP.',
    id: 'Kamu terus menjelajah saat banyak orang berhenti; jaga rasa ingin tahu dan dapatkan +20% XP.',
    tr: 'Birçok kişi dururken sen keşfetmeye devam ediyorsun; merakını koru ve +%20 XP kazan.',
    pl: 'Idziesz dalej, gdy inni odpuszczają; utrzymaj ciekawość i zgarnij +20% XP.',
  },
  3: {
    'pt-BR': 'Você constrói com prática real; cada repetição conta e soma +30% de XP.',
    vi: 'Bạn xây tiến bộ bằng luyện tập thật; mỗi lần lặp lại đều tính và cộng +30% XP.',
    id: 'Kamu membangun dengan latihan nyata; setiap pengulangan berarti dan memberi +30% XP.',
    tr: 'Gerçek pratikle ilerliyorsun; her tekrar sayılır ve +%30 XP getirir.',
    pl: 'Budujesz przez prawdziwą praktykę; każde powtórzenie ma znaczenie i daje +30% XP.',
  },
  4: {
    'pt-BR': 'Você busca padrões e estrutura; sua estabilidade vale +40% de XP.',
    vi: 'Bạn tìm ra quy luật và cấu trúc; sự ổn định của bạn được thưởng +40% XP.',
    id: 'Kamu mencari pola dan struktur; kestabilanmu memberi +40% XP.',
    tr: 'Kalıpları ve yapıyı arıyorsun; istikrarın +%40 XP ile ödüllenir.',
    pl: 'Szukasz wzorców i struktury; stabilność daje Ci +40% XP.',
  },
  5: {
    'pt-BR': 'Sua disciplina aparece nos resultados; o ritmo sobe com +50% de XP.',
    vi: 'Kỷ luật của bạn thể hiện trong kết quả; nhịp học tăng với +50% XP.',
    id: 'Disiplinmu terlihat dari hasil; ritmenya naik dengan +50% XP.',
    tr: 'Disiplinin sonuçlarda görünüyor; tempo +%50 XP ile artıyor.',
    pl: 'Twoja dyscyplina widać w wynikach; tempo rośnie dzięki +50% XP.',
  },
  6: {
    'pt-BR': 'Você domina cada vez mais o idioma; seu progresso merece +60% de XP.',
    vi: 'Bạn ngày càng làm chủ tiếng Anh tốt hơn; tiến bộ này xứng đáng +60% XP.',
    id: 'Kamu makin menguasai bahasa; progresmu layak mendapat +60% XP.',
    tr: 'Dile her geçen gün daha çok hakimsin; ilerlemen +%60 XP’yi hak ediyor.',
    pl: 'Coraz lepiej panujesz nad językiem; postęp zasługuje na +60% XP.',
  },
  7: {
    'pt-BR': 'Paixão e bom ritmo no ranking; mantenha o impulso com +70% de XP.',
    vi: 'Đam mê và nhịp tốt trên bảng xếp hạng; giữ đà với +70% XP.',
    id: 'Semangat dan ritme bagus di peringkat; pertahankan dorongan dengan +70% XP.',
    tr: 'Sıralamada tutku ve iyi tempo; ivmeyi +%70 XP ile koru.',
    pl: 'Pasja i dobre tempo w rankingu; utrzymaj rozpęd dzięki +70% XP.',
  },
  8: {
    'pt-BR': 'Força de vontade e clareza; seu esforço se transforma em +80% de XP.',
    vi: 'Ý chí mạnh và định hướng rõ; nỗ lực của bạn đổi thành +80% XP.',
    id: 'Kemauan kuat dan arah jelas; usahamu berubah menjadi +80% XP.',
    tr: 'Güçlü irade ve netlik; emeğin +%80 XP’ye dönüşür.',
    pl: 'Silna wola i jasność działania; wysiłek przekłada się na +80% XP.',
  },
  9: {
    'pt-BR': 'Elite entre a elite; quase ninguém chega aqui, e o bônus é +90% de XP.',
    vi: 'Tinh hoa trong nhóm tinh hoa; rất ít người tới đây, phần thưởng là +90% XP.',
    id: 'Elite di antara elite; tidak banyak yang sampai di sini, bonusnya +90% XP.',
    tr: 'Elitlerin eliti; buraya çok az kişi gelir, bonusun +%90 XP.',
    pl: 'Elita wśród elity; mało kto tu dociera, a bonus to +90% XP.',
  },
  10: {
    'pt-BR': 'Você está em uma zona lendária: seu XP dobra automaticamente (+100%).',
    vi: 'Bạn đang ở vùng huyền thoại: XP của bạn tự động nhân đôi (+100%).',
    id: 'Kamu berada di zona legendaris: XP otomatis berlipat dua (+100%).',
    tr: 'Efsanevi bölgedesin: XP’in otomatik olarak ikiye katlanır (+%100).',
    pl: 'Jesteś w strefie legend: XP podwaja się automatycznie (+100%).',
  },
  11: {
    'pt-BR': 'O topo do ranking no app; bônus máximo de +110% de XP.',
    vi: 'Đỉnh bảng xếp hạng trong ứng dụng; thưởng tối đa +110% XP.',
    id: 'Puncak peringkat di aplikasi; bonus maksimal +110% XP.',
    tr: 'Uygulamadaki sıralamanın zirvesi; maksimum +%110 XP bonusu.',
    pl: 'Szczyt rankingu w aplikacji; maksymalny bonus +110% XP.',
  },
};

export function clubNamePlanned(leagueId: number, locale: PlannedInterfaceLang): string {
  return CLUB_NAME_PLANNED[leagueId]?.[locale] ?? '';
}

export function clubDescPlanned(leagueId: number, locale: PlannedInterfaceLang): string {
  return CLUB_DESC_PLANNED[leagueId]?.[locale] ?? '';
}

export function clubDescForLang(club: Pick<ClubDef, 'id' | 'descRU' | 'descUK'>, lang: Lang): string {
  return triLang(lang, {
    ru: club.descRU,
    uk: club.descUK,
    es: CLUB_DESC_ES[club.id] ?? club.descRU,
    'pt-BR': clubDescPlanned(club.id, 'pt-BR'),
    vi: clubDescPlanned(club.id, 'vi'),
    id: clubDescPlanned(club.id, 'id'),
    tr: clubDescPlanned(club.id, 'tr'),
    pl: clubDescPlanned(club.id, 'pl'),
  });
}

/** @deprecated использовать CLUBS */
export const LEAGUES = CLUBS.map(c => ({
  id: c.id, nameRU: c.nameRU, nameUK: c.nameUK, nameES: c.nameES,
  shortRU: c.shortRU, shortUK: c.shortUK,
  ionIcon: c.ionIcon, imageUri: c.imageUri, cardImageUri: c.cardImageUri, color: c.color, frameId: c.frameId,
  icon: '', tagRU: c.tagRU, tagUK: c.tagUK, tagES: c.tagES, descRU: c.descRU, descUK: c.descUK,
  greetingRU: c.greetingRU, greetingUK: c.greetingUK,
}));

/** Короткое имя яруса клуба на экране (металл / лига). */
export function clubTierShortName(club: Pick<ClubDef, 'id' | 'nameRU' | 'nameUK' | 'nameES'>, lang: Lang): string {
  return triLang(lang, {
    ru: club.nameRU,
    uk: club.nameUK,
    es: club.nameES,
    'pt-BR': clubNamePlanned(club.id, 'pt-BR'),
    vi: clubNamePlanned(club.id, 'vi'),
    id: clubNamePlanned(club.id, 'id'),
    tr: clubNamePlanned(club.id, 'tr'),
    pl: clubNamePlanned(club.id, 'pl'),
  });
}

export interface GroupMember {
  name:      string;
  points:    number; // НЕДЕЛЬНЫЕ очки, не накопительные
  isMe:      boolean;
  uid?:      string;
  botId?:    string;
  isBot?:    boolean;
  isPremium?: boolean;
  isVip?: boolean;
  isLifetime?: boolean;
  avatar?:   string;
  frame?:    string;
  aura?:     string;
  profileCardLevel?: number;
  profileCardTheme?: string;
  profileCardMotion?: string;
  profileCardPublicFocus?: string;
  streak?:   number;
  totalXp?:  number;
  leagueId?: number;
  /** Личный буст клуба (×2/×3), если активен и не истёк. */
  leagueBoostMultiplier?: number;
  leagueBoostExpiresAt?: number;
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
const RESULT_CONSUMED_SIG_KEY = 'league_result_consumed_sig';

// ── Межхостовый session-guard для LeagueResultModal ─────────────────────────
// Модалку итогов недели показывают И home.tsx, И club_screen.tsx — у каждого
// свой локальный useRef, который не знает про другой хост. Если оба хоста
// одновременно получают один и тот же pending (например, оба смонтированы
// или один ремаунтится), локальные рефы не спасают. Guard живёт на уровне
// МОДУЛЯ (не компонента), переживает ремаунт любого хоста.
let leagueResultSessionConsumedSig: string | null = null;

/**
 * Пытается «забронировать» показ модалки для данной сигнатуры результата.
 * Первый хост, вызвавший это для сигнатуры X, получает true и должен показать
 * модалку. Любой последующий вызов (тот же хост повторно или другой хост) с
 * той же сигнатурой получает false — показывать не нужно, её уже показывают/
 * показали.
 */
export const tryAcquireLeagueResultModal = (sig: string): boolean => {
  if (!sig) return false;
  if (leagueResultSessionConsumedSig === sig) return false;
  leagueResultSessionConsumedSig = sig;
  return true;
};

/** Только для тестов: сбрасывает module-level session-guard между кейсами. */
export const __resetLeagueResultSessionGuardForTests = () => {
  leagueResultSessionConsumedSig = null;
};

export const LEAGUE_RESULT_ZONE_RATIO = 0.15;

// Math.round даёт меньший размер зон для большинства групп (например, 7 × 0.15 = 1.05 → round=1, ceil=2),
// что снижает ротацию и делает её менее агрессивной по сравнению с ceil.
export const getLeagueResultZoneSize = (total: number): number => (
  total >= 2 ? Math.max(1, Math.round(total * LEAGUE_RESULT_ZONE_RATIO)) : 0
);

const normalizeMemberName = (name?: string | null): string =>
  String(name ?? '').replace(/\s+/g, ' ').trim().toLowerCase();

const readMemberPoints = (member: GroupMember | undefined, backup = 0): number => {
  const points = Number(member?.points);
  return Number.isFinite(points) ? points : backup;
};

const findCurrentMemberIndex = (
  group: GroupMember[],
  myName?: string | null,
  myUid?: string | null,
): number => {
  const existingMe = group.findIndex(m => m.isMe === true);
  if (existingMe >= 0) return existingMe;

  const uid = String(myUid ?? '').trim();
  if (uid) {
    const uidMatch = group.findIndex(m => String(m.uid ?? '').trim() === uid);
    if (uidMatch >= 0) return uidMatch;
  }

  const name = normalizeMemberName(myName);
  if (!name) return -1;
  const nameMatches = group
    .map((m, index) => ({ m, index }))
    .filter(({ m }) => normalizeMemberName(m.name) === name);
  if (nameMatches.length === 0) return -1;

  nameMatches.sort((a, b) => readMemberPoints(b.m) - readMemberPoints(a.m));
  return nameMatches[0].index;
};

const ensureCurrentUserInGroup = (
  group: GroupMember[],
  myName: string,
  myWeekPoints: number,
  myUid?: string | null,
  mode: 'current-points' | 'stored-points' = 'current-points',
): GroupMember[] => {
  const source = Array.isArray(group) ? group : [];
  const myIndex = findCurrentMemberIndex(source, myName, myUid);
  const fallbackName = myName.trim() || source[myIndex]?.name || 'Player';

  if (myIndex < 0) {
    return [
      ...source.map(m => ({ ...m, isMe: false })),
      {
        name: fallbackName,
        points: Math.max(0, Math.floor(Number(myWeekPoints) || 0)),
        isMe: true,
        uid: myUid || undefined,
      },
    ];
  }

  return source.map((m, index) => {
    if (index !== myIndex) return { ...m, isMe: false };
    const points = mode === 'stored-points'
      ? readMemberPoints(m, myWeekPoints)
      : Math.max(0, Math.floor(Number(myWeekPoints) || 0));
    return {
      ...m,
      name: fallbackName,
      points,
      isMe: true,
      uid: m.uid ?? myUid ?? undefined,
    };
  });
};

const getMyUidSafe = async (): Promise<string | null> => {
  try { return await getCanonicalUserId(); } catch { return null; }
};

const repairPendingResultForCurrentUser = async (
  result: LeagueResult,
  preferredName?: string | null,
  preferredUid?: string | null,
): Promise<LeagueResult> => {
  const [namePairs, loadedUid] = await Promise.all([
    AsyncStorage.multiGet(['user_name']),
    getMyUidSafe(),
  ]);
  const storedName = namePairs[0]?.[1];
  const myName = (preferredName || storedName || '').trim();
  const myUid = preferredUid ?? loadedUid;
  const resultGroup = Array.isArray(result.group) ? result.group : [];
  const currentIndex = findCurrentMemberIndex(resultGroup, myName, myUid);
  const storedPoints = readMemberPoints(resultGroup[currentIndex], 0);
  const repairedGroup = ensureCurrentUserInGroup(
    resultGroup,
    myName,
    storedPoints,
    myUid,
    'stored-points',
  );

  const repaired = calculateResult(
    {
      leagueId: result.prevLeagueId,
      weekId: getWeekId(),
      group: repairedGroup,
    },
    storedPoints,
  );

  return {
    ...repaired,
    prevLeagueId: result.prevLeagueId,
  };
};

export const getLeagueResultSignature = (result: LeagueResult): string => JSON.stringify({
  prevLeagueId: result.prevLeagueId,
  newLeagueId: result.newLeagueId,
  myRank: result.myRank,
  totalInGroup: result.totalInGroup,
  promoted: result.promoted,
  demoted: result.demoted,
});

/**
 * true, если результат с данной сигнатурой уже был показан и подтверждён
 * (consumed_sig проставляется markLeagueResultShown в момент показа и
 * clearPendingResult в момент закрытия — см. ниже). Используется в пути
 * показа (checkLeagueOnAppOpen, loadPendingResult), чтобы cloud restore или
 * повторный rollover не воскрешали уже закрытую модалку.
 */
const isLeagueResultAlreadyConsumed = async (result: LeagueResult | null): Promise<boolean> => {
  if (!result) return false;
  try {
    const consumedSig = await AsyncStorage.getItem(RESULT_CONSUMED_SIG_KEY);
    if (!consumedSig) return false;
    return consumedSig === getLeagueResultSignature(result);
  } catch {
    return false;
  }
};

// ISO week number — граница в понедельник (как в hall_of_fame_utils)
export const getWeekId = (d: Date = new Date()): string => {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(weekNum).padStart(2, '0')}`;
};

export const loadLeagueState = async (): Promise<LeagueState | null> => {
  try {
    const s = await AsyncStorage.getItem(STATE_KEY);
    // Санитизируем у источника: битый кэш может дать group не-массивом → [...group] падает,
    // глобальный ErrorBoundary роняет всё приложение. rememberLeagueStateSnapshot тоже
    // санитизирует — двойная защита (источник + кэш).
    const parsed = s ? sanitizeLeagueState(JSON.parse(s)) : null;
    return rememberLeagueStateSnapshot(parsed);
  } catch {
    rememberLeagueStateSnapshot(null);
    return null;
  }
};

const saveLeagueState = async (s: LeagueState) => {
  rememberLeagueStateSnapshot(s);
  try { await AsyncStorage.setItem(STATE_KEY, JSON.stringify(s)); } catch {}
};

export const loadPendingResult = async (): Promise<LeagueResult | null> => {
  try {
    const s = await AsyncStorage.getItem(RESULT_KEY);
    if (!s) return null;
    const parsed = JSON.parse(s) as LeagueResult;
    if (!parsed || typeof parsed !== 'object') return null;
    const repaired = await repairPendingResultForCurrentUser(parsed);
    await AsyncStorage.setItem(RESULT_KEY, JSON.stringify(repaired));
    const state = await loadLeagueState();
    if (state && state.leagueId !== repaired.newLeagueId) {
      await saveLeagueState({ ...state, leagueId: repaired.newLeagueId });
    }
    // Латч: этот результат уже был показан и подтверждён ранее (markLeagueResultShown /
    // clearPendingResult). Такое случается, если cloud restore (cloud_sync.ts) воскресил
    // уже закрытый pending с другого устройства/сессии. Чистим и не отдаём наверх.
    if (await isLeagueResultAlreadyConsumed(repaired)) {
      await AsyncStorage.removeItem(RESULT_KEY).catch(() => {});
      return null;
    }
    return repaired;
  } catch { return null; }
};

export const savePendingResult = async (r: LeagueResult) => {
  try { await AsyncStorage.setItem(RESULT_KEY, JSON.stringify(r)); } catch {}
};

export const clearPendingResult = async () => {
  try {
    const pending = await loadPendingResult();
    if (pending) {
      await AsyncStorage.setItem(RESULT_CONSUMED_SIG_KEY, getLeagueResultSignature(pending));
    }
    await AsyncStorage.removeItem(RESULT_KEY);
  } catch {}
};

/**
 * Отмечает результат как «показанный» СРАЗУ в момент фактического показа модалки
 * (в отличие от clearPendingResult, который хосты вызывают в момент закрытия и
 * фоном, без await). Вызывать в момент рендера/открытия LeagueResultModal, с await —
 * так даже kill приложения сразу после показа (до того как юзер успел закрыть модалку)
 * не приводит к повторному показу при следующем запуске: consumed_sig уже на диске.
 * Идемпотентно и совместимо с clearPendingResult (использует тот же RESULT_CONSUMED_SIG_KEY
 * и формат сигнатуры getLeagueResultSignature).
 */
export const markLeagueResultShown = async (result: LeagueResult): Promise<void> => {
  try {
    await AsyncStorage.setItem(RESULT_CONSUMED_SIG_KEY, getLeagueResultSignature(result));
  } catch {}
};

let _groupCache: { group: GroupMember[]; ts: number } | null = null;
const GROUP_CACHE_TTL = 60_000; // 60 сек

/** Скинути кеш групи (екран клубу / після фокусу), щоб fetchGroupForUser знову пішов у Firestore. */
export const invalidateLeagueGroupCache = () => {
  _groupCache = null;
};

/**
 * Возвращает группу из Firestore. null = remote недоступен / пуст —
 * вызывающий должен решить (использовать предыдущий state, резервную группу и т.д.).
 * Раньше при недоступности возвращалась локальная группа с одним пользователем,
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
  const myUid = await getMyUidSafe();
  if (_groupCache && now - _groupCache.ts < GROUP_CACHE_TTL) {
    return ensureCurrentUserInGroup(_groupCache.group, myName, myWeekPoints, myUid);
  }
  // Пробуем получить реальную группу из Firestore
  const remoteGroup = await getOrCreateLeagueGroup(
    weekId ?? getWeekId(),
    leagueId,
    myName,
    myWeekPoints,
  );
  if (remoteGroup && remoteGroup.length > 0) {
    const repairedRemoteGroup = ensureCurrentUserInGroup(remoteGroup, myName, myWeekPoints, myUid);
    _groupCache = { group: repairedRemoteGroup, ts: Date.now() };
    return repairedRemoteGroup;
  }
  return null;
};

/**
 * Локальная резервная группа (week_leaderboard) для самого первого запуска,
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
    .slice(0, 29)
    .map(e => ({ name: e.name, points: e.points, isMe: false }));
  members.push({ name: myName, points: myWeekPoints, isMe: true });
  return members.sort((a, b) => b.points - a.points);
};

export const submitMyPoints = async (points: number) => {
  // Обновляем очки в реальной группе Firestore (fire-and-forget)
  updateMyGroupPoints(points).catch(() => {});
};

export const calculateResult = (state: LeagueState, myWeekPoints: number): LeagueResult => {
  const normalizedGroup = ensureCurrentUserInGroup(state.group, '', myWeekPoints, null);
  const updated = normalizedGroup
    .map(m => m.isMe ? { ...m, points: myWeekPoints } : m)
    .sort((a, b) => b.points - a.points);

  const total        = updated.length;
  // Если меня нет в группе (findIndex===-1) — НЕЛЬЗЯ ставить 1-е место: Math.max(1, 0) = 1
  // отдавало мне топ-1 + автоматический promotion при reset/гонке. Помечаем как «вне группы»,
  // и hasValidGroup=false ниже отключает promotion/demotion целиком.
  const meIndex      = updated.findIndex(m => m.isMe);
  const myRank       = meIndex >= 0 ? meIndex + 1 : total + 1;
  const meInGroup    = meIndex >= 0;

  // Need at least 2 participants for meaningful ranking AND me present in the group
  const hasValidGroup = total >= 2 && meInGroup;
  const zoneSize     = getLeagueResultZoneSize(total);
  const topCutoff    = hasValidGroup ? zoneSize : 0;
  const bottomCutoff = hasValidGroup ? total - zoneSize + 1 : total + 1;
  const xpPromotionMode = isLeagueXpPromotionEnabled();
  const xpPromotionThreshold = getLeagueXpPromotionThreshold();
  const promoted = xpPromotionMode
    ? myWeekPoints >= xpPromotionThreshold && state.leagueId < CLUBS.length - 1
    : hasValidGroup && myRank <= topCutoff && state.leagueId < CLUBS.length - 1;
  const demoted = xpPromotionMode
    ? false
    : hasValidGroup && myRank >= bottomCutoff && state.leagueId > 0 && !promoted;

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

const getStoredMyPointsFromLeagueState = (
  state: LeagueState,
  myName?: string | null,
  myUid?: string | null,
): number => {
  const group = Array.isArray(state.group) ? state.group : [];
  const me = group[findCurrentMemberIndex(group, myName, myUid)];
  return readMemberPoints(me, 0);
};

type ServerLeagueWeekResult = {
  rank: number;
  total: number;
  promoted: boolean;
  demoted: boolean;
  prevLeagueId: number;
  newLeagueId: number;
  points: number;
};

/**
 * Читает финализированный результат за прошлую неделю из Firestore
 * (записывается leagueFinalizeCron каждый понедельник в 00:05 UTC).
 * Возвращает null если документ ещё не готов или облако недоступно.
 */
const fetchServerLeagueResult = async (
  uid: string,
  weekId: string,
): Promise<ServerLeagueWeekResult | null> => {
  if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) return null;
  try {
    const firestore = require('@react-native-firebase/firestore').default;
    const snap = await firestore()
      .collection('users')
      .doc(uid)
      .collection('league_week_results')
      .doc(weekId)
      .get();
    if (!snap.exists) return null;
    const d = snap.data();
    if (!d || typeof d.rank !== 'number' || typeof d.total !== 'number') return null;
    return d as ServerLeagueWeekResult;
  } catch {
    return null;
  }
};

export const checkLeagueOnAppOpen = async (
  myName: string,
  myWeekPoints: number, // передаём НЕДЕЛЬНЫЕ очки
): Promise<{ needShowResult: boolean; result: LeagueResult | null; state: LeagueState }> => {
  const currentWeekId = getWeekId();
  const myUid = await getMyUidSafe();

  // Batch both reads into a single multiGet
  const [[, pendingRaw], [, stateRaw]] = await AsyncStorage.multiGet([RESULT_KEY, STATE_KEY]);

  let pending: LeagueResult | null = null;
  try { pending = pendingRaw ? JSON.parse(pendingRaw) : null; } catch { pending = null; }

  let state: LeagueState | null = null;
  try { state = stateRaw ? JSON.parse(stateRaw) : null; } catch { state = null; }
  rememberLeagueStateSnapshot(state);

  if (pending) {
    const safePending = await repairPendingResultForCurrentUser(pending, myName, myUid);
    await AsyncStorage.setItem(RESULT_KEY, JSON.stringify(safePending)).catch(() => {});
    const fallbackState = state ? {
      ...state,
      leagueId: safePending.newLeagueId,
    } : {
      leagueId: safePending.newLeagueId,
      weekId: currentWeekId,
      group: safePending.group,
    };
    if (state && state.leagueId !== safePending.newLeagueId) {
      await saveLeagueState(fallbackState).catch(() => {});
    } else {
      rememberLeagueStateSnapshot(fallbackState);
    }
    // Латч: pending с этой сигнатурой уже был показан/подтверждён ранее (обычно —
    // cloud restore воскресил запись, уже закрытую на этом же или другом устройстве).
    // Чистим best-effort и говорим хосту «показывать нечего».
    if (await isLeagueResultAlreadyConsumed(safePending)) {
      await AsyncStorage.removeItem(RESULT_KEY).catch(() => {});
      return { needShowResult: false, result: null, state: fallbackState };
    }
    return { needShowResult: true, result: safePending, state: fallbackState };
  }

  // Первый запуск — state ещё нет, нужно показать хоть что-то
  if (!state) {
    const remote = await fetchGroupForUser(0, myName, myWeekPoints);
    const group = remote ?? (await buildLocalFallbackGroup(myName, myWeekPoints));
    state = { leagueId: 0, weekId: currentWeekId, group };
    // Записываем в стабильный state только если получили реальную группу из Firestore.
    // Иначе локальная группа (1 человек) затрёт настоящих участников при следующем открытии.
    if (remote) await saveLeagueState(state);
    else rememberLeagueStateSnapshot(state);
    return { needShowResult: false, result: null, state };
  }

  // Новая неделя — считаем итоги
  if (currentWeekId !== state.weekId) {
    const storedMyPoints = getStoredMyPointsFromLeagueState(state, myName, myUid);
    const rolloverGroup = ensureCurrentUserInGroup(state.group, myName, storedMyPoints, myUid, 'stored-points');

    // Предпочитаем серверный результат (leagueFinalizeCron) — он авторитетен,
    // потому что считался по реальным очкам всех участников, а не по кэшу клиента.
    let result: LeagueResult;
    const serverResult = myUid ? await fetchServerLeagueResult(myUid, state.weekId) : null;
    if (serverResult) {
      result = {
        prevLeagueId: serverResult.prevLeagueId,
        newLeagueId: serverResult.newLeagueId,
        myRank: serverResult.rank,
        totalInGroup: serverResult.total,
        promoted: serverResult.promoted,
        demoted: serverResult.demoted,
        group: rolloverGroup,
      };
    } else {
      result = calculateResult({ ...state, group: rolloverGroup }, storedMyPoints);
    }
    await savePendingResult(result);

    // КРИТИЧНО: state.weekId надо двинуть на новую неделю СРАЗУ, иначе при сбое
    // remote следующий вызов checkLeagueOnAppOpen опять попадёт в эту ветку и
    // снова сгенерирует pending — модалка будет «отказываться закрываться»,
    // потому что сразу после close → loadData → новый pending. Группу не
    // затираем (оставляем старую как резерв), её обновит remote ниже если ок.
    await saveLeagueState({
      leagueId: result.newLeagueId,
      weekId:   currentWeekId,
      group:    rolloverGroup,
    });

    const remote = await fetchGroupForUser(result.newLeagueId, myName, 0);
    const finalGroup = remote ?? rolloverGroup;
    const newState: LeagueState = {
      leagueId: result.newLeagueId,
      weekId:   currentWeekId,
      group:    finalGroup,
    };
    if (remote) await saveLeagueState(newState);
    else rememberLeagueStateSnapshot(newState);
    // Латч на всякий случай: если только что вычисленный результат совпал по сигнатуре
    // с уже потреблённым (например, повторный вызов до того как state.weekId долетел до
    // диска) — не показываем повторно.
    if (await isLeagueResultAlreadyConsumed(result)) {
      await AsyncStorage.removeItem(RESULT_KEY).catch(() => {});
      return { needShowResult: false, result: null, state: newState };
    }
    return { needShowResult: true, result, state: newState };
  }

  // Та же неделя — обновляем группу из Firestore (свежие данные всех участников).
  // Если remote недоступен — НЕ переписываем state.group (там могут быть реальные
  // участники, загруженные ранее), только обновляем мои очки.
  const freshGroup = await fetchGroupForUser(state.leagueId, myName, myWeekPoints, currentWeekId);
  const updatedGroup = freshGroup ?? ensureCurrentUserInGroup(state.group, myName, myWeekPoints, myUid)
    .sort((a, b) => b.points - a.points);

  const updatedState = { ...state, group: updatedGroup };
  // Сохраняем только если remote отдал данные — иначе оставляем предыдущий state
  // как был (включая прошлый список участников, чтобы не терять их при разовом сбое).
  if (freshGroup) await saveLeagueState(updatedState);
  else rememberLeagueStateSnapshot(updatedState);
  return { needShowResult: false, result: null, state: updatedState };
};

export default {};
