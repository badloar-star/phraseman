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

const source = fs.readFileSync(
  path.join(__dirname, '../app/flashcards_swipe.tsx'),
  'utf8',
);

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

  it('смещение обнуляется синхронно в коммите новой карточки', () => {
    const start = source.indexOf('useLayoutEffect(() => {');
    expect(start).toBeGreaterThan(-1);
    const depsAt = source.indexOf('}, [', start);
    expect(depsAt).toBeGreaterThan(start);
    const effect = source.slice(start, depsAt);
    expect(effect).toContain('position.setValue({ x: 0, y: 0 })');
    expect(effect).toContain('flyOpacity.setValue(1)');
    /** Останов native-анимации ДО setValue: иначе запоздавший fade вернёт 0. */
    expect(effect.indexOf('position.stopAnimation()')).toBeLessThan(
      effect.indexOf('position.setValue'),
    );
    expect(effect.indexOf('flyOpacity.stopAnimation()')).toBeLessThan(
      effect.indexOf('flyOpacity.setValue'),
    );
    /** Ключ сброса — новая карточка и завершённый улёт, а не флаг `settling`. */
    const deps = source.slice(depsAt, source.indexOf('\n', depsAt));
    expect(deps).toContain('cardEpoch');
    expect(deps).toContain("currentPrompt?.id");
    expect(deps).not.toContain('settling');
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
