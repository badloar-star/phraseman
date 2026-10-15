import fs from 'node:fs';
import { Buffer } from 'node:buffer';
import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';

const TRANSIENT = new Set(['UNKNOWN', 'EBUSY', 'EPERM', 'EACCES']);

// Keep the previous complete artifact readable until its replacement is ready.
export async function writeMockupFile(target, content, { io = fs, delays = [50, 150, 300] } = {}) {
  const bytes = Buffer.from(content, 'utf8');
  try {
    if (io.readFileSync(target).equals(bytes)) return false;
  } catch (error) {
    // Comparing is an optimization; replacement never needs to truncate/read the old file.
    if (error.code !== 'ENOENT' && !TRANSIENT.has(error.code)) throw error;
  }
  const temporary = `${target}.${randomUUID()}.tmp`;
  let ownsTemporary = false;
  let publishError;
  try {
    const fd = io.openSync(temporary, 'wx');
    ownsTemporary = true;
    try { io.writeFileSync(fd, bytes); } finally { io.closeSync(fd); }
    for (let attempt = 0; ; attempt++) {
      try {
        io.renameSync(temporary, target);
        ownsTemporary = false;
        return true;
      } catch (error) {
        if (!TRANSIENT.has(error.code) || attempt >= delays.length) {
          throw new Error(`Cannot replace ${target}: ${error.code ?? 'unknown'} after ${attempt + 1} attempts`, { cause: error });
        }
        await delay(delays[attempt]);
      }
    }
  } catch (error) {
    publishError = error;
    throw error;
  } finally {
    if (ownsTemporary) {
      try { io.unlinkSync(temporary); }
      catch (cleanupError) {
        if (publishError) throw new AggregateError([publishError, cleanupError], `${publishError.message}; cleanup ${temporary}: ${cleanupError.code ?? 'unknown'}`, { cause: publishError });
        throw cleanupError;
      }
    }
  }
}
