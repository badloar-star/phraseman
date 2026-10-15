// зачем (координатор 15.10, m18 «Итог диалога — думает… → реакция» за moments_v3): тайминги эталона, реакция «довольна» только когда это правда, «думает…» держится до ответа сети
// и не короче 1,0 с, итог недоступен — обычный заголовок; экран без флага не грузит модуль цепочки и окно m17 ждёт конца цепочки.
(globalThis as typeof globalThis & { __DEV__?: boolean }).__DEV__ = false;

import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { render, screen, act } from '@testing-library/react-native';

jest.mock('react-native', () => {
  const R = jest.requireActual('react');
  const host = (name: string) => (props: Record<string, unknown>) => R.createElement(name, props, props.children as React.ReactNode);
  return {
    View: host('View'),
    Text: host('Text'),
    StyleSheet: { create: (styles: unknown) => styles, flatten: (style: unknown) => style, absoluteFill: {}, absoluteFillObject: {}, hairlineWidth: 1 },
    Platform: { OS: 'android', select: (o: Record<string, unknown>) => o.android ?? o.default },
    Dimensions: { get: () => ({ width: 390, height: 844, scale: 1, fontScale: 1 }) },
    NativeModules: {},
  };
});
let mockReduced = false;
jest.mock('react-native-reanimated', () => {
  const R = jest.requireActual('react');
  const View = (props: Record<string, unknown>) => R.createElement('View', props, props.children);
  return {
    __esModule: true,
    default: { View },
    Easing: { bezier: () => () => 0 },
    useAnimatedStyle: (fn: () => unknown) => fn(),
    useSharedValue: (v: number) => ({ value: v }),
    useReducedMotion: () => mockReduced,
    withDelay: (_d: number, v: unknown) => v,
    withTiming: (v: unknown) => v,
  };
});
jest.mock('@expo/vector-icons/Ionicons', () => ({ __esModule: true, default: 'Icon' }));
jest.mock('../constants/v2Style', () => ({ V2_TYPE: { title: {} } }));
jest.mock('../hooks/use-haptics', () => ({ hapticLightImpact: jest.fn(() => Promise.resolve()), hapticSuccess: jest.fn(() => Promise.resolve()) }));
jest.mock('../modules/sound_v2/sound_v2_flag', () => ({ isSoundV2Enabled: () => false }));
const mockPlaySfx = jest.fn();
jest.mock('../app/flashcards/SoundService', () => ({ playSfx: (n: string) => mockPlaySfx(n) }));

import { DialogueChainHeader, DialogueChainScope } from '../components/completion/DialogueDoneChain';
import { deriveDialogueReaction, dialogueCoinsAfterReact, dialogueGoalAfterReact, dialoguePartnerName, dialogueReactAt } from '../components/completion/dialogue_chain_gate';
import { DIALOGUE_CHAIN_LANGS, DIALOGUE_CHAIN_STRING_KEYS, dialogueChainText } from '../components/completion/dialogue_chain_strings';

const colors = { text: '#fff', secondary: '#aaa', control: '#222' };
const tree = (p: { ready: boolean; failed?: boolean; onFinished?: () => void }) => (
  <DialogueChainScope ready={p.ready} failed={p.failed ?? false} reaction="pleased" reactionReason="тест" goals={3} hasCoins onFinished={p.onFinished}>
    <DialogueChainHeader lang="ru" partnerName="Эмма" reaction="pleased" fallbackTitle="Диалог пройден" sub="Закажи кофе · 3 из 3 целей" colors={colors} />
  </DialogueChainScope>
);

describe('m18 · тайминги и решения', () => {
  it('реакция не раньше 1,0 с и не раньше ответа; цели +0,6 с через 300 мс; монеты за целями', () => {
    expect(dialogueReactAt(150)).toBe(1000);
    expect(dialogueReactAt(2400)).toBe(2400);
    expect([0, 1, 4].map(dialogueGoalAfterReact)).toEqual([600, 900, 1800]);
    expect(dialogueCoinsAfterReact(5)).toBe(2100);
  });
  it('«довольна» — только по настроению happy/smile или «собеседник завершил + все цели»', () => {
    expect(deriveDialogueReaction({ endedBy: 'manual', mood: 'smile', goalsMet: 0, goalsTotal: 3 }).reaction).toBe('pleased');
    expect(deriveDialogueReaction({ endedBy: 'bot', mood: 'sad', goalsMet: 3, goalsTotal: 3 }).reaction).toBe('neutral');
    expect(deriveDialogueReaction({ endedBy: 'bot', mood: null, goalsMet: 3, goalsTotal: 3 }).reaction).toBe('pleased');
    expect(deriveDialogueReaction({ endedBy: 'bot', mood: null, goalsMet: 2, goalsTotal: 3 }).reaction).toBe('neutral');
    expect(deriveDialogueReaction({ endedBy: 'manual', mood: null, goalsMet: 3, goalsTotal: 3 }).reaction).toBe('neutral');
  });
  it('имя собеседника — первая персона снимка, пустое — null', () => {
    expect(dialoguePartnerName({ barista: { displayName: ' Эмма ' } })).toBe('Эмма');
    expect(dialoguePartnerName({ a: { displayName: '' } })).toBeNull();
    expect(dialoguePartnerName(undefined)).toBeNull();
  });
  it('тексты есть на 9 языках и без рода; неизвестный язык — английский', () => {
    for (const key of DIALOGUE_CHAIN_STRING_KEYS) for (const lang of DIALOGUE_CHAIN_LANGS) expect(dialogueChainText(lang, key).length).toBeGreaterThan(0);
    expect(dialogueChainText('ru', 'pleased', { name: 'Эмма' })).toBe('Эмма: отлично!');
    expect(dialogueChainText('fr' as never, 'thinking', { name: 'Emma' })).toBe('Emma is thinking…');
  });
});

describe('m18 · «думает…» → реакция', () => {
  beforeEach(() => { jest.useFakeTimers(); mockReduced = false; mockPlaySfx.mockClear(); });
  afterEach(() => jest.useRealTimers());

  it('быстрый ответ: «думает…» держится до 1,0 с, потом «Эмма: отлично!», подпись сцены, звук correct; конец цепочки — один раз', async () => {
    const onFinished = jest.fn();
    const r = await render(tree({ ready: false, onFinished }));
    await act(async () => { jest.advanceTimersByTime(250); });
    expect(screen.getByText('Эмма думает…')).toBeTruthy();
    await act(async () => { jest.advanceTimersByTime(50); });
    await r.rerender(tree({ ready: true, onFinished }));
    await act(async () => { jest.advanceTimersByTime(500); });
    expect(screen.getByText('Эмма думает…')).toBeTruthy();
    await act(async () => { jest.advanceTimersByTime(300); });
    expect(screen.queryByText('Эмма думает…')).toBeNull();
    expect(screen.getByText('Эмма: отлично!')).toBeTruthy();
    expect(screen.getByText('Закажи кофе · 3 из 3 целей')).toBeTruthy();
    expect(mockPlaySfx).toHaveBeenCalledWith('correct');
    await act(async () => { jest.advanceTimersByTime(5000); });
    expect(onFinished).toHaveBeenCalledTimes(1);
  });

  it('итог недоступен — обычный заголовок «Диалог пройден», без реакции, конец сразу', async () => {
    const onFinished = jest.fn();
    await render(tree({ ready: false, failed: true, onFinished }));
    expect(screen.getByText('Диалог пройден')).toBeTruthy();
    expect(screen.queryByText('Эмма: отлично!')).toBeNull();
    expect(onFinished).toHaveBeenCalledTimes(1);
  });

  it('reduced-motion — реакция сразу по ответу, без задержек', async () => {
    mockReduced = true;
    const onFinished = jest.fn();
    await render(tree({ ready: true, onFinished }));
    expect(screen.getByText('Эмма: отлично!')).toBeTruthy();
    expect(onFinished).toHaveBeenCalledTimes(1);
  });
});

describe('m18 · подключение к итогу диалога', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'app', 'dialogue_v2_completion.tsx'), 'utf8');
  it('флаг защёлкивается при входе, модуль цепочки — только require при включённом флаге, m17 ждёт конца цепочки', () => {
    expect(src).toContain('const [dialogueChainOn] = useState(() => isMomentsV3FlagOn());');
    expect(src).toContain("const DlgChain = dialogueChainOn ? (require('../components/completion/DialogueDoneChain')");
    expect(src).not.toMatch(/^import .*DialogueDoneChain/m);
    expect(src).toContain("momentsV3 && state.kind === 'ready' && goalsTotal > 0 && (!DlgChain || dialogueChainFinished)");
  });
  it('без флага прежняя раскладка: заголовок, «Загрузка…», цифры → монеты → цели → ошибки/отзыв', () => {
    expect(src).toContain('{DlgChain ? null : <View style={styles.titleBlock}>');
    expect(src).toContain("{!DlgChain && state.kind === 'loading' ? (");
    const legacy = src.slice(src.indexOf('{DlgChain ? null : <>'), src.indexOf('          </>}'));
    const order = ['{statsCard}', 'dialogue-v2-completion-coins', 'dialogue-v2-completion-goals', '{errorsAndFeedback}'].map((m) => legacy.indexOf(m));
    expect(order.every((i) => i >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });
});
