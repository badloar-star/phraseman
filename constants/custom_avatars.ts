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
  image?: ImageSourcePropType;
  imageBlack?: ImageSourcePropType;
  imageWhite?: ImageSourcePropType;
};

const CUSTOM_AVATAR_LABELS: Record<string, { ru: string; uk: string; es: string }> = {
  'custom-gen-01': { ru: 'Астральный архимаг', uk: 'Астральний архімаг', es: 'Archimago astral' },
  'custom-gen-02': { ru: 'Рунный оракул', uk: 'Рунний оракул', es: 'Oráculo rúnico' },
  'custom-gen-03': { ru: 'Верховный ученый', uk: 'Верховний учений', es: 'Gran erudito' },
  'custom-gen-04': { ru: 'Лунная провидица', uk: 'Місячна провидиця', es: 'Vidente lunar' },
  'custom-gen-05': { ru: 'Архонт голоса', uk: 'Архонт голосу', es: 'Arconte de voz' },
  'custom-gen-06': { ru: 'Алхимик разума', uk: 'Алхімік розуму', es: 'Alquimista mental' },
  'custom-gen-07': { ru: 'Странствующий мудрец', uk: 'Мандрівний мудрець', es: 'Sabio errante' },
  'custom-gen-08': { ru: 'Оракул слов', uk: 'Оракул слів', es: 'Oráculo de palabras' },
  'custom-gen-09': { ru: 'Философ-магистр', uk: 'Філософ-магістр', es: 'Filósofo magíster' },
  'custom-gen-10': { ru: 'Гранд-библиотекарь', uk: 'Гранд-бібліотекар', es: 'Gran bibliotecario' },
  'custom-01': { ru: 'Летописец', uk: 'Літописець', es: 'Cronista' },
  'custom-02': { ru: 'Переводчик', uk: 'Перекладач', es: 'Traductor' },
  'custom-03': { ru: 'Кодекс', uk: 'Кодекс', es: 'Códice' },
  'custom-04': { ru: 'Муза знаний', uk: 'Муза знань', es: 'Musa del saber' },
  'custom-05': { ru: 'Атлас', uk: 'Атлас', es: 'Atlas' },
  'custom-06': { ru: 'Алфавит', uk: 'Алфавіт', es: 'Alfabeto' },
  'custom-07': { ru: 'Архивариус', uk: 'Архіваріус', es: 'Archivista' },
  'custom-08': { ru: 'Свиток', uk: 'Сувій', es: 'Pergamino' },
  'custom-09': { ru: 'Философ', uk: 'Філософ', es: 'Filósofo' },
  'custom-10': { ru: 'Афина', uk: 'Афіна', es: 'Atenea' },
  'custom-11': { ru: 'Библиотека', uk: 'Бібліотека', es: 'Biblioteca' },
  'custom-12': { ru: 'Черная библиотека', uk: 'Чорна бібліотека', es: 'Biblioteca negra' },
  'custom-13': { ru: 'Исследователь', uk: 'Дослідник', es: 'Investigador' },
  'custom-14': { ru: 'Перо закона', uk: 'Перо закону', es: 'Pluma de ley' },
  'custom-15': { ru: 'Оракул', uk: 'Оракул', es: 'Oráculo' },
  'custom-16': { ru: 'Голос', uk: 'Голос', es: 'Voz' },
  'custom-17': { ru: 'Сенатор', uk: 'Сенатор', es: 'Senador' },
  'custom-18': { ru: 'Аудиомаг', uk: 'Аудіомаг', es: 'Audiomago' },
  'custom-19': { ru: 'Выпускник', uk: 'Випускник', es: 'Graduado' },
  'custom-20': { ru: 'Детектив', uk: 'Детектив', es: 'Detective' },
  'custom-21': { ru: 'Тайная книга', uk: 'Таємна книга', es: 'Libro secreto' },
  'custom-22': { ru: 'Академия', uk: 'Академія', es: 'Academia' },
  'custom-23': { ru: 'Провидица', uk: 'Провидиця', es: 'Vidente' },
  'custom-24': { ru: 'Мудрец', uk: 'Мудрець', es: 'Sabio' },
  'custom-25': { ru: 'Верховный мудрец', uk: 'Верховний мудрець', es: 'Gran sabio' },
  'custom-26': { ru: 'Юный маг', uk: 'Юний маг', es: 'Joven mago' },
  'custom-27': { ru: 'Писательница', uk: 'Письменниця', es: 'Escritora' },
  'custom-28': { ru: 'Ученая', uk: 'Вчена', es: 'Erudita' },
  'custom-29': { ru: 'Патриций', uk: 'Патрицій', es: 'Patricio' },
  'custom-30': { ru: 'Оратор', uk: 'Оратор', es: 'Orador' },
  'custom-31': { ru: 'Магистр', uk: 'Магістр', es: 'Magíster' },
  'custom-32': { ru: 'Жрица слов', uk: 'Жриця слів', es: 'Sacerdotisa' },
  'custom-33': { ru: 'Хранительница', uk: 'Хранителька', es: 'Guardiana' },
  'custom-34': { ru: 'Читательница', uk: 'Читачка', es: 'Lectora' },
  'custom-35': { ru: 'Ученица звезд', uk: 'Учениця зірок', es: 'Alumna estelar' },
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
  {
    id: 'custom-gen-01',
    name: 'Astral Archmage',
  },
  {
    id: 'custom-gen-02',
    name: 'Runic Oracle',
  },
  {
    id: 'custom-gen-03',
    name: 'Grand Scholar',
  },
  {
    id: 'custom-gen-04',
    name: 'Moon Seer',
  },
  {
    id: 'custom-gen-05',
    name: 'Voice Archon',
  },
  {
    id: 'custom-gen-06',
    name: 'Mind Alchemist',
  },
  {
    id: 'custom-gen-07',
    name: 'Wandering Sage',
  },
  {
    id: 'custom-gen-08',
    name: 'Word Oracle',
  },
  {
    id: 'custom-gen-09',
    name: 'Philosopher Magister',
  },
  {
    id: 'custom-gen-10',
    name: 'Grand Librarian',
  },
  { id: 'custom-01', name: 'Chronicler', image: require('../assets/images/avatars/custom-01-logo.webp') },
  { id: 'custom-02', name: 'Translator', image: require('../assets/images/avatars/custom-02-logo.webp') },
  { id: 'custom-03', name: 'Codex', image: require('../assets/images/avatars/custom-03-logo.webp') },
  { id: 'custom-04', name: 'Muse of Knowledge', image: require('../assets/images/avatars/custom-04-logo.webp') },
  { id: 'custom-05', name: 'Atlas', image: require('../assets/images/avatars/custom-05-logo.webp') },
  { id: 'custom-06', name: 'Alphabet', image: require('../assets/images/avatars/custom-06-logo.webp') },
  { id: 'custom-07', name: 'Archivist', image: require('../assets/images/avatars/custom-07-logo.webp') },
  { id: 'custom-08', name: 'Scroll', image: require('../assets/images/avatars/custom-08-logo.webp') },
  { id: 'custom-09', name: 'Philosopher', image: require('../assets/images/avatars/custom-09-logo.webp') },
  { id: 'custom-10', name: 'Athena', image: require('../assets/images/avatars/custom-10-logo.webp') },
  { id: 'custom-11', name: 'Library', image: require('../assets/images/avatars/custom-11-logo.webp') },
  { id: 'custom-12', name: 'Black Library', image: require('../assets/images/avatars/custom-12-logo.webp') },
  { id: 'custom-13', name: 'Investigator', image: require('../assets/images/avatars/custom-13-logo.webp') },
  { id: 'custom-14', name: 'Law Quill', image: require('../assets/images/avatars/custom-14-logo.webp') },
  { id: 'custom-15', name: 'Oracle', image: require('../assets/images/avatars/custom-15-logo.webp') },
  { id: 'custom-16', name: 'Voice', image: require('../assets/images/avatars/custom-16-logo.webp') },
  { id: 'custom-17', name: 'Senator', image: require('../assets/images/avatars/custom-17-logo.webp') },
  { id: 'custom-18', name: 'Audiomage', image: require('../assets/images/avatars/custom-18-logo.webp') },
  { id: 'custom-19', name: 'Graduate', image: require('../assets/images/avatars/custom-19-logo.webp') },
  { id: 'custom-20', name: 'Detective', image: require('../assets/images/avatars/custom-20-logo.webp') },
  { id: 'custom-21', name: 'Secret Book', image: require('../assets/images/avatars/custom-21-logo.webp') },
  { id: 'custom-22', name: 'Academy', image: require('../assets/images/avatars/custom-22-logo.webp') },
  { id: 'custom-23', name: 'Seer', image: require('../assets/images/avatars/custom-23-logo.webp') },
  { id: 'custom-24', name: 'Sage', image: require('../assets/images/avatars/custom-24-logo.webp') },
  { id: 'custom-25', name: 'Grand Sage', image: require('../assets/images/avatars/custom-25-logo.webp') },
  { id: 'custom-26', name: 'Young Mage', image: require('../assets/images/avatars/custom-26-logo.webp') },
  { id: 'custom-27', name: 'Writer', image: require('../assets/images/avatars/custom-27-logo.webp') },
  { id: 'custom-28', name: 'Scholar', image: require('../assets/images/avatars/custom-28-logo.webp') },
  { id: 'custom-29', name: 'Patrician', image: require('../assets/images/avatars/custom-29-logo.webp') },
  { id: 'custom-30', name: 'Orator', image: require('../assets/images/avatars/custom-30-logo.webp') },
  { id: 'custom-31', name: 'Magister', image: require('../assets/images/avatars/custom-31-logo.webp') },
  { id: 'custom-32', name: 'Word Priestess', image: require('../assets/images/avatars/custom-32-logo.webp') },
  { id: 'custom-33', name: 'Guardian', image: require('../assets/images/avatars/custom-33-logo.webp') },
  { id: 'custom-34', name: 'Reader', image: require('../assets/images/avatars/custom-34-logo.webp') },
  { id: 'custom-35', name: 'Star Student', image: require('../assets/images/avatars/custom-35-logo.webp') },
];

export const CUSTOM_AVATAR_SHOP: CustomAvatarDef[] = CUSTOM_AVATARS.filter((avatar) =>
  avatar.id.startsWith('custom-gen-'),
);

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

