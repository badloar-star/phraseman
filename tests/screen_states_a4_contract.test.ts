// зачем (бета-тест А4, 15.10): человеческие состояния экранов сборки — «Восстановить покупки» без связи с магазином не молчит, длинное название урока на «Продолжить» обрезается с «…»,
// подпись недели в Пике переносится. Сторож по исходникам, чтобы правки не откатили незаметно.
import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string): string => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

describe('А4: человеческие состояния', () => {
  it('«Восстановить» в управлении подпиской: нет связи с магазином → тост, а не тишина; устаревшая операция молчит', () => {
    const src = read('app/manage_subscription.tsx');
    expect(src).toContain("import { storePriceTrim, storeUnreachableToast } from './paywall_purchase';");
    expect(src).toMatch(/drop:identity_sync_failed stillCurrent=\$\{stillCurrent\}/);
    expect(src).toContain("if (stillCurrent) emitAppEvent('action_toast', storeUnreachableToast());");
  });

  it('«Продолжить»: название урока в два ряда с многоточием', () => {
    expect(read('components/home/v2/HomeV2ContinueCard.tsx')).toContain('testID="home-continue-lesson-title" numberOfLines={2} ellipsizeMode="tail"');
  });

  it('подпись недели Пика сжимается рядом с плашкой энергии', () => {
    expect(read('components/spire/SpireWeekSubtitle.tsx')).toMatch(/subtitle: \{ fontSize: 16, lineHeight: 20, flexShrink: 1 \}/);
  });
});
