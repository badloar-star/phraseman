// ════════════════════════════════════════════════════════════════════════════
// energy_refill_lease_behavior.test.ts — вся цепочка «покупка → EnergyContext.refillToMax» на НАСТОЯЩЕМ замке аккаунта.
//
// зачем (ревью 2cdc42fac п.1): контракт по тексту не ловит, если EnergyContext перестанет пересылать lease в запись
// энергии. Здесь настоящий EnergyProvider: refillToMax зовётся из-под замка покупки с lease. Уберут пересылку —
// запись встанет в очередь за самой покупкой, тест упадёт по таймауту, а не по тексту.
// ════════════════════════════════════════════════════════════════════════════
/* eslint-disable import/first */
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { createElement, type ReactNode } from 'react';

jest.unmock('react-native');
jest.mock('react-native-purchases', () => ({
  __esModule: true,
  default: { getAppUserID: async () => 'stable-energy-lease' },
}));
jest.mock('../modules/audio/sound_director', () => ({ soundDirector: { request: jest.fn(), play: jest.fn() } }));
jest.mock('../components/LangContext', () => ({ useLang: () => ({ lang: 'ru' }) }));
jest.mock('../components/use_flashcard_training_grant_boot_maintenance', () => ({
  useFlashcardTrainingGrantBootMaintenance: () => undefined,
}));

import AsyncStorage from '@react-native-async-storage/async-storage';

import { beginAccountGeneration, withAccountTransitionLock } from '../app/account_generation';
import { commitRevenueCatResultForGeneration } from '../app/revenuecat_account_identity';
import { EnergyProvider, useEnergy } from '../components/EnergyContext';

const HANG = Symbol('hang');
function withinMs<T>(work: Promise<T>, ms: number): Promise<T | typeof HANG> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return Promise.race([
    work,
    new Promise<typeof HANG>((resolve) => { timer = setTimeout(() => resolve(HANG), ms); }),
  ]).finally(() => { if (timer) clearTimeout(timer); });
}

const wrapper = ({ children }: { children: ReactNode }) => createElement(EnergyProvider, null, children);

it('покупка зовёт refillToMax с lease из-под замка: не висит, энергия полная и безлимит, замок свободен', async () => {
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  await AsyncStorage.clear();
  const token = beginAccountGeneration('stable-energy-lease');
  const { result } = await renderHook(() => useEnergy(), { wrapper });
  await waitFor(() => expect(result.current.energyReady).toBe(true), { timeout: 3_000 });

  let outcome: unknown = null;
  await act(async () => {
    outcome = await withinMs(
      commitRevenueCatResultForGeneration(token, (isCurrent, lease) => result.current.refillToMax(isCurrent, lease)),
      3_000,
    );
  });

  expect(outcome).toEqual({ status: 'ok', value: true });
  expect(result.current.isUnlimited).toBe(true);
  expect(result.current.energy).toBe(result.current.maxEnergy);
  expect(JSON.parse((await AsyncStorage.getItem('energy_state')) ?? 'null')).toMatchObject({ schemaVersion: 2 });
  expect(await withinMs(withAccountTransitionLock(async () => 'free'), 1_000)).toBe('free');
});
