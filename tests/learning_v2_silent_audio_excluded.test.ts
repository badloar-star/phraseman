// зачем (R125, 18.10): сервис озвучки возвращал пустоту (пик ниже −45 дБ). Тихие записи перечислены в
// app/learning_v2_factory_silent_audio_v1.json; сторож держит два правила: тихий файл не едет в набор сборки и не
// выбирается приложением как звук слова — слово берёт настоящую запись (другой голос) или голос телефона.
import fs from "node:fs";
import path from "node:path";

import { learningV2FactoryWordAudioFileV1 } from "../app/learning_v2_factory_production_audio_v1";

const ROOT = path.join(__dirname, "..");
const silent = JSON.parse(fs.readFileSync(path.join(ROOT, "app/learning_v2_factory_silent_audio_v1.json"), "utf8")) as {
  entries: { contentHash: string; transcript: string; voiceId: string }[];
};
const silentHashes = new Set(silent.entries.map((entry) => entry.contentHash));

describe("Learning V2: тихие записи не звучат в приложении", () => {
  let log: jest.SpyInstance;
  beforeEach(() => { log = jest.spyOn(console, "log").mockImplementation(() => undefined); });
  afterEach(() => log.mockRestore());

  test("список непустой и каждая запись — хеш sha256", () => {
    expect(silent.entries.length).toBeGreaterThan(0);
    for (const entry of silent.entries) expect(entry.contentHash).toMatch(/^[0-9a-f]{64}$/u);
  });

  test("ни один тихий файл не едет в набор сборки", () => {
    const bundle = fs.readFileSync(path.join(ROOT, "app/learning_v2_bootstrap_audio_assets_v1.generated.ts"), "utf8");
    expect([...silentHashes].filter((hash) => bundle.includes(hash))).toEqual([]);
  });

  test("звук слова никогда не выбирается из тихой записи", () => {
    const words = [...new Set(silent.entries.map((entry) => entry.transcript))];
    for (const word of words) {
      const file = learningV2FactoryWordAudioFileV1(word);
      if (file) expect([word, silentHashes.has(file.contentHash)]).toEqual([word, false]);
    }
    // слово карточки из инцидента: была тихая запись ash — теперь настоящая запись другого голоса
    const fork = learningV2FactoryWordAudioFileV1("fork");
    expect(fork).not.toBeNull();
    expect(silentHashes.has(fork!.contentHash)).toBe(false);
  });
});
