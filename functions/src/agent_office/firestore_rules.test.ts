import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '../../..');
const rules = fs.readFileSync(path.join(root, 'firestore.rules'), 'utf8');
const indexes = JSON.parse(fs.readFileSync(path.join(root, 'firestore.indexes.json'), 'utf8')) as {
  indexes: Array<{ collectionGroup?: string; fields?: Array<{ fieldPath?: string; order?: string }> }>;
};

const SERVER_ONLY_COLLECTIONS = [
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

describe('Agent Office Firestore client denial contract', () => {
  test.each(SERVER_ONLY_COLLECTIONS)('%s explicitly denies every client read and write', (collection) => {
    expect(rules).toMatch(new RegExp(
      `match\\s+\\/${collection}\\/\\{[^}]+\\}\\s*\\{[\\s\\S]*?allow\\s+read\\s*,\\s*write\\s*:\\s*if\\s+false\\s*;[\\s\\S]*?\\}`,
    ));
  });

  test('the legacy admin catch-all excludes all Agent Office roots', () => {
    expect(rules).toContain('match /{collection}/{document=**}');
    SERVER_ONLY_COLLECTIONS.forEach((collection) => {
      expect(rules).toContain(`collection != '${collection}'`);
    });
  });

  test('recommendation and case-audit queries have focused composite indexes', () => {
    expect(indexes.indexes).toEqual(expect.arrayContaining([
      expect.objectContaining({
        collectionGroup: 'agent_recommendations',
        fields: expect.arrayContaining([
          expect.objectContaining({ fieldPath: 'caseId', order: 'ASCENDING' }),
          expect.objectContaining({ fieldPath: 'revision', order: 'DESCENDING' }),
        ]),
      }),
      expect.objectContaining({
        collectionGroup: 'agent_audit_events',
        fields: expect.arrayContaining([
          expect.objectContaining({ fieldPath: 'caseId', order: 'ASCENDING' }),
          expect.objectContaining({ fieldPath: 'occurredAtMs', order: 'DESCENDING' }),
        ]),
      }),
    ]));
  });
});
