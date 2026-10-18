// зачем (Ревизор 3.42, R125, 18.10): индекс прогрева L1 S1 содержал тихий хеш — рантайм его уже не знает, и прогрев
// занятия падал целиком. Сторож держит инвариант «индекс прогрева ⊂ бандл + Storage без тихих» и то, что прогрев сам
// отсеивает незнакомые хеши с причиной в логе [V2-PREWARM], а не бросает.
import fs from "node:fs";
import path from "node:path";

import { LEARNING_V2_FACTORY_LESSON_AUDIO_INDEX_V1 } from "../app/learning_v2_factory_lesson_audio_index_v1.generated";
import {
  learningV2FactoryHasAudibleAudioForContentHashV1,
  learningV2FactoryRemoteAudioFilesForContentHashesV1,
} from "../app/learning_v2_factory_production_audio_v1";

const ROOT = path.join(__dirname, "..");
const read = (rel: string): string => fs.readFileSync(path.join(ROOT, rel), "utf8");
const silentHashes = new Set((JSON.parse(read("app/learning_v2_factory_silent_audio_v1.json")) as {
  entries: readonly { contentHash: string }[];
}).entries.map((entry) => entry.contentHash));
const bundleHashes = new Set(
  [...read("app/learning_v2_bootstrap_audio_assets_v1.generated.ts").matchAll(/contentHash: "([0-9a-f]{64})"/gu)].map((m) => m[1]!),
);

const storageHashes = new Set<string>(JSON.parse(read("scripts/learning_v2_storage_audio_inventory.v1.json")).presentContentHashes);

type IndexedLesson = { contentHashes: readonly string[]; sessions: Record<number, { contentHashes: readonly string[] }> };
const indexedHashes = (): { where: string; contentHash: string }[] =>
  Object.entries(LEARNING_V2_FACTORY_LESSON_AUDIO_INDEX_V1 as unknown as Record<string, IndexedLesson>).flatMap(([lesson, value]) => [
    ...value.contentHashes.map((contentHash) => ({ where: `l${lesson}`, contentHash })),
    ...Object.entries(value.sessions).flatMap(([session, s]) =>
      s.contentHashes.map((contentHash) => ({ where: `l${lesson}s${session}`, contentHash }))),
  ]);

describe("Learning V2: индекс прогрева ⊂ бандл + Storage без тихих", () => {
  let log: jest.SpyInstance;
  beforeEach(() => { log = jest.spyOn(console, "log").mockImplementation(() => undefined); });
  afterEach(() => log.mockRestore());

  test("индекс непустой", () => {
    expect(indexedHashes().length).toBeGreaterThan(0);
  });

  test("ни одного тихого хеша в индексе", () => {
    expect(indexedHashes().filter((item) => silentHashes.has(item.contentHash))).toEqual([]);
  });

  test("каждый хеш индекса доступен в наборе или проверенном Storage", () => {
    expect(indexedHashes().filter((item) => !bundleHashes.has(item.contentHash) && !storageHashes.has(item.contentHash))).toEqual([]);
  });

  test("каждый хеш индекса рантайм знает — прогрев по индексу не бросает", () => {
    const unknown = indexedHashes().filter((item) => !learningV2FactoryHasAudibleAudioForContentHashV1(item.contentHash));
    expect(unknown).toEqual([]);
    const all = [...new Set(indexedHashes().map((item) => item.contentHash))];
    expect(() => learningV2FactoryRemoteAudioFilesForContentHashesV1(all)).not.toThrow();
  });

  test("тихий хеш рантайм не признаёт слышимым", () => {
    for (const hash of silentHashes) expect([hash, learningV2FactoryHasAudibleAudioForContentHashV1(hash)]).toEqual([hash, false]);
  });

  test("прогрев отсеивает незнакомый хеш с логом [V2-PREWARM], а не бросает", () => {
    const pack = read("app/learning_v2_lesson_audio_pack_v1.ts");
    expect(pack).toMatch(/function factoryFilesForIndexedHashes\(/u);
    expect(pack).toMatch(/\[V2-PREWARM\] index_hash_unknown_dropped/u);
    // прямой бросающий вызов по индексу из прогрева убран — только через отсеивающую обёртку
    expect(pack).not.toMatch(/learningV2FactoryRemoteAudioFilesForContentHashesV1\((?:indexed|session)\.contentHashes\)/u);
  });

  test("генератор индекса использует свежий список фактических ссылок", () => {
    const generator = read("scripts/build_learning_v2_factory_lesson_audio_index.mjs");
    expect(generator).toMatch(/loadRuntimeAudioSelection/u);
    expect(generator).toMatch(/selection\.required/u);
  });
});
