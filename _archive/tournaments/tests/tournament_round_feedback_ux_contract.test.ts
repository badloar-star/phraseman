import { readFileSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..');
const round = readFileSync(path.join(root, 'app/tournament_round.tsx'), 'utf8');
const countdown = readFileSync(
  path.join(root, 'components/ui/V2Countdown.tsx'),
  'utf8',
);
const client = readFileSync(path.join(root, 'app/tournament_client.ts'), 'utf8');
const core = readFileSync(path.join(root, 'functions/src/tournament_core.ts'), 'utf8');
const fingerprint = readFileSync(path.join(root, 'app/tournament_answer_fingerprint.ts'), 'utf8');

function section(source: string, start: string, end: string): string {
  const normalized = source.replace(/\r\n/gu, '\n');
  const from = normalized.indexOf(start);
  const to = normalized.indexOf(end, from + start.length);
  expect(from).toBeGreaterThanOrEqual(0);
  expect(to).toBeGreaterThan(from);
  return normalized.slice(from, to);
}

describe('tournament question feedback UX', () => {
  test('phrase building submits the answer length, never the whole bank including traps', () => {
    expect(round).toContain('requiredTokenCount');
    expect(round).toContain('usedPositions.length !== requiredTokenCount');
    expect(round).not.toContain('usedPositions.length !== wordBank.length');
  });

  test('phrase building has one Ready action and fast reduced-motion-aware word transitions', () => {
    const wordBank = section(round, 'const WordBank', 'const makeStyles');

    // зачем 2026-08-02 (владелец: «внизу есть всегда недоступная кнопка
    // „Готово“, она никогда не нажимается, потому что при нажатии на вариант
    // ответа он сразу засчитывается»): нижняя кнопка удалена ЦЕЛИКОМ.
    //
    // Она была неактивна во всех режимах: disabled требовал решённого ВСЕГО
    // раунда, а каждое задание закрывается само — choice тапом, translate
    // своей кнопкой внутри WordBank, speed_match автоматически по последней
    // паре. К моменту выполнения условия раунд уже заканчивался.
    //
    // Контракт: у translate остаётся РОВНО ОДНА кнопка подтверждения (внутри
    // WordBank), и никакой второй снизу быть не должно.
    expect(round).toContain('const showRoundFinish = false');
    expect(round).not.toContain('{showRoundFinish ? (');
    // Именно ВЫЗОВ и объявление обработчика, а не упоминание имени: в
    // комментарии выше finishEarly назван как раз чтобы объяснить удаление.
    expect(round).not.toContain('onPress={finishEarly}');
    expect(round).not.toContain('const finishEarly =');
    expect(wordBank).toContain('const reduceMotion = useReduceMotion()');
    expect(wordBank).toContain('entering={reduceMotion ? undefined : FadeInDown.duration(140)}');
    expect(wordBank).not.toContain('.springify()');
    expect(wordBank).not.toContain('delay(position * 46)');
    expect(wordBank).toContain('correct === true && styles.assembledChipTextCorrect');
  });

  test('round completion is optimistic after a local answer and never exposes transport state', () => {
    const submit = section(round, 'const submitCurrentTaskAnswer', '  const answer = useCallback');

    // зачем 2026-08-02: allQuestionsResolved и подпись кнопки «Готово» ушли
    // вместе с самой кнопкой (см. тест выше). Суть контракта не изменилась:
    // задание отмечается решённым ДО сети, а транспортных состояний
    // («Отправляем…», счётчиков ожидающих запросов) на экране быть не должно.
    expect(round).toMatch(/secondsLeft !== 0[\s\S]*markTaskResolved\(question\.taskId\)/);
    expect(submit).toMatch(/markTaskResolved\(task\.taskId\);[\s\S]*await submitTaskAnswer/);
    expect(round).not.toContain('pendingSubmissionCount');
    expect(round).not.toContain('Отправляем…');
    expect(round).not.toContain('allQuestionsAnswered');
  });

  test('answer countdown keeps following the absolute deadline during feedback', () => {
    // зачем 2026-08-02: сюда добавлена фаза 'reading'. Раньше тест прибивал
    // строку целиком и тем самым закреплял поломку: без тика на reading экран
    // не перерисовывался, а answerSelectionActive считается в теле рендера —
    // варианты оставались мёртвыми после открытия серверного окна ответа.
    // Контракт здесь про то, что таймер следует абсолютному дедлайну, а не про
    // конкретный набор фаз; сам набор сторожит отдельный тест ниже.
    expect(round).toContain('const taskTimerActive = phase === ');
    expect(round).toContain("phase === 'question'");
    expect(round).toContain("phase === 'feedback'");
    expect(round).toContain('if (!taskTimerActive)');
    expect(round).toContain('const displayedSecondsLeft = secondsLeft ?? deriveDisplayedSecondsLeft(');
    expect(round).toContain('<TimerRing seconds={displayedSecondsLeft} total={answerWindowSeconds} />');
    expect(round).not.toContain('seconds={secondsLeft ?? answerWindowSeconds}');
  });

  // зачем 2026-08-03, вечер (новое указание владельца — ОТМЕНЯЕТ утреннее
  // «цифра видна всегда» из этого же дня, историю конфликта сессий см. в
  // git blame этого блока): кольцо молчит почти весь вопрос, отсчёт 3-2-1
  // появляется только на последних трёх секундах, декоративные точки внутри
  // кольца (пунктирный кружок и центральная точка) убраны. Красное
  // предупреждение дуги остаётся с пяти секунд.
  test('question TimerRing stays silent until the final three seconds', () => {
    const timerRing = section(countdown, 'export const TimerRing', 'const makeStyles');

    expect(timerRing).toContain('const low = seconds <= 5');
    expect(timerRing).toContain('const showDigit = seconds > 0 && seconds <= 3');
    expect(timerRing).toContain('{showDigit && (');
    expect(timerRing).toContain('Math.ceil(seconds)');
    expect(timerRing).toContain('styles.ringText');
    expect(timerRing).toContain('accessibilityRole="timer"');
    expect(timerRing).not.toContain('strokeDasharray="1.5 4"');
    expect(timerRing).not.toContain('r={2.25}');
  });

  test('reading, answer, and feedback windows come only from the absolute server task schedule', () => {
    const client = readFileSync(path.join(root, 'app/tournament_client.ts'), 'utf8');

    expect(round).toContain("type Phase = 'intro' | 'reading' | 'question' | 'feedback'");
    expect(client).toContain('readingEndsAtMs?: number;');
    expect(client).toContain('answerDeadlineAtMs?: number;');
    expect(client).toContain('feedbackStartsAtMs?: number;');
    expect(client).toContain('feedbackEndsAtMs?: number;');
    expect(round).toContain('readingEndsAtMs - tournamentNow()');
    expect(round).toContain('const feedbackAdvanceAtMs = feedbackEndsAtMs;');
    expect(round).toContain("const feedbackVisible = phase === 'feedback' && feedbackCorrect !== null;");
    expect(round).not.toContain('feedbackStartsAtMs === null || tournamentNow() >= feedbackStartsAtMs');
    expect(round).toContain('isTournamentAnswerSelectionWindowOpen(questionTiming, tournamentNow())');
    expect(round).toContain('waitForTournamentAnswerWindow(questionTiming)');
    expect(round).not.toContain('motion.answerFeedbackMs');
  });

  test('feedback advances from its absolute end before a slow answer result can resolve', () => {
    const submit = section(round, 'const submitCurrentTaskAnswer', '  const answer = useCallback');

    expect(submit).toMatch(/setPhase\('feedback'\);[\s\S]*scheduleFeedbackAdvance\(\);[\s\S]*await submitTaskAnswer/);
    expect(submit.match(/await submitTaskAnswer/g)).toHaveLength(2);
    expect(submit).not.toContain("setPhase('question')");
    expect(submit).toContain('activeTaskSubmissionRef.current !== submissionToken');
    expect(submit).toContain('void retry();');
    expect(round).toMatch(/const goNext[\s\S]*activeTaskSubmissionRef\.current = null/);
  });

  // зачем 2026-08-03, вечер: цифры показываются только на последних трёх
  // секундах (контракт TimerRing выше), а само кольцо и его место в шапке
  // остаются стабильными — геометрия не прыгает при появлении цифры.
  test('question timer is a stable ring with digits only at the very end', () => {
    expect(round).toContain('const answerWindowSeconds =');
    expect(round).toContain('<TimerRing seconds={displayedSecondsLeft} total={answerWindowSeconds} />');
    expect(countdown).toContain('const showDigit = seconds > 0 && seconds <= 3');
  });

  test('choice and phrase verdicts paint from room fingerprints before any network await', () => {
    const submit = section(round, 'const submitCurrentTaskAnswer', '  const answer = useCallback');
    const choice = section(round, 'const answer = useCallback', '  const answerTranslate');
    const translate = section(round, 'const answerTranslate', 'const answerMatch');

    expect(client).toContain('answerFingerprints?: string[];');
    expect(core).toContain('export function answerFingerprint(');
    expect(core).toContain('answerFingerprintsForTask');
    expect(round).toContain("import { answerFingerprint } from './tournament_answer_fingerprint';");
    expect(fingerprint).toContain('export function answerFingerprint(');
    expect(round).toContain('function localAnswerVerdict(');
    expect(choice).toContain('const localCorrect = localAnswerVerdict(');
    // зачем 2026-08-02: было `{ selectedIndex }` — сокращение от локальной
    // переменной, которая подставляла ответ из кэша вместо нажатого варианта
    // (см. тест «a tap always submits the tapped option»). Теперь отправляется
    // ровно нажатый индекс. Суть контракта — вердикт красится ДО сети — та же.
    expect(choice).toContain('submitCurrentTaskAnswer(question, { selectedIndex: optionIndex }, localCorrect)');
    expect(translate).toContain('const localCorrect = localAnswerVerdict(');
    expect(translate).toContain('submitCurrentTaskAnswer(question, { tokens }, localCorrect)');
    expect(submit).toMatch(/setFeedbackCorrect\(optimisticCorrect\);[\s\S]*await submitTaskAnswer/);
  });

  test('mount, resume, and reconnect derive the local phase from absolute task timing', () => {
    const resume = section(
      round,
      '  useEffect(() => {\n    const resumed',
      '  const startQuestions',
    );

    expect(round).toContain('const derivePhaseFromTiming');
    expect(resume).toContain('const scheduledQuestionTiming =');
    expect(resume).toContain('derivePhaseFromTiming(scheduledQuestionTiming, tournamentNow())');
    expect(round).not.toContain("if (phase !== 'intro') setPhase('question')");
  });

  test('resume and reconnect preserve the in-flight submission guard', () => {
    const resume = section(
      round,
      '  useEffect(() => {\n    const resumed',
      '  const startQuestions',
    );

    expect(resume).toContain('const scheduledTaskHandled = scheduledTaskId !== null');
    expect(resume).toContain('pendingTaskSubmissionsRef.current.get(scheduledTaskId) ?? null');
    expect(resume).toContain('resolvedTaskIds.has(scheduledTaskId)');
    expect(resume).toContain('const scheduledSubmissionToken = scheduledTaskId === null');
    expect(resume).toMatch(/activeTaskSubmissionRef\.current !== scheduledSubmissionToken[\s\S]*activeTaskSubmissionRef\.current = null/);
    expect(resume).toContain('activeQuestionKeyRef.current = scheduledQuestionKey;');
    expect(resume).not.toContain('pendingTaskSubmissionsRef.current.clear()');
    expect(resume).toMatch(/setPhase\(scheduledTaskHandled[\s\S]*derivePhaseFromTiming/);
  });

  test('async answer completions stop at unmount and network errors never sound wrong', () => {
    const submit = section(round, 'const submitCurrentTaskAnswer', '  const answer = useCallback');
    const speedMatch = section(round, 'const answerMatch', 'const matchComplete');
    const strictBoard = section(round, 'const StrictMatchBoard', 'const WordBank');
    const speedMatchCatch = section(speedMatch, '    } catch {', '    } finally {');

    expect(round).toContain('const screenMountedRef = useRef(true);');
    expect(round).toContain('screenMountedRef.current = false;');
    expect(submit).toContain('if (!screenMountedRef.current');
    expect(speedMatch).toContain('if (!screenMountedRef.current || activeQuestionKeyRef.current !== attemptQuestionKey) return');
    expect(speedMatch).toContain('const attemptQuestionKey = questionKey;');
    expect(speedMatch).toContain('activeQuestionKeyRef.current !== attemptQuestionKey');
    expect(speedMatch).toContain('const attemptKey = `${question.taskId}:${pairIndex}:${selectedIndex}`;');
    expect(speedMatch).toContain('pendingMatchPairsRef.current.has(attemptKey)');
    expect(speedMatchCatch).not.toContain('fk.wrong()');
    expect(strictBoard).toContain('const mountedRef = useRef(true);');
    expect(strictBoard).toContain('if (!mountedRef.current) return;');
  });

  test('active forfeit requires an explicit loss-and-no-refund confirmation before the callable', () => {
    const client = readFileSync(path.join(root, 'app/tournament_client.ts'), 'utf8');

    expect(client).toContain("'tournamentForfeit'");
    expect(client).toContain('{ roomId, confirmForfeit: true }');
    expect(round).toContain('forfeitTournament(roomId)');
    expect(round).toContain('Вы покинете текущий турнир');
    expect(round).toContain('Взнос не возвращается');
    expect(round).toContain('Подтвердить выход');
  });

  test('choice feedback paints the local verdict immediately and reconciles server details silently', () => {
    const optionRow = section(round, 'const OptionRow', 'const MatchBoard');

    expect(client).toContain('earnedStars: number;');
    expect(client).toContain("zeroScoreReason: null | 'incorrect_answer' | 'speed_match_penalty';");
    expect(client).toContain('correctIndex?: number;');
    // зачем: вердикт локализован через triLang (i18n-аудит) — RU остаётся
    // источником правды для формулировки «Почти!» (правило владельца), но
    // выбор ветки теперь идёт через словарь, а не голый тернарник.
    expect(round).toMatch(/feedbackCorrect === true\s*\n?\s*\?\s*triLang\(lang,\s*\{\s*ru:\s*'Правильно!'/);
    expect(round).toContain("'Почти!'");
    // зачем 2026-08-08 (владелец: «очки звёзды разделяются на 2
    // индикатора»): награда по-прежнему считается мгновенно, но идёт прямо
    // в единый счётчик шапки. Отдельное `+N звёзд` в карточке вердикта
    // запрещено: оно визуально создавало второй счёт.
    expect(round).toContain('starsForDifficulty(task.difficulty)');
    expect(round).toContain('addPendingStars(optimisticStars)');
    expect(round).not.toContain('setFeedbackEarnedStars');
    expect(round).toContain('setFeedbackCorrectIndex(typeof result.correctIndex');
    // зачем 2026-08-02: переменная переименована в optionIndex вместе с фиксом
    // подмены ответа из кэша. Контракт прежний: плитка красится СРАЗУ, до сети.
    expect(round).toMatch(/setPicked\(optionIndex\);[\s\S]*void submitCurrentTaskAnswer/);
    expect(optionRow).toContain('selected={isPicked}');
    expect(optionRow).toContain('displayedCorrect');
    expect(optionRow).toContain('authoritativeCorrectIndex');
    expect(optionRow).toContain("displayedCorrect ? 'ok' : 'bad'");
    expect(optionRow).toContain('displayedCorrect === true');
    expect(optionRow).toContain('styles.optionLetterCorrect');
  });

  test('FeedbackKit keeps tournament sound and haptic settings independent', () => {
    expect(round).toContain("import { fk } from './feedback/feedback_kit'");
    // зачем 2026-08-04: звук турнира глушился общим лимитом 2/сек — фикс
    // передаёт scoped-опции (TOURNAMENT_SOUND_OPTIONS) в каждый вызов fk,
    // регекс должен допускать аргумент, а не требовать пустые скобки.
    expect(round).toMatch(/if \(result\.correct\) fk\.correct\([^)]*\);\s*else fk\.wrong\([^)]*\);/);
    expect(round).not.toContain("from 'expo-haptics'");
  });

  test('answer text is capped, while the primary tournament prompt is allowed to wrap fully', () => {
    expect(round).toMatch(/function TournamentTwoLineText[\s\S]*numberOfLines=\{2\}/);
    for (const style of [
      'optionText',
      'matchPromptText',
      'bankChipText',
    ]) {
      expect(round).toMatch(new RegExp(`<TournamentTwoLineText[^>]*style=\\{(?:styles\\.)?${style}`));
    }
    expect(round).toContain('styles.strictMatchText,');
    expect(round).toContain('styles.assembledChipText,');
    expect(round).toContain('style={styles.questionPhrase}');
    expect(round).not.toMatch(/<TournamentTwoLineText[^>]*style=\{styles\.questionPhrase/);
    expect(round.match(/numberOfLines=\{2\}/g)).toHaveLength(1);
    expect(round).not.toContain('adjustsFontSizeToFit');
  });

  test('a tap always submits the tapped option, never a cached one', () => {
    // зачем 2026-08-02 (владелец: «в турнире ни одна кнопка не нажимается», и
    // при этом ВЫБРАННЫЙ ПРАВИЛЬНЫЙ вариант давал 0 звёзд): обработчик тапа
    // подменял выбор игрока значением из taskAnswersRef, если там уже что-то
    // лежало по этому taskId. Кэш не очищался ни между заданиями, ни между
    // раундами, поэтому со второго вопроса экран выглядел мёртвым: тап
    // проходил, но на сервер уходил индекс от прошлого вопроса.
    const handler = section(round, 'const answer = useCallback((optionIndex: number)', 'const answerTranslate');

    // Отправляется ровно нажатый индекс.
    expect(handler).toContain('setPicked(optionIndex)');
    expect(handler).toContain('{ selectedIndex: optionIndex }');
    expect(handler).toContain('localAnswerVerdict(roomId, question, optionIndex)');
    // И никакого ЧТЕНИЯ кэша ответов в обработчике тапа. Проверяем именно
    // обращение к карте, а не упоминание её имени: в комментарии выше она
    // названа как раз для объяснения, почему так делать нельзя.
    expect(handler).not.toContain('taskAnswersRef.current.get');
  });

  test('per-round caches are cleared so a new round cannot inherit stale answers', () => {
    // Кэш отправленных тел запросов нужен только для ретрая в пределах одного
    // задания. Ключ идемпотентности считается ещё и от roundNo, поэтому на
    // новом раунде прежние записи — мусор. Сторожим очистку по roundKey.
    const resetEffect = section(round, 'const roundKey = `${roomId', 'const scheduledIndex');
    expect(resetEffect).toContain('taskAnswersRef.current.clear()');
    expect(resetEffect).toContain('taskIdempotencyKeysRef.current.clear()');
    expect(resetEffect).toContain('pendingTaskSubmissionsRef.current.clear()');
  });

  test('a stale zero on the task timer can never kill the next question', () => {
    // зачем 2026-08-02 (КОРЕНЬ «отвечаю только на первый вопрос, остальные
    // заблокированы» — подтверждён независимым аудитом с посекундной
    // симуляцией): secondsLeft честно дотикивал до 0 к концу окна предыдущего
    // задания и ПЕРЕЖИВАЛ переход. Первый рендер нового вопроса имел
    // phase='question' + secondsLeft=0 (протухший) + question=новый — ровно
    // условие таймаут-эффекта. Тот мгновенно помечал вопрос пропущенным и
    // уводил в 'feedback' с заблокированным вводом. Прогресс «ехал сам», а
    // первый вопрос раунда жил лишь потому, что после интро secondsLeft=null.
    // Контракт держит ОБА слоя защиты.

    // Слой 1: goNext сбрасывает таймер В ОДНОМ БАТЧЕ со сменой вопроса —
    // сброс из эффекта не помог бы, эффекты коммита видят старый снимок state.
    const advance = section(round, 'const goNext = useCallback', 'If the server exposes an upcoming task');
    expect(advance).toContain('setSecondsLeft(null)');

    // Слой 2: пропуск по таймауту сверяется с ПЕРВОИСТОЧНИКОМ — абсолютным
    // серверным дедлайном видимого задания, а не только с производным нулём.
    const timeout = section(round, '// Время вышло — пропуск', 'Сервер перевёл комнату дальше');
    expect(timeout).toContain("secondsLeft !== 0");
    expect(timeout).toMatch(/tournamentNow\(\) < answerEndsAtMs\) return/);
    expect(timeout).toContain('markTaskResolved(question.taskId)');
  });

  test('the reading phase keeps the per-second tick so the answer window can open', () => {
    // зачем 2026-08-02 (владелец: «первый вопрос ответил, дальше кнопки не
    // реагируют вообще»): это был блокер геймплея. answerSelectionActive
    // вычисляется в теле рендера через tournamentNow(), поэтому «окно ответа
    // открылось» замечается ТОЛЬКО на перерисовке. Фаза reading была исключена
    // из taskTimerActive — секундного тика не было, экран не перерисовывался, и
    // варианты оставались мёртвыми уже после фактического открытия окна.
    // Разбудить экран мог только снапшот комнаты, то есть кнопки оживали
    // случайно. Контракт держит связку: reading обязана тикать.
    expect(round).toContain(
      "const taskTimerActive = phase === 'reading' || phase === 'question' || phase === 'feedback'",
    );
    // Ровно этот флаг и запирает ввод — если его перестанут считать от текущего
    // времени, тик снова окажется бесполезен.
    expect(round).toContain('isTournamentAnswerSelectionWindowOpen(questionTiming, tournamentNow())');
  });
});
