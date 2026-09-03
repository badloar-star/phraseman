import { hashCanonicalBody } from "../../policies/decision_registry";

export type Lesson1AuthoringStatusV1 =
  | "DRAFT"
  | "AUTO_PASS"
  | "OWNER_APPROVED"
  | "LOCKED";

export interface Lesson1AuthoringRegistryEntryV1 {
  readonly sessionOrdinal: number;
  readonly status: Lesson1AuthoringStatusV1;
  readonly lockedFingerprint?: string;
  readonly candidateFingerprint?: string;
  readonly forbiddenFutureFingerprint?: string;
  readonly ownerDecisionRef?: string;
  readonly unlockDecisionRef?: string;
}

export interface Lesson1AuthoringPreflightV1 {
  readonly lockedThrough: number;
  readonly currentSessionOrdinal: number | null;
  readonly forbiddenFrom: number | null;
}

// зачем: параллельный испанский контур (владелец, 2026-08-23) нуждается в
// собственном реестре сессий, изолированном от английского. Реестр хранится
// по языку; английский экспорт ниже сохраняет прежнее API-имя, но статусы обоих
// контуров могут независимо меняться по прямому owner decision.
export const V2_AUTHORING_TARGET_LANGUAGES = ["en", "es"] as const;
export type V2AuthoringTargetLanguage =
  (typeof V2_AUTHORING_TARGET_LANGUAGES)[number];

export function isV2AuthoringTargetLanguage(
  value: unknown,
): value is V2AuthoringTargetLanguage {
  return (
    typeof value === "string" &&
    (V2_AUTHORING_TARGET_LANGUAGES as readonly string[]).includes(value)
  );
}

const OWNER_UNLOCKED_ALL_FOR_MODE_NATIVE_REWRITE =
  "owner-unlocked-all-learning-v2-mode-native-rewrite-2026-08-25";
// зачем повторно открыто (владелец, 2026-08-28, «давай» после аудита новой
// Библии текстов): прежнее телефонное одобрение относилось к старому текстовому
// контракту. Новый evaluator доказал 48 intro_body_overloaded и отсутствие
// актуального review receipt, поэтому сессия 1 была снова открыта, а 2-56
// заморожены одним точным отпечатком до её повторного AUTO_PASS/owner review.
const OWNER_REOPENED_EN_SESSION_1_FOR_TEXT_BIBLE =
  "owner-reopened-en-lesson-01-session-01-for-text-bible-2026-08-28";
// зачем AUTO_PASS (2026-08-28): новая Библия текстов применена к трём интро,
// word-first guidance и feedback во всех восьми локалях; focused text,
// choreography, runtime-native, mode-native и preflight gates зелёные.
// Это только машинный кандидат: независимое review и повторное решение
// владельца ещё обязательны, поэтому OWNER_APPROVED/LOCKED не выставляются.
const EN_SESSION_1_TEXT_BIBLE_CANDIDATE_FINGERPRINT =
  "d73f1e1f2cdcd6b548b28129e2f990a5a1df51fb85dac04141003f4757d9b1dc";
// зачем LOCKED (владелец, 2026-08-28, «Давай сессия 2 теперь»): после
// повторного AUTO_PASS по новой Библии текстов владелец прямо разрешил перейти
// к следующему ordinal. Это повторное owner review именно актуального
// fingerprint, а не восстановление старого телефонного approval.
const OWNER_APPROVED_EN_SESSION_1_TEXT_BIBLE =
  "owner-approved-en-lesson-01-session-01-text-bible-2026-08-28";
// зачем LOCKED (владелец, 2026-08-28, «сессия 2 одобрена»): перед фиксацией
// новый projection guard обнаружил два экрана лишь с двумя ловушками. Для sad
// и fine вручную добавлены третьи phonetic traps во всех восьми локалях;
// current-session integrity и owner HTML повторно проходят на этом exact hash.
const EN_SESSION_2_LOCKED_FINGERPRINT =
  "ac55b9a5027a31f3089fe435cb1658cb3eefeb23cd1a834359371effff6ce4a0";
const OWNER_APPROVED_EN_SESSION_2_AFTER_OWNER_REVIEW =
  "owner-approved-en-lesson-01-session-02-after-owner-review-2026-08-28";
// зачем повторно открыты 1–3 (владелец, 2026-08-28, «переделай все три
// сессии с новыми гейтами»): одобрения 1–2 относились к более раннему
// контракту. Новые атомарные варианты, точный feedback и projection gates
// применяются последовательно заново, начиная с session 1. Диапазон 2–56
// заморожен по фактическим source fingerprints до GREEN первой сессии.
const OWNER_REOPENED_EN_SESSIONS_1_TO_3_FOR_STRICT_GATES =
  "owner-reopened-en-lesson-01-sessions-01-03-for-strict-gates-2026-08-28";
const OWNER_ORDERED_EN_SESSIONS_1_TO_3_STRICT_REWRITE =
  "owner-ordered-en-lesson-01-sessions-01-03-strict-rewrite-2026-08-28";
// зачем пересчитаны LOCKED hashes: прямое решение владельца 2026-08-28
// запретило буквенную сборку и native-language semantic quiz во всех уже
// доступных сессиях. Session 1 теперь спрашивает английскую I/i/l, session 3
// собирает I'm одной цельной плиткой, а все 1-3 несут intro grammar dimensions.
const OWNER_REQUIRED_GLOBAL_GRAMMAR_INTRO_AND_NO_LETTER_GATE =
  "owner-required-global-intro-grammar-and-no-letter-assembly-2026-08-28";
const EN_SESSION_1_STRICT_GATES_LOCKED_FINGERPRINT =
  "7bd55266a75dc118f854d8df23d30daa917e6cb1c5ce3301bad07f5661d0d065";
const EN_SESSION_2_STRICT_GATES_LOCKED_FINGERPRINT =
  "24dfad85aa916dafa7b87bb5d965839a56f7f6c7eac4d88c2aa9fb64764a5eff";
const OWNER_APPROVED_EN_SESSION_3 =
  "owner-approved-en-lesson-01-session-03-next-session-request-2026-08-28";
const EN_SESSION_3_LOCKED_FINGERPRINT =
  "972d8629ea58b0fdf021c415e583c11f5cf84a6fd172aadbc5c6a3a2123c2786";
const EN_SESSION_2_STRICT_GATES_FORBIDDEN_FUTURE_FINGERPRINT =
  "78cdda8fb03525c41f7fcab073051d9284382fe5dd5f00e51f0eb04472b67b10";
const EN_SESSION_1_STRICT_GATES_FORBIDDEN_FUTURE_FINGERPRINT =
  "e079b2b27d52ec87e75610c62aac7bc5b8fad70bba8038559f806ac6558eeb97";
// зачем future hash: после LOCKED 1-2 единственной доступной для authoring
// становится session 3; диапазон 4-56 защищён одним hash фактических source
// fingerprints и не может дрейфовать во время работы над третьей.
const EN_SESSION_4_FORBIDDEN_FUTURE_FINGERPRINT =
  "b5f9d9bcf814bc59e5c749e65d6c2b66aba83eda87aa1383cd692239906a6a9b";
// зачем снова открыта Session 1 (владелец, 2026-08-30, «давай» после показа
// exact Full B1 fingerprint): новый curriculum approval не переутверждает
// старые learner-facing Sessions 1–3. Они сверяются последовательно с новым
// packet graph, поэтому текущая Session 1 DRAFT, а байтовое состояние 2–56
// заморожено этим агрегатным fingerprint до её отдельного AUTO_PASS/review.
const OWNER_APPROVED_FULL_B1_BLUEPRINT_REOPEN_SESSION_01 =
  "owner-approved-full-b1-blueprint-reopen-session-01-2026-08-30";
const EN_FULL_B1_SESSION_01_FORBIDDEN_FUTURE_FINGERPRINT =
  "b38bac876bb3874683e0adbfc759fc3ecd7b1bc4eb128f244f5e52e68b4a4cff";
// Прямой owner-order от 2026-08-31: после AUTOPASS, self-review и всех узких
// gates сессия автоматически LOCKED; ручной промежуточный approval не нужен.
const OWNER_ORDERED_FULL_B1_SEQUENTIAL_AUTOLOCK_2026_08_31 =
  "owner-ordered-full-b1-sequential-autolock-2026-08-31";
const EN_SESSION_1_FULL_B1_LOCKED_FINGERPRINT =
  "8c869e2d02f980351edb1bcfbc6755c580497c51b03e4753916c12254494b3c9";
const EN_SESSION_2_FULL_B1_FORBIDDEN_FUTURE_FINGERPRINT =
  "edd12e61d51332c74f5e7085fb9eae1ec4a72e134431213c6af46b88c8137372";
const EN_SESSION_2_FULL_B1_LOCKED_FINGERPRINT =
  "e3c33b209176329569d1c73da46ba0202375fb49b3d3bc3a96b007b0c8a9db01";
// Session 3: exact Full B1 packet (busy / free / late), AUTOPASS, self-review
// and narrow gates complete under the owner's sequential auto-lock order.
const EN_SESSION_3_FULL_B1_LOCKED_FINGERPRINT =
  "4d07a5636ba8e34f85be515f66c7b0e5f1df190b01186b2c6d8269a088811041";
// Session 4 was reopened by the mandatory per-session unique-primary-target
// gate.  The tail is a file-byte seal because its legacy modules must not be
// executed while Session 4 is repaired first.
const EN_SESSION_4_FULL_B1_FORBIDDEN_FUTURE_FINGERPRINT =
  "daf6e9d701f214546edc5d6275a7b5274dfe6884a2631e905a0884b24d65ad90";
// Session 4 has passed its exact packet, owner-review mock, self-review and
// narrow gates under the owner's sequential auto-lock order. Session 5 is now
// the sole writable ordinal; this fingerprint freezes the untouched 6–56 tail.
const EN_SESSION_4_FULL_B1_LOCKED_FINGERPRINT =
  "c30eab802e23e66196deddb25d50c774354be22952827453640f11d261f34bbd";
const EN_SESSION_5_FULL_B1_FORBIDDEN_FUTURE_FINGERPRINT =
  "b871fc8aeb65f982f855d9fead2c8960053aa58b2d959242926b8a97f25e09ab";
const EN_SESSION_5_FULL_B1_LOCKED_FINGERPRINT =
  "d494a3217c7ec4ed0ccbf8d8d24eaaedd31b0151e6d8e32476ab14094f6f584b";
const EN_SESSION_6_FULL_B1_FORBIDDEN_FUTURE_FINGERPRINT =
  "9ba9dc6afcbfdf68dfa4307ddb2ab8e2f231a9b2dcc3f80e19884720864e237b";
const EN_SESSION_6_FULL_B1_LOCKED_FINGERPRINT =
  "da1fb9e7e0037aee820cfade44b8977dc3751b2477477b7a909b2f93a29dc8d7";
const EN_SESSION_7_FULL_B1_FORBIDDEN_FUTURE_FINGERPRINT =
  "85a0d3ee8aca9da1f3d344d87f8037fdedc2260c540deb6716b74859f8b06543";
const EN_SESSION_7_FULL_B1_LOCKED_FINGERPRINT =
  "18390a7f8ee0fe7a6dca2a7a9917ed28b380de6ebf68cefc7e5b6560e1989a43";
const EN_SESSION_8_FULL_B1_FORBIDDEN_FUTURE_FINGERPRINT =
  "545848e650497646ef4c3357b6d9e098124c38e0279501acaad40fca1980c775";
// Session 8 is the approved grammar checkpoint: no newly scored vocabulary,
// six different retrieval targets, and one retrieval-only Speed Match.
const EN_SESSION_8_FULL_B1_LOCKED_FINGERPRINT =
  "1262638f8b7d00a38ae2cd1ff44841e3a5403a0ff7aa01350e04a3f0a93bd92b";
const EN_SESSION_9_FULL_B1_FORBIDDEN_FUTURE_FINGERPRINT =
  "5196a2c490a48b6f3495c95d14f4b7073ddeb0fb7dab00bf5facb5f9ff706dfa";
const EN_SESSION_9_FULL_B1_LOCKED_FINGERPRINT =
  "284c0fea1ad921ceddf38fe15c9b0713778688825466f6aec063ee8a22188dbd";
const EN_SESSION_10_FULL_B1_LOCKED_FINGERPRINT =
  "d2ec73675b4f5ed9d1baf1b39140218c1fb16391086170a58458bde55768c828";
const EN_SESSION_11_FULL_B1_LOCKED_FINGERPRINT =
  "1ac493098ade4ccb9c158f739310db7f089094ff6161e2841be2bb2026a71e89";
const EN_SESSION_12_FULL_B1_LOCKED_FINGERPRINT =
  "96c583f0bfb7bbd7fc7b2b18b5a540b5b99a96727a65cab8031da40dee471ee6";
// Sessions 10–12 were marked LOCKED before their real course-child projection
// was rechecked. Session 10 then drifted during its repair and all three fail
// materialization. The owner review catalogue must not present that stale
// registry claim as a ready learner session; reopen the first affected ordinal
// and freeze the untouched future files until it earns a fresh exact receipt.
const EN_SESSION_10_REPAIR_FORBIDDEN_FUTURE_FINGERPRINT =
  "dfddc4dc5035feb4b3c4fbb27cac97addd1de43e826aff194f814fe1a06c7149";
const EN_SESSION_11_REPAIR_FORBIDDEN_FUTURE_FINGERPRINT =
  "516564fc34d0458eafa58ebf4236533d680aaa9d21b4b1eac74ce8cf21a8d10f";
const EN_SESSION_12_REPAIR_FORBIDDEN_FUTURE_FINGERPRINT =
  "6bd04041c6f154f5622c8b2450f894dfeefd766a8fedbecbf44ac5a61422771b";
const EN_SESSION_13_FULL_B1_FORBIDDEN_FUTURE_FINGERPRINT =
  "07ae4b3931546c92e3c844185dec2cd416fe277ee7b43fc0b66a77a108ee646f";
const EN_SESSION_13_FULL_B1_LOCKED_FINGERPRINT =
  "dc63b21dcb678b81d972d93cc842b69e5fa4635f1678fbfe6fed8e4e57b24721";
const EN_SESSION_14_FULL_B1_FORBIDDEN_FUTURE_FINGERPRINT =
  "8016cb9ba3aa7beae1dcc10d4c481bcea3c70aa41d3e4f393df95e39c1886401";
const EN_SESSION_14_FULL_B1_LOCKED_FINGERPRINT =
  "8fefef0bc97c021632a010d0c9f82a4d5ee0d710b1dde2a9e2ec974b399d73cd";
const EN_SESSION_15_FULL_B1_FORBIDDEN_FUTURE_FINGERPRINT =
  "0578d1c3519f4d4bcad3b611f11f0026991801bede5b6e4e15f11d71cd902113";
const EN_SESSION_15_FULL_B1_LOCKED_FINGERPRINT =
  "c061cdf13293c4dfd95c8a4598a95c5559113a7a4e74e196d3e17c6e1ea84189";
const EN_SESSION_16_FULL_B1_LOCKED_FINGERPRINT =
  "1113eb9697f62900a816c3e9e31a17870c76a845b46e298ad7e65a75b7d613e4";
const EN_SESSION_17_FULL_B1_FORBIDDEN_FUTURE_FINGERPRINT =
  "d4a7680e75c4234356d67ed39bb145136cf0080710f4076f62ed3c6d3eecaa38";
const EN_SESSION_18_FULL_B1_FORBIDDEN_FUTURE_FINGERPRINT =
  "cb708655de7998fe900e2d6a77960faeec5427566a8507ac032d7775c8bb8209";
const EN_SESSION_19_FULL_B1_FORBIDDEN_FUTURE_FINGERPRINT =
  "6b9157f02b9b31b4ffce76146aa4c3df7b2554834c3a1569a26360bf54d27a6e";
const EN_SESSION_20_FULL_B1_FORBIDDEN_FUTURE_FINGERPRINT =
  "71926c774ff6fc26bd41b1301ee3c759d34230bd8d806615d48b0e614fdd30af";
const EN_SESSION_21_FULL_B1_FORBIDDEN_FUTURE_FINGERPRINT =
  "acec62644068fbcee8b97ec7809a9c8846b3ead1a7a6fb4cd8cfaa9103acd896";
const EN_SESSION_22_FULL_B1_FORBIDDEN_FUTURE_FINGERPRINT =
  "52a31d7cd7c7ff3813d8c1b0a39f58ee866ab7545acb70ba671766a57200cb0c";
const EN_SESSION_23_FULL_B1_FORBIDDEN_FUTURE_FINGERPRINT =
  "0472a235882530844ece89dfe6b5c01e71c3c90520ca47e813212411684d08e8";
const EN_SESSION_24_FULL_B1_FORBIDDEN_FUTURE_FINGERPRINT =
  "82e9b0de627643f2319606d3e71696dbaf7dda1e335007407acafdafbe5c5e58";
const EN_SESSION_25_FULL_B1_FORBIDDEN_FUTURE_FINGERPRINT =
  "e8b693661c0cd3deba0d1e9fa6c1c4a93d40203d83b0d08079007b12ced926f4";
const EN_SESSION_26_FULL_B1_FORBIDDEN_FUTURE_FINGERPRINT =
  "e563bc4434b0ac59bc65a841752966f1a543d227daa2f78957ee19b413cf8da4";
const EN_SESSION_27_FULL_B1_FORBIDDEN_FUTURE_FINGERPRINT =
  "fddcff300316348731e26d7bcc129cac29d90f2b6a6f50d2f2bb0b96eac163c3";
const EN_SESSION_28_FULL_B1_FORBIDDEN_FUTURE_FINGERPRINT =
  "1876a06babb42c53f078f3c602b30228a59ec5fdd79fc3d0e96dfd66f1f76f91";
const EN_SESSION_29_FULL_B1_FORBIDDEN_FUTURE_FINGERPRINT =
  "2adb8b7c9037b79f4ff2316d1b15edf0a58a3d9581881cdc3efab759f632946c";
const EN_SESSION_30_FULL_B1_FORBIDDEN_FUTURE_FINGERPRINT =
  "96b4317b3deda3628f8307cecdf1ccc2f6a901a31b75eec9db91070386d78c75";
const EN_SESSION_31_FULL_B1_FORBIDDEN_FUTURE_FINGERPRINT =
  "e4075878d3efcc7ef846e1f791b113f2be2d98ee581b519c5ad93837938ea7f6";
const EN_SESSION_32_FULL_B1_FORBIDDEN_FUTURE_FINGERPRINT =
  "b2ec8ccb9b9fb3774442662ecd2b5cc6e769bba9963d6e13b336a8f95f612338";
const EN_SESSION_33_FULL_B1_FORBIDDEN_FUTURE_FINGERPRINT =
  "26b2147ef33312f4abb2cd331d47de27526cc440a1427a35a7c2cfc2963953a9";
const EN_SESSION_34_FULL_B1_FORBIDDEN_FUTURE_FINGERPRINT =
  "1b09ebbe8ac998abe99ecd286723d045b7f60f6b088d014a4a265e5577b56f60";
const EN_SESSION_35_FULL_B1_FORBIDDEN_FUTURE_FINGERPRINT =
  "1c582187272769a540509ebc61aaa79e6c0e825b90c47292f96116cae0ae9eea";
const EN_SESSION_36_FULL_B1_FORBIDDEN_FUTURE_FINGERPRINT =
  "20747bd0a7e2ca98300c0450c609c494bbdeba7d392cda081f9f9fd2a18193f6";
const EN_SESSION_37_FULL_B1_FORBIDDEN_FUTURE_FINGERPRINT =
  "77e928ae0694b2118a6bf5ea80a1216e4e80f094d172073aef824c3630ebb876";
const EN_SESSION_38_FULL_B1_FORBIDDEN_FUTURE_FINGERPRINT =
  "a8ac6a9fe741537cacea7cb01ce5d6c09c72bae425d6e2d6862ac7fb5f31f009";
const EN_SESSION_39_FULL_B1_FORBIDDEN_FUTURE_FINGERPRINT =
  "ad859d43610d12f266826c8a24154955b0cbad2b329138d7f6337cd3bb6fa52a";
const EN_SESSION_40_FULL_B1_FORBIDDEN_FUTURE_FINGERPRINT =
  "ed6b36bd5c26b645aa4b9a420bbf4216a459641b974aceeac87fb7066c050278";
const EN_SESSION_41_FULL_B1_FORBIDDEN_FUTURE_FINGERPRINT =
  "b90a953daa794dc67fd2dd1d9fa22541810ad2e7252f5e24d2c915c0600846d8";
const EN_SESSION_42_FULL_B1_FORBIDDEN_FUTURE_FINGERPRINT =
  "95af2c387203cb1f3d0c14d50b1944bf9b38d98b410d55ac3e65025f8d1e97d8";
const EN_SESSION_43_FULL_B1_FORBIDDEN_FUTURE_FINGERPRINT =
  "4a68b98542c42dab2db62e3a3bbadb1ff9a80f9483eb33ef7b1b67f2a592c6e3";
const EN_SESSION_44_FULL_B1_FORBIDDEN_FUTURE_FINGERPRINT =
  "9a69c8262215530fb0968ede12aa8a5bfd7a805864f94b4d9e5dc771f5124595";
const EN_SESSION_45_FULL_B1_FORBIDDEN_FUTURE_FINGERPRINT =
  "9866050a44ff4fcff16ab57c53a0e440a0f08dd5b33752f3ba1c990035882158";
const EN_SESSION_46_FULL_B1_FORBIDDEN_FUTURE_FINGERPRINT =
  "00acb9bcf827879371781e4c186e274cec4ed9da53fd2c3e988e5cf57dcbb8f5";
const EN_SESSION_47_FULL_B1_FORBIDDEN_FUTURE_FINGERPRINT =
  "a76fcb208f12450bdaabe9ae43865a138cf7f9567a0f8292cc5cfb5d9d2c6b31";
const EN_SESSION_48_FULL_B1_FORBIDDEN_FUTURE_FINGERPRINT =
  "91c83aa3a4b126af3a737e3390dccde78c982fb83bede038e487b508d6a32239";
const EN_SESSION_49_FULL_B1_FORBIDDEN_FUTURE_FINGERPRINT =
  "cca7635b89e690a92229535f9c6e4d30a44ea3c7e0793ac677b8644cac7505e6";
const EN_SESSION_50_FULL_B1_FORBIDDEN_FUTURE_FINGERPRINT =
  "5ce7cc543fcb0327b7f03d97bfd5605b3e5236070cd1c2c5d2f0c30fe6debb46";
const EN_SESSION_51_FULL_B1_FORBIDDEN_FUTURE_FINGERPRINT =
  "6fc6da1c100bb906599727d96e2ae6aa7cc4fc9c1380df70d335046518d5df90";
const EN_SESSION_52_FULL_B1_FORBIDDEN_FUTURE_FINGERPRINT =
  "c2f2f73f8e81fb77fec6bcb1fb5c5d8c9fead74008c2392bace9aa57915622e6";
const EN_SESSION_53_FULL_B1_FORBIDDEN_FUTURE_FINGERPRINT =
  "584d9cd1f2db9550078459a28cd466cd2cef55718e8704fa8a631a214d9d99de";
const EN_SESSION_54_FULL_B1_FORBIDDEN_FUTURE_FINGERPRINT =
  "39c6eb27184c3faf25922f28f162113e6559d81c3340c65fdf11e3e0f4a6d0bb";
const EN_SESSION_55_FULL_B1_FORBIDDEN_FUTURE_FINGERPRINT =
  "ee5ac4552ef5c33ac1ae4bebfac07bd71593f986b97497437718d32bdf21ae63";
const EN_SESSION_56_FULL_B1_FORBIDDEN_FUTURE_FINGERPRINT =
  "8d85104da37bd5daa5bc19c889efe502c34a6612e7ac14eef71520eda1aa1036";
// зачем пересчитано (2026-08-27, во время mode-native переписи испанской
// сессии 1): исходное значение было зафиксировано на другом снимке диапазона
// 2-56 — старые (pre-mode-native) сессии 2-33 продолжали существовать в
// es_authored_sessions_v1.ts своим прежним DRAFT-содержимым, документально
// возвращённым в DRAFT owner-decision 2026-08-25 (СТАРТ ES §10), но физически
// присутствующим в реестре до их собственной последовательной переработки.
// Значение ниже — точный hashCanonicalBody от их ТЕКУЩЕГО (не тронутого этой
// правкой) состояния; drift здесь означал бы, что содержимое 2-56 незаметно
// изменилось, а не то, что оно вообще существует.
const ES_SESSION_1_MODE_NATIVE_FORBIDDEN_FUTURE_FINGERPRINT =
  "b87310f4775514e088b0237c007bb19c60fc58e87de377184cc89d3e446c9d10";
// зачем LOCKED (владелец, 2026-08-27): испанская сессия 1 пройдена и одобрена
// владельцем лично на устройстве (playable mock §8-bis СТАРТ ES.md) — переход
// AUTO_PASS → OWNER_APPROVED → LOCKED. Значение — точный hashCanonicalBody
// содержимого сессии 1 ПОСЛЕ финальных правок (дубль mentira в EXTRA_MEANING_
// TRAPS, интро-страница про es без упоминания fácil, перегенерация аудио) —
// любое дальнейшее изменение source даёт немедленный HOLD fingerprint drift.
// зачем пересчитан 2026-08-27 второй раз: интро-страница про es была ужата до
// трёх предложений и уронила машинный гейт качества (intro_body_too_thin,
// MIN_BODY_CHARS=300 + минимум 4 предложения). Гейт блокировал ВСЮ сессию —
// бандл переставал отдаваться, приложение уходило в сеть и падало с
// stable_identity_unavailable. Текст восстановлен до нормы плотности,
// отпечаток обновлён под него.
const ES_SESSION_1_LOCKED_FINGERPRINT =
  "e55f18f0833fd17460889a9b0dee95b77e13c81050dcc51ab134e4c6f06781c1";
const OWNER_APPROVED_ES_SESSION_1 =
  "owner-approved-es-lesson-01-session-01-after-phone-review-2026-08-27";
// зачем session 2 (владелец, 2026-08-27, «создай следующую испанскую
// сессию»): точный hashCanonicalBody диапазона 3-56 (все null — контент не
// написан), тем же способом, что и preflight считает forbiddenFutureFingerprint
// сам. Испанская сессия 2 (mode-native, тема negation_no) уже написана в
// es_episode_01_session_02_v1.ts и ждёт своего playable mock + одобрения
// владельца — тот же путь DRAFT → AUTO_PASS → OWNER_APPROVED → LOCKED.
const ES_SESSION_2_MODE_NATIVE_FORBIDDEN_FUTURE_FINGERPRINT =
  "19b4062c0fc9e573a7c8dadc9466ce81b5297fb89e3a3d042b77a1a5409675d7";

function buildEnglishRegistry(): Lesson1AuthoringRegistryEntryV1[] {
  // The Full B1 learner-facing catalogue was falsely promoted by structural
  // gates.  Until the independent learner audit and exact rewrites rebuild a
  // contiguous accepted prefix, every English session is truthfully DRAFT;
  // the first entry seals the untouched tail and makes S1 the only writable
  // ordinal.
  const truthfulDraftRegistry = buildDraftRegistry();
  if (truthfulDraftRegistry.length === 56) {
    return [
      {
        ...truthfulDraftRegistry[0]!,
        forbiddenFutureFingerprint:
          "87f3c0e7d3d9509eb22f0fce5532ebbed4adb28e1b780693f00e914a01c76491",
        unlockDecisionRef: OWNER_APPROVED_FULL_B1_BLUEPRINT_REOPEN_SESSION_01,
      },
      ...truthfulDraftRegistry.slice(1),
    ];
  }
  return Array.from({ length: 56 }, (_, index) => {
    const sessionOrdinal = index + 1;
    if (sessionOrdinal === 1) {
      return {
        sessionOrdinal,
        // The current source is being repaired after the learner-projection
        // audit found a seven-card truncation.  A historical LOCKED hash must
        // never disguise that drift: S1 is the sole executable ordinal again.
        status: "DRAFT" as const,
        forbiddenFutureFingerprint:
          "e77aa6f2b95f260bf467c2abfbd39fef6053c1e8c1606a2b708cffbfdf156ea8",
        unlockDecisionRef: OWNER_APPROVED_FULL_B1_BLUEPRINT_REOPEN_SESSION_01,
      };
    }
    if (sessionOrdinal === 2) {
      return {
        sessionOrdinal,
        status: "LOCKED" as const,
        lockedFingerprint: EN_SESSION_2_FULL_B1_LOCKED_FINGERPRINT,
        ownerDecisionRef: OWNER_ORDERED_FULL_B1_SEQUENTIAL_AUTOLOCK_2026_08_31,
        unlockDecisionRef: OWNER_ORDERED_FULL_B1_SEQUENTIAL_AUTOLOCK_2026_08_31,
      };
    }
    if (sessionOrdinal === 3) {
      return {
        sessionOrdinal,
        status: "LOCKED" as const,
        lockedFingerprint: EN_SESSION_3_FULL_B1_LOCKED_FINGERPRINT,
        ownerDecisionRef: OWNER_ORDERED_FULL_B1_SEQUENTIAL_AUTOLOCK_2026_08_31,
        unlockDecisionRef: OWNER_ORDERED_FULL_B1_SEQUENTIAL_AUTOLOCK_2026_08_31,
      };
    }
    if (sessionOrdinal === 4) {
      return {
        sessionOrdinal,
        status: "LOCKED" as const,
        lockedFingerprint: EN_SESSION_4_FULL_B1_LOCKED_FINGERPRINT,
        ownerDecisionRef: OWNER_ORDERED_FULL_B1_SEQUENTIAL_AUTOLOCK_2026_08_31,
        unlockDecisionRef: OWNER_ORDERED_FULL_B1_SEQUENTIAL_AUTOLOCK_2026_08_31,
      };
    }
    if (sessionOrdinal === 5) {
      return {
        sessionOrdinal,
        status: "LOCKED" as const,
        lockedFingerprint: EN_SESSION_5_FULL_B1_LOCKED_FINGERPRINT,
        ownerDecisionRef: OWNER_ORDERED_FULL_B1_SEQUENTIAL_AUTOLOCK_2026_08_31,
        unlockDecisionRef: OWNER_ORDERED_FULL_B1_SEQUENTIAL_AUTOLOCK_2026_08_31,
      };
    }
    if (sessionOrdinal === 6) {
      return {
        sessionOrdinal,
        status: "LOCKED" as const,
        lockedFingerprint: EN_SESSION_6_FULL_B1_LOCKED_FINGERPRINT,
        ownerDecisionRef: OWNER_ORDERED_FULL_B1_SEQUENTIAL_AUTOLOCK_2026_08_31,
        unlockDecisionRef: OWNER_ORDERED_FULL_B1_SEQUENTIAL_AUTOLOCK_2026_08_31,
      };
    }
    if (sessionOrdinal === 7) {
      return {
        sessionOrdinal,
        status: "LOCKED" as const,
        lockedFingerprint: EN_SESSION_7_FULL_B1_LOCKED_FINGERPRINT,
        ownerDecisionRef: OWNER_ORDERED_FULL_B1_SEQUENTIAL_AUTOLOCK_2026_08_31,
        unlockDecisionRef: OWNER_ORDERED_FULL_B1_SEQUENTIAL_AUTOLOCK_2026_08_31,
      };
    }
    if (sessionOrdinal === 8) {
      return {
        sessionOrdinal,
        status: "LOCKED" as const,
        lockedFingerprint: EN_SESSION_8_FULL_B1_LOCKED_FINGERPRINT,
        ownerDecisionRef: OWNER_ORDERED_FULL_B1_SEQUENTIAL_AUTOLOCK_2026_08_31,
        unlockDecisionRef: OWNER_ORDERED_FULL_B1_SEQUENTIAL_AUTOLOCK_2026_08_31,
      };
    }
    if (sessionOrdinal === 9) {
      return {
        sessionOrdinal,
        status: "LOCKED" as const,
        lockedFingerprint: EN_SESSION_9_FULL_B1_LOCKED_FINGERPRINT,
        ownerDecisionRef: OWNER_ORDERED_FULL_B1_SEQUENTIAL_AUTOLOCK_2026_08_31,
        unlockDecisionRef: OWNER_ORDERED_FULL_B1_SEQUENTIAL_AUTOLOCK_2026_08_31,
      };
    }
    if (sessionOrdinal === 10) {
      return {
        sessionOrdinal,
        status: "LOCKED" as const,
        lockedFingerprint: EN_SESSION_10_FULL_B1_LOCKED_FINGERPRINT,
        ownerDecisionRef: OWNER_ORDERED_FULL_B1_SEQUENTIAL_AUTOLOCK_2026_08_31,
        unlockDecisionRef: OWNER_ORDERED_FULL_B1_SEQUENTIAL_AUTOLOCK_2026_08_31,
      };
    }
    if (sessionOrdinal === 11) {
      return {
        sessionOrdinal,
        status: "LOCKED" as const,
        lockedFingerprint: EN_SESSION_11_FULL_B1_LOCKED_FINGERPRINT,
        ownerDecisionRef: OWNER_ORDERED_FULL_B1_SEQUENTIAL_AUTOLOCK_2026_08_31,
        unlockDecisionRef: OWNER_ORDERED_FULL_B1_SEQUENTIAL_AUTOLOCK_2026_08_31,
      };
    }
    if (sessionOrdinal === 12) {
      return {
        sessionOrdinal,
        status: "LOCKED" as const,
        lockedFingerprint: EN_SESSION_12_FULL_B1_LOCKED_FINGERPRINT,
        ownerDecisionRef: OWNER_ORDERED_FULL_B1_SEQUENTIAL_AUTOLOCK_2026_08_31,
        unlockDecisionRef: OWNER_ORDERED_FULL_B1_SEQUENTIAL_AUTOLOCK_2026_08_31,
      };
    }
    if (sessionOrdinal === 13) {
      return {
        sessionOrdinal,
        status: "LOCKED" as const,
        lockedFingerprint: EN_SESSION_13_FULL_B1_LOCKED_FINGERPRINT,
        ownerDecisionRef: OWNER_ORDERED_FULL_B1_SEQUENTIAL_AUTOLOCK_2026_08_31,
        unlockDecisionRef: OWNER_ORDERED_FULL_B1_SEQUENTIAL_AUTOLOCK_2026_08_31,
      };
    }
    if (sessionOrdinal === 14) {
      return {
        sessionOrdinal,
        status: "LOCKED" as const,
        lockedFingerprint: EN_SESSION_14_FULL_B1_LOCKED_FINGERPRINT,
        ownerDecisionRef: OWNER_ORDERED_FULL_B1_SEQUENTIAL_AUTOLOCK_2026_08_31,
        unlockDecisionRef: OWNER_ORDERED_FULL_B1_SEQUENTIAL_AUTOLOCK_2026_08_31,
      };
    }
    if (sessionOrdinal === 15) {
      return { sessionOrdinal, status: "LOCKED" as const, lockedFingerprint: EN_SESSION_15_FULL_B1_LOCKED_FINGERPRINT, ownerDecisionRef: OWNER_ORDERED_FULL_B1_SEQUENTIAL_AUTOLOCK_2026_08_31, unlockDecisionRef: OWNER_ORDERED_FULL_B1_SEQUENTIAL_AUTOLOCK_2026_08_31 };
    }
    if (sessionOrdinal === 16) {
      return { sessionOrdinal, status: "LOCKED" as const, lockedFingerprint: EN_SESSION_16_FULL_B1_LOCKED_FINGERPRINT, ownerDecisionRef: OWNER_ORDERED_FULL_B1_SEQUENTIAL_AUTOLOCK_2026_08_31, unlockDecisionRef: OWNER_ORDERED_FULL_B1_SEQUENTIAL_AUTOLOCK_2026_08_31 };
    }
    if (sessionOrdinal === 17) {
      return { sessionOrdinal, status: "LOCKED" as const, lockedFingerprint: EN_SESSION_17_FULL_B1_FORBIDDEN_FUTURE_FINGERPRINT, ownerDecisionRef: OWNER_ORDERED_FULL_B1_SEQUENTIAL_AUTOLOCK_2026_08_31, unlockDecisionRef: OWNER_ORDERED_FULL_B1_SEQUENTIAL_AUTOLOCK_2026_08_31 };
    }
    if (sessionOrdinal === 18) {
      return { sessionOrdinal, status: "LOCKED" as const, lockedFingerprint: EN_SESSION_18_FULL_B1_FORBIDDEN_FUTURE_FINGERPRINT, ownerDecisionRef: OWNER_ORDERED_FULL_B1_SEQUENTIAL_AUTOLOCK_2026_08_31, unlockDecisionRef: OWNER_ORDERED_FULL_B1_SEQUENTIAL_AUTOLOCK_2026_08_31 };
    }
    if (sessionOrdinal === 19) {
      return { sessionOrdinal, status: "LOCKED" as const, lockedFingerprint: EN_SESSION_19_FULL_B1_FORBIDDEN_FUTURE_FINGERPRINT, ownerDecisionRef: OWNER_ORDERED_FULL_B1_SEQUENTIAL_AUTOLOCK_2026_08_31, unlockDecisionRef: OWNER_ORDERED_FULL_B1_SEQUENTIAL_AUTOLOCK_2026_08_31 };
    }
    if (sessionOrdinal === 20) {
      return { sessionOrdinal, status: "LOCKED" as const, lockedFingerprint: EN_SESSION_20_FULL_B1_FORBIDDEN_FUTURE_FINGERPRINT, ownerDecisionRef: OWNER_ORDERED_FULL_B1_SEQUENTIAL_AUTOLOCK_2026_08_31, unlockDecisionRef: OWNER_ORDERED_FULL_B1_SEQUENTIAL_AUTOLOCK_2026_08_31 };
    }
    if (sessionOrdinal === 21) {
      return { sessionOrdinal, status: "LOCKED" as const, lockedFingerprint: EN_SESSION_21_FULL_B1_FORBIDDEN_FUTURE_FINGERPRINT, ownerDecisionRef: OWNER_ORDERED_FULL_B1_SEQUENTIAL_AUTOLOCK_2026_08_31, unlockDecisionRef: OWNER_ORDERED_FULL_B1_SEQUENTIAL_AUTOLOCK_2026_08_31 };
    }
    if (sessionOrdinal === 22) {
      return { sessionOrdinal, status: "LOCKED" as const, lockedFingerprint: EN_SESSION_22_FULL_B1_FORBIDDEN_FUTURE_FINGERPRINT, ownerDecisionRef: OWNER_ORDERED_FULL_B1_SEQUENTIAL_AUTOLOCK_2026_08_31, unlockDecisionRef: OWNER_ORDERED_FULL_B1_SEQUENTIAL_AUTOLOCK_2026_08_31 };
    }
    if (sessionOrdinal === 23) {
      return { sessionOrdinal, status: "LOCKED" as const, lockedFingerprint: EN_SESSION_23_FULL_B1_FORBIDDEN_FUTURE_FINGERPRINT, ownerDecisionRef: OWNER_ORDERED_FULL_B1_SEQUENTIAL_AUTOLOCK_2026_08_31, unlockDecisionRef: OWNER_ORDERED_FULL_B1_SEQUENTIAL_AUTOLOCK_2026_08_31 };
    }
    if (sessionOrdinal === 24) {
      return { sessionOrdinal, status: "LOCKED" as const, lockedFingerprint: EN_SESSION_24_FULL_B1_FORBIDDEN_FUTURE_FINGERPRINT, ownerDecisionRef: OWNER_ORDERED_FULL_B1_SEQUENTIAL_AUTOLOCK_2026_08_31, unlockDecisionRef: OWNER_ORDERED_FULL_B1_SEQUENTIAL_AUTOLOCK_2026_08_31 };
    }
    if (sessionOrdinal === 25) {
      return { sessionOrdinal, status: "LOCKED" as const, lockedFingerprint: EN_SESSION_25_FULL_B1_FORBIDDEN_FUTURE_FINGERPRINT, ownerDecisionRef: OWNER_ORDERED_FULL_B1_SEQUENTIAL_AUTOLOCK_2026_08_31, unlockDecisionRef: OWNER_ORDERED_FULL_B1_SEQUENTIAL_AUTOLOCK_2026_08_31 };
    }
    if (sessionOrdinal === 26) {
      return { sessionOrdinal, status: "LOCKED" as const, lockedFingerprint: EN_SESSION_26_FULL_B1_FORBIDDEN_FUTURE_FINGERPRINT, ownerDecisionRef: OWNER_ORDERED_FULL_B1_SEQUENTIAL_AUTOLOCK_2026_08_31, unlockDecisionRef: OWNER_ORDERED_FULL_B1_SEQUENTIAL_AUTOLOCK_2026_08_31 };
    }
    if (sessionOrdinal === 27) {
      return { sessionOrdinal, status: "LOCKED" as const, lockedFingerprint: EN_SESSION_27_FULL_B1_FORBIDDEN_FUTURE_FINGERPRINT, ownerDecisionRef: OWNER_ORDERED_FULL_B1_SEQUENTIAL_AUTOLOCK_2026_08_31, unlockDecisionRef: OWNER_ORDERED_FULL_B1_SEQUENTIAL_AUTOLOCK_2026_08_31 };
    }
    if (sessionOrdinal === 28) {
      return { sessionOrdinal, status: "LOCKED" as const, lockedFingerprint: EN_SESSION_28_FULL_B1_FORBIDDEN_FUTURE_FINGERPRINT, ownerDecisionRef: OWNER_ORDERED_FULL_B1_SEQUENTIAL_AUTOLOCK_2026_08_31, unlockDecisionRef: OWNER_ORDERED_FULL_B1_SEQUENTIAL_AUTOLOCK_2026_08_31 };
    }
    if (sessionOrdinal === 29) {
      return { sessionOrdinal, status: "LOCKED" as const, lockedFingerprint: EN_SESSION_29_FULL_B1_FORBIDDEN_FUTURE_FINGERPRINT, ownerDecisionRef: OWNER_ORDERED_FULL_B1_SEQUENTIAL_AUTOLOCK_2026_08_31, unlockDecisionRef: OWNER_ORDERED_FULL_B1_SEQUENTIAL_AUTOLOCK_2026_08_31 };
    }
    if (sessionOrdinal === 30) {
      return { sessionOrdinal, status: "LOCKED" as const, lockedFingerprint: EN_SESSION_30_FULL_B1_FORBIDDEN_FUTURE_FINGERPRINT, ownerDecisionRef: OWNER_ORDERED_FULL_B1_SEQUENTIAL_AUTOLOCK_2026_08_31, unlockDecisionRef: OWNER_ORDERED_FULL_B1_SEQUENTIAL_AUTOLOCK_2026_08_31 };
    }
    if (sessionOrdinal === 31) {
      return { sessionOrdinal, status: "LOCKED" as const, lockedFingerprint: EN_SESSION_31_FULL_B1_FORBIDDEN_FUTURE_FINGERPRINT, ownerDecisionRef: OWNER_ORDERED_FULL_B1_SEQUENTIAL_AUTOLOCK_2026_08_31, unlockDecisionRef: OWNER_ORDERED_FULL_B1_SEQUENTIAL_AUTOLOCK_2026_08_31 };
    }
    if (sessionOrdinal === 32) {
      return { sessionOrdinal, status: "LOCKED" as const, lockedFingerprint: EN_SESSION_32_FULL_B1_FORBIDDEN_FUTURE_FINGERPRINT, ownerDecisionRef: OWNER_ORDERED_FULL_B1_SEQUENTIAL_AUTOLOCK_2026_08_31, unlockDecisionRef: OWNER_ORDERED_FULL_B1_SEQUENTIAL_AUTOLOCK_2026_08_31 };
    }
    if (sessionOrdinal === 33) {
      return { sessionOrdinal, status: "LOCKED" as const, lockedFingerprint: EN_SESSION_33_FULL_B1_FORBIDDEN_FUTURE_FINGERPRINT, ownerDecisionRef: OWNER_ORDERED_FULL_B1_SEQUENTIAL_AUTOLOCK_2026_08_31, unlockDecisionRef: OWNER_ORDERED_FULL_B1_SEQUENTIAL_AUTOLOCK_2026_08_31 };
    }
    if (sessionOrdinal === 34) {
      return { sessionOrdinal, status: "LOCKED" as const, lockedFingerprint: EN_SESSION_34_FULL_B1_FORBIDDEN_FUTURE_FINGERPRINT, ownerDecisionRef: OWNER_ORDERED_FULL_B1_SEQUENTIAL_AUTOLOCK_2026_08_31, unlockDecisionRef: OWNER_ORDERED_FULL_B1_SEQUENTIAL_AUTOLOCK_2026_08_31 };
    }
    if (sessionOrdinal === 35) {
      return { sessionOrdinal, status: "LOCKED" as const, lockedFingerprint: EN_SESSION_35_FULL_B1_FORBIDDEN_FUTURE_FINGERPRINT, ownerDecisionRef: OWNER_ORDERED_FULL_B1_SEQUENTIAL_AUTOLOCK_2026_08_31, unlockDecisionRef: OWNER_ORDERED_FULL_B1_SEQUENTIAL_AUTOLOCK_2026_08_31 };
    }
    if (sessionOrdinal === 36) {
      return { sessionOrdinal, status: "LOCKED" as const, lockedFingerprint: EN_SESSION_36_FULL_B1_FORBIDDEN_FUTURE_FINGERPRINT, ownerDecisionRef: OWNER_ORDERED_FULL_B1_SEQUENTIAL_AUTOLOCK_2026_08_31, unlockDecisionRef: OWNER_ORDERED_FULL_B1_SEQUENTIAL_AUTOLOCK_2026_08_31 };
    }
    if (sessionOrdinal === 37) {
      return { sessionOrdinal, status: "LOCKED" as const, lockedFingerprint: EN_SESSION_37_FULL_B1_FORBIDDEN_FUTURE_FINGERPRINT, ownerDecisionRef: OWNER_ORDERED_FULL_B1_SEQUENTIAL_AUTOLOCK_2026_08_31, unlockDecisionRef: OWNER_ORDERED_FULL_B1_SEQUENTIAL_AUTOLOCK_2026_08_31 };
    }
    if (sessionOrdinal === 38) {
      return { sessionOrdinal, status: "LOCKED" as const, lockedFingerprint: EN_SESSION_38_FULL_B1_FORBIDDEN_FUTURE_FINGERPRINT, ownerDecisionRef: OWNER_ORDERED_FULL_B1_SEQUENTIAL_AUTOLOCK_2026_08_31, unlockDecisionRef: OWNER_ORDERED_FULL_B1_SEQUENTIAL_AUTOLOCK_2026_08_31 };
    }
    if (sessionOrdinal === 39) {
      return { sessionOrdinal, status: "LOCKED" as const, lockedFingerprint: EN_SESSION_39_FULL_B1_FORBIDDEN_FUTURE_FINGERPRINT, ownerDecisionRef: OWNER_ORDERED_FULL_B1_SEQUENTIAL_AUTOLOCK_2026_08_31, unlockDecisionRef: OWNER_ORDERED_FULL_B1_SEQUENTIAL_AUTOLOCK_2026_08_31 };
    }
    if (sessionOrdinal === 40) {
      return { sessionOrdinal, status: "LOCKED" as const, lockedFingerprint: EN_SESSION_40_FULL_B1_FORBIDDEN_FUTURE_FINGERPRINT, ownerDecisionRef: OWNER_ORDERED_FULL_B1_SEQUENTIAL_AUTOLOCK_2026_08_31, unlockDecisionRef: OWNER_ORDERED_FULL_B1_SEQUENTIAL_AUTOLOCK_2026_08_31 };
    }
    if (sessionOrdinal === 41) {
      return { sessionOrdinal, status: "LOCKED" as const, lockedFingerprint: EN_SESSION_41_FULL_B1_FORBIDDEN_FUTURE_FINGERPRINT, ownerDecisionRef: OWNER_ORDERED_FULL_B1_SEQUENTIAL_AUTOLOCK_2026_08_31, unlockDecisionRef: OWNER_ORDERED_FULL_B1_SEQUENTIAL_AUTOLOCK_2026_08_31 };
    }
    if (sessionOrdinal === 42) {
      return { sessionOrdinal, status: "LOCKED" as const, lockedFingerprint: EN_SESSION_42_FULL_B1_FORBIDDEN_FUTURE_FINGERPRINT, ownerDecisionRef: OWNER_ORDERED_FULL_B1_SEQUENTIAL_AUTOLOCK_2026_08_31, unlockDecisionRef: OWNER_ORDERED_FULL_B1_SEQUENTIAL_AUTOLOCK_2026_08_31 };
    }
    if (sessionOrdinal === 43) {
      return { sessionOrdinal, status: "LOCKED" as const, lockedFingerprint: EN_SESSION_43_FULL_B1_FORBIDDEN_FUTURE_FINGERPRINT, ownerDecisionRef: OWNER_ORDERED_FULL_B1_SEQUENTIAL_AUTOLOCK_2026_08_31, unlockDecisionRef: OWNER_ORDERED_FULL_B1_SEQUENTIAL_AUTOLOCK_2026_08_31 };
    }
    if (sessionOrdinal === 44) {
      return { sessionOrdinal, status: "LOCKED" as const, lockedFingerprint: EN_SESSION_44_FULL_B1_FORBIDDEN_FUTURE_FINGERPRINT, ownerDecisionRef: OWNER_ORDERED_FULL_B1_SEQUENTIAL_AUTOLOCK_2026_08_31, unlockDecisionRef: OWNER_ORDERED_FULL_B1_SEQUENTIAL_AUTOLOCK_2026_08_31 };
    }
    if (sessionOrdinal === 45) {
      return { sessionOrdinal, status: "LOCKED" as const, lockedFingerprint: EN_SESSION_45_FULL_B1_FORBIDDEN_FUTURE_FINGERPRINT, ownerDecisionRef: OWNER_ORDERED_FULL_B1_SEQUENTIAL_AUTOLOCK_2026_08_31, unlockDecisionRef: OWNER_ORDERED_FULL_B1_SEQUENTIAL_AUTOLOCK_2026_08_31 };
    }
    if (sessionOrdinal === 46) {
      return { sessionOrdinal, status: "LOCKED" as const, lockedFingerprint: EN_SESSION_46_FULL_B1_FORBIDDEN_FUTURE_FINGERPRINT, ownerDecisionRef: OWNER_ORDERED_FULL_B1_SEQUENTIAL_AUTOLOCK_2026_08_31, unlockDecisionRef: OWNER_ORDERED_FULL_B1_SEQUENTIAL_AUTOLOCK_2026_08_31 };
    }
    if (sessionOrdinal === 47) {
      return { sessionOrdinal, status: "LOCKED" as const, lockedFingerprint: EN_SESSION_47_FULL_B1_FORBIDDEN_FUTURE_FINGERPRINT, ownerDecisionRef: OWNER_ORDERED_FULL_B1_SEQUENTIAL_AUTOLOCK_2026_08_31, unlockDecisionRef: OWNER_ORDERED_FULL_B1_SEQUENTIAL_AUTOLOCK_2026_08_31 };
    }
    if (sessionOrdinal === 48) {
      return { sessionOrdinal, status: "LOCKED" as const, lockedFingerprint: EN_SESSION_48_FULL_B1_FORBIDDEN_FUTURE_FINGERPRINT, ownerDecisionRef: OWNER_ORDERED_FULL_B1_SEQUENTIAL_AUTOLOCK_2026_08_31, unlockDecisionRef: OWNER_ORDERED_FULL_B1_SEQUENTIAL_AUTOLOCK_2026_08_31 };
    }
    if (sessionOrdinal === 49) {
      return { sessionOrdinal, status: "LOCKED" as const, lockedFingerprint: EN_SESSION_49_FULL_B1_FORBIDDEN_FUTURE_FINGERPRINT, ownerDecisionRef: OWNER_ORDERED_FULL_B1_SEQUENTIAL_AUTOLOCK_2026_08_31, unlockDecisionRef: OWNER_ORDERED_FULL_B1_SEQUENTIAL_AUTOLOCK_2026_08_31 };
    }
    if (sessionOrdinal === 50) {
      return { sessionOrdinal, status: "LOCKED" as const, lockedFingerprint: EN_SESSION_50_FULL_B1_FORBIDDEN_FUTURE_FINGERPRINT, ownerDecisionRef: OWNER_ORDERED_FULL_B1_SEQUENTIAL_AUTOLOCK_2026_08_31, unlockDecisionRef: OWNER_ORDERED_FULL_B1_SEQUENTIAL_AUTOLOCK_2026_08_31 };
    }
    if (sessionOrdinal === 51) {
      return { sessionOrdinal, status: "LOCKED" as const, lockedFingerprint: EN_SESSION_51_FULL_B1_FORBIDDEN_FUTURE_FINGERPRINT, ownerDecisionRef: OWNER_ORDERED_FULL_B1_SEQUENTIAL_AUTOLOCK_2026_08_31, unlockDecisionRef: OWNER_ORDERED_FULL_B1_SEQUENTIAL_AUTOLOCK_2026_08_31 };
    }
    if (sessionOrdinal === 52) {
      return { sessionOrdinal, status: "LOCKED" as const, lockedFingerprint: EN_SESSION_52_FULL_B1_FORBIDDEN_FUTURE_FINGERPRINT, ownerDecisionRef: OWNER_ORDERED_FULL_B1_SEQUENTIAL_AUTOLOCK_2026_08_31, unlockDecisionRef: OWNER_ORDERED_FULL_B1_SEQUENTIAL_AUTOLOCK_2026_08_31 };
    }
    if (sessionOrdinal === 53) {
      return { sessionOrdinal, status: "LOCKED" as const, lockedFingerprint: EN_SESSION_53_FULL_B1_FORBIDDEN_FUTURE_FINGERPRINT, ownerDecisionRef: OWNER_ORDERED_FULL_B1_SEQUENTIAL_AUTOLOCK_2026_08_31, unlockDecisionRef: OWNER_ORDERED_FULL_B1_SEQUENTIAL_AUTOLOCK_2026_08_31 };
    }
    if (sessionOrdinal === 54) {
      return { sessionOrdinal, status: "LOCKED" as const, lockedFingerprint: EN_SESSION_54_FULL_B1_FORBIDDEN_FUTURE_FINGERPRINT, ownerDecisionRef: OWNER_ORDERED_FULL_B1_SEQUENTIAL_AUTOLOCK_2026_08_31, unlockDecisionRef: OWNER_ORDERED_FULL_B1_SEQUENTIAL_AUTOLOCK_2026_08_31 };
    }
    if (sessionOrdinal === 55) {
      return { sessionOrdinal, status: "LOCKED" as const, lockedFingerprint: EN_SESSION_55_FULL_B1_FORBIDDEN_FUTURE_FINGERPRINT, ownerDecisionRef: OWNER_ORDERED_FULL_B1_SEQUENTIAL_AUTOLOCK_2026_08_31, unlockDecisionRef: OWNER_ORDERED_FULL_B1_SEQUENTIAL_AUTOLOCK_2026_08_31 };
    }
    if (sessionOrdinal === 56) {
      return { sessionOrdinal, status: "LOCKED" as const, lockedFingerprint: EN_SESSION_56_FULL_B1_FORBIDDEN_FUTURE_FINGERPRINT, ownerDecisionRef: OWNER_ORDERED_FULL_B1_SEQUENTIAL_AUTOLOCK_2026_08_31, unlockDecisionRef: OWNER_ORDERED_FULL_B1_SEQUENTIAL_AUTOLOCK_2026_08_31 };
    }
    return { sessionOrdinal, status: "DRAFT" as const };
  });
}

// зачем: испанский контур стартует с чистого листа — 56 записей DRAFT, точно
// как английский контур стартовал бы, если бы у него не было уже написанных
// первых 14 сессий. Параллельная сессия Кодекса/Клода пишет именно в этот
// реестр через authoringRegistryForTargetLanguage("es"), никогда не касаясь
// английского массива ниже. Session 1 несёт forbiddenFutureFingerprint,
// вычисленный тем же hashCanonicalBody, что и сам preflight — иначе
// assertRegistryShape отказывает даже пустому реестру (session 2..56 ещё не
// разрешены, и это должно быть доказуемо, а не подразумеваться).
function buildDraftRegistry(): Lesson1AuthoringRegistryEntryV1[] {
  const entries: Lesson1AuthoringRegistryEntryV1[] = Array.from(
    { length: 56 },
    (_, index) => ({ sessionOrdinal: index + 1, status: "DRAFT" as const }),
  );
  const forbiddenFutureFingerprint = hashCanonicalBody(
    entries
      .filter((entry) => entry.sessionOrdinal >= 2)
      .map((entry) => [entry.sessionOrdinal, null]),
  );
  entries[0] = { ...entries[0], forbiddenFutureFingerprint };
  return entries;
}

function buildEsRegistry(): Lesson1AuthoringRegistryEntryV1[] {
  const draft = buildDraftRegistry();
  const entries = [...draft];
  entries[0] = {
    ...entries[0],
    status: "LOCKED" as const,
    lockedFingerprint: ES_SESSION_1_LOCKED_FINGERPRINT,
    ownerDecisionRef: OWNER_APPROVED_ES_SESSION_1,
    unlockDecisionRef: OWNER_UNLOCKED_ALL_FOR_MODE_NATIVE_REWRITE,
  };
  entries[1] = {
    ...entries[1],
    status: "DRAFT" as const,
    forbiddenFutureFingerprint:
      ES_SESSION_2_MODE_NATIVE_FORBIDDEN_FUTURE_FINGERPRINT,
    unlockDecisionRef: OWNER_UNLOCKED_ALL_FOR_MODE_NATIVE_REWRITE,
  };
  return entries;
}

const REGISTRY_BY_TARGET_LANGUAGE: Readonly<
  Record<
    V2AuthoringTargetLanguage,
    readonly Lesson1AuthoringRegistryEntryV1[]
  >
> = Object.freeze({
  en: Object.freeze(
    buildEnglishRegistry().map((entry) => Object.freeze(entry)),
  ),
  es: Object.freeze(
    buildEsRegistry().map((entry) => Object.freeze(entry)),
  ),
});

/** Обратная совместимость API: существующие английские вызовы продолжают
 * получать реестр через прежнее экспортированное имя. */
export const LESSON1_AUTHORING_REGISTRY_V1: readonly Lesson1AuthoringRegistryEntryV1[] =
  REGISTRY_BY_TARGET_LANGUAGE.en;

export function authoringRegistryForTargetLanguage(
  targetLanguage: V2AuthoringTargetLanguage,
): readonly Lesson1AuthoringRegistryEntryV1[] {
  return REGISTRY_BY_TARGET_LANGUAGE[targetLanguage];
}

function assertRegistryShape(
  entries: readonly Lesson1AuthoringRegistryEntryV1[],
  actualFingerprints: Readonly<Record<number, string | null>>,
): void {
  if (entries.length !== 56) {
    throw new Error(
      `lesson1_authoring_registry_size_invalid:expected=56:actual=${entries.length}`,
    );
  }

  let encounteredUnlocked = false;
  entries.forEach((entry, index) => {
    const expectedOrdinal = index + 1;
    if (entry.sessionOrdinal !== expectedOrdinal) {
      throw new Error(
        `lesson1_authoring_registry_ordinal_invalid:expected=${expectedOrdinal}:actual=${entry.sessionOrdinal}`,
      );
    }
    if (entry.status === "LOCKED") {
      if (encounteredUnlocked) {
        throw new Error(
          `lesson1_authoring_locked_prefix_broken:session=${entry.sessionOrdinal}`,
        );
      }
      if (!entry.ownerDecisionRef?.trim()) {
        throw new Error(
          `lesson1_authoring_owner_decision_missing:session=${entry.sessionOrdinal}`,
        );
      }
      if (!entry.lockedFingerprint?.trim()) {
        throw new Error(
          `lesson1_locked_fingerprint_missing:session=${entry.sessionOrdinal}`,
        );
      }
      if (
        actualFingerprints[entry.sessionOrdinal] !== entry.lockedFingerprint
      ) {
        throw new Error(
          `lesson1_locked_fingerprint_drift:session=${entry.sessionOrdinal}`,
        );
      }
    } else {
      encounteredUnlocked = true;
      if (
        (entry.status === "AUTO_PASS" || entry.status === "OWNER_APPROVED") &&
        !entry.candidateFingerprint?.trim()
      ) {
        throw new Error(
          `lesson1_candidate_fingerprint_missing:session=${entry.sessionOrdinal}:status=${entry.status}`,
        );
      }
      if (
        entry.status === "OWNER_APPROVED" &&
        !entry.ownerDecisionRef?.trim()
      ) {
        throw new Error(
          `lesson1_authoring_owner_decision_missing:session=${entry.sessionOrdinal}`,
        );
      }
      if (
        entry.candidateFingerprint &&
        actualFingerprints[entry.sessionOrdinal] !== entry.candidateFingerprint
      ) {
        throw new Error(
          `lesson1_candidate_fingerprint_drift:session=${entry.sessionOrdinal}:status=${entry.status}`,
        );
      }
    }
  });
}

export function lesson1AuthoringPreflightV1(
  requestedSessionOrdinal: number | undefined,
  actualFingerprints: Readonly<Record<number, string | null>>,
  entries: readonly Lesson1AuthoringRegistryEntryV1[] = LESSON1_AUTHORING_REGISTRY_V1,
): Lesson1AuthoringPreflightV1 {
  assertRegistryShape(entries, actualFingerprints);

  const firstUnlockedIndex = entries.findIndex(
    (entry) => entry.status !== "LOCKED",
  );
  const lockedThrough =
    firstUnlockedIndex === -1 ? entries.length : firstUnlockedIndex;
  const currentSessionOrdinal =
    firstUnlockedIndex === -1
      ? null
      : (entries[firstUnlockedIndex]?.sessionOrdinal ?? null);
  const forbiddenFrom =
    currentSessionOrdinal === null || currentSessionOrdinal >= entries.length
      ? null
      : currentSessionOrdinal + 1;

  if (currentSessionOrdinal !== null && forbiddenFrom !== null) {
    const currentEntry = entries[firstUnlockedIndex];
    if (!currentEntry?.forbiddenFutureFingerprint?.trim()) {
      throw new Error(
        `lesson1_forbidden_future_fingerprint_missing:current=${currentSessionOrdinal}:range=${forbiddenFrom}-${entries.length}`,
      );
    }
    const actualForbiddenFutureFingerprint = hashCanonicalBody(
      entries
        .filter((entry) => entry.sessionOrdinal >= forbiddenFrom)
        .map((entry) => [
          entry.sessionOrdinal,
          actualFingerprints[entry.sessionOrdinal],
        ]),
    );
    if (
      actualForbiddenFutureFingerprint !==
      currentEntry.forbiddenFutureFingerprint
    ) {
      throw new Error(
        `lesson1_forbidden_future_fingerprint_drift:range=${forbiddenFrom}-${entries.length}`,
      );
    }
  }

  if (
    requestedSessionOrdinal !== undefined &&
    requestedSessionOrdinal !== currentSessionOrdinal
  ) {
    throw new Error(
      `lesson1_authoring_out_of_order:requested=${requestedSessionOrdinal}:current=${
        currentSessionOrdinal ?? "none"
      }:lockedThrough=${lockedThrough}`,
    );
  }

  return { lockedThrough, currentSessionOrdinal, forbiddenFrom };
}
