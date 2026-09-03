import { hashCanonicalBody } from "../../policies/decision_registry";
import type {
  Lesson1AuthoringPreflightV1,
  Lesson1AuthoringRegistryEntryV1,
} from "./lesson1_authoring_registry_v1";

const futureFingerprint = (fromOrdinal: number): string => hashCanonicalBody(
  Array.from({ length: 56 - fromOrdinal }, (_unused, index) => [fromOrdinal + index + 1, null]),
);
const LESSON3_SESSION_01_FINGERPRINT = "567ca6f433c351387e0c3ca5766b6d018f77c7245a6eca4b78b2fae46069636c";
const LESSON3_SESSION_02_FINGERPRINT = "5b7979ac081d348385f988294c953a446d59ae58b779b2153506307fb5a17df8";
const LESSON3_SESSION_03_FINGERPRINT = "fa661c578e35ad162cc086e95fb56b18331b98c3a66677b9dd37584bc103b4a8";
const LESSON3_SESSION_04_FINGERPRINT = "16e87a373c1b92e79957a24eb7528ef60038007ccdfa9bc883f5d2d2048ea028";
const LESSON3_SESSION_05_FINGERPRINT = "da6e6b00353b23b66ac1832fe843e3052df3959f861d995f6d8eb9990b6c8aee";
const LESSON3_SESSION_06_FINGERPRINT = "4d4ee8a3bf13d840d75e0f73944ef040d9009906bd496ce9eec48e3e715a5e88";
const LESSON3_SESSION_07_FINGERPRINT = "c8fa749993c5d8c00a093ecb8e912bf911011f104e41721d0d992df7bc62d14c";
const LESSON3_SESSION_08_FINGERPRINT = "0950060ed169b762d2fffc190c57c814c7ab51e56d5970ee8bae2d46c95a8a18";
const LESSON3_SESSION_09_FINGERPRINT = "38ef36d811c1b353c86717417335662cd35305e621ed601d4206b981b28076f7";
const LESSON3_SESSION_10_FINGERPRINT = "b462aa9ebbd72adc5bd7fe48c6eee646df8c666794f253348165ad361ffd0b9b";
const LESSON3_SESSION_11_FINGERPRINT = "00863e747d79c22c7522787ef076199e5f9e5de8ab1df54f0945e14736fbc97c";
const LESSON3_SESSION_12_FINGERPRINT = "90572c4e9aa376188205248f9eb470107d3ae0010655ac9083f1b31040e51812";
const LESSON3_SESSION_13_FINGERPRINT = "98344178d09051a3924999712faadf85128866ad8ef67d93ec0173332b9562b7";
const LESSON3_SESSION_14_FINGERPRINT = "1ba1ea8608423ab924d2043e56ffc285947e01e9ec172b4cac474184bcb835d8";
const LESSON3_SESSION_15_FINGERPRINT = "dd1dbf4aa4ecadc0fc896a8e5f814f720080a27d96069abe2997cdda498a5f75";
const LESSON3_SESSION_16_FINGERPRINT = "0474b6db486beccc3e35af71c0d4329dde038d9418d7faed4d46ae1cf0297e49";
const LESSON3_SESSION_17_FINGERPRINT = "5aa261f7d4d643b54da9a60cdf1138b81dc3ba2bf6a7f1bc0181b8931aa4ea66";
const LESSON3_SESSION_18_FINGERPRINT = "a78653d09a59023c8ff29dfcfc8be36b5c4d8dd314bf00d9e3551e77db295c0d";
const LESSON3_SESSION_19_FINGERPRINT = "c85a9e7a08b50e716406f1719921e4c26d14cd869140b50425a63f95a99def37";
const LESSON3_SESSION_20_FINGERPRINT = "cf8665350b8c1bd858fa4d5475ea0a19ffa36d5fc18429765fac62659120855f";
const LESSON3_SESSION_21_FINGERPRINT = "5d7c53d061475e9be7f8064750fd8065742fab6aaa94004b794df8452bfedbfc";
const LESSON3_SESSION_22_FINGERPRINT = "b304e66c48216944826a807f7849a0425884d2a421cf8b76b68709b2c94da773";
const LESSON3_SESSION_23_FINGERPRINT = "28aae03ba975f988e1053fe92ed354618f81c8ca4df6a2da7e2b7e2a1b55044e";
const LESSON3_SESSION_24_FINGERPRINT = "7f37452799636c434649c59247050f02026ee8ad8d6aece5d8b6da45c31ee873";
const LESSON3_SESSION_25_FINGERPRINT = "bde5401554c43a34efc30ce63816286ebdd85218c8bef3da330ae358501e7640";
const LESSON3_SESSION_26_FINGERPRINT = "2b623847e13355522b87b2e973828ea8b77e968af4c7899b35899fe49355aafb";
const LESSON3_SESSION_27_FINGERPRINT = "45424d48d4ccf165b26a91b06783bbe27c234e4099fefda5fd895ed0a29dd25f";
const LESSON3_SESSION_28_FINGERPRINT = "058b1e9ba086ef1e7ca9a95f77657723968f924d18ea231a76ced05f20960811";
const LESSON3_SESSION_29_FINGERPRINT = "a080a7d4c51d5d5eb45f508cb12591162ce56ec9acfee772301b0832fad72024";
const LESSON3_SESSION_30_FINGERPRINT = "1b66addeccbce13fca0576a388a333936f1240b1e762e286632ab28225b1e61c";
const LESSON3_SESSION_31_FINGERPRINT = "ad5654c2043afb87f40a960d65ae9fcade0891441fc6c93706f0591e84674756";
const LESSON3_SESSION_32_FINGERPRINT = "a8ac90caae111fdf05afcb81755a20f7897f1f9ea1a4d1ffcaa2c568414fbe84";
const LESSON3_SESSION_33_FINGERPRINT = "0ec5edb9bc4a4484f7f94c188ab6dbd4f419f75b8b07f791a90b2567e980c115";
const LESSON3_SESSION_34_FINGERPRINT = "6155ac0545dd0145406686a0cb53cbfa36fbc639fa95d8eaebb0c0c847ef57ba";
const LESSON3_SESSION_35_FINGERPRINT = "26367fad8dc2b3275555f69a01e13e073d1e26dc28fd6dfcf37cfc66e4a85a60";
const LESSON3_SESSION_36_FINGERPRINT = "cd2a3c43ddf715b56552a4462a90e4ca97311891a7b6d7b46f2f4d56edad945a";
const LESSON3_SESSION_37_FINGERPRINT = "3c016e1ce8c7d395bdcef708d460d16cb484074b3635fc1044ab876e5300b853";
const LESSON3_SESSION_38_FINGERPRINT = "c7a5236f91cf68e8cf6b673574ca2d5e46b56dabad636723efe9a65f80f30250";
const LESSON3_SESSION_39_FINGERPRINT = "ae235d51fb99e727a25b8dc8663122aa41fe741e63382c3c80be5f52c04054d5";
const LESSON3_SESSION_40_FINGERPRINT = "5df6882fcd0c9be74e9b6d4dfedd0941d13937dcfc7293b8bb615c5e52c78326";
const LESSON3_SESSION_41_FINGERPRINT = "553777a0069f31f59b47d94be780226e08801b2ec3ddefd6ba68131707f86c25";

/**
 * Lesson 3 starts empty on purpose.  Its first unlocked entry pins every
 * later slot to the empty state, so authoring Session 2 before a locked
 * Session 1 is a detectable mutation rather than a convention.
 */
export const LESSON3_AUTHORING_REGISTRY_V1: readonly Lesson1AuthoringRegistryEntryV1[] =
  Object.freeze(Array.from({ length: 56 }, (_unused, index) => Object.freeze({
    sessionOrdinal: index + 1,
    ...(index === 0 ? {
      status: "LOCKED" as const,
      lockedFingerprint: LESSON3_SESSION_01_FINGERPRINT,
      selfReviewReceiptRef: "lesson3-session01-content-autopass-projection-no-repeat-2026-09-03",
      unlockDecisionRef: "owner-approved-full-b1-blueprint-bb53181a-2026-09-03",
    } : index === 1 ? {
      status: "LOCKED" as const,
      lockedFingerprint: LESSON3_SESSION_02_FINGERPRINT,
      selfReviewReceiptRef: "lesson3-session02-content-autopass-projection-no-repeat-2026-09-03",
      unlockDecisionRef: "owner-approved-full-b1-blueprint-bb53181a-2026-09-03",
    } : index === 2 ? {
      status: "LOCKED" as const,
      lockedFingerprint: LESSON3_SESSION_03_FINGERPRINT,
      selfReviewReceiptRef: "lesson3-session03-content-autopass-projection-no-repeat-2026-09-03",
      unlockDecisionRef: "owner-approved-full-b1-blueprint-bb53181a-2026-09-03",
    } : index === 3 ? {
      status: "LOCKED" as const,
      lockedFingerprint: LESSON3_SESSION_04_FINGERPRINT,
      selfReviewReceiptRef: "lesson3-session04-content-autopass-projection-no-repeat-2026-09-03",
      unlockDecisionRef: "owner-approved-full-b1-blueprint-bb53181a-2026-09-03",
    } : index === 4 ? {
      status: "LOCKED" as const,
      lockedFingerprint: LESSON3_SESSION_05_FINGERPRINT,
      selfReviewReceiptRef: "lesson3-session05-content-autopass-projection-no-repeat-2026-09-03",
      unlockDecisionRef: "owner-approved-full-b1-blueprint-bb53181a-2026-09-03",
    } : index === 5 ? {
      status: "LOCKED" as const,
      lockedFingerprint: LESSON3_SESSION_06_FINGERPRINT,
      selfReviewReceiptRef: "lesson3-session06-content-autopass-projection-no-repeat-2026-09-03",
      unlockDecisionRef: "owner-approved-full-b1-blueprint-bb53181a-2026-09-03",
    } : index === 6 ? {
      status: "LOCKED" as const,
      lockedFingerprint: LESSON3_SESSION_07_FINGERPRINT,
      selfReviewReceiptRef: "lesson3-session07-content-autopass-projection-no-repeat-2026-09-03",
      unlockDecisionRef: "owner-approved-full-b1-blueprint-bb53181a-2026-09-03",
    } : index === 7 ? {
      status: "LOCKED" as const,
      lockedFingerprint: LESSON3_SESSION_08_FINGERPRINT,
      selfReviewReceiptRef: "lesson3-session08-content-autopass-projection-no-repeat-2026-09-03",
      unlockDecisionRef: "owner-approved-full-b1-blueprint-bb53181a-2026-09-03",
    } : index === 8 ? {
      status: "LOCKED" as const,
      lockedFingerprint: LESSON3_SESSION_09_FINGERPRINT,
      selfReviewReceiptRef: "lesson3-session09-content-autopass-projection-no-repeat-2026-09-03",
      unlockDecisionRef: "owner-approved-full-b1-blueprint-bb53181a-2026-09-03",
    } : index === 9 ? {
      status: "LOCKED" as const,
      lockedFingerprint: LESSON3_SESSION_10_FINGERPRINT,
      selfReviewReceiptRef: "lesson3-session10-content-autopass-projection-no-repeat-2026-09-03",
      unlockDecisionRef: "owner-approved-full-b1-blueprint-bb53181a-2026-09-03",
    } : index === 10 ? {
      status: "LOCKED" as const,
      lockedFingerprint: LESSON3_SESSION_11_FINGERPRINT,
      selfReviewReceiptRef: "lesson3-session11-content-autopass-projection-no-repeat-2026-09-03",
      unlockDecisionRef: "owner-approved-full-b1-blueprint-bb53181a-2026-09-03",
    } : index === 11 ? {
      status: "LOCKED" as const,
      lockedFingerprint: LESSON3_SESSION_12_FINGERPRINT,
      selfReviewReceiptRef: "lesson3-session12-content-autopass-projection-no-repeat-2026-09-03",
      unlockDecisionRef: "owner-approved-full-b1-blueprint-bb53181a-2026-09-03",
    } : index === 12 ? {
      status: "LOCKED" as const,
      lockedFingerprint: LESSON3_SESSION_13_FINGERPRINT,
      selfReviewReceiptRef: "lesson3-session13-content-autopass-projection-no-repeat-2026-09-03",
      unlockDecisionRef: "owner-approved-full-b1-blueprint-bb53181a-2026-09-03",
    } : index === 13 ? {
      status: "LOCKED" as const,
      lockedFingerprint: LESSON3_SESSION_14_FINGERPRINT,
      selfReviewReceiptRef: "lesson3-session14-content-autopass-projection-no-repeat-2026-09-03",
      unlockDecisionRef: "owner-approved-full-b1-blueprint-bb53181a-2026-09-03",
    } : index === 14 ? {
      status: "LOCKED" as const,
      lockedFingerprint: LESSON3_SESSION_15_FINGERPRINT,
      selfReviewReceiptRef: "lesson3-session15-content-autopass-projection-no-repeat-2026-09-03",
      unlockDecisionRef: "owner-approved-full-b1-blueprint-bb53181a-2026-09-03",
    } : index === 15 ? {
      status: "LOCKED" as const,
      lockedFingerprint: LESSON3_SESSION_16_FINGERPRINT,
      selfReviewReceiptRef: "lesson3-session16-content-autopass-projection-no-repeat-2026-09-03",
      unlockDecisionRef: "owner-approved-full-b1-blueprint-bb53181a-2026-09-03",
    } : index === 16 ? {
      status: "LOCKED" as const,
      lockedFingerprint: LESSON3_SESSION_17_FINGERPRINT,
      selfReviewReceiptRef: "lesson3-session17-content-autopass-projection-no-repeat-2026-09-03",
      unlockDecisionRef: "owner-approved-full-b1-blueprint-bb53181a-2026-09-03",
    } : index === 17 ? {
      status: "LOCKED" as const,
      lockedFingerprint: LESSON3_SESSION_18_FINGERPRINT,
      selfReviewReceiptRef: "lesson3-session18-content-autopass-projection-no-repeat-2026-09-03",
      unlockDecisionRef: "owner-approved-full-b1-blueprint-bb53181a-2026-09-03",
    } : index === 18 ? {
      status: "LOCKED" as const,
      lockedFingerprint: LESSON3_SESSION_19_FINGERPRINT,
      selfReviewReceiptRef: "lesson3-session19-content-autopass-projection-no-repeat-2026-09-03",
      unlockDecisionRef: "owner-approved-full-b1-blueprint-bb53181a-2026-09-03",
    } : index === 19 ? {
      status: "LOCKED" as const,
      lockedFingerprint: LESSON3_SESSION_20_FINGERPRINT,
      selfReviewReceiptRef: "lesson3-session20-content-autopass-projection-no-repeat-2026-09-03",
      unlockDecisionRef: "owner-approved-full-b1-blueprint-bb53181a-2026-09-03",
    } : index === 20 ? {
      status: "LOCKED" as const,
      lockedFingerprint: LESSON3_SESSION_21_FINGERPRINT,
      selfReviewReceiptRef: "lesson3-session21-content-autopass-projection-no-repeat-2026-09-03",
      unlockDecisionRef: "owner-approved-full-b1-blueprint-bb53181a-2026-09-03",
    } : index === 21 ? {
      status: "LOCKED" as const,
      lockedFingerprint: LESSON3_SESSION_22_FINGERPRINT,
      selfReviewReceiptRef: "lesson3-session22-content-autopass-projection-no-repeat-2026-09-03",
      unlockDecisionRef: "owner-approved-full-b1-blueprint-bb53181a-2026-09-03",
    } : index === 22 ? {
      status: "LOCKED" as const,
      lockedFingerprint: LESSON3_SESSION_23_FINGERPRINT,
      selfReviewReceiptRef: "lesson3-session23-content-autopass-projection-no-repeat-2026-09-03",
      unlockDecisionRef: "owner-approved-full-b1-blueprint-bb53181a-2026-09-03",
    } : index === 23 ? {
      status: "LOCKED" as const,
      lockedFingerprint: LESSON3_SESSION_24_FINGERPRINT,
      selfReviewReceiptRef: "lesson3-session24-content-autopass-projection-no-repeat-2026-09-03",
      unlockDecisionRef: "owner-approved-full-b1-blueprint-bb53181a-2026-09-03",
    } : index === 24 ? {
      status: "LOCKED" as const,
      lockedFingerprint: LESSON3_SESSION_25_FINGERPRINT,
      selfReviewReceiptRef: "lesson3-session25-content-autopass-projection-no-repeat-2026-09-03",
      unlockDecisionRef: "owner-approved-full-b1-blueprint-bb53181a-2026-09-03",
    } : index === 25 ? {
      status: "LOCKED" as const,
      lockedFingerprint: LESSON3_SESSION_26_FINGERPRINT,
      selfReviewReceiptRef: "lesson3-session26-content-autopass-projection-no-repeat-2026-09-03",
      unlockDecisionRef: "owner-approved-full-b1-blueprint-bb53181a-2026-09-03",
    } : index === 26 ? {
      status: "LOCKED" as const,
      lockedFingerprint: LESSON3_SESSION_27_FINGERPRINT,
      selfReviewReceiptRef: "lesson3-session27-content-autopass-projection-no-repeat-2026-09-03",
      unlockDecisionRef: "owner-approved-full-b1-blueprint-bb53181a-2026-09-03",
    } : index === 27 ? {
      status: "LOCKED" as const,
      lockedFingerprint: LESSON3_SESSION_28_FINGERPRINT,
      selfReviewReceiptRef: "lesson3-session28-content-autopass-projection-no-repeat-2026-09-03",
      unlockDecisionRef: "owner-approved-full-b1-blueprint-bb53181a-2026-09-03",
    } : index === 28 ? {
      status: "LOCKED" as const,
      lockedFingerprint: LESSON3_SESSION_29_FINGERPRINT,
      selfReviewReceiptRef: "lesson3-session29-content-autopass-projection-no-repeat-2026-09-03",
      unlockDecisionRef: "owner-approved-full-b1-blueprint-bb53181a-2026-09-03",
    } : index === 29 ? {
      status: "LOCKED" as const,
      lockedFingerprint: LESSON3_SESSION_30_FINGERPRINT,
      selfReviewReceiptRef: "lesson3-session30-content-autopass-projection-no-repeat-2026-09-03",
      unlockDecisionRef: "owner-approved-full-b1-blueprint-bb53181a-2026-09-03",
    } : index === 30 ? {
      status: "LOCKED" as const,
      lockedFingerprint: LESSON3_SESSION_31_FINGERPRINT,
      selfReviewReceiptRef: "lesson3-session31-content-autopass-projection-no-repeat-2026-09-03",
      unlockDecisionRef: "owner-approved-full-b1-blueprint-bb53181a-2026-09-03",
    } : index === 31 ? {
      status: "LOCKED" as const,
      lockedFingerprint: LESSON3_SESSION_32_FINGERPRINT,
      selfReviewReceiptRef: "lesson3-session32-content-autopass-projection-no-repeat-2026-09-03",
      unlockDecisionRef: "owner-approved-full-b1-blueprint-bb53181a-2026-09-03",
    } : index === 32 ? {
      status: "LOCKED" as const,
      lockedFingerprint: LESSON3_SESSION_33_FINGERPRINT,
      selfReviewReceiptRef: "lesson3-session33-content-autopass-projection-no-repeat-2026-09-03",
      unlockDecisionRef: "owner-approved-full-b1-blueprint-bb53181a-2026-09-03",
    } : index === 33 ? {
      status: "LOCKED" as const,
      lockedFingerprint: LESSON3_SESSION_34_FINGERPRINT,
      selfReviewReceiptRef: "lesson3-session34-content-autopass-projection-no-repeat-2026-09-03",
      unlockDecisionRef: "owner-approved-full-b1-blueprint-bb53181a-2026-09-03",
    } : index === 34 ? {
      status: "LOCKED" as const,
      lockedFingerprint: LESSON3_SESSION_35_FINGERPRINT,
      selfReviewReceiptRef: "lesson3-session35-content-autopass-projection-no-repeat-2026-09-03",
      unlockDecisionRef: "owner-approved-full-b1-blueprint-bb53181a-2026-09-03",
    } : index === 35 ? {
      status: "LOCKED" as const,
      lockedFingerprint: LESSON3_SESSION_36_FINGERPRINT,
      selfReviewReceiptRef: "lesson3-session36-content-autopass-projection-no-repeat-2026-09-03",
      unlockDecisionRef: "owner-approved-full-b1-blueprint-bb53181a-2026-09-03",
    } : index === 36 ? {
      status: "LOCKED" as const,
      lockedFingerprint: LESSON3_SESSION_37_FINGERPRINT,
      selfReviewReceiptRef: "lesson3-session37-content-autopass-projection-no-repeat-2026-09-03",
      unlockDecisionRef: "owner-approved-full-b1-blueprint-bb53181a-2026-09-03",
    } : index === 37 ? {
      status: "LOCKED" as const,
      lockedFingerprint: LESSON3_SESSION_38_FINGERPRINT,
      selfReviewReceiptRef: "lesson3-session38-content-autopass-projection-no-repeat-2026-09-03",
      unlockDecisionRef: "owner-approved-full-b1-blueprint-bb53181a-2026-09-03",
    } : index === 38 ? {
      status: "LOCKED" as const,
      lockedFingerprint: LESSON3_SESSION_39_FINGERPRINT,
      selfReviewReceiptRef: "lesson3-session39-content-autopass-projection-no-repeat-2026-09-03",
      unlockDecisionRef: "owner-approved-full-b1-blueprint-bb53181a-2026-09-03",
    } : index === 39 ? {
      status: "LOCKED" as const,
      lockedFingerprint: LESSON3_SESSION_40_FINGERPRINT,
      selfReviewReceiptRef: "lesson3-session40-content-autopass-projection-no-repeat-2026-09-03",
      unlockDecisionRef: "owner-approved-full-b1-blueprint-bb53181a-2026-09-03",
    } : index === 40 ? {
      status: "LOCKED" as const,
      lockedFingerprint: LESSON3_SESSION_41_FINGERPRINT,
      selfReviewReceiptRef: "lesson3-session41-content-autopass-projection-no-repeat-2026-09-03",
      unlockDecisionRef: "owner-approved-full-b1-blueprint-bb53181a-2026-09-03",
    } : index === 41 ? {
      status: "DRAFT" as const,
      forbiddenFutureFingerprint: futureFingerprint(42),
    } : { status: "DRAFT" as const }),
  })));

export function lesson3AuthoringPreflightV1(
  requestedSessionOrdinal: number | undefined,
  actualFingerprints: Readonly<Record<number, string | null>>,
  entries: readonly Lesson1AuthoringRegistryEntryV1[] = LESSON3_AUTHORING_REGISTRY_V1,
): Lesson1AuthoringPreflightV1 {
  if (entries.length !== 56) throw new Error(`lesson3_authoring_registry_size_invalid:actual=${entries.length}`);
  const firstUnlocked = entries.findIndex((entry) => entry.status !== "LOCKED");
  const currentSessionOrdinal = firstUnlocked === -1 ? null : entries[firstUnlocked]!.sessionOrdinal;
  const lockedThrough = firstUnlocked === -1 ? entries.length : firstUnlocked;
  const forbiddenFrom = currentSessionOrdinal === null || currentSessionOrdinal === 56 ? null : currentSessionOrdinal + 1;
  for (const entry of entries.filter((entry) => entry.status === "LOCKED")) {
    if (!entry.lockedFingerprint || actualFingerprints[entry.sessionOrdinal] !== entry.lockedFingerprint) {
      throw new Error(`lesson3_locked_fingerprint_drift:session=${entry.sessionOrdinal}`);
    }
  }
  if (currentSessionOrdinal !== null && forbiddenFrom !== null) {
    const current = entries[firstUnlocked]!;
    const actual = hashCanonicalBody(entries.filter((entry) => entry.sessionOrdinal >= forbiddenFrom).map((entry) => [entry.sessionOrdinal, actualFingerprints[entry.sessionOrdinal]]));
    if (actual !== current.forbiddenFutureFingerprint) throw new Error(`lesson3_forbidden_future_fingerprint_drift:range=${forbiddenFrom}-56`);
  }
  if (requestedSessionOrdinal !== undefined && requestedSessionOrdinal !== currentSessionOrdinal) {
    throw new Error(`lesson3_authoring_out_of_order:requested=${requestedSessionOrdinal}:current=${currentSessionOrdinal ?? "none"}:lockedThrough=${lockedThrough}`);
  }
  return { lockedThrough, currentSessionOrdinal, forbiddenFrom };
}
