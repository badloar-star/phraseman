"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const source = fs_1.default.readFileSync(path_1.default.join(__dirname, 'premium_expiry_cron.ts'), 'utf8');
const sweepSource = source.slice(source.indexOf('export async function sweepExpiredPremium'), source.indexOf('export const premiumExpiryCron'));
describe('premium expiry cron Phase 2 CAS safety (RED)', () => {
    it('re-reads each candidate in a transaction before applying expiration', () => {
        expect(sweepSource).toContain('db.runTransaction(async (tx) =>');
        expect(sweepSource).toContain('const current = await tx.get(doc.ref)');
        expect(sweepSource).toContain('planExpiryDeactivation(currentProgress, now)');
        expect(sweepSource).not.toContain('doc.ref\n          .set');
    });
    it('uses canonical lineage/version CAS so a concurrent renewal wins over the stale sweep', () => {
        expect(sweepSource).toContain('premium_rc_active_lineage');
        expect(sweepSource).toContain('premium_rc_expiry_ms');
        expect(sweepSource).toContain('if (!samePremiumAuthority(scannedProgress, currentProgress)) return');
    });
    it('checks deletion denial inside the transaction and never recreates a deleted user', () => {
        expect(sweepSource).toContain('ACCOUNT_DELETE_TOMBSTONES');
        expect(sweepSource).toContain('ACCOUNT_DELETE_PERMANENT_DENIALS');
        expect(sweepSource).toContain('tx.update(doc.ref');
        expect(sweepSource).not.toContain('tx.set(doc.ref');
    });
});
//# sourceMappingURL=premium_expiry_phase2_cas.test.js.map