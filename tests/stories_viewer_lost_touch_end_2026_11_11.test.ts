// Сторож починки 11.11 (владелец: «некоторые истории показывает пауза при открытии и не воспроизводится»).
// Причина по журналу [STORY-VIEWER]: тап по кадру-объявлению листал кадр, его слой снимался раньше, чем доходило «палец поднят»,
// событие onTouchEnd терялось — и следующий кадр стоял на паузе со значком. Падает, если касание снова начнут снимать ТОЛЬКО по onTouchEnd.
import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string): string => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');
const code = (src: string): string => src.replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/ \/\/ .*$/gm, '');

describe('просмотр историй: потерянное «палец поднят» не оставляет кадр на паузе', () => {
  const viewer = code(read('components/stories/StoryViewer.tsx'));
  const layer = code(read('components/stories/templates/StoryAnnouncementV2Layer.tsx'));

  it('условие поломки на месте: слой объявления ловит касания детьми и пересоздаётся на каждый кадр', () => {
    expect(layer).toContain('pointerEvents="box-none"');
    expect(viewer).toContain('<StoryAnnouncementV2Layer key={event.id}');
  });

  it('завершённый тап снимает касание первым делом — до выходов «шапка» и «кнопка действия» и до перелистывания', () => {
    const tap = /const onTapAt = useCallback\(\(x: number, y: number\) => \{([\s\S]*?)\}, \[fingerLifted, go, headerH, winW\]\);/u.exec(viewer)?.[1] ?? '';
    expect(tap).not.toBe('');
    const lifted = tap.indexOf("fingerLifted('tap')");
    expect(lifted).toBeGreaterThanOrEqual(0);
    expect(lifted).toBeLessThan(tap.indexOf('if (y < headerH)'));
    expect(lifted).toBeLessThan(tap.indexOf('ctaZoneRef.current'));
    expect(lifted).toBeLessThan(tap.indexOf('go('));
  });

  it('завершённое удержание тоже снимает касание', () => {
    expect(viewer).toContain(".onEnd((_e, ok) => { if (ok) runOnJS(fingerLifted)('hold_end'); })");
  });

  it('любая смена кадра снимает касание, начатое на прежнем кадре, — до показа нового кадра и запуска его полосы', () => {
    const go = /const go = useCallback\(\(target: number\) => \{([\s\S]*?)\}, \[appear, close, count, events, progress, reduceMotion, runBar\]\);/u.exec(viewer)?.[1] ?? '';
    expect(go).not.toBe('');
    const released = go.indexOf("releaseTouchRef.current('slide_change')");
    expect(released).toBeGreaterThanOrEqual(0);
    expect(released).toBeLessThan(go.indexOf('indexRef.current = k;'));
    expect(released).toBeLessThan(go.indexOf('runBar(0)'));
    expect(viewer).toContain('releaseTouchRef.current = fingerLifted;');
  });

  it('снятие сбрасывает именно касание и пересчитывает паузу; без зависшего касания — ничего не делает', () => {
    const body = /const fingerLifted = useCallback\(\(why: string\) => \{([\s\S]*?)\}, \[applyHold\]\);/u.exec(viewer)?.[1] ?? '';
    expect(body).toContain('if (!touchHeldRef.current) return;');
    expect(body).toContain('touchHeldRef.current = false;');
    expect(body).toContain('applyHold(why);');
    expect(body).toContain('DebugLogger.info(LOG');
  });
});
