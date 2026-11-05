// зачем (владелец 05.11, хаб «Карточки» — СПИСОК по утверждённому макету rev4): стопки и её вечного «парения» больше нет, замер [CARDS-HUB-ANIM]
// (CardsHubAnimProbe) удалён вместе с ней. Сторож: в хабе нет вечных циклов. dev-подмена `animations=off` остаётся — ей пользуется робот и на других экранах.
// (Имя файла историческое.)
import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').split('\r\n').join('\n');

describe('хаб Карточек: без вечных анимаций; dev-стоп для робота', () => {
  const hub = read('app/flashcards/CardsHubV2.tsx');

  it('в списке нет withRepeat / Animated.loop и замера парения', () => {
    expect(hub).not.toMatch(/withRepeat\(|Animated\.loop\(/);
    expect(hub).not.toContain('CardsHubAnimProbe');
    expect(hub).not.toContain('floatLoop');
    expect(fs.existsSync(path.join(__dirname, '..', 'app/flashcards/CardsHubAnimProbe.tsx'))).toBe(false);
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
