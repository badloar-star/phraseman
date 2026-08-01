"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = require("node:fs");
const node_path_1 = __importDefault(require("node:path"));
const SRC = __dirname;
function source(name) {
    return (0, node_fs_1.readFileSync)(node_path_1.default.join(SRC, name), 'utf8');
}
function exportedRuntime(sourceText, exportName) {
    const start = sourceText.indexOf(`export const ${exportName} =`);
    expect(start).toBeGreaterThanOrEqual(0);
    const next = sourceText.indexOf('\nexport const ', start + 1);
    return sourceText.slice(start, next < 0 ? undefined : next);
}
describe('RESEND_API_KEY Secret Manager contract', () => {
    const consumers = [
        'admin_email.ts',
        'auth_recovery.ts',
        'website_contact.ts',
        'web_leads.ts',
        'web_checkout.ts',
    ];
    it('declares one canonical defineSecret and no legacy defineString copies', () => {
        const secretSource = source('resend_secret.ts');
        expect(secretSource).toContain("export const RESEND_API_KEY = defineSecret('RESEND_API_KEY')");
        const combinedConsumers = consumers.map(source).join('\n');
        expect(combinedConsumers).not.toMatch(/defineString\(\s*['"]RESEND_API_KEY['"]/);
        expect(combinedConsumers).not.toMatch(/defineSecret\(\s*['"]RESEND_API_KEY['"]/);
        for (const file of consumers) {
            expect(source(file)).toContain("from './resend_secret'");
        }
    });
    it('binds the secret to every deployed runtime that can send through Resend', () => {
        const adminEmail = source('admin_email.ts');
        expect(exportedRuntime(adminEmail, 'adminEmailBroadcast')).toContain('secrets: [RESEND_API_KEY]');
        const authRecovery = source('auth_recovery.ts');
        expect(authRecovery).toMatch(/REQUEST_RECOVERY_CALLABLE_OPTIONS\s*=\s*\{[\s\S]*?secrets:\s*\[RESEND_API_KEY\][\s\S]*?\}/);
        expect(exportedRuntime(authRecovery, 'authCleanInstallRecoveryDeliveryWorker'))
            .toContain('secrets: CLEAN_RECOVERY_DELIVERY_SECRETS');
        expect(authRecovery).toMatch(/CLEAN_RECOVERY_DELIVERY_SECRETS\s*=\s*\[[\s\S]*?RESEND_API_KEY[\s\S]*?\]/);
        expect(exportedRuntime(source('website_contact.ts'), 'submitWebsiteContact'))
            .toContain('secrets: [RESEND_API_KEY]');
        const webLeads = source('web_leads.ts');
        expect(exportedRuntime(webLeads, 'webLeadCapture')).toContain('secrets: [RESEND_API_KEY]');
        expect(exportedRuntime(webLeads, 'webLeadNudgeCron')).toContain('secrets: [RESEND_API_KEY]');
        const webCheckout = source('web_checkout.ts');
        expect(exportedRuntime(webCheckout, 'stripeWebhook')).toMatch(/secrets:\s*\[[^\]]*RESEND_API_KEY[^\]]*\]/);
        expect(exportedRuntime(webCheckout, 'paypalOrderCapture')).toMatch(/secrets:\s*\[[^\]]*RESEND_API_KEY[^\]]*\]/);
    });
    it('keeps the secret value out of tracked Firebase env files', () => {
        for (const file of ['.env.example', '.env.phraseman-ea0b3']) {
            const envSource = (0, node_fs_1.readFileSync)(node_path_1.default.join(SRC, '..', file), 'utf8');
            expect(envSource).not.toMatch(/^\s*RESEND_API_KEY\s*=/m);
        }
    });
    it('never falls back to the Resend test-only sender domain', () => {
        for (const file of consumers) {
            expect(source(file)).not.toContain('@resend.dev');
        }
    });
});
//# sourceMappingURL=resend_secret_contract.test.js.map