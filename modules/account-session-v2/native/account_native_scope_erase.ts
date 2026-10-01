import type { ScopeEraseEvidence } from '../account_scope_store';
import {
  classifyV2EraseReadback,
  planV2Retirement,
  type AccountNativeStorageManifest,
  type ArtifactReadback,
  type V2StoragePlan,
} from '../native_storage_manifest';
import {
  ACCOUNT_V2_LOG as LOG,
  AccountNativeScopeAdapterError,
  artifactSelector,
  databaseFamilySelectors,
  encodeLineage,
  kindOf,
  planFor,
  readLineageRecord,
  type AccountNativeEnvironment,
  type AccountScopeValue,
} from './account_native_environment';

/*
 * Account V2, Пакет 6C (TG-88837487B247) — стирание закрытой области на телефоне.
 *
 * зачем: порядок ровно по пакету нативного хранилища (§5, «Restartable erase»):
 *  1) метка вывода из строя (scopeKey + старая/новая линия) пишется и сверяется ДО всего;
 *  2) линия → {old+1, erased_empty} — повторное открытие получит новую пустую базу;
 *  3) ключ SQLCipher старой линии удаляется и проверяется отсутствие;
 *  4) удаляются main/-wal/-shm/-journal, проверяется отсутствие каждого;
 *  5) метка снимается ПОСЛЕДНЕЙ. Падение до этого шага → следующий запуск
 *     найдёт метку и продолжит с того же места (повтор безопасен).
 * Ничего не стёрлось/не проверилось → бросаем: защёлка удаления остаётся и
 * стирание повторится. Области, где V2 ничего не создавал, — `already_absent`
 * без единой записи (ревью 6B, P2: uid, накопленные без хранилища).
 */

type RetirementMarker = Readonly<{ scopeKey: `account:${string}`; oldLineage: number; nextLineage: number }>;

export function parseRetirementMarker(raw: string | null): RetirementMarker | null {
  if (raw === null) return null;
  try {
    const parsed = JSON.parse(raw) as {
      v?: unknown; scopeKey?: unknown; oldLineage?: unknown; nextLineage?: unknown;
    };
    if (parsed.v === 1 && typeof parsed.scopeKey === 'string' && /^account:\S.*$/.test(parsed.scopeKey)
      && parsed.scopeKey.trim() === parsed.scopeKey
      && Number.isSafeInteger(parsed.oldLineage) && (parsed.oldLineage as number) > 0
      && parsed.nextLineage === (parsed.oldLineage as number) + 1) {
      return Object.freeze({
        scopeKey: parsed.scopeKey as `account:${string}`,
        oldLineage: parsed.oldLineage as number,
        nextLineage: parsed.nextLineage as number,
      });
    }
  } catch (error) {
    console.warn(`${LOG} erase marker_parse_failed kind=${kindOf(error)}`);
    return null;
  }
  console.warn(`${LOG} erase marker_shape_invalid`);
  return null;
}

function fail(code: string): never {
  throw new AccountNativeScopeAdapterError(code);
}

export function createAccountNativeScopeEraser(
  env: AccountNativeEnvironment,
  manifest: AccountNativeStorageManifest,
) {
  const markerTemplate = manifest.artifacts.find((artifact) => artifact.id === 'v2.account.retirement_marker');
  if (markerTemplate === undefined) fail('account_native_scope_manifest_invalid');

  const writeVerified = async (selector: string, value: string, code: string): Promise<void> => {
    await env.secure.set(selector, value);
    if (await env.secure.get(selector) !== value) fail(code);
  };

  const removeVerified = async (selector: string, code: string): Promise<void> => {
    await env.secure.remove(selector);
    if (await env.secure.get(selector) !== null) fail(code);
  };

  const familyPresent = async (plan: V2StoragePlan): Promise<readonly boolean[]> => (
    Promise.all(databaseFamilySelectors(plan).map((name) => env.fileExists(name)))
  );

  /** Ничего V2 для этой линии нет: ни ключа, ни файлов. */
  const isEmpty = async (plan: V2StoragePlan): Promise<boolean> => {
    const key = await env.secure.get(artifactSelector(plan, 'v2.account.key'));
    return key === null && !(await familyPresent(plan)).some(Boolean);
  };

  const readback = async (plan: V2StoragePlan): Promise<readonly ArtifactReadback[]> => {
    const observations: ArtifactReadback[] = [];
    for (const artifact of plan.artifacts) {
      if (artifact.id === 'v2.account.lineage') {
        const lineage = await readLineageRecord(env.secure, artifact.selector);
        observations.push(lineage.kind === 'stored'
          ? { id: 'v2.account.lineage', selector: artifact.selector, state: 'lineage', value: lineage.value, lineageState: lineage.state }
          : { id: artifact.id, selector: artifact.selector, state: lineage.kind === 'absent' ? 'absent' : 'unreadable' });
      } else if (artifact.medium === 'secure_store') {
        const present = await env.secure.get(artifact.selector) !== null;
        observations.push({ id: artifact.id, selector: artifact.selector, state: present ? 'present' : 'absent' });
      } else {
        const present = await env.fileExists(artifact.selector);
        observations.push({ id: artifact.id, selector: artifact.selector, state: present ? 'present' : 'absent' });
      }
    }
    return observations;
  };

  /** Шаги 2–5 при уже записанной метке. Повторяемы с любого места. */
  const retire = async (plan: V2StoragePlan, markerSelector: string): Promise<void> => {
    const retirement = planV2Retirement(plan.identity);
    if (retirement.nextPersistentLineage === null) fail('account_native_scope_erase_lineage_exhausted');
    await writeVerified(
      artifactSelector(plan, 'v2.account.lineage'),
      encodeLineage(retirement.nextPersistentLineage, 'erased_empty'),
      'account_native_scope_erase_lineage_failed',
    );
    await removeVerified(artifactSelector(plan, 'v2.account.key'), 'account_native_scope_erase_key_failed');
    for (const name of databaseFamilySelectors(plan)) {
      if (await env.fileExists(name)) await env.deleteFile(name);
    }
    if ((await familyPresent(plan)).some(Boolean)) fail('account_native_scope_erase_family_residue');
    await removeVerified(markerSelector, 'account_native_scope_erase_marker_failed');
    const verdict = classifyV2EraseReadback(manifest, plan, await readback(plan));
    if (verdict.outcome !== 'v2_scope_absent_model') {
      console.warn(`${LOG} erase readback outcome=${verdict.outcome} remaining=${verdict.remainingIds.length}`);
      fail('account_native_scope_erase_readback_failed');
    }
  };

  const evidence = (scope: AccountScopeValue, outcome: 'erased' | 'already_absent'): ScopeEraseEvidence => (
    Object.freeze({
      scopeKey: scope.scopeKey,
      outcome,
      evidenceKind: 'native_manifest' as const,
      // зачем: файл удаляется целиком, записи поштучно не считаются — честный ноль, а не выдумка.
      erasedRecordCount: 0,
      manifestVersion: manifest.manifestVersion,
    })
  );

  const erase = async (scope: AccountScopeValue): Promise<ScopeEraseEvidence> => {
    const base = await planFor(manifest, scope, 1, env.digestSha256);
    const markerSelector = artifactSelector(base, 'v2.account.retirement_marker');
    const marker = parseRetirementMarker(await env.secure.get(markerSelector));
    if (marker !== null && marker.scopeKey !== scope.scopeKey) fail('account_native_scope_erase_marker_foreign');
    let lineage: number;
    if (marker !== null) {
      lineage = marker.oldLineage;
      console.log(`${LOG} erase resume_from_marker lineage=${lineage}`);
    } else {
      const stored = await readLineageRecord(env.secure, artifactSelector(base, 'v2.account.lineage'));
      if (stored.kind === 'unreadable' || stored.kind === 'malformed') fail(`account_native_scope_erase_lineage_${stored.kind}`);
      lineage = stored.kind === 'stored' ? stored.value : 1;
      const plan = await planFor(manifest, scope, lineage, env.digestSha256);
      const nothingCreated = stored.kind === 'absent' || (stored.kind === 'stored' && stored.state === 'erased_empty');
      if (nothingCreated && await isEmpty(plan)) {
        console.log(`${LOG} erase already_absent lineageKind=${stored.kind}`);
        return evidence(scope, 'already_absent');
      }
      await writeVerified(
        markerSelector,
        JSON.stringify({
          v: 1, scopeKey: scope.scopeKey, oldLineage: lineage, nextLineage: lineage + 1,
          manifestVersion: manifest.manifestVersion,
        }),
        'account_native_scope_erase_marker_failed',
      );
    }
    const plan = await planFor(manifest, scope, lineage, env.digestSha256);
    const lock = await env.acquireProvisionLock(artifactSelector(plan, 'v2.account.db.main'));
    try {
      await retire(plan, markerSelector);
    } finally {
      try {
        await lock.release();
      } catch (error) {
        console.warn(`${LOG} erase lock_release_failed kind=${kindOf(error)}`);
      }
    }
    console.log(`${LOG} erase done lineage=${lineage} next=${lineage + 1}`);
    return evidence(scope, 'erased');
  };

  return Object.freeze({
    erase,
    markerSelectorForHash: (hash: string): string => markerTemplate.selectorTemplate.replace('{hash}', hash),
  });
}
