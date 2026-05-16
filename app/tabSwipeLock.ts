import { makeMutable } from 'react-native-reanimated';

// SharedValue — читается и пишется как с JS-потока, так и из worklet\'ов на UI-потоке.
// Ставится в true пока вложенный горизонтальный ScrollView скроллится,
// чтобы TabSlider не перехватывал жест.
export const tabSwipeLocked = makeMutable(false);

// Обратная совместимость для старых мест где пишут tabSwipeLock.blocked = true/false
export const tabSwipeLock = {
  get blocked() { return tabSwipeLocked.value; },
  set blocked(v: boolean) { tabSwipeLocked.value = v; },
};

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
