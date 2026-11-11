/**
 * Мои уровни навыков для других людей — чтение хранилища навыков и запись skills_public_v1 на телефоне.
 *
 * зачем (владелец 11.11.2026, D207; закон «телефон решает и выдаёт сразу, сервер только хранит записи»): отдельной записи в
 * облако нет. Ключ едет в users/{uid}.progress склеенным патчем синхронизации (друзья), а при визитке «Про» те же шесть чисел
 * добавляются в уже существующий вызов публичного профиля (app/public_profile_snapshot.ts). Правило «только при изменении
 * уровня и не чаще раза в сутки» — nextSkillPublicRecord. Свои навыки на своём экране читаются из хранилища навыков, не отсюда.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import { nextSkillPublicRecord, parseSkillPublicRecord, SKILLS_PUBLIC_STORAGE_KEY } from '../modules/skills/skill_public_record';
import { refreshSkills } from '../modules/skills/skill_store';
import { skillLevelsFromTotals } from '../modules/skills/skill_visibility';
import { syncToCloud } from './cloud_sync';
import { getLocalDayKey } from './local_date';

const LOG = '[SKILLS-PUBLIC]';

function errText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Обновить запись и вернуть шесть уровней, которые сейчас показываются другим. Никогда не бросает:
 * `null` — уровней нет (сбой чтения или сменился аккаунт), вызывающий просто не добавляет их в отправку.
 * `isCurrent` — проверка «аккаунт тот же»: после смены аккаунта запись прежнего игрока не пишется.
 */
export async function refreshMySkillPublicLevels(isCurrent: () => boolean): Promise<readonly number[] | null> {
  try {
    const [state, raw] = await Promise.all([refreshSkills(), AsyncStorage.getItem(SKILLS_PUBLIC_STORAGE_KEY)]);
    if (!isCurrent()) {
      console.log(`${LOG} refresh:skip ${JSON.stringify({ reason: 'account_changed' })}`); // guard-ok: ранний выход называет причину
      return null;
    }
    const parsed = parseSkillPublicRecord(raw);
    if (parsed.problem !== null && parsed.problem !== 'empty') {
      console.warn(`${LOG} refresh:broken_record ${JSON.stringify({ problem: parsed.problem, action: 'recreate' })}`); // guard-ok: ветка решения с причиной
    }
    const step = nextSkillPublicRecord(parsed.record, skillLevelsFromTotals(state.totals), getLocalDayKey());
    if (!step.changed) return step.record.levels;
    await AsyncStorage.setItem(SKILLS_PUBLIC_STORAGE_KEY, JSON.stringify(step.record));
    // зачем: запись уходит друзьям общим патчем синхронизации — отдельного похода в сеть за уровнями нет
    void syncToCloud();
    console.log(`${LOG} refresh:written ${JSON.stringify({ reason: step.reason, day: step.record.day, levels: step.record.levels })}`); // guard-ok: одна строка на изменение, не чаще раза в сутки
    return step.record.levels;
  } catch (error) {
    console.warn(`${LOG} refresh:failed ${JSON.stringify({ error: errText(error), action: 'levels_not_sent' })}`); // guard-ok: catch пишет причину
    return null;
  }
}

/* expo-router: служебный модуль, не экран. */
export default function __RouteShim() { return null; }
