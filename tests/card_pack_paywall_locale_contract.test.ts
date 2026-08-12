import fs from 'node:fs';
import path from 'node:path';

const source = fs.readFileSync(
  path.join(__dirname, '..', 'app', 'flashcards', 'CardPackShardPaywallModal.tsx'),
  'utf8',
);

describe('card pack paywall localization', () => {
  it('has a dedicated release copy branch for every non-RU interface language', () => {
    for (const lang of ['uk', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl']) {
      expect(source).toContain(`if (lang === '${lang}')`);
    }
  });

  it('keeps critical paywall actions in each localized branch', () => {
    const fields = ['cancel:', 'buyShards:', 'insufficientTitle:', 'voucherTitle:', 'reportPack:', 'hidePack:'];
    for (const lang of ['pt-BR', 'vi', 'id', 'tr', 'pl']) {
      const branch = source.split(`if (lang === '${lang}')`)[1]?.split('\n  if (lang ===')[0] ?? '';
      for (const field of fields) expect(branch).toContain(field);
    }
  });
});
