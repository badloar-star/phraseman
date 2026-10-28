// ЗАМОК по просмотру историй (слово владельца 24.10 через координатора: «истории должны открываться, и каждая должна продолжаться хотя бы секунд 10,
// и как в Инстаграме — при зажатии экрана она паузится»; реестр docs/work/OWNER_LOCKS.md). Падает, если слайд укоротят, удержание перестанет ставить полосу на паузу,
// пропадёт тап по краям / свайп вниз или исчезнет журнал причины «кольца нет».
import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string): string => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');
const code = (src: string): string => src.replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/ \/\/ .*$/gm, '');

describe('Замок: просмотр историй — 10 секунд на слайд и пауза удержанием', () => {
  const viewer = code(read('components/stories/StoryViewer.tsx'));
  const slot = code(read('components/stories/StoryAvatarSlot.tsx'));

  // ЗАМОК ВЛАДЕЛЬЦА 24.10: «каждая должна продолжаться хотя бы секунд 10» — слайд не короче 10 000 мс
  it('слайд идёт не меньше 10 секунд', () => {
    const ms = Number(/export const STORY_SLIDE_MS = (\d+);/u.exec(viewer)?.[1]);
    expect(ms).toBeGreaterThanOrEqual(10000);
    expect(viewer).toContain('withTiming(1, { duration: left, easing: EASE_LINEAR }');
  });

  // ЗАМОК ВЛАДЕЛЬЦА 24.10: «при зажатии экрана она паузится» — удержание ставит полосу на паузу и снимает отпусканием, с места остановки
  it('удержание пальца = пауза полосы, отпускание — продолжение с того же места', () => {
    expect(viewer).toContain('Gesture.LongPress().minDuration(STORY_HOLD_MS)');
    expect(viewer).toContain('.onStart(() => { runOnJS(setHold)(true); })');
    expect(viewer).toContain('.onFinalize(() => { runOnJS(setHold)(false); })');
    expect(viewer).toContain('const shouldPause = heldRef.current || !runtimeRef.current || screenReaderRef.current;');
    expect(viewer).toContain('cancelAnimation(progress);');
    expect(viewer).toContain('runBar(progress.value);');
    expect(Number(/export const STORY_HOLD_MS = (\d+);/u.exec(viewer)?.[1])).toBeLessThanOrEqual(300);
  });

  // ЗАМОК ВЛАДЕЛЬЦА 24.10: «как в Инстаграме — при зажатии экрана она паузится» — у Инстаграма пауза мгновенная, с первого касания, а не через 220 мс
  it('пауза ставится с ПЕРВОГО касания (onTouchStart), снимается, когда нет ни касания, ни жеста', () => {
    expect(viewer).toContain('onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} onTouchCancel={onTouchCancel}');
    expect(viewer).toContain('const next = gestureHeldRef.current || touchHeldRef.current;');
    expect(viewer).toContain('touchHeldRef.current = e.nativeEvent.touches.length > 0;');
  });

  // ЗАМОК ВЛАДЕЛЬЦА 24.10: «как в Инстаграме» — тап слева назад, справа вперёд, свайп вниз закрывает
  it('тап слева — назад, справа — вперёд, свайп вниз — закрыть', () => {
    expect(viewer).toContain('x < winW * STORY_PREV_ZONE ? indexRef.current - 1 : indexRef.current + 1');
    expect(viewer).toContain("runOnJS(close)('swipe')");
    expect(viewer).toContain("Gesture.Simultaneous(hold, Gesture.Exclusive(pan, tap))");
  });

  // аудит Optimistic UI 24.10: тап короче удержания (отпустил на 230 мс — раньше и пауза, и перелистывание), просмотр прогрет заранее — первое открытие без задержки на загрузку
  it('тап короче удержания; просмотр прогревается после первых взаимодействий', () => {
    expect(viewer).toContain('Gesture.Tap().maxDuration(STORY_HOLD_MS - 30)');
    expect(slot).toContain('InteractionManager.runAfterInteractions(() => {');
    expect(slot).toContain('loadStoryViewer();');
  });

  // ЗАМОК ВЛАДЕЛЬЦА 24.10: «истории должны открываться» — тап по аватару ВСЕГДА открывает истории, если есть живые слайды (сначала непросмотренные, иначе все с первого);
  // в профиль — только когда историй нет или флаг выключен (решение координатора 24.10, меняет R21 15.10)
  it('тап по аватару открывает истории и после просмотра: очередь — непросмотренные, иначе все живые', () => {
    expect(slot).toContain('(ring ? playback : enabled ? [...stories].reverse() : [])');
    expect(slot).toContain('const opensStories = queue.length > 0;');
    // слово владельца 26.10 (меняет 24.10 «тап ВСЕГДА открывает»): обычный тап открывает просмотр, только пока горит кольцо; просмотренные повторяются удержанием 2 с
    expect(slot).toContain("if (ring && opensStories) open(); else onOpenProfile();");
    expect(slot).toContain('onLongPress={opensStories ? onLongPress : undefined}');
    expect(slot).toContain('delayLongPress={2000}');
    expect(slot).toMatch(/const onLongPress = useCallback\(\(\) => \{[\s\S]*?if \(opensStories\) open\(\);/);
  });

  // ЗАМОК ВЛАДЕЛЬЦА 24.10: «истории должны открываться» — правило «сперва логи»: причина «кольца нет / куда ведёт тап» пишется одной строкой [STORIES]
  it('журнал [STORIES] объясняет, почему кольцо горит или нет и куда ведёт тап', () => {
    expect(slot).toContain("DebugLogger.info('[STORIES]'");
    expect(slot).toContain('кольца нет');
    expect(slot).toContain("'в просмотр непросмотренных'");
    // повтор просмотренных (удержание) пишет в журнал «недавние», просмотр непросмотренных — «непросмотренные»
    expect(slot).toContain('тап → просмотр (${ring ? \'непросмотренные\' : \'недавние\'})');
    expect(slot).toContain("'в профиль'");
  });
});
