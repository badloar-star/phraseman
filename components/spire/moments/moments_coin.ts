// зачем (координатор 14.10): анимированного персонажа-монету (sleep / peek / wake / cheer, эмоции) делает Авторизация общим компонентом components/moments/MomentCoin.tsx.
// Свою монету не делаем: все моменты Пика берут её отсюда. Пока общего файла нет — временная статичная монета с тем же интерфейсом пропсов;
// когда MomentCoin появится в HEAD, меняется ровно эта строка (re-export).
export { default as MomentCoin } from './MomentCoinStub';
export type { MomentCoinProps, MomentCoinMood } from './MomentCoinStub';
