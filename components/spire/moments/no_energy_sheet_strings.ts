// ════════════════════════════════════════════════════════════════════════════
// no_energy_sheet_strings.ts — тексты момента m22 «Энергия закончилась → Plus», 9 языков.
//
// зачем (координатор 15.10, m22 к сборке 16.10; эталон engagement-moments-v3-all.html m22 / plusSheet): шторка над доком Пика вместо
// мгновенного перехода в пейвол. Переводы кроме RU — предложение, носителем не проверены (сессия «Специалист по переводам» заменит).
// ════════════════════════════════════════════════════════════════════════════
import type { Lang } from '../../../constants/i18n';

type Nine = readonly [string, string, string, string, string, string, string, string, string];
const LANG_INDEX: Readonly<Record<string, number>> = { ru: 0, uk: 1, en: 2, es: 3, 'pt-BR': 4, vi: 5, id: 6, tr: 7, pl: 8 };

const S = {
  ctx: ['Энергия', 'Енергія', 'Energy', 'Energía', 'Energia', 'Năng lượng', 'Energi', 'Enerji', 'Energia'],
  title: ['Энергия закончилась', 'Енергія закінчилася', 'Out of energy', 'Sin energía', 'Sem energia', 'Hết năng lượng', 'Energi habis', 'Enerji bitti', 'Energia się skończyła'],
  sub: [
    'Следующая — через {t}. С Plus — без ожидания.',
    'Наступна — через {t}. З Plus — без очікування.',
    'Next one in {t}. With Plus, no waiting.',
    'La siguiente en {t}. Con Plus, sin esperar.',
    'A próxima em {t}. Com Plus, sem esperar.',
    'Lượt tiếp theo sau {t}. Có Plus thì không phải chờ.',
    'Berikutnya dalam {t}. Dengan Plus, tanpa menunggu.',
    'Sonraki {t} içinde. Plus ile beklemek yok.',
    'Następna za {t}. Z Plus — bez czekania.',
  ],
  benefit: ['Энергия не кончается', 'Енергія не закінчується', 'Energy never runs out', 'La energía no se acaba', 'A energia não acaba', 'Năng lượng không bao giờ cạn', 'Energi tidak pernah habis', 'Enerji hiç bitmez', 'Energia się nie kończy'],
  cta: ['Попробовать Plus', 'Спробувати Plus', 'Try Plus', 'Probar Plus', 'Experimentar o Plus', 'Dùng thử Plus', 'Coba Plus', 'Plus’ı dene', 'Wypróbuj Plus'],
  fineTrial: [
    'пробный период из магазина · ≈ {price}/мес',
    'пробний період з магазину · ≈ {price}/міс',
    'free trial from the store · ≈ {price}/mo',
    'prueba de la tienda · ≈ {price}/mes',
    'teste grátis da loja · ≈ {price}/mês',
    'dùng thử từ cửa hàng · ≈ {price}/tháng',
    'uji coba dari toko · ≈ {price}/bln',
    'mağazadan deneme süresi · ≈ {price}/ay',
    'okres próbny ze sklepu · ≈ {price}/mies.',
  ],
  finePrice: ['≈ {price}/мес', '≈ {price}/міс', '≈ {price}/mo', '≈ {price}/mes', '≈ {price}/mês', '≈ {price}/tháng', '≈ {price}/bln', '≈ {price}/ay', '≈ {price}/mies.'],
  wait: ['Подожду 10 минут', 'Почекаю 10 хвилин', 'I’ll wait 10 minutes', 'Esperaré 10 minutos', 'Vou esperar 10 minutos', 'Tôi sẽ chờ 10 phút', 'Saya tunggu 10 menit', '10 dakika beklerim', 'Poczekam 10 minut'],
} as const satisfies Readonly<Record<string, Nine>>;

export type NoEnergySheetStringKey = keyof typeof S;
export const NO_ENERGY_SHEET_STRING_KEYS = Object.keys(S) as readonly NoEnergySheetStringKey[];
export const NO_ENERGY_SHEET_LANGS = ['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const;

/** Текст на языке интерфейса; `{ключ}` заменяется значением из vars. Неизвестный язык — английский. */
export function noEnergySheetText(lang: Lang, key: NoEnergySheetStringKey, vars?: Readonly<Record<string, string | number>>): string {
  const raw = (S[key] as Nine)[LANG_INDEX[lang] ?? LANG_INDEX.en];
  if (!vars) return raw;
  return raw.replace(/\{(\w+)\}/g, (whole, name: string) => (name in vars ? String(vars[name]) : whole));
}
