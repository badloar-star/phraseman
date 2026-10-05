/**
 * FIX владельца (2026-08-13): «когда свайпаешь, она улетает, а затем возвращается».
 *
 * Корневая причина была в порядке операций внутри `settleCard`: смещение и
 * прозрачность улетевшей карточки обнулялись в колбэке анимации — ДО того, как
 * React перерисует очередь. Оба значения нативно-драйвенные, поэтому сброс
 * долетал до UI-потока сразу, а новая карточка приезжала следующим коммитом: в
 * этом зазоре СТАРАЯ вьюха возвращалась в центр экрана с прежним текстом.
 *
 * Тест держит исправленный порядок на уровне исходника (рендер-теста экрана в
 * проекте нет): сброс живёт в useLayoutEffect карточки, а не перед сменой
 * состояния, и ошибочный ответ карточку за экран больше не уводит.
 */
import fs from 'fs';
import path from 'path';
import { normalizeEol } from './helpers/read_source';

const source = normalizeEol(fs.readFileSync(
  path.join(__dirname, '../app/flashcards_swipe.tsx'),
  'utf8',
));

/** Тело функции `finish()` внутри settleCard — то самое место гонки. */
function finishBody(): string {
  const start = source.indexOf('const finish = () => {');
  expect(start).toBeGreaterThan(-1);
  const end = source.indexOf('\n      };', start);
  expect(end).toBeGreaterThan(start);
  return source.slice(start, end);
}

describe('улёт карточки и подмена на следующую (свайп)', () => {
  it('завершение улёта сначала меняет состояние, а не обнуляет смещение', () => {
    const body = finishBody();
    expect(body).toContain('after();');
    expect(body).toContain('setCardEpoch');
    /** Именно эти две строки возвращали улетевшую карточку в центр. */
    expect(body).not.toContain('position.setValue');
    expect(body).not.toContain('flyOpacity.setValue');
  });

  /**
   * 2026-09-30 (жалоба ученика «пустая карточка, руны сгорают»): сброс ОБЩИХ
   * значений в useLayoutEffect проигрывал гонку — нативная анимация улёта позже
   * присылала в JS своё последнее значение (opacity≈0) и новая карточка оставалась
   * невидимой. Инвариант теперь: у каждой карточки свежие значения анимации.
   */
  it('у каждой карточки свои значения анимации — запоздалый улёт новую не задевает', () => {
    expect(source).toContain('const cardAnimKey = `${cardEpoch}:${queue[0]?.id ?? \'\'}`;');
    const memoAt = source.indexOf('const cardAnim = useMemo(');
    expect(memoAt).toBeGreaterThan(-1);
    const memo = source.slice(memoAt, source.indexOf('const { position, flyOpacity, riseAnim } = cardAnim;', memoAt));
    expect(memo).toContain('new Animated.ValueXY()');
    expect(memo).toContain('new Animated.Value(1)');
    expect(memo).toContain('new Animated.Value(0)');
    expect(memo).toContain('[cardAnimKey]');
    /** Общих на всю сессию значений больше нет. */
    expect(source).not.toContain('const position = useRef(new Animated.ValueXY()).current;');
    expect(source).not.toContain('const flyOpacity = useRef(new Animated.Value(1)).current;');
  });

  it('при смене карточки глушатся анимации снятой, новые значения не перезаписываются', () => {
    const start = source.indexOf('const previous = previousCardAnimRef.current;');
    expect(start).toBeGreaterThan(-1);
    const effect = source.slice(start, source.indexOf('}, [cardAnim, currentPrompt?.id]);', start));
    expect(effect).toContain('previous.position.stopAnimation()');
    expect(effect).toContain('previous.flyOpacity.stopAnimation()');
    expect(effect).toContain('previous.riseAnim.stopAnimation()');
    expect(effect).not.toContain('flyOpacity.setValue');
    /** Сторож регресса пишет в журнал, если карточка вне улёта невидима. */
    expect(effect).toContain('SWIPE-BLANK-STALE');
  });

  it('ответ на невидимую карточку не засчитывается (страховка рун)', () => {
    const start = source.indexOf('const answerCurrent = useCallback(');
    const body = source.slice(start, source.indexOf('const revealCurrent', start));
    const guardAt = body.indexOf('SWIPE-BLANK-ANSWER-BLOCKED');
    expect(guardAt).toBeGreaterThan(-1);
    /** Страховка стоит ДО того, как ответ помечен и засчитан. */
    expect(guardAt).toBeLessThan(body.indexOf('answeredPromptIdRef.current = currentPrompt.id;'));
    expect(guardAt).toBeLessThan(body.indexOf('applyAnswer('));
  });

  it('ошибочный ответ карточку за экран не уводит — разбор показывается на месте', () => {
    const start = source.indexOf('const answerCurrent = useCallback(');
    expect(start).toBeGreaterThan(-1);
    const body = source.slice(start, source.indexOf('const revealCurrent', start));
    /** Улетает только верно отвеченная карточка. */
    expect(body).toContain('const correct = saysMatch === currentPrompt.isMatch;');
    expect(body).toContain('if (!correct) {');
    expect(body.indexOf('if (!correct) {')).toBeLessThan(body.indexOf('settleCard('));
    expect(body).toContain('Animated.spring(position');
  });

  it('карточка остаётся собой между кадрами — ключ вьюхи привязан к вопросу', () => {
    expect(source).toContain('key={currentPrompt.id}');
  });
});
