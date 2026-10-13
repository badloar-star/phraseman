import { getGermanTask6cL02IdentityCaptureContractDeV4 } from "../modules/learning-v2/curriculum/de/task6c_l02_identity_capture_transport_de_v4";

if (process.argv.slice(2).length !== 0) {
  throw new Error("CAPTURE_V4_CALLER_INPUT_FORBIDDEN");
}

const contract = getGermanTask6cL02IdentityCaptureContractDeV4();
process.stdout.write(
  `${JSON.stringify(
    {
      status: "HOLD_CAPTURE_ONLY",
      networkAction: "NOT_IMPLEMENTED_IN_THIS_INERT_PACKET",
      nextAction: "SEPARATE_AUTHORIZED_LIVE_CAPTURE_TASK",
      inputDigestSha256: contract.inputDigestSha256,
      requestPolicy: contract.requestPolicy,
      roster: contract.roster,
      authority: contract.authority,
    },
    null,
    2,
  )}\n`,
);
