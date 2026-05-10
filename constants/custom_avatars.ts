import type { ImageSourcePropType } from 'react-native';

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

