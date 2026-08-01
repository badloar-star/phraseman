"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const compass_cache_1 = require("./compass_cache");
describe('compass_cache — подпись дня и хэш', () => {
    it('подпись стабильна и не зависит от порядка тем', () => {
        const a = (0, compass_cache_1.compassSignature)({ dayType: 'repair', topics: ['article', 'verb'], level: 2 });
        const b = (0, compass_cache_1.compassSignature)({ dayType: 'repair', topics: ['verb', 'article'], level: 2 });
        expect(a).toBe(b);
    });
    it('разный тип дня → разная подпись', () => {
        const a = (0, compass_cache_1.compassSignature)({ dayType: 'easy', topics: ['verb'], level: 2 });
        const b = (0, compass_cache_1.compassSignature)({ dayType: 'repair', topics: ['verb'], level: 2 });
        expect(a).not.toBe(b);
    });
    it('подпись нормализует регистр/пробелы тем', () => {
        const a = (0, compass_cache_1.compassSignature)({ dayType: 'easy', topics: [' Article '], level: 1 });
        const b = (0, compass_cache_1.compassSignature)({ dayType: 'easy', topics: ['article'], level: 1 });
        expect(a).toBe(b);
    });
    it('хэш = 40 hex, стабилен, зависит от языка', () => {
        const sig = (0, compass_cache_1.compassSignature)({ dayType: 'easy', topics: ['verb'], level: 1 });
        const ru = (0, compass_cache_1.compassHashFor)(sig, 'ru');
        const en = (0, compass_cache_1.compassHashFor)(sig, 'en');
        expect(ru).toHaveLength(40);
        expect(ru).toBe((0, compass_cache_1.compassHashFor)(sig, 'ru'));
        expect(ru).not.toBe(en);
    });
});
//# sourceMappingURL=compass_cache.test.js.map