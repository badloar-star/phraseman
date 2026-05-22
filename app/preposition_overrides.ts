/**
 * Per-phrase preposition explanation overrides.
 *
 * Key format: `${sentence (lowercase, single spaces, with chosen preposition inline)}::${preposition}`
 * Example: 'she is on vacation::on'
 *
 * Used as the highest-priority lookup before any rule-engine logic in
 * preposition_explanations.ts. Add an entry here when an idiom or fixed
 * collocation needs an explanation that the rule engine cannot infer.
 */

export type PrepositionOverride = {
  ru: string;
  uk: string;
  es: string;
  'pt-BR': string;
  vi: string;
  id: string;
  tr: string;
  pl: string;
};

export const PREPOSITION_OVERRIDES: Record<string, PrepositionOverride> = {
  'she is on vacation::on': {
    ru: '"On vacation" - устойчивое выражение: "в отпуске". Перед словом vacation в значении отдыха всегда стоит "on", потому что отпуск воспринимается как состояние/событие, в которое человек "вошёл".',
    uk: '"On vacation" - сталий вираз: "у відпустці". Перед словом vacation у значенні відпочинку завжди стоїть "on", бо відпустка сприймається як стан/подія, в яку людина "увійшла".',
    es: 'La colocación fija «on vacation» equivale a «de vacaciones» o «tomando vacaciones». Con vacation en este sentido suele irse on, porque se trata como un estado o período determinado.',
    'pt-BR': 'A colocação fixa "on vacation" equivale a "de férias". Com vacation nesse sentido, costuma-se usar on, porque as férias são vistas como um estado ou período determinado.',
    vi: 'Cụm cố định "on vacation" nghĩa là "đang đi nghỉ". Với vacation theo nghĩa này, thường dùng on vì kỳ nghỉ được xem như một trạng thái hoặc giai đoạn.',
    id: 'Kolokasi tetap "on vacation" berarti "sedang berlibur". Dengan vacation dalam makna ini biasanya dipakai on, karena liburan dianggap sebagai keadaan atau periode tertentu.',
    tr: '"On vacation" kalıbı "tatilde" anlamına gelen sabit bir ifadedir. Vacation bu anlamdayken genellikle on kullanılır, çünkü tatil belirli bir durum veya dönem gibi görülür.',
    pl: 'Stałe wyrażenie "on vacation" oznacza "na wakacjach" / "na urlopie". Przy vacation w tym znaczeniu zwykle używa się on, bo urlop traktuje się jak stan lub określony okres.',
  },
};

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
