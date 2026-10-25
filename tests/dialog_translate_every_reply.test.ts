/* eslint-disable import/first */
// зачем (жалоба владельца 25.10 «в диалогах нет кнопки ПЕРЕВЕСТИ, только на первом сообщении»; решение координатора): «Перевод» у
// каждой реплики собеседника, у которой перевод есть; перевод — под репликой, повторный тап скрывает; перевода нет — кнопки нет,
// [DIALOG-BUBBLE] reason=no_translation. Источники без отдельного вызова: сценарий — пакет (content.opening.translations) и разбор хода,
// свободный разговор — необязательное поле assistantTranslation ответа хода (старый сервер без поля — ход как раньше).
const mockCallableRun = jest.fn();
jest.mock('@react-native-firebase/app', () => ({ getApp: () => ({ name: 'app' }) }));
jest.mock('@react-native-firebase/functions', () => ({ getFunctions: () => ({ region: 'us-central1' }), httpsCallable: () => mockCallableRun }));

import { sendDialogueV2FreeformTurn } from '../app/dialogue_v2_freeform_client';
import { readSource } from './helpers/read_source';

const request = { sessionId: `d2fs_${'a'.repeat(32)}`, turnId: `d2ft_${'b'.repeat(16)}`, studyTarget: 'de' as const, userMessage: 'Hallo!' };
const base = { ok: true, assistantMessage: 'Hallo! Wie geht es dir?', sessionId: request.sessionId, expiresAtMs: Date.UTC(2026, 9, 1) };

describe('свободный разговор: перевод из ответа хода', () => {
  beforeEach(() => mockCallableRun.mockReset());

  it('новый сервер: перевод принимается', async () => {
    mockCallableRun.mockResolvedValueOnce({ data: { ...base, assistantTranslation: 'Привет! Как дела?' } });
    await expect(sendDialogueV2FreeformTurn(request)).resolves.toEqual({ ...base, assistantTranslation: 'Привет! Как дела?' });
  });

  it('старый сервер без поля: ход как раньше, перевода нет', async () => {
    mockCallableRun.mockResolvedValueOnce({ data: base });
    const result = await sendDialogueV2FreeformTurn(request);
    expect(result).toEqual(base);
    expect(result && 'assistantTranslation' in result).toBe(false);
  });

  it('битый перевод не роняет ход — просто не показывается', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    mockCallableRun.mockResolvedValueOnce({ data: { ...base, assistantTranslation: 42 } });
    const result = await sendDialogueV2FreeformTurn(request);
    warn.mockRestore();
    expect(result).toEqual(base);
  });
});

describe('проводка: кнопка у каждой реплики собеседника, перевод под репликой', () => {
  it('сценарий: перевод первой реплики — из пакета по языку интерфейса', () => {
    const model = readSource('app/dialogue_v2_briefing_model.ts');
    expect(model).toContain('opening: openingOf(packet, input.uiLang),');
    expect(model).toContain('const value = (translations as Record<string, unknown>)[uiLang];');
    const route = readSource('app/dialogue_v2_session.tsx');
    expect(route).toContain('...(opening.translation ? { translation: opening.translation } : {}),');
  });

  it('сценарий: перевод ПОД репликой (оригинал остаётся), журнал reason=no_translation с источником', () => {
    const screen = readSource('components/dialogs/DialogueV2SessionScreen.tsx');
    expect(screen).not.toContain(') : translated ? (');
    expect(screen).toMatch(/<DialogueGlassBubbleText glass=\{glass\} author=\{author\}>\{message\.text\}<\/DialogueGlassBubbleText>\s*\)\}\s*\{\/\*[^*]*\*\/\}\s*\{translated \? \(/);
    expect(screen).toContain("const reason = message.translation ? 'has_translation' : 'no_translation';");
  });

  it('свободный разговор: перевод в реплике, кнопка только при переводе, переключение, журнал', () => {
    const route = readSource('app/dialogue_v2_freeform.tsx');
    expect(route).toContain('...(result.assistantTranslation ? { translation: result.assistantTranslation } : {}),');
    expect(route).toContain('translateLabels={{ show: coachingLabels.translate, hide: coachingLabels.hideTranslation }}');
    const screen = readSource('components/dialogs/DialogueV2FreeformScreen.tsx');
    expect(screen).toContain("const canTranslate = author === 'assistant' && !!message.translation && !!translateLabels;");
    expect(screen).toContain('onPress={() => toggleTranslation(message.id)}');
    expect(screen).toContain('testID={`dialogue-v2-freeform-translation-${message.id}`}');
    expect(screen).toContain("reason: hasTranslation ? 'has_translation' : 'no_translation',");
  });
});
