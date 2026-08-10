// ═══════════════════════════════════════════════════════════════════════════
// league_residents.ts — подселение синтетических «жителей» в комнаты лиг.
//
// зачем (владелец, 2026-08-04): владелец увидел свою лигу с надписью
// «1 участник» и «Упс, ты здесь один». Полупустые комнаты убивают весь смысл
// соревнования. Жители дозаполняют комнату до 28 видимых, живут своей жизнью
// (опыт, уровень и аватар растут каждые 6 часов) и выглядят как обычные игроки.
//
// ВАЖНО про историю: предыдущая попытка (league_ghosts.ts, снесена коммитом
// 6fcb87159) была намертво пришита к «сводному пулу» — общей комнате для ВСЕХ
// лиг сразу. Владелец эту затею отдельно и категорично отверг. Здесь пула нет
// и не будет: жители подселяются в ОБЫЧНЫЕ личные комнаты league_groups,
// каждая лига получает своих. Не воскрешать пул при доработках.
//
// Личность и опыт жителя берутся ТОЛЬКО из synthetic_residents.ts — общего
// реестра, из которого читают и турниры. Поэтому один и тот же ник показывает
// один и тот же опыт, уровень и аватар в обоих режимах (требование владельца).
//
// Честность наград: житель не получает итогов недели, не повышается, не
// понижается и не может забрать корону сундука — это соперник на экране, а не
// в наградах. Его опыт при этом ЗАСЧИТЫВАЕТСЯ в общую цель недели (явное
// решение владельца 2026-08-04).
// ═══════════════════════════════════════════════════════════════════════════

import {
  RESIDENT_SLOT_COUNT,
  residentHash,
  residentProfileAt,
  residentXpGainedBetween,
} from './synthetic_residents';

/**
 * Префикс uid жителя. По нему житель отличается от живого игрока ВЕЗДЕ:
 * в финализации, в сундуке, в клиенте. Живой uid таким быть не может —
 * Firebase Auth не выдаёт идентификаторы с таким префиксом.
 */
export const RESIDENT_UID_PREFIX = 'res_';

/**
 * Порог включения (владелец 2026-08-04): «во всех лигах где игроков меньше
 * чем 15 добавлять жителей». В комнатах, где живых 15 и больше, жителей нет
 * вовсе — там уже есть настоящее соревнование.
 */
export const RESIDENT_FILL_THRESHOLD = 15;

/**
 * До скольки видимых участников дозаполняем. Владелец просил «до 30», но
 * выбрал вариант с запасом: 28 — чтобы вошедшему живому игроку всегда было
 * место и его не приходилось втискивать, вытесняя жителя прямо в момент входа.
 */
export const RESIDENT_TARGET_VISIBLE = 28;

/** Жёсткий предел комнаты — совпадает с GROUP_SIZE в league_groups.ts. */
export const LEAGUE_GROUP_SIZE = 30;

type MemberRecord = Record<string, unknown>;
type MembersMap = Record<string, MemberRecord>;

/** Житель ли это участник комнаты — единственная точка правды. */
export function isResidentUid(uid: string): boolean {
  return typeof uid === 'string' && uid.startsWith(RESIDENT_UID_PREFIX);
}

/** Житель ли эта запись участника: по uid либо по явной метке. */
export function isResidentMember(uid: string, member: MemberRecord | undefined): boolean {
  if (isResidentUid(uid)) return true;
  return member?.isResident === true;
}

/** Живые участники комнаты (скрытые дубликаты не считаются). */
export function countLiveMembers(members: MembersMap | undefined | null): number {
  return Object.entries(members || {}).filter(
    ([uid, member]) => !isResidentMember(uid, member) && member?.identityHidden !== true,
  ).length;
}

/** Все видимые участники — живые плюс жители. */
export function countVisibleMembers(members: MembersMap | undefined | null): number {
  return Object.entries(members || {}).filter(
    ([, member]) => member?.identityHidden !== true,
  ).length;
}

/** uid жителя: стабилен для пары (комната, слот) — житель не «перепрыгивает». */
export function residentUid(groupId: string, slot: number): string {
  return `${RESIDENT_UID_PREFIX}${String(slot).padStart(2, '0')}`;
}

/**
 * Какой персонаж реестра занимает данный слот в данной комнате.
 *
 * зачем: комнат много, а корпус имён один. Смещение по хэшу groupId даёт
 * каждой комнате свой набор «лиц» — иначе владелец увидел бы одинаковый
 * список соседей во всех лигах сразу. Шаг 7 взаимно прост с размером корпуса,
 * поэтому внутри комнаты имена не повторяются.
 */
export function residentIndexForSlot(groupId: string, slot: number): number {
  // зачем непрерывный блок (замеры на боевых 2026-08-04): шаг 7 по кругу
  // «размазывал» набор по всему корпусу, и две комнаты получали 24 общих
  // персонажа из 28 — соседние лиги выглядели копиями. Непрерывный блок от
  // смещения разводит комнаты: наборы пересекаются только там, где блоки
  // реально накладываются.
  //
  // Смещение берётся по ВСЕМУ корпусу (RESIDENT_SLOT_COUNT), а не по числу
  // комнат: замер на 40 комнатах при 100 слотах давал 13 пар с ПОЛНЫМ
  // совпадением состава. Разнесение смещений — единственное, что реально
  // разводит большое число комнат.
  const offset = residentHash(`${groupId}:residents`) % RESIDENT_SLOT_COUNT;
  return (offset + slot) % RESIDENT_SLOT_COUNT;
}

/**
 * Запись жителя для документа комнаты. Поля один в один как у живого
 * участника — клиент рисует его штатным кодом и ничего не подозревает.
 * Метка isResident нужна серверу (финализация, сундук) и клиенту (заявка в
 * друзья, которая никуда не уходит).
 */
export function buildResidentMember(
  groupId: string,
  slot: number,
  weekStartMs: number,
  nowMs: number,
): MemberRecord {
  const index = residentIndexForSlot(groupId, slot);
  const profile = residentProfileAt(index, nowMs);
  return {
    uid: residentUid(groupId, slot),
    name: profile.name,
    // Очки НЕДЕЛИ, а не весь опыт: в таблице лиги соревнуются недельным
    // приростом. Житель, показавший весь свой опыт, мгновенно выдал бы себя.
    points: residentWeeklyPoints(index, weekStartMs, nowMs),
    totalXp: profile.totalXp,
    avatar: profile.avatar,
    frame: null,
    aura: null,
    profileCardLevel: 0,
    profileCardTheme: 'classic',
    profileCardMotion: 'none',
    profileCardPublicFocus: 'balanced',
    isPremium: false,
    isVip: false,
    isLifetime: false,
    streak: profile.streak,
    isResident: true,
  };
}

/** Недельные очки жителя — прирост опыта с начала недели. */
export function residentWeeklyPoints(index: number, weekStartMs: number, nowMs: number): number {
  return residentXpGainedBetween(index, weekStartMs, nowMs);
}

/**
 * Дозаполняет комнату жителями. Никогда не удаляет живых и не трогает их
 * записи. Идемпотентно: слоты детерминированы, повторный вызов даёт тот же
 * состав, только с обновлёнными очками.
 *
 * Возвращает новую карту участников (иммутабельно — правило владельца).
 */
export function fillRoomWithResidents(
  members: MembersMap | undefined | null,
  groupId: string,
  weekStartMs: number,
  nowMs: number,
): MembersMap {
  const current: MembersMap = { ...(members || {}) };
  const live = countLiveMembers(current);

  // Порог владельца: где живых 15+, жителей не добавляем вовсе.
  if (live >= RESIDENT_FILL_THRESHOLD) return current;

  const result: MembersMap = { ...current };
  // Комната не может стать больше жёсткого лимита даже при всплеске живых.
  const target = Math.min(RESIDENT_TARGET_VISIBLE, LEAGUE_GROUP_SIZE);
  for (let slot = 0; slot < target; slot++) {
    if (countVisibleMembers(result) >= target) break;
    const uid = residentUid(groupId, slot);
    if (result[uid]) continue;
    result[uid] = buildResidentMember(groupId, slot, weekStartMs, nowMs);
  }
  return result;
}

/**
 * Обновляет очки и профиль уже подселённых жителей на момент nowMs.
 * Живых не трогает — это принципиально: любой их пересчёт здесь означал бы
 * гонку с реальным начислением опыта.
 */
export function refreshResidents(
  members: MembersMap | undefined | null,
  groupId: string,
  weekStartMs: number,
  nowMs: number,
): MembersMap {
  const result: MembersMap = {};
  for (const [uid, member] of Object.entries(members || {})) {
    if (!isResidentMember(uid, member)) {
      result[uid] = member;
      continue;
    }
    const slot = Number(uid.slice(RESIDENT_UID_PREFIX.length));
    if (!Number.isInteger(slot) || slot < 0) {
      result[uid] = member; // непонятный житель из легаси-данных — не трогаем
      continue;
    }
    result[uid] = buildResidentMember(groupId, slot, weekStartMs, nowMs);
  }
  return result;
}

/**
 * Убирает жителей из карты участников — только для перечня ПОЛУЧАТЕЛЕЙ наград.
 * В ранге, total и зонах перехода жители участвуют; этой функцией их до подсчёта не фильтровать.
 */
export function withoutResidents(members: MembersMap | undefined | null): MembersMap {
  const result: MembersMap = {};
  for (const [uid, member] of Object.entries(members || {})) {
    if (isResidentMember(uid, member)) continue;
    result[uid] = member;
  }
  return result;
}
