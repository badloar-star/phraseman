"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vip_orphan_reconcile_1 = require("./vip_orphan_reconcile");
const NOW = 1700000000000;
const FUTURE = NOW + 7 * 24 * 60 * 60 * 1000; // +7 дней
const FAR_FUTURE = NOW + 30 * 24 * 60 * 60 * 1000; // +30 дней
const PAST = NOW - 1000;
const ORPHAN = 'orphan-stable-id';
describe('vip_orphan_reconcile — авто-перенос осиротевшего VIP на canonical', () => {
    it('переносит активный VIP, когда у canonical VIP нет', () => {
        const orphan = { vip_active: 'true', vip_plan: 'admin_vip', vip_until: String(FUTURE), vip_admin_override: 'true' };
        const d = (0, vip_orphan_reconcile_1.decideVipReconcile)(orphan, {}, NOW, ORPHAN);
        expect(d.kind).toBe('transfer');
        if (d.kind === 'transfer') {
            expect(d.vipPatch.vip_active).toBe('true');
            expect(d.vipPatch.vip_until).toBe(String(FUTURE));
            expect(d.vipPatch.vip_grant_at).toBe(String(NOW)); // для празднования
            expect(d.vipPatch.vip_reconciled_from).toBe(ORPHAN);
        }
    });
    it('бессрочный VIP ("0") переносится', () => {
        const orphan = { vip_active: 'true', vip_plan: 'admin_vip', vip_until: '0' };
        const d = (0, vip_orphan_reconcile_1.decideVipReconcile)(orphan, {}, NOW, ORPHAN);
        expect(d.kind).toBe('transfer');
    });
    it('skip, если у осиротевшего нет активного VIP', () => {
        expect((0, vip_orphan_reconcile_1.decideVipReconcile)({}, {}, NOW, ORPHAN).kind).toBe('skip');
        expect((0, vip_orphan_reconcile_1.decideVipReconcile)({ vip_active: 'true', vip_until: String(PAST) }, {}, NOW, ORPHAN).kind).toBe('skip');
        expect((0, vip_orphan_reconcile_1.decideVipReconcile)({ vip_active: 'true', vip_admin_override: 'false', vip_until: String(FUTURE) }, {}, NOW, ORPHAN).kind).toBe('skip');
    });
    it('extinguish (не откатывает), если у canonical VIP уже не хуже по сроку', () => {
        const orphan = { vip_active: 'true', vip_until: String(FUTURE) };
        const canonical = { vip_active: 'true', vip_until: String(FAR_FUTURE) }; // дольше
        expect((0, vip_orphan_reconcile_1.decideVipReconcile)(orphan, canonical, NOW, ORPHAN).kind).toBe('extinguish');
    });
    it('extinguish, если у canonical бессрочный VIP, а у осиротевшего датированный', () => {
        const orphan = { vip_active: 'true', vip_until: String(FUTURE) };
        const canonical = { vip_active: 'true', vip_until: '0' }; // бессрочный = сильнее
        expect((0, vip_orphan_reconcile_1.decideVipReconcile)(orphan, canonical, NOW, ORPHAN).kind).toBe('extinguish');
    });
    it('transfer, если у осиротевшего VIP длиннее, чем у canonical', () => {
        const orphan = { vip_active: 'true', vip_until: String(FAR_FUTURE) };
        const canonical = { vip_active: 'true', vip_until: String(FUTURE) }; // короче
        expect((0, vip_orphan_reconcile_1.decideVipReconcile)(orphan, canonical, NOW, ORPHAN).kind).toBe('transfer');
    });
    it('transfer, если у canonical VIP истёк', () => {
        const orphan = { vip_active: 'true', vip_until: String(FUTURE) };
        const canonical = { vip_active: 'true', vip_until: String(PAST) }; // истёк → не активен
        expect((0, vip_orphan_reconcile_1.decideVipReconcile)(orphan, canonical, NOW, ORPHAN).kind).toBe('transfer');
    });
});
//# sourceMappingURL=vip_orphan_reconcile.test.js.map