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

/** Язык перевода в подписи: EN → RU / UA / ES — по локали интерфейса. */
export function listeningBackLangLabel(lang: Lang): string {
  return triLang(lang, { ru: 'RU', uk: 'UA', es: 'ES' });
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
      }),
      icon: 'repeat',
    },
    en_only: {
      id: 'en_only',
      label: triLang(lang, { ru: 'Только EN', uk: 'Лише EN', es: 'Solo EN' }),
      hint: triLang(lang, {
        ru: 'Без перевода — чистое погружение',
        uk: 'Без перекладу — чисте занурення',
        es: 'Sin traducción: inmersión pura',
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
