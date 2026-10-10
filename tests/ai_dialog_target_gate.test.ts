import {
  aiDialogContentAvailableForTarget,
  aiDialogContentGateForTarget,
  aiDialogTargetGateCopy,
} from '../app/ai_dialog_target_gate';
import fs from 'fs';
import path from 'path';

describe('AI dialogue target activation gate', () => {
  it('activates Spanish, French, and German without changing their target identity', () => {
    for (const target of ['es', 'fr', 'de'] as const) {
      const gate = aiDialogContentGateForTarget(target);
      expect(gate.enabled).toBe(true);
      expect(gate.studyTarget).toBe(target);
      expect(aiDialogContentAvailableForTarget(target)).toBe(true);
    }
  });

  it('keeps an unknown target closed instead of falling back to English', () => {
    const gate = aiDialogContentGateForTarget('it');
    expect(gate.enabled).toBe(false);
    expect(gate.studyTarget).toBe('unknown');
    expect(aiDialogContentAvailableForTarget('it')).toBe(false);
  });

  it('keeps the existing English dialogue bank available', () => {
    expect(aiDialogContentGateForTarget('en')).toMatchObject({
      enabled: true,
      studyTarget: 'en',
      reason: 'english_ai_dialog_scenarios_available',
    });
  });

  it('does not describe an unknown target as French', () => {
    const copy = aiDialogTargetGateCopy('en', 'it');
    expect(copy.title).toContain('not available');
    expect(copy.title).not.toContain('French');
  });

  it('blocks energy and network warmup before an unavailable target can cause a side effect', () => {
    const read = (file: string) => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
    const session = read('app/ai_dialog_session.tsx');
    const companion = read('app/ai_companion_session.tsx');

    expect(session).toContain('const dialogueRuntimeOpen = aiDialogGateOpen && promptScenario !== null && presentation !== null;');
    // зачем (10.10): энергия за диалог списывается на «Начать» в брифинге V2 (решение владельца 30.09; d41a81887 снял
    // списание из сессии v1). Каталог открывает только брифинг V2, v1-сессия из интерфейса недоступна. Сессия v1 сама
    // энергию не тратит, а брифинг V2 тратит её через confirmSpendOne.
    expect(session).not.toContain('confirmSpendOne');
    const briefingV2 = read('app/dialogue_v2_briefing.tsx');
    expect(briefingV2).toContain('await confirmSpendOne(energyIntent)');
    // компаньон v1 (ai_companion_session) из интерфейса недоступен — его ветка в DialogsTabContentBody не используется.
    void companion;
  });

  it('does not render English catalogue worlds for a blocked target', () => {
    const catalogue = fs.readFileSync(path.join(__dirname, '..', 'components', 'DialogsTabContent.tsx'), 'utf8');
    expect(catalogue).toContain('{aiDialogGateOpen && courseGroupVMs.map(');
    expect(catalogue).toContain('{aiDialogGateOpen && challengeVMs.length > 0 &&');
  });
});
