// зачем (координатор 24.10, скрин владельца: «Teach me» → вечные «•••», «не должно быть зависаний»): у вызовов «Свободного разговора»
// не было своего потолка — клиент ждал нативные минуты. Сторож: у старта и хода есть потолок (серверный + запас), отказ хода гасит «•••»
// и показывает плашку с «Повторить», каждый шаг пишет [FREEFORM-HANG].
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.join(__dirname, '..');
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n');

describe('«Свободный разговор» не висит на «•••»', () => {
  const client = read('app/dialogue_v2_freeform_client.ts');
  const screen = read('app/dialogue_v2_freeform.tsx');

  it('у старта и хода есть свой потолок не меньше серверного', () => {
    const start = Number(/DIALOGUE_V2_FREEFORM_START_TIMEOUT_MS = ([\d_]+);/.exec(client)?.[1]?.replace(/_/g, ''));
    const turn = Number(/DIALOGUE_V2_FREEFORM_TURN_TIMEOUT_MS = ([\d_]+);/.exec(client)?.[1]?.replace(/_/g, ''));
    const serverStart = Number(/timeoutSeconds: (\d+)/.exec(read('functions/src/dialogue_v2_freeform_session_start_callable.ts'))?.[1]) * 1000;
    const serverTurn = Number(/timeoutSeconds: (\d+)/.exec(read('functions/src/dialogue_v2_freeform_session_turn_callable.ts'))?.[1]) * 1000;
    expect(start).toBeGreaterThan(serverStart);
    expect(turn).toBeGreaterThan(serverTurn);
    expect(start).toBeLessThanOrEqual(serverStart + 5_000);
    expect(turn).toBeLessThanOrEqual(serverTurn + 5_000);
    expect(client).toMatch(/'dialogueV2FreeformSessionStart',\s*\{ timeout: DIALOGUE_V2_FREEFORM_START_TIMEOUT_MS \}/);
    expect(client).toMatch(/'dialogueV2FreeformSessionTurn',\s*\{ timeout: DIALOGUE_V2_FREEFORM_TURN_TIMEOUT_MS \}/);
  });

  it('каждый шаг хода пишет [FREEFORM-HANG]: отправка, ответ, отказ, что показали', () => {
    for (const event of ['turn:send', 'turn:response', 'turn:failed']) expect(client).toContain(`[FREEFORM-HANG] ${event}`);
    expect(screen).toContain('[FREEFORM-HANG] turn:shown');
  });

  // зачем (координатор 24.10: сервер отвечал 200 за 9–20 с, а «•••» висели — залипание на клиенте): страж «•••»
  it('страж «•••»: дольше потолков старта и хода точки не висят; отброшенный ответ пишет причину', () => {
    expect(screen).toContain('const FREEFORM_DOTS_WATCHDOG_MS = DIALOGUE_V2_FREEFORM_START_TIMEOUT_MS + DIALOGUE_V2_FREEFORM_TURN_TIMEOUT_MS + 6_000;');
    expect(screen).toMatch(/\[FREEFORM-HANG\] watchdog: dots too long → retry bar[\s\S]{0,600}setSending\(false\);\s*setTurnFailed\(true\);/);
    expect(screen).toContain('[FREEFORM-HANG] turn:result_dropped');
    // поздний настоящий ответ снимает плашку
    // зачем (Ядро 25.10): f106171a3 добавил перевод в тот же объект реплики (строки между text и `})]));`) — сторож краснел на HEAD.
    // Смысл тот же: сразу после вставки ответа в ленту — setTurnFailed(false); допускаем до 400 знаков полей реплики.
    expect(screen).toMatch(/text: result\.assistantMessage,[\s\S]{0,400}?\}\)\]\)\);\s*\/\/[^\n]*\n\s*setTurnFailed\(false\);/);
  });

  it('сбой хода гасит «•••» и ставит плашку с «Повторить»; «нет согласия» — снова окно согласия', () => {
    expect(screen).toMatch(/if \(current\) setTurnFailed\(true\);/);
    expect(screen).toMatch(/finally \{\s*if \(isCurrentPending\(pending\)\) \{\s*setSending\(false\);/);
    expect(screen).toContain("askConsentAgain('freeform_turn')");
  });
});
