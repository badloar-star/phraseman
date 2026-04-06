// ═══ АВАТАРЫ И РАМКИ ═══════════════════════════════════════════════════════
// Firebase-ready: все данные сериализуем через JSON
// AsyncStorage keys: 'user_avatar' (emoji), 'user_frame' (frame id)

export type FrameAnimation =
  | 'plain'
  | 'sprout'        // lvl3:  дышащее кольцо + тихая волна
  | 'arc'           // lvl7:  два кольца навстречу + искры
  | 'ice'           // lvl10: ледяные иглы + shimmer
  | 'plasma'        // lvl13: дрожащее кольцо + узлы тока
  | 'magnet'        // lvl16: силовые линии поля
  | 'vortex'        // lvl20: частицы с хвостами по орбите
  | 'dna'           // lvl23: двойная ДНК спираль (1 нить)
  | 'runes'         // lvl26: руны по кольцу
  | 'gold_crown'    // lvl30: солнечные лучи + точки
  | 'atom'          // lvl30/club: атом с эллиптическими орбитами
  | 'web'           // lvl33: паутина / звезда (пентаграмма)
  | 'hex'           // lvl36: гексагональная сетка
  | 'geometry'      // lvl40: фрактальная геометрия (треугольник+квадрат+пятиугольник)
  | 'neural'        // lvl43: нейронная сеть
  | 'aurora_star'   // lvl46: звезда Давида (два треугольника)
  | 'crystal'       // lvl48: кристалл (три квадрата)
  | 'triple_dna'    // lvl50: тройная ДНК + rainbow
  | 'pulsar'        // club2: точка бежит по кольцу со следом
  | 'double_dna'    // club7/ach: двойная ДНК
  | 'double_square' // club8: двойной квадрат серебряный
  | 'triple_tri'    // club9: тройной треугольник
  | 'solar_cycle'   // ach: солнечный цикл (12 точек-месяцев)
  | 'arc_red'       // ach: красная дуга (непобедимый)
  | 'rainbow_dna';  // ach: радужная тройная ДНК (XP легенда)

export type FrameUnlockType = 'level' | 'achievement' | 'club';

export interface FrameDef {
  id: string;
  nameRU: string;
  nameUK: string;
  color: string;
  color2: string;
  animation: FrameAnimation;
  unlockLevel: number;
  unlockType?: FrameUnlockType;
  unlockAchievementId?: string;
  unlockAchievementNameRU?: string;
  unlockAchievementNameUK?: string;
  unlockClubId?: number;
  unlockClubNameRU?: string;
  unlockClubNameUK?: string;
}

export interface AvatarDef {
  image: string;
  unlockLevel: number;
}

// ── Аватарки ──────────────────────────────────────────────────────────────────
export const AVATARS: AvatarDef[] = [
  { image: require('../assets/images/levels/1.png'),  unlockLevel: 1  },
  { image: require('../assets/images/levels/2.png'),  unlockLevel: 2  },
  { image: require('../assets/images/levels/3.png'),  unlockLevel: 3  },
  { image: require('../assets/images/levels/4.png'),  unlockLevel: 4  },
  { image: require('../assets/images/levels/5.png'),  unlockLevel: 5  },
  { image: require('../assets/images/levels/6.png'),  unlockLevel: 6  },
  { image: require('../assets/images/levels/7.png'),  unlockLevel: 7  },
  { image: require('../assets/images/levels/8.png'),  unlockLevel: 8  },
  { image: require('../assets/images/levels/9.png'),  unlockLevel: 9  },
  { image: require('../assets/images/levels/10.png'), unlockLevel: 10 },
  { image: require('../assets/images/levels/11.png'), unlockLevel: 11 },
  { image: require('../assets/images/levels/12.png'), unlockLevel: 12 },
  { image: require('../assets/images/levels/13.png'), unlockLevel: 13 },
  { image: require('../assets/images/levels/14.png'), unlockLevel: 14 },
  { image: require('../assets/images/levels/15.png'), unlockLevel: 15 },
  { image: require('../assets/images/levels/16.png'), unlockLevel: 16 },
  { image: require('../assets/images/levels/17.png'), unlockLevel: 17 },
  { image: require('../assets/images/levels/18.png'), unlockLevel: 18 },
  { image: require('../assets/images/levels/19.png'), unlockLevel: 19 },
  { image: require('../assets/images/levels/20.png'), unlockLevel: 20 },
  { image: require('../assets/images/levels/21.png'), unlockLevel: 21 },
  { image: require('../assets/images/levels/22.png'), unlockLevel: 22 },
  { image: require('../assets/images/levels/23.png'), unlockLevel: 23 },
  { image: require('../assets/images/levels/24.png'), unlockLevel: 24 },
  { image: require('../assets/images/levels/25.png'), unlockLevel: 25 },
  { image: require('../assets/images/levels/26.png'), unlockLevel: 26 },
  { image: require('../assets/images/levels/27.png'), unlockLevel: 27 },
  { image: require('../assets/images/levels/28.png'), unlockLevel: 28 },
  { image: require('../assets/images/levels/29.png'), unlockLevel: 29 },
  { image: require('../assets/images/levels/30.png'), unlockLevel: 30 },
  { image: require('../assets/images/levels/31.png'), unlockLevel: 31 },
  { image: require('../assets/images/levels/32.png'), unlockLevel: 32 },
  { image: require('../assets/images/levels/33.png'), unlockLevel: 33 },
  { image: require('../assets/images/levels/34.png'), unlockLevel: 34 },
  { image: require('../assets/images/levels/36.png'), unlockLevel: 36 },
  { image: require('../assets/images/levels/37.png'), unlockLevel: 37 },
  { image: require('../assets/images/levels/38.png'), unlockLevel: 38 },
  { image: require('../assets/images/levels/39.png'), unlockLevel: 39 },
  { image: require('../assets/images/levels/40.png'), unlockLevel: 40 },
  { image: require('../assets/images/levels/41.png'), unlockLevel: 41 },
  { image: require('../assets/images/levels/42.png'), unlockLevel: 42 },
  { image: require('../assets/images/levels/43.png'), unlockLevel: 43 },
  { image: require('../assets/images/levels/44.png'), unlockLevel: 44 },
  { image: require('../assets/images/levels/45.png'), unlockLevel: 45 },
  { image: require('../assets/images/levels/46.png'), unlockLevel: 46 },
  { image: require('../assets/images/levels/47.png'), unlockLevel: 47 },
  { image: require('../assets/images/levels/48.png'), unlockLevel: 48 },
  { image: require('../assets/images/levels/49.png'), unlockLevel: 49 },
  { image: require('../assets/images/levels/50.png'), unlockLevel: 50 },
];

// ── Рамки по уровням ──────────────────────────────────────────────────────────
export const FRAMES: FrameDef[] = [
  {
    id: 'plain',
    nameRU: 'Простая',       nameUK: 'Проста',
    color: '#888888',        color2: '#555555',
    animation: 'plain',      unlockLevel: 1,
  },
  {
    id: 'sprout',
    nameRU: 'Росток',        nameUK: 'Паросток',
    color: '#47C870',        color2: '#1a7a3a',
    animation: 'sprout',     unlockLevel: 3,
  },
  {
    id: 'arc',
    nameRU: 'Дуга',          nameUK: 'Дуга',
    color: '#E8320A',        color2: '#FFD700',
    animation: 'arc',        unlockLevel: 7,
  },
  {
    id: 'ice',
    nameRU: 'Лёд',           nameUK: 'Лід',
    color: '#7DD8F8',        color2: '#0288D1',
    animation: 'ice',        unlockLevel: 10,
  },
  {
    id: 'plasma',
    nameRU: 'Плазма',        nameUK: 'Плазма',
    color: '#FFD700',        color2: '#FFA500',
    animation: 'plasma',     unlockLevel: 13,
  },
  {
    id: 'magnet',
    nameRU: 'Магнетизм',     nameUK: 'Магнетизм',
    color: '#00C8FF',        color2: '#0055DD',
    animation: 'magnet',     unlockLevel: 16,
  },
  {
    id: 'vortex',
    nameRU: 'Вихрь',         nameUK: 'Вихор',
    color: '#B044FF',        color2: '#7B2FBE',
    animation: 'vortex',     unlockLevel: 20,
  },
  {
    id: 'dna',
    nameRU: 'Спираль',       nameUK: 'Спіраль',
    color: '#00DDFF',        color2: '#AA44FF',
    animation: 'dna',        unlockLevel: 23,
  },
  {
    id: 'runes',
    nameRU: 'Руны',          nameUK: 'Руни',
    color: '#BB66FF',        color2: '#7722CC',
    animation: 'runes',      unlockLevel: 26,
  },
  {
    id: 'gold_crown',
    nameRU: 'Золотой атом',  nameUK: 'Золотий атом',
    color: '#FFD700',        color2: '#FF8C00',
    animation: 'atom',       unlockLevel: 30,
  },
  {
    id: 'web',
    nameRU: 'Паутина',       nameUK: 'Павутина',
    color: '#A855F7',        color2: '#6D28D9',
    animation: 'web',        unlockLevel: 33,
  },
  {
    id: 'hex',
    nameRU: 'Гексагон',      nameUK: 'Гексагон',
    color: '#FF4500',        color2: '#8B1A00',
    animation: 'hex',        unlockLevel: 36,
  },
  {
    id: 'geometry',
    nameRU: 'Геометрия',     nameUK: 'Геометрія',
    color: '#B9F2FF',        color2: '#0097A7',
    animation: 'geometry',   unlockLevel: 40,
  },
  {
    id: 'neural',
    nameRU: 'Нейросеть',     nameUK: 'Нейромережа',
    color: '#00FF88',        color2: '#00CC66',
    animation: 'neural',     unlockLevel: 43,
  },
  {
    id: 'aurora_star',
    nameRU: 'Аврора',        nameUK: 'Аврора',
    color: '#00BFA5',        color2: '#7B1FA2',
    animation: 'aurora_star', unlockLevel: 46,
  },
  {
    id: 'crystal',
    nameRU: 'Кристалл',      nameUK: 'Кристал',
    color: '#E0F7FA',        color2: '#0097A7',
    animation: 'crystal',    unlockLevel: 48,
  },
  {
    id: 'legendary',
    nameRU: 'Легенда',       nameUK: 'Легенда',
    color: '#00DDFF',        color2: '#AA44FF',
    animation: 'triple_dna', unlockLevel: 50,
  },

  // ── Рамки за достижения ───────────────────────────────────────────────────
  {
    id: 'ach_streak365',
    nameRU: 'Хранитель года',   nameUK: 'Охоронець року',
    color: '#FF8C00',           color2: '#FFD700',
    animation: 'solar_cycle',   unlockLevel: 0,
    unlockType: 'achievement',
    unlockAchievementId: 'streak_365',
    unlockAchievementNameRU: 'Целый год',
    unlockAchievementNameUK: 'Цілий рік',
  },
  {
    id: 'ach_streak500',
    nameRU: '500 дней',         nameUK: '500 днів',
    color: '#FFD700',           color2: '#FF4500',
    animation: 'double_dna',    unlockLevel: 0,
    unlockType: 'achievement',
    unlockAchievementId: 'streak_500',
    unlockAchievementNameRU: '500 дней',
    unlockAchievementNameUK: '500 днів',
  },
  {
    id: 'ach_lesson_absolute',
    nameRU: 'Абсолют',          nameUK: 'Абсолют',
    color: '#F0F8FF',           color2: '#7BBCDC',
    animation: 'crystal',       unlockLevel: 0,
    unlockType: 'achievement',
    unlockAchievementId: 'lesson_all_perfect',
    unlockAchievementNameRU: 'Абсолют',
    unlockAchievementNameUK: 'Абсолют',
  },
  {
    id: 'ach_combo100',
    nameRU: 'Непобедимый',      nameUK: 'Непереможний',
    color: '#FF1060',           color2: '#AA0033',
    animation: 'arc_red',       unlockLevel: 0,
    unlockType: 'achievement',
    unlockAchievementId: 'combo_100',
    unlockAchievementNameRU: 'Непобедимый',
    unlockAchievementNameUK: 'Непереможний',
  },
  {
    id: 'ach_xp100k',
    nameRU: 'XP Легенда',       nameUK: 'XP Легенда',
    color: '#FFD700',           color2: '#FF8C00',
    animation: 'rainbow_dna',   unlockLevel: 0,
    unlockType: 'achievement',
    unlockAchievementId: 'xp_100000',
    unlockAchievementNameRU: 'Легенда',
    unlockAchievementNameUK: 'Легенда',
  },
  {
    id: 'ach_quiz_god',
    nameRU: 'Квиз-Бог',         nameUK: 'Квіз-Бог',
    color: '#A855F7',           color2: '#E879F9',
    animation: 'neural',        unlockLevel: 0,
    unlockType: 'achievement',
    unlockAchievementId: 'quiz_triple_perfect',
    unlockAchievementNameRU: 'Трижды идеал',
    unlockAchievementNameUK: 'Тричі ідеал',
  },

  // ── Клубные рамки ─────────────────────────────────────────────────────────
  {
    id: 'club_initiator',
    nameRU: 'Инициатор',        nameUK: 'Ініціатор',
    color: '#7B9BB5',           color2: '#4A6B85',
    animation: 'sprout',        unlockLevel: 0,
    unlockType: 'club',         unlockClubId: 0,
    unlockClubNameRU: 'Клуб Инициаторов', unlockClubNameUK: 'Клуб Ініціаторів',
  },
  {
    id: 'club_adept',
    nameRU: 'Адепт',            nameUK: 'Адепт',
    color: '#5BA88B',           color2: '#2E7A5F',
    animation: 'arc',           unlockLevel: 0,
    unlockType: 'club',         unlockClubId: 1,
    unlockClubNameRU: 'Клуб Адептов', unlockClubNameUK: 'Клуб Адептів',
  },
  {
    id: 'club_seeker',
    nameRU: 'Искатель',         nameUK: 'Шукач',
    color: '#4A90D9',           color2: '#1A6AAA',
    animation: 'pulsar',        unlockLevel: 0,
    unlockType: 'club',         unlockClubId: 2,
    unlockClubNameRU: 'Клуб Искателей', unlockClubNameUK: 'Клуб Шукачів',
  },
  {
    id: 'club_practitioner',
    nameRU: 'Практик',          nameUK: 'Практик',
    color: '#7BA84A',           color2: '#4A7020',
    animation: 'web',           unlockLevel: 0,
    unlockType: 'club',         unlockClubId: 3,
    unlockClubNameRU: 'Клуб Практиков', unlockClubNameUK: 'Клуб Практиків',
  },
  {
    id: 'club_analyst',
    nameRU: 'Аналитик',         nameUK: 'Аналітик',
    color: '#C8A84A',           color2: '#8A6800',
    animation: 'geometry',      unlockLevel: 0,
    unlockType: 'club',         unlockClubId: 4,
    unlockClubNameRU: 'Клуб Аналитиков', unlockClubNameUK: 'Клуб Аналітиків',
  },
  {
    id: 'club_erudite',
    nameRU: 'Эрудит',           nameUK: 'Ерудит',
    color: '#CD7F32',           color2: '#7A3D00',
    animation: 'hex',           unlockLevel: 0,
    unlockType: 'club',         unlockClubId: 5,
    unlockClubNameRU: 'Клуб Эрудитов', unlockClubNameUK: 'Клуб Ерудитів',
  },
  {
    id: 'club_connoisseur',
    nameRU: 'Знаток',           nameUK: 'Знавець',
    color: '#4A90D9',           color2: '#1A4A80',
    animation: 'dna',           unlockLevel: 0,
    unlockType: 'club',         unlockClubId: 6,
    unlockClubNameRU: 'Клуб Знатоков', unlockClubNameUK: 'Клуб Знавців',
  },
  {
    id: 'club_expert',
    nameRU: 'Эксперт',          nameUK: 'Експерт',
    color: '#9B59B6',           color2: '#5B0090',
    animation: 'double_dna',    unlockLevel: 0,
    unlockType: 'club',         unlockClubId: 7,
    unlockClubNameRU: 'Клуб Экспертов', unlockClubNameUK: 'Клуб Експертів',
  },
  {
    id: 'club_magister',
    nameRU: 'Магистр',          nameUK: 'Магістр',
    color: '#C8D4DC',           color2: '#6A7E8E',
    animation: 'double_square', unlockLevel: 0,
    unlockType: 'club',         unlockClubId: 8,
    unlockClubNameRU: 'Клуб Магистров', unlockClubNameUK: 'Клуб Магістрів',
  },
  {
    id: 'club_thinker',
    nameRU: 'Мыслитель',        nameUK: 'Мислитель',
    color: '#E87E30',           color2: '#8A3A00',
    animation: 'triple_tri',    unlockLevel: 0,
    unlockType: 'club',         unlockClubId: 9,
    unlockClubNameRU: 'Клуб Мыслителей', unlockClubNameUK: 'Клуб Мислителів',
  },
  {
    id: 'club_master',
    nameRU: 'Мастер',           nameUK: 'Майстер',
    color: '#D4A017',           color2: '#7A4A00',
    animation: 'aurora_star',   unlockLevel: 0,
    unlockType: 'club',         unlockClubId: 10,
    unlockClubNameRU: 'Клуб Мастеров', unlockClubNameUK: 'Клуб Майстрів',
  },
  {
    id: 'club_professor',
    nameRU: 'Профессор',        nameUK: 'Професор',
    color: '#FFD700',           color2: '#FF8C00',
    animation: 'triple_dna',    unlockLevel: 0,
    unlockType: 'club',         unlockClubId: 11,
    unlockClubNameRU: 'Клуб Профессоров', unlockClubNameUK: 'Клуб Професорів',
  },
];

// ── Хелперы ────────────────────────────────────────────────────────────────────
export const getFrameById = (id: string): FrameDef =>
  FRAMES.find(f => f.id === id) ?? FRAMES[0];

export const getBestFrameForLevel = (level: number): FrameDef => {
  const unlocked = FRAMES.filter(f => f.unlockLevel <= level);
  return unlocked[unlocked.length - 1] ?? FRAMES[0];
};

export const getBestAvatarForLevel = (level: number): string =>
  String(Math.max(1, Math.min(50, level)));

export const getAvatarByIndex = (index: number): AvatarDef | undefined => {
  if (index < 1 || index > AVATARS.length) return undefined;
  return AVATARS[index - 1];
};

export const getAvatarImageByIndex = (index: number): any | undefined => {
  const avatar = getAvatarByIndex(index);
  return avatar?.image;
};

// ── Боты ──────────────────────────────────────────────────────────────────────
export const botLevelFromBase = (weekBase: number): number => {
  if (weekBase >= 180) return 42;
  if (weekBase >= 140) return 36;
  if (weekBase >= 110) return 30;
  if (weekBase >= 80)  return 24;
  if (weekBase >= 55)  return 18;
  if (weekBase >= 35)  return 13;
  if (weekBase >= 20)  return 9;
  if (weekBase >= 10)  return 5;
  return 2;
};

const APP_EPOCH_MS = new Date('2026-01-01').getTime();
export const getBotCurrentLevel = (weekBase: number, botName: string): number => {
  const weeksSinceEpoch = Math.max(0, Math.floor((Date.now() - APP_EPOCH_MS) / (7 * 24 * 60 * 60 * 1000)));
  const baseLevel = botLevelFromBase(weekBase);
  const growthRate = weekBase >= 150 ? 0.8 : weekBase >= 80 ? 0.5 : weekBase >= 30 ? 0.25 : 0.1;
  return Math.min(50, baseLevel + Math.floor(weeksSinceEpoch * growthRate));
};

export interface BotAvatarData {
  emoji: string;
  frameId: string;
  level: number;
}

export const getBotAvatarData = (botName: string, weekBase: number): BotAvatarData => {
  const level = getBotCurrentLevel(weekBase, botName);
  const frame = getBestFrameForLevel(level);
  return { emoji: getBestAvatarForLevel(level), frameId: frame.id, level };
};

import AsyncStorage from '@react-native-async-storage/async-storage';

export const unlockAllFrames = async (): Promise<void> => {
  try {
    const unlockedFrameIds = FRAMES.map(f => f.id);
    await AsyncStorage.setItem('unlocked_frames', JSON.stringify(unlockedFrameIds));
  } catch (err) {
    console.error('Error unlocking all frames:', err);
  }
};

export const getUnlockedFrames = async (): Promise<string[]> => {
  try {
    const data = await AsyncStorage.getItem('unlocked_frames');
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};
