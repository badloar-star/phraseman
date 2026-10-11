// зачем (поправка приоритета координатора 14.10, снимки Макетов по Шпилю, ru/uk): стиль «Тень» на плашках и кнопках, пилюля «⚡ N» в шапках,
// 8-е правило в шторке помещается, «0 д 2 ч» не рвётся на одинокую «ч». Логика Шпиля (Ядро, гейт [SPIRE-GATE]) не затронута.
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { spireTimeLeftText } from '../components/spire/spire_strings';
import { spireGameText } from '../components/spire/spire_game_strings';

const root = join(__dirname, '..');
const read = (...p: string[]) => readFileSync(join(root, ...p), 'utf8').replace(/\r\n/g, '\n');
const NB = ' ';

describe('Шпиль: перенос срока недели', () => {
  it.each(['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const)('%s: число и единица, «д» и следующее число — неразрывные пробелы', (lang) => {
    const text = spireTimeLeftText(lang, 0, 2);
    expect(text).toMatch(new RegExp(`0${NB}\\S+${NB}2${NB}\\S+$`));
    // обычный пробел между «2» и единицей часа невозможен: одинокая единица не уйдёт на вторую строку
    expect(text).not.toMatch(/\d \S+$/);
  });

  it('ru: «до конца недели 0 д 2 ч» — срок целиком склеен', () => {
    expect(spireTimeLeftText('ru', 0, 2)).toBe(`до конца недели 0${NB}д${NB}2${NB}ч`);
  });
});

describe('Шпиль: правила', () => {
  it.each(['ru', 'uk'] as const)('%s: 8 непустых правил, 8-е — про понедельник', (lang) => {
    const keys = ['rule1', 'rule2', 'rule3', 'rule4', 'rule5', 'rule6', 'rule7', 'rule8'] as const;
    keys.forEach((key) => expect(spireGameText(lang, key, { step: 1, floor: 2, g: 2, summit: 50, p1: 200, p2: 120, p3: 80, promo: 100 } as never).trim().length).toBeGreaterThan(5));
    expect(spireGameText(lang, 'rule8')).toMatch(lang === 'ru' ? /понедельник/i : /понеділок/i);
  });

  it('высота списка правил считается от экрана, шрифт не ужимается', () => {
    const src = read('components', 'spire', 'SpireRulesSheet.tsx');
    expect(src).toMatch(/useWindowDimensions/);
    expect(src).toMatch(/style=\{\[s\.list, \{ maxHeight: listMaxHeight \}\]\}/);
    expect(src).not.toMatch(/adjustsFontSizeToFit=/);
  });
});

describe('Шпиль: стиль «Тень» и пилюля энергии', () => {
  const dir = join(root, 'components', 'spire');
  const mustUseShadow = [
    'SpireAllMembers.tsx', 'SpireClimbDock.tsx', 'SpireExitSheet.tsx', 'SpireFriendsRow.tsx', 'SpireHomeScreen.tsx', 'SpirePodium.tsx',
    'SpireResultPanel.tsx', 'SpireRulesSheet.tsx', 'SpireStepScreen.tsx', 'SpireTaskView.tsx', 'SpireTour.tsx', 'SpireWeekResultCard.tsx',
  ];

  it.each(mustUseShadow)('%s берёт тень из useSpireShadow (plate / nested / action)', (name) => {
    const src = read('components', 'spire', name);
    expect(src).toMatch(/import \{ useSpireShadow \} from '\.\/useSpireShadow';/);
    expect(src).toMatch(/\bsh\.(plate|nested|action)/);
  });

  it('в Шпиле нет обводок контейнеров (сторож «Тени» не растёт) и нет сжатия шрифта', () => {
    for (const name of readdirSync(dir).filter((f) => /\.tsx?$/.test(f))) {
      const src = readFileSync(join(dir, name), 'utf8');
      expect({ name, fit: /adjustsFontSizeToFit=/.test(src) }).toEqual({ name, fit: false });
    }
  });

  it('пилюля энергии: и в шапке главного, и в шапке ступени; превью показывает её', () => {
    expect(read('components', 'spire', 'SpireHomeScreen.tsx')).toMatch(/<SpireEnergyPill ownerActive=/);
    expect(read('components', 'spire', 'SpireStepScreen.tsx')).toMatch(/<SpireEnergyPill ownerActive=\{false\} \/>/);
    expect(read('components', 'spire', 'SpireEnergyPill.tsx')).toMatch(/height: 37, borderRadius: 19/);
    expect(read('app', 'dev_spire_preview.tsx')).toMatch(/\n\s+showEnergy\b/);
  });

  it('новые модули оформления не тянут серверную логику и гейт Шпиля', () => {
    for (const name of ['useSpireShadow.ts', 'SpireEnergyPill.tsx']) {
      const src = read('components', 'spire', name);
      expect({ name, bad: /SPIRE-GATE|spire_gate_refresh|spire_tab_flag|functions\//.test(src) }).toEqual({ name, bad: false });
    }
  });
});
