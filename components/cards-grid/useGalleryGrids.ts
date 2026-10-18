/**
 * Сетки галереи по всем шагам + самопроверка по настоящему замеру текста.
 *
 * зачем (владелец 18.10: «текст ВСЕГДА помещается целиком»): оценка строк (cardsGalleryFit) намеренно с запасом, но шрифты устройств разные — поэтому каждая плитка после
 * отрисовки сообщает настоящее число строк фразы и перевода (onTextLayout). Если строк оказалось больше оценки, плитка получает поправку по высоте (fixes), сетки
 * пересчитываются один раз за пачку, и карточка вырастает. Журнал [SAVED-CARDS-SIZE]: на каждой пересборке — шаг, ширина плитки, кегль, высоты рядов, обрезка (по оценке и по замеру).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PixelRatio } from 'react-native';

import { FIT_MAX_FONT_SCALE } from './cardsGalleryFit';
import { buildGalleryGrids, type GalleryGrids, type GridCard } from './cardsGalleryGrid';

const TAG = '[SAVED-CARDS-SIZE]';
/** Сколько ждём пачку замеров, прежде чем пересчитать сетки, мс. */
const FIX_BATCH_MS = 120;

export type GalleryGridsApi = Readonly<{
  grids: GalleryGrids;
  /** Плитка сообщает: на шаге у карточки настоящий замер больше оценки на `extraPx`. */
  reportFix: (cardId: string, step: number, extraPx: number) => void;
}>;

export function useGalleryGrids(cards: readonly GridCard[], width: number): GalleryGridsApi {
  const fontScale = Math.max(1, Math.min(FIT_MAX_FONT_SCALE, PixelRatio.getFontScale()));
  const fixesRef = useRef<Map<string, number>>(new Map());
  const [version, setVersion] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // другая ширина или системный шрифт — прежние поправки недействительны
  useEffect(() => {
    if (fixesRef.current.size > 0) fixesRef.current = new Map();
  }, [fontScale, width]);
  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const grids = useMemo(() => buildGalleryGrids(cards, width, fontScale, fixesRef.current), [cards, width, fontScale, version]); // eslint-disable-line react-hooks/exhaustive-deps -- version: пересборка после поправок

  useEffect(() => {
    for (const g of grids.grids) {
      console.log(`${TAG} шаг=${g.step} плиток=${grids.count} ширина плитки=${Math.round(g.tileW * 10) / 10} кегль слова=${g.face.wordSize} перевода=${g.face.trSize} масштаб=${Math.round(g.face.k * 100) / 100} fontScale=${fontScale} высота ряда мин/макс=${g.face.minH}/${Math.max(g.face.minH, ...g.rowHeights, 0)} высота сетки=${Math.round(g.height)} обрезка=нет (оценка с запасом; замер плитки: поправок=${fixesRef.current.size})`); // guard-ok: числа раскладки на каждой пересборке
    }
  }, [grids, fontScale]);

  const reportFix = useCallback((cardId: string, step: number, extraPx: number) => {
    const key = `${cardId}|${step}`;
    const prev = fixesRef.current.get(key) ?? 0;
    if (!(extraPx > prev)) return;
    console.warn(`${TAG} замер больше оценки: карточка=${cardId} шаг=${step} добавляем ${Math.round(extraPx)} px (было ${Math.round(prev)}) — обрезка=была бы, плитка вырастет`); // guard-ok: расхождение оценки и замера, редкое
    fixesRef.current.set(key, extraPx);
    if (timerRef.current) return;
    timerRef.current = setTimeout(() => { timerRef.current = null; setVersion((v) => v + 1); }, FIX_BATCH_MS);
  }, []);

  return { grids, reportFix };
}
