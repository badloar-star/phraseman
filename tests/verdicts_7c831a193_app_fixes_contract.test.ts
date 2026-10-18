// зачем (вердикты Макетов 7c831a193, образцы под замком — правим приложение; координатор 13.10): контракт по строкам файлов для четырёх правок вида.
import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

describe('«Устно · верно» (cards-section-046, cards-v2-037)', () => {
  const src = read('app/flashcards_speaking_session.tsx');
  it('у карточки нет зелёной рамки состояния, слово в плашке «Верно» — осветлённый токен good (образец #A6E8B9), в светлых темах прежний', () => {
    expect(src).toMatch(/outcome=\{null\}/);
    expect(src).not.toMatch(/outcome=\{phase === 'scored' && attempt \? \(attempt\.passed \? 'ok' : null\) : null\}/);
    expect(src).toMatch(/speakingGlass\.isLight \? speakingGlass\.good : mixHex\(speakingGlass\.good, '#FFFFFF'/);
    expect(src).toContain("import { mixHex } from '../constants/v2Style';");
  });
});

describe('пилюля энергии (energy-modes-003/009/010)', () => {
  const hud = read('components/energy/EnergyAttemptsHud.tsx');
  const pill = read('components/energy/EnergyMistakeHud.tsx');
  // зачем (владелец 18.10): подложки у энергии нет нигде — кромка и кольцо-пульс по контуру пилюли сняты; последняя энергия — красная цифра.
  it('без кромки и заливки; красный цифры доведён до ≥ 4,5 к фону темы', () => {
    expect(hud).not.toMatch(/edge=|plate=/);
    expect(hud).toContain('bad={lowChargeInk(t.wrong, [g.bg, g.bgTop, g.bgBottom], g.text, 4.5)}');
    expect(pill).not.toContain('warnRing');
  });
});

describe('неправильные глаголы (energy-modes-010)', () => {
  const src = read('app/lesson_irregular_verbs.tsx');
  it('от 800 dp плашка сразу под полосой (отступ 20), варианты через 100 (88 + 12); ниже — прежняя раскладка по центру', () => {
    expect(src).toMatch(/const verbsRoomy = verbsWindowH >= 800;/);
    expect(src).toMatch(/style=\{verbsRoomy \? \{ marginTop: 20 \} : \{ flex: 1, justifyContent: 'center' \}\}/);
    expect(src).toMatch(/verbsRoomy \? <View style=\{\{ height: 88, minHeight: 8, flexShrink: 1 \}\} \/> : null/);
    expect(src).toMatch(/verbsRoomy \? \{ paddingHorizontal: 16, paddingTop: 10 \} : \{ flex: 1, paddingHorizontal: 16, paddingTop: 10 \}/);
  });
});

describe('повышение ранга (coins-004)', () => {
  const src = read('app/coin_rank.tsx');
  it('«Все ранги» идёт раньше плашек «не хватает» и «проверяем»; в этих состояниях кнопка в потоке под плашкой, у готового — внизу', () => {
    const all = src.indexOf('testID="coin-rank-all-ranks"');
    const short = src.indexOf('{short ? (');
    const pending = src.indexOf('{pending ? (');
    const flowCta = src.indexOf('{ctaInFlow ? (');
    expect(all).toBeGreaterThan(0);
    expect(all).toBeLessThan(short);
    expect(short).toBeLessThan(pending);
    expect(pending).toBeLessThan(flowCta);
    expect(src).toMatch(/const ctaInFlow = pending \|\| short;/);
    expect(src).toMatch(/\{ctaInFlow \? null : \(\n\s*<View style=\{\[styles\.footer,/);
    expect(src).toContain('<KitSpinner testID="coin-rank-pending-spinner" />');
  });
});

describe('пилюля «30/30» хаба Карточек', () => {
  const src = read('app/flashcards/CardsHubV2.tsx');
  it('значок «копии» (copy-outline), как в образце `limPill(\'copy\', \'30/30\')` и у настройки тренировки, а не «стопка» albums-outline', () => {
    const at = src.indexOf('testID="fc-cards-hub-limit"');
    expect(at).toBeGreaterThan(0);
    const pill = src.slice(at, at + 900);
    expect(pill.match(/<Ionicons name="([a-z-]+)" size=\{16\}/)?.[1]).toBe('copy-outline');
  });
});
