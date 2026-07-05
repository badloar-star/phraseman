"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const shards_apply_delta_1 = require("./shards_apply_delta");
// K3: серверный callable shardsApplyDelta — единственная точка записи баланса
// осколков (runTransaction + идемпотентность по opId). Здесь покрываем чистое ядро:
// валидацию входа и вычисление исхода транзакции (идемпотентность / spend-guard).
describe('validateShardsApplyDeltaInput', () => {
    const base = { opId: 'abcd1234efgh', delta: 5, type: 'earn', reason: 'lesson_first' };
    it('accepts a well-formed earn op', () => {
        const r = (0, shards_apply_delta_1.validateShardsApplyDeltaInput)(base);
        expect(r.ok).toBe(true);
        if (r.ok) {
            expect(r.value).toEqual({ opId: 'abcd1234efgh', delta: 5, type: 'earn', reason: 'lesson_first' });
        }
    });
    it('accepts a spend op', () => {
        const r = (0, shards_apply_delta_1.validateShardsApplyDeltaInput)({ ...base, type: 'spend', reason: 'card_pack' });
        expect(r.ok).toBe(true);
    });
    it('rejects a too-short opId (idempotency key must be robust)', () => {
        expect((0, shards_apply_delta_1.validateShardsApplyDeltaInput)({ ...base, opId: 'short' }).ok).toBe(false);
    });
    it('rejects an opId with illegal characters', () => {
        expect((0, shards_apply_delta_1.validateShardsApplyDeltaInput)({ ...base, opId: 'has space 1234' }).ok).toBe(false);
        expect((0, shards_apply_delta_1.validateShardsApplyDeltaInput)({ ...base, opId: 'path/traversal/x' }).ok).toBe(false);
    });
    it('rejects a non earn/spend type', () => {
        expect((0, shards_apply_delta_1.validateShardsApplyDeltaInput)({ ...base, type: 'admin' }).ok).toBe(false);
    });
    it('rejects zero / negative / non-finite delta', () => {
        expect((0, shards_apply_delta_1.validateShardsApplyDeltaInput)({ ...base, delta: 0 }).ok).toBe(false);
        expect((0, shards_apply_delta_1.validateShardsApplyDeltaInput)({ ...base, delta: -5 }).ok).toBe(false);
        expect((0, shards_apply_delta_1.validateShardsApplyDeltaInput)({ ...base, delta: NaN }).ok).toBe(false);
    });
    it('enforces the per-op earn cap (anti-farm backstop against delta:99999)', () => {
        expect((0, shards_apply_delta_1.validateShardsApplyDeltaInput)({ ...base, type: 'earn', delta: 99999 }).ok).toBe(false);
        // Spend не капим — оно только уменьшает баланс, фарма не даёт.
        expect((0, shards_apply_delta_1.validateShardsApplyDeltaInput)({ ...base, type: 'spend', delta: 99999 }).ok).toBe(true);
    });
    it('truncates a fractional delta and defaults a blank reason', () => {
        const r = (0, shards_apply_delta_1.validateShardsApplyDeltaInput)({ ...base, delta: 3.9, reason: '   ' });
        expect(r.ok).toBe(true);
        if (r.ok) {
            expect(r.value.delta).toBe(3);
            expect(r.value.reason).toBe('unknown');
        }
    });
});
describe('computeShardsDeltaOutcome — atomicity core', () => {
    it('earn adds the delta and marks the op for writing', () => {
        expect((0, shards_apply_delta_1.computeShardsDeltaOutcome)(false, 10, 2)).toEqual({
            write: true, alreadyApplied: false, insufficient: false, balance: 12,
        });
    });
    it('spend subtracts and writes when funds suffice', () => {
        expect((0, shards_apply_delta_1.computeShardsDeltaOutcome)(false, 10, -4)).toEqual({
            write: true, alreadyApplied: false, insufficient: false, balance: 6,
        });
    });
    it('idempotent replay: claim already exists → no write, returns current balance', () => {
        // Тот же opId второй раз — дельту не удваиваем.
        expect((0, shards_apply_delta_1.computeShardsDeltaOutcome)(true, 12, 2)).toEqual({
            write: false, alreadyApplied: true, insufficient: false, balance: 12,
        });
    });
    it('spend that would go negative → insufficient, no write, balance untouched', () => {
        expect((0, shards_apply_delta_1.computeShardsDeltaOutcome)(false, 3, -10)).toEqual({
            write: false, alreadyApplied: false, insufficient: true, balance: 3,
        });
    });
    it('spend to exactly zero is allowed', () => {
        expect((0, shards_apply_delta_1.computeShardsDeltaOutcome)(false, 10, -10)).toEqual({
            write: true, alreadyApplied: false, insufficient: false, balance: 0,
        });
    });
    it('treats a missing/garbage current balance as 0', () => {
        expect((0, shards_apply_delta_1.computeShardsDeltaOutcome)(false, NaN, 5).balance).toBe(5);
        expect((0, shards_apply_delta_1.computeShardsDeltaOutcome)(false, -7, 5).balance).toBe(5);
    });
});
//# sourceMappingURL=shards_apply_delta.test.js.map