// зачем (координатор 22.10, пакет ai-consent-freeform-gate): сообщения ученика уходят в OpenAI только после согласия на ИИ-диалоги.
// «Свободный разговор» открывался без окна согласия — реплики уходили в ИИ без «Включить». Сторож: каждый экран, который сам
// стартует или отправляет ход ИИ, стоит за общим шлюзом AiDialogConsentGate (экран не монтируется, пока согласия нет).
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.join(__dirname, '..');
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n');

function walk(dir: string): string[] {
  return fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true }).flatMap((e) => {
    const rel = `${dir}/${e.name}`;
    if (e.isDirectory()) return ['node_modules', '__tests__'].includes(e.name) ? [] : walk(rel);
    return /\.tsx$/.test(e.name) ? [rel] : [];
  });
}

// Вызовы, которые отправляют текст ученика в ИИ или открывают разговор с ИИ.
const AI_CALLS = /\b(callPremiumDialogSend|startDialogueV2FreeformSession|sendDialogueV2FreeformTurn|sendDialogueV2TextTurn|sendDialogueV2CoachedTextTurn|startDialogueV2TextSession)\(/;

describe('каждый вход ИИ — через шлюз согласия', () => {
  it('экраны, которые сами стартуют или шлют ход ИИ, стоят за AiDialogConsentGate', () => {
    const screens = [...walk('app'), ...walk('components')].filter((rel) => AI_CALLS.test(read(rel)));
    expect(screens.length).toBeGreaterThan(0);
    const ungated = screens.filter((rel) => !/<AiDialogConsentGate\b/.test(read(rel)));
    expect(ungated).toEqual([]);
  });

  it('«Свободный разговор»: маршрут — шлюз с режимом free, сессия стартует только внутри экрана за шлюзом', () => {
    const src = read('app/dialogue_v2_freeform.tsx');
    const route = src.indexOf('export default function DialogueV2FreeformRoute()');
    const content = src.indexOf('function DialogueV2FreeformContent()');
    expect(route).toBeGreaterThan(0);
    expect(content).toBeGreaterThan(route);
    expect(src.slice(route, content)).toMatch(/<AiDialogConsentGate mode="free"[\s\S]*?>\s*<DialogueV2FreeformContent \/>\s*<\/AiDialogConsentGate>/);
    expect(src.indexOf('startDialogueV2FreeformSession(')).toBeGreaterThan(content);
    // ответ сервера «нет согласия» снова открывает окно, а не «недоступно»
    expect(src).toMatch(/isFreeformConsentRequired\(error\)\) \{[\s\S]{0,300}askConsentAgain\('freeform_start'\)/);
  });

  it('окно согласия знает режим свободного разговора, шлюз передаёт режим и пишет [AI-CONSENT]', () => {
    const modal = read('components/AiDialogConsentModal.tsx');
    expect(modal).toContain("introduction={mode === 'free' ? introductionFree : introduction}");
    expect(modal).toContain('Говори о чём угодно — собеседник поддержит разговор на изучаемом языке.');
    const gate = read('app/ai_dialog_consent_gate.tsx');
    expect(gate).toMatch(/<AiDialogConsentModal\s+visible=\{gateVisible\}\s+mode=\{mode\}/);
    for (const event of ['gate:undecided → ask', 'gate:accept', 'gate:decline', 'gate:ask_again']) expect(gate).toContain(`[AI-CONSENT] ${event}`);
  });

  it('клиент свободного разговора распознаёт отказ сервера ai_consent_required', () => {
    const client = read('app/dialogue_v2_freeform_client.ts');
    expect(client).toMatch(/if \(isAiConsentRequiredError\(error\)\) return new DialogueV2FreeformUnavailableError\('ai_consent_required'\);/);
  });
});
