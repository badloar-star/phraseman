// зачем (Ревизор к 586248557): возврат из фона по кэшу облако не читает и опирается на слушатель access_projection.
// Если слушатель в повторе, кэш премиума обязан сбрасываться, иначе свежий Plus ждёт переподключения.
import fs from 'node:fs';
import path from 'node:path';

const source = fs.readFileSync(path.join(__dirname, '..', 'components', 'PremiumContext.tsx'), 'utf8');

describe('PremiumContext: ветка «кэш» возврата из фона и слушатель Plus', () => {
  it('флаг живого слушателя ставится по снапшоту и снимается при старте, ошибке и очистке', () => {
    expect(source).toContain('const premiumListenerLiveRef = useRef(false);');
    expect(source).toContain('if (isListenerCurrent()) premiumListenerLiveRef.current = true;');
    expect(source.match(/premiumListenerLiveRef\.current = false;/g)?.length ?? 0).toBeGreaterThanOrEqual(4);
  });

  it('ветка кэша пишет состояние слушателя и сбрасывает кэш премиума, если он не на связи', () => {
    const cacheBranch = source.slice(
      source.indexOf("=== 'cloud' && restoreFresh) {"),
      source.indexOf("} else if (getForegroundRefreshKind(backgroundDurationMs) === 'cloud') {"),
    );
    expect(cacheBranch).toContain("const listenerState = premiumListenerLiveRef.current ? 'live' : 'not_live';");
    expect(cacheBranch).toContain('listenerState }));');
    expect(cacheBranch).toContain("if (listenerState === 'not_live') invalidatePremiumCache();");
    expect(cacheBranch).not.toContain('restoreFromCloud');
  });
});
