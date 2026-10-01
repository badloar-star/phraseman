import { labelForShardModalReason } from '../app/shard_earn_ui';
import type { Lang } from '../constants/i18n';

describe('shard reward modal localization', () => {
  const expected: Record<Lang, string> = {
    ru: 'Начисление монет',
    uk: 'Нарахування монет',
    en: 'Coins credited',
    es: 'Monedas acreditadas',
    'pt-BR': 'Moedas creditadas',
    vi: 'Đã cộng xu',
    id: 'Koin dikreditkan',
    tr: 'Jetonlar eklendi',
    pl: 'Monety przyznane',
  };

  it.each(Object.entries(expected) as Array<[Lang, string]>)('uses the %s reward label', (lang, label) => {
    expect(labelForShardModalReason(undefined, lang)).toBe(label);
  });
});
