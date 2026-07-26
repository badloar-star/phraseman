export type ContentReceiptEntityType =
  | "mode_template"
  | "activity_instance"
  | "episode"
  | "season"
  | "release_manifest";

export interface ContentReceiptSubject {
  readonly entityType: ContentReceiptEntityType;
  readonly entityId: string;
  readonly entityRevision: number;
  readonly entityFingerprint: string;
}

export interface ContentGateReceiptBody {
  readonly schemaVersion: "content-gate-receipt-body.v1";
  readonly gateKind: "approval" | "release_seal";
  readonly subject: ContentReceiptSubject;
  readonly validationReceiptHash: string;
  readonly localizationReceiptSetHash: string;
  readonly reviewReceiptHash: string;
  readonly devicePreviewReceiptHashes?: {
    readonly ios: string;
    readonly android: string;
  };
  readonly waiverSetHash: string;
  readonly evaluatedBy: string;
  readonly evaluatedAt: string;
}

export interface ContentGateReceiptRecord {
  readonly schemaVersion: "content-gate-receipt-record.v1";
  readonly gateReceiptId: string;
  readonly receiptHash: string;
  readonly object: {
    readonly objectPath: string;
    readonly contentHash: string;
    readonly objectGeneration: string;
    readonly byteSize: number;
  };
  readonly createdAt: string;
}
