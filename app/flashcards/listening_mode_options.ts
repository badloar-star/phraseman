/**
 * cards-2.1 (§7.2 SPEC_2_1): ЧИСТАЯ модель выбора режима озвучки в «Слушании».
 * Без RN-импортов — юнит-тестируется в node (tests/fc_listening_mode_options.test.ts).
 *
 * Четыре чипа (EN→RU / RU→EN / EN×2 / только EN) заменены ОДНОЙ кнопкой с
 * выпадающим списком (ListeningModePicker.tsx). Здесь — список вариантов с
 * подписями/подсказками/иконками и безопасное переключение выбранного.
 */
import { triLang, type Lang } from '../../constants/i18n';
import { LISTENING_ORDERS, type ListeningOrder } from './listening_machine';

export type ListeningModeOption = {
  id: ListeningOrder;
  /** Короткая подпись — она же на кнопке. */
  label: string;
  /** Пояснение строкой ниже в списке. */
  hint: string;
  /** Имя Ionicons-глифа. */
  icon: string;
};

/**
 * Язык перевода в подписи режима — по локали интерфейса, ВСЕ восемь.
 * Раньше покрывались только ru/uk/es, и полякам/туркам показывался «RU»
 * (фолбэк triLang), хотя перевод озвучивался на их языке.
 */
export function listeningBackLangLabel(lang: Lang): string {
  return triLang(lang, {
    ru: 'RU',
    uk: 'UA',
    es: 'ES',
    'pt-BR': 'PT',
    vi: 'VI',
    id: 'ID',
    tr: 'TR',
    pl: 'PL',
  });
}

/** Заголовок кнопки/списка «Режим озвучки» — все восемь локалей. */
export function listeningModeTitle(lang: Lang): string {
  return triLang(lang, {
    ru: 'Режим озвучки',
    uk: 'Режим озвучення',
    es: 'Modo de voz',
    'pt-BR': 'Modo de leitura',
    vi: 'Chế độ đọc',
    id: 'Mode suara',
    tr: 'Seslendirme modu',
    pl: 'Tryb odczytu',
  });
}

/** Полный список режимов в порядке LISTENING_ORDERS (порядок = порядок в списке). */
export function listeningModeOptions(lang: Lang): ListeningModeOption[] {
  const back = listeningBackLangLabel(lang);
  const byId: Record<ListeningOrder, ListeningModeOption> = {
    en_ru: {
      id: 'en_ru',
      label: `EN → ${back}`,
      hint: triLang(lang, {
        ru: 'Сначала английский, потом перевод',
        uk: 'Спочатку англійська, потім переклад',
        es: 'Primero inglés, luego la traducción',
        'pt-BR': 'Primeiro o inglês, depois a tradução',
        vi: 'Tiếng Anh trước, rồi đến bản dịch',
        id: 'Bahasa Inggris dulu, lalu terjemahannya',
        tr: 'Önce İngilizce, sonra çevirisi',
        pl: 'Najpierw angielski, potem tłumaczenie',
      }),
      icon: 'arrow-forward',
    },
    ru_en: {
      id: 'ru_en',
      label: `${back} → EN`,
      hint: triLang(lang, {
        ru: 'Сначала перевод — вспоминаете сами',
        uk: 'Спочатку переклад — згадуєте самі',
        es: 'Primero la traducción: la recuerdas tú',
        'pt-BR': 'Primeiro a tradução — você lembra sozinho',
        vi: 'Bản dịch trước — bạn tự nhớ lại',
        id: 'Terjemahan dulu — kamu mengingat sendiri',
        tr: 'Önce çeviri — kendin hatırlarsın',
        pl: 'Najpierw tłumaczenie — przypominasz sobie sam',
      }),
      icon: 'swap-horizontal',
    },
    en_x2: {
      id: 'en_x2',
      label: 'EN ×2',
      hint: triLang(lang, {
        ru: 'Два раза английский, второй — медленнее',
        uk: 'Двічі англійська, другий раз — повільніше',
        es: 'Inglés dos veces, la segunda más lento',
        'pt-BR': 'Inglês duas vezes, a segunda mais devagar',
        vi: 'Tiếng Anh hai lần, lần hai chậm hơn',
        id: 'Bahasa Inggris dua kali, kedua lebih pelan',
        tr: 'İngilizce iki kez, ikincisi daha yavaş',
        pl: 'Angielski dwa razy, drugi raz wolniej',
      }),
      icon: 'repeat',
    },
    en_only: {
      id: 'en_only',
      label: triLang(lang, {
        ru: 'Только EN',
        uk: 'Лише EN',
        es: 'Solo EN',
        'pt-BR': 'Só EN',
        vi: 'Chỉ EN',
        id: 'Hanya EN',
        tr: 'Sadece EN',
        pl: 'Tylko EN',
      }),
      hint: triLang(lang, {
        ru: 'Без перевода — чистое погружение',
        uk: 'Без перекладу — чисте занурення',
        es: 'Sin traducción: inmersión pura',
        'pt-BR': 'Sem tradução — imersão pura',
        vi: 'Không bản dịch — đắm chìm hoàn toàn',
        id: 'Tanpa terjemahan — imersi penuh',
        tr: 'Çevirisiz — saf daldırma',
        pl: 'Bez tłumaczenia — czyste zanurzenie',
      }),
      icon: 'headset',
    },
  };
  return LISTENING_ORDERS.map((id) => byId[id]);
}

/** Подписи режимов одним словарём (кнопка, a11y, тесты). */
export function listeningModeLabels(lang: Lang): Record<ListeningOrder, string> {
  const out = {} as Record<ListeningOrder, string>;
  for (const o of listeningModeOptions(lang)) out[o.id] = o.label;
  return out;
}

/** Тайп-гард: пришедшее из хранилища/параметров значение — валидный режим? */
export function isListeningOrder(v: unknown): v is ListeningOrder {
  return typeof v === 'string' && (LISTENING_ORDERS as readonly string[]).includes(v);
}

/** Позиция режима в списке (для стаггера входа и тестов); -1 — неизвестный. */
export function listeningModeIndex(id: ListeningOrder | string): number {
  return (LISTENING_ORDERS as readonly string[]).indexOf(id);
}

/**
 * Переключение выбранного: невалидный кандидат не ломает состояние — остаётся
 * текущий режим (сохранение настроек не должно получить мусор).
 */
export function selectListeningMode(current: ListeningOrder, next: unknown): ListeningOrder {
  return isListeningOrder(next) ? next : current;
}

/** Отметка «текущий» для рендера списка. */
export function isListeningModeSelected(option: ListeningModeOption, current: ListeningOrder): boolean {
  return option.id === current;
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
