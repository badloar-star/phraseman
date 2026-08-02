import fs from 'node:fs';
import path from 'node:path';

/**
 * Сторож правил Firestore для СНЕСЁННЫХ агентных слоёв.
 *
 * зачем этот тест пережил снос кода (Р4, 2026-08-02): сам код
 * agent_office/agent_manager удалён, но их коллекции в Firestore могли
 * остаться с данными. Правила `allow read, write: if false` обязаны
 * действовать вечно — иначе снос кода тихо ОТКРЫЛ бы старые агентные
 * данные браузеру. Раньше этот тест лежал ВНУТРИ удаляемой папки
 * (agent_office/firestore_rules.test.ts) — удалив её целиком, я снёс бы
 * и защиту, и никто бы не заметил. Поэтому он перенесён сюда.
 */

const root = path.resolve(__dirname, '../../..');
const rules = fs.readFileSync(path.join(root, 'firestore.rules'), 'utf8');

const SERVER_ONLY_COLLECTIONS = [
  // Токены approval Джарвиса: даже чтение помогло бы подбору nonce.
  'jarvis_approval_tokens',
  'agent_cases',
  'agent_recommendations',
  'agent_approvals',
  'agent_tasks',
  'agent_audit_events',
  'agent_office_control',
  'agent_telegram_tokens',
  'agent_observation_receipts',
  'agent_manager_agents',
  'agent_manager_tasks',
  'agent_manager_task_events',
  'agent_manager_approvals',
  'agent_manager_execution_jobs',
  'agent_manager_inbox_links',
  'agent_manager_telegram_tokens',
  'agent_manager_telegram_publication_receipts',
  'agent_manager_local_runner_pairings',
  'agent_manager_local_runner_capabilities',
  'agent_manager_local_runner_leases',
  'agent_manager_support_draft_operations',
] as const;

describe('Legacy agent collections stay closed to clients even after the code was removed', () => {
  test.each(SERVER_ONLY_COLLECTIONS)('%s explicitly denies every client read and write', (collection) => {
    expect(rules).toMatch(new RegExp(
      `match\\s+\\/${collection}\\/\\{[^}]+\\}\\s*\\{[\\s\\S]*?allow\\s+read\\s*,\\s*write\\s*:\\s*if\\s+false\\s*;[\\s\\S]*?\\}`,
    ));
  });

  test('the legacy admin catch-all still excludes every retired agent root', () => {
    expect(rules).toContain('match /{collection}/{document=**}');
    SERVER_ONLY_COLLECTIONS.forEach((collection) => {
      expect(rules).toContain(`collection != '${collection}'`);
    });
  });
});

describe('New Jarvis collections are equally closed to direct client access', () => {
  // зачем: новый слой обязан наследовать то же правило — данные решений,
  // истории бизнеса и агрегата уроков читаются ТОЛЬКО через callable.
  const JARVIS_COLLECTIONS = ['business_tier_history', 'business_tier_peak', 'lesson_stats'] as const;

  test.each(JARVIS_COLLECTIONS)('%s is not readable straight from the browser', (collection) => {
    const hasExplicitDeny = new RegExp(
      `match\\s+\\/${collection}\\/\\{[^}]+\\}\\s*\\{[\\s\\S]*?allow\\s+read\\s*,\\s*write\\s*:\\s*if\\s+false\\s*;[\\s\\S]*?\\}`,
    ).test(rules);
    const excludedFromCatchAll = rules.includes(`collection != '${collection}'`);
    expect(hasExplicitDeny || excludedFromCatchAll).toBe(true);
  });
});
