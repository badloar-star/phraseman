// Допущения ранговых гейтов (координатор 30.10)
describe('допущения (координатор 30.10)', () => {
  it('«Мои ошибки» на Главной открываются с ранга 1 вместе с Диалогами — в правилах владельца не указано, принято допущением', () => {
    const fs = require('node:fs') as typeof import('node:fs');
    const home = fs.readFileSync(require('node:path').join(__dirname, '..', 'app/(tabs)/home.tsx'), 'utf8');
    expect(home).toContain("homeMistakesButtonState(mistakeActiveCount) === 'ready' && !rankLockedDialogues");
  });
});
