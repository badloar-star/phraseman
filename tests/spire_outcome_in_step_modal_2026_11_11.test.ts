// зачем (владелец 11.11.2026: «когда мы завершаем пик выходим то мелькает главная пика а затем экран что мы не прошли!»):
// окно итога ступени было отдельной модалкой — ступень закрывалась слайдом на башню, а итог появлялся позже. Теперь итог
// рисуется в той же модалке ступени: она не закрывается, пока есть итог, и между ступенью и итогом башни не видно.
import fs from 'fs';
import path from 'path';
import { spireStepModalContent } from '../components/spire/spire_step_modal_content';

const read = (rel: string): string => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');

describe('Пик: итог ступени без мелькания главной Пика', () => {
  it('модалка ступени остаётся открытой с итогом, когда ступень кончилась', () => {
    expect(spireStepModalContent(true, false, false)).toBe('step');
    // кадр конца ступени: session=null, итог уже есть — модалка НЕ закрывается, а показывает итог
    expect(spireStepModalContent(false, false, true)).toBe('after');
    // «Ещё раз»: итог гаснет, подготовка новой ступени в той же модалке
    expect(spireStepModalContent(false, true, false)).toBe('pending');
    expect(spireStepModalContent(false, true, true)).toBe('pending');
    // «В раздел Пик»: ничего нет — модалка закрывается на башню
    expect(spireStepModalContent(false, false, false)).toBeNull();
  });

  it('экран ступени открыт и при одном итоге; «назад» на итоге ведёт к башне', () => {
    const step = read('components/spire/SpireStepScreen.tsx');
    expect(step).toContain('visible={session !== null || pending !== null || after !== null}');
    expect(step).toContain('useSpireStepModalContent(session !== null, pending !== null, after !== null, exitRef, onAfterBack)');
    const hook = read('components/spire/spire_step_modal_content.ts');
    expect(hook).toContain("if (content === 'after') {");
    expect(hook).toContain('onAfterBack?.();');
  });

  it('экран Пика кладёт окно итога в модалку ступени, а слой моментов больше не открывает отдельную модалку итога', () => {
    const home = read('components/spire/SpireHomeScreen.tsx');
    expect(home).toContain('onAfterBack={game.dismissOutcome}');
    expect(home).toMatch(/after=\{momentOutcome && game\.outcome \? <Suspense fallback=\{null\}><SpireOutcomeMomentHost embedded /);
    const layer = read('components/spire/moments/SpireMomentsLayer.tsx');
    expect(layer).not.toContain('<SpireOutcomeMomentHost');
    const host = read('components/spire/moments/SpireOutcomeMomentHost.tsx');
    expect(host).toContain('if (embedded) return body;');
  });
});
