// зачем (Волна 2, пункт 17): лайк набора — управляющая кнопка, на ней отклик в руке (владелец: вибрации на строках и плитках нет, на кнопках есть).
// Вибрация стоит ПОСЛЕ защит (свой набор, лайк в полёте) и рядом с попом сердца — повторный/пустой тап не дёргает телефон.
import * as fs from 'fs';
import * as path from 'path';

const source = fs.readFileSync(path.join(__dirname, '..', 'app/community_packs/CommunityPackSocialBar.tsx'), 'utf8').replace(/\r\n/g, '\n');

describe('вибрация на лайке набора', () => {
  it('hapticTap подключён из общего хука вибраций', () => {
    expect(source).toContain("import { hapticTap } from '../../hooks/use-haptics';");
  });
  it('вибрация стоит после защит и прямо перед попом сердца', () => {
    const press = source.slice(source.indexOf('const onLikePress = useCallback'));
    const guardOwn = press.indexOf('Свой набор поддержать сердечком нельзя');
    const guardFlight = press.indexOf('reason=like_in_flight');
    const haptic = press.indexOf('hapticTap();');
    const pop = press.indexOf('runLikePop();');
    expect(guardOwn).toBeGreaterThan(-1);
    expect(guardFlight).toBeGreaterThan(guardOwn);
    expect(haptic).toBeGreaterThan(guardFlight);
    expect(pop).toBeGreaterThan(haptic);
  });
  it('вибрация только в обработчике лайка (не на строках и не при рендере)', () => {
    expect((source.match(/hapticTap\(\)/g) ?? []).length).toBe(1);
  });
});
