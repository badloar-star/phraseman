// ════════════════════════════════════════════════════════════════════════════
// paywallScreenCopy.ts — общие строки экранов A/B/C (8 языков).
// CTA честный: «бесплатно» — только при реальной intro-фазе из стора; цена
// всегда повторяется текстом под кнопкой (App Store 3.1.2 + доверие).
// ════════════════════════════════════════════════════════════════════════════
import { triLang, type Lang } from '../../constants/i18n';
import type { PaywallPlan } from '../../app/paywall_purchase';

export function periodLabelFor(lang: Lang, plan: PaywallPlan): string {
  return plan === 'yearly'
    ? triLang(lang, { ru: '/год', uk: '/рік', es: '/año', 'pt-BR': '/ano', vi: '/năm', id: '/tahun', tr: '/yıl', pl: '/rok' })
    : triLang(lang, { ru: '/мес', uk: '/міс', es: '/mes', 'pt-BR': '/mês', vi: '/tháng', id: '/bulan', tr: '/ay', pl: '/mies.' });
}

export function ctaLabelFor(lang: Lang, trialDays: number | null): string {
  if (trialDays) {
    return triLang(lang, {
      ru: `Попробовать ${trialDays} дн. бесплатно`,
      uk: `Спробувати ${trialDays} дн. безкоштовно`,
      es: `Probar ${trialDays} días gratis`,
      'pt-BR': `Testar ${trialDays} dias grátis`,
      vi: `Dùng thử ${trialDays} ngày miễn phí`,
      id: `Coba ${trialDays} hari gratis`,
      tr: `${trialDays} gün ücretsiz dene`,
      pl: `Wypróbuj ${trialDays} dni za darmo`,
    });
  }
  return triLang(lang, {
    ru: 'Открыть полный доступ',
    uk: 'Відкрити повний доступ',
    es: 'Desbloquear acceso completo',
    'pt-BR': 'Abrir acesso completo',
    vi: 'Mở toàn quyền truy cập',
    id: 'Buka akses penuh',
    tr: 'Tam erişimi aç',
    pl: 'Odblokuj pełny dostęp',
  });
}

export function ctaSubLineFor(
  lang: Lang,
  args: { price: string; period: string; hasTrial: boolean },
): string {
  const cancel = triLang(lang, {
    ru: 'отмена в любой момент',
    uk: 'скасування будь-коли',
    es: 'cancela cuando quieras',
    'pt-BR': 'cancele quando quiser',
    vi: 'hủy bất cứ lúc nào',
    id: 'batalkan kapan saja',
    tr: 'istediğin an iptal',
    pl: 'anuluj w dowolnym momencie',
  });
  if (!args.price) {
    return triLang(lang, {
      ru: 'Точная сумма появится перед покупкой.',
      uk: 'Точна сума з’явиться перед покупкою.',
      es: 'El precio exacto aparecerá antes de comprar.',
      'pt-BR': 'O preço exato aparecerá antes da compra.',
      vi: 'Giá chính xác sẽ hiện trước khi mua.',
      id: 'Harga pasti muncul sebelum pembelian.',
      tr: 'Kesin tutar satın almadan önce görünür.',
      pl: 'Dokładna kwota pojawi się przed zakupem.',
    });
  }
  const priceWithPeriod = `${args.price}${args.period}`;
  if (args.hasTrial) {
    const then = triLang(lang, {
      ru: 'затем', uk: 'потім', es: 'luego', 'pt-BR': 'depois', vi: 'sau đó', id: 'lalu', tr: 'sonra', pl: 'potem',
    });
    return `${then} ${priceWithPeriod} · ${cancel}`;
  }
  return `${priceWithPeriod} · ${cancel}`;
}

export function stickyStringsFor(
  lang: Lang,
  args: { trialDays: number | null; price: string; period: string },
): { title: string; sub: string; button: string } {
  const title = args.trialDays
    ? triLang(lang, {
        ru: `${args.trialDays} дн. бесплатно`,
        uk: `${args.trialDays} дн. безкоштовно`,
        es: `${args.trialDays} días gratis`,
        'pt-BR': `${args.trialDays} dias grátis`,
        vi: `${args.trialDays} ngày miễn phí`,
        id: `${args.trialDays} hari gratis`,
        tr: `${args.trialDays} gün ücretsiz`,
        pl: `${args.trialDays} dni za darmo`,
      })
    : triLang(lang, { ru: 'Premium', uk: 'Premium', es: 'Premium' });
  const sub = args.price ? ctaSubLineFor(lang, { price: args.price, period: args.period, hasTrial: !!args.trialDays }) : '';
  const button = triLang(lang, {
    ru: 'Начать', uk: 'Почати', es: 'Empezar', 'pt-BR': 'Começar', vi: 'Bắt đầu', id: 'Mulai', tr: 'Başla', pl: 'Zacznij',
  });
  return { title, sub, button };
}

export function doubtersDividerLabel(lang: Lang): string {
  return triLang(lang, {
    ru: 'для сомневающихся',
    uk: 'для тих, хто вагається',
    es: 'para los que dudan',
    'pt-BR': 'para quem hesita',
    vi: 'cho người còn phân vân',
    id: 'untuk yang masih ragu',
    tr: 'kararsızlar için',
    pl: 'dla niezdecydowanych',
  });
}
