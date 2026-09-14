import type { ImageSourcePropType } from 'react-native';
import {
  CUSTOM_AVATAR_ASSET_BASE_URL,
  type CustomAvatarLogoColor,
} from './custom_avatar_asset_host';

export type Avatar100CatalogEntry = Readonly<{
  name: string;
  labelRu: string;
  price: number;
  white: ImageSourcePropType;
}>;

/** Папка одобренных рендеров Avatar100 на статическом хостинге. */
export const AVATAR100_ASSET_FOLDER = 'avatar100-v1' as const;

// зачем: арт аватаров намеренно НЕ встраивается в бинарник — папка admin/ закрыта
// от бандлера, а RN качает только реально показанную картинку и держит её в кэше
// платформы. Literal require() отсюда роняет сборку ("Unable to resolve module")
// и утяжелил бы APK на ~10 МБ против «Бандл-диеты». Новый арт лежит в отдельной
// папке avatar100-v1, поэтому НЕ затирает прежние картинки по обычному пути —
// именно их продолжают видеть люди, купившие аватары до Avatar100.
export function avatar100AssetSource(
  numericId: number,
  ink: CustomAvatarLogoColor,
): ImageSourcePropType {
  // Yin/black artwork was retired. Keep the parameter only as a compatibility
  // boundary for old callers and always resolve to the sole light asset.
  void ink;
  return {
    uri: `${CUSTOM_AVATAR_ASSET_BASE_URL}/${AVATAR100_ASSET_FOLDER}/custom-idea-${numericId}-white.webp`,
  };
}

export const AVATAR100_CATALOG: Readonly<Record<string, Avatar100CatalogEntry>> = Object.freeze({
  'custom-gen-94': { name: 'Frostshell Sabercub', labelRu: 'Холодная выдержка', price: 150, white: avatar100AssetSource(94, 'white') },
  'custom-gen-101': { name: 'Starglass Owlmoth', labelRu: 'Ночная ясность', price: 150, white: avatar100AssetSource(101, 'white') },
  'custom-gen-102': { name: 'Pearlcloak Dragonfox', labelRu: 'Скрытая жемчужина', price: 150, white: avatar100AssetSource(102, 'white') },
  'custom-gen-112': { name: 'Skyglass Crown Pandamoth', labelRu: 'Высшее равновесие', price: 300, white: avatar100AssetSource(112, 'white') },
});

export const AVATAR100_CATALOG_IDS = Object.freeze(Object.keys(AVATAR100_CATALOG));
