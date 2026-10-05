import { readFileSync } from 'fs';
import { join } from 'path';
import { normalizeEol } from './helpers/read_source';

// зачем (координатор 05.10, шаг 1а; пакеты 03:26/04:26): досыпка outbox шардов держала замок аккаунта 3,4–5,2 с на
// холодном старте. Она запускается после первого кадра Главной, а не сразу при открытии PhoneState. Логика самой
// досыпки не меняется — сторож следит только за местом запуска.
const source = normalizeEol(readFileSync(join(__dirname, '..', 'app', 'phone_state_runtime.ts'), 'utf8'));

describe('client shard phone-state backfill starts after the first Home frame', () => {
  it('backfill → drain chain is registered through runAfterHomeFirstFrame', () => {
    expect(source).toContain("import { runAfterHomeFirstFrame } from './first_frame_deferred_warmups';");
    expect(source).toMatch(
      /runAfterHomeFirstFrame\('client_shard_phone_state_backfill', \(\) => backfillClientShardPhoneStateOutbox\(\{[\s\S]{0,120}?\}\)\.then\(\(\) => drainClientShardPhoneStateOutbox\(/,
    );
  });

  it('there is no immediate (non-deferred) backfill call left', () => {
    const calls = source.match(/backfillClientShardPhoneStateOutbox\(\{/g) ?? [];
    expect(calls).toHaveLength(1);
    expect(source).not.toMatch(/void backfillClientShardPhoneStateOutbox\(/);
  });
});
