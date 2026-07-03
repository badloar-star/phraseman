import fs from 'fs';
import path from 'path';

/**
 * Регресс-страж: тост опыта (+N XP) в отработке слов должен показываться
 * СРАЗУ после ответа — синхронно в момент выбора правильного варианта, а не
 * после задержки обратной связи (setTimeout) и не после сетевого round-trip
 * registerXP. Жалоба пользователя: «тостик опыта появляется очень поздно».
 */
describe('lesson_words XP toast appears immediately on answer', () => {
  const source = fs.readFileSync(
    path.join(__dirname, '..', 'app', 'lesson_words.tsx'),
    'utf8',
  );

  it('shows the XP toast synchronously inside the correct-answer branch, before the setTimeout', () => {
    const handlerStart = source.indexOf('const handleChoice = async');
    expect(handlerStart).toBeGreaterThan(-1);

    // Граница: первый setTimeout внутри handleChoice (задержка обратной связи).
    const timeoutIdx = source.indexOf('setTimeout(', handlerStart);
    expect(timeoutIdx).toBeGreaterThan(handlerStart);

    // showXpToast(...) должен вызываться ДО этого setTimeout — т.е. синхронно
    // при выборе ответа, не внутри отложенного блока.
    const earlyToastIdx = source.indexOf('showXpToast(', handlerStart);
    expect(earlyToastIdx).toBeGreaterThan(handlerStart);
    expect(earlyToastIdx).toBeLessThan(timeoutIdx);
  });

  it('does NOT gate the toast behind the registerXP promise (no toast in .then/.catch)', () => {
    // Раньше тост вызывался из registerXP(...).then(...).catch(...) — это и
    // создавало задержку. Убеждаемся, что такой связки больше нет.
    expect(source).not.toMatch(/\.then\(\s*\(result\)\s*=>\s*\{\s*if\s*\(wordJustCompleted\)\s*showXpToast/);

    // Точная проверка: от РЕАЛЬНОГО вызова `registerXP(` (не упоминания в
    // комментарии/импорте) до конца обработчика не должно быть showXpToast.
    const callIdx = source.indexOf('registerXP(', source.indexOf('void registerXP('));
    expect(callIdx).toBeGreaterThan(-1);
    const tailFromCall = source.slice(callIdx);
    expect(tailFromCall).not.toContain('showXpToast');
  });

  it('defers the XP toast hide state update out of native animation callbacks', () => {
    expect(source).toContain("scheduleTrackedAnimatedStateUpdate(scheduledStateUpdatesRef");
    expect(source).toContain('xpToastRunIdRef');
    expect(source).not.toContain(').start(() => setXpToastVisible(false))');
  });
});
