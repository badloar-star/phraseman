import AsyncStorage from '@react-native-async-storage/async-storage';
import { grantArenaAura } from '../app/arena_battle_pass_store';

jest.mock('@react-native-async-storage/async-storage');
// cloud_sync импортируется лениво внутри grantArenaAura — мокаем, чтобы не тянуть Firebase.
jest.mock('../app/cloud_sync', () => ({ syncToCloud: jest.fn().mockResolvedValue(undefined) }));

const store: Record<string, string> = {};

beforeEach(() => {
  jest.clearAllMocks();
  Object.keys(store).forEach((k) => delete store[k]);
  (AsyncStorage.getItem as jest.Mock).mockImplementation((k: string) => Promise.resolve(store[k] ?? null));
  (AsyncStorage.setItem as jest.Mock).mockImplementation((k: string, v: string) => { store[k] = v; return Promise.resolve(); });
  (AsyncStorage.multiRemove as jest.Mock).mockImplementation((keys: string[]) => { keys.forEach((k) => delete store[k]); return Promise.resolve(); });
});

describe('grantArenaAura', () => {
  it('записывает владение аурой в avatar_aura_owned_v1', async () => {
    const ok = await grantArenaAura('aura-arena-frost', false);
    expect(ok).toBe(true);
    const owned = JSON.parse(store['avatar_aura_owned_v1']);
    expect(owned['aura-arena-frost']).toBe(true);
  });

  it('с equip=true делает ауру активной (user_avatar_aura)', async () => {
    await grantArenaAura('aura-arena-storm', true);
    expect(store['user_avatar_aura']).toBe('aura-arena-storm');
  });

  it('с equip=false НЕ трогает активную ауру', async () => {
    store['user_avatar_aura'] = 'aura-aurora';
    await grantArenaAura('aura-arena-ether', false);
    expect(store['user_avatar_aura']).toBe('aura-aurora');
  });

  it('не теряет ранее владеемые ауры', async () => {
    store['avatar_aura_owned_v1'] = JSON.stringify({ 'aura-mint': true });
    await grantArenaAura('aura-arena-stardust', false);
    const owned = JSON.parse(store['avatar_aura_owned_v1']);
    expect(owned['aura-mint']).toBe(true);
    expect(owned['aura-arena-stardust']).toBe(true);
  });

  it('пустой id → false', async () => {
    expect(await grantArenaAura('', true)).toBe(false);
  });
});
