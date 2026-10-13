// зачем (Сверка, practice-001…003: `uiautomator dump` не отдаёт дерево на живом Блице — «could not get idle state»; координатор 13.10): dev `animations=off` замораживает таймер Блица (полоса и тики секунд не запускаются),
// ссылкам Блица в steps-модуле добавлен `animations=off`. В стор-сборке флаг всегда false (dev_animations_off.ts).
import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

describe('Блиц: dev-заморозка таймера для съёмки', () => {
  const blitz = read('app/flashcards_blitz_session.tsx');

  it('первый запуск и возобновление не стартуют анимацию и тикер при animations=off', () => {
    expect(blitz).toContain("import { isDevAnimationsOff } from './dev_animations_off';");
    const first = blitz.indexOf("console.log('[DEV-STATE] blitz: таймер заморожен (animations=off)");
    expect(first).toBeGreaterThan(0);
    expect(blitz.indexOf('startRoundTicker();', first)).toBeGreaterThan(first); // тикер идёт ПОСЛЕ ранней ветки
    const resume = blitz.indexOf("console.log('[DEV-STATE] blitz: возобновление без анимации (animations=off)");
    expect(resume).toBeGreaterThan(0);
    expect(blitz.indexOf('progress.value = withTiming(0, { duration: remainingMs', resume)).toBeGreaterThan(resume);
    expect((blitz.match(/if \(isDevAnimationsOff\(\)\) \{/g) ?? []).length).toBe(2);
  });

  it('флаг dev-только: в стор-сборке геттер всегда false', () => {
    const flag = read('app/dev_animations_off.ts');
    expect(flag).toContain('return devAvailable() && off;');
    expect(flag).toContain('!IS_STORE_RELEASE');
  });

  it('steps-модуль добавляет animations=off всем ссылкам на Блиц', () => {
    const p84 = read('scripts/dev_links_r1_steps_p84.py');
    expect(p84).toContain("if 'flashcards_blitz_session' in _entry_data['link']:");
    expect(p84).toContain("set_param(_rid, 'animations', 'off')");
  });
});
