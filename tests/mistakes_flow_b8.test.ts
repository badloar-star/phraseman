// зачем (бета-тест Б8, координатор 15.10): из хаба «Мои ошибки» тренировка знает, что пришла из хаба (крестик без истории → хаб, а не «Карточки»),
// и сверяет обещанное шторкой число с собранной сессией в журнале [MISTAKES-FLOW] (старая сессия / демо-снимок dev / совпало).
import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');

describe('Б8 · «Мои ошибки»: шторка → тренировка → крестик', () => {
  const hub = read('app/mistakes_hub.tsx');
  const session = read('app/mistake_practice_session.tsx');
  it('хаб передаёт from=hub и обещанное число, журнал пишет источник числа', () => {
    expect(hub).toContain("const flowParams = { length: 'all', from: 'hub', expect: String(sheetReady) };");
    expect(hub).toContain("[MISTAKES-FLOW] хаб → тренировка");
  });
  it('крестик и отказ в энергии: из хаба запасной путь — хаб ошибок', () => {
    expect(session).toContain("const backFallback = params.from === 'hub' ? '/mistakes_hub' : '/flashcards';");
    expect(session).not.toContain("safeRouterBack(router, '/flashcards' as never)");
  });
  it('тренировка сверяет шторку с сессией и называет причину расхождения', () => {
    expect(session).toContain("prepared.resumed ? 'resumed' : isDevMistakesDemoOn() ? 'demo' : 'unknown'");
  });
});
