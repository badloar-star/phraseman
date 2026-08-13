import { readV2OwnerGeneratorSetupCatalogV1 } from "./v2_owner_generator_setup_catalog_v1";

const hash = (character: string) => character.repeat(64);
const auth = Object.freeze({
  uid: "owner-uid",
  token: Object.freeze({ admin: true, adminRole: "owner" }),
});
const authenticated = Object.freeze({
  actorUid: "owner-uid",
  role: "owner" as const,
  ownerIdentityFingerprint: hash("9"),
  authenticationAuthority:
    "firebase_auth_explicit_owner_role_and_server_configured_uid_hash" as const,
  identityPolicyFingerprint: hash("8"),
});

describe("Learning V2 owner generator setup catalog", () => {
  it("returns a bounded selection-only catalog without claiming generation or release authority", async () => {
    const calls: Readonly<{ collection: string; maximum: number }>[] = [];
    const result = await readV2OwnerGeneratorSetupCatalogV1(
      { auth, data: { targetLanguage: "en" } },
      {
        authenticateOwner: () => authenticated,
        async listDocuments(collection, maximum) {
          calls.push(Object.freeze({ collection, maximum }));
          return [];
        },
        async readDocument() {
          throw new Error("unexpected_read");
        },
        async readCanonicalObject() {
          throw new Error("unexpected_read");
        },
      },
    );

    expect(result).toMatchObject({
      ok: true,
      schemaVersion: "v2-owner-generator-setup-catalog.v1",
      targetLanguage: "en",
      languageProfiles: [],
      speechProfiles: [],
      voiceGenerationProfiles: [],
      templates: [],
      decisionRegistries: [],
      ownerContentBoundary: "owner_creates_all_real_episode_content",
      catalogUse: "setup_selection_only_server_revalidates_on_use",
      generationAuthority: "none",
      publicationAuthority: "none",
      releaseAuthority: false,
    });
    expect(calls).toHaveLength(5);
    expect(calls.every((call) => call.maximum <= 100)).toBe(true);
  });

  it("fails closed before reads for a non-owner or noncanonical language tag", async () => {
    let reads = 0;
    const dependencies = {
      authenticateOwner() {
        throw new Error("configured_owner_required");
      },
      async listDocuments() {
        reads += 1;
        return [];
      },
      async readDocument() {
        reads += 1;
        return null;
      },
      async readCanonicalObject() {
        reads += 1;
        return {};
      },
    };
    await expect(
      readV2OwnerGeneratorSetupCatalogV1(
        { auth, data: { targetLanguage: "en" } },
        dependencies,
      ),
    ).rejects.toThrow("configured_owner_required");
    await expect(
      readV2OwnerGeneratorSetupCatalogV1(
        { auth, data: { targetLanguage: "en-us" } },
        { ...dependencies, authenticateOwner: () => authenticated },
      ),
    ).rejects.toThrow("v2_owner_generator_setup_request_invalid");
    expect(reads).toBe(0);
  });
});
