import AsyncStorage from "@react-native-async-storage/async-storage";
import type { ProgressAccountScope, ProgressGenerationGuard, ProgressStorage } from "./progress_store";
import { progressAccountKey } from "./progress_store";

export type ProgressOutboxTerminal = "timed_finalized" | "system_non_assessment_finalized" | "protocol_rejected";
export interface ProgressOutboxItem {
  readonly mutationId: string;
  readonly accountKey: string;
  readonly accountGeneration: number;
  readonly payload: unknown;
  readonly status: "pending" | "terminal";
  readonly terminalStatus?: ProgressOutboxTerminal;
}
const KEY = (accountKey: string): string => `v2:outbox:v1:${accountKey}`;
const MAX_ITEMS = 128;
const MAX_PAYLOAD_BYTES = 64 * 1024;
const MAX_OUTBOX_BYTES = 256 * 1024;
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);

export const createProgressOutbox = (storage: ProgressStorage, isCurrentGeneration: ProgressGenerationGuard) => ({
  async list(scope: ProgressAccountScope): Promise<ProgressOutboxItem[]> {
    if (!isCurrentGeneration(scope)) throw new Error("progress_generation_stale");
    const raw = await storage.getItem(KEY(progressAccountKey(scope)));
    if (!raw) return [];
    try {
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter((item): item is ProgressOutboxItem => isRecord(item) && typeof item.mutationId === "string" && item.accountKey === progressAccountKey(scope) && Number.isSafeInteger(item.accountGeneration) && Number(item.accountGeneration) === scope.generation && (item.status === "pending" || item.status === "terminal") && (!Object.prototype.hasOwnProperty.call(item, "terminalStatus") || ["timed_finalized", "system_non_assessment_finalized", "protocol_rejected"].includes(String(item.terminalStatus))) && (() => { try { return JSON.stringify(item.payload).length <= MAX_PAYLOAD_BYTES; } catch { return false; } })()).slice(-MAX_ITEMS);
    } catch { return []; }
  },
  async enqueue(scope: ProgressAccountScope, mutationId: string, payload: unknown): Promise<ProgressOutboxItem> {
    if (!isCurrentGeneration(scope)) throw new Error("progress_generation_stale");
    if (!/^[A-Za-z0-9._:-]{1,160}$/.test(mutationId)) throw new Error("progress_mutation_id_invalid");
    let serializedPayload: string;
    try { const encoded = JSON.stringify(payload); if (typeof encoded !== "string") throw new Error("invalid"); serializedPayload = encoded; } catch { throw new Error("progress_payload_invalid"); }
    if (serializedPayload.length > MAX_PAYLOAD_BYTES) throw new Error("progress_payload_overflow");
    if (isRecord(payload) && payload.kind === "scheduled_delayed_probe" && /(learningRef|learningEvidence|evidenceRef)/i.test(serializedPayload)) throw new Error("delayed_candidate_learning_ref_forbidden");
    const items = await this.list(scope);
    const existing = items.find((item) => item.mutationId === mutationId);
    if (existing) return existing;
    const item: ProgressOutboxItem = { mutationId, accountKey: progressAccountKey(scope), accountGeneration: scope.generation, payload, status: "pending" };
    const next = [...items, item].slice(-MAX_ITEMS);
    const encoded = JSON.stringify(next);
    if (encoded.length > MAX_OUTBOX_BYTES) throw new Error("progress_outbox_overflow");
    await storage.setItem(KEY(item.accountKey), encoded);
    return item;
  },
  async acknowledge(scope: ProgressAccountScope, mutationId: string, terminalStatus?: ProgressOutboxTerminal): Promise<void> {
    if (!isCurrentGeneration(scope)) throw new Error("progress_generation_stale");
    const items = await this.list(scope);
    const updated = items.map((item) => {
      if (item.mutationId !== mutationId || item.status === "terminal") return item;
      return { ...item, status: "terminal" as const, ...(terminalStatus ? { terminalStatus } : {}) };
    });
    const encoded = JSON.stringify(updated);
    if (encoded.length > MAX_OUTBOX_BYTES) throw new Error("progress_outbox_overflow");
    await storage.setItem(KEY(progressAccountKey(scope)), encoded);
  },
  async purgeStaleGeneration(scope: ProgressAccountScope): Promise<void> {
    if (!isCurrentGeneration(scope)) throw new Error("progress_generation_stale");
    const items = (await this.list(scope)).filter((item) => item.accountGeneration === scope.generation && item.status === "pending");
    const encoded = JSON.stringify(items);
    if (encoded.length > MAX_OUTBOX_BYTES) throw new Error("progress_outbox_overflow");
    await storage.setItem(KEY(progressAccountKey(scope)), encoded);
  },
});
