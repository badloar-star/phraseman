import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Avatar3DP0DNA } from './contracts';

export const AVATAR_3D_DNA_STORAGE_KEY = 'avatar_dna_human_v2';

export async function saveAvatar3DDNA(dna: Avatar3DP0DNA): Promise<void> {
  await AsyncStorage.setItem(AVATAR_3D_DNA_STORAGE_KEY, JSON.stringify(dna));
}
