// use_video_card_save.ts — «Сохранить» на КАЖДОЙ карточке из видео (владелец 18.10, координатор 09:36).
//
// зачем: «в любом разделе, где карточки из видео, в любом наборе можно сохранить себе только те карточки, которые сам хочешь, а не весь набор». Одна логика для всех мест
// (набор из видео, список карточек набора): сохранённая карточка — обычная сохранённая (addFlashcard, source 'video_phrase'), попадает в «Сохранённые» с фильтром «Из видео».
// Optimistic UI: тап меняет «сохранено» сразу; отказ — откат + тост (лимит Free — пейвол-шторка, координатор 18.10); двойной тап на той же карточке гасится; повторный тап по «Сохранено» снимает.
// Облако догоняет существующий cloud_sync (записи на тап в Firestore нет). Журнал — [VIDEO-CARD-SAVE].
// Ревизор 4d65c8be5 (🟡): (а) поздний ответ загрузки списка сохранённых не затирает тап, сделанный до его прихода (last-write-guard); (б) значение для строк СТАБИЛЬНО — «сохранено ли» читает каждая кнопка
// подпиской по своему ключу (useSyncExternalStore), поэтому сохранение одной карточки не перерисовывает остальные.
import { useRouter } from 'expo-router';
import React, { createContext, useContext, useEffect, useMemo, useRef, useSyncExternalStore } from 'react';

import { actionToastTri, emitAppEvent } from '../events';
import { trackEvent } from '../analytics';
import { usePremium } from '../../components/PremiumContext';
import { normalizePackLanguage, type PackLanguage } from './pack_languages';
import type { CardItem } from './types';
import { addFlashcard, loadFlashcards, removeFlashcard } from '../../hooks/use-flashcards';
import type { Lang } from '../../constants/i18n';
import { videoCardSaveKey, videoCardSaveLabels } from './video_card_save_core';

export { videoCardSaveKey, videoCardSaveLabels };

const LOG = '[VIDEO-CARD-SAVE]';

export type VideoCardSave = Readonly<{
  /** Подписка на изменения «сохранено» (для useSyncExternalStore). */
  subscribe: (listener: () => void) => () => void;
  /** Сохранена ли фраза с этим ключом (videoCardSaveKey). */
  hasKey: (key: string) => boolean;
  /** Сохранить / снять. Мгновенно меняет hasKey, откат при отказе. */
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
  const language = normalizePackLanguage(options.packLanguage ?? 'en');
  const router = useRouter();
  const { hasPremiumAccess } = usePremium();

  // Всё изменчивое — в ref: значение для строк создаётся ОДИН раз на экран и не меняется (строки не перерисовываются от чужих тапов).
  const latestRef = useRef({ lang, language, sourceTitle: options.sourceTitle ?? undefined, hasPremiumAccess, router });
  latestRef.current = { lang, language, sourceTitle: options.sourceTitle ?? undefined, hasPremiumAccess, router };
  const savedRef = useRef<Set<string>>(new Set());
  const touchedRef = useRef<Set<string>>(new Set());
  const busyRef = useRef<Set<string>>(new Set());
  const listenersRef = useRef<Set<() => void>>(new Set());
  const aliveRef = useRef(true);
  useEffect(() => () => { aliveRef.current = false; }, []);

  const api = useMemo<VideoCardSave>(() => {
    const notify = () => { listenersRef.current.forEach((listener) => listener()); };
    const setKey = (key: string, present: boolean) => {
      if (!aliveRef.current) return;
      if (savedRef.current.has(key) === present) return;
      if (present) savedRef.current.add(key); else savedRef.current.delete(key);
      notify();
    };
    const mark = (key: string, present: boolean) => {
      touchedRef.current.add(key); // зачем (Ревизор 4d65c8be5 (а)): тап до прихода загрузки списка выигрывает у поздней загрузки
      setKey(key, present);
    };
    const toggle = (card: CardItem) => {
      const { lang: uiLang, language: lng, sourceTitle, hasPremiumAccess: premium, router: nav } = latestRef.current;
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
      const wasSaved = savedRef.current.has(key);
      mark(key, !wasSaved); // Optimistic UI: закладка меняется на том же тапе
      console.log(LOG, wasSaved ? 'unsave:start' : 'save:start', JSON.stringify({ id: card.id, language: lng })); // guard-ok: вход
      void (async () => {
        try {
          if (wasSaved) {
            const all = await loadFlashcards(lng);
            const found = all.find((saved) => videoCardSaveKey(saved.en) === key);
            if (found) await removeFlashcard(found.id, lng);
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
            packLanguage: lng,
          }, lng);
          if (result === 'added' || result === 'duplicate') {
            console.log(LOG, 'save:done', JSON.stringify({ id: card.id, result })); // guard-ok: итог
            return;
          }
          console.warn(LOG, 'rollback', JSON.stringify({ id: card.id, reason: result })); // guard-ok: откат называет причину
          mark(key, false);
          // зачем (координатор 18.10): лимит Free — не тихий отказ, а пейвол-шторка (премиум-модалка поверх экрана: её закрытие не закрывает экран под ней). Plus-лимит — обычный тост.
          if (result === 'limit_reached' && !premium) {
            console.log(LOG, 'paywall', JSON.stringify({ id: card.id, context: 'flashcard_limit' })); // guard-ok: ветвление называет решение
            void trackEvent('paywall_shown', { context: 'flashcard_limit', source: 'video_card_save' });
            nav.push({ pathname: '/premium_modal', params: { context: 'flashcard_limit', source: 'video_card_save' } } as never);
            return;
          }
          videoCardSaveToast(String(result), uiLang);
        } catch (error) {
          console.warn(LOG, 'rollback', JSON.stringify({ id: card.id, reason: 'threw', message: error instanceof Error ? error.message : String(error) })); // guard-ok: откат называет причину
          videoCardSaveToast('threw', uiLang);
          mark(key, wasSaved);
        } finally {
          busyRef.current.delete(key);
        }
      })();
    };
    return {
      subscribe: (listener) => {
        listenersRef.current.add(listener);
        return () => { listenersRef.current.delete(listener); };
      },
      hasKey: (key) => savedRef.current.has(key),
      toggle,
      labels: videoCardSaveLabels(lang),
    };
    // labels зависят от языка интерфейса: при смене языка значение пересоздаётся (редко); остальное читается из refs.
  }, [lang]);

  // зачем: сохранённые читаются один раз на экран (из кэша хранилища), дальше состояние ведёт сам хук — без повторных чтений на каждый тап.
  // Тапы, сделанные до прихода ответа, накладываются поверх него (touchedRef) — поздний ответ их не затирает.
  useEffect(() => {
    if (!enabled) return undefined;
    let cancelled = false;
    touchedRef.current = new Set();
    void loadFlashcards(language)
      .then((cards) => {
        if (cancelled || !aliveRef.current) return;
        const loaded = new Set(cards.map((card) => videoCardSaveKey(card.en)));
        touchedRef.current.forEach((key) => { if (savedRef.current.has(key)) loaded.add(key); else loaded.delete(key); });
        savedRef.current = loaded;
        listenersRef.current.forEach((listener) => listener());
        console.log(LOG, 'loaded', JSON.stringify({ language, saved: cards.length, touchedDuringLoad: touchedRef.current.size })); // guard-ok: сколько сохранённых известно экрану
        touchedRef.current = new Set();
      })
      .catch((error: unknown) => {
        console.warn(LOG, 'load failed', error instanceof Error ? error.message : String(error)); // guard-ok: причина, экран остаётся с «не сохранено»
      });
    return () => { cancelled = true; };
  }, [enabled, language]);

  return api;
}

/** «Сохранена ли эта карточка» — подписка по ключу: перерисовывается только кнопка этой карточки. */
export function useVideoCardSaved(save: VideoCardSave, card: CardItem): boolean {
  const key = videoCardSaveKey(card.en);
  return useSyncExternalStore(save.subscribe, () => save.hasKey(key), () => false);
}

/** Контекст для вложенных списков: экран набора из видео кладёт сюда сохранение, строки карточек его читают (null — кнопки нет). */
export const VideoCardSaveContext = createContext<VideoCardSave | null>(null);
export const useVideoCardSaveContext = (): VideoCardSave | null => useContext(VideoCardSaveContext);

/* expo-router: app/ files are treated as routes and need a default export. */
export default function __UseVideoCardSaveRouteShim() {
  return null;
}
