/**
 * Помощники по удалённым слоям аур аватара (прогрев кэша, диагностика).
 *
 * зачем: 111 из 117 слоёв колец переехали в Firebase Storage (−2.4 МБ из
 * бинаря, Фаза 4 «Бандл-диеты», решение владельца 2026-08-24). Пользователь
 * при этом НИКОГДА не должен увидеть незагруженное кольцо, поэтому гарантия
 * трёхслойная:
 *   1) ауры подписки (constants/avatar_aura_core_art.ts) лежат в бандле —
 *      офлайн и с первого кадра, сразу после оплаты;
 *   2) остальные слои прогреваются заранее по событиям, а не по таймеру
 *      (app/avatar_aura_art_prefetch.ts): вход в профиль и в студию аватара,
 *      повышение уровня — то есть задолго до того, как ауру можно надеть;
 *   3) если слой всё же не доехал — AvatarAura рисует тихий градиентный ореол
 *      той же геометрии в цвете ауры, а не спиннер и не пустоту.
 *
 * Ключ дискового кэша — сам URL, а он содержит версию арта
 * (AVATAR_AURA_ART_VERSION). Пока версия не сменилась, expo-image отдаёт слой
 * с диска и в сеть не ходит вовсе; смена версии = новый путь = разовая догрузка,
 * при которой старый кэш продолжает показывать кольцо без «дыры».
 */
import {
  getAvatarAuraHdLayerUrl,
  getAvatarAuraLayerUrl,
  type AvatarAuraLayer,
} from '../constants/avatar_aura_image_urls';
import { isCoreAvatarAuraArt } from '../constants/avatar_aura_core_art';

export const AVATAR_AURA_LAYER_NAMES: readonly AvatarAuraLayer[] = ['base', 'flow', 'accents'];

/** Все URL слоёв ауры — для точечного прогрева перед показом. Ядро возвращает []. */
export function avatarAuraLayerUrls(auraId: string): string[] {
  if (isCoreAvatarAuraArt(auraId)) return [];
  const urls: string[] = [];
  for (const layer of AVATAR_AURA_LAYER_NAMES) {
    const url = getAvatarAuraLayerUrl(auraId, layer);
    if (url) urls.push(url);
  }
  return urls;
}

/**
 * URL HD-слоёв (768×768) — только для СВОЕЙ надетой ауры.
 *
 * зачем именно так (владелец 2026-09-14, «апскейл, но вес не раздувать»):
 * фоновый прогрев всего каталога остаётся на 320-px слоях. HD весит 3.96 МБ на
 * все 39 аур, и качать их «на всякий случай» — это трафик и деньги Storage
 * впустую: крупным кольцом человек видит ровно одну ауру, свою. Остальные он
 * встречает в каталоге по 91 pt, где HD не нужен вовсе.
 *
 * Ядро (aura-plus/aura-pro) сюда ВХОДИТ: его 320-px слой лежит в бандле и
 * держит офлайн, а HD — такое же сетевое улучшение, как у прочих аур.
 */
export function avatarAuraHdLayerUrls(auraId: string): string[] {
  return AVATAR_AURA_LAYER_NAMES.map((layer) => getAvatarAuraHdLayerUrl(auraId, layer));
}
