// зачем (аудит «пропала сеть», Авторизация 13.10): сохранение карточки не зависает на плохой сети (проверка Plus внутри замка записи без облака и с потолком),
// а немые catch при разборе карточек, прогресса и черновика «Свайпа» пишут причину в журнал.
import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');
const hook = read('hooks/use-flashcards.ts');
const storage = read('app/flashcards/storage.ts');
const swipe = read('app/flashcards_swipe_session.ts');

describe('Карточки: офлайн-аудит', () => {
  it('сохранение: Plus проверяется без облачного обновления и с потолком 5 с внутри замка записи', () => {
    expect(hook).toContain('const PREMIUM_CHECK_CEILING_MS = 5_000;');
    expect(hook).toContain('getVerifiedPremiumAccessStatus({ allowCloudRefresh: false })');
    expect(hook).toContain('const isPremium = await premiumForSave();');
    expect(hook).not.toContain('await getVerifiedPremiumStatus()');
    expect(hook).toContain('[FLASHCARDS-SAVE] проверка Plus внутри замка записи не ответила');
    expect(hook).toContain('clearTimeout(timer)'); // потолок не оставляет висящий таймер
  });

  it('разбор карточек и прогресса: catch не немой — ключ, длина строки и что будет дальше', () => {
    expect(storage).not.toMatch(/catch\s*\{\s*(setCustomCardsCache|return)/);
    expect(storage).toContain('[FLASHCARDS-STORAGE] карточки: JSON не разобран');
    expect(storage).toContain('[FLASHCARDS-STORAGE] прогресс: JSON не разобран');
    expect(storage).toContain('следующая запись перезапишет ключ');
  });

  it('черновик сессии «Свайп»: сбой разбора пишет причину', () => {
    expect(swipe).toContain('[FLASHCARDS-SESSION] черновик «Свайпа» не разобран');
    expect(swipe).not.toMatch(/\} catch \{\n\s*return null;\n\s*\}\n\}\n\nfunction draftMatchesScope/);
  });
});
