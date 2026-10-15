/**
 * Монеты за диалог (владелец 13.10 «Да, как в макете»; образец dialogs.html D1–D4: +30 / +25 / +10).
 *
 * зачем: сумма по образцу, один раз на сессию (отметка ставится ДО начисления и читается при возврате на экран),
 * путь начисления — тот же, что у уроков (usePracticeRunes, цена 1 за элемент, активность без засчёта в задания дня).
 */
import fs from 'node:fs';
import path from 'node:path';

jest.mock('@react-native-async-storage/async-storage', () => ({ getItem: jest.fn(), setItem: jest.fn(), removeItem: jest.fn() }));

import {
  DIALOGUE_COINS_CLEAN,
  DIALOGUE_COINS_ENDED_MANUALLY,
  DIALOGUE_COINS_WITH_MISTAKES,
  clearDialogueV2CoinsAwarded,
  dialogueV2CoinAward,
  dialogueV2CoinSessionKey,
  markDialogueV2CoinsAwarded,
  readDialogueV2CoinsAwarded,
} from '../app/dialogue_v2_coin_reward';

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: async (key: string) => values.get(key) ?? null,
    setItem: async (key: string, value: string) => { values.set(key, value); },
    removeItem: async (key: string) => { values.delete(key); },
  };
}

const read = (rel: string): string => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

describe('dialogue coin reward', () => {
  beforeEach(() => {
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });
  afterEach(() => jest.restoreAllMocks());

  it('сумма по образцу: без ошибок 30, с ошибками 25, вручную 10', () => {
    expect([DIALOGUE_COINS_CLEAN, DIALOGUE_COINS_WITH_MISTAKES, DIALOGUE_COINS_ENDED_MANUALLY]).toEqual([30, 25, 10]);
    expect(dialogueV2CoinAward({ endedBy: 'bot', mistakes: 0 })).toBe(30);
    expect(dialogueV2CoinAward({ endedBy: 'limit', mistakes: 0 })).toBe(30);
    expect(dialogueV2CoinAward({ endedBy: 'bot', mistakes: 2 })).toBe(25);
    expect(dialogueV2CoinAward({ endedBy: 'manual', mistakes: 0 })).toBe(10);
    expect(dialogueV2CoinAward({ endedBy: 'manual', mistakes: 3 })).toBe(10);
  });

  it('ключ копилки проходит серверную проверку символов', () => {
    expect(dialogueV2CoinSessionKey('d2s:abc/42')).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it('один раз на сессию: отметка видна при возврате, откат её снимает; сбой чтения — «уже было»', async () => {
    const storage = memoryStorage();
    expect(await readDialogueV2CoinsAwarded('u1', 's1', storage)).toBe(false);
    expect(await markDialogueV2CoinsAwarded('u1', 's1', 30, storage)).toBe(true);
    expect(await readDialogueV2CoinsAwarded('u1', 's1', storage)).toBe(true);
    expect(await readDialogueV2CoinsAwarded('u2', 's1', storage)).toBe(false);
    await clearDialogueV2CoinsAwarded('u1', 's1', storage);
    expect(await readDialogueV2CoinsAwarded('u1', 's1', storage)).toBe(false);
    const broken = { ...storage, getItem: async () => { throw new Error('disk'); } };
    expect(await readDialogueV2CoinsAwarded('u1', 's1', broken)).toBe(true);
  });

  it('хук: путь уроков (lesson, цена 1), отметка ДО начисления, экран итога зовёт хук', () => {
    const hook = read('hooks/useDialogueV2CoinReward.ts');
    expect(hook).toContain("activity: 'lesson',");
    expect(hook).toContain('repeatPriceOnly: true,');
    const markAt = hook.indexOf('await markDialogueV2CoinsAwarded(owner, sessionId, amount)');
    const creditAt = hook.indexOf('practiceRunes.onCorrectAnswer(`dialogue_coin_${item}`)');
    expect(markAt).toBeGreaterThan(-1);
    expect(creditAt).toBeGreaterThan(markAt);
    expect(hook).toContain('[COINS-EARN] dialog: уже начислено за эту сессию');
    const screen = read('app/dialogue_v2_completion.tsx');
    // R50 (15.10): начисление не ждёт сервер, если есть локальный разбор ходов — ранний «Готово»/«✕» не теряет монеты и «Мои ошибки»
    expect(screen).toContain('const localOutcomeReady = outcome !== null;');
    expect(screen).toContain("ready: (localOutcomeReady || state.kind !== 'loading') && turns > 0,");
    expect(screen).toContain("ready: localOutcomeReady || state.kind !== 'loading',");
  });

  // зачем (владелец 13.10 «Начислять»): тренажёр предлогов давал +0 — теперь как урок: +3 за верный, +1 на повторе, зачёт на итоге.
  it('тренажёр предлогов: копилка урока, начисление на верном ответе, зачёт на итоге, монеты в итоге не 0', () => {
    const drill = read('app/preposition_drill.tsx');
    expect(drill).toContain("activity: 'lesson',");
    expect(drill).toContain('sessionKey: `prep_${studyTarget}_${lessonId}`,');
    expect(drill).toContain('prepositionRunes.onCorrectAnswer(item.id)');
    expect(drill).toContain('void prepositionRunes.settle()');
    expect(drill).toContain('coinsGained={repeatRunWithoutCoins ? 0 : prepositionRunes.runes}');
    expect(drill).not.toContain('coinsGained={0}');
  });

  // зачем (ревью Авторизации 13.10, 🔴): «Ещё раз» / «Повторить ошибки» после итога идут без энергии — нового прохода копилки нет,
  // ответы после зачёта в копилку не идут (иначе бесконечный фарм, в т.ч. «провалить нарочно → повторить ошибки»).
  it('тренажёр предлогов: повтор внутри экрана после итога монет не даёт', () => {
    const drill = read('app/preposition_drill.tsx');
    expect(drill).not.toContain('startNewCompletionIfSettled');
    expect(drill).not.toContain('startNextCoinPass');
    expect(drill).toMatch(/if \(prepositionSettledPassRef\.current\) \{[\s\S]{0,260}\+0 \(повтор после итога[\s\S]{0,160}\} else \{\s*const coins = prepositionRunes\.onCorrectAnswer\(item\.id\);/);
  });
});
