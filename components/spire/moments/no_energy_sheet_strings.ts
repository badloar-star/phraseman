// ════════════════════════════════════════════════════════════════════════════
// no_energy_sheet_strings.ts — тексты момента m22 «Энергия закончилась → Plus», 9 языков.
//
// зачем (координатор 15.10, m22 к сборке 16.10; эталон engagement-moments-v3-all.html m22 / plusSheet): шторка над доком Пика вместо
// мгновенного перехода в пейвол. Переводы 8 языков — финальные от «Специалиста по переводам» (0cf596364): заголовок как у окна энергии, без обещания «бесплатно».
// ════════════════════════════════════════════════════════════════════════════
import type { Lang } from '../../../constants/i18n';

type Nine = readonly [string, string, string, string, string, string, string, string, string];
const LANG_INDEX: Readonly<Record<string, number>> = { ru: 0, uk: 1, en: 2, es: 3, 'pt-BR': 4, vi: 5, id: 6, tr: 7, pl: 8 };

const S = {
  ctx: ['Энергия', 'Енергія', 'Energy', 'Energía', 'Energia', 'Năng lượng', 'Energi', 'Enerji', 'Energia'],
  title: ['Энергия закончилась', 'Енергія закінчилась', 'Out of energy', 'Se acabó la energía', 'A energia acabou', 'Hết năng lượng', 'Energi habis', 'Enerji bitti', 'Energia się skończyła'],
  sub: [
    'Следующая — через {t}. С Plus — без ожидания.',
    'Наступна — через {t}. З Plus — без очікування.',
    'More energy in {t}. With Plus, no waiting.',
    'La siguiente llega en {t}. Con Plus, sin esperas.',
    'A próxima chega em {t}. Com o Plus, sem espera.',
    'Năng lượng hồi lại sau {t}. Có Plus thì không cần chờ.',
    'Energi berikutnya dalam {t}. Dengan Plus, tanpa menunggu.',
    'Sıradaki enerji {t} sonra. Plus ile beklemek yok.',
    'Następna za {t}. Z Plus — bez czekania.',
  ],
  benefit: ['Энергия не кончается', 'Енергія не закінчується', 'Unlimited energy', 'Energía ilimitada', 'Energia ilimitada', 'Năng lượng không giới hạn', 'Energi tanpa batas', 'Sınırsız enerji', 'Energia bez limitu'],
  cta: ['Попробовать Plus', 'Спробувати Plus', 'Try Plus', 'Probar Plus', 'Testar o Plus', 'Dùng thử Plus', 'Coba Plus', 'Plus’ı dene', 'Wypróbuj Plus'],
  fineTrial: [
    'пробный период из магазина · ≈ {price}/мес',
    'пробний період із магазину · ≈ {price}/міс',
    'trial via the store · ≈ {price}/mo',
    'prueba en la tienda · ≈ {price}/mes',
    'teste pela loja · ≈ {price}/mês',
    'dùng thử qua cửa hàng · ≈ {price}/tháng',
    'uji coba lewat toko · ≈ {price}/bln',
    'mağaza üzerinden deneme · ≈ {price}/ay',
    'okres próbny w sklepie · ≈ {price}/mies.',
  ],
  finePrice: ['≈ {price}/мес', '≈ {price}/міс', '≈ {price}/mo', '≈ {price}/mes', '≈ {price}/mês', '≈ {price}/tháng', '≈ {price}/bln', '≈ {price}/ay', '≈ {price}/mies.'],
  wait: ['Подожду 10 минут', 'Почекаю 10 хвилин', 'I’ll wait 10 minutes', 'Esperaré 10 minutos', 'Vou esperar 10 minutos', 'Tôi sẽ chờ 10 phút', 'Aku tunggu 10 menit', '10 dakika beklerim', 'Poczekam 10 minut'],
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
