// зачем (Ревизор к 69aeaff8d, координатор 22.10): новые ключи Learning V2 на телефоне — сохранённый эпизод, колоды словаря,
// срок «Не могу говорить» — стираются и переносятся вместе с аккаунтом; для проверки «чистый ли гость» эпизод = прогресс,
// а срок режима и колоды — служебные следы.
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { classifyGuestCleanKey } from "../app/guest_clean_classifier";

const cloudSync = readFileSync(join(__dirname, "..", "app", "cloud_sync.ts"), "utf8");
const prefixList = cloudSync.slice(cloudSync.indexOf("const ACCOUNT_LOCAL_KEY_PREFIXES = ["), cloudSync.indexOf("] as const;", cloudSync.indexOf("const ACCOUNT_LOCAL_KEY_PREFIXES = [")));

describe("Learning V2 phone keys travel and wipe with the account", () => {
  test.each([
    ["learning_v2_episode_resume_v1:", "app/learning_v2_episode_resume_v1.ts", "learning_v2_episode_resume_v1"],
    ["learning_v2_dictionary_training_decks_v1", "app/learning_v2_dictionary_training_deck_v1.ts", "learning_v2_dictionary_training_decks_v1"],
    ["learning_v2_cant_speak_until_v1", "app/learning_v2_cant_speak_v1.ts", "learning_v2_cant_speak_until_v1"],
  ])("%s is in ACCOUNT_LOCAL_KEY_PREFIXES and matches the module's storage key", (prefix, modulePath, keyText) => {
    expect(prefixList).toContain(`'${prefix}'`);
    expect(readFileSync(join(__dirname, "..", modulePath), "utf8")).toContain(keyText);
  });

  test("guest-clean check: a saved episode is progress, the can't-speak window and dictionary decks are service traces", () => {
    expect(classifyGuestCleanKey("learning_v2_episode_resume_v1:owner:session", '{"schema":"learning-v2-episode-resume.v1"}')).toBe("progress");
    expect(classifyGuestCleanKey("learning_v2_cant_speak_until_v1", "1800000000000")).toBe("service");
    expect(classifyGuestCleanKey("learning_v2_dictionary_training_decks_v1", "[]")).toBe("service");
  });
});
