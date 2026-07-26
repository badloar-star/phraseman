/** Recovery error used by the React-free activity runtime boundary. */
export class UnsupportedActivityError extends Error {
  readonly code = "v2_activity_unknown_type";

  constructor(readonly activityTypeKey: string) {
    super("v2_activity_unknown_type");
    this.name = "UnsupportedActivityError";
  }
}
