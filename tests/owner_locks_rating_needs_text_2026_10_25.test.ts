// ЗАМОК ВЛАДЕЛЬЦА 25.10: «оценку без текста отправить нельзя» — для ВСЕХ оценок, включая 5★; минимум — хотя бы одно слово из 3+ букв (ответы владельца кнопками, через координатора).
// Реестр: docs/work/OWNER_LOCKS.md. Ослабить можно только по новому слову владельца.
// Сторож держит точки отправки: (1) общая карточка спрашивает ровно feedbackTextAllowsSend и в кнопке, и в самой отправке; (2) правило — \p{L}{3,} по обрезанному тексту;
// (3) отправить оценку мимо карточки нельзя — enqueue/submit зовёт только она; (4) все экраны завершения (Уроки, Learning V2, Словарь, Диалоги) показывают именно её.
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.join(__dirname, '..');
const read = (rel: string): string => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n');

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
    if (entry.name === 'node_modules') continue;
    const rel = `${dir}/${entry.name}`;
    if (entry.isDirectory()) walk(rel, out);
    else if (/\.(ts|tsx)$/.test(entry.name)) out.push(rel);
  }
  return out;
}

describe('ЗАМОК ВЛАДЕЛЬЦА 25.10: оценку без текста отправить нельзя', () => {
  const card = read('components/FeedbackRatingCard.tsx');

  it('правило: слово из 3+ букв любого алфавита по обрезанному тексту', () => {
    const rule = read('app/feedback_text_rule.ts');
    expect(rule).toContain('/\\p{L}{3,}/u');
    expect(rule).toContain('text.trim()');
    expect(rule).toContain('ЗАМОК ВЛАДЕЛЬЦА 25.10');
  });

  it('карточка: кнопка и сама отправка спрашивают одно правило; звёзды без текста не отправляются', () => {
    expect(card).toContain('const sendBlocked = !feedbackTextAllowsSend(text);');
    expect(card).toContain('const blockReason = feedbackBlockReason(message);');
    expect(card).toContain('if (blockReason) {');
    expect(card).toContain('const sendDisabled = sendBlocked;');
    expect(card).toContain('disabled={sendBlocked}');
    // старое условие «хватит текста ИЛИ звёзд» не возвращается
    expect(card).not.toMatch(/rating === 0\)? *(&&|\|\|)/);
    expect(card).not.toMatch(/text\.trim\(\) === ''/);
    expect(card).not.toMatch(/message === '' && rating === 0/);
  });

  it('журнал [RATING-SUBMIT]: попытка (screen, stars, len) и блок (reason), без текста и идентификаторов', () => {
    // и в консоль (logcat ReactNativeJS, как [PEAK-COINS]), и в журнал приложения — Сверка 25.10 не нашла строки, пока писал только DebugLogger
    expect(card).toContain("console.log('[RATING-SUBMIT]', event, json);");
    expect(card).toContain("DebugLogger.info('[RATING-SUBMIT]'");
    expect(card).toContain("logRating('attempt', { screen: kind, stars: rating, len: message.length });");
    expect(card).toContain('reason: blockReason');
    expect(card).not.toMatch(/logRating\([^)]*(message[,} ]|entityId|userName)/);
  });

  // Сверка 25.10: неактивная «Отправить» отличалась от активной не больше, чем rgb 119,119,112 от самой себя — теперь непрозрачность 0,4 против 1 и переход 150 мс во всех трёх видах карточки
  it('кнопка «Отправить»: неактивная приглушена, активная полноценная, переход 150 мс — во всех трёх видах', () => {
    expect(card).toContain('const SEND_FADE_MS = 150;');
    expect(card).toContain('const SEND_DISABLED_OPACITY = 0.4;');
    expect(card.match(/<SendFade/g)?.length).toBe(2); // liquid-glass-rate и default/compact-stars
    expect(card).toContain('blocked={sendDisabled}');
    expect(card).toContain('blocked={sendBlocked}');
    expect(card).not.toContain('glassFill(t.bgCard, 0.6)'); // серая «неактивная» заливка, совпадавшая с активной, не возвращается
    expect(card).not.toContain('glass.buttonFillDisabled');
  });

  it('оценка уходит только через общую карточку: enqueue/submit больше никто не зовёт', () => {
    const allowed = new Set(['components/FeedbackRatingCard.tsx', 'app/feedback_outbox.ts', 'app/feedback_client.ts']);
    const offenders = ['app', 'components', 'modules', 'hooks']
      .flatMap((d) => walk(d))
      .filter((rel) => !allowed.has(rel))
      .filter((rel) => /\b(enqueueFeedbackEntry|submitFeedbackEntry)\(/.test(read(rel)));
    expect(offenders).toEqual([]);
  });

  it('все экраны завершения показывают общую карточку: Уроки, Learning V2, Словарь, Диалоги ×2', () => {
    for (const rel of [
      'app/lesson_complete.tsx',
      'components/learning-v2/horizons/HorizonSessionResult.tsx',
      'app/flashcards/SessionResultScreen.tsx',
      'app/dialogue_v2_completion.tsx',
      'app/ai_dialog_session.tsx',
    ]) {
      expect(read(rel)).toContain('<FeedbackRatingCard');
    }
  });
});
