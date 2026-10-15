// зачем (Макеты spire-gap-009, поручение координатора 15.10): пока старт невозможен, «Подняться» выглядит как `.cta.dis` образца; busy остаётся прежним (Optimistic UI Шпиля);
// лог [SPIRE-DOCK] показывает этаж, комнату и причины блокировки.
import { readFileSync } from 'fs';
import { join } from 'path';

const read = (name: string) => readFileSync(join(__dirname, '..', 'components', 'spire', name), 'utf8').replace(/\r\n/g, '\n');

describe('Шпиль: нижняя кнопка без комнаты (spire-gap-009)', () => {
  const dock = read('SpireClimbDock.tsx');
  it('неактивный вид — токены ОТКЛЮЧЁННОЙ заливки/подписи темы (эталон kit.css .cta.dis, spire-gap-010: не сливается с фоном), малая тень; busy и активная — как раньше', () => {
    expect(dock).toMatch(/const dis = !ready && !busy;/);
    expect(dock).toContain('fill: g.buttonFillDisabled, ink: g.buttonInkDisabled');
    expect(dock).toMatch(/\[s\.cta, \{ backgroundColor: off\.fill \}, sh\.nested\]/);
    expect(dock).toMatch(/opacity: enabled \? 1 : 0\.4 \}, enabled \? sh\.action\(p\.cta\) : null/);
    expect(dock).toMatch(/color: dis \? off\.ink : p\.ctaText/);
    expect(dock).toMatch(/disabled=\{!enabled\}/);
  });
  it('лог [SPIRE-DOCK] есть у кнопки, домашнего экрана и пилюли энергии; только в dev', () => {
    expect(dock).toContain("logSpireDock('button'");
    expect(read('SpireHomeScreen.tsx')).toContain("logSpireDock('home'");
    expect(read('SpireHomeScreen.tsx')).toMatch(/notReadyBecause/);
    expect(read('SpireEnergyPill.tsx')).toContain("logSpireDock('energy-pill'");
    const log = read('spire_layout_log.ts');
    expect(log).toContain('[SPIRE-DOCK]');
    expect(log).toMatch(/__DEV__ !== true\) return;/);
  });
});
