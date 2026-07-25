"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
describe('premium dialog direct-entry Firebase Admin bootstrap', () => {
    it('initializes the default Admin app idempotently before exporting the callable', () => {
        const source = fs_1.default.readFileSync(path_1.default.join(__dirname, 'premium_dialog.ts'), 'utf8');
        const bootstrap = source.indexOf('if (!admin.apps.length) admin.initializeApp();');
        const callableExport = source.indexOf('export const premiumDialogSend = onCall');
        expect(bootstrap).toBeGreaterThanOrEqual(0);
        expect(bootstrap).toBeLessThan(callableExport);
    });
});
//# sourceMappingURL=premium_dialog_admin_bootstrap.test.js.map