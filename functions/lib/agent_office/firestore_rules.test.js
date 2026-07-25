"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const root = node_path_1.default.resolve(__dirname, '../../..');
const rules = node_fs_1.default.readFileSync(node_path_1.default.join(root, 'firestore.rules'), 'utf8');
const indexes = JSON.parse(node_fs_1.default.readFileSync(node_path_1.default.join(root, 'firestore.indexes.json'), 'utf8'));
const SERVER_ONLY_COLLECTIONS = [
    'agent_cases',
    'agent_recommendations',
    'agent_approvals',
    'agent_tasks',
    'agent_audit_events',
    'agent_office_control',
    'agent_telegram_tokens',
    'agent_observation_receipts',
];
describe('Agent Office Firestore client denial contract', () => {
    test.each(SERVER_ONLY_COLLECTIONS)('%s explicitly denies every client read and write', (collection) => {
        expect(rules).toMatch(new RegExp(`match\\s+\\/${collection}\\/\\{[^}]+\\}\\s*\\{[\\s\\S]*?allow\\s+read\\s*,\\s*write\\s*:\\s*if\\s+false\\s*;[\\s\\S]*?\\}`));
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
//# sourceMappingURL=firestore_rules.test.js.map