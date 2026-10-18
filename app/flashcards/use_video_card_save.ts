// use_video_card_save.ts — «Сохранить» на КАЖДОЙ карточке из видео (владелец 18.10, координатор 09:36).
//
// зачем: «в любом разделе, где карточки из видео, в любом наборе можно сохранить себе только те карточки, которые сам хочешь, а не весь набор». Одна логика для всех мест
// (набор из видео, список карточек набора, предпросмотр): сохранённая карточка — обычная сохранённая (addFlashcard, source 'video_phrase'), попадает в «Сохранённые» с фильтром «Из видео».
// Optimistic UI: тап меняет «сохранено» сразу; отказ (лимит, сбой) — откат + тост с причиной; двойной тап на той же карточке гасится; повторный тап по «Сохранено» снимает. Облако догоняет существующий
// cloud_sync (запись на тап в Firestore не добавлена), новой серверной функции не нужно. Журнал — [VIDEO-CARD-SAVE].
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { useRouter } from 'expo-router';

import { actionToastTri, emitAppEvent } from '../events';
import { trackEvent } from '../analytics';
import { usePremium } from '../../components/PremiumContext';
import { normalizePackLanguage, type PackLanguage } from './pack_languages';
import type { CardItem } from './types';
import { addFlashcard, loadFlashcards, removeFlashcard } from '../../hooks/use-flashcards';
import type { Lang } from '../../constants/i18n';
import { videoCardSaveKey, videoCardSaveLabels } from './video_card_save_core';

const LOG = '[VIDEO-CARD-SAVE]';

export { videoCardSaveKey, videoCardSaveLabels };

export type VideoCardSave = Readonly<{
  /** Карточка уже сохранена (по английскому тексту). */
  isSaved: (card: CardItem) => boolean;
  /** Сохранить / снять. Мгновенно меняет isSaved, откат при отказе. */
  toggle: (card: CardItem) => void;
  /** Подписи кнопки на языке интерфейса. */
  labels: Readonly<{ save: string; saved: string }>;
}>;

export function videoCardSaveToast(reason: string, lang: Lang): void {
  emitAppEvent('action_toast', reason === 'limit_reached'
    ? actionToastTri('error', {
      ru: 'Место для карточек закончилось — освободи немного в «Карточках»',
      uk: 'Місце для карток закінчилося — звільни трохи в «Картках»',
      en: 'No room for more cards — free some up in Cards',
      es: 'No queda espacio para tarjetas: libera algo en Tarjetas',
      'pt-BR': 'Sem espaço para cartões — libere um pouco em Cartões',
      vi: 'Hết chỗ cho thẻ — hãy giải phóng bớt trong Thẻ',
      id: 'Tidak ada ruang untuk kartu — kosongkan sedikit di Kartu',
      tr: 'Kart için yer kalmadı — Kartlar bölümünde biraz yer aç',
      pl: 'Brak miejsca na karty — zwolnij trochę w Kartach',
    })
    : actionToastTri('error', {
      ru: 'Не удалось сохранить карточку. Попробуй ещё раз',
      uk: 'Не вдалося зберегти картку. Спробуй ще раз',
      en: "Couldn't save the card. Try again",
      es: 'No se pudo guardar la tarjeta. Inténtalo de nuevo',
      'pt-BR': 'Não foi possível salvar o cartão. Tente de novo',
      vi: 'Không lưu được thẻ. Hãy thử lại',
      id: 'Gagal menyimpan kartu. Coba lagi',
      tr: 'Kart kaydedilemedi. Tekrar dene',
      pl: 'Nie udało się zapisać karty. Spróbuj ponownie',
    }));
  void lang;
}


export function useVideoCardSave(options: Readonly<{ lang: Lang; packLanguage?: PackLanguage | string | null; sourceTitle?: string | null; enabled?: boolean }>): VideoCardSave {
  const { lang, enabled = true } = options;
  const router = useRouter();
  const { hasPremiumAccess } = usePremium();
  const language = normalizePackLanguage(options.packLanguage ?? 'en');
  const sourceTitle = options.sourceTitle ?? undefined;
  const [savedKeys, setSavedKeys] = useState<ReadonlySet<string>>(() => new Set());
  const busyRef = useRef<Set<string>>(new Set());
  const aliveRef = useRef(true);
  useEffect(() => () => { aliveRef.current = false; }, []);

  // зачем: сохранённые читаются один раз на экран (из кэша хранилища), дальше состояние ведёт сам хук — без повторных чтений на каждый тап.
  useEffect(() => {
    if (!enabled) return undefined;
    let cancelled = false;
    void loadFlashcards(language)
      .then((cards) => {
        if (cancelled || !aliveRef.current) return;
        setSavedKeys(new Set(cards.map((card) => videoCardSaveKey(card.en))));
        console.log(LOG, 'loaded', JSON.stringify({ language, saved: cards.length })); // guard-ok: сколько сохранённых известно экрану
      })
      .catch((error: unknown) => {
        console.warn(LOG, 'load failed', error instanceof Error ? error.message : String(error)); // guard-ok: причина, экран остаётся с «не сохранено»
      });
    return () => { cancelled = true; };
  }, [enabled, language]);

  const setKey = useCallback((key: string, present: boolean) => {
    if (!aliveRef.current) return;
    setSavedKeys((current) => {
      if (current.has(key) === present) return current;
      const next = new Set(current);
      if (present) next.add(key); else next.delete(key);
      return next;
    });
  }, []);

  const toggle = useCallback((card: CardItem) => {
    const key = videoCardSaveKey(card.en);
    if (!key) {
      console.warn(LOG, 'skip: empty text', JSON.stringify({ id: card.id })); // guard-ok: ранний выход называет причину
      return;
    }
    if (busyRef.current.has(key)) {
      console.log(LOG, 'skip: in_flight', JSON.stringify({ id: card.id })); // guard-ok: защита от двойного тапа
      return;
    }
    busyRef.current.add(key);
    const wasSaved = savedKeys.has(key);
    setKey(key, !wasSaved); // Optimistic UI: закладка меняется на том же тапе
    console.log(LOG, wasSaved ? 'unsave:start' : 'save:start', JSON.stringify({ id: card.id, language })); // guard-ok: вход
    void (async () => {
      try {
        if (wasSaved) {
          const all = await loadFlashcards(language);
          const found = all.find((saved) => videoCardSaveKey(saved.en) === key);
          if (found) await removeFlashcard(found.id, language);
          console.log(LOG, 'unsave:done', JSON.stringify({ id: card.id, removed: Boolean(found) })); // guard-ok: итог
          return;
        }
        const result = await addFlashcard({
          en: card.en,
          ru: card.ru,
          uk: card.uk,
          es: card.es,
          source: 'video_phrase',
          sourceId: card.id,
          sourceTitle,
          explanationRu: card.explanationRu,
          packLanguage: language,
        }, language);
        if (result === 'added' || result === 'duplicate') {
          console.log(LOG, 'save:done', JSON.stringify({ id: card.id, result })); // guard-ok: итог
          return;
        }
        console.warn(LOG, 'rollback', JSON.stringify({ id: card.id, reason: result })); // guard-ok: откат называет причину
        setKey(key, false);
        // зачем (координатор 18.10): лимит Free — не тихий отказ, а пейвол-шторка (премиум-модалка поверх экрана: её закрытие не закрывает экран под ней). Plus-лимит — обычный тост.
        if (result === 'limit_reached' && !hasPremiumAccess) {
          console.log(LOG, 'paywall', JSON.stringify({ id: card.id, context: 'flashcard_limit' })); // guard-ok: ветвление называет решение
          void trackEvent('paywall_shown', { context: 'flashcard_limit', source: 'video_card_save' });
          router.push({ pathname: '/premium_modal', params: { context: 'flashcard_limit', source: 'video_card_save' } } as never);
          return;
        }
        videoCardSaveToast(String(result), lang);
      } catch (error) {
        console.warn(LOG, 'rollback', JSON.stringify({ id: card.id, reason: 'threw', message: error instanceof Error ? error.message : String(error) })); // guard-ok: откат называет причину
        videoCardSaveToast('threw', lang);
        setKey(key, wasSaved);
      } finally {
        busyRef.current.delete(key);
      }
    })();
  }, [hasPremiumAccess, language, lang, router, savedKeys, setKey, sourceTitle]);

  const isSaved = useCallback((card: CardItem) => savedKeys.has(videoCardSaveKey(card.en)), [savedKeys]);
  const labels = useMemo(() => videoCardSaveLabels(lang), [lang]);
  return useMemo(() => ({ isSaved, toggle, labels }), [isSaved, toggle, labels]);
}

/** Контекст для вложенных списков: экран набора из видео кладёт сюда сохранение, строки карточек его читают (null — кнопки нет). */
export const VideoCardSaveContext = createContext<VideoCardSave | null>(null);
export const useVideoCardSaveContext = (): VideoCardSave | null => useContext(VideoCardSaveContext);

/* expo-router: app/ files are treated as routes and need a default export. */
export default function __UseVideoCardSaveRouteShim() {
  return null;
}
