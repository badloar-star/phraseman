// Координатор 26.10, аудит скорости Моментов №1б: в окне повышения башня акта 3 строилась на 6,2 с — посреди появления акта. Теперь акт 3
// собирается заранее невидимым (после того как встал акт 2) и на 6,2 с только проявляется; невидимый акт не ловит касаний и скрыт от диктора.
import fs from 'node:fs';
import path from 'node:path';

const promo = fs.readFileSync(path.join(__dirname, '..', 'components/spire/moments/MomentPromotion.tsx'), 'utf8').replace(/\r\n/g, '\n');

describe('окно повышения: башня акта 3 собрана заранее', () => {
  it('prep3 ставится через 600 мс после акта 2, акт 3 рисуется при act === 3 или prep3', () => {
    expect(promo).toContain('const PREP3_AFTER_ACT2_MS = 600;');
    expect(promo).toContain("at(T.act2 + PREP3_AFTER_ACT2_MS, () => { prepAtRef.current = Date.now(); setPhase((v) => ({ ...v, prep3: true })); });");
    expect(promo).toContain('{phase.act === 3 || phase.prep3 ? (');
  });

  it('до показа акт 3 невидим, без касаний и скрыт от диктора; проявление — act3In 420 мс; пропуск сразу показывает', () => {
    expect(promo).toContain("pointerEvents={phase.act === 3 ? 'box-none' : 'none'}");
    expect(promo).toContain("importantForAccessibility={phase.act === 3 ? 'auto' : 'no-hide-descendants'}");
    expect(promo).toContain('accessibilityElementsHidden={phase.act !== 3}');
    expect(promo).toContain('act3In.value = withTiming(1, { duration: 420 });');
    expect(promo).toContain('towerIn.value = 1; markerIn.value = 1; tagIn.value = 1; finalIn.value = 1; act3In.value = 1;');
    expect(promo).toContain('const act3In = useSharedValue(reduceMotion ? 1 : 0);');
  });

  it('замер в журнале: за сколько до показа башня уже собрана', () => {
    expect(promo).toContain('[MOMENT-PROMO] замер: башня акта 3 собрана заранее за');
  });
});
