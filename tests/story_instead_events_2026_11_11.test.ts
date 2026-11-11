// story_instead_events_2026_11_11.test.ts — шаг 2а «истории вместо окон»: «С возвращением» и «Хватает на ранг» приходят событием истории.
// зачем (владелец 11.11: «никаких модальных окон совсем, всё отображается только в историях», на шаг 2 — «Да, шаг 2»): сторож держит
// правила события `instead` (ключ повтора, строгая проверка данных) и то, что оба окна при выключенных историях работают как раньше.
import fs from 'node:fs';
import path from 'node:path';
import { addStoryEvent, parseStoryEvents, serializeStoryEvents, storyEventKey } from '../modules/story_events/story_events_core';
import { insteadTemplateFromPayload, STORY_INSTEAD_EVENT_KINDS } from '../components/stories/templates/story_instead_from_event';

jest.mock('../app/coin_rank_table_v1', () => ({ isValidCoinRank: (r: unknown) => typeof r === 'number' && Number.isInteger(r) && r >= 0 && r <= 19 }));

const ROOT = path.join(__dirname, '..');
const read = (rel: string): string => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n');
const NOW = Date.UTC(2026, 10, 11, 12);

describe('событие instead — ключ повтора и журнал', () => {
  it('один факт даёт один ключ: возвращение — раз в день, ранг — раз на ранг', () => {
    expect(storyEventKey('instead', { kind: 'back', key: '2026-11-11', daysAway: 9 })).toBe('instead:back:2026-11-11');
    expect(storyEventKey('instead', { kind: 'rank_enough', key: '5', nextRank: 5 })).toBe('instead:rank_enough:5');
  });

  it('без вида или ключа событие негодно — в журнал не попадает', () => {
    expect(storyEventKey('instead', { kind: 'back' })).toBe('');
    expect(storyEventKey('instead', { key: '5' })).toBe('');
    const decision = addStoryEvent([], { type: 'instead', payload: { kind: 'back' }, atMs: NOW }, NOW);
    expect(decision).toMatchObject({ added: false, reason: 'invalid' });
  });

  it('повтор того же факта не создаёт вторую историю, а новый день — создаёт', () => {
    const first = addStoryEvent([], { type: 'instead', payload: { kind: 'back', key: '2026-11-11', daysAway: 9 }, atMs: NOW }, NOW);
    expect(first.added).toBe(true);
    const again = addStoryEvent(first.list, { type: 'instead', payload: { kind: 'back', key: '2026-11-11', daysAway: 9 }, atMs: NOW + 1000 }, NOW + 1000);
    expect(again).toMatchObject({ added: false, reason: 'duplicate' });
    const nextDay = addStoryEvent(first.list, { type: 'instead', payload: { kind: 'back', key: '2026-11-12', daysAway: 8 }, atMs: NOW + 1000 }, NOW + 1000);
    expect(nextDay.added).toBe(true);
  });

  it('событие переживает сохранение и чтение журнала', () => {
    const added = addStoryEvent([], { type: 'instead', payload: { kind: 'rank_enough', key: '5', rank: 4, nextRank: 5, balance: 2400, price: 2000 }, atMs: NOW }, NOW);
    const restored = parseStoryEvents(serializeStoryEvents(added.list));
    expect(restored).toHaveLength(1);
    expect(restored[0]).toMatchObject({ id: 'instead:rank_enough:5', type: 'instead', seen: false });
  });
});

describe('событие instead → данные кадра', () => {
  it('«С возвращением»: числа события ложатся в кадр как есть', () => {
    expect(insteadTemplateFromPayload({ kind: 'back', key: 'd', daysAway: 9, dueCards: 24, phrasesLearned: 186, coinRank: 6 }))
      .toEqual({ id: 'instead_back', coinRank: 6, daysAway: 9, dueCards: 24, phrasesLearned: 186 });
    // ранг неизвестен (−1) — кадр с монетой без ранга, а не отказ
    expect(insteadTemplateFromPayload({ kind: 'back', key: 'd', daysAway: 9, dueCards: 0, phrasesLearned: 0, coinRank: -1 }))
      .toEqual({ id: 'instead_back', coinRank: null, daysAway: 9, dueCards: 0, phrasesLearned: 0 });
  });

  it('«Хватает на ранг»: только настоящий следующий ранг и баланс не меньше цены', () => {
    expect(insteadTemplateFromPayload({ kind: 'rank_enough', key: '5', rank: 4, nextRank: 5, balance: 2400, price: 2000 }))
      .toEqual({ id: 'instead_rank', rank: 4, nextRank: 5, balance: 2400, price: 2000 });
    expect(insteadTemplateFromPayload({ kind: 'rank_enough', key: '5', rank: 4, nextRank: 5, balance: 1900, price: 2000 })).toBeNull();
    expect(insteadTemplateFromPayload({ kind: 'rank_enough', key: '6', rank: 4, nextRank: 6, balance: 9000, price: 2000 })).toBeNull();
    expect(insteadTemplateFromPayload({ kind: 'rank_enough', key: '5', rank: 4, nextRank: 5, balance: 2400, price: 0 })).toBeNull();
  });

  it('битые данные кадра не дают: строки вместо чисел, дроби, отрицательные, ноль дней', () => {
    for (const bad of [
      { kind: 'back', key: 'd', daysAway: '9', dueCards: 24, phrasesLearned: 186, coinRank: 6 },
      { kind: 'back', key: 'd', daysAway: 9.5, dueCards: 24, phrasesLearned: 186, coinRank: 6 },
      { kind: 'back', key: 'd', daysAway: 0, dueCards: 24, phrasesLearned: 186, coinRank: 6 },
      { kind: 'back', key: 'd', daysAway: 9, dueCards: -1, phrasesLearned: 186, coinRank: 6 },
      { kind: 'back', key: 'd', daysAway: 9, dueCards: 24, coinRank: 6 },
      { kind: 'rank_enough', key: '5', rank: '4', nextRank: 5, balance: 2400, price: 2000 },
      { kind: 'unknown_kind', key: 'x' },
      { key: 'x' },
    ]) {
      expect({ bad, tpl: insteadTemplateFromPayload(bad as Record<string, string | number | boolean>) }).toEqual({ bad, tpl: null });
    }
  });

  it('«Бонусы стали монетами»: что было и сколько стало; нулевой итог тоже показывается', () => {
    expect(insteadTemplateFromPayload({ kind: 'legacy', key: 'v2:1240', coins: 1240, xpBefore: 3100, pearlsBefore: 4, spinsBefore: 0 }))
      .toEqual({ id: 'instead_legacy', coins: 1240, xpBefore: 3100, pearlsBefore: 4, spinsBefore: 0 });
    expect(insteadTemplateFromPayload({ kind: 'legacy', key: 'v2:0', coins: 0, xpBefore: 0, pearlsBefore: 0, spinsBefore: 0 })).toMatchObject({ id: 'instead_legacy', coins: 0 });
    expect(insteadTemplateFromPayload({ kind: 'legacy', key: 'v2:1', coins: 1, xpBefore: 1, pearlsBefore: 1 })).toBeNull();
  });

  it('«Plus закончился»: кадр без даты, число защит — из события', () => {
    expect(insteadTemplateFromPayload({ kind: 'plus_expired', key: 'premium:2026-11-11', plan: 'premium', freezesPerMonth: 3 }))
      .toEqual({ id: 'instead_plus_expired', untilLabel: null, freezesPerMonth: 3 });
    expect(insteadTemplateFromPayload({ kind: 'plus_expired', key: 'premium:2026-11-11', plan: 'premium', freezesPerMonth: 0 })).toBeNull();
    expect(insteadTemplateFromPayload({ kind: 'plus_expired', key: 'premium:2026-11-11', plan: 'premium' })).toBeNull();
  });

  it('«Доступ можно открыть снова»: ключ — конец окна доступа; без него кадра нет', () => {
    expect(insteadTemplateFromPayload({ kind: 'ref_ended', key: '1762768800000', windowEndMs: 1762768800000 })).toEqual({ id: 'instead_ref_ended', windowEndMs: 1762768800000 });
    expect(insteadTemplateFromPayload({ kind: 'ref_ended', key: '0', windowEndMs: 0 })).toBeNull();
    expect(insteadTemplateFromPayload({ kind: 'ref_ended', key: 'x' })).toBeNull();
  });

  it('«Тебя пригласили» и «Первый разговор»: данные события → кадр; битые — нет кадра', () => {
    expect(insteadTemplateFromPayload({ kind: 'ref_welcome', key: 'once', needsCodeEntry: false })).toEqual({ id: 'instead_ref_welcome', needsCodeEntry: false });
    expect(insteadTemplateFromPayload({ kind: 'ref_welcome', key: 'once', needsCodeEntry: true })).toEqual({ id: 'instead_ref_welcome', needsCodeEntry: true });
    expect(insteadTemplateFromPayload({ kind: 'first_dialog', key: 'en', studyTarget: 'en', turns: 6, goalsDone: 5, goalsTotal: 5 }))
      .toEqual({ id: 'instead_first_dialog', studyTarget: 'en', turns: 6, goalsDone: 5, goalsTotal: 5 });
    expect(insteadTemplateFromPayload({ kind: 'first_dialog', key: 'en', studyTarget: 'en', turns: 0, goalsDone: 0, goalsTotal: 5 })).toBeNull();
    expect(insteadTemplateFromPayload({ kind: 'first_dialog', key: 'en', studyTarget: 'en', turns: 6, goalsDone: 6, goalsTotal: 5 })).toBeNull();
    expect(insteadTemplateFromPayload({ kind: 'first_dialog', key: 'en', turns: 6, goalsDone: 5, goalsTotal: 5 })).toBeNull();
  });

  it('список видов с источником — шестнадцать; остальные 4 кадра ждут своих партий', () => {
    expect([...STORY_INSTEAD_EVENT_KINDS]).toEqual(['back', 'rank_enough', 'legacy', 'plus_expired', 'ref_ended', 'ref_welcome', 'first_dialog', 'rate', 'perfect', 'lesson_open', 'medal', 'level_exam', 'lingman_exam', 'update', 'nudge', 'hello']);
  });

  it('приветствие новичка: при включённых историях — кадр, «показано» после записи; три экрана остаются путём для выключенных историй', () => {
    expect(storyEventKey('instead', { kind: 'hello', key: 'once', coinRank: 0 })).toBe('instead:hello:once');
    expect(insteadTemplateFromPayload({ kind: 'hello', key: 'once', coinRank: 0 })).toEqual({ id: 'instead_hello', coinRank: 0 });
    expect(insteadTemplateFromPayload({ kind: 'hello', key: 'once', coinRank: 99 })).toBeNull();
    expect(insteadTemplateFromPayload({ kind: 'hello', key: 'once' })).toBeNull();
    const gate = read('components/onboarding/WelcomeGate.tsx');
    const branch = gate.indexOf('if (storiesReplaceWindows()) {');
    expect(branch).toBeGreaterThan(gate.indexOf("console.log('[WELCOME-B3]', JSON.stringify({ show, isNew: verdict.isNew"));
    expect(gate.indexOf('if (!insteadStoryLanded(record)) {', branch)).toBeLessThan(gate.indexOf('await AsyncStorage.setItem(shownKey, String(Date.now()))', branch));
    expect(gate.indexOf('setWants(true);', branch)).toBeGreaterThan(branch);
    // кнопка «Начать первый урок» ведёт туда же, куда «Начать занятие» приветствия
    expect(read('components/stories/templates/use_story_cta_action.ts')).toContain("if (cta.action === 'start_lesson' || cta.action === 'start_first_lesson') {");
  });

  it('приз «Набора месяца»: окно не всплывает при включённых историях, а награда не теряется — забирается тем же вызовом сервера', () => {
    const host = read('components/packs/CommunityMonthRewardHost.tsx');
    expect(host).toContain('winner={active && !storiesInstead ? winner : null}');
    expect(host).toContain('if (!storiesInstead || !active || !winner || winner.claimed) return;');
    expect(host).toContain('if (autoClaimRef.current === winner.rewardId) return;');
    expect(host).toContain('void claim()');
    // выдача по-прежнему одна — серверная; клиент сам монеты не начисляет
    expect(host.match(/callCommunityMonthClaimReward\(/g)).toHaveLength(1);
    expect(host).toContain('autoClaimRef.current = null;');
  });

  it('«Включить напоминания»: число пропущенных дней → кадр; кнопка кадра вызывает тот же обработчик, что кнопка окна', () => {
    expect(storyEventKey('instead', { kind: 'nudge', key: '2026-11-11', missedDays: 3 })).toBe('instead:nudge:2026-11-11');
    expect(insteadTemplateFromPayload({ kind: 'nudge', key: 'k', missedDays: 3 })).toEqual({ id: 'instead_nudge', missedDays: 3 });
    expect(insteadTemplateFromPayload({ kind: 'nudge', key: 'k', missedDays: 0 })).toBeNull();
    expect(insteadTemplateFromPayload({ kind: 'nudge', key: 'k' })).toBeNull();
    const layout = read('app/_layout.tsx');
    // история — только при включённых историях; окно остаётся прежним путём
    const nudge = layout.indexOf("onAppEvent('notif_permission_nudge', async ({ missedDays }) => {");
    const branch = layout.indexOf('if (storiesReplaceWindows()) {', nudge);
    expect(branch).toBeGreaterThan(nudge);
    expect(layout.indexOf('void recordNotifNudgeStory({ dayKey: todayKey, missedDays })', branch)).toBeGreaterThan(branch);
    expect(layout.indexOf('setNotifNudgeVisible(true);', branch)).toBeGreaterThan(branch);
    // логика разрешения не копируется: обработчик окна запоминается и вызывается по просьбе кадра
    expect(layout).toContain('onConfirm={rememberNotifNudgeConfirm(async () => {');
    expect(layout).toContain("onAppEvent('notif_nudge_enable_request', ({ source }) => {");
    expect(layout).toContain('void confirm();');
    const cta = read('components/stories/templates/use_story_cta_action.ts');
    expect(cta).toContain("emitAppEvent('notif_nudge_enable_request', { source: ctx.source });");
    expect(cta).not.toContain('requestNotificationPermission');
  });

  it('«Вышло обновление»: текст из настроек необязателен; окно — прежний путь при выключенных историях; адрес магазина — только из настроек приложения', () => {
    expect(storyEventKey('instead', { kind: 'update', key: '2026-11-11', message: '' })).toBe('instead:update:2026-11-11');
    expect(insteadTemplateFromPayload({ kind: 'update', key: 'k', message: '' })).toEqual({ id: 'instead_update', message: null });
    expect(insteadTemplateFromPayload({ kind: 'update', key: 'k', message: '   ' })).toEqual({ id: 'instead_update', message: null });
    expect(insteadTemplateFromPayload({ kind: 'update', key: 'k' })).toEqual({ id: 'instead_update', message: null });
    expect(insteadTemplateFromPayload({ kind: 'update', key: 'k', message: 'Исправили звук в уроках.' })).toEqual({ id: 'instead_update', message: 'Исправили звук в уроках.' });
    const layout = read('app/_layout.tsx');
    const branch = layout.indexOf('if (storiesReplaceWindows()) {', layout.indexOf('checkForUpdate().then(u => {'));
    expect(branch).toBeGreaterThan(-1);
    expect(layout.indexOf('void recordAppUpdateStory({ dayKey, message: u.message ?? null })', branch)).toBeGreaterThan(branch);
    expect(layout.indexOf('setUpdateInfo(u);', branch)).toBeGreaterThan(branch);
    // кадр говорит словами окна
    const frame = read('components/stories/templates/frames_instead_a.tsx');
    expect(frame).toContain('const copy = pickUpdateText(lang);');
    expect(frame).toContain('<P text={tpl.message ?? copy.body} d={760} />');
    // кнопка: адрес берётся из настроек приложения, событие его не несёт; двойной тап магазин дважды не открывает
    const cta = read('components/stories/templates/use_story_cta_action.ts');
    expect(cta).toContain("const storeUrl = Platform.OS === 'ios' ? config.STORE_URL_IOS : config.STORE_URL_ANDROID;");
    expect(cta).toContain('if (storeOpeningRef.current) {');
    expect(read('modules/story_events/story_instead_sources.ts')).not.toContain('storeUrl');
  });

  it('медаль и экзамены: данные события → кадр; битые — нет кадра', () => {
    expect(storyEventKey('instead', { kind: 'medal', key: 'en:12:gold', lessonNo: 12, tier: 'gold', score: 5 })).toBe('instead:medal:en:12:gold');
    expect(insteadTemplateFromPayload({ kind: 'medal', key: 'k', lessonNo: 12, tier: 'gold', score: 5 })).toEqual({ id: 'instead_medal', lessonNo: 12, tier: 'gold', score: 5 });
    // оценка бывает дробной — она нужна тексту «Поделиться»
    expect(insteadTemplateFromPayload({ kind: 'medal', key: 'k', lessonNo: 12, tier: 'silver', score: 4.7 })).toEqual({ id: 'instead_medal', lessonNo: 12, tier: 'silver', score: 4.7 });
    expect(insteadTemplateFromPayload({ kind: 'medal', key: 'k', lessonNo: 12, tier: 'none', score: 2 })).toBeNull();
    expect(insteadTemplateFromPayload({ kind: 'medal', key: 'k', lessonNo: 12, tier: 'gold', score: 9 })).toBeNull();
    expect(insteadTemplateFromPayload({ kind: 'medal', key: 'k', lessonNo: 0, tier: 'gold', score: 5 })).toBeNull();
    expect(insteadTemplateFromPayload({ kind: 'level_exam', key: 'en:A1', cefrLevel: 'A1', lessonNo: 8, score: 4.7 })).toEqual({ id: 'instead_level_exam', cefrLevel: 'A1', lessonNo: 8, score: 4.7 });
    expect(insteadTemplateFromPayload({ kind: 'level_exam', key: 'en:', cefrLevel: '', lessonNo: 8, score: 4.7 })).toBeNull();
    expect(insteadTemplateFromPayload({ kind: 'lingman_exam', key: 'en', lessonNo: 32, score: 5 })).toEqual({ id: 'instead_lingman_exam', lessonNo: 32, score: 5 });
    expect(insteadTemplateFromPayload({ kind: 'lingman_exam', key: 'en', lessonNo: 32 })).toBeNull();
  });

  it('итог урока: медаль и экзамены — история только при включённых историях, иначе прежняя очередь; надписи уведомления — из общего файла', () => {
    const screen = read('app/lesson_complete.tsx');
    expect(screen).toContain('const notifsAsStories = storiesReplaceWindows();');
    for (const push of ["queue.push({ kind: 'medal', medalTier: newTier });", "queue.push({ kind: 'level_exam_unlock', cefrLevel: unlockedLevel });", "queue.push({ kind: 'lingman_exam_unlock' });"]) {
      expect(screen).toContain(`} else {\n            ${push}`);
    }
    expect(screen).toContain('void recordLessonMedalStory({ studyTarget, lessonNo: lessonId, tier: newTier, score })');
    expect(screen).toContain('void recordLevelExamOpenStory({ studyTarget, cefrLevel: unlockedLevel, lessonNo: lessonId, score })');
    expect(screen).toContain('void recordLingmanExamOpenStory({ studyTarget, lessonNo: lessonId, score })');
    // уведомление и кадр читают одни слова — в экране строк этих уведомлений больше нет
    expect(screen).toContain('modalTitle = levelExamOpenTitle(lang);');
    // строка «Экзамен Lingman открыт» остаётся в записке самого экрана итога — проверяем именно заголовок уведомления
    expect(screen).toContain('modalTitle = lingmanExamOpenTitle(lang);');
    expect(screen).not.toContain("ru: 'Бронзовая медаль!'");
    // кнопка «Поделиться» кадра — тот же текст, что у уведомления, и защита от второго окна
    const cta = read('components/stories/templates/use_story_cta_action.ts');
    expect(cta).toContain('messages.buildCelebrationShareBody(share.kind, lang, share.lessonId, share.score, { medalTier: share.medalTier, cefrLevel: share.cefrLevel })');
    expect(cta).toContain("if (sharingRef.current) { DebugLogger.info(LOG, 'поделиться достижением: уже открывается — повторный тап пропущен'); return; }");
    expect(read('components/stories/StoryViewer.tsx')).toContain('share: storyCelebrationShare(tpl) });');
  });

  it('«Идеальный урок» и «Открыт урок N»: данные события → кадр; битые — нет кадра', () => {
    expect(storyEventKey('instead', { kind: 'perfect', key: '12:en:attempt-a', lessonNo: 12, total: 45, coins: 120 })).toBe('instead:perfect:12:en:attempt-a');
    expect(insteadTemplateFromPayload({ kind: 'perfect', key: 'k', lessonNo: 12, total: 45, coins: 120 })).toEqual({ id: 'instead_perfect', lessonNo: 12, correct: 45, total: 45, coins: 120 });
    // ноль монет — честный кадр без плашки монет; ноль заданий или номер урока 0 — битые данные
    expect(insteadTemplateFromPayload({ kind: 'perfect', key: 'k', lessonNo: 12, total: 45, coins: 0 })).toEqual({ id: 'instead_perfect', lessonNo: 12, correct: 45, total: 45, coins: 0 });
    expect(insteadTemplateFromPayload({ kind: 'perfect', key: 'k', lessonNo: 12, total: 0, coins: 120 })).toBeNull();
    expect(insteadTemplateFromPayload({ kind: 'perfect', key: 'k', lessonNo: 0, total: 45, coins: 120 })).toBeNull();
    expect(insteadTemplateFromPayload({ kind: 'perfect', key: 'k', lessonNo: 12, total: 45 })).toBeNull();
    expect(storyEventKey('instead', { kind: 'lesson_open', key: 'en:13', lessonNo: 12, nextLessonNo: 13 })).toBe('instead:lesson_open:en:13');
    // темы следующего урока уведомление не знало — кадр без строки темы
    expect(insteadTemplateFromPayload({ kind: 'lesson_open', key: 'en:13', lessonNo: 12, nextLessonNo: 13 })).toEqual({ id: 'instead_lesson_open', lessonNo: 12, nextLessonNo: 13, topic: null });
    expect(insteadTemplateFromPayload({ kind: 'lesson_open', key: 'en:14', lessonNo: 12, nextLessonNo: 14 })).toBeNull();
    expect(insteadTemplateFromPayload({ kind: 'lesson_open', key: 'en:1', lessonNo: 0, nextLessonNo: 1 })).toBeNull();
  });

  it('итог урока: окно штампа и уведомление — прежний путь при выключенных историях; история отпускает слот секвенции', () => {
    const screen = read('app/lesson_complete.tsx');
    expect(screen).toContain('{perfectMomentOn && lessonCounts && !perfectAsStory ? (');
    expect(screen).toContain('onOpenChange: onPerfectOpenChange,');
    // уведомление «Новый урок открыт»: история — только при включённых историях, иначе прежняя очередь
    const unlock = screen.indexOf('if (storiesReplaceWindows()) {\n            void recordLessonOpenStory(');
    expect(unlock).toBeGreaterThan(-1);
    expect(screen.indexOf("queue.push({ kind: 'lesson_unlock', unlockedLessonId: lessonId + 1 });", unlock)).toBeGreaterThan(unlock);
    const hook = read('components/lesson_moments/use_perfect_moment_story.ts');
    expect(hook).toContain('const instead = ready && (takenKey === onceKey || storiesReplaceWindows());');
    expect(hook).toContain('.finally(() => { onOpenChangeRef.current(false); });');
    // окно штампа не тронуто: истории в него не подмешаны
    expect(read('components/lesson_moments/LessonPerfectHost.tsx')).not.toContain('story');
    // кнопка «Начать урок N» ведёт в список уроков — проверки энергии и Plus там
    expect(read('components/stories/templates/use_story_cta_action.ts')).toContain("router.push('/(tabs)/lessons' as never);");
  });

  it('«Оцените приложение»: повод события → кадр; серия — только три рубежа окна; чужой повод — нет кадра', () => {
    expect(storyEventKey('instead', { kind: 'rate', key: 'perfect_lesson:2026-11-11', context: 'perfect_lesson', streakDays: 0 })).toBe('instead:rate:perfect_lesson:2026-11-11');
    expect(insteadTemplateFromPayload({ kind: 'rate', key: 'k', context: 'perfect_lesson', streakDays: 0 })).toEqual({ id: 'instead_rate', context: 'perfect_lesson', streakDays: null });
    expect(insteadTemplateFromPayload({ kind: 'rate', key: 'k', context: 'streak_milestone', streakDays: 14 })).toEqual({ id: 'instead_rate', context: 'streak_milestone', streakDays: 14 });
    // рубеж серии, которого у окна не было, и серия у повода «зачёт» строкой серии не становятся
    expect(insteadTemplateFromPayload({ kind: 'rate', key: 'k', context: 'streak_milestone', streakDays: 9 })).toEqual({ id: 'instead_rate', context: 'streak_milestone', streakDays: null });
    expect(insteadTemplateFromPayload({ kind: 'rate', key: 'k', context: 'level_exam_pass', streakDays: 7 })).toEqual({ id: 'instead_rate', context: 'level_exam_pass', streakDays: null });
    expect(insteadTemplateFromPayload({ kind: 'rate', key: 'k', context: 'something_else', streakDays: 0 })).toBeNull();
    expect(insteadTemplateFromPayload({ kind: 'rate', key: 'k' })).toBeNull();
  });

  it('просьба об оценке: окно не тронуто (один слот, один учёт показа), история — отдельным файлом и учитывает показ после записи', () => {
    const modal = read('components/ReviewPromptModal.tsx');
    expect(modal).toContain("useOverlayVisible('reviewPrompt', visible)");
    expect(modal.match(/markReviewPrompted\(\)/g)).toHaveLength(1);
    expect(modal).toContain('<ReviewPromptModal {...props} visible={props.visible && !storiesInstead} />');
    const hook = read('components/use_review_prompt_story.ts');
    expect(hook).toContain('const storiesInstead = visible && storiesReplaceWindows();');
    expect(hook.indexOf('if (!insteadStoryLanded(record))')).toBeLessThan(hook.indexOf('await markReviewPrompted();'));
    expect(hook.indexOf("if (!record.recorded) {")).toBeLessThan(hook.indexOf('await markReviewPrompted();'));
    expect(hook).toContain('.finally(() => { onCloseRef.current(); });');
    // кадр и окно говорят одними словами: общий файл надписей и общий текст просьбы
    const frames = read('components/stories/templates/frames_instead_b.tsx');
    expect(frames).toContain('const copy = reviewVariantFor(tpl.context, lang);');
    expect(read('components/stories/templates/story_instead_registry.ts')).toContain("case 'instead_rate': return { action: 'rate_app', text: reviewStoreCta(lang), icon: 'star' };");
    // кнопка кадра: «оценено» только если магазин открылся; двойной тап не открывает магазин дважды
    const cta = read('components/stories/templates/use_story_cta_action.ts');
    expect(cta).toMatch(/const opened = await store\.openStoreReviewPage\(\);[\s\S]{0,200}if \(opened\) await review\.markReviewRated\(\);/);
    expect(cta).toContain('if (ratingRef.current) {');
  });

  it('реферальное приветствие и первый разговор: прежний путь окна сохранён, отметка — после записи', () => {
    const welcome = read('components/ReferralWelcomeHost.tsx');
    expect(welcome).toContain('if (storiesReplaceWindows()) {');
    expect(welcome).toContain('void recordReferralWelcomeStory(d.needsCodeEntry).then((record) => {');
    expect(welcome).not.toContain('!d.needsCodeEntry');
    expect(welcome).toContain('setWelcomeDecision(d);');
    const dialog = read('components/dialog_moments/FirstDialogHost.tsx');
    expect(dialog).toContain('markFirstDialogShown(studyTarget);\n      setOpen(true);');
    expect(dialog.indexOf('if (!insteadStoryLanded(record))')).toBeLessThan(dialog.indexOf('markFirstDialogShown(studyTarget);\n        }).catch('));
  });

  it('вкладка «Друзья»: при выключенных историях окно как раньше, «видел» — после записи', () => {
    const friends = read('app/(tabs)/friends.tsx');
    expect(friends).toContain('setAccessEndedOpen(true);');
    expect(friends.indexOf('if (insteadStoryLanded(record)) {')).toBeLessThan(friends.indexOf('await markReferralAccessEndedSeen(windowEnd);\n          } else {'));
  });

  it('истёкшая подписка и старые бонусы: при выключенных историях прежний путь, «показано» — после записи', () => {
    const expired = read('components/EntitlementExpiredHost.tsx');
    expect(expired).toContain("useOverlayVisible('entitlementExpired', pending !== null && !devOverlaysOff && !billingOpen && !storiesInstead);");
    expect(expired).toContain('openPremiumPaywall(router, {');
    expect(expired.indexOf('if (!insteadStoryLanded(record))')).toBeLessThan(expired.indexOf("noteSwallowedHandler('EntitlementExpiredHost:story_last_shown')"));
    const legacy = read('components/legacy_bonus/LegacyBonusWelcomeInner.tsx');
    expect(legacy).toContain("const slot = useOverlayVisible('legacyBonusWelcome', frozen !== null);");
    expect(legacy.indexOf('if (!insteadStoryLanded(record))')).toBeLessThan(legacy.indexOf('dismissLegacyBonusWelcome();\n      })'));
  });
});

describe('окна при выключенных историях работают как раньше', () => {
  const back = read('hooks/use_welcome_back_moment.ts');
  const rank = read('app/use_coin_rank_enough_moment.ts');
  const sources = read('modules/story_events/story_instead_sources.ts');

  it('замена действует только при включённом флаге историй', () => {
    expect(sources).toContain('return isStoriesEnabled();');
    expect(back).toContain('if (storiesReplaceWindows()) {');
    expect(rank).toContain('if (storiesReplaceWindows()) {');
  });

  it('прежний путь окна сохранён: слот очереди и отметка «показано» при получении слота', () => {
    expect(back).toContain("const visible = useOverlayVisible('welcomeBack', decision !== null);");
    expect(back).toContain('setDecision(result.decision);');
    expect(rank).toContain("const visible = useOverlayVisible('coinRankEnough', offer !== null);");
    expect(rank).toContain('setOffer({ owner, rank: decision.rank, nextRank: decision.nextRank, price: decision.price, balance: decision.balance });');
  });

  it('«показано» ставится только после записи истории — факт не теряется при сбое', () => {
    expect(back).toContain('if (!insteadStoryLanded(record)) {');
    expect(rank).toContain('if (!insteadStoryLanded(record)) {');
    expect(back.indexOf('if (!insteadStoryLanded(record))')).toBeLessThan(back.indexOf('void markWelcomeBackShown();\n            clearWelcomeBackReturnGap'));
    expect(rank.indexOf('if (!insteadStoryLanded(record))')).toBeLessThan(rank.indexOf('await markRankOffered(owner, decision.nextRank);\n        return;'));
  });

  it('кнопки двух кадров ведут туда же, куда вели кнопки окон', () => {
    const cta = read('components/stories/templates/use_story_cta_action.ts');
    expect(cta).toContain("router.push({ pathname: '/flashcards_collection', params: { cat: 'saved', from: 'welcome_back' } } as never);");
    expect(cta).toContain("router.push('/coin_rank' as never);");
    // «У меня есть код приглашения» — туда же, куда вела вторая кнопка реферального окна
    expect(cta).toContain("router.push('/referrals?enter=1' as never);");
  });
});
