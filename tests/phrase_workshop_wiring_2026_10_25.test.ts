// зачем (владелец 25.10, «Мастерская фраз»; координатор: «песочница, никаких зачётов старого курса»): сторож подключения режима к
// экрану старого урока, итогу, Plus-гейту и списку уроков. Режим за флагом (в релизе выключен); при выключенном флаге всё
// работает как раньше — это держит константа и условия workshopActive. Тест читает исходники, как соседние контракты.
import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

describe('мастерская фраз: флаг', () => {
  it('в релизе выключена, в dev включена', () => {
    const flag = read('app/phrase_workshop_flag.ts');
    expect(flag).toContain('export const PHRASE_WORKSHOP_ENABLED_IN_RELEASE = false;');
    expect(flag).toContain("typeof __DEV__ !== 'undefined' && __DEV__ === true");
  });
});

describe('мастерская фраз: экран урока (lesson1)', () => {
  const src = read('app/lesson1.tsx');

  it('источник фраз — банк, прогресс — свои ключи, режим выключен без параметра', () => {
    expect(src).toContain("import { usePhraseWorkshopSession } from './use_phrase_workshop_session';");
    expect(src).toContain('workshop: workshopParam,');
    expect(src).toContain('const workshop = usePhraseWorkshopSession(workshopParam, lessonId, String(studyTarget));');
    expect(src).toContain('const workshopActive = workshop.active;');
    expect(src).toContain('? workshop.rows');
    expect(src).toContain('const lessonStorageId = workshopActive ? workshop.storageId : comboActive');
  });

  it('никаких зачётов старого курса: разблокировка, ошибки, «последний урок», медали, аналитика уроков', () => {
    expect(src).toContain('const didUnlock = workshopActive ? false : await tryUnlockNextLesson(');
    expect(src).toContain('if (!workshopActive) rememberLessonRunErrors(lessonId, lessonWrongMistakesRef.current);');
    expect(src).toContain('if (!workshopActive) lessonWrongMistakesRef.current.push(');
    expect(src).toContain('if (!workshopActive && isMistakeStudyTargetValue(stRm)) {');
    expect(src).toContain('if (workshopActive || lessonId < 1 || lessonId > 32) return;');
    expect(src).toContain('if (workshopActive) return; // зачем (мастерская фраз): медали — часть старого курса');
    expect(src).toContain('if (!workshopActive && markLessonAttemptStarted(attempt)) {');
    expect(src).toContain('if (!workshopActive) trackLessonStart()');
    expect(src).toContain("if (!wasLearned && !workshopActive) void bumpStatsDaily('phrases_learned'");
  });

  it('без энергии и сердечек: гейт не получает «первый вопрос виден», ошибка не тратит попытку, шапка без пилюль', () => {
    expect(src).toContain('const lessonFirstQuestionVisible = !workshopActive && canChargeClassicLessonEntry({');
    expect(src).toContain("verdict: isRight || workshopActive ? 'correct' : 'pedagogical_wrong',");
    expect(src).toContain("sessionId: `${workshopActive ? 'workshop' : 'lesson'}:${studyTarget}:${lessonId}`,");
    expect(src).toContain('{workshopTitle !== undefined || attemptsEnergy?.mistakeChargeActive ? null : <LessonEnergyPill />}');
    expect(src).toContain('{workshopTitle !== undefined ? null : (');
    expect(src).toContain('workshopTitle={workshopActive ? phraseWorkshopText(lang, \'title\') : undefined}');
  });

  it('вступления и подсказки старого урока в мастерской не показываются; закрытый режим выходит', () => {
    expect(src).toContain('const hasIntroScreens = !workshopActive && getLessonIntroScreens(lessonId, studyTarget).length > 0;');
    expect(src).toContain('if (!workshopActive && !introShownRaw && !isDevLessonIntroSkip()');
    expect(src).toContain('const lessonHintSupportBlocked = workshopActive || !lessonSupportContentAvailableForTarget(');
    expect(src).toContain('{workshopTitle === undefined && (lessonTheorySupportBlocked ||');
    expect(src).toContain('if (workshop.closed) safeRouterBack(router,');
  });

  it('теория (вердикт Макетов v4): кнопка в ряду инструментов только при наличии страниц ru/uk, шторка поверх раунда', () => {
    expect(src).toContain('const pages = phraseWorkshopTheoryFor(lessonId, session, lang);');
    expect(src).toContain('workshopTheory={workshopTheory}');
    expect(src).toContain('{workshopTitle !== undefined && workshopTheory ? (');
    expect(src).toContain('<PhraseWorkshopTheorySheet visible={workshopTheoryOpen}');
    const sheet = read('components/learning-v2/workshop/PhraseWorkshopTheorySheet.tsx');
    expect(sheet).toContain("import { KitSheetModal } from '../../v2/KitSheetModal';");
    expect(sheet).toContain("g.ctaFill : g.opaqueControl");
    expect(sheet).toContain('{pages.length > 1 ? pages.map(');
    expect(sheet).toContain('fontSize: 22, lineHeight: 28, fontWeight: \'700\'');
    expect(sheet).toContain('fontSize: 16, lineHeight: 25');
    expect(sheet).not.toMatch(/borderWidth|borderColor/);
  });

  it('монеты — существующая активность lesson со своим ключом и ценой повтора; серия и номер прохода — при завершении', () => {
    expect(src).toContain('sessionKey: workshopActive ? `v2cl_l${lessonId}` : RUNE_SESSION_KEY,');
    expect(src).toContain('repeatPriceOnly: workshopActive || undefined,');
    expect(src).toContain("void touchStreakForToday('activity:lesson');");
    expect(src).toContain('void bumpPhraseWorkshopPassCount(lessonId, studyTargetRef.current)');
    // маршрут итога несёт workshop=1 в обоих вариантах перехода
    expect((src.match(/\.\.\.\(workshopActive \? \{ workshop: '1' \} : \{\}\),/g) ?? []).length).toBe(2);
  });
});

describe('мастерская фраз: итог (lesson_complete)', () => {
  const src = read('app/lesson_complete.tsx');
  it('итог песочницы не засчитывает урок: ни бонус, ни «задание дня», ни ачивки, ни «пройден», ни медаль', () => {
    expect(src).toContain("const isWorkshopCompletion = (Array.isArray(params.workshop) ? params.workshop[0] : params.workshop) === '1';");
    expect(src).toContain('const isComboCompletion = comboTopics.length > 0 || isWorkshopCompletion;');
    expect(src).toContain("const isQualifyingLessonPass = params.passed === '1' && !isWorkshopCompletion;");
    expect(src).toContain('if (!isWorkshopCompletion) void markLessonFinishedOnce(lessonId, studyTarget);');
    expect(src.indexOf('if (isWorkshopCompletion) {')).toBeGreaterThan(0);
    expect(src.indexOf('if (isWorkshopCompletion) {')).toBeLessThan(src.indexOf('if (isComboCompletion) {\n        const okTotal'));
  });
  it('копилка монет — тот же ключ, что на экране режима; «ещё раз» остаётся в режиме', () => {
    expect(src).toContain('sessionKey: isWorkshopCompletion ? `v2cl_l${lessonId}` : `lesson${lessonId}_runes_${studyTarget}`,');
    expect(src).toContain('repeatPriceOnly: isWorkshopCompletion || undefined,');
    expect(src).toContain("...(isWorkshopCompletion ? { workshop: '1', from: 'workshop' } : {})");
  });
});

describe('мастерская фраз: Plus-гейт и список уроков', () => {
  it('гейт комбо закрывает и прямую ссылку workshop=1 (только Plus)', () => {
    const gate = read('app/combo_lesson_gate.tsx');
    expect(gate).toContain("import { isPhraseWorkshopParam } from './use_phrase_workshop_session';");
    expect(gate).toContain('|| isPhraseWorkshopParam(params.workshop);');
    expect(gate).toContain("context: isPhraseWorkshopParam(params.workshop) ? 'phrase_workshop' : 'combined_lesson'");
  });
  it('список «Все уроки»: кнопка у пройденного урока, три состояния, тап ведёт куда решено', () => {
    const list = read('components/learning-v2/LearningV2AllLessonsList.tsx');
    expect(list).toContain('usePhraseWorkshopEntries(rows)');
    expect(list).toContain('contentStyle={withWorkshop ? styles.rowContentColumn : styles.rowContent}');
    expect(list).toContain('<PhraseWorkshopRowButton ordinal={row.ordinal}');
    expect(list).toContain('lineIcon: "time-outline"');
    // зачем (cfbef82ca, окна М): к тому же входу добавлены workshop_lesson и workshop_phrases — панель М показывает номер урока и число фраз. Смысл прежний: замок Plus открывает пейвол
    // с контекстом и источником «phrase_workshop» из белого списка контракта входов.
    expect(list).toMatch(/openPremiumPaywall\(router, \{ context: "phrase_workshop", source: "phrase_workshop"(?:, workshop_lesson: ordinal, workshop_phrases: [^}]*)? \}\);/);
    expect(read('app/paywall_entry_contract.ts')).toMatch(/'phrase_workshop'/);
    expect(list).toContain('params: { id: String(ordinal), workshop: "1", from: "workshop" }');
    const button = read('components/learning-v2/workshop/PhraseWorkshopRowButton.tsx');
    expect(button).toContain("open: 'build-outline'");
    expect(button).toContain("locked_plus: 'lock-closed'");
    expect(button).toContain("accumulating: 'time-outline'");
    expect(button).toContain('height: 44, borderRadius: 22');
    // цвета — только токены из карты Тем (W1–W5), без прозрачности вместо токена
    expect(button).toContain('const fill = muted ? g.opaqueControl : g.accentSoft;');
    expect(button).toContain('const ink = muted ? g.secondary : g.accentText;');
    expect(button).toContain('const iconColor = muted ? g.iconMuted : g.accentText;');
    expect(button).not.toMatch(/opacity|ctaFill|buttonFill/);
  });
  it('хук состояния читает только локальный банк и не ходит в сеть', () => {
    const hook = read('components/learning-v2/workshop/use_phrase_workshop_entries.ts').replace(/^\s*\/\/.*$/gm, '');
    expect(hook).not.toMatch(/firestore|httpsCallable|getFunctions|fetch\(/i);
    expect(hook).toContain('if (!enabled || passed.length === 0) return undefined;');
  });
});
