import { hashCanonicalBody } from "../../policies/decision_registry";
import type {
  Lesson1AuthoringPreflightV1,
  Lesson1AuthoringRegistryEntryV1,
} from "./lesson1_authoring_registry_v1";

export const LESSON2_AUTO_LOCK_AFTER_SELF_REVIEW_2026_08_31 =
  "owner-delegated-en-lesson-02-auto-lock-after-auto-pass-self-review-2026-08-31";

const EMPTY_SESSION_FILE_SET_FINGERPRINT = hashCanonicalBody([]);

function futureFingerprintAfter(sessionOrdinal: number): string | undefined {
  if (sessionOrdinal >= 56) return undefined;
  return hashCanonicalBody(
    Array.from({ length: 56 - sessionOrdinal }, (_unused, index) => [
      sessionOrdinal + index + 1,
      EMPTY_SESSION_FILE_SET_FINGERPRINT,
    ]),
  );
}

export const LESSON2_AUTHORING_REGISTRY_V1: readonly Lesson1AuthoringRegistryEntryV1[] =
  Object.freeze(
    Array.from({ length: 56 }, (_unused, index) => {
      const sessionOrdinal = index + 1;
      const lockedFingerprintBySession: Readonly<Record<number, string>> = {
        1: "026535028dd14e593580009e2fcc8c6e9012b647f9a7afc5cf9867a752fbbd34",
        2: "4eb6da8a9d5c6e069591504b5fbe20bcf61b3248c5498062cb5b7f0b5653730d",
        3: "190f7ae1944567f3c5f86ae47621c160b5076a595f57df4f179571223cc36632",
        4: "618035a290c9f0c1349695e5e737cdba8d94d33d26f82f801adca240963e0f1b",
        5: "71be1410e9e1ed7113d88d70920773eef0797a9739315bbf5039f1db0d8a0e88",
        6: "6f58c9d6c9ba23f0659616d8dc8e9eea28410741ad62f157913fbafa2b199cdf",
        7: "640227f295b8ed8d9e2033da52925238c6098b0860eb5d1e6665084935ba8494",
        8: "e41bb235c37d4ea81f30fe884808be64b829f5d2630754e8a7e59f0bdf7ff312",
        9: "9687ca89b325100e930a411d9ab2b673082ed98fc51a3f724ed2c46275c051c8",
        10: "590fe4db0d39a703976f556d47bf6a67343a0e4aa2647c3daeef169e25f76d98",
        11: "5fc03e43743d5b4de505a77a3c6627fc8674e8f8652fc99a971611a9b297a74e",
        12: "c27d655b4aec1caa8f8cdbe25072bfd1362ca6a7a018915d00bd08f671ee2261",
        13: "192592005881b6a287c987cbc2ecc2ecf5acbd09a05b306716ffe21c5ab8289f",
        14: "193cdf570fdf0e79ff1f414d3a60026595cdd83706ece84bd43ccbdff404390d",
        15: "fbf1257d41ea15db295d216ccaa9190cb3e505245fc7cc4b0d97e0f3a3e003f7",
        16: "e3443a3b3ea6db7839ff82cfaaee4180f6475c3a54804c0bc7f4355553d3ad53",
        17: "5a45e7dfa1ea57008e6cf33115d841b0ed5beb77dc1b7e688e1a1e85640d5063",
        18: "8bb3f9932c6a07ab941ec594f5a0a2bdc2ce15e078fb849c4065ff1f6a539963",
        19: "d7348e2edc732bfa72d7a605f1954df8313d9fb790ee7f7462c1889dc0185fed",
        20: "7a113d6564b477f007c00bd095e864cfeeb9eb0756e1e060fbf2b306d72a143b",
        21: "89e7b8e36a1320c3fd510db3e0d8122a86063c8d5e325c2c41145638153cb3ba",
        22: "c04f7f4584f7e3c69fb6b4861062c51154030dfaa7000b553947bdbe007d4433",
        23: "dcaebb2f51cea61e362bb2751f8dfbe335a1ed42edbbcb2257ff772b2f5f5f45",
        24: "644a87b4d357ab30982f3668e046ee5467d6544960b8e7c5431cb9708bc9a981",
        25: "3bd541450ce2b9e0a48ea72e362cb722212048dd8ace3e778003d3f0ecd85233",
        26: "e9a122a5bd3a67a08f9b7e8537495b3ddbe57e1f3532a8ce4d229081c54d8553",
        27: "cdf1d2c83d70e8970a30ada02fd5f9b4d2c784c98d780baad0a82419825d5e9a",
        28: "1f86cef0a43f7100e631c4458f5c95ba09162f0b6b8b1a02f38b5c827f418f7b",
        29: "b0757cb3a71c8b0ddb4649f922b082f3633aac2a6cd732d6d8d0fe0cde3ed5f4",
        30: "12924f90284a22007948d006a287904d05197ea4b9156a5af24c341a3f571973",
        31: "c7b96a51c145f66ec6d886a991e5ebaa7b899acf347b1f7b93cd4e5de71b7e39",
        32: "a1d2c2930d48c9ae07ab9164123b2e97f565a36c8d190bd9a7429ad02b9346f4",
        33: "fa90310a0173c1da9bbb1d029693a2e33ba3744be59bd921fea3bb99692a097e",
        34: "1ada1f1a50463116a24676cbec53ee2914893a2adeb090c06ac502ecb9c93502",
        35: "a72e1dc9758b4125147d284b88f7476de34202495d2552a6efe10b6b2277fad2",
        36: "b46e63bfaf2052eaee523d5e0df96c9885c39529982d0dc2dba76238560ef5c1",
        37: "243cac6ac1b8871e9d044bae053d6bcfee1086cbe77a58d16ceac9015215f874",
        38: "24d998d751a36476317765b7acb74a5322540392b5c1531b696e3773af652d99",
        39: "23e5b90ee50577f2f383f978a5e06b70584a1e6a54f993207c9f24912372ba8a",
        40: "bc39130f104cf65ea787d4f2c34ea9fddd3555d1b8ea04751f172fbb1c7823be",
        41: "c02a04d0fb6e7346b7ea65424a87aaf865535c200e4fa88160b6f868db1953c7",
        42: "606f09c29fea5f90eab8348135c3d2490867d059ab2699da353c5173b5adc7ef",
        43: "fad871f6feed090e6bc4936aa7595dbfa9cc623cea98598ffb849c714f26ae76",
        44: "9db8ac38af7c15f329f7a3e336c80af20fa2ce5abf05180a589a50289354c215",
        45: "912cd7ee7872f55ac05bec4f6b7c84c1b08e52d5f74a5ff97cd170dd4ea1ea89",
        46: "be72be54dba5a20599836b343316b04778c3b9326d825fc0b3c9988612ba5c15",
        47: "8bb24bf55b9e3e35967df6140eb6e6885a46f6a7e13d417024291058d8b0652f",
        48: "8c5d7dca161eaacabd6d808226ef48f1a7a928b517ec8e566dbb92d2528f4e60",
        49: "f0c4cc9db3df393855a7ab443a691f3dd7e1bd58f915743583a74fb5e0f1ac56",
        50: "a3487de072269c0ebaf634999772a7eec6f0e280afb0f511cd3c53f8b7a92e2d",
        51: "577a6147e2da86d552f190c7293d3bb0cdb503459ac31141967982b7c3d41cc4",
        52: "1e00ebc704b90cdf815fb00ee03fa99ba0a0aa7f2a14be551c7c6a0fb948451f",
        53: "2a13afd8ebc1a0149dbb1ac9d8980d29f8112719c44aaf6c0018118292d0954c",
        54: "0a2cec8cd4b0f9118f072e87881e969e585dd84b58caa3eec5eaf2abe6021f63",
        55: "db68d9fd037707a00a6d634337ceac2a59bfc3d5c6e444a4d1170e126a277b5f",
        56: "ad3233b7f247940f731d4dc1832ada773e2e0d7da22c8b36922ea697dca0766d",
      };
      const lockedFingerprint = lockedFingerprintBySession[sessionOrdinal];
      if (lockedFingerprint) {
        return Object.freeze({
          sessionOrdinal,
          status: "LOCKED" as const,
          lockedFingerprint,
          selfReviewReceiptRef: LESSON2_AUTO_LOCK_AFTER_SELF_REVIEW_2026_08_31,
          unlockDecisionRef: LESSON2_AUTO_LOCK_AFTER_SELF_REVIEW_2026_08_31,
          forbiddenFutureFingerprint: futureFingerprintAfter(sessionOrdinal),
        });
      }
      return Object.freeze({
        sessionOrdinal,
        status: "DRAFT" as const,
        forbiddenFutureFingerprint: futureFingerprintAfter(sessionOrdinal),
      });
    }),
  );

function assertRegistryShape(
  entries: readonly Lesson1AuthoringRegistryEntryV1[],
  actualFingerprints: Readonly<Record<number, string | null>>,
): void {
  if (entries.length !== 56) {
    throw new Error(`lesson2_authoring_registry_size_invalid:actual=${entries.length}`);
  }
  let encounteredUnlocked = false;
  entries.forEach((entry, index) => {
    const expectedOrdinal = index + 1;
    if (entry.sessionOrdinal !== expectedOrdinal) {
      throw new Error(`lesson2_authoring_registry_ordinal_invalid:expected=${expectedOrdinal}:actual=${entry.sessionOrdinal}`);
    }
    if (entry.status === "LOCKED") {
      if (encounteredUnlocked) {
        throw new Error(`lesson2_authoring_locked_prefix_broken:session=${entry.sessionOrdinal}`);
      }
      if (!entry.selfReviewReceiptRef?.trim() && !entry.ownerDecisionRef?.trim()) {
        throw new Error(`lesson2_authoring_lock_receipt_missing:session=${entry.sessionOrdinal}`);
      }
      if (!entry.lockedFingerprint?.trim()) {
        throw new Error(`lesson2_locked_fingerprint_missing:session=${entry.sessionOrdinal}`);
      }
      if (actualFingerprints[entry.sessionOrdinal] !== entry.lockedFingerprint) {
        throw new Error(`lesson2_locked_fingerprint_drift:session=${entry.sessionOrdinal}`);
      }
      return;
    }
    encounteredUnlocked = true;
    if (entry.status === "OWNER_APPROVED") {
      throw new Error(`lesson2_authoring_manual_approval_retired:session=${entry.sessionOrdinal}`);
    }
    if (
      (entry.status === "AUTO_PASS" || entry.status === "SELF_REVIEW_PASS") &&
      !entry.candidateFingerprint?.trim()
    ) {
      throw new Error(`lesson2_candidate_fingerprint_missing:session=${entry.sessionOrdinal}:status=${entry.status}`);
    }
    if (
      entry.candidateFingerprint &&
      actualFingerprints[entry.sessionOrdinal] !== entry.candidateFingerprint
    ) {
      throw new Error(`lesson2_candidate_fingerprint_drift:session=${entry.sessionOrdinal}:status=${entry.status}`);
    }
  });
}

export function lesson2AuthoringPreflightV1(
  requestedSessionOrdinal: number | undefined,
  actualFingerprints: Readonly<Record<number, string | null>>,
  entries: readonly Lesson1AuthoringRegistryEntryV1[] = LESSON2_AUTHORING_REGISTRY_V1,
): Lesson1AuthoringPreflightV1 {
  assertRegistryShape(entries, actualFingerprints);
  const firstUnlockedIndex = entries.findIndex((entry) => entry.status !== "LOCKED");
  const lockedThrough = firstUnlockedIndex === -1 ? entries.length : firstUnlockedIndex;
  const currentSessionOrdinal = firstUnlockedIndex === -1
    ? null
    : entries[firstUnlockedIndex]!.sessionOrdinal;
  const forbiddenFrom = currentSessionOrdinal === null || currentSessionOrdinal >= 56
    ? null
    : currentSessionOrdinal + 1;

  if (currentSessionOrdinal !== null && forbiddenFrom !== null) {
    const currentEntry = entries[firstUnlockedIndex]!;
    if (!currentEntry.forbiddenFutureFingerprint?.trim()) {
      throw new Error(`lesson2_forbidden_future_fingerprint_missing:current=${currentSessionOrdinal}`);
    }
    const actual = hashCanonicalBody(
      entries
        .filter((entry) => entry.sessionOrdinal >= forbiddenFrom)
        .map((entry) => [entry.sessionOrdinal, actualFingerprints[entry.sessionOrdinal]]),
    );
    if (actual !== currentEntry.forbiddenFutureFingerprint) {
      throw new Error(`lesson2_forbidden_future_fingerprint_drift:range=${forbiddenFrom}-56`);
    }
  }

  if (requestedSessionOrdinal !== undefined && requestedSessionOrdinal !== currentSessionOrdinal) {
    throw new Error(
      `lesson2_authoring_out_of_order:requested=${requestedSessionOrdinal}:current=${currentSessionOrdinal ?? "none"}:lockedThrough=${lockedThrough}`,
    );
  }
  return { lockedThrough, currentSessionOrdinal, forbiddenFrom };
}
