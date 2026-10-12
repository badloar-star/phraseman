// зачем (владелец 12.10, п.83, cards-027): меню языка на настройке тренировки должно знать, у каких ЕЩЁ языков есть наборы (и сколько).
// Списки чужих языков собираются ТОЛЬКО из того, что уже на устройстве (loadFcDeckOptions(..., { localOnly: true }) — 0 чтений Firestore),
// лениво: после первого кадра и после ухода анимаций, по одному языку за раз, чтобы не тормозить вход. Уже собранные списки берутся синхронно
// из памяти (peekFcDeckOptionsLocal) — повторный вход и повторный выбор языка стоят 0 мс. План: docs/phraseman-2.0/R1_FC_LANG_FILTER.md.
import { useEffect, useRef, useState } from 'react';
import { InteractionManager } from 'react-native';
import type { Lang } from '../../constants/i18n';
import { getDevOtherLanguageDecks } from '../dev_fc_lang_state';
import type { LearningLanguageTarget } from '../learning_language_contour';
import type { DeckSheetOption } from './DeckPickerSheet';
import { hideDecksWithoutVoice, loadFcDeckOptions, peekFcDeckOptionsLocal } from './deck_options';
import { flashcardsReadyLanguages, formatLangFilterLog } from './fc_lang_filter';
import type { FcPresetMode } from './mode_prefs';

export type OtherLanguageDecks = Readonly<Partial<Record<LearningLanguageTarget, readonly DeckSheetOption[]>>>;

/** Языки, кроме языка приложения, в порядке меню. */
function otherLanguages(appTarget: LearningLanguageTarget): readonly LearningLanguageTarget[] {
  return flashcardsReadyLanguages().filter((code) => code !== appTarget);
}

/** «Годные» наборы языка: с карточками и (для «Устно») с голосом — те же правила, что у списка языка приложения. */
function eligibleDecks(raw: readonly DeckSheetOption[], mode: FcPresetMode): DeckSheetOption[] {
  return hideDecksWithoutVoice(raw, mode).filter((deck) => deck.count > 0);
}

function initialFromMemory(mode: FcPresetMode, lang: Lang, appTarget: LearningLanguageTarget): OtherLanguageDecks {
  const out: Partial<Record<LearningLanguageTarget, readonly DeckSheetOption[]>> = {};
  // зачем (п.83, съёмка R1): dev-подмена списков других языков (только память, в сторе всегда null) — у гостя наборов второго языка нет
  const devLists = getDevOtherLanguageDecks(appTarget);
  for (const code of otherLanguages(appTarget)) {
    const devList = devLists?.[code];
    if (devList) {
      out[code] = eligibleDecks(devList, mode);
      console.log(formatLangFilterLog('list', { language: code, decks: out[code]!.length, source: 'dev_fixture', ms: 0 }));
      continue;
    }
    const hit = peekFcDeckOptionsLocal(mode, lang, code);
    if (hit) {
      out[code] = eligibleDecks(hit, mode);
      console.log(formatLangFilterLog('list', { language: code, decks: out[code]!.length, source: 'peek', ms: 0 }));
    }
  }
  return out;
}

/**
 * @param enabled — включать, когда список языка приложения уже показан (первый кадр не занимаем).
 */
export function useOtherLanguageDecks(args: Readonly<{
  enabled: boolean;
  mode: FcPresetMode | null;
  lang: Lang;
  appTarget: LearningLanguageTarget;
}>): OtherLanguageDecks {
  const { enabled, mode, lang, appTarget } = args;
  const [byLanguage, setByLanguage] = useState<OtherLanguageDecks>(() => (mode ? initialFromMemory(mode, lang, appTarget) : {}));
  const byLanguageRef = useRef(byLanguage);
  byLanguageRef.current = byLanguage;

  useEffect(() => {
    if (!enabled || !mode) return undefined;
    let cancelled = false;
    const task = InteractionManager.runAfterInteractions(() => {
      void (async () => {
        for (const code of otherLanguages(appTarget)) {
          if (cancelled) return;
          if (byLanguageRef.current[code]) continue;
          const startedAtMs = Date.now();
          try {
            const raw = await loadFcDeckOptions(mode, lang, code, { localOnly: true });
            if (cancelled) return;
            const list = eligibleDecks(raw, mode);
            console.log(formatLangFilterLog('list', { language: code, decks: list.length, source: 'local_build', ms: Date.now() - startedAtMs }));
            setByLanguage((prev) => ({ ...prev, [code]: list }));
          } catch (error) {
            // Немой catch запрещён: язык без списка просто не попадёт в меню — причину оставляем в журнале.
            console.warn(formatLangFilterLog('list_failed', {
              language: code,
              source: 'local_build',
              ms: Date.now() - startedAtMs,
              error: String((error as Error)?.message ?? error),
            }));
          }
        }
      })();
    });
    return () => {
      cancelled = true;
      task.cancel();
    };
  }, [appTarget, enabled, lang, mode]);

  return byLanguage;
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
