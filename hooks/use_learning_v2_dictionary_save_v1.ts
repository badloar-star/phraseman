// Сохранение слов словаря Learning V2 в «Карточки»: одно слово закладкой или пакетом из выбора, с «Отменить».
//
// зачем (владелец 21.10, макет dictionary-v2.html «A · Сохранение в Карточки»): тап по закладке сразу закрашивает её и
// показывает «в карточках» + плашку «Отменить»; запись идёт фоном тем же путём, что у закладки AddToFlashcard
// (addFlashcard / removeFlashcardByEnglish — локально, облако догоняет само). Ошибка — откат и понятное сообщение,
// лимит Free — окно Plus. Двойной тап по тому же слову, пока запись идёт, игнорируется. Чтений Firebase нет.
// Журнал [V2-DICT] save/undo/rollback с причиной.
import { useCallback, useEffect, useRef, useState } from "react";
import { InteractionManager } from "react-native";

import { checkAchievements } from "../app/achievements";
import { actionToastTri, emitAppEvent } from "../app/events";
import { logFlashcardAdded } from "../app/firebase";
import { normalizePackLanguage } from "../app/flashcards/pack_languages";
import { bumpStatsDaily } from "../app/stats_daily_breakdown";
import type { RuntimeStudyTarget } from "../app/target_storage_keys";
import { getTranscription, TRANSCRIPTION_ENGINE_VERSION } from "../app/transcription";
import { addFlashcard, isEnSavedInCacheSync, removeFlashcardByEnglish } from "./use-flashcards";

const LOG = "[V2-DICT]";
/** Сколько висит плашка «Отменить» (как у плашек действий в «Карточках»). */
export const LEARNING_V2_DICTIONARY_UNDO_MS = 4_000;

export type LearningV2DictionarySaveWordV1 = Readonly<{
  lexicalItemId: string;
  target: string;
  meaningByLocale: Readonly<Partial<Record<string, string>>>;
}>;

export type LearningV2DictionaryToastV1 = Readonly<{ id: number; ids: readonly string[]; words: readonly string[] }>;

const SAVE_FAILED = {
  ru: "Не удалось сохранить карточку. Попробуй ещё раз.", uk: "Не вдалося зберегти картку. Спробуй ще раз.", en: "Couldn't save the card. Try again.",
  es: "No se pudo guardar la tarjeta. Inténtalo de nuevo.", "pt-BR": "Não foi possível salvar o cartão. Tente de novo.", vi: "Không lưu được thẻ. Hãy thử lại.",
  id: "Kartu tidak bisa disimpan. Coba lagi.", tr: "Kart kaydedilemedi. Tekrar dene.", pl: "Nie udało się zapisać karty. Spróbuj ponownie.",
} as const;
const REMOVE_FAILED = {
  ru: "Не удалось убрать карточку. Попробуй ещё раз.", uk: "Не вдалося прибрати картку. Спробуй ще раз.", en: "Couldn't remove the card. Try again.",
  es: "No se pudo quitar la tarjeta. Inténtalo de nuevo.", "pt-BR": "Não foi possível remover o cartão. Tente de novo.", vi: "Không bỏ được thẻ. Hãy thử lại.",
  id: "Kartu tidak bisa dihapus. Coba lagi.", tr: "Kart kaldırılamadı. Tekrar dene.", pl: "Nie udało się usunąć karty. Spróbuj ponownie.",
} as const;

const reasonOf = (error: unknown) => (error instanceof Error ? error.message : String(error));

export function useLearningV2DictionarySaveV1(input: Readonly<{
  words: readonly LearningV2DictionarySaveWordV1[];
  studyTarget: RuntimeStudyTarget;
  onLimitReached: () => void;
}>) {
  const { words, studyTarget, onLimitReached } = input;
  const packLanguage = normalizePackLanguage(studyTarget);
  // Первый кадр: что уже сохранено — из кэша карточек в памяти (без чтения диска и сети).
  const [savedIds, setSavedIds] = useState<ReadonlySet<string>>(() => new Set(
    words.filter((word) => isEnSavedInCacheSync(word.target, packLanguage)).map((word) => word.lexicalItemId),
  ));
  const [toast, setToast] = useState<LearningV2DictionaryToastV1 | null>(null);
  const inFlightRef = useRef(new Set<string>());
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastSeqRef = useRef(0);

  // Новые слова в словаре (открылось слово в другом эпизоде) — подтянуть их состояние из того же кэша.
  useEffect(() => {
    setSavedIds((current) => {
      let changed = false;
      const next = new Set(current);
      for (const word of words) {
        if (next.has(word.lexicalItemId) || inFlightRef.current.has(word.lexicalItemId)) continue;
        if (isEnSavedInCacheSync(word.target, packLanguage)) { next.add(word.lexicalItemId); changed = true; }
      }
      return changed ? next : current;
    });
  }, [packLanguage, words]);

  useEffect(() => () => { if (toastTimerRef.current) clearTimeout(toastTimerRef.current); }, []);

  const setMany = useCallback((ids: readonly string[], saved: boolean) => {
    setSavedIds((current) => {
      const next = new Set(current);
      for (const id of ids) { if (saved) next.add(id); else next.delete(id); }
      return next;
    });
  }, []);

  const showToast = useCallback((ids: readonly string[], targets: readonly string[]) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    const next = { id: ++toastSeqRef.current, ids, words: targets };
    setToast(next);
    toastTimerRef.current = setTimeout(() => setToast((current) => (current?.id === next.id ? null : current)), LEARNING_V2_DICTIONARY_UNDO_MS);
  }, []);

  /** Сохранить слова (одно — закладкой, несколько — из выбора). Уже сохранённые и занятые записью пропускаются. */
  const save = useCallback((list: readonly LearningV2DictionarySaveWordV1[], origin: "bookmark" | "batch") => {
    const fresh = list.filter((word) => !savedIds.has(word.lexicalItemId) && !inFlightRef.current.has(word.lexicalItemId));
    console.log(`${LOG} save`, JSON.stringify({ origin, asked: list.length, fresh: fresh.length, skipped: list.length - fresh.length })); // guard-ok: вход сохранения
    if (fresh.length === 0) return;
    const ids = fresh.map((word) => word.lexicalItemId);
    for (const id of ids) inFlightRef.current.add(id);
    setMany(ids, true);
    showToast(ids, fresh.map((word) => word.target));
    InteractionManager.runAfterInteractions(() => {
      void (async () => {
        let added = 0;
        for (const word of fresh) {
          try {
            const meaning = word.meaningByLocale;
            const result = await addFlashcard({
              en: word.target,
              ru: meaning.ru ?? "",
              uk: meaning.uk ?? "",
              es: meaning.es,
              sourceLocales: { "pt-BR": meaning["pt-BR"], vi: meaning.vi, id: meaning.id, tr: meaning.tr, pl: meaning.pl },
              transcription: getTranscription(word.target),
              transcriptionEngineVersion: TRANSCRIPTION_ENGINE_VERSION,
              source: "lesson",
              sourceId: word.lexicalItemId,
              packLanguage,
            }, studyTarget);
            if (result === "added" || result === "duplicate") {
              if (result === "added") added += 1;
              continue;
            }
            console.warn(`${LOG} save_rollback`, JSON.stringify({ id: word.lexicalItemId, reason: result })); // guard-ok: откат с причиной
            setMany([word.lexicalItemId], false);
            if (result === "limit_reached") {
              const rest = fresh.slice(fresh.indexOf(word) + 1).map((item) => item.lexicalItemId);
              setMany(rest, false);
              setToast(null);
              onLimitReached();
              break;
            }
            emitAppEvent("action_toast", actionToastTri("error", SAVE_FAILED));
          } catch (error: unknown) {
            console.warn(`${LOG} save_rollback`, JSON.stringify({ id: word.lexicalItemId, reason: reasonOf(error) })); // guard-ok: catch с причиной
            setMany([word.lexicalItemId], false);
            emitAppEvent("action_toast", actionToastTri("error", SAVE_FAILED));
          }
        }
        for (const id of ids) inFlightRef.current.delete(id);
        console.log(`${LOG} save_done`, JSON.stringify({ origin, added, asked: fresh.length })); // guard-ok: итог сохранения
        if (added > 0) {
          void bumpStatsDaily("flashcards_saved", added, studyTarget).catch((error: unknown) => console.warn(`${LOG} stats_failed`, reasonOf(error))); // guard-ok: catch с причиной
          void Promise.resolve(logFlashcardAdded()).catch((error: unknown) => console.warn(`${LOG} analytics_failed`, reasonOf(error))); // guard-ok: catch с причиной
          void Promise.resolve(checkAchievements({ type: "flashcard_saved", source: "lesson", studyTarget })).catch((error: unknown) => console.warn(`${LOG} achievements_failed`, reasonOf(error))); // guard-ok: catch с причиной
        }
      })();
    });
  }, [onLimitReached, packLanguage, savedIds, setMany, showToast, studyTarget]);

  /** Убрать слова из «Карточек» (тап по закрашенной закладке или «Отменить»). */
  const remove = useCallback((list: readonly LearningV2DictionarySaveWordV1[], origin: "bookmark" | "undo") => {
    const targets = list.filter((word) => !inFlightRef.current.has(word.lexicalItemId));
    console.log(`${LOG} remove`, JSON.stringify({ origin, asked: list.length, run: targets.length })); // guard-ok: вход удаления
    if (targets.length === 0) return;
    const ids = targets.map((word) => word.lexicalItemId);
    for (const id of ids) inFlightRef.current.add(id);
    setMany(ids, false);
    if (origin === "undo") setToast(null);
    InteractionManager.runAfterInteractions(() => {
      void (async () => {
        for (const word of targets) {
          try {
            const ok = await removeFlashcardByEnglish(word.target, packLanguage);
            if (!ok) {
              console.warn(`${LOG} remove_rollback`, JSON.stringify({ id: word.lexicalItemId, reason: "not_removed" })); // guard-ok: откат с причиной
              setMany([word.lexicalItemId], true);
              emitAppEvent("action_toast", actionToastTri("error", REMOVE_FAILED));
            }
          } catch (error: unknown) {
            console.warn(`${LOG} remove_rollback`, JSON.stringify({ id: word.lexicalItemId, reason: reasonOf(error) })); // guard-ok: catch с причиной
            setMany([word.lexicalItemId], true);
            emitAppEvent("action_toast", actionToastTri("error", REMOVE_FAILED));
          } finally {
            inFlightRef.current.delete(word.lexicalItemId);
          }
        }
      })();
    });
  }, [packLanguage, setMany]);

  /** «Отменить» на плашке: убрать ровно то, что сохранили последним действием. */
  const undo = useCallback(() => {
    if (!toast) return;
    const byId = new Map(words.map((word) => [word.lexicalItemId, word]));
    const list = toast.ids.map((id) => byId.get(id)).filter((word): word is LearningV2DictionarySaveWordV1 => Boolean(word));
    // Запись, возможно, ещё идёт: снимаем флажок занятости только после неё — поэтому ждём кадр и удаляем.
    setTimeout(() => remove(list, "undo"), inFlightRef.current.size > 0 ? 300 : 0);
    setToast(null);
    setMany(toast.ids, false);
  }, [remove, setMany, toast, words]);

  return { savedIds, toast, save, remove, undo } as const;
}
