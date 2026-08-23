// зачем: выбор в студии полностью локальный и мгновенный (Optimistic UI без
// сервера вообще): сохранение = запись в AsyncStorage, ноль Firestore.
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Avatar25dSelection {
  readonly base: string;
  readonly hair: string | null;
  readonly headwear: string | null;
  readonly outfit: string | null;
  readonly accessory: string | null;
  readonly eyes: string | null;
  readonly skin: string | null;
  readonly emotion: string | null;
}

export const AVATAR_25D_DEFAULT_SELECTION: Avatar25dSelection = {
  base: 'base_m',
  hair: null,
  headwear: null,
  outfit: null,
  accessory: null,
  eyes: null,
  skin: null,
  emotion: null,
};

const STORAGE_KEY = '@avatar25d_selection_v1';

export async function loadAvatar25dSelection(): Promise<Avatar25dSelection> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return AVATAR_25D_DEFAULT_SELECTION;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return AVATAR_25D_DEFAULT_SELECTION;
    return { ...AVATAR_25D_DEFAULT_SELECTION, ...(parsed as Partial<Avatar25dSelection>) };
  } catch {
    return AVATAR_25D_DEFAULT_SELECTION;
  }
}

export async function saveAvatar25dSelection(selection: Avatar25dSelection): Promise<boolean> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(selection));
    return true;
  } catch {
    return false;
  }
}
