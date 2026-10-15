// зачем (владелец 12.10, п.81, вариант А; макет dialogs C15 / dialogs-028): Free — 3 голосовые попытки в день, после третьей —
// бейдж PLUS на микрофоне и вход в Plus; Plus без лимита; попытка = начатая запись; счётчик локальный по дате устройства.
import fs from 'node:fs';
import path from 'node:path';

import AsyncStorage from '@react-native-async-storage/async-storage';

import { resetDevDialogState, setDevDialogState } from '../app/dev_dialog_state';
import {
  DIALOG_VOICE_ATTEMPTS_KEY,
  FREE_DIALOG_VOICE_DAILY_LIMIT,
  dialogVoiceLimitDecision,
  hydrateDialogVoiceAttempts,
  peekDialogVoiceAttempts,
  recordDialogVoiceAttempt,
  resetDialogVoiceAttemptsForTests,
} from '../app/dialogue_v2_voice_daily_limit';

const DAY1 = new Date(2026, 9, 12, 23, 50).getTime();
const DAY2 = new Date(2026, 9, 13, 0, 5).getTime();
const free = (count: number) => dialogVoiceLimitDecision({ accessResolved: true, hasPremiumAccess: false, count });

describe('дневной лимит голоса в Диалогах', () => {
  beforeEach(async () => {
    (globalThis as { __DEV__?: boolean }).__DEV__ = true;
    resetDialogVoiceAttemptsForTests();
    resetDevDialogState();
    await AsyncStorage.clear();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => jest.restoreAllMocks());

  it('лимит Free — 3; Plus и «доступ ещё неизвестен» — без бейджа', () => {
    expect(FREE_DIALOG_VOICE_DAILY_LIMIT).toBe(3);
    expect(free(2)).toBe('under_limit');
    expect(free(3)).toBe('limit_reached');
    expect(dialogVoiceLimitDecision({ accessResolved: true, hasPremiumAccess: true, count: 99 })).toBe('plus_unlimited');
    expect(dialogVoiceLimitDecision({ accessResolved: false, hasPremiumAccess: false, count: 99 })).toBe('access_unknown');
  });

  it('попытка видна сразу (в памяти), на диск ложится фоном', async () => {
    // зачем (15.10): до чтения диска запись откладывается (см. тест ниже) — здесь проверяем обычный путь после гидрации
    await hydrateDialogVoiceAttempts(DAY1);
    expect(recordDialogVoiceAttempt(DAY1)).toBe(1);
    expect(peekDialogVoiceAttempts(DAY1)).toBe(1);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(JSON.parse((await AsyncStorage.getItem(DIALOG_VOICE_ATTEMPTS_KEY)) ?? 'null')).toEqual({ day: '2026-10-12', count: 1 });
  });

  it('после полуночи по местному времени счётчик снова 0', () => {
    recordDialogVoiceAttempt(DAY1);
    recordDialogVoiceAttempt(DAY1);
    recordDialogVoiceAttempt(DAY1);
    expect(free(peekDialogVoiceAttempts(DAY1))).toBe('limit_reached');
    expect(peekDialogVoiceAttempts(DAY2)).toBe(0);
    expect(free(peekDialogVoiceAttempts(DAY2))).toBe('under_limit');
    expect(recordDialogVoiceAttempt(DAY2)).toBe(1);
  });

  it('2 и 5 параллельных гидраций = ровно диск, одно чтение (Ревизор 15.10: было 1→2, 2→4)', async () => {
    await AsyncStorage.setItem(DIALOG_VOICE_ATTEMPTS_KEY, JSON.stringify({ day: '2026-10-12', count: 2 }));
    const two = await Promise.all([hydrateDialogVoiceAttempts(DAY1), hydrateDialogVoiceAttempts(DAY1)]);
    expect(two).toEqual([2, 2]);
    expect(peekDialogVoiceAttempts(DAY1)).toBe(2);
    resetDialogVoiceAttemptsForTests();
    const five = await Promise.all([1, 2, 3, 4, 5].map(() => hydrateDialogVoiceAttempts(DAY1)));
    expect(five).toEqual([2, 2, 2, 2, 2]);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(JSON.parse((await AsyncStorage.getItem(DIALOG_VOICE_ATTEMPTS_KEY)) ?? 'null')).toEqual({ day: '2026-10-12', count: 2 });
  });

  it('списание до гидрации + параллельные гидрации = диск + 1 ровно один раз', async () => {
    await AsyncStorage.setItem(DIALOG_VOICE_ATTEMPTS_KEY, JSON.stringify({ day: '2026-10-12', count: 1 }));
    recordDialogVoiceAttempt(DAY1);
    const results = await Promise.all([hydrateDialogVoiceAttempts(DAY1), hydrateDialogVoiceAttempts(DAY1), hydrateDialogVoiceAttempts(DAY1)]);
    expect(results).toEqual([2, 2, 2]);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(JSON.parse((await AsyncStorage.getItem(DIALOG_VOICE_ATTEMPTS_KEY)) ?? 'null')).toEqual({ day: '2026-10-12', count: 2 });
  });

  it('попытки до чтения диска складываются с диском, а не берётся большее (аудит 15.10)', async () => {
    await AsyncStorage.setItem(DIALOG_VOICE_ATTEMPTS_KEY, JSON.stringify({ day: '2026-10-12', count: 1 }));
    recordDialogVoiceAttempt(DAY1);
    recordDialogVoiceAttempt(DAY1);
    // до гидрации на диск не пишем — сохранённая «1» не затёрта
    expect(JSON.parse((await AsyncStorage.getItem(DIALOG_VOICE_ATTEMPTS_KEY)) ?? 'null')).toEqual({ day: '2026-10-12', count: 1 });
    // зачем: прежний max(диск 1, память 2) = 2 терял попытку; 1 сохранённая + 2 этого запуска = 3
    expect(await hydrateDialogVoiceAttempts(DAY1)).toBe(3);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(JSON.parse((await AsyncStorage.getItem(DIALOG_VOICE_ATTEMPTS_KEY)) ?? 'null')).toEqual({ day: '2026-10-12', count: 3 });
  });

  it('счётчик вчерашнего дня с диска не переносится на сегодня', async () => {
    await AsyncStorage.setItem(DIALOG_VOICE_ATTEMPTS_KEY, JSON.stringify({ day: '2026-10-12', count: 3 }));
    expect(await hydrateDialogVoiceAttempts(DAY2)).toBe(0);
  });

  it('битая запись на диске — ноль и причина в журнале', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    await AsyncStorage.setItem(DIALOG_VOICE_ATTEMPTS_KEY, '{oops');
    expect(await hydrateDialogVoiceAttempts(DAY1)).toBe(0);
    expect(warn.mock.calls.some((call) => String(call[0]).includes('[DIALOG-VOICE] storage:parse_failed'))).toBe(true);
  });

  it('подмена для съёмки dialogs-028 (dev_dialog_voice=spent) включает бейдж даже на нуле', () => {
    setDevDialogState({ voiceSpent: true });
    expect(free(0)).toBe('limit_reached');
  });

  it('экран: бейдж из решения, тап на лимите ведёт в Plus, попытка — переход в recording только у Free', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'app', 'dialogue_v2_session.tsx'), 'utf8');
    expect(src).toContain("micPlusBadge={voiceLimitDecision === 'limit_reached'}");
    expect(src).toContain('onStartVoice={startVoice}');
    // R1-a (Ревизор 15.10): решение и пейвол ai_voice_input (с защитой от двойного тапа и paywall_shown) — у общего хука;
    // на лимите запись не стартует. Контекст пейвола про голос, а не про месячные ответы (dialog_limit) — внутри хука.
    expect(src).toContain("useVoiceAttemptGate({ surface: 'dialogs', source: 'dialogue_v2_session' })");
    expect(src).toMatch(/const allowed = voiceGate\.canStartAttempt\([\s\S]{0,80}?\);[\s\S]{0,500}if \(decision === 'limit_reached'\) \{[\s\S]{0,300}return;\s*\}\s*void voice\.start\(\);/);
    expect(fs.readFileSync(path.join(__dirname, '..', 'hooks', 'use_voice_attempt_gate.ts'), 'utf8')).toContain("context: 'ai_voice_input'");
    expect(src).toContain("if (voice.status !== 'recording' || previous === 'recording') return;");
    // R1-a (Ревизор 15.10): Plus не списывает и доступ «не выяснен» ждёт — это решает общий recordVoiceDailyAttempt
    // (покрыто tests/voice_daily_allowance.test.ts); экран обязан идти через общий путь, а не свой счётчик.
    expect(src).toContain('commitVoiceAttempt();');
    expect(src).not.toContain('recordDialogVoiceAttempt(');
    expect(src).toContain('[DIALOG-VOICE] start:tap');
  });
});
