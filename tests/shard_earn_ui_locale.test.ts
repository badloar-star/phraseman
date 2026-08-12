import { labelForShardModalReason } from '../app/shard_earn_ui';
import type { Lang } from '../constants/i18n';

describe('shard reward modal localization', () => {
  const expected: Record<Lang, string> = {
    ru: 'Начисление жемчужин',
    uk: 'Нарахування перлин',
    es: 'Perlas acreditados',
    'pt-BR': 'Pérolas de conhecimento creditados',
    vi: 'Đã cộng xu tri thức',
    id: 'Koin pengetahuan dikreditkan',
    tr: 'Bilgi jetonları eklendi',
    pl: 'Monety wiedzy przyznane',
  };

  it.each(Object.entries(expected) as Array<[Lang, string]>)('uses the %s reward label', (lang, label) => {
    expect(labelForShardModalReason(undefined, lang)).toBe(label);
  });
});
