import { HttpsError } from "firebase-functions/v2/https";
import { onCall } from "firebase-functions/v2/https";
import { hasAdminRole, type AdminRole } from "./admin/roles";
import { hasPermission } from "./admin/permissions";
import { ENFORCE_APP_CHECK } from "./callable_options";

export interface V2AuthoringRequest {
  readonly draftId: string;
  readonly expectedRevision: number;
  readonly expectedFingerprint: string;
  readonly draft: {
    readonly body: Record<string, unknown>;
    readonly record: Record<string, unknown>;
  };
}

export interface ContentDraftWriter {
  readonly uid: string;
  readonly role: AdminRole;
}

export interface V2AuthoringCallableDependencies<T> {
  save(writer: ContentDraftWriter, request: V2AuthoringRequest): Promise<T>;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export function parseV2AuthoringRequest(data: unknown): V2AuthoringRequest {
  if (!isRecord(data))
    throw new HttpsError(
      "invalid-argument",
      "invalid V2 authoring mutation envelope",
    );
  const expectedRevision = data.expectedRevision;
  if (
    typeof data.draftId !== "string" ||
    !/^[A-Za-z0-9._-]{1,160}$/.test(data.draftId) ||
    typeof expectedRevision !== "number" ||
    !Number.isInteger(expectedRevision) ||
    expectedRevision < 1 ||
    typeof data.expectedFingerprint !== "string" ||
    !data.expectedFingerprint ||
    !isRecord(data.draft) ||
    !isRecord(data.draft.body) ||
    !isRecord(data.draft.record)
  )
    throw new HttpsError(
      "invalid-argument",
      "invalid V2 authoring mutation envelope",
    );
  return Object.freeze({
    draftId: data.draftId,
    expectedRevision: expectedRevision as number,
    expectedFingerprint: data.expectedFingerprint,
    draft: Object.freeze({ body: data.draft.body, record: data.draft.record }),
  });
}

export function requireContentDraftWriter(
  auth:
    | { readonly uid?: string; readonly token?: Record<string, unknown> }
    | undefined,
): ContentDraftWriter {
  if (!auth?.uid || !auth.token?.admin || !hasAdminRole(auth.token.adminRole))
    throw new HttpsError("permission-denied", "Admin only");
  const role = auth.token.adminRole as AdminRole;
  if (!hasPermission(role, "content.draft.write"))
    throw new HttpsError("permission-denied", "Role cannot edit V2 drafts");
  return Object.freeze({ uid: auth.uid, role });
}

export async function handleAdminSaveV2Draft<T>(
  request: {
    readonly auth?: {
      readonly uid?: string;
      readonly token?: Record<string, unknown>;
    };
    readonly data: unknown;
  },
  dependencies: V2AuthoringCallableDependencies<T>,
): Promise<T> {
  const writer = requireContentDraftWriter(request.auth);
  const mutation = parseV2AuthoringRequest(request.data);
  return dependencies.save(writer, mutation);
}

export function createAdminSaveV2DraftCallable<T>(
  dependencies: V2AuthoringCallableDependencies<T>,
) {
  return onCall(
    { region: "us-central1", enforceAppCheck: ENFORCE_APP_CHECK },
    async (request) => handleAdminSaveV2Draft(request, dependencies),
  );
}
