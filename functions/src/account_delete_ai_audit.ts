import * as admin from 'firebase-admin';
import { defineSecret } from 'firebase-functions/params';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { ENFORCE_APP_CHECK } from './callable_options';
import { hasPermission, type AdminPermission } from './admin/permissions';
import { hasAdminRole, type AdminRole } from './admin/roles';
import { openAiChat } from './explain/explain_provider';
import { ACCOUNT_DELETE_JOBS } from './account_delete_job';

/*
 * ИИ-аудитор удалённых аккаунтов (владелец, 2026-08-31).
 *
 * зачем именно аудитор, а не исполнитель: владелец предложил «поставь ИИ, чтобы
 * он собрал все данные профиля и удалил их». Само удаление ИИ доверять нельзя —
 * он недетерминирован (пропустит коллекцию или снесёт лишнее), стоит денег на
 * каждом аккаунте и потребовал бы отправки персональных данных в OpenAI, что
 * противоречит политике конфиденциальности. Удаляет проверенный воркер
 * (15 стадий, диагностика, пульс), а ИИ делает то, в чём силён: смотрит на
 * КАРТУ базы и говорит, где мог остаться хвост, который воркер не знает.
 *
 * Приватность: наружу уходят ТОЛЬКО имена коллекций и числа. Ни одного uid,
 * email или значения пользовательских полей — физически нечего утечь.
 */

const REGION = 'us-central1';
const OPENAI_API_KEY = defineSecret('OPENAI_API_KEY');
const MODEL = 'gpt-4o-mini';
const MAX_COLLECTIONS = 200;

type Row = Record<string, unknown>;

function requireAudit(request: { auth?: { uid?: string; token?: Row } | null }): void {
  if (request.auth?.token?.admin !== true || !String(request.auth.uid ?? '').trim()) {
    throw new HttpsError('permission-denied', 'Admin only');
  }
  const claimedRole = request.auth.token.adminRole;
  const role: AdminRole = hasAdminRole(claimedRole) ? claimedRole : 'admin';
  const permission: AdminPermission = 'diagnostics.read';
  if (!hasPermission(role, permission)) {
    throw new HttpsError('permission-denied', `Role cannot use ${permission}`);
  }
}

/**
 * Сверяет карту базы с тем, что реально чистит воркер удаления.
 *
 * Возвращает список коллекций-подозреваемых с объяснением — владелец решает,
 * дописывать ли их в план удаления. Ничего не удаляет и не советует удалять
 * автоматически: только показывает, куда посмотреть.
 */
export const adminAuditAccountDeleteCoverage = onCall(
  { region: REGION, enforceAppCheck: ENFORCE_APP_CHECK, timeoutSeconds: 120, memory: '512MiB', secrets: [OPENAI_API_KEY] },
  async (request) => {
    requireAudit(request as { auth?: { uid?: string; token?: Row } });
    const db = admin.firestore();

    // 1. Карта базы: только ИМЕНА коллекций верхнего уровня.
    const collections = (await db.listCollections())
      .map((ref) => ref.id)
      .sort()
      .slice(0, MAX_COLLECTIONS);

    // 2. Что план удаления знает сегодня — читаем прямо из исходника плана,
    //    чтобы аудит не разошёлся с реальностью при следующей правке.
    const { accountDeleteQueryPlan, accountDeleteCollectionGroupPlan, accountDeleteDirectDocumentPlan } =
      await import('./account_delete');
    const covered = new Set<string>();
    for (const spec of accountDeleteQueryPlan('probe-stable', 'probe-auth')) covered.add(spec.collection);
    for (const spec of accountDeleteCollectionGroupPlan('probe-stable', 'probe-auth')) covered.add(spec.collectionGroup);
    for (const spec of accountDeleteDirectDocumentPlan('probe-stable', 'probe-auth')) covered.add(spec.collection);

    const unknown = collections.filter((name) => !covered.has(name));

    // 3. Сколько заявок ждёт своего срока — контекст для отчёта.
    const pending = await db.collection(ACCOUNT_DELETE_JOBS)
      .where('status', '==', 'queued').limit(1).get();

    const prompt = [
      'Ты аудитор приватности мобильного приложения для изучения языков.',
      'Ниже два списка имён коллекций Firestore: которые чистятся при удалении аккаунта и которые НЕ упомянуты в плане удаления.',
      'Твоя задача: назвать те неупомянутые коллекции, которые ПО ИМЕНИ похожи на хранилище персональных данных пользователя (прогресс, профиль, сообщения, покупки, устройства, аудио).',
      'Игнорируй коллекции, которые по имени очевидно являются контентом приложения, конфигурацией, справочниками, кэшем, служебной телеметрией или админскими журналами.',
      'Ответь строго JSON: {"suspects":[{"collection":"имя","why":"одна фраза по-русски","confidence":"high|medium|low"}],"summary":"одно предложение по-русски"}.',
      '',
      `ЧИСТИТСЯ (${covered.size}): ${[...covered].sort().join(', ')}`,
      '',
      `НЕ УПОМЯНУТО (${unknown.length}): ${unknown.join(', ')}`,
    ].join('\n');

    const result = await openAiChat({
      apiKey: OPENAI_API_KEY.value(),
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      // Потолок скромный: ответ — короткий JSON со списком имён.
      maxTokens: 900,
      temperature: 0,
      responseFormat: { type: 'json_object' },
    }).catch((e: unknown) => {
      // зачем (запрет немого catch): аудит не критичен для работы приложения,
      // но его отказ обязан быть виден в панели, а не проглочен.
      console.warn(JSON.stringify({
        event: 'account_delete_ai_audit_failed',
        message: String((e as { message?: unknown })?.message ?? e).slice(0, 200),
      }));
      return null;
    });

    let suspects: unknown = [];
    let summary = '';
    if (result?.text) {
      try {
        const parsed = JSON.parse(result.text) as { suspects?: unknown; summary?: unknown };
        suspects = Array.isArray(parsed.suspects) ? parsed.suspects.slice(0, 30) : [];
        summary = typeof parsed.summary === 'string' ? parsed.summary.slice(0, 400) : '';
      } catch (e) {
        console.warn(JSON.stringify({
          event: 'account_delete_ai_audit_parse_failed',
          message: String((e as { message?: unknown })?.message ?? e).slice(0, 160),
        }));
      }
    }

    return {
      generatedAtMs: Date.now(),
      collectionsTotal: collections.length,
      coveredCount: covered.size,
      unknownCount: unknown.length,
      pendingDeletes: pending.size,
      suspects,
      summary,
      aiAvailable: Boolean(result?.text),
    };
  },
);
