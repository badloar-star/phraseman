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
    expect(read('app/ai_dialog_session.tsx')).toContain('spendDialogEnergy');
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
    expect(context).toContain("emitAppEvent('energy_spent_on_start'");
    expect(read('app/_layout.tsx')).toContain('<EnergySpendFlightHost />');
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

  it('удалённые мёртвые ветки не вернулись', () => {
    // spendEnergy дублировал трату и уже разошёлся с EnergyContext (не знал
    // про tester_no_limits) — второй источник истины про валюту игрока.
    expect(read('app/energy_system.ts')).not.toContain('export async function spendEnergy');
    expect(read('app/achievements.ts')).not.toContain("type: 'energy_refill'");
    expect(read('app/club_boosts.ts')).not.toContain("def?.type === 'energy'");
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
});
