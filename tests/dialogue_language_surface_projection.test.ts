import fs from 'node:fs';
import path from 'node:path';
import { getPublicDialogScenarios, dialogScenarioTitle } from '../app/ai_dialog_scenarios';
import { DIALOGUE_LANGUAGE_PACKS } from '../app/dialogue_language_packs';
import { dialogueScenarioPresentation } from '../app/dialogue_scenario_presentation';

describe('Dialogue target-native surface projection', () => {
  it.each(['es', 'fr', 'de'] as const)('uses the %s pack on every public scenario surface', target => {
    for (const scenario of getPublicDialogScenarios()) {
      const native = DIALOGUE_LANGUAGE_PACKS[target]!.scenarios[scenario.id];
      for (const ui of ['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const) {
        expect(dialogueScenarioPresentation(scenario, target, ui)).toEqual({
          // A truthy legacy briefing replaces the goal/hint branch. Native
          // setting alone is not a learner task and must never hide its goals.
          title: native.title, goal: native.goal, hint: native.hint, briefing: null,
        });
      }
    }
  });

  it('preserves English presentation and never falls back for unsupported native scenes', () => {
    const scenario = getPublicDialogScenarios()[0];
    expect(dialogueScenarioPresentation(scenario, 'en', 'ru')?.title).toBe(dialogScenarioTitle(scenario, 'ru'));
    expect(dialogueScenarioPresentation(scenario, 'it', 'ru')).toBeNull();
    expect(dialogueScenarioPresentation({ ...scenario, id: 'absent-pack-scene' }, 'de', 'ru')).toBeNull();
    expect(dialogueScenarioPresentation({ ...scenario, id: '__proto__' }, 'de', 'ru')).toBeNull();
    expect(dialogueScenarioPresentation({ ...scenario, id: 'constructor' }, 'de', 'ru')).toBeNull();
  });

  it('wires catalogue, briefing and session to the same projection', () => {
    for (const file of ['components/DialogsTabContent.tsx', 'components/AiDialogBriefingScreen.tsx', 'app/ai_dialog_briefing.tsx', 'app/ai_dialog_session.tsx']) {
      const source = fs.readFileSync(path.resolve(__dirname, '..', file), 'utf8');
      expect(source.includes('dialogueScenarioPresentation(')).toBe(true);
    }
  });

  it('remounts scenario and companion state on a target change', () => {
    const scenario = fs.readFileSync(path.resolve(__dirname, '../app/ai_dialog_session.tsx'), 'utf8');
    const companion = fs.readFileSync(path.resolve(__dirname, '../app/ai_companion_session.tsx'), 'utf8');
    expect(scenario.slice(scenario.indexOf('export default function AiDialogSessionRoute'))).toMatch(/sessionKey = .*studyTarget/);
    expect(companion.includes('<AiCompanionSession key={studyTarget} />')).toBe(true);
  });

  it('never tells a native-contour learner to reply in English in companion help', () => {
    const companion = fs.readFileSync(path.resolve(__dirname, '../app/ai_companion_session.tsx'), 'utf8');
    for (const leak of ['по-английски', 'англійською', 'in English with', 'en inglés', 'em inglês', 'bằng tiếng Anh', 'bahasa Inggris', 'İngilizce', 'po angielsku']) {
      expect(companion).not.toContain(leak);
    }
  });
});
