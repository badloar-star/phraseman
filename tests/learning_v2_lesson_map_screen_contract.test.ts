import fs from 'node:fs';
import path from 'node:path';

const screenPath = path.join(process.cwd(), 'app', 'learning-v2', 'lesson', '[id].tsx');
const source = fs.readFileSync(screenPath, 'utf8');

describe('Learning V2 Lesson 1 map screen contract', () => {
  it('is a separate route and loads real local-first progress without touching legacy economy', () => {
    expect(source).toContain('createLesson1LocalProgressStore(AsyncStorage');
    expect(source).toContain('lesson1MapInputFromProgress(state)');
    expect(source).toContain('buildLesson1LegacyV2SourcePayload()');
    expect(source).not.toMatch(/useEnergy|EnergyBar|registerXP|registerShards/);
  });

  it('keeps the mock-08 geometry, semantic actions and reduced-motion guardrails explicit', () => {
    expect(source).toContain("['understand', 'use', 'master']");
    expect(source).toContain('height:96');
    expect(source).toContain('width:40,height:40');
    expect(source).toContain('useStableSafeAreaInsets');
    expect(source).toContain('useReducedMotion');
    expect(source).toContain('AppState.addEventListener');
    expect(source).toContain('FadeInDown.delay((node.order - 1) * 40).duration(320)');
    expect(source).toContain('Easing.bezier(.38, .70, .125, 1)');
    expect(source).toContain('SlideInDown.duration(320)');
    expect(source).toContain('Открыть словарь урока');
    expect(source).toContain('Открыть теорию урока');
  });
});
