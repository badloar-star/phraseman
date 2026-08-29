// зачем: базовый адрес арта аватаров вынесен из custom_avatars.ts, чтобы каталог
// Avatar100 мог им пользоваться без кольцевого импорта (custom_avatars импортирует
// avatar100_assets, а тому нужен только адрес хоста, а не весь каталог).

export type CustomAvatarLogoColor = 'black' | 'white';

// Арт кастомных аватаров раздаётся со статического таргета админки, а не встраивается
// в каждый мобильный бинарник. React Native качает только реально показанную картинку
// и держит её в кэше платформы для следующих кадров.
export const CUSTOM_AVATAR_ASSET_BASE_URL = 'https://phraseman-ea0b3.web.app/avatars';
