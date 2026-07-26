"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const directory = __dirname;
describe('Admin Plans callable seam', () => {
    test('exports bounded create/get/list callables with App Check and no agent or AI delegation', () => {
        const callables = node_fs_1.default.readFileSync(node_path_1.default.join(directory, 'callables.ts'), 'utf8');
        const moduleIndex = node_fs_1.default.readFileSync(node_path_1.default.join(directory, 'index.ts'), 'utf8');
        const rootIndex = node_fs_1.default.readFileSync(node_path_1.default.join(directory, '..', 'index.ts'), 'utf8');
        expect(callables).toContain('export const adminCreatePlan = onCall(OPTIONS');
        expect(callables).toContain('export const adminGetPlan = onCall(OPTIONS');
        expect(callables).toContain('export const adminListPlans = onCall(OPTIONS');
        expect(callables).toContain('enforceAppCheck: ENFORCE_APP_CHECK');
        expect(moduleIndex).toContain('adminCreatePlan, adminGetPlan, adminListPlans');
        expect(rootIndex).toContain("from './admin_plans'");
        expect(callables).not.toMatch(/agent_office|agent_manager|openai|defineSecret/i);
    });
    test('keeps storage server-only and queryable without a composite index', () => {
        const repository = node_fs_1.default.readFileSync(node_path_1.default.join(directory, 'firestore_repository.ts'), 'utf8');
        expect(repository).toContain("this.firestore.collection('admin_plans')");
        expect(repository).toContain(".orderBy('createdAtMs', 'desc').limit(input.limit)");
        expect(repository).not.toContain('admin_plan_events');
    });
});
//# sourceMappingURL=callables_contract.test.js.map