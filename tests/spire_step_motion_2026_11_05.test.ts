// зачем (ТОП-20 №14, 05.11): ступень Пика — «Правильно: …» появляется мягко и прокрутка доходит до неё; потеря сердца — короткое сжатие. Reduce Motion — без движения.
import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

describe('ступень Пика: мягкая подсказка и сжатие сердца', () => {
  const screen = read('components/spire/SpireStepScreen.tsx');
  const hearts = read('components/spire/SpireHeartsRow.tsx');
  it('подсказка — Animated.View с входом, который выключается при Reduce Motion; тег закрыт парным', () => {
    expect(screen).toContain('entering={reduceMotion ? undefined : FadeInDown.duration(180)');
    expect(screen).toContain('testID="spire-step-hint">');
    expect(screen).toContain('</Animated.View>\n        ) : null}\n      </ScrollView>');
  });
  it('прокрутка доходит до подсказки: ref, scrollToEnd, анимация только без Reduce Motion, таймер чистится', () => {
    expect(screen).toContain('<ScrollView ref={scrollRef}');
    expect(screen).toContain('scrollRef.current?.scrollToEnd({ animated: !reduceMotion })');
    expect(screen).toContain('return () => clearTimeout(timer);');
  });
  it('сердце сжимается при потере (on: true → false), при Reduce Motion — нет', () => {
    expect(hearts).toContain('if (wasOn.current && !on && !reduce) squeeze.value = withSequence(withTiming(0.82');
    expect(hearts).toContain('if (reduce) return { transform: [{ scale: 1 }] };');
    expect(hearts).toContain('{ transform: [{ scale: squeeze.value }] }');
  });
});
