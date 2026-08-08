// ═══ АВАТАРЫ И РАМКИ ═══════════════════════════════════════════════════════
// Firebase-ready: все данные сериализуем через JSON
// AsyncStorage keys: 'user_avatar' (emoji), 'user_frame' (frame id)

import type { Lang } from './i18n';
import { getLevelAvatarMaterial } from './avatar_level_materials';

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
  nameES: string;
  color: string;
  color2: string;
  animation: FrameAnimation;
  unlockLevel: number;
  unlockType?: FrameUnlockType;
  unlockAchievementId?: string;
  unlockAchievementNameRU?: string;
  unlockAchievementNameUK?: string;
  unlockAchievementNameES?: string;
  unlockClubId?: number;
  unlockClubNameRU?: string;
  unlockClubNameUK?: string;
  unlockClubNameES?: string;
}

export interface AvatarDef {
  image: string;
  unlockLevel: number;
  tint: readonly [string, string]; // два цвета градиентного оверлея
}

// ── Аватарки ──────────────────────────────────────────────────────────────────
// Два цвета для каждого уровня — один градиент на все 60, математически равномерный.
// Тема: холодный графит (#6B7A8D / #1A2030) → тёплое золото (#C89A3A / #4A3010)
// Интерполяция линейная, шаг одинаковый — никаких выделений на 5/10/15/...
function _lerp(a: number, b: number, t: number): number { return Math.round(a + (b - a) * t); }
function _hex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(x => Math.max(0, Math.min(255, x)).toString(16).padStart(2, '0')).join('');
}
function _tint(level: number): readonly [string, string] {
  const material = getLevelAvatarMaterial(level);
  if (material) return [material.colors[0], material.colors[1]];
  const t = (level - 1) / 59; // 0..1
  // цвет A: от холодного графита к тёплому янтарю
  const a = _hex(_lerp(0x6B, 0xC8, t), _lerp(0x7A, 0x9A, t), _lerp(0x8D, 0x3A, t));
  // цвет B: от тёмного синего к глубокому коричнево-золотому
  const b = _hex(_lerp(0x1A, 0x4A, t), _lerp(0x20, 0x30, t), _lerp(0x30, 0x10, t));
  return [a, b];
}

export const AVATARS: AvatarDef[] = [
  { image: require('../assets/images/levels/generated-v5-dalle/1.webp'),  unlockLevel: 1,  tint: _tint(1)  },
  { image: require('../assets/images/levels/generated-v5-dalle/2.webp'),  unlockLevel: 2,  tint: _tint(2)  },
  { image: require('../assets/images/levels/generated-v5-dalle/3.webp'),  unlockLevel: 3,  tint: _tint(3)  },
  { image: require('../assets/images/levels/generated-v5-dalle/4.webp'),  unlockLevel: 4,  tint: _tint(4)  },
  { image: require('../assets/images/levels/generated-v5-dalle/5.webp'),  unlockLevel: 5,  tint: _tint(5)  },
  { image: require('../assets/images/levels/generated-v5-dalle/6.webp'),  unlockLevel: 6,  tint: _tint(6)  },
  { image: require('../assets/images/levels/generated-v5-dalle/7.webp'),  unlockLevel: 7,  tint: _tint(7)  },
  { image: require('../assets/images/levels/generated-v5-dalle/8.webp'),  unlockLevel: 8,  tint: _tint(8)  },
  { image: require('../assets/images/levels/generated-v5-dalle/9.webp'),  unlockLevel: 9,  tint: _tint(9)  },
  { image: require('../assets/images/levels/generated-v5-dalle/10.webp'), unlockLevel: 10, tint: _tint(10) },
  { image: require('../assets/images/levels/generated-v5-dalle/11.webp'), unlockLevel: 11, tint: _tint(11) },
  { image: require('../assets/images/levels/generated-v5-dalle/12.webp'), unlockLevel: 12, tint: _tint(12) },
  { image: require('../assets/images/levels/generated-v5-dalle/13.webp'), unlockLevel: 13, tint: _tint(13) },
  { image: require('../assets/images/levels/generated-v5-dalle/14.webp'), unlockLevel: 14, tint: _tint(14) },
  { image: require('../assets/images/levels/generated-v5-dalle/15.webp'), unlockLevel: 15, tint: _tint(15) },
  { image: require('../assets/images/levels/generated-v5-dalle/16.webp'), unlockLevel: 16, tint: _tint(16) },
  { image: require('../assets/images/levels/generated-v5-dalle/17.webp'), unlockLevel: 17, tint: _tint(17) },
  { image: require('../assets/images/levels/generated-v5-dalle/18.webp'), unlockLevel: 18, tint: _tint(18) },
  { image: require('../assets/images/levels/generated-v5-dalle/19.webp'), unlockLevel: 19, tint: _tint(19) },
  { image: require('../assets/images/levels/generated-v5-dalle/20.webp'), unlockLevel: 20, tint: _tint(20) },
  { image: require('../assets/images/levels/generated-v5-dalle/21.webp'), unlockLevel: 21, tint: _tint(21) },
  { image: require('../assets/images/levels/generated-v5-dalle/22.webp'), unlockLevel: 22, tint: _tint(22) },
  { image: require('../assets/images/levels/generated-v5-dalle/23.webp'), unlockLevel: 23, tint: _tint(23) },
  { image: require('../assets/images/levels/generated-v5-dalle/24.webp'), unlockLevel: 24, tint: _tint(24) },
  { image: require('../assets/images/levels/generated-v5-dalle/25.webp'), unlockLevel: 25, tint: _tint(25) },
  { image: require('../assets/images/levels/generated-v5-dalle/26.webp'), unlockLevel: 26, tint: _tint(26) },
  { image: require('../assets/images/levels/generated-v5-dalle/27.webp'), unlockLevel: 27, tint: _tint(27) },
  { image: require('../assets/images/levels/generated-v5-dalle/28.webp'), unlockLevel: 28, tint: _tint(28) },
  { image: require('../assets/images/levels/generated-v5-dalle/29.webp'), unlockLevel: 29, tint: _tint(29) },
  { image: require('../assets/images/levels/generated-v5-dalle/30.webp'), unlockLevel: 30, tint: _tint(30) },
  { image: require('../assets/images/levels/generated-v5-dalle/31.webp'), unlockLevel: 31, tint: _tint(31) },
  { image: require('../assets/images/levels/generated-v5-dalle/32.webp'), unlockLevel: 32, tint: _tint(32) },
  { image: require('../assets/images/levels/generated-v5-dalle/33.webp'), unlockLevel: 33, tint: _tint(33) },
  { image: require('../assets/images/levels/generated-v5-dalle/34.webp'), unlockLevel: 34, tint: _tint(34) },
  { image: require('../assets/images/levels/generated-v5-dalle/35.webp'), unlockLevel: 35, tint: _tint(35) },
  { image: require('../assets/images/levels/generated-v5-dalle/36.webp'), unlockLevel: 36, tint: _tint(36) },
  { image: require('../assets/images/levels/generated-v5-dalle/37.webp'), unlockLevel: 37, tint: _tint(37) },
  { image: require('../assets/images/levels/generated-v5-dalle/38.webp'), unlockLevel: 38, tint: _tint(38) },
  { image: require('../assets/images/levels/generated-v5-dalle/39.webp'), unlockLevel: 39, tint: _tint(39) },
  { image: require('../assets/images/levels/generated-v5-dalle/40.webp'), unlockLevel: 40, tint: _tint(40) },
  { image: require('../assets/images/levels/generated-v5-dalle/41.webp'), unlockLevel: 41, tint: _tint(41) },
  { image: require('../assets/images/levels/generated-v5-dalle/42.webp'), unlockLevel: 42, tint: _tint(42) },
  { image: require('../assets/images/levels/generated-v5-dalle/43.webp'), unlockLevel: 43, tint: _tint(43) },
  { image: require('../assets/images/levels/generated-v5-dalle/44.webp'), unlockLevel: 44, tint: _tint(44) },
  { image: require('../assets/images/levels/generated-v5-dalle/45.webp'), unlockLevel: 45, tint: _tint(45) },
  { image: require('../assets/images/levels/generated-v5-dalle/46.webp'), unlockLevel: 46, tint: _tint(46) },
  { image: require('../assets/images/levels/generated-v5-dalle/47.webp'), unlockLevel: 47, tint: _tint(47) },
  { image: require('../assets/images/levels/generated-v5-dalle/48.webp'), unlockLevel: 48, tint: _tint(48) },
  { image: require('../assets/images/levels/generated-v5-dalle/49.webp'), unlockLevel: 49, tint: _tint(49) },
  { image: require('../assets/images/levels/generated-v5-dalle/50.webp'), unlockLevel: 50, tint: _tint(50) },
  { image: require('../assets/images/levels/generated-v5-dalle/51.webp'), unlockLevel: 51, tint: _tint(51) },
  { image: require('../assets/images/levels/generated-v5-dalle/52.webp'), unlockLevel: 52, tint: _tint(52) },
  { image: require('../assets/images/levels/generated-v5-dalle/53.webp'), unlockLevel: 53, tint: _tint(53) },
  { image: require('../assets/images/levels/generated-v5-dalle/54.webp'), unlockLevel: 54, tint: _tint(54) },
  { image: require('../assets/images/levels/generated-v5-dalle/55.webp'), unlockLevel: 55, tint: _tint(55) },
  { image: require('../assets/images/levels/generated-v5-dalle/56.webp'), unlockLevel: 56, tint: _tint(56) },
  { image: require('../assets/images/levels/generated-v5-dalle/57.webp'), unlockLevel: 57, tint: _tint(57) },
  { image: require('../assets/images/levels/generated-v5-dalle/58.webp'), unlockLevel: 58, tint: _tint(58) },
  { image: require('../assets/images/levels/generated-v5-dalle/59.webp'), unlockLevel: 59, tint: _tint(59) },
  { image: require('../assets/images/levels/generated-v5-dalle/60.webp'), unlockLevel: 60, tint: _tint(60) },
];

// ── Рамки по уровням ──────────────────────────────────────────────────────────
export const FRAMES: FrameDef[] = [
  {
    id: 'plain',
    nameRU: 'Простая',       nameUK: 'Проста', nameES: 'Sencilla',
    color: '#888888',        color2: '#555555',
    animation: 'plain',      unlockLevel: 1,
  },
  {
    id: 'sprout',
    nameRU: 'Росток',        nameUK: 'Паросток', nameES: 'Brote',
    color: '#47C870',        color2: '#1a7a3a',
    animation: 'sprout',     unlockLevel: 3,
  },
  {
    id: 'arc',
    nameRU: 'Дуга',          nameUK: 'Дуга', nameES: 'Arco',
    color: '#E8320A',        color2: '#FFD700',
    animation: 'arc',        unlockLevel: 7,
  },
  {
    id: 'ice',
    nameRU: 'Лёд',           nameUK: 'Лід', nameES: 'Hielo',
    color: '#7DD8F8',        color2: '#0288D1',
    animation: 'ice',        unlockLevel: 10,
  },
  {
    id: 'plasma',
    nameRU: 'Плазма',        nameUK: 'Плазма', nameES: 'Plasma',
    color: '#FFD700',        color2: '#FFA500',
    animation: 'plasma',     unlockLevel: 13,
  },
  {
    id: 'magnet',
    nameRU: 'Магнетизм',     nameUK: 'Магнетизм', nameES: 'Magnetismo',
    color: '#00C8FF',        color2: '#0055DD',
    animation: 'magnet',     unlockLevel: 16,
  },
  {
    id: 'vortex',
    nameRU: 'Вихрь',         nameUK: 'Вихор', nameES: 'Vórtice',
    color: '#B044FF',        color2: '#7B2FBE',
    animation: 'vortex',     unlockLevel: 20,
  },
  {
    id: 'dna',
    nameRU: 'Пульсар',       nameUK: 'Пульсар', nameES: 'Púlsar',
    color: '#00DDFF',        color2: '#AA44FF',
    animation: 'pulsar',     unlockLevel: 23,
  },
  {
    id: 'runes',
    nameRU: 'Руны',          nameUK: 'Руни', nameES: 'Runas',
    color: '#BB66FF',        color2: '#7722CC',
    animation: 'runes',      unlockLevel: 26,
  },
  {
    id: 'gold_crown',
    nameRU: 'Золотой атом',  nameUK: 'Золотий атом', nameES: 'Átomo dorado',
    color: '#FFD700',        color2: '#FF8C00',
    animation: 'atom',       unlockLevel: 30,
  },
  {
    id: 'web',
    nameRU: 'Паутина',       nameUK: 'Павутина', nameES: 'Telaraña',
    color: '#A855F7',        color2: '#6D28D9',
    animation: 'web',        unlockLevel: 33,
  },
  {
    id: 'hex',
    nameRU: 'Гексагон',      nameUK: 'Гексагон', nameES: 'Hexágono',
    color: '#FF4500',        color2: '#8B1A00',
    animation: 'hex',        unlockLevel: 36,
  },
  {
    id: 'geometry',
    nameRU: 'Геометрия',     nameUK: 'Геометрія', nameES: 'Geometría',
    color: '#B9F2FF',        color2: '#0097A7',
    animation: 'geometry',   unlockLevel: 40,
  },
  {
    id: 'neural',
    nameRU: 'Нейросеть',     nameUK: 'Нейромережа', nameES: 'Red neuronal',
    color: '#00FF88',        color2: '#00CC66',
    animation: 'neural',     unlockLevel: 43,
  },
  {
    id: 'aurora_star',
    nameRU: 'Аврора',        nameUK: 'Аврора', nameES: 'Aurora',
    color: '#00BFA5',        color2: '#7B1FA2',
    animation: 'aurora_star', unlockLevel: 46,
  },
  {
    id: 'crystal',
    nameRU: 'Кристалл',      nameUK: 'Кристал', nameES: 'Cristal',
    color: '#E0F7FA',        color2: '#0097A7',
    animation: 'crystal',    unlockLevel: 48,
  },
  {
    id: 'legendary',
    nameRU: '✦ Абсолют',     nameUK: '✦ Абсолют', nameES: '✦ Absoluto',
    color: '#FFFFFF',        color2: '#FFD700',
    animation: 'solar_cycle', unlockLevel: 50,
  },

  // ── Рамки за достижения ───────────────────────────────────────────────────
  {
    id: 'ach_streak365',
    nameRU: 'Хранитель года',   nameUK: 'Охоронець року', nameES: 'Guardián del año',
    color: '#FF8C00',           color2: '#FFD700',
    animation: 'solar_cycle',   unlockLevel: 0,
    unlockType: 'achievement',
    unlockAchievementId: 'streak_365',
    unlockAchievementNameRU: 'Целый год',
    unlockAchievementNameUK: 'Цілий рік',
    unlockAchievementNameES: 'Un año entero',
  },
  {
    id: 'ach_streak500',
    nameRU: '500 дней',         nameUK: '500 днів', nameES: '500 días',
    color: '#FFD700',           color2: '#FF4500',
    animation: 'double_square', unlockLevel: 0,
    unlockType: 'achievement',
    unlockAchievementId: 'streak_500',
    unlockAchievementNameRU: '500 дней',
    unlockAchievementNameUK: '500 днів',
    unlockAchievementNameES: '500 días',
  },
  {
    id: 'ach_lesson_absolute',
    nameRU: 'Абсолют',          nameUK: 'Абсолют', nameES: 'Perfección',
    color: '#F0F8FF',           color2: '#7BBCDC',
    animation: 'crystal',       unlockLevel: 0,
    unlockType: 'achievement',
    unlockAchievementId: 'lesson_all_perfect',
    unlockAchievementNameRU: 'Абсолют',
    unlockAchievementNameUK: 'Абсолют',
    unlockAchievementNameES: 'Perfección absoluta',
  },
  {
    id: 'ach_combo100',
    nameRU: 'Непобедимый',      nameUK: 'Непереможний', nameES: 'Invencible',
    color: '#FF1060',           color2: '#AA0033',
    animation: 'arc_red',       unlockLevel: 0,
    unlockType: 'achievement',
    unlockAchievementId: 'combo_100',
    unlockAchievementNameRU: 'Непобедимый',
    unlockAchievementNameUK: 'Непереможний',
    unlockAchievementNameES: 'Invencible',
  },
  {
    id: 'ach_xp100k',
    nameRU: 'XP Легенда',       nameUK: 'XP Легенда', nameES: 'Leyenda de XP',
    color: '#FFD700',           color2: '#E040FB',
    animation: 'aurora_star',   unlockLevel: 0,
    unlockType: 'achievement',
    unlockAchievementId: 'xp_100000',
    unlockAchievementNameRU: 'Легенда',
    unlockAchievementNameUK: 'Легенда',
    unlockAchievementNameES: 'Leyenda',
  },
  // ── Клубные рамки ─────────────────────────────────────────────────────────
  {
    id: 'club_initiator',
    nameRU: 'Инициатор',        nameUK: 'Ініціатор', nameES: 'Iniciador',
    color: '#7B9BB5',           color2: '#4A6B85',
    animation: 'sprout',        unlockLevel: 0,
    unlockType: 'club',         unlockClubId: 0,
    unlockClubNameRU: 'Клуб Инициаторов', unlockClubNameUK: 'Клуб Ініціаторів',
    unlockClubNameES: 'Cobre',
  },
  {
    id: 'club_adept',
    nameRU: 'Адепт',            nameUK: 'Адепт', nameES: 'Adepto',
    color: '#5BA88B',           color2: '#2E7A5F',
    animation: 'arc',           unlockLevel: 0,
    unlockType: 'club',         unlockClubId: 1,
    unlockClubNameRU: 'Клуб Адептов', unlockClubNameUK: 'Клуб Адептів',
    unlockClubNameES: 'Bronce',
  },
  {
    id: 'club_seeker',
    nameRU: 'Искатель',         nameUK: 'Шукач', nameES: 'Buscador',
    color: '#4A90D9',           color2: '#1A6AAA',
    animation: 'pulsar',        unlockLevel: 0,
    unlockType: 'club',         unlockClubId: 2,
    unlockClubNameRU: 'Клуб Искателей', unlockClubNameUK: 'Клуб Шукачів',
    unlockClubNameES: 'Plata',
  },
  {
    id: 'club_practitioner',
    nameRU: 'Практик',          nameUK: 'Практик', nameES: 'Practicante',
    color: '#7BA84A',           color2: '#4A7020',
    animation: 'web',           unlockLevel: 0,
    unlockType: 'club',         unlockClubId: 3,
    unlockClubNameRU: 'Клуб Практиков', unlockClubNameUK: 'Клуб Практиків',
    unlockClubNameES: 'Oro',
  },
  {
    id: 'club_analyst',
    nameRU: 'Аналитик',         nameUK: 'Аналітик', nameES: 'Analista',
    color: '#C8A84A',           color2: '#8A6800',
    animation: 'geometry',      unlockLevel: 0,
    unlockType: 'club',         unlockClubId: 4,
    unlockClubNameRU: 'Клуб Аналитиков', unlockClubNameUK: 'Клуб Аналітиків',
    unlockClubNameES: 'Platino',
  },
  {
    id: 'club_erudite',
    nameRU: 'Эрудит',           nameUK: 'Ерудит', nameES: 'Erudito',
    color: '#CD7F32',           color2: '#7A3D00',
    animation: 'hex',           unlockLevel: 0,
    unlockType: 'club',         unlockClubId: 5,
    unlockClubNameRU: 'Клуб Эрудитов', unlockClubNameUK: 'Клуб Ерудитів',
    unlockClubNameES: 'Esmeralda',
  },
  {
    id: 'club_connoisseur',
    nameRU: 'Знаток',           nameUK: 'Знавець', nameES: 'Conocedor',
    color: '#4A90D9',           color2: '#1A4A80',
    animation: 'dna',           unlockLevel: 0,
    unlockType: 'club',         unlockClubId: 6,
    unlockClubNameRU: 'Клуб Знатоков', unlockClubNameUK: 'Клуб Знавців',
    unlockClubNameES: 'Zafiro',
  },
  {
    id: 'club_expert',
    nameRU: 'Эксперт',          nameUK: 'Експерт', nameES: 'Experto',
    color: '#9B59B6',           color2: '#5B0090',
    animation: 'double_dna',    unlockLevel: 0,
    unlockType: 'club',         unlockClubId: 7,
    unlockClubNameRU: 'Клуб Экспертов', unlockClubNameUK: 'Клуб Експертів',
    unlockClubNameES: 'Rubí',
  },
  {
    id: 'club_magister',
    nameRU: 'Магистр',          nameUK: 'Магістр', nameES: 'Magíster',
    color: '#C8D4DC',           color2: '#6A7E8E',
    animation: 'double_square', unlockLevel: 0,
    unlockType: 'club',         unlockClubId: 8,
    unlockClubNameRU: 'Клуб Магистров', unlockClubNameUK: 'Клуб Магістрів',
    unlockClubNameES: 'Diamante',
  },
  {
    id: 'club_thinker',
    nameRU: 'Мыслитель',        nameUK: 'Мислитель', nameES: 'Pensador',
    color: '#E87E30',           color2: '#8A3A00',
    animation: 'triple_tri',    unlockLevel: 0,
    unlockType: 'club',         unlockClubId: 9,
    unlockClubNameRU: 'Клуб Мыслителей', unlockClubNameUK: 'Клуб Мислителів',
    unlockClubNameES: 'Diamante negro',
  },
  {
    id: 'club_master',
    nameRU: 'Мастер',           nameUK: 'Майстер', nameES: 'Maestro',
    color: '#D4A017',           color2: '#7A4A00',
    animation: 'aurora_star',   unlockLevel: 0,
    unlockType: 'club',         unlockClubId: 10,
    unlockClubNameRU: 'Клуб Мастеров', unlockClubNameUK: 'Клуб Майстрів',
    unlockClubNameES: 'Éter',
  },
  {
    id: 'club_professor',
    nameRU: 'Профессор',        nameUK: 'Професор', nameES: 'Profesor',
    color: '#FFD700',           color2: '#FF8C00',
    animation: 'triple_dna',    unlockLevel: 0,
    unlockType: 'club',         unlockClubId: 11,
    unlockClubNameRU: 'Клуб Профессоров', unlockClubNameUK: 'Клуб Професорів',
    unlockClubNameES: 'Liga suprema',
  },
];

const FRAME_NAMES_PT_BR: Record<string, string> = {
  plain: 'Simples',
  sprout: 'Broto',
  arc: 'Arco',
  ice: 'Gelo',
  plasma: 'Plasma',
  magnet: 'Magnetismo',
  vortex: 'Vórtice',
  dna: 'Pulsar',
  runes: 'Runas',
  gold_crown: 'Átomo dourado',
  web: 'Teia',
  hex: 'Hexágono',
  geometry: 'Geometria',
  neural: 'Rede neural',
  aurora_star: 'Aurora',
  crystal: 'Cristal',
  legendary: '✦ Absoluto',
  ach_streak365: 'Guardião do ano',
  ach_streak500: '500 dias',
  ach_lesson_absolute: 'Perfeição',
  ach_combo100: 'Invencível',
  ach_xp100k: 'Lenda de XP',
  club_initiator: 'Iniciador',
  club_adept: 'Adepto',
  club_seeker: 'Buscador',
  club_practitioner: 'Praticante',
  club_analyst: 'Analista',
  club_erudite: 'Erudito',
  club_connoisseur: 'Conhecedor',
  club_expert: 'Especialista',
  club_magister: 'Mestre',
  club_thinker: 'Pensador',
  club_master: 'Mestre',
  club_professor: 'Professor',
};

const FRAME_NAMES_VI: Record<string, string> = {
  plain: 'Đơn giản',
  sprout: 'Mầm non',
  arc: 'Vòng cung',
  ice: 'Băng',
  plasma: 'Plasma',
  magnet: 'Từ lực',
  vortex: 'Xoáy',
  dna: 'Pulsar',
  runes: 'Cổ tự',
  gold_crown: 'Nguyên tử vàng',
  web: 'Mạng nhện',
  hex: 'Lục giác',
  geometry: 'Hình học',
  neural: 'Mạng nơ-ron',
  aurora_star: 'Cực quang',
  crystal: 'Pha lê',
  legendary: '✦ Tuyệt đối',
  ach_streak365: 'Người giữ trọn năm',
  ach_streak500: '500 ngày',
  ach_lesson_absolute: 'Hoàn hảo',
  ach_combo100: 'Bất bại',
  ach_xp100k: 'Huyền thoại XP',
  club_initiator: 'Người khởi xướng',
  club_adept: 'Thành thạo',
  club_seeker: 'Người tìm kiếm',
  club_practitioner: 'Người luyện tập',
  club_analyst: 'Nhà phân tích',
  club_erudite: 'Học giả',
  club_connoisseur: 'Người am hiểu',
  club_expert: 'Chuyên gia',
  club_magister: 'Bậc thầy',
  club_thinker: 'Nhà tư tưởng',
  club_master: 'Bậc thầy',
  club_professor: 'Giáo sư',
};

const FRAME_NAMES_ID: Record<string, string> = {
  plain: 'Sederhana',
  sprout: 'Tunas',
  arc: 'Busur',
  ice: 'Es',
  plasma: 'Plasma',
  magnet: 'Magnetisme',
  vortex: 'Pusaran',
  dna: 'Pulsar',
  runes: 'Runa',
  gold_crown: 'Atom emas',
  web: 'Jaring',
  hex: 'Heksagon',
  geometry: 'Geometri',
  neural: 'Jaringan saraf',
  aurora_star: 'Aurora',
  crystal: 'Kristal',
  legendary: '✦ Absolut',
  ach_streak365: 'Penjaga tahun',
  ach_streak500: '500 hari',
  ach_lesson_absolute: 'Kesempurnaan',
  ach_combo100: 'Tak terkalahkan',
  ach_xp100k: 'Legenda XP',
  club_initiator: 'Inisiator',
  club_adept: 'Adept',
  club_seeker: 'Pencari',
  club_practitioner: 'Praktisi',
  club_analyst: 'Analis',
  club_erudite: 'Cendekia',
  club_connoisseur: 'Pakar',
  club_expert: 'Ahli',
  club_magister: 'Magister',
  club_thinker: 'Pemikir',
  club_master: 'Master',
  club_professor: 'Profesor',
};

const FRAME_NAMES_TR: Record<string, string> = {
  plain: 'Sade',
  sprout: 'Filiz',
  arc: 'Yay',
  ice: 'Buz',
  plasma: 'Plazma',
  magnet: 'Manyetizma',
  vortex: 'Girdap',
  dna: 'Pulsar',
  runes: 'Rünler',
  gold_crown: 'Altın atom',
  web: 'Ağ',
  hex: 'Altıgen',
  geometry: 'Geometri',
  neural: 'Sinir ağı',
  aurora_star: 'Aurora',
  crystal: 'Kristal',
  legendary: '✦ Mutlak',
  ach_streak365: 'Yılın koruyucusu',
  ach_streak500: '500 gün',
  ach_lesson_absolute: 'Mükemmellik',
  ach_combo100: 'Yenilmez',
  ach_xp100k: 'XP efsanesi',
  club_initiator: 'Başlatan',
  club_adept: 'Usta aday',
  club_seeker: 'Arayıcı',
  club_practitioner: 'Uygulayıcı',
  club_analyst: 'Analist',
  club_erudite: 'Bilgin',
  club_connoisseur: 'Uzman',
  club_expert: 'Eksper',
  club_magister: 'Magister',
  club_thinker: 'Düşünür',
  club_master: 'Usta',
  club_professor: 'Profesör',
};

const FRAME_NAMES_PL: Record<string, string> = {
  plain: 'Prosta',
  sprout: 'Kiełek',
  arc: 'Łuk',
  ice: 'Lód',
  plasma: 'Plazma',
  magnet: 'Magnetyzm',
  vortex: 'Wir',
  dna: 'Pulsar',
  runes: 'Runy',
  gold_crown: 'Złoty atom',
  web: 'Pajęczyna',
  hex: 'Sześciokąt',
  geometry: 'Geometria',
  neural: 'Sieć neuronowa',
  aurora_star: 'Aurora',
  crystal: 'Kryształ',
  legendary: '✦ Absolut',
  ach_streak365: 'Strażnik roku',
  ach_streak500: '500 dni',
  ach_lesson_absolute: 'Perfekcja',
  ach_combo100: 'Niezwyciężony',
  ach_xp100k: 'Legenda XP',
  club_initiator: 'Inicjator',
  club_adept: 'Adept',
  club_seeker: 'Poszukiwacz',
  club_practitioner: 'Praktyk',
  club_analyst: 'Analityk',
  club_erudite: 'Erudyta',
  club_connoisseur: 'Znawca',
  club_expert: 'Ekspert',
  club_magister: 'Magister',
  club_thinker: 'Myśliciel',
  club_master: 'Mistrz',
  club_professor: 'Profesor',
};

const FRAME_NAMES_BY_LANG: Partial<Record<Lang, Record<string, string>>> = {
  'pt-BR': FRAME_NAMES_PT_BR,
  vi: FRAME_NAMES_VI,
  id: FRAME_NAMES_ID,
  tr: FRAME_NAMES_TR,
  pl: FRAME_NAMES_PL,
};

export const frameNameForLang = (fr: FrameDef, lang: Lang): string => {
  const names: Partial<Record<Lang, string>> = {
    ru: fr.nameRU,
    uk: fr.nameUK,
    es: fr.nameES,
    'pt-BR': FRAME_NAMES_PT_BR[fr.id],
    vi: FRAME_NAMES_VI[fr.id],
    id: FRAME_NAMES_ID[fr.id],
    tr: FRAME_NAMES_TR[fr.id],
    pl: FRAME_NAMES_PL[fr.id],
  };
  const name = names[lang] || FRAME_NAMES_BY_LANG[lang]?.[fr.id];
  if (name) return name;
  const defaultName = fr.nameRU;
  return defaultName;
};

// ── Хелперы ────────────────────────────────────────────────────────────────────
export const getFrameById = (id: string): FrameDef => {
  const frame = FRAMES.find(f => f.id === id);
  if (frame) return frame;
  const defaultFrame = FRAMES[0];
  return defaultFrame;
};

export const getBestFrameForLevel = (level: number): FrameDef => {
  const unlocked = FRAMES.filter(f => (f.unlockType ?? 'level') === 'level' && f.unlockLevel <= level);
  const frame = unlocked[unlocked.length - 1];
  if (frame) return frame;
  const defaultFrame = FRAMES[0];
  return defaultFrame;
};

export const getBestAvatarForLevel = (level: number): string =>
  String(Math.max(1, Math.min(60, level)));

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
