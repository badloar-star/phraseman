// ═══════════════════════════════════════════════════════════════════════════
// community_tile_props_equal.ts — когда плитку «Сообщества» можно НЕ перерисовывать (шаг B оптимизации плиток, координатор 29.10).
//
// зачем: родитель на каждый рендер собирает плитке новые heart (элемент сердечка), onOpen и onLongPress — обычный memo из-за них никогда бы не сработал,
// и один лайк перерисовывал бы все сто плиток. Здесь сравнивается то, что реально меняет вид плитки: набор, язык, число сердечек, автор-фикстура,
// наличие меню долгого нажатия и ПРОПЫ сердечка (сам элемент сердечка подписан на хранилище и обновляется сам — оптимистичное +1 не теряется).
// onOpen/onLongPress в сравнение не входят: они читают актуальный набор через ref родителя и setState-функцию, устаревшее замыкание безвредно.
// ═══════════════════════════════════════════════════════════════════════════
import React from 'react';

export type CommunityTileComparable = Readonly<{
  pack: unknown;
  lang: string;
  likes: number;
  authorOverride?: unknown;
  referencePlace?: number;
  onLongPress?: unknown;
  heart?: React.ReactNode;
}>;

function sameElement(a: React.ReactNode, b: React.ReactNode): boolean {
  if (a === b) return true;
  if (!React.isValidElement(a) || !React.isValidElement(b)) return false;
  if (a.type !== b.type || a.key !== b.key) return false;
  const left = a.props as Record<string, unknown>;
  const right = b.props as Record<string, unknown>;
  const keys = Object.keys(left);
  if (keys.length !== Object.keys(right).length) return false;
  return keys.every((key) => Object.is(left[key], right[key]));
}

export function communityTilePropsEqual(prev: CommunityTileComparable, next: CommunityTileComparable): boolean {
  return Object.is(prev.pack, next.pack)
    && prev.lang === next.lang
    && prev.likes === next.likes
    && Object.is(prev.authorOverride, next.authorOverride)
    && prev.referencePlace === next.referencePlace
    && Boolean(prev.onLongPress) === Boolean(next.onLongPress)
    && sameElement(prev.heart, next.heart);
}
