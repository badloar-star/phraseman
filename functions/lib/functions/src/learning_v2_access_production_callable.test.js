"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const learning_v2_access_production_callable_1 = require("./learning_v2_access_production_callable");
const node_fs_1 = require("node:fs");
const node_path_1 = __importDefault(require("node:path"));
describe('V2 production access callable seam', () => {
    it('uses only the content-addressed registry object path', () => {
        expect((0, learning_v2_access_production_callable_1.decisionRegistryObjectPath)('phraseman-v2-product-decisions', 1, 'a'.repeat(64))).toMatch(/content-studio\/decision-registries\/[^/]+\/v1\/a{64}\.json/);
    });
    it('keeps App Check and the production export wired', () => {
        const source = (0, node_fs_1.readFileSync)(node_path_1.default.resolve(__dirname, 'learning_v2_access_production_callable.ts'), 'utf8');
        const index = (0, node_fs_1.readFileSync)(node_path_1.default.resolve(__dirname, 'index.ts'), 'utf8');
        expect(source).toContain("onCall({ enforceAppCheck: true }");
        expect(index).toContain("export { finalizeLearningV2AccessPurchase } from './learning_v2_access_production_callable';");
    });
});
//# sourceMappingURL=learning_v2_access_production_callable.test.js.map