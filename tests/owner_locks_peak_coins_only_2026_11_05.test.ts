// ЗАМОК ВЛАДЕЛЬЦА 05.11 (скрины TestFlight 149): «упоминаний ступеней вообще не должно быть, только ЭТАЖЕЙ! Почему не монетки, а ступени?!» и «Убери слова "место по ступеням" и тд».
// Реестр docs/work/OWNER_LOCKS.md, строки 05.11. Сторож смотрит на ВСЕ компоненты Пика — и старого, и нового (B), а не на один экран: прежние замки 22.10 («не надо писать 1 ступ и тд!»)
// смотрели только на старую «Сцену», поэтому экран B их обошёл. Ослабить его можно только по новому слову владельца: правка этого файла + строк реестра + KNOWN_GUARDS в tests/owner_locks_registry.test.cjs.
import { spireGameText } from '../components/spire/spire_game_strings';
import { spireText } from '../components/spire/spire_strings';
import type { Lang } from '../constants/i18n';
import { readSource } from './helpers/read_source';

/** Код без комментариев и пустых строк: пометки замков и история в комментариях не ломают сторож. */
const code = (rel: string): string => readSource(rel).split(/\r?\n/).filter((line) => !/^\s*(\/\/|\*|\/\*|\{\/\*)/.test(line)).join('\n').replace(/\/\/[^\n]*/g, '');

const LANGS: readonly Lang[] = ['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'];
// слова «ступень/step» во всех 9 языках интерфейса (корни): ru ступ, uk сходин, en step, es escal|paso, pt degrau, vi bậc, id langkah|tangga, tr basamak|adım, pl stopni|stopień|krok
const STEP_WORD = /(^|[^а-яіїєґ])ступ|сходин|\bsteps?\b|escal|\bpasos?\b|degrau|bậc|langkah|tangga|basamak|adım|stop(ni|ień|nie)|\bkrok/i;

const PEAK_RENDER_FILES = [
  'components/spire/peak/PeakMyCounter.tsx',
  'components/spire/peak/PeakTopRow.tsx',
  'components/spire/peak/PeakAllList.tsx',
  'components/spire/peak/PeakScreenV2.tsx',
  'components/spire/SpireAllMembers.tsx',
  'components/spire/SpirePodium.tsx',
  'components/spire/SpireWeekResultCard.tsx',
] as const;

describe('ЗАМОК ВЛАДЕЛЬЦА 05.11 — в Пике только монеты и этажи, ни слова про ступени', () => {
  it('режим «по ступеням» в интерфейсе недостижим: единый источник режима всегда отдаёт монеты', () => {
    const src = code('app/spire/spire_rank_by_resolve.ts');
    expect(src).toContain("const rankBy: SpireRankBy = 'coins';");
    expect(src).not.toMatch(/const rankBy: SpireRankBy = (devRankBy|serverRankBy)/);
  });

  it('значения по умолчанию у подиума и «Всех участников» — монеты', () => {
    expect(code('components/spire/SpireAllMembers.tsx')).toContain("rankBy = 'coins'");
    expect(code('components/spire/SpirePodium.tsx')).toContain("rankBy = 'coins'");
  });

  it('ни один из экранов Пика (старый и B) не выводит ступени: нет spireSteps*, «rankedBySteps», ступеней участника в тексте', () => {
    for (const rel of PEAK_RENDER_FILES) {
      const src = code(rel);
      expect(`${rel}: ${/spireSteps(Count|Short|Word|WordAfterOf)|rankedBySteps|rankedByCoins|stepsScore/.test(src)}`).toBe(`${rel}: false`);
      // число в строке участника — монеты недели, не m.steps / row.steps / me.steps
      expect(`${rel}: ${/\b(m|row|me|member)\.steps\b/.test(src)}`).toBe(`${rel}: false`);
    }
  });

  it('подзаголовок «Все участники» — «Лига · N человек», без способа подсчёта места', () => {
    const home = code('components/spire/SpireHomeScreen.tsx');
    const line = home.split('\n').find((l) => l.includes('const allSubtitle'))!;
    expect(line).toBeDefined();
    expect(line).not.toMatch(/rankBy|rankedBy/);
  });

  it('единица в Пике — этаж на 9 языках: spire_plurals (склонение и сокращения) не выводит слов про ступени', () => {
    const { SPIRE_STEP_FORMS, spireStepsCount, spireStepsShort } = require('../components/spire/spire_plurals');
    for (const lang of LANGS) {
      for (const n of [1, 2, 5, 21]) {
        expect(`${lang}.${n}: ${STEP_WORD.test(spireStepsCount(lang, n))}`).toBe(`${lang}.${n}: false`);
        expect(`${lang}.${n}: ${STEP_WORD.test(spireStepsShort(lang, n))}`).toBe(`${lang}.${n}: false`);
      }
      expect(`${lang}: ${STEP_WORD.test(Object.values(SPIRE_STEP_FORMS[lang]).join(' '))}`).toBe(`${lang}: false`);
    }
    expect(spireStepsCount('ru', 5)).toBe('5 этажей');
  });

  it('тексты рядов, счётчика, подписей и тура режима монет на 9 языках не содержат слов про ступени', () => {
    for (const lang of LANGS) {
      const texts: Array<[string, string]> = [
        ['peakMyCoins', spireGameText(lang, 'peakMyCoins')],
        ['peakMyPlace', spireGameText(lang, 'peakMyPlace')],
        ['peakAllParticipants', spireGameText(lang, 'peakAllParticipants')],
        ['peakMovingUp', spireGameText(lang, 'peakMovingUp')],
        ['peakReachedTop', spireGameText(lang, 'peakReachedTop')],
        ['placeN', spireGameText(lang, 'placeN', { n: 30 })],
        ['peakTour1', spireGameText(lang, 'peakTour1')],
        ['peakTour2', spireGameText(lang, 'peakTour2')],
        ['peakTour3', spireGameText(lang, 'peakTour3')],
        ['zoneUp', spireText(lang, 'zoneUp')],
        ['zoneStay', spireText(lang, 'zoneStay')],
        ['zoneDown', spireText(lang, 'zoneDown')],
      ];
      for (const [key, text] of texts) expect(`${lang}.${key}: ${STEP_WORD.test(text)}`).toBe(`${lang}.${key}: false`);
    }
  });
});
