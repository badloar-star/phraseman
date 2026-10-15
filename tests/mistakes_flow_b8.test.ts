// зачем (бета-тест Б8, координатор 15.10): из хаба «Мои ошибки» тренировка знает, что пришла из хаба (крестик без истории → хаб, а не «Карточки»),
// и сверяет обещанное шторкой число с собранной сессией в журнале [MISTAKES-FLOW] (старая сессия / демо-снимок dev / совпало).
import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');

describe('Б8 · «Мои ошибки»: шторка → тренировка → крестик', () => {
  const hub = read('app/mistakes_hub.tsx');
  const session = read('app/mistake_practice_session.tsx');
  it('хаб передаёт from=hub и обещанное число, журнал пишет источник числа', () => {
    // + quotaReceipt (Ревизор 15.10): id попытки дня этого тапа — тренировка вернёт её, если не стартует
    expect(hub).toContain("const flowParams = { length: 'all', from: 'hub', expect: String(sheetReady), ...gate.takeQuotaReceiptParam() };");
    expect(hub).toContain("[MISTAKES-FLOW] хаб → тренировка");
  });
  it('крестик, «Назад» и отказ в энергии: запасной путь — всегда хаб ошибок', () => {
    // Сверка 15.10: «/flashcards» без истории выкидывал из раздела («Видео»); тренировка живёт в «Ошибках»
    expect(session).toContain("const backFallback = '/mistakes_hub';");
    expect(session).not.toContain("safeRouterBack(router, '/flashcards' as never)");
  });
  it('системная «Назад»: экран владеет ею — открытая клавиатура только прячется, иначе выход как крестик', () => {
    const nav = read('app/navigation_back.ts');
    expect(nav).toMatch(/SCREEN_OWNED_ANDROID_BACK_PATHS[\s\S]*?'\/mistake_practice_session'/);
    const handler = session.slice(session.indexOf("BackHandler.addEventListener('hardwareBackPress'"), session.indexOf('return () => sub.remove();'));
    expect(handler).toMatch(/if \(keyboardVisible\) \{[\s\S]*?Keyboard\.dismiss\(\);\s*return true;/);
    expect(handler).toContain('leavePracticeRef.current();');
    expect(handler).toContain('[NAV-BACK] mistake_practice_session');
  });
  it('тренировка сверяет шторку с сессией и называет причину расхождения', () => {
    expect(session).toContain("prepared.resumed ? 'resumed' : isDevMistakesDemoOn() ? 'demo' : 'unknown'");
  });
});
