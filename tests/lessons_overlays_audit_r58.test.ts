// зачем (аудит R58 🟡 #17/#20/#24/#25/#28/#29, координатор 15.10): сторож связей — двойной тап, отступ подсказки, Plus на старте комбо, мгновенный «Старт» вступления, запись прогресса слов.
import { readFileSync } from 'fs';
import path from 'path';

const read = (rel: string) => readFileSync(path.join(process.cwd(), rel), 'utf8').split('\r\n').join('\n');

describe('аудит R58 🟡', () => {
  it('#17 «Обучение»: вход в меню урока, комбо, диагностику, экзамен и ранг защищён navOnce', () => {
    const src = read('app/(tabs)/lessons.tsx');
    for (const key of ["lessons:combined_pick", "lessons:diagnostic", 'lessons:level_exam:${lvl}', "lessons:coin_rank"]) expect(src).toContain(key);
    expect((src.match(/lessons:menu:\$\{num\}/g) ?? []).length).toBe(2);
  });
  it('#20 подсказка отказа поднимается на отступ списка, а не на отступ таб-бара', () => {
    expect(read('app/(tabs)/lessons.tsx')).toContain('bottom: listBottomPad,\n                  alignItems: "center",');
  });
  it('#25 меню урока: строки закрыты navOnce', () => {
    const src = read('app/lesson_menu.tsx');
    for (const key of ['lesson_menu:words:', 'lesson_menu:irregular:', 'lesson_menu:prepositions:', 'lesson_menu:theory:', 'lesson_menu:settings_edu', 'lesson_menu:replay:']) expect(src).toContain(key);
  });
  it('#24 комбо: Plus проверяется на старте', () => {
    const src = read('app/combined_lesson_pick.tsx');
    expect(src).toContain("openPremiumPaywall(router, { context: 'combined_lesson' });");
    expect(src).toContain("navOnce('combined_pick:start')");
  });
  it('#28 «Старт» вступления не ждёт запись отметки', () => {
    const src = read('app/lesson1.tsx');
    const body = src.slice(src.indexOf('const handleIntroDone = useCallback'), src.indexOf('const resetNoEnergyModal'));
    expect(body.indexOf('setShowIntroScreens(false);')).toBeLessThan(body.indexOf('AsyncStorage.setItem(introShownKey'));
    expect(body).not.toContain('await AsyncStorage.setItem');
  });
  it('#29 запись прогресса слов и глаголов пишет причину сбоя и не затирает при сбое чтения', () => {
    const words = read('app/lesson_words.tsx');
    expect(words).toContain('progressReadFailedKeys');
    expect(words).toContain('[LESSON-WORDS] progress write FAILED');
    expect(read('app/lesson_irregular_verbs.tsx')).toContain('[IRREGULAR-VERBS] progress write FAILED');
  });
});

describe('#26 меню урока: тихая перепроверка доступа', () => {
  it('на возврате фокуса уже подтверждённый урок не сбрасывается в скелет; запуск закрыт, пока идёт проверка', () => {
    const src = read('app/lesson_menu.tsx');
    expect(src).toContain('const silent = lockConfirmedKeyRef.current === lockKey;');
    expect(src).toContain('const lessonLaunchBlocked = !lockStateLoaded || isLessonLocked || lockRevalidating;');
    expect(src).toContain('lockConfirmedKeyRef.current = lockKey;');
  });
});

describe('#18 «Начать» V2: замер', () => {
  it('тап и готовность подготовки пишут [V2-START] с миллисекундами', () => {
    const src = read('app/(tabs)/lessons.tsx');
    expect(src).toContain('[V2-START] tap');
    expect(src).toContain('tapToReadyMs: Date.now() - v2StartTapAtMs');
  });
});

describe('#26 меню урока: поколение проверки доступа (Ревизор 7d564d137)', () => {
  it('результат и снятие флага — только у последней проверки; stableId в ключе подтверждения', () => {
    const src = read('app/lesson_menu.tsx');
    expect(src).toContain('const generation = ++lockGenerationRef.current;');
    expect(src).toContain('lockGenerationRef.current === generation');
    expect(src).toContain("captureAccountGeneration()?.stableId ?? 'anon'");
    expect(src).toContain('lock:stale_result_dropped');
  });
});

describe('🔴 цикл lesson1 ↔ lesson_menu на запертом уроке (Моменты 15.10)', () => {
  it('запертый урок = один replace на список с тостом; назад по стеку меню не ходит; предохранитель 5 с на id', () => {
    const src = read('app/lesson_menu.tsx');
    const effect = src.slice(src.indexOf('const lockedBackDispatchedRef = useRef(false);'), src.indexOf('// Служебный флаг первого завершения'));
    expect(effect).toContain("router.replace('/(tabs)/lessons' as never);");
    expect(effect).not.toContain('safeRouterBack(');
    expect(effect).toContain('[LESSON-LOCK] menu:bounce_suppressed');
    expect(src).toContain('LESSON_LOCK_BOUNCE_FUSE_MS = 5000');
  });
  it('lesson_menu сам не открывает lesson1 вне обработчиков нажатия, закрытых проверкой запуска', () => {
    const src = read('app/lesson_menu.tsx');
    const pushes = src.split('\n').filter((line) => line.includes("pathname: '/lesson1'"));
    expect(pushes.length).toBeGreaterThan(0);
    const effectBody = src.slice(src.indexOf('const lockedBackDispatchedRef = useRef(false);'), src.indexOf('// Служебный флаг первого завершения'));
    expect(effectBody).not.toContain('/lesson1');
    expect(src).toContain('if (lessonLaunchBlocked) return;');
  });
  it('звено lesson1 → меню пишет [LESSON-LOCK] access_gate', () => {
    expect(read('app/lesson_premium_gate.ts')).toContain('[LESSON-LOCK] access_gate → lesson_menu lessonId=');
  });
});
