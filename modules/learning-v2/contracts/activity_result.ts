/** Result is intentionally separate from attempt hash/materialization records. */
export type V2ActivityResultCode =
  | "PASS_CONFIDENT"
  | "NEEDS_WORK_CONFIDENT"
  | "UNCERTAIN"
  | "INVALID_AUDIO_OR_SYSTEM"
  | "CORRECT"
  | "WRONG"
  | "COMPLETED"
  | "SKIPPED";
export interface V2ActivityResult {
  readonly resultCode: V2ActivityResultCode;
  readonly candidatePerformanceStars: 0 | 1 | 2 | 3;
}
