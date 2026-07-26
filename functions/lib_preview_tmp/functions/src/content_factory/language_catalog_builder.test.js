"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const language_catalog_builder_1 = require("./language_catalog_builder");
// зачем: Арена и квизы сняты — CANONICAL_RELEASE_SURFACES сократился с 4 до 2
// ('lesson','flashcard'). Берём список ИЗ КОНСТАНТЫ, чтобы фикстура не расходилась
// с контрактом при следующем изменении набора поверхностей.
const course_release_contract_1 = require("./course_release_contract");
const hash = 'a'.repeat(64);
const release = {
    releaseId: 'fr-ru-r1', studyTarget: 'fr', learnerSourceLocale: 'ru', blueprintId: 'english-core-32', blueprintLocale: 'en', blueprintHash: hash,
    schemaVersion: 'course-release.v1', contentVersion: 'v1', createdAt: '2026-07-10T00:00:00.000Z', minAppVersion: '1.0.0',
    artifacts: Object.fromEntries(course_release_contract_1.CANONICAL_RELEASE_SURFACES.map((surface) => [surface, { releaseId: 'fr-ru-r1', studyTarget: 'fr', learnerSourceLocale: 'ru', surface, contentHash: hash, objectGeneration: 'g1', byteSize: 100, entryIndex: `${surface}/index.json` }])),
};
describe('active language catalog builder', () => {
    it('expands one active canonical release into every canonical target/source surface', () => {
        const entries = (0, language_catalog_builder_1.buildActiveLanguageCatalogEntries)([{ id: 'fr:ru', data: { revision: 3, activeRelease: { releaseId: 'fr-ru-r1', studyTarget: 'fr', learnerSourceLocale: 'ru' } } }], new Map([['fr-ru-r1', release]]));
        expect(entries).toHaveLength(course_release_contract_1.CANONICAL_RELEASE_SURFACES.length);
        expect(entries.map((entry) => entry.surface).sort()).toEqual([...course_release_contract_1.CANONICAL_RELEASE_SURFACES].sort());
        expect(entries.every((entry) => entry.studyTarget === 'fr' && entry.sourceLocale === 'ru' && entry.packId === 'fr-ru-r1')).toBe(true);
    });
    it('drops a catalog pointer when its immutable release is missing or identity-mismatched', () => {
        expect((0, language_catalog_builder_1.buildActiveLanguageCatalogEntries)([{ id: 'fr:ru', data: { revision: 1, activeRelease: { releaseId: 'missing', studyTarget: 'fr', learnerSourceLocale: 'ru' } } }], new Map())).toEqual([]);
        expect((0, language_catalog_builder_1.buildActiveLanguageCatalogEntries)([{ id: 'fr:uk', data: { revision: 1, activeRelease: { releaseId: 'fr-ru-r1', studyTarget: 'fr', learnerSourceLocale: 'uk' } } }], new Map([['fr-ru-r1', release]]))).toEqual([]);
    });
});
//# sourceMappingURL=language_catalog_builder.test.js.map