// ════════════════════════════════════════════════════════════════════════════
// public_profile_plus_sync.ts — кольцо Plus в публичном профиле после серверного события Plus.
//
// зачем (владелец 21.10 «Plus виден другим»; Ревизор 21.10): public_profiles переписывает приложение только при
// запуске. Подписчик, который продлился и не открывал приложение, потерял бы кольцо до запуска. Поэтому каждое
// серверное изменение Plus (вебхук RevenueCat, крон истечения) после СВОЕЙ успешной записи обновляет
// { isPlus, plusUntilMs } в публичном профиле.
//
// Условия Ревизора:
//  • НЕ внутри денежной транзакции — косметика не имеет права уронить начисление (лишний документ в конфликтном
//    наборе = повторы транзакции и откат вебхука). Только отдельной лучшей попыткой ПОСЛЕ коммита.
//  • Только update: нет профиля — тихий пропуск, пустой обрывок без имени не создаётся физически. 0 чтений.
//  • Ошибка — только в журнал [PLUS-RING] с причиной, без uid.
// ════════════════════════════════════════════════════════════════════════════
import { isRealPlusActive, realPlusUntilMs } from './premium_status';

const LOG = '[PLUS-RING]';

export type PublicProfilePlusPatch = Readonly<{ isPlus: boolean; plusUntilMs: number | null }>;

/** То же правило, что в publicProfileProjectMine: настоящий Plus без вводного доступа; null — Plus нет, 0 — бессрочно. */
export function publicProfilePlusPatch(progress: Readonly<Record<string, unknown>>, nowMs: number): PublicProfilePlusPatch {
  return { isPlus: isRealPlusActive(progress, nowMs), plusUntilMs: realPlusUntilMs(progress, nowMs) };
}

export type PublicProfilePlusSyncResult = 'updated' | 'no_profile' | 'failed';

type ProfileDb = Readonly<{
  collection(name: string): { doc(id: string): { update(data: Record<string, unknown>): Promise<unknown> } };
}>;

function errorCode(error: unknown): string {
  const raw = (error as { code?: unknown })?.code;
  return typeof raw === 'number' || typeof raw === 'string' ? String(raw) : '';
}

/**
 * Лучшая попытка ПОСЛЕ успешной записи Plus. Никогда не бросает: деньги уже записаны, кольцо — косметика.
 * `source` — откуда событие (revenuecat_webhook / premium_expiry_cron …) — для журнала.
 */
export async function syncPublicProfilePlusAfterCommit(input: Readonly<{
  db: ProfileDb;
  stableUid: string;
  progress: Readonly<Record<string, unknown>>;
  nowMs: number;
  source: string;
}>): Promise<PublicProfilePlusSyncResult> {
  const patch = publicProfilePlusPatch(input.progress, input.nowMs);
  if (!input.stableUid) {
    console.warn(LOG, JSON.stringify({ step: 'skip', reason: 'no_stable_uid', source: input.source }));
    return 'failed';
  }
  try {
    await input.db.collection('public_profiles').doc(input.stableUid).update({ ...patch });
    console.log(LOG, JSON.stringify({ step: 'updated', source: input.source, isPlus: patch.isPlus, plusUntilMs: patch.plusUntilMs }));
    return 'updated';
  } catch (error) {
    const code = errorCode(error);
    // NOT_FOUND (5): у человека нет публичного профиля — так и задумано, обрывок не создаём.
    if (code === '5' || code === 'not-found') {
      console.log(LOG, JSON.stringify({ step: 'no_profile', source: input.source }));
      return 'no_profile';
    }
    console.warn(LOG, JSON.stringify({ step: 'failed', source: input.source, code, message: String((error as Error)?.message ?? error).slice(0, 160) }));
    return 'failed';
  }
}
