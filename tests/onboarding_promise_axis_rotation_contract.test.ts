// зачем (R1 onboarding-011, Макеты 12.10): подпись оси «Прогресс» повёрнута вдоль правого края; поворот живёт в том же массиве transform, что и анимация появления (иначе её затирает).
import fs from 'node:fs';
import path from 'node:path';

const src = fs.readFileSync(path.join(__dirname, '..', 'components/CleanOnboarding.tsx'), 'utf8').replace(/\r\n/g, '\n');

describe('онбординг «Прогресс»: ось Y повёрнута', () => {
  it("подпись Y использует axesYStyle с rotate '90deg' в одном transform вместе со сдвигом", () => {
    expect(src).toContain("const axesYStyle = { opacity: axes, transform: [{ translateY: axes.interpolate({ inputRange: [0, 1], outputRange: [6, 0] }) }, { rotate: '90deg' }] };");
    expect(src).toContain('style={[styles.promiseAxisY, axesYStyle]}>{copy.chartProgress}');
    // подпись времени (X) остаётся на прежнем axesStyle без поворота
    expect(src).toContain('style={[styles.promiseAxisX, axesStyle]}>{copy.chartTime}');
  });
});
