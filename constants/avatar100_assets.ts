import type { ImageSourcePropType } from 'react-native';
import {
  CUSTOM_AVATAR_ASSET_BASE_URL,
  type CustomAvatarLogoColor,
} from './custom_avatar_asset_host';

export type Avatar100CatalogEntry = Readonly<{
  name: string;
  labelRu: string;
  price: number;
  black: ImageSourcePropType;
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
  return {
    uri: `${CUSTOM_AVATAR_ASSET_BASE_URL}/${AVATAR100_ASSET_FOLDER}/custom-idea-${numericId}-${ink}.webp`,
  };
}

export const AVATAR100_CATALOG: Readonly<Record<string, Avatar100CatalogEntry>> = Object.freeze({
  'custom-gen-73': { name: 'Moss-Eared Pandafox', labelRu: 'Дружелюбный исследователь', price: 70, black: avatar100AssetSource(73, 'black'), white: avatar100AssetSource(73, 'white') },
  'custom-gen-75': { name: 'Prismtail Storybird', labelRu: 'Выразительный рассказчик', price: 70, black: avatar100AssetSource(75, 'black'), white: avatar100AssetSource(75, 'white') },
  'custom-gen-76': { name: 'Petalplate Pangopup', labelRu: 'Последовательный мастер', price: 70, black: avatar100AssetSource(76, 'black'), white: avatar100AssetSource(76, 'white') },
  'custom-gen-77': { name: 'Velvet Orchid Lynxlet', labelRu: 'Чуткий слушатель', price: 70, black: avatar100AssetSource(77, 'black'), white: avatar100AssetSource(77, 'white') },
  'custom-gen-81': { name: 'Emberpaw Tigerling', labelRu: 'Смелый практик', price: 70, black: avatar100AssetSource(81, 'black'), white: avatar100AssetSource(81, 'white') },
  'custom-gen-83': { name: 'Glasswhisker Snowcat', labelRu: 'Точный охотник за смыслом', price: 100, black: avatar100AssetSource(83, 'black'), white: avatar100AssetSource(83, 'white') },
  'custom-gen-86': { name: 'Sunfeather Echo Parrot', labelRu: 'Яркий коммуникатор', price: 100, black: avatar100AssetSource(86, 'black'), white: avatar100AssetSource(86, 'white') },
  'custom-gen-87': { name: 'Deepbell Moon Bat', labelRu: 'Глубокий слушатель', price: 100, black: avatar100AssetSource(87, 'black'), white: avatar100AssetSource(87, 'white') },
  'custom-gen-88': { name: 'Branchcrest Raccoowl', labelRu: 'Уверенный маршрут', price: 100, black: avatar100AssetSource(88, 'black'), white: avatar100AssetSource(88, 'white') },
  'custom-gen-89': { name: 'Ribbon-Tail Lemurfox', labelRu: 'Гибкий переключатель', price: 100, black: avatar100AssetSource(89, 'black'), white: avatar100AssetSource(89, 'white') },
  'custom-gen-92': { name: 'Quartz-Ear Shadow Lynx', labelRu: 'Острый слух', price: 100, black: avatar100AssetSource(92, 'black'), white: avatar100AssetSource(92, 'white') },
  'custom-gen-93': { name: 'Night Lantern Cave Bat', labelRu: 'Свет в глубине', price: 150, black: avatar100AssetSource(93, 'black'), white: avatar100AssetSource(93, 'white') },
  'custom-gen-94': { name: 'Frostshell Sabercub', labelRu: 'Холодная выдержка', price: 150, black: avatar100AssetSource(94, 'black'), white: avatar100AssetSource(94, 'white') },
  'custom-gen-96': { name: 'Leafveil Foxmoth', labelRu: 'Тонкая интуиция', price: 150, black: avatar100AssetSource(96, 'black'), white: avatar100AssetSource(96, 'white') },
  'custom-gen-99': { name: 'Inkstripe Shadow Genet', labelRu: 'Редкий почерк', price: 150, black: avatar100AssetSource(99, 'black'), white: avatar100AssetSource(99, 'white') },
  'custom-gen-101': { name: 'Starglass Owlmoth', labelRu: 'Ночная ясность', price: 150, black: avatar100AssetSource(101, 'black'), white: avatar100AssetSource(101, 'white') },
  'custom-gen-102': { name: 'Pearlcloak Dragonfox', labelRu: 'Скрытая жемчужина', price: 150, black: avatar100AssetSource(102, 'black'), white: avatar100AssetSource(102, 'white') },
  'custom-gen-103': { name: 'Titan Crystalback Direwolf', labelRu: 'Легенда глубины', price: 300, black: avatar100AssetSource(103, 'black'), white: avatar100AssetSource(103, 'white') },
  'custom-gen-104': { name: 'Solar-Mane Moonlion', labelRu: 'Король уверенности', price: 300, black: avatar100AssetSource(104, 'black'), white: avatar100AssetSource(104, 'white') },
  'custom-gen-105': { name: 'Paradise Sailwing', labelRu: 'Райская свобода', price: 300, black: avatar100AssetSource(105, 'black'), white: avatar100AssetSource(105, 'white') },
  'custom-gen-106': { name: 'Golden Ribbon Tigermarten', labelRu: 'Золотой поток', price: 300, black: avatar100AssetSource(106, 'black'), white: avatar100AssetSource(106, 'white') },
  'custom-gen-107': { name: 'Moonplume Snow Owlcat', labelRu: 'Снежное озарение', price: 300, black: avatar100AssetSource(107, 'black'), white: avatar100AssetSource(107, 'white') },
  'custom-gen-108': { name: 'Silent Thorn Panther', labelRu: 'Тихая решимость', price: 300, black: avatar100AssetSource(108, 'black'), white: avatar100AssetSource(108, 'white') },
  'custom-gen-109': { name: 'Stormneedle Scorpion Shrike', labelRu: 'Мгновенный фокус', price: 300, black: avatar100AssetSource(109, 'black'), white: avatar100AssetSource(109, 'white') },
  'custom-gen-111': { name: 'Mirror-Ear Sandfox', labelRu: 'Лисья находчивость', price: 300, black: avatar100AssetSource(111, 'black'), white: avatar100AssetSource(111, 'white') },
  'custom-gen-112': { name: 'Skyglass Crown Pandamoth', labelRu: 'Высшее равновесие', price: 300, black: avatar100AssetSource(112, 'black'), white: avatar100AssetSource(112, 'white') },
  'custom-gen-114': { name: 'Needleblade Orchid Mantis', labelRu: 'Идеальная точность', price: 500, black: avatar100AssetSource(114, 'black'), white: avatar100AssetSource(114, 'white') },
  'custom-gen-118': { name: 'Frostmane Direcat', labelRu: 'Северная воля', price: 500, black: avatar100AssetSource(118, 'black'), white: avatar100AssetSource(118, 'white') },
  'custom-gen-120': { name: 'Moonglass Thorn Lynx', labelRu: 'Совершенная адаптация', price: 500, black: avatar100AssetSource(120, 'black'), white: avatar100AssetSource(120, 'white') },
  'custom-gen-123': { name: 'Cathedral Resonance Gryphon', labelRu: 'Песня вершины', price: 1000, black: avatar100AssetSource(123, 'black'), white: avatar100AssetSource(123, 'white') },
  'custom-gen-124': { name: 'Solar Crown Eclipse Chimera', labelRu: 'Абсолютная сила', price: 1000, black: avatar100AssetSource(124, 'black'), white: avatar100AssetSource(124, 'white') },
});

export const AVATAR100_CATALOG_IDS = Object.freeze(Object.keys(AVATAR100_CATALOG));
