// зачем (координатор 12.10): «парение» стопки хаба Карточек бесконечное — по приказу владельца 11.10 («хаб утра»); оно живёт только пока экран активен, а для робота есть dev-подмена
// `animations=off` (только память, в стор-сборке недоступна). Замер [CARDS-HUB-ANIM] рисуется только в dev. (Имя файла историческое: сначала парение сделали конечным, решение отменено.)
import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').split('\r\n').join('\n');

describe('хаб Карточек: парение бесконечное, но только пока экран активен; dev-стоп для робота', () => {
  const hub = read('app/flashcards/CardsHubV2.tsx');

  it('withRepeat(-1) под гардом активности, reduceMotion и dev-подмены; при уходе значение сбрасывается', () => {
    expect(hub).toMatch(/withRepeat\(withTiming\(-8, \{ duration: 5000, easing: Easing\.inOut\(Easing\.sin\) \}\), -1, true\)/);
    expect(hub).toContain('if (reduceMotion || !runtimeActive || animationsOffByDev) return undefined;');
    expect(hub).toContain("return () => { float.value = 0; noteHubSubscription('CardsHubV2.floatLoop', 'off'); };");
    expect(hub).toContain('useSyncExternalStore(subscribeDevAnimationsOff, isDevAnimationsOff, () => false)');
  });

  it('замер [CARDS-HUB-ANIM] рисуется только при __DEV__ и пишет только через dev-гард', () => {
    expect(hub).toMatch(/typeof __DEV__ !== 'undefined' && __DEV__\s*\? <CardsHubAnimProbe/);
    const probe = read('app/flashcards/CardsHubAnimProbe.tsx');
    expect(probe).toContain("const log = (message: string): void => { if (DEV) console.log(message); };");
    expect(probe).not.toMatch(/\bconsole\.log\((?!message)/);
    expect(probe).toContain('[CARDS-HUB-ANIM]');
  });

  it('dev_animations_off: только память, в стор-сборке геттер false и установка отклоняется; ссылки хаба несут animations=off', () => {
    const flag = read('app/dev_animations_off.ts');
    expect(flag).toContain("typeof __DEV__ !== 'undefined' && __DEV__ === true && !IS_STORE_RELEASE");
    expect(flag).toContain('return devAvailable() && off;');
    expect(flag).toContain('отклонено — не dev-сборка');
    expect(flag).not.toMatch(/AsyncStorage|firestore|setDoc/i);
    const fixtures = read('app/dev_state_fixtures.ts');
    expect(fixtures).toContain("request.animations = pick('animations', ['on', 'off'] as const);");
    expect(fixtures).toContain("setDevAnimationsOff(request.animations === 'off')");
    expect(read('scripts/dev_links_r1_steps.py')).toContain("HUB_FREE = 'cards=demo&plus=off&animations=off'");
  });
});
