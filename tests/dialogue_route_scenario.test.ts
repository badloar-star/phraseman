import fs from 'node:fs';
import path from 'node:path';
import { getPublicDialogScenarios } from '../app/ai_dialog_scenarios';
import { resolveDialogueRouteScenario } from '../app/dialogue_route_scenario';

describe('Dialogue direct-route boundary', () => {
  it('preserves each exact public scenario for all four targets', () => {
    for (const target of ['en', 'es', 'fr', 'de']) {
      for (const scene of getPublicDialogScenarios()) {
        expect(resolveDialogueRouteScenario({ scenarioId: scene.id }, target)?.id).toBe(scene.id);
      }
    }
  });

  it('rejects missing, unknown or ambiguous route values without substituting coffee', () => {
    for (const scenarioId of [undefined, '', 'bogus', ['coffee', 'taxi'], {}, 'toString']) {
      expect(resolveDialogueRouteScenario({ scenarioId }, 'de')).toBeNull();
    }
    expect(resolveDialogueRouteScenario({ scenarioId: 'coffee' }, 'it')).toBeNull();
  });

  it('keeps explicit legacy English lessons but never reuses them as a native pack', () => {
    const scene = { ...getPublicDialogScenarios()[0], id: 'lesson_1' };
    const build = jest.fn(() => scene);
    expect(resolveDialogueRouteScenario({ scenarioId: 'lesson_1', lessonId: '1' }, 'en', build)).toBe(scene);
    for (const target of ['es', 'fr', 'de']) {
      expect(resolveDialogueRouteScenario({ scenarioId: 'lesson_1', lessonId: '1' }, target, build)).toBeNull();
    }
    expect(resolveDialogueRouteScenario({ scenarioId: 'wrong', lessonId: '1' }, 'en', build)).toBeNull();
  });

  it('checks the route before mounting the session that can spend or warm', () => {
    const source = fs.readFileSync(path.resolve(__dirname, '../app/ai_dialog_session.tsx'), 'utf8');
    const route = source.slice(source.indexOf('export default function AiDialogSessionRoute'));
    expect(route.indexOf('if (!scenario)')).toBeGreaterThan(-1);
    expect(route.indexOf('if (!scenario)')).toBeLessThan(route.indexOf('<AiDialogSession'));
    expect(route).toContain('scenario={scenario}');
    expect(source).not.toContain("?? getScenarioById('coffee')!");
  });
});
