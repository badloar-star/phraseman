import fs from 'fs';
import path from 'path';

/**
 * Сторож правила «энергия платится за СТАРТ активности» (владелец 2026-08-23).
 *
 * зачем текстовый контракт, а не рантайм-тест: полный аудит 2026-08-23 нашёл
 * пять критичных багов в этой самой переделке (двойное списание при возврате
 * на урок, бесплатные диалоги со второго раза, списание у подписчика по
 * placeholder-статусу, отсутствие возврата при сетевой ошибке, повтор в блице).
 * Ни один не всплыл раньше, потому что правило не сторожил НИ ОДИН тест.
 * Рантайм-тесты энергии в этом репозитории роняют Node по памяти
 * (см. память project_jest_watchman_ram), поэтому контракт читает исходники
 * как текст — он быстрый и не тянет firebase/remote_flags/boons.
 */
const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), 'utf8');

describe('энергия платится за старт активности', () => {
  it('интервал восстановления — 30 минут в обоих источниках правды', () => {
    // Build-time дефолт и remote-дефолт обязаны совпадать, иначе таймер на
    // экране разойдётся с фактическим начислением.
    expect(read('app/energy_system.ts')).toContain('ENERGY_RECOVERY_INTERVAL_MS = 30 * 60 * 1000');
    expect(read('app/remote_flags.ts')).toContain('energy_recovery_interval_ms: 30 * 60 * 1000');
  });

  it('любой старт стоит ровно 1 единицу, включая экзамены', () => {
    // Прежняя цена экзамена (8 при потолке 5) была физически недостижима.
    expect(read('app/exam.tsx')).toContain('const LINGMAN_EXAM_ENERGY = 1;');
    expect(read('app/level_exam.tsx')).toContain('const LEVEL_EXAM_ENERGY = 1;');
    expect(read('components/level-exam/LevelExamV2.tsx')).toContain('const ENERGY_COST = 1;');
  });

  it('ошибки внутри активности энергию не тратят', () => {
    // Класс бага: раньше промах жёг заряд и обрывал оплаченную сессию.
    for (const file of [
      'app/lesson1.tsx',
      'app/lesson_words.tsx',
      'app/lesson_irregular_verbs.tsx',
      'app/preposition_drill.tsx',
      'app/personal_plan_exercise.tsx',
    ]) {
      expect(read(file)).not.toContain('spendEnergyOnMistake');
    }
  });

  it('lesson1 не сбрасывает латч входа по фокусу экрана', () => {
    // Инцидент аудита: useFocusEffect обнулял латч на КАЖДЫЙ возврат, и уход
    // в теорию с возвратом списывал ещё одну единицу. И так сколько угодно.
    const source = read('app/lesson1.tsx');
    const gate = source.slice(
      source.indexOf('const entryEnergyGateLessonRef'),
      source.indexOf('const loadData = async'),
    );
    // Ищем ВЫЗОВ, а не упоминание: в блоке стоит комментарий, объясняющий,
    // почему сброса по фокусу здесь быть не должно.
    expect(gate).not.toContain('useFocusEffect(');
    expect(gate).toContain('entryEnergyGateLessonRef.current = lessonId');
  });

  it('трата ждёт живой статус безлимита, а не placeholder', () => {
    // Без этого на холодном старте списывалось у Плюса: до первого чтения
    // isUnlimitedRef держит false, и гейт экрана пропускал трату.
    const source = read('components/EnergyContext.tsx');
    const spendOne = source.slice(
      source.indexOf('const spendOne = useCallback'),
      source.indexOf('const refundOne = useCallback'),
    );
    expect(spendOne).toContain('energyReadyRef.current');
    expect(spendOne.indexOf('energyReadyRef.current'))
      .toBeLessThan(spendOne.indexOf('isUnlimitedRef.current'));
  });

  it('есть возврат единицы, если оплаченный старт не состоялся', () => {
    const context = read('components/EnergyContext.tsx');
    expect(context).toContain('refundOne');
    // Возврат не может поднять базу выше потолка.
    const refund = context.slice(
      context.indexOf('const refundOne = useCallback'),
      context.indexOf('const spendAmount = useCallback'),
    );
    expect(refund).toContain('Math.min(energyRef.current + 1, dynMaxRef.current)');

    // Точки, где списание идёт ДО сетевого вызова, обязаны уметь возвращать.
    for (const file of [
      'app/arena_today.tsx',
      'app/arena_friend_duel.tsx',
      'app/arena_invite.tsx',
      'app/flashcards_swipe.tsx',
      // Аудит нашёл дыру: отмена поиска матча съедала единицу без возврата.
      'app/arena_matchmaking.tsx',
    ]) {
      expect(read(file)).toContain('refundOne');
    }
  });

  it('диалоги MAX платят в самой сессии, а не только на брифинге', () => {
    // Брифинг показывается лишь при ПЕРВОМ прохождении сценария; до аудита
    // все повторные диалоги были бесплатными — при том что это самая дорогая
    // активность (LLM + TTS).
    expect(read('app/ai_dialog_session.tsx')).toContain('confirmDialogEnergy');
    // Двойной оплаты быть не должно: на брифинге списания нет.
    expect(read('app/ai_dialog_briefing.tsx')).not.toContain('spendOne');
  });

  it('блиц помнит, за какой раунд уже заплачено', () => {
    // isUnlimited в deps меняется асинхронно и может переключаться обратно
    // (например в 22:00, когда истекает «вечер без лимитов») — без латча
    // каждое переключение снимало ещё единицу в том же раунде.
    const blitz = read('app/flashcards_blitz_session.tsx');
    expect(blitz).toContain('blitzChargedRoundRef');
    // Важен ПОРЯДОК: латч занимается ПОСЛЕ проверки безлимита. Иначе раунд,
    // начатый в «вечер без лимитов», остаётся неоплаченным навсегда — латч
    // занят, а при снятии безлимита эффект уже выходит через return.
    const gate = blitz.slice(
      blitz.indexOf('const blitzChargedRoundRef'),
      blitz.indexOf('// ── Старт/рестарт раунда'),
    );
    expect(gate.indexOf('if (blitzEnergyUnlimited)'))
      .toBeLessThan(gate.indexOf('blitzChargedRoundRef.current = roundId'));
  });

  it('анимация списания шлётся из единой точки траты', () => {
    // Событие живёт в EnergyContext, а не в девяти экранах: иначе новая
    // активность легко забудет его отправить.
    const context = read('components/EnergyContext.tsx');
    const flight = read('components/EnergySpendFlightHost.tsx');
    expect(context).toContain("emitAppEvent('energy_spent_on_start'");
    expect(read('app/_layout.tsx')).toContain('<EnergySpendFlightHost />');
    expect(flight).toContain("require('../assets/images/energy/energy-start-cost.webp')");
    expect(flight).toContain('const FLIGHT_MS = MOTION.durationMs;');
    expect(flight).toContain('const FLIGHT_ASSET_SIZE = MOTION.assetSize;');
    expect(flight).toContain('<Text style={styles.costLabel}>−{amount}</Text>');
    expect(flight).toContain('source={ENERGY_START_COST_IMAGE}');
    expect(flight).toContain('useReduceMotion');
  });

  it('цена входа видна на кнопках старта', () => {
    // Владелец: «на кнопке начать всегда должно быть написано −1 энергии».
    for (const file of [
      'components/LearningV2SessionOutcomeSheet.tsx',
      'app/learning-v2/lesson/[id].tsx',
      'app/lesson_menu.tsx',
      'app/flashcards/DeckPickerSheet.tsx',
      'components/mistake-practice/MistakePracticeSetupSheet.tsx',
      'components/DialogsTabContent.tsx',
    ]) {
      expect(read(file)).toContain('EnergyCostBadge');
    }
  });

  it('общий знак стоимости использует один ассет без круга и показывает безлимит', () => {
    const badge = read('components/EnergyCostBadge.tsx');
    const motion = read('constants/motionHybrid.ts');
    expect(motion).toContain('export const ENERGY_COST_BADGE_HYBRID');
    expect(badge).toContain('ENERGY_COST_BADGE_HYBRID');
    expect(badge).toContain(
      "require('../assets/images/energy/energy-start-cost.webp')",
    );
    expect(badge).toContain('source={ENERGY_START_COST_IMAGE}');
    expect(badge).toContain("isUnlimited ? '∞' : `−${cost}`");
    expect(badge).not.toContain('if (isUnlimited) return null');
    expect(badge).not.toContain('backgroundColor: urgent');
    expect(badge).not.toContain('borderRadius: 15');
    expect(badge).toContain('topRight: { top: -18, right: 0 }');
    expect(badge).toContain('topRightCompact: { top: -14, right: 0 }');
    expect(badge).toContain('right: 39');
    expect(badge).toContain('labelCompact: { right: 30');
    expect(badge).not.toContain('left: 33');
    expect(badge).not.toContain('labelCompact: { left: 25');
    expect(badge).toContain('LUM.contentMs');
    expect(badge).toContain('useReduceMotion');
    expect(badge).not.toContain('Animated.loop');
  });

  it('все темы используют один energy-ассет, а старые файлы удалены', () => {
    const icon = read('components/EnergyIcon.tsx');
    expect(icon).toContain('energy-start-cost.webp');
    expect(icon).not.toContain('ENERGY_IMAGES');
    expect(icon).not.toContain('...(tintColor ? { tintColor } : {})');
    expect(icon).not.toContain('backgroundColor: tintColor');

    const energyFiles = fs.readdirSync(path.join(process.cwd(), 'assets/images/energy')).sort();
    expect(energyFiles).toEqual(['energy-start-cost.webp']);
  });

  it('каждая прямая платная кнопка старта и рестарта использует общий знак', () => {
    const resultScreen = read('app/flashcards/SessionResultScreen.tsx');
    const blitz = read('app/flashcards_blitz_session.tsx');
    expect(resultScreen).toContain('retryShowsEnergyCost?: boolean');
    expect(resultScreen).toContain('retryShowsEnergyCost ? <EnergyCostBadge');
    expect(blitz).toContain('retryShowsEnergyCost');
    expect(read('app/lesson_complete.tsx')).toContain('lesson-complete-repeat-energy-cost');

    for (const [file, minimum] of [
      ['app/diagnostic_test.tsx', 2],
      ['app/exam.tsx', 2],
      ['app/level_exam.tsx', 2],
    ] as const) {
      const source = read(file);
      expect((source.match(/<EnergyCostBadge/g) ?? []).length).toBeGreaterThanOrEqual(minimum);
    }

    const v2ExamIntro = read('components/level-exam/LevelExamIntro.tsx');
    expect(v2ExamIntro).toContain('<EnergyCostBadge testID="level-exam-start-energy-cost"');
    expect(v2ExamIntro).not.toContain('<View style={styles.costBadge}>');

    const dialogTile = read('components/DialogScenarioTile.tsx');
    const dialogs = read('components/DialogsTabContent.tsx');
    expect(dialogTile).toContain('showEnergyCost: boolean');
    expect(dialogTile).toContain('showEnergyCost ? <EnergyCostBadge');
    expect(dialogs).toContain('showEnergyCost={status === \'done\'}');

    const navigation = read('app/personal_plan_navigation.ts');
    const personalPlan = read('app/personal_plan.tsx');
    expect(navigation).toContain('export function personalPlanTaskStartsPaidExercise');
    expect(personalPlan).toContain('showEnergyCost={personalPlanTaskStartsPaidExercise(task)}');

    const menu = read('app/lesson_menu.tsx');
    const paidMenuItems = menu.slice(
      menu.indexOf('const ENERGY_COST_MENU_ITEMS'),
      menu.indexOf('function LessonMenu'),
    );
    expect(paidMenuItems).toContain("'lesson-menu-primary'");
    expect(paidMenuItems).toContain("'lesson-menu-words'");
    expect(paidMenuItems).toContain("'lesson-menu-irregular-verbs'");
    expect(paidMenuItems).toContain("'lesson-menu-prepositions'");
    expect(paidMenuItems).not.toContain("'lesson-menu-theory'");

    const menuCards = menu.slice(
      menu.indexOf('menuItems.filter(item => !item.hidden).map'),
      menu.indexOf('{/* зачем: раньше здесь стоял ещё и lockStateLoaded'),
    );
    expect(menuCards).toContain("style={{ position: 'relative', overflow: 'visible' }}");
    const cardCloseIndex = menuCards.indexOf('</PremiumCard>');
    const energyBadgeIndex = menuCards.indexOf('{ENERGY_COST_MENU_ITEMS.has(item.testID)');
    expect(cardCloseIndex).toBeGreaterThanOrEqual(0);
    expect(energyBadgeIndex).toBeGreaterThan(cardCloseIndex);
  });

  it('обходные CTA платных активностей тоже показывают общий знак', () => {
    for (const [file, marker] of [
      ['app/flashcards/CollectionHeader.tsx', 'flashcards-collection-listen-energy-cost'],
      ['app/flashcards/CollectionHeader.tsx', 'flashcards-collection-train-energy-cost'],
      ['app/flashcards_swipe.tsx', 'flashcards-swipe-next-round-energy-cost'],
      ['components/arena/ArenaModeSheet.tsx', 'arena-mode-energy-cost'],
      ['app/arena_results.tsx', 'arena-results-replay-energy-cost'],
      ['app/arena_match.tsx', 'arena-match-retry-energy-cost'],
      ['components/DialogVerdictScreen.tsx', 'dialog-verdict-retry-energy-cost'],
      ['components/mistake-practice/MistakePracticeLoopNode.tsx', 'mistake-practice-loop-energy-cost'],
      ['app/WeeklyReviewCard.tsx', 'weekly-review-energy-cost'],
      ['app/max_voice_review.tsx', 'max-voice-review-energy-cost'],
      ['app/personal_plan_exercise_transition.tsx', 'personal-plan-transition-energy-cost'],
      ['app/personal_plan_quiz.tsx', 'personal-plan-quiz-next-energy-cost'],
      ['app/personal_plan_exercise.tsx', 'personal-plan-next-task-energy-cost'],
      ['app/personal_plan_stats_screen.tsx', 'personal-plan-stats-replay-energy-cost'],
    ] as const) {
      expect(read(file)).toContain(marker);
    }

    expect(read('components/feedback/ResultsSequence.tsx')).toContain('secondaryShowsEnergyCost');
    expect(read('components/arena/ArenaRankHybrid.tsx')).toContain('arena-rank-revenge-energy-cost');
    expect(read('app/lesson_intro_screens.tsx')).toContain('showEnergyCost?: boolean');
    expect(read('app/personal_plan_theory.tsx')).toContain('showEnergyCost={theoryStartsPaidTask}');
  });

  it('урок с MAX показывает цену и списывает энергию только при реальном старте', () => {
    const prestart = read('app/max_call_prestart.tsx');
    expect(prestart).toContain("import EnergyCostBadge from '../components/EnergyCostBadge'");
    expect(prestart).toContain('testID="max-call-start-energy-cost"');
    expect(prestart).toContain('confirmSpendOne: confirmMaxLessonEnergy');
    expect(prestart).toContain('if (isTutor)');
    expect(prestart).toContain('setMaxLessonNoEnergy(true)');
    expect(prestart).toContain('<NoEnergyModal');
  });

  it('цена рисуется только когда конкретный тап действительно начинает новую оплату', () => {
    const dialogs = read('components/DialogsTabContent.tsx');
    expect(dialogs).toContain('heroStartsPaid');
    expect(dialogs).toContain('heroStartsPaid ? <EnergyCostBadge');
    expect(dialogs).toContain('style={{ right: -4 }}');

    const picker = read('app/flashcards/DeckPickerSheet.tsx');
    expect(picker).toContain('showsEnergyCostForPreset?: (preset: FcModePreset) => boolean');
    expect(picker).toContain('selectedPresetStartsPaidActivity');
    expect(read('app/flashcards_listening_session.tsx')).toContain('showsEnergyCostForPreset');
    expect(read('app/flashcards_speaking_session.tsx')).toContain('showsEnergyCostForPreset');
  });

  it('Learning V2 реально списывает показанную цену и блокирует неоплаченный вход', () => {
    const session = read('app/learning-v2/session/[id].tsx');
    expect(session).toContain('LearningV2SessionEnergyGate');
    expect(session).toContain('confirmLearningV2Energy');
    expect(session).toContain('<NoEnergyModal');
    expect(read('app/learning-v2/lesson/[id].tsx')).toContain('learning-v2-skip-theory-energy-cost');
  });

  it('возврат в уже активную очередь Арены не списывает энергию второй раз', () => {
    const hub = read('components/arena/ArenaHubSurface.tsx');
    const matchmaking = read('app/arena_matchmaking.tsx');
    expect((hub.match(/resumeQueue: '1'/g) ?? []).length).toBeGreaterThanOrEqual(2);
    expect(matchmaking).toContain("resumeQueue?: string");
    expect(matchmaking).toContain("const resumesPaidQueue = params.resumeQueue === '1'");
    expect(matchmaking).toContain("if (resumesPaidQueue)");
  });

  it('удалённые мёртвые ветки не вернулись', () => {
    // spendEnergy дублировал трату и уже разошёлся с EnergyContext (не знал
    // про tester_no_limits) — второй источник истины про валюту игрока.
    expect(read('app/energy_system.ts')).not.toContain('export async function spendEnergy');
    expect(read('app/achievements.ts')).not.toContain("type: 'energy_refill'");
    expect(read('app/club_boosts.ts')).not.toContain("def?.type === 'energy'");
  });

  it('админ-команда drain/fill применяется на живом пути загрузки', () => {
    // Третий аудит 2026-08-23: команда доезжала до телефона через синк и
    // НИКОГДА не применялась — единственный применитель жил внутри
    // energy_system.getEnergyState, у которого не осталось боевых вызовов.
    // Админка молча врала, что энергия изменена.
    const context = read('components/EnergyContext.tsx');
    expect(context).toContain('applyAdminEnergyCommand');
    const runLoad = context.slice(
      context.indexOf('const runLoad = useCallback'),
      context.indexOf('const load = useCallback'),
    );
    expect(runLoad).toContain('await applyAdminEnergyCommand()');
    expect(read('app/energy_system.ts')).toContain('export async function applyAdminEnergyCommand');
  });

  it('возврат идёт в тот же пул, откуда была трата', () => {
    // spendOne тратит бонус первым (сгорает в полночь). Возврат «всегда в
    // базу» отмывал бонус в вечную базу, а при полной базе терял единицу об
    // потолок. Маркер пула обязателен.
    const context = read('components/EnergyContext.tsx');
    expect(context).toContain('lastSpendPoolRef');
    const refund = context.slice(
      context.indexOf('const refundOne = useCallback'),
      context.indexOf('const spendAmount = useCallback'),
    );
    expect(refund).toContain("pool === 'bonus'");
  });

  it('все писатели energy_state стоят в одной очереди', () => {
    // Третий аудит: ключ energy_state пишут девять мест. Подарки, сезонная
    // награда и покупка за жемчужины шли под общим withStorageLock, а
    // EnergyContext — мимо него, читая-меняя-записывая объект целиком.
    // Пересечение окон теряло либо подарок, либо списание.
    const context = read('components/EnergyContext.tsx');
    expect(context).toContain("from '../app/storage_mutex'");
    // Пять писателей: восстановление, spendOne, refundOne, spendAmount, refill.
    expect((context.match(/withStorageLock\(async/g) ?? []).length).toBeGreaterThanOrEqual(5);
  });

  it('сезонные награды энергии оповещают контекст', () => {
    // battery пишет energy_state напрямую: без события счётчики на открытых
    // экранах врут, а пуш «энергия восстановлена» не отменяется вовремя.
    const season = read('app/season_reward_apply.ts');
    expect(season).toContain("emitAppEvent('energy_reload')");
  });

  it('ускорения восстановления совпадают на клиенте и сервере', () => {
    // Сервер кладёт значение в награду, клиент им же валидирует: разойдутся —
    // сундук выдаст не то, что обещан.
    expect(read('app/services/league_chest_rewards.ts')).toContain('LEAGUE_CHEST_ENERGY_MS = 20 * 60 * 1000');
    expect(read('functions/src/league_chest.ts')).toContain('ENERGY_MS = 20 * 60 * 1000');
    // turbo_regen — одна константа на бон дня и сезонный пропуск (общий ключ).
    expect(read('app/boons/boon_effects_energy.ts')).toContain('TURBO_REGEN_FACTOR = 2 / 3');
    expect(read('app/season_reward_apply.ts')).toContain('TURBO_REGEN_FACTOR');
  });
  it('знак цены никогда не лежит внутри обрезающего контейнера', () => {
    // Инцидент 2026-08-24: на кнопке «Начать тренировку» (интро урока) молния
    // «−1 ⚡» рисовалась обрубком. Причина не в ассете: бейдж позиционируется
    // абсолютно и торчит НАД кнопкой (top: -18), а лицо кнопки клипует всё за
    // своими краями. Два источника клипа: собственный overflow:'hidden' в
    // стиле кнопки и автоматический surfaceClip у DuoPressable с градиентом
    // (он держит градиент в скруглении). Лечится выносом бейджа СОСЕДОМ
    // кнопки — в обёртку без клипа, а не ослаблением клипа кнопки.
    //
    // Сторож разбирает JSX стеком тегов: находит непосредственного родителя
    // каждого <EnergyCostBadge и валит сборку, если тот обрезает содержимое.
    const roots = ['app', 'components', 'modules'];
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(path.join(process.cwd(), dir), { withFileTypes: true })) {
        const rel = `${dir}/${entry.name}`;
        if (entry.isDirectory()) walk(rel);
        else if (entry.name.endsWith('.tsx')) files.push(rel);
      }
    };
    for (const root of roots) walk(root);

    // Имена стилей с overflow:'hidden' на верхнем уровне объекта стиля.
    const clippingStyles = (source: string): Set<string> => {
      const names = new Set<string>();
      const re = /(\w+)\s*:\s*\{/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(source))) {
        const start = m.index + m[0].length;
        let depth = 1;
        let i = start;
        while (i < source.length && depth > 0) {
          const c = source[i];
          if (c === '{') depth += 1;
          else if (c === '}') depth -= 1;
          i += 1;
        }
        const top = source.slice(start, i).replace(/\{[^{}]*\}/g, '');
        if (/overflow\s*:\s*['"]hidden['"]/.test(top)) names.add(m[1]);
      }
      return names;
    };

    const offenders: string[] = [];
    for (const file of files) {
      const source = read(file);
      if (!source.includes('<EnergyCostBadge')) continue;
      const clip = clippingStyles(source);
      let at = -1;
      while ((at = source.indexOf('<EnergyCostBadge', at + 1)) !== -1) {
        const before = source.slice(0, at);
        const stack: { name: string; attrs: string }[] = [];
        const tagRe = /<(\/?)([A-Za-z][A-Za-z0-9_.]*)([^>]*?)(\/?)>/gs;
        let t: RegExpExecArray | null;
        while ((t = tagRe.exec(before))) {
          const [, closing, name, attrs, selfClosing] = t;
          if (closing) {
            for (let k = stack.length - 1; k >= 0; k -= 1) {
              if (stack[k].name === name) { stack.splice(k); break; }
            }
          } else if (!selfClosing) stack.push({ name, attrs });
        }
        const parent = stack[stack.length - 1];
        if (!parent) continue;
        const named = [...parent.attrs.matchAll(/styles\.(\w+)/g)].map(x => x[1]).filter(s => clip.has(s));
        const inlineClip = /overflow\s*:\s*['"]hidden['"]/.test(parent.attrs);
        // DuoPressable с градиентом клипует лицо кнопки сам (surfaceClip).
        const gradientDuo = parent.name === 'DuoPressable' && /gradientColors/.test(parent.attrs);
        if (named.length || inlineClip || gradientDuo) {
          const line = before.split('\n').length;
          offenders.push(`${file}:${line} внутри <${parent.name}>`);
        }
      }
    }

    expect(offenders).toEqual([]);
  });
});
