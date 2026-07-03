// ════════════════════════════════════════════════════════════════════════════
// paywallScreenCopy.ts — общие строки экранов A/B/C (8 языков).
// CTA честный: «бесплатно» — только при реальной intro-фазе из стора; цена
// всегда повторяется текстом под кнопкой (App Store 3.1.2 + доверие).
// ════════════════════════════════════════════════════════════════════════════
import { triLang, type Lang } from '../../constants/i18n';
import type { PaywallPlan } from '../../app/paywall_purchase';

export function periodLabelFor(lang: Lang, plan: PaywallPlan): string {
  // lifetime — разовый платёж, без периода.
  if (plan === 'lifetime') return '';
  return plan === 'yearly'
    ? triLang(lang, { ru: '/год', uk: '/рік', es: '/año', 'pt-BR': '/ano', vi: '/năm', id: '/tahun', tr: '/yıl', pl: '/rok' })
    : triLang(lang, { ru: '/мес', uk: '/міс', es: '/mes', 'pt-BR': '/mês', vi: '/tháng', id: '/bulan', tr: '/ay', pl: '/mies.' });
}

export function ctaLabelFor(lang: Lang, trialDays: number | null, isLifetime = false): string {
  if (isLifetime) {
    return triLang(lang, {
      ru: 'Открыть Pro',
      uk: 'Відкрити Pro',
      es: 'Abrir Pro',
      'pt-BR': 'Abrir Pro',
      vi: 'Mở Pro',
      id: 'Buka Pro',
      tr: 'Pro aç',
      pl: 'Otwórz Pro',
    });
  }
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
  args: { price: string; period: string; hasTrial: boolean; isLifetime?: boolean },
): string {
  // lifetime — разовый платёж: «отмена в любой момент» неуместна.
  if (args.isLifetime) {
    if (!args.price) {
      return triLang(lang, {
        ru: 'Точная сумма появится перед оформлением.',
        uk: 'Точна сума з’явиться перед покупкою.',
        es: 'El precio exacto aparecerá antes de comprar.',
        'pt-BR': 'O preço exato aparecerá antes da compra.',
        vi: 'Giá chính xác sẽ hiện trước khi mua.',
        id: 'Harga pasti muncul sebelum pembelian.',
        tr: 'Kesin tutar satın almadan önce görünür.',
        pl: 'Dokładna kwota pojawi się przed zakupem.',
      });
    }
    return triLang(lang, {
      ru: `${args.price} · Разовая покупка`,
      uk: `${args.price} · Разова покупка`,
      es: `${args.price} · compra única`,
      'pt-BR': `${args.price} · compra única`,
      vi: `${args.price} · mua một lần`,
      id: `${args.price} · pembelian sekali`,
      tr: `${args.price} · tek seferlik satın alma`,
      pl: `${args.price} · zakup jednorazowy`,
    });
  }
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
      ru: 'Точная сумма появится перед оформлением.',
      uk: 'Точна сума з’явиться перед оформленням.',
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

function stickyPriceWithPeriodFor(lang: Lang, price: string, period: string): string {
  const normalizedPeriod = period.trim().toLowerCase();
  if (!normalizedPeriod) return price;

  const monthPeriods = new Set(['/мес', '/міс', '/mes', '/mês', '/tháng', '/bulan', '/ay', '/mies.']);
  const yearPeriods = new Set(['/год', '/рік', '/año', '/ano', '/năm', '/tahun', '/yıl', '/rok']);
  if (monthPeriods.has(normalizedPeriod)) {
    return triLang(lang, {
      ru: `${price} в месяц`,
      uk: `${price} на місяць`,
      es: `${price} al mes`,
      'pt-BR': `${price} por mês`,
      vi: `${price} mỗi tháng`,
      id: `${price} per bulan`,
      tr: `${price} aylık`,
      pl: `${price} miesięcznie`,
    });
  }
  if (yearPeriods.has(normalizedPeriod)) {
    return triLang(lang, {
      ru: `${price} в год`,
      uk: `${price} на рік`,
      es: `${price} al año`,
      'pt-BR': `${price} por ano`,
      vi: `${price} mỗi năm`,
      id: `${price} per tahun`,
      tr: `${price} yıllık`,
      pl: `${price} rocznie`,
    });
  }

  return `${price}${period}`;
}

function stickySubLineFor(
  lang: Lang,
  args: { price: string; period: string; trialDays: number | null; isLifetime?: boolean },
): string {
  if (args.isLifetime) {
    return ctaSubLineFor(lang, { price: args.price, period: args.period, hasTrial: false, isLifetime: true });
  }
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
  const priceWithPeriod = stickyPriceWithPeriodFor(lang, args.price, args.period);
  if (args.trialDays) {
    const then = triLang(lang, {
      ru: 'затем', uk: 'потім', es: 'luego', 'pt-BR': 'depois', vi: 'sau đó', id: 'lalu', tr: 'sonra', pl: 'potem',
    });
    return `${then} ${priceWithPeriod} · ${cancel}`;
  }
  return `${priceWithPeriod} · ${cancel}`;
}

export function stickyStringsFor(
  lang: Lang,
  args: { trialDays: number | null; price: string; period: string; isLifetime?: boolean },
): { title: string; sub: string; button: string } {
  const title = args.isLifetime
    ? triLang(lang, { ru: 'Pro', uk: 'Pro', es: 'Pro', 'pt-BR': 'Pro', vi: 'Pro', id: 'Pro', tr: 'Pro', pl: 'Pro' })
    : args.trialDays
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
    : triLang(lang, { ru: 'Plus', uk: 'Plus', es: 'Plus', 'pt-BR': 'Plus', vi: 'Plus', id: 'Plus', tr: 'Plus', pl: 'Plus' });
  const sub = args.price ? stickySubLineFor(lang, { price: args.price, period: args.period, trialDays: args.trialDays, isLifetime: args.isLifetime }) : '';
  // Кнопка sticky-бара повторяет смысл главной CTA, а не безликое «Начать»:
  // при триале — «Попробовать бесплатно», иначе — «Открыть доступ» (lifetime — «Открыть Pro»).
  const button = args.isLifetime
    ? triLang(lang, { ru: 'Открыть Pro', uk: 'Відкрити Pro', es: 'Abrir Pro', 'pt-BR': 'Abrir Pro', vi: 'Mở Pro', id: 'Buka Pro', tr: 'Pro aç', pl: 'Otwórz Pro' })
    : args.trialDays
    ? triLang(lang, {
        ru: 'Попробовать бесплатно', uk: 'Спробувати безкоштовно', es: 'Probar gratis', 'pt-BR': 'Testar grátis', vi: 'Dùng thử miễn phí', id: 'Coba gratis', tr: 'Ücretsiz dene', pl: 'Wypróbuj za darmo',
      })
    : triLang(lang, {
        ru: 'Открыть доступ', uk: 'Відкрити доступ', es: 'Desbloquear acceso', 'pt-BR': 'Abrir acesso', vi: 'Mở quyền truy cập', id: 'Buka akses', tr: 'Erişimi aç', pl: 'Odblokuj dostęp',
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
