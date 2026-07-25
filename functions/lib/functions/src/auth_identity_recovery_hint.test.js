"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const auth_identity_1 = require("./auth_identity");
describe('maskEmailForRecoveryHint', () => {
    it('маскирует локальную часть до 3 символов, домен сохраняет', () => {
        expect((0, auth_identity_1.maskEmailForRecoveryHint)('uskovavalya52@gmail.com')).toBe('usk***@gmail.com');
        expect((0, auth_identity_1.maskEmailForRecoveryHint)('ab@outlook.com')).toBe('ab***@outlook.com');
        expect((0, auth_identity_1.maskEmailForRecoveryHint)('a@icloud.com')).toBe('a***@icloud.com');
    });
    it('поддерживает apple privaterelay-адреса', () => {
        expect((0, auth_identity_1.maskEmailForRecoveryHint)('dpdcnf87nu@privaterelay.appleid.com'))
            .toBe('dpd***@privaterelay.appleid.com');
    });
    it('возвращает null для мусора вместо email', () => {
        expect((0, auth_identity_1.maskEmailForRecoveryHint)(null)).toBeNull();
        expect((0, auth_identity_1.maskEmailForRecoveryHint)(undefined)).toBeNull();
        expect((0, auth_identity_1.maskEmailForRecoveryHint)('')).toBeNull();
        expect((0, auth_identity_1.maskEmailForRecoveryHint)('no-at-sign')).toBeNull();
        expect((0, auth_identity_1.maskEmailForRecoveryHint)('@domain.com')).toBeNull();
        expect((0, auth_identity_1.maskEmailForRecoveryHint)('local@')).toBeNull();
    });
});
describe('buildRecoveryHintFromUserData', () => {
    it('возвращает провайдера и маску для привязанного аккаунта', () => {
        const hint = (0, auth_identity_1.buildRecoveryHintFromUserData)({
            linkedAuth: { provider: 'google', providerUid: 'uid-1', email: 'uskovavalya52@gmail.com' },
        });
        expect(hint).toEqual({
            found: true,
            linked: true,
            provider: 'google',
            maskedEmail: 'usk***@gmail.com',
        });
    });
    it('не выдумывает email, если его нет в linkedAuth', () => {
        const hint = (0, auth_identity_1.buildRecoveryHintFromUserData)({
            linkedAuth: { provider: 'apple', providerUid: 'uid-2', email: null },
        });
        expect(hint).toEqual({ found: true, linked: true, provider: 'apple', maskedEmail: null });
    });
    it('linked=false для аккаунта без provider-привязки', () => {
        expect((0, auth_identity_1.buildRecoveryHintFromUserData)({ progress: { xp: 100 } }))
            .toEqual({ found: true, linked: false, provider: null, maskedEmail: null });
        expect((0, auth_identity_1.buildRecoveryHintFromUserData)({ linkedAuth: { provider: 'password' } }))
            .toEqual({ found: true, linked: false, provider: null, maskedEmail: null });
    });
    it('found=false для отсутствующего документа', () => {
        expect((0, auth_identity_1.buildRecoveryHintFromUserData)(undefined))
            .toEqual({ found: false, linked: false, provider: null, maskedEmail: null });
    });
});
//# sourceMappingURL=auth_identity_recovery_hint.test.js.map