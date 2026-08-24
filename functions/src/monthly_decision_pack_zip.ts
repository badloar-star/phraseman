import { PassThrough } from 'node:stream';
import { DECISION_PACK_FILE_NAMES, type DecisionPackFileName } from './monthly_decision_pack_core';

export const DECISION_PACK_ZIP_LIMIT_BYTES = 4 * 1024 * 1024;
export const DECISION_PACK_UNCOMPRESSED_LIMIT_BYTES = 12 * 1024 * 1024;
const FIXED_ZIP_DATE = new Date('1980-01-01T00:00:00.000Z');

export async function createDecisionPackZip(files: Record<DecisionPackFileName, string>): Promise<Buffer> {
  const uncompressedBytes = DECISION_PACK_FILE_NAMES.reduce((sum, name) => sum + Buffer.byteLength(files[name] ?? '', 'utf8'), 0);
  if (uncompressedBytes > DECISION_PACK_UNCOMPRESSED_LIMIT_BYTES) throw new Error('decision_pack_uncompressed_limit');

  const output = new PassThrough();
  const chunks: Buffer[] = [];
  output.on('data', (chunk: Buffer | string) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
  const complete = new Promise<Buffer>((resolve, reject) => {
    output.once('end', () => {
      const buffer = Buffer.concat(chunks);
      if (buffer.length > DECISION_PACK_ZIP_LIMIT_BYTES) reject(new Error('decision_pack_zip_limit'));
      else resolve(buffer);
    });
    output.once('error', reject);
  });
  // зачем (деплой 24.08): `archiver` стоил 1.4 с на КАЖДОМ холодном старте всех
  // 488 функций — он тянет zip-stream/compress-commons/archiver-utils. Загрузка
  // index.js занимала 7.2 с при лимите Firebase «10 с на анализ кода», и деплой
  // падал пачкой `Failed to update function` / `Cannot determine backend
  // specification. Timeout after 10000`. ZIP нужен ровно одной админской
  // выгрузке, поэтому грузим его в момент вызова, а не при старте процесса.
  const { default: archiver } = await import('archiver');
  const archive = archiver('zip', { zlib: { level: 9 } });
  archive.once('error', (error) => output.destroy(error));
  archive.pipe(output);
  for (const name of DECISION_PACK_FILE_NAMES) {
    archive.append(Buffer.from(files[name], 'utf8'), { name, date: FIXED_ZIP_DATE, mode: 0o100644 });
  }
  await archive.finalize();
  return complete;
}
