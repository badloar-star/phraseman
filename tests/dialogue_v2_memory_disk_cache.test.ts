import AsyncStorage from '@react-native-async-storage/async-storage';
import fs from 'node:fs';
import path from 'node:path';

import { beginAccountGeneration, invalidateAccountGeneration, __resetAccountGenerationForTests } from '../app/account_generation';
import {
  clearAllDialogueV2MemoryDiskCache,
  clearDialogueV2MemoryDiskCache,
  readDialogueV2MemoryDiskCache,
  writeDialogueV2MemoryDiskCache,
} from '../app/dialogue_v2_memory_disk_cache';
import type { DialogueV2MemoryView } from '../app/dialogue_v2_memory_client';

// зачем (решение координатора 04.10 + текст политики fe079cd49): копия «Памяти диалогов» на устройстве
// читается только своим аккаунтом и стирается при «Очистить память», выходе и смене аккаунта.
const memory = (studyTarget: 'en' | 'es'): DialogueV2MemoryView => ({
  ok: true,
  studyTarget,
  sharedSummary: null,
  scenarioCheckpoints: [],
} as unknown as DialogueV2MemoryView);

describe('dialogue V2 memory disk cache', () => {
  beforeEach(async () => {
    __resetAccountGenerationForTests();
    await AsyncStorage.clear();
  });

  it('round-trips for the same account and hides it from another account', async () => {
    beginAccountGeneration('uid-a');
    await writeDialogueV2MemoryDiskCache(memory('en'));
    expect(await readDialogueV2MemoryDiskCache('en')).toEqual(memory('en'));
    beginAccountGeneration('uid-b');
    expect(await readDialogueV2MemoryDiskCache('en')).toBeNull();
  });

  it('clears one language on «clear memory» and everything on wipe', async () => {
    beginAccountGeneration('uid-a');
    await writeDialogueV2MemoryDiskCache(memory('en'));
    await writeDialogueV2MemoryDiskCache(memory('es'));
    await clearDialogueV2MemoryDiskCache('en');
    expect(await readDialogueV2MemoryDiskCache('en')).toBeNull();
    expect(await readDialogueV2MemoryDiskCache('es')).toEqual(memory('es'));
    await clearAllDialogueV2MemoryDiskCache();
    const left = (await AsyncStorage.getAllKeys()).filter((k) => k.startsWith('dialogue_v2_memory_cache_v1:'));
    expect(left).toEqual([]);
  });

  it('does not store anything without an active account', async () => {
    invalidateAccountGeneration();
    await writeDialogueV2MemoryDiskCache(memory('en'));
    expect((await AsyncStorage.getAllKeys()).filter((k) => k.startsWith('dialogue_v2_memory_cache_v1:'))).toEqual([]);
  });

  it('is wired into the account wipe and the clear-memory action', () => {
    const cloud = fs.readFileSync(path.join(__dirname, '..', 'app', 'cloud_sync.ts'), 'utf8');
    expect(cloud).toContain('await clearAllDialogueV2MemoryDiskCache();');
    const screen = fs.readFileSync(path.join(__dirname, '..', 'app', 'dialogue_v2_memory.tsx'), 'utf8');
    expect(screen).toContain('void clearDialogueV2MemoryDiskCache(studyTarget);');
    expect(screen).toContain('void writeDialogueV2MemoryDiskCache(memory);');
  });
});
