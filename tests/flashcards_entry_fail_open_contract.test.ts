import fs from 'fs';
import path from 'path';

/**
 * зачем (приказ владельца 2026-09-14: «НЕ ЧИНИ, А УБЕРИ», «убрать все проверки
 * из раздела карточки», «всё должно открываться мгновенно»): четыре круга
 * починки локальной базы — а вход в тренировку всё равно вставал на слое
 * отложенного гранта (`pending_grant_unavailable`) при живом мосте. Слой
 * гранта/квоты/энергии — фоновый учёт; его отказ не имеет права стоить
 * человеку тренировки. Этот сторож держит правило во всех четырёх режимах.
 */
const root = path.join(__dirname, '..');
const read = (...segments: string[]) => fs.readFileSync(path.join(root, ...segments), 'utf8');

const SESSIONS: Array<[string, string[]]> = [
  ['блиц', ['app', 'flashcards_blitz_session.tsx']],
  ['«Вспомни и напиши»', ['app', 'flashcards_recall_session.tsx']],
  ['свайп', ['app', 'flashcards_swipe.tsx']],
  ['устный', ['app', 'flashcards_speaking_session.tsx']],
];

describe('вход в тренировку карточек: отказ гранта не закрывает дверь', () => {
  it.each(SESSIONS)('%s: при pending_grant_* раунд стартует локально', (_name, segments) => {
    const source = read(...segments);
    // Ветка fail-open существует и срабатывает именно на ошибках гранта.
    expect(source).toContain('entry:fail-open');
    expect(source).toMatch(/\/\^pending_grant\/\.test\(message\)/);
    // Причина отказа гранта попадает в ошибку — иначе аудит по логу слеп.
    expect(source).toContain("throw new Error(`pending_grant_${prepared.status}:${'reason' in prepared ? String(prepared.reason) : 'n/a'}`);");
  });

  it('локальный старт объявлен ДО защищённого блока, иначе catch его не увидит', () => {
    expect(read('app', 'flashcards_recall_session.tsx')).toMatch(/let recallLocalStart[\s\S]{0,300}void \(async \(\) => \{/);
    expect(read('app', 'flashcards_swipe.tsx')).toMatch(/let swipeLocalStart[\s\S]{0,200}try \{/);
    expect(read('app', 'flashcards_speaking_session.tsx')).toMatch(/let speakingLocalStart[\s\S]{0,300}void \(async \(\) => \{/);
  });

  it('fail-open уважает размонтирование и явный выход, чтобы не оживить закрытый экран', () => {
    expect(read('app', 'flashcards_recall_session.tsx')).toMatch(/recallLocalStart && recallMountedRef\.current && !recallExplicitlyAbandonedRef\.current/);
    expect(read('app', 'flashcards_swipe.tsx')).toMatch(/swipeLocalStart && swipeMountedRef\.current && !swipeExplicitlyAbandonedRef\.current/);
    expect(read('app', 'flashcards_speaking_session.tsx')).toMatch(/speakingLocalStart && speakingMountedRef\.current && !speakingExplicitlyAbandonedRef\.current/);
    expect(read('app', 'flashcards_blitz_session.tsx')).toMatch(/cancelled \|\| !blitzMountedRef\.current \|\| blitzExplicitlyAbandonedRef\.current\) return;[\s\S]{0,900}entry:fail-open/);
  });
});

describe('выбор наборов: старт не ждёт чтения квоты', () => {
  const setup = read('app', 'flashcards_training_setup.tsx');

  it('кнопка старта блокируется только доказанным exhausted', () => {
    expect(setup).toContain("quotaPreview.status !== 'exhausted' && loadState === 'ready'");
    expect(setup).toContain("const quotaAllowsStart = quotaPreview.status !== 'exhausted';");
    // «Ждём чтение квоты» больше не условие старта.
    expect(setup).not.toContain("quotaPreview.status === 'allowed' && loadState === 'ready'");
  });
});
