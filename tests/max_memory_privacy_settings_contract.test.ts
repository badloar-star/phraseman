import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '..');
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');

describe('text tutor memory privacy settings contract', () => {
  // зачем: D78/D81 — текстовый репетитор и его экран памяти удалены; проверки
  // экрана настроек и экспорта tutorText*Memory сняты вместе с ними. Личные
  // коллекции MAX по-прежнему обязаны стираться при удалении аккаунта.
  it('keeps both personal MAX collections in account deletion', () => {
    const deletion = read('functions/src/account_delete.ts');
    for (const collection of ['voice_tutor_memory', 'voice_call_reviews']) {
      expect(deletion).toContain(`{ collection: '${collection}', field: 'stableUid', values: 'stable' }`);
      expect(deletion).toContain(`{ collection: '${collection}', field: 'authUid', values: 'auth' }`);
    }
  });
});
