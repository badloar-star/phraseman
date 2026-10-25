// зачем (жалоба №4, решение координатора 25.10): строка «Печатаешь вручную · Выбирать слова» под полем урока. Сторож поведения: тап сразу
// выключает «Ввод с клавиатуры» локально и сбрасывает набранное; запись — целыми настройками; не записалось — откат и сообщение; двойной тап
// не пишет дважды; «Вернуть» в тосте включает обратно. Плюс: строка есть в уроке только при hardMode, тексты на 9 языках короткие.
import fs from 'node:fs';
import path from 'node:path';
import { act, renderHook } from '@testing-library/react-native';

jest.mock('../constants/i18n', () => ({ triLang: (lang: string, map: Record<string, string>) => map[lang] ?? map.ru }));
const emitted: { type: string; payload: any }[] = [];
jest.mock('../app/events', () => ({
  emitAppEvent: (type: string, payload: unknown) => emitted.push({ type, payload }),
  actionToastTri: (type: string, m: Record<string, string>) => ({ type, messageRu: m.ru, messageUk: m.uk }),
}));
const saved: any[] = [];
let saveResult = true;
jest.mock('../app/user_settings_store', () => ({
  loadSettings: async () => ({ autoAdvance: true, hardMode: true, autoCheck: false, haptics: true, voiceOut: true, speechRate: 1, uiSounds: true, speechVoiceId: 'v1' }),
  applyUserSettingsNow: async (s: unknown) => { saved.push(s); return saveResult; },
}));

import { useLessonHardModeSwitch } from '../app/lesson_hardmode_switch';
import { LESSON_HARDMODE_SWITCH_COPY } from '../components/lessons/lesson_hardmode_switch_copy';

const flush = () => act(async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); });

async function setup() {
  const calls: boolean[] = [];
  let cleared = 0;
  const hook = await renderHook(() => useLessonHardModeSwitch({ lessonId: 11, setHardMode: (v) => calls.push(v), clearTyped: () => { cleared += 1; } }));
  return { hook, calls, cleared: () => cleared };
}

beforeEach(() => { emitted.length = 0; saved.length = 0; saveResult = true; });

describe('строка-переход к выбору слов', () => {
  it('тап: сразу локально выключает, сбрасывает набранное, пишет целые настройки, тост с «Вернуть»', async () => {
    const { hook, calls, cleared } = await setup();
    await act(async () => { hook.result.current(); });
    expect(calls).toEqual([false]);
    expect(cleared()).toBe(1);
    await flush();
    expect(saved).toHaveLength(1);
    expect(saved[0]).toMatchObject({ hardMode: false, speechVoiceId: 'v1', uiSounds: true });
    const toast = emitted.find((e) => e.type === 'action_toast')!.payload;
    expect(toast.messageRu).toBe('Включил выбор слов');
    expect(toast.action.labelRu).toBe('Вернуть');
    await act(async () => { toast.action.onPress(); });
    expect(calls).toEqual([false, true]);
    await flush();
    expect(saved[1]).toMatchObject({ hardMode: true });
  });

  it('двойной тап до конца записи — одна запись', async () => {
    const { hook, calls } = await setup();
    await act(async () => { hook.result.current(); hook.result.current(); });
    await flush();
    expect(calls).toEqual([false]);
    expect(saved).toHaveLength(1);
  });

  it('запись не удалась — откат и сообщение об ошибке', async () => {
    saveResult = false;
    const { hook, calls } = await setup();
    await act(async () => { hook.result.current(); });
    await flush();
    expect(calls).toEqual([false, true]);
    expect(emitted.some((e) => e.payload?.type === 'error')).toBe(true);
  });

  it('урок: строка только при hardMode во время задания; тексты 9 языков ≤ 32 знаков', () => {
    const lesson = fs.readFileSync(path.join(__dirname, '..', 'app/lesson1.tsx'), 'utf8').replace(/\r\n/g, '\n');
    expect(lesson).toMatch(/\{settings\.hardMode && status === 'playing' && onSwitchToTiles \? \(\s*<LessonHardModeSwitchLine /);
    expect(lesson).toContain('onSwitchToTiles={switchLessonToTiles}');
    for (const row of Object.values(LESSON_HARDMODE_SWITCH_COPY)) {
      expect(row).toHaveLength(9);
      for (const text of row) { expect(text.trim().length).toBeGreaterThan(0); expect(text.length).toBeLessThanOrEqual(32); }
    }
  });
});
