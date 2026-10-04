import fs from 'fs';
import path from 'path';

/**
 * Сторож правила владельца 2026-09-22: «блокера не должно быть».
 *
 * зачем: экран «Нужна безопасная проверка» запирал людей, которые ничего не
 * удаляли, и выхода из него не было ни одного — `onRequestClose` пуст, а кнопка
 * «Повторить безопасно» гоняла проверку, которая при расхождении stableId не
 * могла дать другой ответ никогда. Тот же класс бага уже чинили отдельно для
 * замка удаления и вечного сплеша; здесь он закрывается насовсем.
 *
 * Сторож ломает сборку при попытке вернуть непроходимый экран восстановления.
 * Сработал — возвращать правило, а не удалять проверку.
 */
const read = (relativePath: string): string =>
  fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');

describe('ни один экран восстановления не запирает вход', () => {
  it('стена смены аккаунта удалена и нигде не монтируется', () => {
    expect(fs.existsSync(path.join(process.cwd(), 'components/AccountSwitchRecoveryScreen.tsx')))
      .toBe(false);
    expect(read('app/_layout.tsx')).not.toContain('AccountSwitchRecoveryScreen');
  });

  it('карантин смены аккаунта никогда не делает снимок видимым', () => {
    const source = read('app/account_switch_quarantine.ts');
    // Единственная точка публикации обязана гасить visible принудительно.
    expect(source).toContain('snapshot = { ...next, visible: false }');
  });

  it('вердикт загрузочного гейта не обрывает старт', () => {
    const layout = read('app/_layout.tsx');
    const gateBranch = layout.slice(
      layout.indexOf("if (recoveryGate.result !== 'proceed') {"),
    );
    const branchBody = gateBranch.slice(0, gateBranch.indexOf('\n      } else {'));
    // Разрешён ровно один ранний выход — плановый повтор при blocked_transient.
    // Любой другой `return` снова оставил бы человека с пустым каркасом.
    // зачем (04.10): считаем только код — комментарии ветки сами рассказывают про `return`
    // («раньше ОБРЫВАЛ старт (`return`)», «без return»), и счётчик видел 3 вместо 1.
    const code = branchBody.split('\n').map((line) => line.replace(/\/\/.*$/, '')).join('\n');
    const returns = code.match(/\breturn\b/g) ?? [];
    expect(returns).toHaveLength(1);
    expect(branchBody).toContain('scheduleAuthRecoveryBootRetry()');
  });

  it('экран состояния телефона имеет потолок показа', () => {
    const source = read('app/phone_state_recovery.ts');
    expect(source).toContain('VISIBLE_ATTEMPTS_CEILING');
    expect(source).toContain('visible: failedAttempts < VISIBLE_ATTEMPTS_CEILING');
  });

  it('повторы записи продолжаются после скрытия экрана', () => {
    // зачем: снятие стены не должно превратиться в тихо умершее восстановление.
    const screen = read('components/PhoneStateRecoveryScreen.tsx');
    expect(screen).not.toContain('if (!snapshot.visible) return undefined;');
  });

  it('экран записи закрывается кнопкой «назад»', () => {
    const screen = read('components/PhoneStateRecoveryScreen.tsx');
    expect(screen).toContain('onRequestClose={() => setDismissed(true)}');
    expect(screen).toContain('visible={snapshot.visible && !dismissed}');
  });

  it('карантин и восстановление записи не глушат ошибки молча', () => {
    // Запрет немого catch — правило владельца «сперва логи».
    expect(read('app/account_switch_quarantine.ts')).not.toContain(
      '{ /* a UI listener cannot interrupt the quarantine */ }',
    );
    const phoneState = read('app/phone_state_recovery.ts');
    expect(phoneState).toContain('[PHONE-STATE]');
  });
});
