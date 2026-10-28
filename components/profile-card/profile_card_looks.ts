// ─── Визитка 2.0: цвета и размеры каждого вида (макет profile-card-pro.html) ──
// зачем: все числа сняты с CSS макета (классы .st-normal … .st-neon), чтобы визитка
// в приложении совпадала 1:1. Визитка не зависит от темы приложения — у каждого
// вида своя палитра, как в макете.
// ЗАМОК ВЛАДЕЛЬЦА 22.10: «палитры визиток — свои» — палитры видов не переводить на токены темы; сторож
// tests/owner_locks_profile_card_metal.test.mjs, реестр docs/work/OWNER_LOCKS.md. Ослабить — только по новому слову владельца.
import type { ProfileCardLook } from '../../app/profile_card_styles';

export type GradientSpec = Readonly<{
  colors: readonly [string, string, ...string[]];
  locations?: readonly [number, number, ...number[]];
  /** Угол CSS linear-gradient в градусах (100deg, 145deg …). */
  angle: number;
}>;

export type ProfileCardLookTokens = Readonly<{
  bg: string;
  /** Диаметр монеты в визитке (макет: d). */
  coin: number;
  edge: string;
  edgeWidth: number;
  title: string;
  titleGlow: string | null;
  rankBg: string;
  rankText: string;
  badge: Readonly<{ fill: GradientSpec; text: string; radius: number }> | null;
  /** Заливка главной кнопки (null — белая по умолчанию). */
  primary: Readonly<{ fill: GradientSpec; text: string }> | null;
  /** Аура: имя/ранг/текст на стеклянной плашке. */
  glassBody: boolean;
}>;

const WHITE_RANK = { rankBg: 'rgba(255,255,255,0.13)', rankText: '#FFFFFF' } as const; // theme-exempt: облик карточки профиля — коллекционный арт, цвета часть картинки облика (выбирает пользователь)

export const PROFILE_CARD_LOOKS: Readonly<Record<ProfileCardLook, ProfileCardLookTokens>> = {
  normal: {
    bg: '#151518', coin: 150, edge: 'rgba(255,255,255,0.10)', edgeWidth: 1, // theme-exempt: облик карточки профиля — коллекционный арт, цвета часть картинки облика (выбирает пользователь)
    title: '#FFFFFF', titleGlow: null, ...WHITE_RANK, badge: null, primary: null, glassBody: false, // theme-exempt: облик карточки профиля — коллекционный арт, цвета часть картинки облика (выбирает пользователь)
  },
  holo: {
    bg: '#0C0B10', coin: 172, edge: 'rgba(214,196,255,0.55)', edgeWidth: 1.5, // theme-exempt: облик карточки профиля — коллекционный арт, цвета часть картинки облика (выбирает пользователь)
    title: '#FFFFFF', titleGlow: null, ...WHITE_RANK, // theme-exempt: облик карточки профиля — коллекционный арт, цвета часть картинки облика (выбирает пользователь)
    badge: { fill: { colors: ['#FFD36E', '#7BFFCF', '#6FB8FF', '#FF7AB6'], angle: 100 }, text: '#0C0B10', radius: 12 }, // theme-exempt: облик карточки профиля — коллекционный арт, цвета часть картинки облика (выбирает пользователь)
    primary: { fill: { colors: ['#FFE7A8', '#B9FFE6', '#C9B8FF'], locations: [0, 0.5, 1], angle: 100 }, text: '#111111' }, // theme-exempt: облик карточки профиля — коллекционный арт, цвета часть картинки облика (выбирает пользователь)
    glassBody: false,
  },
  obs: {
    bg: '#0A0907', coin: 184, edge: 'rgba(233,200,130,0.62)', edgeWidth: 1.5, // theme-exempt: облик карточки профиля — коллекционный арт, цвета часть картинки облика (выбирает пользователь)
    title: '#FBF3DF', titleGlow: null, rankBg: 'rgba(233,207,149,0.13)', rankText: '#F3E2B8', // theme-exempt: облик карточки профиля — коллекционный арт, цвета часть картинки облика (выбирает пользователь)
    badge: { fill: { colors: ['#FFF1C9', '#D9B56C', '#F6DC9C'], locations: [0, 0.55, 1], angle: 145 }, text: '#2A1F0C', radius: 12 }, // theme-exempt: облик карточки профиля — коллекционный арт, цвета часть картинки облика (выбирает пользователь)
    primary: { fill: { colors: ['#FFF1C9', '#D9B56C', '#F6DC9C'], locations: [0, 0.55, 1], angle: 145 }, text: '#2A1F0C' }, // theme-exempt: облик карточки профиля — коллекционный арт, цвета часть картинки облика (выбирает пользователь)
    glassBody: false,
  },
  aura: {
    bg: '#120D1C', coin: 160, edge: 'rgba(255,255,255,0.42)', edgeWidth: 1.5, // theme-exempt: облик карточки профиля — коллекционный арт, цвета часть картинки облика (выбирает пользователь)
    title: '#FFFFFF', titleGlow: null, ...WHITE_RANK, // theme-exempt: облик карточки профиля — коллекционный арт, цвета часть картинки облика (выбирает пользователь)
    badge: { fill: { colors: ['#FFFFFF', '#FFFFFF'], angle: 90 }, text: '#2A1340', radius: 15 }, // theme-exempt: облик карточки профиля — коллекционный арт, цвета часть картинки облика (выбирает пользователь)
    primary: null,
    glassBody: true,
  },
  ice: {
    bg: '#0D1620', coin: 160, edge: 'rgba(190,236,255,0.60)', edgeWidth: 1.5, // theme-exempt: облик карточки профиля — коллекционный арт, цвета часть картинки облика (выбирает пользователь)
    title: '#FFFFFF', titleGlow: null, ...WHITE_RANK, // theme-exempt: облик карточки профиля — коллекционный арт, цвета часть картинки облика (выбирает пользователь)
    badge: { fill: { colors: ['#F2FDFF', '#A6E4FF', '#FFD6F1'], locations: [0, 0.6, 1], angle: 135 }, text: '#0D1620', radius: 12 }, // theme-exempt: облик карточки профиля — коллекционный арт, цвета часть картинки облика (выбирает пользователь)
    primary: { fill: { colors: ['#F2FDFF', '#BFEAFF', '#FFE0F4'], locations: [0, 0.6, 1], angle: 135 }, text: '#0D1620' }, // theme-exempt: облик карточки профиля — коллекционный арт, цвета часть картинки облика (выбирает пользователь)
    glassBody: false,
  },
  space: {
    bg: '#05060F', coin: 156, edge: 'rgba(130,150,255,0.50)', edgeWidth: 1.5, // theme-exempt: облик карточки профиля — коллекционный арт, цвета часть картинки облика (выбирает пользователь)
    title: '#FFFFFF', titleGlow: null, ...WHITE_RANK, // theme-exempt: облик карточки профиля — коллекционный арт, цвета часть картинки облика (выбирает пользователь)
    badge: { fill: { colors: ['#6A5BFF', '#00B8FF'], angle: 135 }, text: '#FFFFFF', radius: 12 }, // theme-exempt: облик карточки профиля — коллекционный арт, цвета часть картинки облика (выбирает пользователь)
    primary: { fill: { colors: ['#8B7DFF', '#4FD0FF'], angle: 120 }, text: '#06071A' }, // theme-exempt: облик карточки профиля — коллекционный арт, цвета часть картинки облика (выбирает пользователь)
    glassBody: false,
  },
  neon: {
    bg: '#07030D', coin: 156, edge: 'rgba(0,229,255,0.55)', edgeWidth: 1.5, // theme-exempt: облик карточки профиля — коллекционный арт, цвета часть картинки облика (выбирает пользователь)
    title: '#FFFFFF', titleGlow: 'rgba(255,79,163,0.6)', ...WHITE_RANK, // theme-exempt: облик карточки профиля — коллекционный арт, цвета часть картинки облика (выбирает пользователь)
    badge: { fill: { colors: ['#00E5FF', '#00E5FF'], angle: 90 }, text: '#07030D', radius: 12 }, // theme-exempt: облик карточки профиля — коллекционный арт, цвета часть картинки облика (выбирает пользователь)
    primary: { fill: { colors: ['#00E5FF', '#FF4FA3'], angle: 100 }, text: '#07030D' }, // theme-exempt: облик карточки профиля — коллекционный арт, цвета часть картинки облика (выбирает пользователь)
    glassBody: false,
  },
};

/** CSS-угол linear-gradient → start/end для expo-linear-gradient (0..1). */
export function gradientPoints(angle: number): Readonly<{ start: { x: number; y: number }; end: { x: number; y: number } }> {
  const rad = ((angle - 90) * Math.PI) / 180;
  const dx = Math.cos(rad) / 2;
  const dy = Math.sin(rad) / 2;
  return { start: { x: 0.5 - dx, y: 0.5 - dy }, end: { x: 0.5 + dx, y: 0.5 + dy } };
}
