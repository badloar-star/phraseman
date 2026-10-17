/**
 * Имя профиля в общем снимке после восстановления из облака.
 *
 * зачем (координатор 17.10, Сверка 501558120): после выхода и входа тем же аккаунтом экран «Аккаунт» ≥45 с держал
 * «Не задано» — он берёт имя только из снимка, а снимок после восстановления строит лишь Главная (и только при своей
 * гидрации). Восстановление уже положило user_name на диск и прислало cloud_profile_hydrated — здесь это имя доезжает до
 * снимка. Подставляем ТОЛЬКО имя в существующую секцию profile с её же source/updatedAt: так более поздняя гидрация Главной
 * не отвергается правилом «новее», а поля премиума/аватара не подменяются значениями по умолчанию.
 * Лог [ACC-NAME] без самого имени: есть/нет, 8 знаков владельца, решение.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { captureAccountGeneration, isCurrentAccountGeneration } from './account_generation';
import { getAppSnapshot, patchAppSnapshot } from './app_snapshot_store';

export type ProfileNameSyncDecision =
  | 'applied'
  | 'same'
  | 'no_profile_section'
  | 'empty_storage'
  | 'no_owner'
  | 'stale_owner'
  | 'read_failed';

export type ProfileNameSyncResult = Readonly<{ decision: ProfileNameSyncDecision; name: string | null }>;

function logAccName(payload: Record<string, unknown>): void {
  console.log('[ACC-NAME]', JSON.stringify(payload)); // guard-ok: без имени
}

export async function syncSnapshotProfileNameFromStorage(reason: string): Promise<ProfileNameSyncResult> {
  const token = captureAccountGeneration();
  const owner = token.stableId;
  if (!owner || token.phase !== 'active') {
    logAccName({ step: 'sync', reason, decision: 'no_owner', phase: token.phase });
    return { decision: 'no_owner', name: null };
  }
  let stored: string | null;
  try {
    stored = await AsyncStorage.getItem('user_name');
  } catch (error) {
    logAccName({ step: 'sync', reason, decision: 'read_failed', kind: error instanceof Error ? error.name : typeof error });
    return { decision: 'read_failed', name: null };
  }
  if (!isCurrentAccountGeneration(token, owner)) {
    logAccName({ step: 'sync', reason, decision: 'stale_owner', owner: owner.slice(0, 8) });
    return { decision: 'stale_owner', name: null };
  }
  const name = String(stored ?? '').trim();
  const current = getAppSnapshot().profile;
  const base = { step: 'sync', reason, owner: owner.slice(0, 8), storedPresent: Boolean(name), snapshotPresent: Boolean(current?.name), profileSource: current?.source ?? null };
  if (!name) {
    logAccName({ ...base, decision: 'empty_storage' });
    return { decision: 'empty_storage', name: null };
  }
  if (!current) {
    // Секцию не создаём: её поля по умолчанию перебили бы гидрацию Главной. Имя вернём экрану для локального показа.
    logAccName({ ...base, decision: 'no_profile_section' });
    return { decision: 'no_profile_section', name };
  }
  if (current.name === name) {
    logAccName({ ...base, decision: 'same' });
    return { decision: 'same', name };
  }
  patchAppSnapshot((snapshot) => (snapshot.profile ? { profile: { ...snapshot.profile, name } } : {}));
  logAccName({ ...base, decision: 'applied' });
  return { decision: 'applied', name };
}
