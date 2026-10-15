// R20-хвост (Ревизор 15.10): дедуп восстановления (12ac0abeb) обязан знать владельца. Иначе вход в Plus-аккаунт B
// в пределах 30 мин после восстановления A (или посреди него) пропускал облачную проверку премиума B — B оставался Free.
// Модуль cloud_sync слишком тяжёл для поведенческого прогона восстановления; сторож держит ключевые места по исходнику.
import fs from 'fs';
import path from 'path';

const src = fs.readFileSync(path.join(__dirname, '..', 'app', 'cloud_sync.ts'), 'utf8');

describe('дедуп восстановления привязан к владельцу', () => {
  it('идущее и последнее восстановление хранят stableId и отдаются только текущему владельцу', () => {
    expect(src).toMatch(/let cloudRestoreInFlight: \{ owner: string \| null; run: Promise<CloudRestoreAttempt> \} \| null/);
    expect(src).toMatch(/let lastCloudRestoreCompleted: \{ owner: string \| null; atMs: number \} \| null/);
    expect(src).toMatch(/export function peekCloudRestoreInFlight\(\)[\s\S]{0,300}cloudRestoreInFlight\.owner !== owner[\s\S]{0,200}return null;/);
    expect(src).toMatch(/export function lastCloudRestoreCompletedAt\(\)[\s\S]{0,200}lastCloudRestoreCompleted\.owner === currentRestoreOwner\(\) \? lastCloudRestoreCompleted\.atMs : 0/);
    expect(src).toMatch(/const owner = currentRestoreOwner\(\);\s*const run = restoreAndMigrateFromCloudResultMeasured/);
  });
});
