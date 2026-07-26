"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const admin_alerts_1 = require("./admin_alerts");
const HOUR = 60 * 60 * 1000;
describe('isAuthFailureErrorDoc', () => {
    it('ловит feature=auth (регистр не важен)', () => {
        expect((0, admin_alerts_1.isAuthFailureErrorDoc)({ feature: 'auth' })).toBe(true);
        expect((0, admin_alerts_1.isAuthFailureErrorDoc)({ feature: 'Auth' })).toBe(true);
        expect((0, admin_alerts_1.isAuthFailureErrorDoc)({ feature: ' auth ' })).toBe(true);
    });
    it('ловит context=auth:signin_failure даже без feature', () => {
        expect((0, admin_alerts_1.isAuthFailureErrorDoc)({ context: 'auth:signin_failure' })).toBe(true);
        expect((0, admin_alerts_1.isAuthFailureErrorDoc)({ feature: 'lessons', context: 'auth:signin_failure' })).toBe(true);
    });
    it('отсекает не-auth ошибки и мусор', () => {
        expect((0, admin_alerts_1.isAuthFailureErrorDoc)({ feature: 'payments' })).toBe(false);
        expect((0, admin_alerts_1.isAuthFailureErrorDoc)({ feature: 'authentication' })).toBe(false);
        expect((0, admin_alerts_1.isAuthFailureErrorDoc)({ context: 'auth:signin_success' })).toBe(false);
        expect((0, admin_alerts_1.isAuthFailureErrorDoc)({})).toBe(false);
        expect((0, admin_alerts_1.isAuthFailureErrorDoc)({ feature: null, context: undefined })).toBe(false);
    });
});
describe('nextAuthFailureSpikeState', () => {
    it('первое событие открывает окно без алерта', () => {
        const next = (0, admin_alerts_1.nextAuthFailureSpikeState)({ window: undefined, lastAlertedAt: 0, now: 1000, threshold: 5 });
        expect(next).toMatchObject({ shouldAlert: false, count: 1, alertedAt: null });
        expect(next.window).toEqual({ since: 1000, count: 1, stages: {} });
    });
    it('инкрементит счётчик внутри окна и алертит на пороге', () => {
        const below = (0, admin_alerts_1.nextAuthFailureSpikeState)({
            window: { since: 1000, count: 3, stages: {} },
            lastAlertedAt: 0,
            now: 2000,
            threshold: 5,
        });
        expect(below).toMatchObject({ shouldAlert: false, count: 4 });
        const atThreshold = (0, admin_alerts_1.nextAuthFailureSpikeState)({
            window: { since: 1000, count: 4, stages: {} },
            lastAlertedAt: 0,
            now: 2000,
            threshold: 5,
        });
        expect(atThreshold).toMatchObject({ shouldAlert: true, count: 5, alertedAt: 2000 });
    });
    it('cooldown 1 час гасит повторный алерт, после cooldown — снова алертит', () => {
        const inCooldown = (0, admin_alerts_1.nextAuthFailureSpikeState)({
            window: { since: 1000, count: 9, stages: {} },
            lastAlertedAt: 2000,
            now: 2000 + 30 * 60 * 1000,
            threshold: 5,
        });
        expect(inCooldown).toMatchObject({ shouldAlert: false, count: 10, alertedAt: null });
        const afterCooldown = (0, admin_alerts_1.nextAuthFailureSpikeState)({
            window: { since: 2000 + 30 * 60 * 1000, count: 9, stages: {} },
            lastAlertedAt: 2000,
            now: 2000 + HOUR + 1,
            threshold: 5,
        });
        expect(afterCooldown.shouldAlert).toBe(true);
    });
    it('истёкшее окно сбрасывается в новое', () => {
        const next = (0, admin_alerts_1.nextAuthFailureSpikeState)({
            window: { since: 1000, count: 42, stages: { a: 42 } },
            lastAlertedAt: 0,
            now: 1000 + HOUR + 1,
            threshold: 5,
            stage: 'b',
        });
        expect(next.window).toEqual({ since: 1000 + HOUR + 1, count: 1, stages: { b: 1 } });
        expect(next.shouldAlert).toBe(false);
    });
    it('считает stage внутри окна и капает карту на 8 ключей', () => {
        const first = (0, admin_alerts_1.nextAuthFailureSpikeState)({
            window: { since: 1000, count: 1, stages: { google_signin: 1 } },
            lastAlertedAt: 0,
            now: 2000,
            threshold: 5,
            stage: 'google_signin',
        });
        expect(first.window.stages).toEqual({ google_signin: 2 });
        const full = {};
        for (let i = 0; i < 8; i += 1)
            full[`s${i}`] = 1;
        const capped = (0, admin_alerts_1.nextAuthFailureSpikeState)({
            window: { since: 1000, count: 8, stages: full },
            lastAlertedAt: 0,
            now: 2000,
            threshold: 50,
            stage: 'overflow-stage',
        });
        expect(Object.keys(capped.window.stages)).toHaveLength(8);
        expect(capped.window.stages['overflow-stage']).toBeUndefined();
    });
});
//# sourceMappingURL=admin_alerts_auth_spike.test.js.map