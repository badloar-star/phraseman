import type { ImageSourcePropType } from 'react-native';
import type { Lang } from './i18n';

export const CUSTOM_AVATAR_BUY_COST = 50;
export const CUSTOM_AVATAR_RESTYLE_COST = 10;
export const CUSTOM_AVATAR_OWNED_KEY = 'custom_avatar_owned_v1';

export type CustomAvatarGradient = {
  id: string;
  name: string;
  colors: readonly [string, string, string];
};

export type CustomAvatarLogoColor = 'black' | 'white';

export type CustomAvatarDef = {
  id: string;
  name: string;
  image: ImageSourcePropType;
};

const CUSTOM_AVATAR_LABELS: Record<string, { ru: string; uk: string; es: string }> = {
  'custom-01': { ru: 'Аватар 01', uk: 'Аватар 01', es: 'Avatar 01' },
  'custom-02': { ru: 'Аватар 02', uk: 'Аватар 02', es: 'Avatar 02' },
  'custom-03': { ru: 'Аватар 03', uk: 'Аватар 03', es: 'Avatar 03' },
  'custom-04': { ru: 'Аватар 04', uk: 'Аватар 04', es: 'Avatar 04' },
  'custom-05': { ru: 'Аватар 05', uk: 'Аватар 05', es: 'Avatar 05' },
  'custom-06': { ru: 'Аватар 06', uk: 'Аватар 06', es: 'Avatar 06' },
  'custom-07': { ru: 'Аватар 07', uk: 'Аватар 07', es: 'Avatar 07' },
  'custom-08': { ru: 'Аватар 08', uk: 'Аватар 08', es: 'Avatar 08' },
  'custom-09': { ru: 'Аватар 09', uk: 'Аватар 09', es: 'Avatar 09' },
  'custom-10': { ru: 'Аватар 10', uk: 'Аватар 10', es: 'Avatar 10' },
  'custom-11': { ru: 'Аватар 11', uk: 'Аватар 11', es: 'Avatar 11' },
  'custom-12': { ru: 'Аватар 12', uk: 'Аватар 12', es: 'Avatar 12' },
  'custom-13': { ru: 'Аватар 13', uk: 'Аватар 13', es: 'Avatar 13' },
  'custom-14': { ru: 'Аватар 14', uk: 'Аватар 14', es: 'Avatar 14' },
  'custom-15': { ru: 'Аватар 15', uk: 'Аватар 15', es: 'Avatar 15' },
  'custom-16': { ru: 'Аватар 16', uk: 'Аватар 16', es: 'Avatar 16' },
  'custom-17': { ru: 'Аватар 17', uk: 'Аватар 17', es: 'Avatar 17' },
  'custom-18': { ru: 'Аватар 18', uk: 'Аватар 18', es: 'Avatar 18' },
  'custom-19': { ru: 'Аватар 19', uk: 'Аватар 19', es: 'Avatar 19' },
  'custom-20': { ru: 'Аватар 20', uk: 'Аватар 20', es: 'Avatar 20' },
};

const CUSTOM_AVATAR_GRADIENT_LABELS: Record<string, { ru: string; uk: string; es: string }> = {
  aurora: { ru: 'Аврора', uk: 'Аврора', es: 'Aurora' },
  ember: { ru: 'Искра', uk: 'Іскра', es: 'Brasa' },
  cosmic: { ru: 'Космос', uk: 'Космос', es: 'Cósmico' },
  forest: { ru: 'Лес', uk: 'Ліс', es: 'Bosque' },
  citrine: { ru: 'Цитрин', uk: 'Цитрин', es: 'Citrino' },
  royal: { ru: 'Королевский', uk: 'Королівський', es: 'Real' },
  ruby: { ru: 'Рубин', uk: 'Рубін', es: 'Rubí' },
  magma: { ru: 'Магма', uk: 'Магма', es: 'Magma' },
  noirgold: { ru: 'Черное золото', uk: 'Чорне золото', es: 'Oro negro' },
  sakura: { ru: 'Сакура', uk: 'Сакура', es: 'Sakura' },
};

export const CUSTOM_AVATAR_GRADIENTS: CustomAvatarGradient[] = [
  { id: 'aurora', name: 'Aurora', colors: ['#02E4C0', '#0EA5E9', '#7C3AED'] },
  { id: 'ember', name: 'Ember', colors: ['#FF4D3D', '#FF8A1F', '#FACC15'] },
  { id: 'cosmic', name: 'Cosmic', colors: ['#7C3AED', '#EC4899', '#F97316'] },
  { id: 'forest', name: 'Forest', colors: ['#14532D', '#22C55E', '#A3E635'] },
  { id: 'citrine', name: 'Citrine', colors: ['#FDE047', '#FB7185', '#F97316'] },
  { id: 'royal', name: 'Royal', colors: ['#312E81', '#7C3AED', '#F0ABFC'] },
  { id: 'ruby', name: 'Ruby', colors: ['#FB7185', '#BE123C', '#581C87'] },
  { id: 'magma', name: 'Magma', colors: ['#111827', '#DC2626', '#F97316'] },
  { id: 'noirgold', name: 'Noir Gold', colors: ['#111827', '#B45309', '#FDE68A'] },
  { id: 'sakura', name: 'Sakura', colors: ['#F9A8D4', '#F472B6', '#FB7185'] },
];

export const CUSTOM_AVATARS: CustomAvatarDef[] = [
  { id: 'custom-01', name: 'Custom 01', image: require('../assets/images/avatars/custom-01-logo.webp') },
  { id: 'custom-02', name: 'Custom 02', image: require('../assets/images/avatars/custom-02-logo.webp') },
  { id: 'custom-03', name: 'Custom 03', image: require('../assets/images/avatars/custom-03-logo.webp') },
  { id: 'custom-04', name: 'Custom 04', image: require('../assets/images/avatars/custom-04-logo.webp') },
  { id: 'custom-05', name: 'Custom 05', image: require('../assets/images/avatars/custom-05-logo.webp') },
  { id: 'custom-06', name: 'Custom 06', image: require('../assets/images/avatars/custom-06-logo.webp') },
  { id: 'custom-07', name: 'Custom 07', image: require('../assets/images/avatars/custom-07-logo.webp') },
  { id: 'custom-08', name: 'Custom 08', image: require('../assets/images/avatars/custom-08-logo.webp') },
  { id: 'custom-09', name: 'Custom 09', image: require('../assets/images/avatars/custom-09-logo.webp') },
  { id: 'custom-10', name: 'Custom 10', image: require('../assets/images/avatars/custom-10-logo.webp') },
  { id: 'custom-11', name: 'Custom 11', image: require('../assets/images/avatars/custom-11-logo.webp') },
  { id: 'custom-12', name: 'Custom 12', image: require('../assets/images/avatars/custom-12-logo.webp') },
  { id: 'custom-13', name: 'Custom 13', image: require('../assets/images/avatars/custom-13-logo.webp') },
  { id: 'custom-14', name: 'Custom 14', image: require('../assets/images/avatars/custom-14-logo.webp') },
  { id: 'custom-15', name: 'Custom 15', image: require('../assets/images/avatars/custom-15-logo.webp') },
  { id: 'custom-16', name: 'Custom 16', image: require('../assets/images/avatars/custom-16-logo.webp') },
  { id: 'custom-17', name: 'Custom 17', image: require('../assets/images/avatars/custom-17-logo.webp') },
  { id: 'custom-18', name: 'Custom 18', image: require('../assets/images/avatars/custom-18-logo.webp') },
  { id: 'custom-19', name: 'Custom 19', image: require('../assets/images/avatars/custom-19-logo.webp') },
  { id: 'custom-20', name: 'Custom 20', image: require('../assets/images/avatars/custom-20-logo.webp') },
];

export type CustomAvatarValue = {
  avatarId: string;
  gradientId: string;
  logoColor: CustomAvatarLogoColor;
};

export function makeCustomAvatarValue(
  avatarId: string,
  gradientId: string,
  logoColor: CustomAvatarLogoColor = 'black',
): string {
  return `custom:${avatarId}:${gradientId}:${logoColor}`;
}

export function parseCustomAvatarValue(value?: string | null): CustomAvatarValue | null {
  if (!value) return null;
  const parts = String(value).split(':');
  if ((parts.length !== 3 && parts.length !== 4) || parts[0] !== 'custom') return null;
  const avatarId = parts[1];
  const gradientId = parts[2];
  const logoColor = parts[3] === 'white' ? 'white' : 'black';
  if (!getCustomAvatarById(avatarId)) return null;
  return {
    avatarId,
    gradientId: getCustomAvatarGradientById(gradientId)?.id ?? CUSTOM_AVATAR_GRADIENTS[0].id,
    logoColor,
  };
}

export function isCustomAvatarValue(value?: string | null): boolean {
  return parseCustomAvatarValue(value) !== null;
}

export function getCustomAvatarById(id: string): CustomAvatarDef | undefined {
  return CUSTOM_AVATARS.find((avatar) => avatar.id === id);
}

export function getCustomAvatarGradientById(id: string): CustomAvatarGradient | undefined {
  return CUSTOM_AVATAR_GRADIENTS.find((gradient) => gradient.id === id);
}

export function customAvatarNameForLang(avatar: CustomAvatarDef | string | undefined | null, lang: Lang): string {
  const id = typeof avatar === 'string' ? avatar : avatar?.id;
  const fallback = typeof avatar === 'string' ? avatar : avatar?.name;
  const label = id ? CUSTOM_AVATAR_LABELS[id] : undefined;
  return label?.[lang] ?? label?.ru ?? fallback ?? '';
}

export function customAvatarGradientNameForLang(
  gradient: CustomAvatarGradient | string | undefined | null,
  lang: Lang,
): string {
  const id = typeof gradient === 'string' ? gradient : gradient?.id;
  const fallback = typeof gradient === 'string' ? gradient : gradient?.name;
  const label = id ? CUSTOM_AVATAR_GRADIENT_LABELS[id] : undefined;
  return label?.[lang] ?? label?.ru ?? fallback ?? '';
}

export function customAvatarGiftLabelForLang(
  avatar: CustomAvatarDef,
  gradient: CustomAvatarGradient,
  lang: Lang,
): string {
  return `${customAvatarNameForLang(avatar, lang)} - ${customAvatarGradientNameForLang(gradient, lang)}`;
}

