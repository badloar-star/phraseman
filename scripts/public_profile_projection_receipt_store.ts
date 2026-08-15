import { createHash, randomUUID } from 'node:crypto';
import { mkdir, open, readFile, readdir, rename, unlink } from 'node:fs/promises';
import * as path from 'node:path';
import type { ProjectionApplyReceipt } from './public_profile_projection_audit_core';

export async function writeJsonAtomically(filePath: string, value: unknown): Promise<void> {
  const directory = path.dirname(filePath);
  await mkdir(directory, { recursive: true });
  const temporaryPath = path.join(directory, `.${path.basename(filePath)}.tmp-${process.pid}-${randomUUID()}`);
  let handle: Awaited<ReturnType<typeof open>> | null = null;
  try {
    handle = await open(temporaryPath, 'wx');
    await handle.writeFile(`${JSON.stringify(value, null, 2)}\n`, 'utf8');
    await handle.sync();
    await handle.close();
    handle = null;
    await rename(temporaryPath, filePath);
  } catch (error) {
    await handle?.close().catch(() => {});
    await unlink(temporaryPath).catch(() => {});
    throw error;
  }
}

function receiptFileName(receipt: ProjectionApplyReceipt): string {
  const uidHash = createHash('sha256').update(receipt.stableUid).digest('hex').slice(0, 16);
  const timestamp = receipt.attemptedAt.replace(/[^0-9A-Za-z_-]/g, '-');
  return `${timestamp}-${uidHash}-${receipt.entryHash.slice(0, 16)}-${randomUUID()}.json`;
}

export async function writeProjectionReceiptAtomically(
  checkpointDirectory: string,
  receipt: ProjectionApplyReceipt,
): Promise<string> {
  const receiptsDirectory = path.join(checkpointDirectory, 'receipts');
  const receiptPath = path.join(receiptsDirectory, receiptFileName(receipt));
  await writeJsonAtomically(receiptPath, receipt);
  return receiptPath;
}

function isProjectionReceipt(value: unknown): value is ProjectionApplyReceipt {
  if (!value || typeof value !== 'object') return false;
  const receipt = value as Partial<ProjectionApplyReceipt>;
  return receipt.version === 1
    && typeof receipt.planId === 'string'
    && typeof receipt.stableUid === 'string'
    && typeof receipt.entryHash === 'string'
    && typeof receipt.patchHash === 'string'
    && typeof receipt.expectedUserUpdateTime === 'string'
    && typeof receipt.expectedProfileUpdateTime === 'string'
    && (receipt.status === 'applied' || receipt.status === 'failed')
    && typeof receipt.attemptedAt === 'string';
}

export async function readProjectionReceipts(
  checkpointDirectory: string,
): Promise<ProjectionApplyReceipt[]> {
  const receiptsDirectory = path.join(checkpointDirectory, 'receipts');
  let files: string[];
  try {
    files = (await readdir(receiptsDirectory))
      .filter((file) => file.endsWith('.json'))
      .sort();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw error;
  }
  const receipts: ProjectionApplyReceipt[] = [];
  for (const file of files) {
    const parsed = JSON.parse(await readFile(path.join(receiptsDirectory, file), 'utf8')) as unknown;
    if (!isProjectionReceipt(parsed)) throw new Error(`receipt_invalid:${file}`);
    receipts.push(parsed);
  }
  return receipts;
}
