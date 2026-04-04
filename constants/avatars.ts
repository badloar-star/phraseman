// ─── АВАТАРКИ И РАМКИ ───────────────────────────────────────────────────────
// Firebase-ready: все данные сериализуемы через JSON
// AsyncStorage keys: 'user_avatar' (emoji), 'user_frame' (frame id)

export type FrameAnimation = 'plain' | 'pulse' | 'breathe' | 'heartbeat' | 'float' | 'wave' | 'spin' | 'orbit' | 'rainbow';
export type FrameUnlockType = 'level' | 'achievement' | 'club';

export interface FrameDef {
  id: string;
  nameRU: string;
  nameUK: string;
  color: string;
  color2: string;
  animation: FrameAnimation;
  unlockLevel: number;
  // тип разблокировки (по умолчанию 'level')
  unlockType?: FrameUnlockType;
  // для unlockType === 'achievement'
  unlockAchievementId?: string;
  unlockAchievementNameRU?: string;
  unlockAchievementNameUK?: string;
  // для unlockType === 'club' (доступна только пока состоишь в клубе)
  unlockClubId?: number;
  unlockClubNameRU?: string;
  unlockClubNameUK?: string;
}

export interface AvatarDef {
  image: string; // path to PNG file in assets/images/levels/
  unlockLevel: number;
}

// ── Аватарки — разблокируются по уровню ────────────────────────────────────
export const AVATARS: AvatarDef[] = [
  // Уровни 1–50 — используют PNG изображения из assets/images/levels/
  { image: require('../assets/images/levels/1.png'), unlockLevel: 1 },
  { image: require('../assets/images/levels/2.png'), unlockLevel: 2 },
  { image: require('../assets/images/levels/3.png'), unlockLevel: 3 },
  { image: require('../assets/images/levels/4.png'), unlockLevel: 4 },
  { image: require('../assets/images/levels/5.png'), unlockLevel: 5 },
  { image: require('../assets/images/levels/6.png'), unlockLevel: 6 },
  { image: require('../assets/images/levels/7.png'), unlockLevel: 7 },
  { image: require('../assets/images/levels/8.png'), unlockLevel: 8 },
  { image: require('../assets/images/levels/9.png'), unlockLevel: 9 },
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
  // { image: require('../assets/images/levels/35.png'), unlockLevel: 35 }, // MISSING FILE - use fallback
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

// ── Рамки — 17 штук, все анимированные ──────────────────────────────────────
export const FRAMES: FrameDef[] = [
  {
    id: 'plain',
    nameRU: 'Простая',    nameUK: 'Проста',
    color: '#888888',     color2: '#555555',
    animation: 'plain',   unlockLevel: 1,
  },
  {
    id: 'glow_green',
    nameRU: 'Зелёное свечение', nameUK: 'Зелене сяйво',
    color: '#47C870',     color2: '#1a7a3a',
    animation: 'pulse',   unlockLevel: 3,
  },
  {
    id: 'fire',
    nameRU: 'Огонь',      nameUK: 'Вогонь',
    color: '#FF6B35',     color2: '#FF0000',
    animation: 'pulse',   unlockLevel: 7,
  },
  {
    id: 'ice',
    nameRU: 'Лёд',        nameUK: 'Лід',
    color: '#4FC3F7',     color2: '#0288D1',
    animation: 'breathe', unlockLevel: 10,
  },
  {
    id: 'lightning',
    nameRU: 'Молния',       nameUK: 'Блискавка',
    color: '#FFD700',       color2: '#FFA500',
    animation: 'heartbeat', unlockLevel: 13,
  },
  {
    id: 'nature',
    nameRU: 'Природа',    nameUK: 'Природа',
    color: '#4CAF50',     color2: '#81C784',
    animation: 'breathe', unlockLevel: 16,
  },
  {
    id: 'neon_lime',
    nameRU: 'Волна',      nameUK: 'Хвиля',
    color: '#C8FF00',     color2: '#7A9900',
    animation: 'wave',    unlockLevel: 20,
  },
  {
    id: 'neon_pink',
    nameRU: 'Орбита',     nameUK: 'Орбіта',
    color: '#FF006E',     color2: '#FF69B4',
    animation: 'orbit',   unlockLevel: 23,
  },
  {
    id: 'neon_cyan',
    nameRU: 'Парение',    nameUK: 'Ширяння',
    color: '#00F5FF',     color2: '#007A80',
    animation: 'float',   unlockLevel: 26,
  },
  {
    id: 'gold',
    nameRU: 'Золото',     nameUK: 'Золото',
    color: '#FFC800',     color2: '#FF8C00',
    animation: 'pulse',   unlockLevel: 30,
  },
  {
    id: 'neon_violet',
    nameRU: 'Фиолет',       nameUK: 'Фіолет',
    color: '#A855F7',       color2: '#6D28D9',
    animation: 'heartbeat', unlockLevel: 33,
  },
  {
    id: 'lava',
    nameRU: 'Лава',       nameUK: 'Лава',
    color: '#FF4500',     color2: '#8B0000',
    animation: 'pulse',   unlockLevel: 36,
  },
  {
    id: 'diamond',
    nameRU: 'Бриллиант',  nameUK: 'Діамант',
    color: '#B9F2FF',     color2: '#00BCD4',
    animation: 'breathe', unlockLevel: 40,
  },
  {
    id: 'galaxy',
    nameRU: 'Галактика',  nameUK: 'Галактика',
    color: '#7B2FBE',     color2: '#E040FB',
    animation: 'spin',    unlockLevel: 43,
  },
  {
    id: 'aurora',
    nameRU: 'Аврора',     nameUK: 'Аврора',
    color: '#00BFA5',     color2: '#7B1FA2',
    animation: 'pulse',   unlockLevel: 46,
  },
  {
    id: 'crystal',
    nameRU: 'Кристалл',   nameUK: 'Кристал',
    color: '#E0F7FA',     color2: '#0097A7',
    animation: 'spin',    unlockLevel: 48,
  },
  {
    id: 'legendary',
    nameRU: 'Легендарная', nameUK: 'Легендарна',
    color: '#FFD700',     color2: '#FF006E',
    animation: 'rainbow', unlockLevel: 50,
  },

  // ── Рамки за достижения (разблокируются при открытии достижения) ─────────────
  {
    id: 'ach_streak365',
    nameRU: 'Хранитель года',  nameUK: 'Охоронець року',
    color: '#FF8C00',           color2: '#FF006E',
    animation: 'rainbow',       unlockLevel: 0,
    unlockType: 'achievement',
    unlockAchievementId: 'streak_365',
    unlockAchievementNameRU: 'Целый год',
    unlockAchievementNameUK: 'Цілий рік',
  },
  {
    id: 'ach_streak500',
    nameRU: '500 дней',         nameUK: '500 днів',
    color: '#FFD700',           color2: '#FF4500',
    animation: 'orbit',         unlockLevel: 0,
    unlockType: 'achievement',
    unlockAchievementId: 'streak_500',
    unlockAchievementNameRU: '500 дней',
    unlockAchievementNameUK: '500 днів',
  },
  {
    id: 'ach_lesson_absolute',
    nameRU: 'Абсолют',          nameUK: 'Абсолют',
    color: '#E0F7FA',           color2: '#7B2FBE',
    animation: 'spin',          unlockLevel: 0,
    unlockType: 'achievement',
    unlockAchievementId: 'lesson_all_perfect',
    unlockAchievementNameRU: 'Абсолют',
    unlockAchievementNameUK: 'Абсолют',
  },
  {
    id: 'ach_combo100',
    nameRU: 'Непобедимый',      nameUK: 'Непереможний',
    color: '#FF006E',           color2: '#FF6B35',
    animation: 'heartbeat',     unlockLevel: 0,
    unlockType: 'achievement',
    unlockAchievementId: 'combo_100',
    unlockAchievementNameRU: 'Непобедимый',
    unlockAchievementNameUK: 'Непереможний',
  },
  {
    id: 'ach_xp100k',
    nameRU: 'XP Легенда',       nameUK: 'XP Легенда',
    color: '#FFD700',           color2: '#FF8C00',
    animation: 'rainbow',       unlockLevel: 0,
    unlockType: 'achievement',
    unlockAchievementId: 'xp_100000',
    unlockAchievementNameRU: 'Легенда',
    unlockAchievementNameUK: 'Легенда',
  },
  {
    id: 'ach_quiz_god',
    nameRU: 'Квиз-Бог',         nameUK: 'Квіз-Бог',
    color: '#A855F7',           color2: '#00F5FF',
    animation: 'orbit',         unlockLevel: 0,
    unlockType: 'achievement',
    unlockAchievementId: 'quiz_triple_perfect',
    unlockAchievementNameRU: 'Трижды идеал',
    unlockAchievementNameUK: 'Тричі ідеал',
  },

  // ── Клубные рамки (доступны только пока ты член клуба) ───────────────────────
  {
    id: 'club_initiator',
    nameRU: 'Инициатор',        nameUK: 'Ініціатор',
    color: '#7B9BB5',           color2: '#4A6B85',
    animation: 'breathe',       unlockLevel: 0,
    unlockType: 'club',         unlockClubId: 0,
    unlockClubNameRU: 'Клуб Инициаторов', unlockClubNameUK: 'Клуб Ініціаторів',
  },
  {
    id: 'club_adept',
    nameRU: 'Адепт',            nameUK: 'Адепт',
    color: '#5BA88B',           color2: '#2E7A5F',
    animation: 'pulse',         unlockLevel: 0,
    unlockType: 'club',         unlockClubId: 1,
    unlockClubNameRU: 'Клуб Адептов', unlockClubNameUK: 'Клуб Адептів',
  },
  {
    id: 'club_seeker',
    nameRU: 'Искатель',         nameUK: 'Шукач',
    color: '#4A90A4',           color2: '#1E6070',
    animation: 'float',         unlockLevel: 0,
    unlockType: 'club',         unlockClubId: 2,
    unlockClubNameRU: 'Клуб Искателей', unlockClubNameUK: 'Клуб Шукачів',
  },
  {
    id: 'club_practitioner',
    nameRU: 'Практик',          nameUK: 'Практик',
    color: '#7BA84A',           color2: '#4A7020',
    animation: 'breathe',       unlockLevel: 0,
    unlockType: 'club',         unlockClubId: 3,
    unlockClubNameRU: 'Клуб Практиков', unlockClubNameUK: 'Клуб Практиків',
  },
  {
    id: 'club_analyst',
    nameRU: 'Аналитик',         nameUK: 'Аналітик',
    color: '#C8A84A',           color2: '#8A6800',
    animation: 'heartbeat',     unlockLevel: 0,
    unlockType: 'club',         unlockClubId: 4,
    unlockClubNameRU: 'Клуб Аналитиков', unlockClubNameUK: 'Клуб Аналітиків',
  },
  {
    id: 'club_erudite',
    nameRU: 'Эрудит',           nameUK: 'Ерудит',
    color: '#CD7F32',           color2: '#7A3D00',
    animation: 'wave',          unlockLevel: 0,
    unlockType: 'club',         unlockClubId: 5,
    unlockClubNameRU: 'Клуб Эрудитов', unlockClubNameUK: 'Клуб Ерудитів',
  },
  {
    id: 'club_connoisseur',
    nameRU: 'Знаток',           nameUK: 'Знавець',
    color: '#4A90D9',           color2: '#1A4A80',
    animation: 'orbit',         unlockLevel: 0,
    unlockType: 'club',         unlockClubId: 6,
    unlockClubNameRU: 'Клуб Знатоков', unlockClubNameUK: 'Клуб Знавців',
  },
  {
    id: 'club_expert',
    nameRU: 'Эксперт',          nameUK: 'Эксперт',
    color: '#9B59B6',           color2: '#5B0090',
    animation: 'pulse',         unlockLevel: 0,
    unlockType: 'club',         unlockClubId: 7,
    unlockClubNameRU: 'Клуб Экспертов', unlockClubNameUK: 'Клуб Експертів',
  },
  {
    id: 'club_magister',
    nameRU: 'Магистр',          nameUK: 'Магістр',
    color: '#A8B4C0',           color2: '#5A6870',
    animation: 'breathe',       unlockLevel: 0,
    unlockType: 'club',         unlockClubId: 8,
    unlockClubNameRU: 'Клуб Магистров', unlockClubNameUK: 'Клуб Магістрів',
  },
  {
    id: 'club_thinker',
    nameRU: 'Мыслитель',        nameUK: 'Мислитель',
    color: '#E87E30',           color2: '#8A3A00',
    animation: 'float',         unlockLevel: 0,
    unlockType: 'club',         unlockClubId: 9,
    unlockClubNameRU: 'Клуб Мыслителей', unlockClubNameUK: 'Клуб Мислителів',
  },
  {
    id: 'club_master',
    nameRU: 'Мастер',           nameUK: 'Майстер',
    color: '#D4A017',           color2: '#7A4A00',
    animation: 'spin',          unlockLevel: 0,
    unlockType: 'club',         unlockClubId: 10,
    unlockClubNameRU: 'Клуб Мастеров', unlockClubNameUK: 'Клуб Майстрів',
  },
  {
    id: 'club_professor',
    nameRU: 'Профессор',        nameUK: 'Професор',
    color: '#FFD700',           color2: '#FF8C00',
    animation: 'rainbow',       unlockLevel: 0,
    unlockType: 'club',         unlockClubId: 11,
    unlockClubNameRU: 'Клуб Профессоров', unlockClubNameUK: 'Клуб Професорів',
  },
];

// ── Хелперы ──────────────────────────────────────────────────────────────────

export const getFrameById = (id: string): FrameDef =>
  FRAMES.find(f => f.id === id) ?? FRAMES[0];

/** Лучшая рамка доступная на данном уровне */
export const getBestFrameForLevel = (level: number): FrameDef => {
  const unlocked = FRAMES.filter(f => f.unlockLevel <= level);
  return unlocked[unlocked.length - 1] ?? FRAMES[0];
};

/** Лучший значок доступный на данном уровне (возвращает номер уровня как строку) */
export const getBestAvatarForLevel = (level: number): string =>
  String(Math.max(1, Math.min(50, level)));

/** Получить аватарку по индексу (1-50) */
export const getAvatarByIndex = (index: number): AvatarDef | undefined => {
  if (index < 1 || index > AVATARS.length) return undefined;
  return AVATARS[index - 1]; // AVATARS[0] = level 1
};

/** Получить image аватарки по индексу (1-50) */
export const getAvatarImageByIndex = (index: number): any | undefined => {
  const avatar = getAvatarByIndex(index);
  return avatar?.image;
};

// ── Боты: детерминированный уровень + аватарка/рамка по имени ───────────────
// weekBase → базовый уровень (логарифмически)
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

// Уровень растёт каждую неделю — топ-боты быстрее, новички медленнее
// Эпоха = 2026-01-01 (начало жизни приложения)
const APP_EPOCH_MS = new Date('2026-01-01').getTime();
export const getBotCurrentLevel = (weekBase: number, botName: string): number => {
  const weeksSinceEpoch = Math.max(0, Math.floor((Date.now() - APP_EPOCH_MS) / (7 * 24 * 60 * 60 * 1000)));
  const baseLevel = botLevelFromBase(weekBase);
  // Скорость роста зависит от активности бота
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
  // Use level badge image (number string) — consistent with user avatar display
  return { emoji: getBestAvatarForLevel(level), frameId: frame.id, level };
};

// ── Разблокировка рамок для тестеров (без изменения XP) ──────────────────────
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
