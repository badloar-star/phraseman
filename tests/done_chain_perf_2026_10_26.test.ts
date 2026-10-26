// Координатор 26.10, аудит скорости Моментов №2 и №5 (цепочка итога урока): тело экрана строится один раз — удары доходят до блоков
// через контекст; счётчики «+N» и баланса — один общий тик на строку, на тике перерисовывается только текст числа. Смысл цифр прежний:
// баланс — единый показ (кошелёк + ожидающие, de99afcd4), формула счёта та же.
import fs from 'node:fs';
import path from 'node:path';

const chain = fs.readFileSync(path.join(__dirname, '..', 'components/completion/V2DoneChain.tsx'), 'utf8').replace(/\r\n/g, '\n');

describe('цепочка итога урока: без перерисовки всего экрана', () => {
  it('skip стабилен (удар — из ref), тело экрана — useMemo от children и skip, не от удара', () => {
    expect(chain).toContain('}, [finish]);');
    expect(chain).toContain('const body = useMemo(() => { if (__DEV__) bodyBuildsRef.current += 1; return children(skip); }, [children, skip]);');
    // зачем (Ревизор 26.10): замеры только в разработке
    expect(chain).toContain('if (!__DEV__ || revealed < T.beats) return;');
    expect(chain).toContain('if (__DEV__) rowRendersRef.current += 1;');
    expect(chain).toContain('if (!__DEV__ || !animate) return undefined;');
    expect(chain).toContain('<ChainCtx.Provider value={value}>{body}</ChainCtx.Provider>');
    expect(chain).not.toContain('{children(skip)}</ChainCtx.Provider>');
    expect(chain).toContain('замер: тело экрана построено');
  });

  it('строка монет: один тик на строку, числа — листья CountUpText; своих интервалов у счётчиков нет', () => {
    expect(chain).toContain('const ticker = useRowTicker(animate, ');
    expect((chain.match(/<CountUpText /g) ?? []).length).toBe(2);
    expect((chain.match(/setInterval\(/g) ?? []).length).toBe(1);
    expect(chain).toContain('return ticker.subscribe(() => {');
    expect(chain).toContain('замер: строка монет перерисована');
  });

  it('цифры прежние: формула счёта и единый показ баланса', () => {
    expect(chain).toContain('const next = Math.round(from + (to - from) * (1 - (1 - k) ** 3));');
    expect(chain).toContain('subscribeDisplayedRunes((v) =>');
    // цель счёта заморожена на старте (Optimistic UI 26.10), после счёта — живое единое число
    expect(chain).toContain("from={balanceRun ? balanceRun.from : balance} to={balanceRun ? balanceRun.to : balance} phase={balanceRun?.credited ? phase : 'final'}");
  });
});
