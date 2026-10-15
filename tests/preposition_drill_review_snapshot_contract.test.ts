import fs from 'node:fs';
import path from 'node:path';

// зачем (аудит R58 #9, координатор 15.10): «Повторить ошибки» строил список из живого wrongIds. Верный ответ убирал вопрос
// из wrongIds → список сжимался → индекс +1 перепрыгивал следующий вопрос, часть ошибок не показывалась.
// Сторож: в режиме повтора список — снимок id, сделанный при входе в повтор, а не живой wrongIds.
const src = fs.readFileSync(path.join(__dirname, '..', 'app', 'preposition_drill.tsx'), 'utf8');

describe('preposition drill: review of mistakes uses a frozen snapshot', () => {
  it('activeItems in review mode filters by reviewIds, not by the live wrongIds', () => {
    const start = src.indexOf('const activeItems = useMemo(');
    const block = src.slice(start, src.indexOf('}, [', start) + 60);
    expect(block).toMatch(/new Set\(reviewIds\)/);
    expect(block).not.toMatch(/new Set\(wrongIds\)/);
    expect(block).toMatch(/\[pack, reviewMode, reviewIds\]/);
  });

  it('restartWrong takes the snapshot before switching to review mode', () => {
    const start = src.indexOf('const restartWrong = () => {');
    const fn = src.slice(start, src.indexOf('\n  };', start));
    const snap = fn.indexOf('setReviewIds([...wrongIds]);');
    expect(snap).toBeGreaterThan(-1);
    expect(fn.indexOf('setReviewMode(true);')).toBeGreaterThan(snap);
  });

  it('simulated run: correct answers in review no longer skip the next question', () => {
    // та же логика, что в экране: список из снимка, верный ответ чистит только wrongIds
    const items = ['a', 'b', 'c', 'd'];
    let wrongIds = ['a', 'b', 'c'];
    const reviewIds = [...wrongIds];
    const shown: string[] = [];
    for (let idx = 0; ; idx += 1) {
      const active = items.filter((x) => new Set(reviewIds).has(x));
      if (idx >= active.length) break;
      shown.push(active[idx]!);
      wrongIds = wrongIds.filter((id) => id !== active[idx]); // верно
    }
    expect(shown).toEqual(['a', 'b', 'c']);
  });
});
