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

  // ЗАМОК ВЛАДЕЛЬЦА: шаг внутри этажа в видимых текстах — «ЭТАП» (ru этап · uk етап · en stage · es/pt-BR etapa · vi giai đoạn · id tahap · tr aşama · pl etap).
  // Прежние слова (ступень/сходинка/step/escalón/degrau/bậc/langkah/anak tangga/basamak/stopień) во всех видимых значениях этих словарей запрещены.
  // Проверяем СТРОКОВЫЕ ЛИТЕРАЛЫ: идентификаторы, комментарии и одиночные ключи вроде 'steps' (режим rankBy) пропускаются, {подстановки} вырезаются.
  it('«этап»: словари Пика, «Сегодня», объявлений, кольца серии и энергии не содержат старых слов про шаг внутри этажа на 9 языках', () => {
    const DICTS = [
      'components/home/v2/today_scene/today_scene_copy.ts',
      'modules/today-tasks/today_tasks_view.ts',
      'components/spire/scene/spire_scene_strings.ts',
      'components/spire/moments/step_moment_strings.ts',
      'components/spire/moments/moments_strings.ts',
      'components/spire/moments/position_moment_strings.ts',
      'app/spire/spire_gold_copy.ts',
      'components/stories/announcements_v2/announcement_v2_registry.ts',
      'components/spire/spire_game_strings.ts',
      'components/spire/spire_strings.ts',
      'components/spire/spire_ghost_strings.ts',
      'components/spire/spire_record_copy.ts',
      'components/streak/moments/streak_moments_strings.ts',
      'app/energy_activity_titles.ts',
    ] as const;
    const LITERAL = /'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"|`(?:[^`\\]|\\.)*`/g;
    const offenders: string[] = [];
    for (const rel of DICTS) {
      for (const raw of code(rel).match(LITERAL) ?? []) {
        const text = raw.slice(1, -1).replace(/\$?\{[^}]*\}/g, ' ');
        // одиночный ASCII-токен — идентификатор/ключ/путь ('steps', 'spire_steps', 'step'), а не фраза для человека
        if (!/\s/.test(text) && /^[\x21-\x7e]*$/.test(text)) continue;
        if (STEP_WORD.test(text)) offenders.push(`${rel}: ${text.slice(0, 80)}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('«этап»: слово этапа стоит в ключах scene.step/perStep и в тексте провала этапа на всех 9 языках', () => {
    const { spireSceneText } = require('../components/spire/scene/spire_scene_strings');
    const { stepMomentText } = require('../components/spire/moments/step_moment_strings');
    const STAGE: Record<Lang, RegExp> = {
      ru: /этап/i, uk: /етап/i, en: /stage/i, es: /etapa/i, 'pt-BR': /etapa/i, vi: /giai đoạn/i, id: /tahap/i, tr: /aşama/i, pl: /etap/i,
    };
    for (const lang of LANGS) {
      expect(`${lang}.step: ${STAGE[lang].test(spireSceneText(lang, 'step'))}`).toBe(`${lang}.step: true`);
      expect(`${lang}.perStep: ${STAGE[lang].test(spireSceneText(lang, 'perStep'))}`).toBe(`${lang}.perStep: true`);
      expect(`${lang}.failHearts: ${STAGE[lang].test(stepMomentText(lang, 'failHearts'))}`).toBe(`${lang}.failHearts: true`);
    }
  });
});
