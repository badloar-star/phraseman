// зачем (координатор 18.10, К1–К3; ответ ИИ в Диалогах 2.0 идёт 7–13 с): пока ждём ответ, следующую реплику можно набирать, но нельзя
// отправить второй раз; набранное не трогают ни пришедший ответ, ни ошибка. Под «…» — мягкая подпись через 5 и 15 с (имя из данных диалога).
// Ожидание раскладывается журналом [DIALOGUE-V2-LATENCY] (только dev).
import fs from 'node:fs';
import path from 'node:path';

import {
  DIALOGUE_TYPING_NAME_AFTER_MS,
  DIALOGUE_TYPING_SLOW_AFTER_MS,
  dialogueTypingCaption,
  dialogueTypingStageFor,
} from '../components/dialogs/dialogue_typing_caption';
import { dialogueScenarioAvatarIcon, dialogueScenarioIcon, dialogueWorldIcon } from '../components/dialogs/dialogue_scenario_icons';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

describe('Диалоги 2.0: ожидание ответа ИИ', () => {
  it('подпись: до 5 с нет, с 5 с — «<имя> печатает…», с 15 с — «дольше обычного»', () => {
    expect(dialogueTypingStageFor(0)).toBe('none');
    expect(dialogueTypingStageFor(DIALOGUE_TYPING_NAME_AFTER_MS - 1)).toBe('none');
    expect(dialogueTypingStageFor(DIALOGUE_TYPING_NAME_AFTER_MS)).toBe('typing');
    expect(dialogueTypingStageFor(DIALOGUE_TYPING_SLOW_AFTER_MS)).toBe('slow');
    expect(dialogueTypingCaption('ru', 'typing', 'Мила')).toBe('Мила печатает…');
    expect(dialogueTypingCaption('en', 'typing', 'Mila')).toBe('Mila is typing…');
    expect(dialogueTypingCaption('ru', 'slow', 'Мила')).toBe('Отвечает дольше обычного');
    expect(dialogueTypingCaption('ru', 'none', 'Мила')).toBeNull();
    // без имени собеседника не подставляем выдуманное — стадия «печатает» молчит, «дольше обычного» говорит
    expect(dialogueTypingCaption('ru', 'typing', null)).toBeNull();
    expect(dialogueTypingCaption('ru', 'typing', '  ')).toBeNull();
    expect(dialogueTypingCaption('ru', 'slow', null)).toBe('Отвечает дольше обычного');
  });

  it('поле ввода доступно, пока ждём ответ; отправка, микрофон и «Завершить» — нет', () => {
    const screen = read('components/dialogs/DialogueV2SessionScreen.tsx');
    expect(screen).toContain('editable={!voiceBusy && !inputLocked}');
    expect(screen).not.toContain('editable={!sending && !voiceBusy && !inputLocked}');
    expect(screen).toContain('disabled={sending || !canSend}');
    expect(screen).toContain("onSubmitEditing={() => { if (!sending && canSend) onSend(); }}");
    expect(screen).toContain('const completeDisabled = sending || voiceBusy || messages.length === 0;');
    expect(screen).toContain('caption={typingCaption}');
  });

  it('гонка «ответ пришёл, пока человек печатает»: ответ и ошибка не трогают набранное, второй отправки нет', () => {
    const route = read('app/dialogue_v2_session.tsx');
    const runStart = route.indexOf('const runPendingTurn = async');
    const sendStart = route.indexOf('const send = async () => {');
    expect(runStart).toBeGreaterThan(-1);
    expect(sendStart).toBeGreaterThan(runStart);
    const appendStart = route.indexOf('const appendReplies = async');
    // ни разбор ответа, ни ход, ни его ошибка не чистят черновик
    expect(route.slice(appendStart, sendStart)).not.toContain('setDraft(');
    const send = route.slice(sendStart, route.indexOf('const retry = () => {'));
    // повторная отправка, пока ход в полёте, — ранний выход
    expect(send).toMatch(/\|\| sending \|\| turnStartingRef\.current/);
    // черновик очищается ТОЛЬКО при создании нового хода — до сети, вместе с пузырём ученика
    const clears = send.split('setDraft(').length - 1;
    expect(clears).toBe(1);
    expect(send.indexOf("setDraft('');")).toBeGreaterThan(send.indexOf('if (!pending) {'));
    expect(send.indexOf("setDraft('');")).toBeLessThan(send.indexOf('await runPendingTurn(pending);'));
  });

  // Макеты 6dcbedb9f, dialogs-014/022/029: аватар собеседника — значок сценки (как строка каталога), неизвестная сценка — значок мира.
  it('аватар собеседника: значок сценки, иначе мира по префиксу id', () => {
    expect(dialogueScenarioAvatarIcon('social_01')).toBe(dialogueScenarioIcon('social_01', 'people'));
    expect(dialogueScenarioAvatarIcon('travel_999')).toBe('airplane');
    expect(dialogueScenarioAvatarIcon('work_999')).toBe(dialogueWorldIcon('work'));
    expect(dialogueScenarioAvatarIcon('unknown_1')).toBe('cafe');
    const chat = read('components/dialogs/glass/DialogueGlassChat.tsx');
    expect(chat).toContain("<Ionicons name={icon ?? 'person-outline'} size={20} color={glass.secondary} />");
    const screen = read('components/dialogs/DialogueV2SessionScreen.tsx');
    expect(screen).toContain('avatarIcon={personaIcon}');
    expect(read('app/dialogue_v2_session.tsx')).toContain('personaIcon={scenarioId ? dialogueScenarioAvatarIcon(scenarioId) : undefined}');
  });

  // dialogs-022/029: «N/30» в шапке с первого кадра; зеркало 'unknown' — «—/30», цифру даст сервер.
  it('пилюля квоты в шапке чата: неизвестный остаток — «—/30», не скрыта', () => {
    const hook = read('hooks/use_dialogue_v2_session_coaching.ts');
    expect(hook).toContain("setQuotaUnknown(state.status === 'unknown');");
    expect(hook).toContain('? Object.freeze({ remaining: null, total: DIALOGUE_V2_FREE_MONTHLY_REPLIES })');
    const route = read('app/dialogue_v2_session.tsx');
    expect(route).toContain("text: `${coaching.quotaView.remaining ?? '—'}/${coaching.quotaView.total}`,");
    expect(route).toContain('? aiDialogMonthlyLimitText(lang, coaching.quotaView.total)');
  });

  it('[DIALOGUE-V2-LATENCY]: запрос, разбор, кадр, возраст прогрева — только в dev', () => {
    const trace = read('app/dialogue_v2_optimistic_trace.ts');
    expect(trace).toMatch(/export function logDialogueV2Latency\([^)]*\): void \{\n  if \(!devEnabled\(\)\) return;\n  console\.log\('\[DIALOGUE-V2-LATENCY\]'/);
    const route = read('app/dialogue_v2_session.tsx');
    expect(route).toContain('const lastWarmAt = peekDialogueV2LastWarmAtMs();');
    expect(route).toContain("outcome: 'reply', callableMs, appendMs, frameMs:");
    expect(route).toContain("outcome: 'failed', reason, callableMs:");
  });
});
