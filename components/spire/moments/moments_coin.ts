// зачем (координатор 14.10): анимированную монету (sleep / peek / cheer / nod, эмоции, облачка) делает Авторизация общим компонентом components/moments/MomentCoin.tsx (в HEAD b7a21c7d4).
// Свою монету не делаем: все моменты Пика берут её отсюда — одна точка подмены.
export { default as MomentCoin } from '../../moments/MomentCoin';
export type { MomentCoinProps, MomentCoinMood } from '../../moments/MomentCoin';
