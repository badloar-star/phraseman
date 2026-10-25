/**
 * [ONB-DEFER] — тяжёлая фоновая работа ждёт конца онбординга (координатор 11.10, пункт B).
 *
 * зачем: на свежем онбординге за экраном ~40 с шёл стартовый конвейер Главной, тапы онбординга вставали в очередь.
 * Сторож: (1) ворота — ничего не потеряно, каждая отложенная задача запускается после конца онбординга; без
 * онбординга и при неизвестном состоянии — сразу; (2) runAfterHomeFirstFrame с holdDuringOnboarding ждёт, без
 * опции — нет; (3) _layout: тяжёлые задачи и база телефона ждут, прогрев цен пейвола — нет.
 */
import fs from 'fs';
import path from 'path';

type Handler = () => void;
const listeners = new Map<string, Set<Handler>>();
jest.mock('../app/events', () => ({
  onAppEvent: (event: string, handler: Handler) => {
    const set = listeners.get(event) ?? new Set<Handler>();
    set.add(handler);
    listeners.set(event, set);
    return { remove: () => { set.delete(handler); } };
  },
}));
const interactionQueue: Array<() => void> = [];
jest.mock('react-native', () => ({
  InteractionManager: {
    runAfterInteractions: (cb: () => void) => {
      interactionQueue.push(cb);
      return { cancel: () => undefined };
    },
  },
}));

import {
  __resetOnboardingDeferGateForTests,
  onboardingDeferWaitingCount,
  setOnboardingDeferActive,
  whenOnboardingSettled,
} from '../app/onboarding_defer_gate';
import { markNativeSplashHidden, runAfterHomeFirstFrame } from '../app/first_frame_deferred_warmups';
import { normalizeEol } from './helpers/read_source';

const flushPromises = () => new Promise<void>((resolve) => setTimeout(resolve, 0));
function emitHomeReady(): void {
  for (const h of Array.from(listeners.get('app_home_screen_ready') ?? [])) h();
}
function flushInteractions(): void {
  while (interactionQueue.length > 0) interactionQueue.shift()!();
}

beforeAll(() => {
  jest.spyOn(console, 'log').mockImplementation(() => undefined);
  jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  markNativeSplashHidden();
});
afterAll(() => jest.restoreAllMocks());
beforeEach(() => {
  __resetOnboardingDeferGateForTests();
  interactionQueue.length = 0;
});

describe('ворота онбординга', () => {
  it('состояние неизвестно или онбординга нет — сразу', async () => {
    await expect(whenOnboardingSettled('a')).resolves.toBe('unknown');
    setOnboardingDeferActive(false, 'test');
    await expect(whenOnboardingSettled('b')).resolves.toBe('not_active');
  });

  it('ничего не потеряно: каждая ждущая задача запускается после конца онбординга', async () => {
    setOnboardingDeferActive(true, 'test');
    const started: string[] = [];
    const labels = ['phone', 'audio', 'achievements', 'packs', 'lv2'];
    for (const label of labels) void whenOnboardingSettled(label).then((outcome) => started.push(`${label}:${outcome}`));
    await flushPromises();
    expect(started).toEqual([]);
    expect(onboardingDeferWaitingCount()).toBe(labels.length);
    setOnboardingDeferActive(false, 'test');
    await flushPromises();
    expect(started).toEqual(labels.map((l) => `${l}:finished`));
    expect(onboardingDeferWaitingCount()).toBe(0);
  });
});

describe('runAfterHomeFirstFrame + holdDuringOnboarding', () => {
  it('с опцией ждёт конца онбординга, без опции — нет', async () => {
    setOnboardingDeferActive(true, 'test');
    const ran: string[] = [];
    runAfterHomeFirstFrame('heavy', () => { ran.push('heavy'); }, { holdDuringOnboarding: true });
    runAfterHomeFirstFrame('prices', () => { ran.push('prices'); });
    emitHomeReady();
    await flushPromises();
    flushInteractions();
    expect(ran).toEqual(['prices']);
    setOnboardingDeferActive(false, 'test');
    await flushPromises();
    flushInteractions();
    expect(ran).toEqual(['prices', 'heavy']);
  });
});

describe('_layout: что ждёт онбординг (контракт по исходнику)', () => {
  const layout = normalizeEol(fs.readFileSync(path.join(__dirname, '..', 'app', '_layout.tsx'), 'utf8'));
  const callFor = (label: string) => {
    const start = layout.indexOf(`runAfterHomeFirstFrame('${label}',`);
    expect(start).toBeGreaterThan(0);
    return layout.slice(start, layout.indexOf('\n', layout.indexOf('holdDuringOnboarding', start) >= 0 ? start + 1 : start));
  };

  // зачем (полный прогон 25.10): посев озвучки v2_audio_seed убран из корня в 25888c669 (Learning V2 — только синтез речи).
  // Вернётся в корень — обязан ждать онбординг; пока его нет, проверять нечего.
  it('v2_audio_seed: в корне нет, а если вернётся — ждёт онбординг', () => {
    const start = layout.indexOf("runAfterHomeFirstFrame('v2_audio_seed',");
    if (start < 0) {
      expect(layout).not.toContain('v2_audio_seed');
      return;
    }
    const next = layout.indexOf('runAfterHomeFirstFrame(', start + 1);
    expect(layout.slice(start, next > 0 ? next : undefined)).toContain('{ holdDuringOnboarding: true }');
  });

  it.each(['lv2_completion_scheduler_install', 'achievements_coins_boot_check', 'published_pack_card_remove_flush'])(
    '%s ждёт онбординг', (label) => {
      const start = layout.indexOf(`runAfterHomeFirstFrame('${label}',`);
      const next = layout.indexOf('runAfterHomeFirstFrame(', start + 1);
      const segment = layout.slice(start, next > 0 ? next : undefined);
      expect(segment).toContain('{ holdDuringOnboarding: true }');
    },
  );

  it('прогрев цен пейвола НЕ ждёт (пейвол внутри онбординга)', () => {
    const start = layout.indexOf("runAfterHomeFirstFrame('paywall_price_cache_warmup',");
    const segment = layout.slice(start, layout.indexOf('runAfterHomeFirstFrame(', start + 1));
    expect(segment).not.toContain('holdDuringOnboarding');
    expect(callFor('paywall_price_cache_warmup')).toBeTruthy();
  });

  it('база телефона ждёт конца онбординга, корень сообщает воротам состояние', () => {
    expect(layout).toContain("console.log('[ONB-DEFER] hold label=phone_state_bootstrap reason=onboarding_active');");
    expect(layout).toContain("setOnboardingDeferActive(effectiveShowOnboarding, '_layout');");
  });
});
