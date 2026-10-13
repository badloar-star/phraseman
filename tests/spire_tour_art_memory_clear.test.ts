// зачем (владелец 13.10, spire-002/003 и dialogs-gap-001/002): арт тура Шпиля — как в макете, «Очистить память» — красный текст без заливки, с подтверждением.
import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string): string => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');

describe('тур Шпиля: арт как в макете spire.html', () => {
  const tour = read('components/spire/SpireTour.tsx');
  it('страница 2: таймер «1:42» в кольце', () => {
    expect(tour).toContain('>1:42</Text>');
    expect(tour).not.toMatch(/ringText[^>]*>10</);
  });
  it('страница 3: игроки с монетами ранга 12/9/7 и числом ступеней вместо лестницы камней', () => {
    expect(tour).toContain('COIN_RANK_TABLE.find');
    expect(tour).toMatch(/\{ rank: 12, steps: 47 \}, \{ rank: 9, steps: 39 \}, \{ rank: 7, steps: 33 \}/);
    expect(tour).toContain('<TourTop lang={lang} />');
    expect(tour).not.toContain('TourStones');
    expect(tour).toContain('spireStepsShort(lang, player.steps)');
  });
});

describe('Память диалогов: «Очистить память этого языка»', () => {
  const memory = read('app/dialogue_v2_memory.tsx');
  const start = memory.indexOf('const renderClearControl');
  const end = memory.indexOf('const renderClearFeedback');
  const control = memory.slice(start, end);
  it('красный текст без заливки и плашки', () => {
    expect(start).toBeGreaterThan(0);
    expect(end).toBeGreaterThan(start);
    expect(control).toContain('color: p.wrong');
    expect(control).not.toContain('PlateFill');
    expect(control).not.toContain('boxShadow');
    expect(control).not.toMatch(/backgroundColor/);
  });
  it('очистка идёт только через подтверждение', () => {
    expect(control).toContain('onPress={confirmClear}');
    expect(memory).toContain('const confirmClear = useCallback(() => setConfirmOpen(true), [])');
    expect(memory).toContain('onConfirm={() => { setConfirmOpen(false); void clearMemory(); }}');
    expect(memory).toContain('destructive');
  });
});
