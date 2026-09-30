/**
 * зачем: D108 — ауры (купленные, наградные, Plus/Pro) удалены решением владельца:
 * везде показывается только монета-аватар ранга. Каталог, цены и выдача удалены.
 *
 * Модуль остаётся ТОЛЬКО потому, что экраны сессии «Дизайн»
 * (app/(tabs)/home.tsx, app/(tabs)/friends.tsx) ещё импортируют эти имена.
 * Любая сохранённая аура теперь нормализуется в «нет ауры». Когда «Дизайн»
 * уберёт ауру с Главной и из Друзей — удалить файл целиком (D78).
 */
export { USER_AVATAR_AURA_KEY } from './customization_storage_keys';

export function normalizeAvatarAuraId(id?: string | null): string | undefined {
  void id;
  return undefined;
}

export function getEffectiveAvatarAuraId(
  id?: string | null,
  isPremium?: boolean,
  isVip?: boolean,
  isPro?: boolean,
  devOwnerStableId?: string | null,
): string | undefined {
  void id; void isPremium; void isVip; void isPro; void devOwnerStableId;
  return undefined;
}
