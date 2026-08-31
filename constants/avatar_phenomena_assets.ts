import type { ImageSourcePropType } from 'react-native';
import {
  CUSTOM_AVATAR_ASSET_BASE_URL,
  type CustomAvatarLogoColor,
} from './custom_avatar_asset_host';

export const AVATAR_PHENOMENA_ART_VERSION = 'phenomena-v1' as const;
export const AVATAR_PHENOMENA_ASSET_FOLDER = 'avatar-phenomena-v1' as const;

export type AvatarPhenomenaCatalogEntry = Readonly<{
  name: string;
  labelRu: string;
  price: number;
  collection: typeof AVATAR_PHENOMENA_ART_VERSION;
  black: ImageSourcePropType;
  white: ImageSourcePropType;
}>;

export function avatarPhenomenaAssetSource(
  id: string,
  ink: CustomAvatarLogoColor,
): ImageSourcePropType {
  return {
    uri: `${CUSTOM_AVATAR_ASSET_BASE_URL}/${AVATAR_PHENOMENA_ASSET_FOLDER}/${id}-${ink}.webp`,
  };
}

function entry(
  id: string,
  name: string,
  labelRu: string,
  price: number,
): AvatarPhenomenaCatalogEntry {
  return Object.freeze({
    name,
    labelRu,
    price,
    collection: AVATAR_PHENOMENA_ART_VERSION,
    black: avatarPhenomenaAssetSource(id, 'black'),
    white: avatarPhenomenaAssetSource(id, 'white'),
  });
}

export const AVATAR_PHENOMENA_CATALOG: Readonly<Record<string, AvatarPhenomenaCatalogEntry>> = Object.freeze({
  'custom-phen-01': { ...entry('custom-phen-01', 'Spark Rain', 'Первая искра', 70) },
  'custom-phen-02': { ...entry('custom-phen-02', 'Wind Spiral', 'Ветер перемен', 70) },
  'custom-phen-03': { ...entry('custom-phen-03', 'Dawn Halo', 'Рассветная ясность', 70) },
  'custom-phen-04': { ...entry('custom-phen-04', 'Ball Lightning', 'Заряд мысли', 100) },
  'custom-phen-05': { ...entry('custom-phen-05', 'Moonbow', 'Лунный спектр', 100) },
  'custom-phen-06': { ...entry('custom-phen-06', 'Fire Rainbow', 'Небесный импульс', 100) },
  'custom-phen-07': { ...entry('custom-phen-07', 'Aurora Vortex', 'Полярное вдохновение', 150) },
  'custom-phen-08': { ...entry('custom-phen-08', 'Volcanic Lightning', 'Грозовая воля', 150) },
  'custom-phen-09': { ...entry('custom-phen-09', 'Diamond Dust', 'Алмазная тишина', 150) },
  'custom-phen-10': { ...entry('custom-phen-10', 'Total Eclipse', 'Момент затмения', 300) },
  'custom-phen-11': { ...entry('custom-phen-11', 'Supercell Core', 'Небесный натиск', 300) },
  'custom-phen-12': { ...entry('custom-phen-12', 'Meteor Storm', 'Звёздный дождь', 300) },
  'custom-phen-13': { ...entry('custom-phen-13', 'Crimson Nebula', 'Багровое рождение', 500) },
  'custom-phen-14': { ...entry('custom-phen-14', 'Pulsar Crown', 'Ритм пульсара', 500) },
  'custom-phen-15': { ...entry('custom-phen-15', 'Magnetar Flare', 'Магнитная буря', 500) },
  'custom-phen-16': { ...entry('custom-phen-16', 'Reality Rift', 'За гранью', 1000) },
  'custom-phen-17': { ...entry('custom-phen-17', 'Heart of the Abyss', 'Сердце бездны', 1000) },
  'custom-phen-18': { ...entry('custom-phen-18', 'Time Fracture', 'Вне времени', 1000) },
});

export const AVATAR_PHENOMENA_CATALOG_IDS = Object.freeze(Object.keys(AVATAR_PHENOMENA_CATALOG));
