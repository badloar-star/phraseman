"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
describe('account deletion tombstone contract', () => {
    const jobSource = fs_1.default.readFileSync(path_1.default.join(__dirname, 'account_delete_job.ts'), 'utf8');
    const rules = fs_1.default.readFileSync(path_1.default.join(__dirname, '../../firestore.rules'), 'utf8');
    it('atomically creates a stable-id tombstone with the durable deletion job', () => {
        expect(jobSource).toContain("export const ACCOUNT_DELETE_TOMBSTONES = 'account_deletion_tombstones'");
        expect(jobSource).toContain('const tombstoneRef = db.collection(ACCOUNT_DELETE_TOMBSTONES).doc(stableUid)');
        expect(jobSource).toContain('tx.set(tombstoneRef');
    });
    it('blocks client recreation and updates of a tombstoned user document', () => {
        expect(rules).toContain('function accountDeletionNotPending(userId) {');
        expect(rules).toContain('account_deletion_tombstones/$(userId)');
        expect(rules).toMatch(/allow update:[^;]*accountDeletionNotPending\(userId\)/);
        expect(rules).toMatch(/allow create:[^;]*accountDeletionNotPending\(userId\)/);
    });
});
//# sourceMappingURL=account_delete_tombstone_contract.test.js.map