import fs from 'fs';
import path from 'path';

// зачем (аудит скорости R1, C2, координатор 12.10): CardsHubV2 обёрнут в memo, а экран отдавал ему свежие tiles/labels/fresh и inline-колбэки
// на каждый рендер корня — memo не срабатывал. Сторож держит пропсы хаба стабильными: объекты — через useMemo, обработчики — через useCallback.
const SRC = fs.readFileSync(path.join(__dirname, '..', 'app', 'flashcards', 'FlashcardsHubScreen.tsx'), 'utf8');
const HUB_TAG = SRC.slice(SRC.indexOf('<CardsHubV2'), SRC.indexOf('</ContentWrap>'));

describe('FlashcardsHubScreen: стабильные пропсы CardsHubV2', () => {
  it('tiles, labels и fresh собираются через useMemo', () => {
    expect(SRC).toMatch(/const tiles = useMemo\(/);
    expect(SRC).toMatch(/const hubTiles = useMemo\(/);
    expect(SRC).toMatch(/const hubLabels = useMemo\(/);
    expect(SRC).toMatch(/const fresh = useMemo\(/);
  });

  it('обработчики onBack/onTrain — useCallback, onTrain читает свежий onTrainPress через ref', () => {
    expect(SRC).toMatch(/const handleHubBack = useCallback\(/);
    expect(SRC).toMatch(/const handleHubTrain = useCallback\(/);
    expect(SRC).toMatch(/onTrainPressRef\.current = onTrainPress/);
  });

  it('в JSX хаба нет inline-стрелок и литералов объектов/массивов в пропсах', () => {
    expect(HUB_TAG).toContain('tiles={hubTiles}');
    expect(HUB_TAG).toContain('labels={hubLabels}');
    expect(HUB_TAG).toContain('onBack={handleHubBack}');
    expect(HUB_TAG).toContain('onTrain={handleHubTrain}');
    expect(HUB_TAG).not.toMatch(/=\{\s*\(\)\s*=>/); // onX={() => …}
    expect(HUB_TAG).not.toMatch(/=\{\{/); // labels={{ … }}
    expect(HUB_TAG).not.toMatch(/=\{\[/); // tiles={[ … ]}
  });

  it('деп-массив плиток покрывает данные, от которых они зависят', () => {
    const m = SRC.match(/\], \[(copy, savedCount[^\]]*)\]\);/);
    expect(m).not.toBeNull();
    for (const dep of ['copy', 'savedCount', 'myPackCount', 'videoPackCount', 'communityPackCount', 'numberFormat', 'lang', 'router']) {
      expect(m![1]).toContain(dep);
    }
  });
  // зачем (R1, C4): корень хаба не подписан на размеры окна; высоту читает CardsHubV2, корень отдаёт только сумму вырезов
  it('корень не читает useWindowDimensions, высоту окна берёт CardsHubV2', () => {
    const hub = fs.readFileSync(path.join(__dirname, '..', 'app', 'flashcards', 'CardsHubV2.tsx'), 'utf8');
    expect(SRC).not.toMatch(/useWindowDimensions|windowHeight/);
    expect(HUB_TAG).toContain('verticalInsets={insets.top + insets.bottom}');
    expect(HUB_TAG).not.toContain('availableHeight');
    expect(hub).toMatch(/height: windowHeight\s*\}\s*=\s*useWindowDimensions\(\)/);
    expect(hub).toContain('windowHeight - verticalInsets - fixed');
  });
});
