// Сторож зеркала (PM-281): SPIRE_PUSH_TIER_NAMES в functions/src/spire_notifications.ts
// обязан совпадать с SPIRE_TIER_NAMES в modules/spire/tier_names.ts (клиент)
// на всех языках, которые есть в ОБОИХ файлах. functions/tsconfig.json
// ограничен include:["src"] — импорт из modules/ невозможен (та же граница,
// что у spire_config_contract.ts/spire_residents.ts), поэтому это ЧИТАЕТ
// исходник клиентского файла текстом и сверяет, а не импортирует напрямую.
// Сработал — правь копию в spire_notifications.ts, а не этот тест.
import * as fs from 'fs';
import * as path from 'path';
import { SPIRE_PUSH_TIER_NAMES } from './spire_notifications';

function readClientTierNames(): Record<string, readonly string[]> {
  const filePath = path.join(__dirname, '..', '..', 'modules', 'spire', 'tier_names.ts');
  const text = fs.readFileSync(filePath, 'utf8');
  const match = text.match(/export const SPIRE_TIER_NAMES[^{]*\{([\s\S]*?)\}\);/);
  if (!match) throw new Error('spire_notifications_tier_names_mirror: не нашёл SPIRE_TIER_NAMES в tier_names.ts');
  const body = match[1];
  const out: Record<string, readonly string[]> = {};
  const rowRe = /(['"]?[\w-]+['"]?):\s*Object\.freeze\(\[([^\]]*)\]\)/g;
  let m: RegExpExecArray | null;
  // eslint-disable-next-line no-cond-assign
  while ((m = rowRe.exec(body)) !== null) {
    const lang = m[1].replace(/['"]/g, '');
    const names = m[2].split(',').map((s) => s.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean);
    out[lang] = names;
  }
  return out;
}

describe('spire_notifications.ts SPIRE_PUSH_TIER_NAMES зеркалит modules/spire/tier_names.ts', () => {
  const client = readClientTierNames();

  it('нашёл клиентские имена (тест не сломан сам по себе)', () => {
    expect(Object.keys(client).length).toBeGreaterThanOrEqual(9);
    expect(client.ru).toHaveLength(12);
  });

  it('каждый общий язык совпадает слово в слово', () => {
    for (const lang of Object.keys(SPIRE_PUSH_TIER_NAMES)) {
      expect(client[lang]).toBeDefined();
      expect(SPIRE_PUSH_TIER_NAMES[lang as keyof typeof SPIRE_PUSH_TIER_NAMES]).toEqual(client[lang]);
    }
  });
});
