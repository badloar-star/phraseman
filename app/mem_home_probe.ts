/**
 * [MEM-HOME] — сколько визуальных ресурсов сейчас смонтировано на Главной и «Обучении» и сколько памяти они «обещают».
 *
 * зачем (координатор 18.10, R129; журнал [MEM] Сверки: Native Heap +101 МБ на первой Главной, +126/+108 МБ на каждом пересоздании Главной через dev-state replace, +13 МБ за круг тапов по пяти
 * вкладкам без плато; правило «сперва логи»): нужно отделить три причины — (1) старые экземпляры Главной/«Обучения» остаются смонтированными после замены экрана (утечка дерева), (2) картинки
 * (сколько экземпляров живо и какой у них размер источника против показа), (3) JS-куча (Hermes). Реестр считает «живые / всего за процесс» экземпляров по ключу и оценку декода
 * (ширина × высота × 4 для локальных картинок; у сетевых — только счёт), а сводка печатает ещё и JS-кучу из `mem_probe`. Строка — на событие (фокус Главной, смена числа корневых экземпляров),
 * не на кадр. Только dev и не стор-релиз; в релизе все функции пустые. Значения — числа и ключи, без данных пользователя.
 */
import { useEffect } from 'react';
import { Image as RNImage, type ImageSourcePropType } from 'react-native';

import { DIAG_ENABLED } from './dev_diag_gate';
import { logMemory } from './mem_probe';

const ENABLED = DIAG_ENABLED;

type Entry = { live: number; total: number; estBytes: number };
const registry = new Map<string, Entry>();
/** Ключи корневых экранов: смена их числа печатает сводку сама (старый экземпляр не размонтировался = утечка дерева). */
const ROOT_SUFFIX = '_instance';

function entryOf(kind: string): Entry {
  let entry = registry.get(kind);
  if (!entry) {
    entry = { live: 0, total: 0, estBytes: 0 };
    registry.set(kind, entry);
  }
  return entry;
}

/** Оценка декодированного размера локальной картинки: ширина × высота × 4 (RGBA). 0 — размер неизвестен (сеть, не число). */
export function estimateDecodedBytes(source: ImageSourcePropType | null | undefined): number {
  if (!source || typeof source !== 'number') return 0;
  try {
    const resolved = RNImage.resolveAssetSource(source);
    return resolved && resolved.width > 0 && resolved.height > 0 ? resolved.width * resolved.height * 4 : 0;
  } catch (error) {
    console.warn('[MEM-HOME] estimate failed', error instanceof Error ? error.message : String(error)); // guard-ok: catch называет причину, dev
    return 0;
  }
}

const mb = (bytes: number): number => Math.round((bytes / 1048576) * 10) / 10;

/** Сводка сейчас: по ключам «живо/всего за процесс» и оценка декодированных МБ живых экземпляров, плюс JS-куча Hermes. */
export function memHomeSummary(trigger: string, extra: Readonly<Record<string, unknown>> = {}): void {
  if (!ENABLED) return;
  const kinds: Record<string, string> = {};
  let liveBytes = 0;
  registry.forEach((entry, kind) => {
    kinds[kind] = `${entry.live}/${entry.total}${entry.estBytes > 0 ? ` ~${mb(entry.estBytes)}MB` : ''}`;
    liveBytes += entry.estBytes;
  });
  console.log('[MEM-HOME]', trigger, JSON.stringify({ kinds, liveDecodedMb: mb(liveBytes), ...extra })); // guard-ok: строка на событие, dev
  logMemory(`mem_home:${trigger}`);
}

/** Регистрирует экземпляр; возвращает отмену. Печатает сводку, когда меняется число корневых экранов (`*_instance`). */
export function memHomeRegister(kind: string, estBytes = 0): () => void {
  if (!ENABLED) return () => undefined;
  const entry = entryOf(kind);
  entry.live += 1;
  entry.total += 1;
  entry.estBytes += estBytes;
  if (kind.endsWith(ROOT_SUFFIX)) memHomeSummary(`${kind}:mount`);
  return () => {
    const current = entryOf(kind);
    current.live = Math.max(0, current.live - 1);
    current.estBytes = Math.max(0, current.estBytes - estBytes);
    if (kind.endsWith(ROOT_SUFFIX)) memHomeSummary(`${kind}:unmount`);
  };
}

/** Хук: экземпляр живёт, пока компонент смонтирован. `estBytes` — оценка декода (см. estimateDecodedBytes). */
export const useMemHomeRegister: (kind: string, estBytes?: number) => void = ENABLED
  ? (kind, estBytes = 0) => {
      useEffect(() => memHomeRegister(kind, estBytes), [kind, estBytes]);
    }
  : () => undefined;

/** Хук для картинок: оценка декода считается ТОЛЬКО в dev, внутри эффекта (в релизе ни вызова resolveAssetSource, ни реестра). */
export const useMemHomeRegisterSources: (kind: string, ...sources: readonly (ImageSourcePropType | null | undefined)[]) => void = ENABLED
  ? (kind, ...sources) => {
      // eslint-disable-next-line react-hooks/exhaustive-deps -- набор источников задан вызывающим; число аргументов постоянно
      useEffect(() => memHomeRegister(kind, sources.reduce<number>((sum, source) => sum + estimateDecodedBytes(source), 0)), [kind, ...sources]);
    }
  : () => undefined;

export function resetMemHomeProbeForTests(): void {
  registry.clear();
}
