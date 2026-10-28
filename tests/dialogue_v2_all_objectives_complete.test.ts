// зачем (координатор 28.10, сервер Диалогов выложен 18:29): клиент понимает coaching.allObjectivesComplete. Главное — старый ответ без поля НЕ ломается:
// разбор остаётся валидным, поле = false; запрос несёт coachingVersion: 2; хук хранит «все цели пройдены»; экран не откатывает карточку к «1 из N».
/* eslint-disable import/first */
const mockCallableRun = jest.fn();
jest.mock('@react-native-firebase/app', () => ({ getApp: jest.fn(() => ({ name: 'app' })) }));
jest.mock('@react-native-firebase/functions', () => ({
  getFunctions: jest.fn(() => ({ region: 'us-central1' })),
  httpsCallable: jest.fn(() => mockCallableRun),
}));

import fs from 'node:fs';
import path from 'node:path';

import { parseDialogueV2TurnCoaching, sendDialogueV2CoachedTextTurn } from '../app/dialogue_v2_turn_coaching_client';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').split(String.fromCharCode(13, 10)).join(String.fromCharCode(10));

const baseCoaching = () => ({
  replyTranslations: ['Привет!'],
  replyExplanations: ['Приветствие.'],
  betterPhrasing: null,
  hint: null,
  mood: 'smile',
  activeObjectiveId: 'greet',
  dialogueEnded: false,
});

describe('dialogue v2: allObjectivesComplete', () => {
  let warnSpy: jest.SpyInstance;
  let logSpy: jest.SpyInstance;
  beforeEach(() => {
    mockCallableRun.mockReset();
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });
  afterEach(() => {
    warnSpy.mockRestore();
    logSpy.mockRestore();
  });

  it('старый ответ без поля разбирается как раньше: поле = false, разбор не отклонён', () => {
    const parsed = parseDialogueV2TurnCoaching(baseCoaching(), 1);
    expect(parsed).not.toBeNull();
    expect(parsed?.allObjectivesComplete).toBe(false);
    expect(parsed?.activeObjectiveId).toBe('greet');
    expect(parsed?.replyTranslations).toEqual(['Привет!']);
  });

  it('новый ответ с полем: true и false принимаются как есть', () => {
    expect(parseDialogueV2TurnCoaching({ ...baseCoaching(), activeObjectiveId: null, allObjectivesComplete: true }, 1)?.allObjectivesComplete).toBe(true);
    expect(parseDialogueV2TurnCoaching({ ...baseCoaching(), allObjectivesComplete: false }, 1)?.allObjectivesComplete).toBe(false);
  });

  it('не булево значение и лишние ключи по-прежнему отклоняют разбор, причина в журнале', () => {
    expect(parseDialogueV2TurnCoaching({ ...baseCoaching(), allObjectivesComplete: 'yes' }, 1)).toBeNull();
    expect(parseDialogueV2TurnCoaching({ ...baseCoaching(), somethingElse: 1 }, 1)).toBeNull();
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('allObjectivesComplete is not boolean'), expect.any(String));
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('coaching keys rejected'), expect.any(String));
  });

  it('запрос хода несёт coachingVersion: 2 вместе с interfaceLang', async () => {
    mockCallableRun.mockResolvedValue({ data: { ok: true, kind: 'silence', replies: [], replayed: false } });
    await sendDialogueV2CoachedTextTurn({
      sessionId: `d2s_${'a'.repeat(32)}`,
      turnId: `d2t_${'b'.repeat(16)}`,
      studyTarget: 'en',
      scenarioId: 'cafe_order',
      userMessage: 'Hello',
      interfaceLang: 'ru',
    });
    expect(mockCallableRun).toHaveBeenCalledTimes(1);
    expect(mockCallableRun.mock.calls[0]![0]).toMatchObject({ coachingVersion: 2, interfaceLang: 'ru', scenarioId: 'cafe_order' });
  });

  it('хук хранит признак и не сбрасывает его; пустое поле в разборе = нет признака', () => {
    const hook = read('hooks/use_dialogue_v2_session_coaching.ts');
    expect(hook).toContain('const [allObjectivesComplete, setAllObjectivesComplete] = useState(false);');
    expect(hook).toContain('if (coaching.allObjectivesComplete === true) setAllObjectivesComplete(true);');
    expect(hook).not.toContain('setAllObjectivesComplete(false)');
    expect(hook).toMatch(/ended,\s*allObjectivesComplete,/);
  });

  it('экран: при «все цели пройдены» карточка остаётся на последней цели и пишет «N из N целей», а не «1 из N»', () => {
    const screen = read('app/dialogue_v2_session.tsx');
    expect(screen).toContain('const objectivesAllDone = coaching.allObjectivesComplete && model.objectives.length > 0;');
    expect(screen).toMatch(/objectivesAllDone\s*\? model\.objectives\.length - 1/);
    expect(screen).toContain('dialogsSceneGoalsDoneLabel(lang, model.objectives.length, model.objectives.length)');
  });
});
