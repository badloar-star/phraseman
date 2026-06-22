"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const remote_gates_1 = require("./remote_gates");
describe('remote_gates — pickRemoteBool (серверное чтение feature-флага)', () => {
    it('возвращает fallback, если bools отсутствует', () => {
        expect((0, remote_gates_1.pickRemoteBool)(undefined, 'gate_ai_dialog_premium', true)).toBe(true);
        expect((0, remote_gates_1.pickRemoteBool)(undefined, 'gate_ai_dialog_premium', false)).toBe(false);
    });
    it('возвращает fallback, если ключа нет', () => {
        expect((0, remote_gates_1.pickRemoteBool)({ other: true }, 'gate_ai_dialog_premium', true)).toBe(true);
    });
    it('читает boolean напрямую', () => {
        expect((0, remote_gates_1.pickRemoteBool)({ gate_ai_dialog_premium: false }, 'gate_ai_dialog_premium', true)).toBe(false);
        expect((0, remote_gates_1.pickRemoteBool)({ gate_ai_dialog_premium: true }, 'gate_ai_dialog_premium', false)).toBe(true);
    });
    it('приводит строковые "true"/"false"/"1"/"0"', () => {
        expect((0, remote_gates_1.pickRemoteBool)({ k: 'false' }, 'k', true)).toBe(false);
        expect((0, remote_gates_1.pickRemoteBool)({ k: 'true' }, 'k', false)).toBe(true);
        expect((0, remote_gates_1.pickRemoteBool)({ k: '0' }, 'k', true)).toBe(false);
        expect((0, remote_gates_1.pickRemoteBool)({ k: '1' }, 'k', false)).toBe(true);
    });
    it('приводит числовые 0/1', () => {
        expect((0, remote_gates_1.pickRemoteBool)({ k: 0 }, 'k', true)).toBe(false);
        expect((0, remote_gates_1.pickRemoteBool)({ k: 1 }, 'k', false)).toBe(true);
    });
    it('некорректное значение → fallback', () => {
        expect((0, remote_gates_1.pickRemoteBool)({ k: 'maybe' }, 'k', true)).toBe(true);
        expect((0, remote_gates_1.pickRemoteBool)({ k: 7 }, 'k', false)).toBe(false);
        expect((0, remote_gates_1.pickRemoteBool)({ k: null }, 'k', true)).toBe(true);
    });
});
//# sourceMappingURL=remote_gates.test.js.map