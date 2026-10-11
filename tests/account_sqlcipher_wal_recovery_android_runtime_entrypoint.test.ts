import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');
const INDEX = path.join(ROOT, 'runtime-probes/android-account-sqlcipher-recovery/index.js');
const RUNNER = path.join(ROOT, 'runtime-probes/android-account-sqlcipher-recovery/run-proof.ps1');
const DATABASE_NAME =
  'accounts-v2-g-588b372845f968ba31b0e12c84bb17559ce7dc6de13247456e6cae9e3e971643.db';
const FAMILY_SELECTOR = `files/SQLite/accounts-v2/${DATABASE_NAME}`;

type Binding = Readonly<{
  family: string;
  packageName: 'app.phraseman';
  processName: 'app.phraseman';
  pid: number;
  starttime: string;
  launchNonce: string;
  runtimeIdentity: string;
}>;

const BINDING: Binding = Object.freeze({
  family: FAMILY_SELECTOR,
  packageName: 'app.phraseman',
  processName: 'app.phraseman',
  pid: 4242,
  starttime: '987654321',
  launchNonce: '0123456789abcdef0123456789abcdef',
  runtimeIdentity: 'fedcba9876543210fedcba9876543210',
});

function runLibrary(kind: string, payload: unknown): ReturnType<typeof spawnSync> {
  const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64');
  const useStdin = encoded.length > 12_000;
  return spawnSync('powershell.exe', [
    '-NoLogo',
    '-NoProfile',
    '-NonInteractive',
    '-ExecutionPolicy',
    'Bypass',
    '-File',
    RUNNER,
    '-LibraryMode',
    kind,
    '-PayloadBase64',
    useStdin ? '__STDIN__' : encoded,
  ], { cwd: ROOT, encoding: 'utf8', timeout: 20_000, input: useStdin ? encoded : undefined });
}

function expectPass(kind: string, payload: unknown): Record<string, unknown> {
  const result = runLibrary(kind, payload);
  expect(result.status).toBe(0);
  expect(result.stderr).toBe('');
  const parsed = JSON.parse(String(result.stdout).trim()) as Record<string, unknown>;
  expect(parsed.status).toBe('pass');
  return parsed;
}

function expectReject(kind: string, payload: unknown, code: string): void {
  const result = runLibrary(kind, payload);
  expect(result.status).toBe(1);
  expect(result.stdout).toBe('');
  expect(String(result.stderr).trim()).toBe(code);
  expect(result.stderr).not.toMatch(/[\\/]|Exception|stack|line /iu);
}

function checksumWords(
  bytes: Buffer,
  offset: number,
  length: number,
  state: readonly [number, number],
  bigEndianWords: boolean,
): [number, number] {
  let [s0, s1] = state;
  for (let index = offset; index < offset + length; index += 8) {
    const x0 = bigEndianWords ? bytes.readUInt32BE(index) : bytes.readUInt32LE(index);
    const x1 = bigEndianWords ? bytes.readUInt32BE(index + 4) : bytes.readUInt32LE(index + 4);
    s0 = (s0 + x0 + s1) >>> 0;
    s1 = (s1 + x1 + s0) >>> 0;
  }
  return [s0, s1];
}

function buildWal(
  commitMarkers: readonly number[],
  pageSize = 512,
  payloadSeed = 17,
  magic: 0x377f0682 | 0x377f0683 = 0x377f0683,
): Buffer {
  const frameSize = 24 + pageSize;
  const bytes = Buffer.alloc(32 + commitMarkers.length * frameSize);
  bytes.writeUInt32BE(magic, 0);
  bytes.writeUInt32BE(3007000, 4);
  bytes.writeUInt32BE(pageSize, 8);
  bytes.writeUInt32BE(0, 12);
  bytes.writeUInt32BE(0x10203040, 16);
  bytes.writeUInt32BE(0x50607080, 20);
  const bigEndianWords = magic === 0x377f0683;
  let checksum = checksumWords(bytes, 0, 24, [0, 0], bigEndianWords);
  bytes.writeUInt32BE(checksum[0], 24);
  bytes.writeUInt32BE(checksum[1], 28);
  commitMarkers.forEach((commit, index) => {
    const offset = 32 + index * frameSize;
    bytes.writeUInt32BE(index + 1, offset);
    bytes.writeUInt32BE(commit, offset + 4);
    bytes.writeUInt32BE(0x10203040, offset + 8);
    bytes.writeUInt32BE(0x50607080, offset + 12);
    bytes.fill((index + payloadSeed) & 0xff, offset + 24, offset + frameSize);
    checksum = checksumWords(bytes, offset, 8, checksum, bigEndianWords);
    checksum = checksumWords(bytes, offset + 24, pageSize, checksum, bigEndianWords);
    bytes.writeUInt32BE(checksum[0], offset + 16);
    bytes.writeUInt32BE(checksum[1], offset + 20);
  });
  return bytes;
}

function walPayload(before: Buffer | undefined, after: Buffer, binding: Binding = BINDING) {
  return {
    baselineKind: before === undefined ? 'absent' : 'regular',
    baselineBase64: before?.toString('base64') ?? '',
    afterKind: 'regular',
    afterBase64: after.toString('base64'),
    baselineBinding: binding,
    afterBinding: binding,
  };
}

const MODES = [
  'prepare',
  'dirty-hold',
  'rollback-verify',
  'committed-wal-hold',
  'recovery-verify',
  'final-reopen',
] as const;

type Mode = typeof MODES[number];
type PhaseBinding = Binding;

function phaseBinding(index: number): PhaseBinding {
  const hex = index.toString(16);
  return Object.freeze({
    ...BINDING,
    pid: BINDING.pid + index,
    starttime: String(987654321 + index),
    launchNonce: hex.repeat(32),
    runtimeIdentity: (15 - index).toString(16).repeat(32),
  });
}

// зачем: пакет §5 Phase 2 требует снять baseline WAL ДО ОТПРАВКИ launch (а не только
// до launch-ack). Поэтому каждая фаза: bootstrap-ack (хост проверил pid/starttime после
// bootstrap) → [baseline-bound только в dirty-hold] → launch-sent (хост отправил launch)
// → launch-ack (процесс принял привязку). Порядок baseline-bound < launch-sent и есть
// доказательство «baseline до отправки launch».
function phaseEvents(mode: Mode): readonly string[] {
  return {
    prepare: ['bootstrap-ack', 'launch-sent', 'launch-ack', 'prepare-pass'],
    'dirty-hold': [
      'bootstrap-ack', 'baseline-bound', 'launch-sent', 'launch-ack', 'dirty-ready', 'wal-delta-validated',
      'sigkill-sent', 'proc-gone',
    ],
    'rollback-verify': ['bootstrap-ack', 'launch-sent', 'launch-ack', 'rollback-pass'],
    'committed-wal-hold': [
      'bootstrap-ack', 'launch-sent', 'launch-ack', 'committed-wal-ready', 'wal-present-validated', 'sigkill-sent',
      'proc-gone',
    ],
    'recovery-verify': [
      'bootstrap-ack', 'launch-sent', 'launch-ack', 'authoritative-read', 'checkpoint', 'recovery-pass',
    ],
    'final-reopen': ['bootstrap-ack', 'launch-sent', 'launch-ack', 'final-reopen-pass'],
  }[mode];
}

// зачем: aggregate привязан к транскрипту через transcriptSha256 — SHA-256 канонического
// JSON (ключи по порядку кодовых единиц, без пробелов). Та же функция живёт в раннере;
// расхождение реализаций сразу роняет тест TranscriptDigest.
function canonicalJson(value: unknown): string {
  if (value === null || typeof value === 'boolean' || typeof value === 'number' || typeof value === 'string') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`).join(',')}}`;
}

type Transcript = ReturnType<typeof phaseTranscript>;

function swapKinds(payload: Transcript, phaseIndex: number, first: string, second: string): void {
  const events = [...payload.phases[phaseIndex].events];
  const left = events.findIndex((event) => event.kind === first);
  const right = events.findIndex((event) => event.kind === second);
  if (left < 0 || right < 0) throw new Error('fixture event missing');
  [events[left], events[right]] = [events[right], events[left]];
  payload.phases[phaseIndex].events = events;
}

function phaseTranscript() {
  return {
    phases: MODES.map((mode, index) => {
      const binding = phaseBinding(index + 1);
      return {
        mode,
        binding,
        events: phaseEvents(mode).map((kind) => ({ kind, binding })),
        procDisappeared: true,
      };
    }),
  };
}

function successfulCleanup() {
  return {
    campaignStatus: 'pass',
    familyMembers: ['main', 'wal', 'shm', 'journal'].map((member) => ({ member, absent: true })),
    partialDelete: false,
    packageRestored: true,
    sourceRecaptured: true,
    nativeRecaptured: true,
    apkRecaptured: true,
    currentTempCleanupComplete: true,
  };
}

function failureCleanup() {
  return {
    campaignStatus: 'failure',
    familyMembers: ['main', 'wal', 'shm', 'journal'].map((member) => ({ member, preserved: true })),
    partialDelete: false,
  };
}

function sha256Hex(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

function transcriptSha256(transcript: unknown = phaseTranscript()): string {
  return sha256Hex(canonicalJson(transcript));
}

function aggregatePhases() {
  return MODES.map((name, index) => {
    const binding = phaseBinding(index + 1);
    return {
      name,
      eventKinds: [...phaseEvents(name)],
      pid: binding.pid,
      starttime: binding.starttime,
      processNameSha256: sha256Hex(binding.processName),
      launchNonceSha256: sha256Hex(binding.launchNonce),
      runtimeIdentitySha256: sha256Hex(binding.runtimeIdentity),
    };
  });
}

function committedWalFamilyFacts() {
  return [
    { member: 'main', kind: 'regular', length: 4096, sha256: '7'.repeat(64) },
    { member: 'wal', kind: 'regular', length: 32 + 3 * (24 + 4096), sha256: '8'.repeat(64) },
    { member: 'shm', kind: 'regular', length: 32768, sha256: '9'.repeat(64) },
    { member: 'journal', kind: 'absent', length: 0, sha256: null },
  ];
}

// зачем: PASS публикуется только при полном наборе фактов §8 пакета (схема, фазы и
// хэши привязки, dirty-WAL до/после, счётчики отката/восстановления, семейство файлов,
// целостность, cleanup, хэши кастоди) — без любого из них aggregate не принимается.
function acceptedAggregate() {
  return {
    schemaVersion: 1,
    accepted: true,
    phaseCount: 6,
    phases: aggregatePhases(),
    checkpointAfterAuthoritativeRead: true,
    plaintextCanaryAbsent: true,
    dirtyWalPreFrameCount: 2,
    dirtyWalPostFrameCount: 5,
    dirtyDeltaFrameCount: 3,
    dirtyWalBaselineFact: { kind: 'regular', length: 32 + 2 * (24 + 4096), sha256: 'b'.repeat(64) },
    dirtyWalAfterFact: { kind: 'regular', length: 32 + 5 * (24 + 4096), sha256: 'c'.repeat(64) },
    committedWalFamilyFacts: committedWalFamilyFacts(),
    rollbackDirtyBatchRowCount: 0,
    rollbackDirtyItemRowCount: 0,
    recoveryCommittedBatchRowCount: 1,
    recoveryCommittedItemRowCount: 2,
    cleanupComplete: true,
    dirtyWalPrefixMatch: true,
    dirtyWalSaltsMatch: true,
    dirtyWalChecksumsValid: true,
    dirtyWalStructurallyComplete: true,
    dirtyWalAllDeltaCommitMarkersZero: true,
    quickCheckOk: true,
    cipherIntegrityErrorCount: 0,
    packetSha256: '1'.repeat(64),
    sourceSha256: '2'.repeat(64),
    launcherSha256: '3'.repeat(64),
    nativeSha256: '4'.repeat(64),
    apkSha256: '5'.repeat(64),
    deviceIdentitySha256: '6'.repeat(64),
    transcriptSha256: transcriptSha256(),
    abi: 'x86_64',
  };
}

function publication(
  aggregate: Record<string, unknown> = acceptedAggregate(),
  cleanup: Record<string, unknown> = successfulCleanup(),
  transcript: unknown = phaseTranscript(),
  status: unknown = 'pass',
): Record<string, unknown> {
  return { status, aggregate, cleanup, transcript };
}

const AGGREGATE_BOOLEAN_FACTS = [
  'checkpointAfterAuthoritativeRead',
  'plaintextCanaryAbsent',
  'dirtyWalPrefixMatch',
  'dirtyWalSaltsMatch',
  'dirtyWalChecksumsValid',
  'dirtyWalStructurallyComplete',
  'dirtyWalAllDeltaCommitMarkersZero',
  'quickCheckOk',
] as const;

const AGGREGATE_HASH_FACTS = [
  'packetSha256',
  'sourceSha256',
  'launcherSha256',
  'nativeSha256',
  'apkSha256',
  'deviceIdentitySha256',
  'transcriptSha256',
] as const;

const AGGREGATE_SECTION8_FACTS = [
  ...AGGREGATE_BOOLEAN_FACTS,
  ...AGGREGATE_HASH_FACTS,
  'dirtyDeltaFrameCount',
  'cipherIntegrityErrorCount',
  'abi',
] as const;

function aggregateWith(field: string, value: unknown): Record<string, unknown> {
  return { ...acceptedAggregate(), [field]: value };
}

function aggregateWithout(field: string): Record<string, unknown> {
  const value: Record<string, unknown> = { ...acceptedAggregate() };
  delete value[field];
  return value;
}

function section8Mutations(): readonly (readonly [string, Record<string, unknown>])[] {
  return [
    ...AGGREGATE_BOOLEAN_FACTS.flatMap((field) => [
      [`${field} false`, aggregateWith(field, false)] as const,
      [`${field} string`, aggregateWith(field, 'true')] as const,
      [`${field} number`, aggregateWith(field, 1)] as const,
      [`${field} null`, aggregateWith(field, null)] as const,
    ]),
    ...AGGREGATE_HASH_FACTS.flatMap((field) => [
      [`${field} uppercase`, aggregateWith(field, 'A'.repeat(64))] as const,
      [`${field} short`, aggregateWith(field, 'a'.repeat(63))] as const,
      [`${field} number`, aggregateWith(field, 7)] as const,
    ]),
    ['dirtyDeltaFrameCount zero', aggregateWith('dirtyDeltaFrameCount', 0)],
    ['dirtyDeltaFrameCount negative', aggregateWith('dirtyDeltaFrameCount', -1)],
    ['dirtyDeltaFrameCount string', aggregateWith('dirtyDeltaFrameCount', '3')],
    ['dirtyDeltaFrameCount fraction', aggregateWith('dirtyDeltaFrameCount', 1.5)],
    ['dirtyDeltaFrameCount boolean', aggregateWith('dirtyDeltaFrameCount', true)],
    ['cipherIntegrityErrorCount one', aggregateWith('cipherIntegrityErrorCount', 1)],
    ['cipherIntegrityErrorCount string', aggregateWith('cipherIntegrityErrorCount', '0')],
    ['cipherIntegrityErrorCount null', aggregateWith('cipherIntegrityErrorCount', null)],
    ['cipherIntegrityErrorCount false', aggregateWith('cipherIntegrityErrorCount', false)],
    ['abi arm64', aggregateWith('abi', 'arm64-v8a')],
    ['abi number', aggregateWith('abi', 64)],
    ...AGGREGATE_SECTION8_FACTS.map((field) => [`${field} missing`, aggregateWithout(field)] as const),
  ];
}

// зачем: остаток P2-C — оставшиеся факты §8 обязаны быть в точном наборе ключей
// с типизированной проверкой. Каждый получает false/строку/число/null/отсутствие.
const AGGREGATE_EXACT_INTEGER_FACTS = [
  ['schemaVersion', 1, 2],
  ['rollbackDirtyBatchRowCount', 0, 1],
  ['rollbackDirtyItemRowCount', 0, 1],
  ['recoveryCommittedBatchRowCount', 1, 0],
  ['recoveryCommittedItemRowCount', 2, 1],
] as const;

const AGGREGATE_STRUCTURED_FACTS = [
  'phases',
  'dirtyWalBaselineFact',
  'dirtyWalAfterFact',
  'committedWalFamilyFacts',
] as const;

function typedMutations(field: string, wrongNumber: unknown): readonly (readonly [string, Record<string, unknown>])[] {
  return [
    [`${field} false`, aggregateWith(field, false)],
    [`${field} string`, aggregateWith(field, '1')],
    [`${field} number`, aggregateWith(field, wrongNumber)],
    [`${field} null`, aggregateWith(field, null)],
    [`${field} missing`, aggregateWithout(field)],
  ];
}

function withPhase(index: number, patch: Record<string, unknown>): Record<string, unknown> {
  const phases = aggregatePhases().map((phase, candidate) => candidate === index ? { ...phase, ...patch } : phase);
  return aggregateWith('phases', phases);
}

function withFamilyMember(index: number, patch: Record<string, unknown>): Record<string, unknown> {
  const facts = committedWalFamilyFacts().map((fact, candidate) => candidate === index ? { ...fact, ...patch } : fact);
  return aggregateWith('committedWalFamilyFacts', facts);
}

function remainingSection8Mutations(): readonly (readonly [string, Record<string, unknown>])[] {
  const phases = aggregatePhases();
  const baseline = acceptedAggregate().dirtyWalBaselineFact;
  const after = acceptedAggregate().dirtyWalAfterFact;
  return [
    ...AGGREGATE_EXACT_INTEGER_FACTS.flatMap(([field, , wrong]) => [
      ...typedMutations(field, wrong),
      [`${field} fraction`, aggregateWith(field, 0.5)] as const,
    ]),
    ...typedMutations('dirtyWalPreFrameCount', -1),
    ...typedMutations('dirtyWalPostFrameCount', -1),
    ...typedMutations('cleanupComplete', 1),
    ['cleanupComplete string true', aggregateWith('cleanupComplete', 'true')],
    ...AGGREGATE_STRUCTURED_FACTS.flatMap((field) => typedMutations(field, 7)),
    ['post-pre arithmetic (post too small)', aggregateWith('dirtyWalPostFrameCount', 4)],
    ['post-pre arithmetic (pre too large)', aggregateWith('dirtyWalPreFrameCount', 3)],
    ['post-pre arithmetic (pre above post)', { ...acceptedAggregate(), dirtyWalPreFrameCount: 8, dirtyWalPostFrameCount: 5 }],
    ['post-pre arithmetic (string post)', aggregateWith('dirtyWalPostFrameCount', '5')],
    ['phases reordered', aggregateWith('phases', [phases[1], phases[0], ...phases.slice(2)])],
    ['phases only five', aggregateWith('phases', phases.slice(0, 5))],
    ['phase name wrong', withPhase(2, { name: 'rollback' })],
    ['phase name number', withPhase(0, { name: 1 })],
    ['phase extra key', withPhase(0, { extra: true })],
    ['dirty event kinds with baseline after launch-ack', withPhase(1, {
      eventKinds: [
        'bootstrap-ack', 'launch-sent', 'launch-ack', 'baseline-bound', 'dirty-ready', 'wal-delta-validated',
        'sigkill-sent', 'proc-gone',
      ],
    })],
    ['dirty event kinds with baseline after launch-sent', withPhase(1, {
      eventKinds: [
        'bootstrap-ack', 'launch-sent', 'baseline-bound', 'launch-ack', 'dirty-ready', 'wal-delta-validated',
        'sigkill-sent', 'proc-gone',
      ],
    })],
    ['event kinds without launch-sent', withPhase(0, { eventKinds: ['bootstrap-ack', 'launch-ack', 'prepare-pass'] })],
    ['event kinds without bootstrap-ack', withPhase(0, { eventKinds: ['launch-sent', 'launch-ack', 'prepare-pass'] })],
    ['event kinds string', withPhase(0, { eventKinds: 'bootstrap-ack' })],
    ['phase pid string', withPhase(0, { pid: String(phases[0].pid) })],
    ['phase pid zero', withPhase(0, { pid: 0 })],
    ['phase starttime number', withPhase(0, { starttime: 987654322 })],
    ['phase process-name hash of foreign process', withPhase(0, { processNameSha256: sha256Hex('app.other') })],
    ['phase nonce hash uppercase', withPhase(0, { launchNonceSha256: phases[0].launchNonceSha256.toUpperCase() })],
    ['phase runtime hash null', withPhase(0, { runtimeIdentitySha256: null })],
    ['phase nonce hash reused', withPhase(1, { launchNonceSha256: phases[0].launchNonceSha256 })],
    ['phase runtime hash reused', withPhase(1, { runtimeIdentitySha256: phases[0].runtimeIdentitySha256 })],
    ['phase pid/starttime reused', withPhase(1, { pid: phases[0].pid, starttime: phases[0].starttime })],
    ['baseline absent with pre frames', aggregateWith('dirtyWalBaselineFact', { kind: 'absent', length: 0, sha256: null })],
    ['baseline absent with hash', { ...acceptedAggregate(), dirtyWalPreFrameCount: 0, dirtyWalPostFrameCount: 3, dirtyWalBaselineFact: { kind: 'absent', length: 0, sha256: 'b'.repeat(64) } }],
    ['baseline regular empty', aggregateWith('dirtyWalBaselineFact', { ...baseline, length: 0 })],
    ['baseline length string', aggregateWith('dirtyWalBaselineFact', { ...baseline, length: String(baseline.length) })],
    ['baseline kind symlink', aggregateWith('dirtyWalBaselineFact', { ...baseline, kind: 'symlink' })],
    ['baseline extra key', aggregateWith('dirtyWalBaselineFact', { ...baseline, extra: true })],
    ['after absent', aggregateWith('dirtyWalAfterFact', { kind: 'absent', length: 0, sha256: null })],
    ['after not longer than baseline', aggregateWith('dirtyWalAfterFact', { ...after, length: baseline.length })],
    ['after hash uppercase', aggregateWith('dirtyWalAfterFact', { ...after, sha256: 'C'.repeat(64) })],
    ['after missing hash', aggregateWith('dirtyWalAfterFact', { kind: after.kind, length: after.length })],
    ['committed wal absent', withFamilyMember(1, { kind: 'absent', length: 0, sha256: null })],
    ['committed main absent', withFamilyMember(0, { kind: 'absent', length: 0, sha256: null })],
    ['committed member order', aggregateWith('committedWalFamilyFacts', [
      committedWalFamilyFacts()[1], committedWalFamilyFacts()[0], ...committedWalFamilyFacts().slice(2),
    ])],
    ['committed member missing', aggregateWith('committedWalFamilyFacts', committedWalFamilyFacts().slice(0, 3))],
    ['committed hash uppercase', withFamilyMember(2, { sha256: 'F'.repeat(64) })],
    ['committed absent with length', withFamilyMember(3, { length: 1 })],
    ['committed length fraction', withFamilyMember(1, { length: 32.5 })],
    ['committed member extra key', withFamilyMember(0, { extra: true })],
  ];
}

const RUNTIME_IDENTITY = '00112233445566778899aabbccddeeff';
// зачем: bootstrap приходит ДО того, как хост знает PID/starttime нового процесса,
// поэтому он несёт ровно command+mode; привязка к процессу приходит командой launch.
const PROBE_PREFIX = 'phraseman://_account_v2_sqlcipher_recovery_probe?';
const BOOTSTRAP_URL = `${PROBE_PREFIX}command=bootstrap&mode=prepare`;
const LEGACY_BOUND_BOOTSTRAP_URL =
  `${BOOTSTRAP_URL}&packageName=app.phraseman&processName=app.phraseman&` +
  `pid=${BINDING.pid}&starttime=${BINDING.starttime}&launchNonce=${BINDING.launchNonce}`;
const BOOTSTRAP_ACK = [
  'account_sqlcipher_recovery_bootstrap_acknowledged',
  RUNTIME_IDENTITY,
  'prepare',
].join('|');
const LAUNCH_ACK = [
  'account_sqlcipher_recovery_launch_acknowledged',
  'app.phraseman',
  'app.phraseman',
  String(BINDING.pid),
  BINDING.starttime,
  BINDING.launchNonce,
  RUNTIME_IDENTITY,
  'prepare',
].join('|');

function launchUrl(overrides: Readonly<Record<string, string>> = {}): string {
  const values = {
    command: 'launch',
    mode: 'prepare',
    packageName: 'app.phraseman',
    processName: 'app.phraseman',
    pid: String(BINDING.pid),
    starttime: BINDING.starttime,
    launchNonce: BINDING.launchNonce,
    runtimeIdentity: RUNTIME_IDENTITY,
    ...overrides,
  };
  return PROBE_PREFIX +
    Object.entries(values).map(([key, value]) => `${key}=${value}`).join('&');
}

function loggedLines(log: jest.SpyInstance): readonly unknown[] {
  return log.mock.calls.map((call: readonly unknown[]) => call[0]);
}

function launchAckLogged(log: jest.SpyInstance): boolean {
  return loggedLines(log).some((line) =>
    typeof line === 'string' && line.startsWith('account_sqlcipher_recovery_launch_acknowledged'));
}

async function flushAsync(): Promise<void> {
  await new Promise((resolve) => { setImmediate(resolve); });
  await new Promise((resolve) => { setImmediate(resolve); });
}

async function loadIndexHarness(initialUrl: string) {
  jest.resetModules();
  let registered: (() => unknown) | undefined;
  let listener: ((event: { url: string }) => void) | undefined;
  const remove = jest.fn();
  const openDatabaseAsync = jest.fn(async () => Object.freeze({ opened: true }));
  const runProbe = jest.fn(async (
    port: { openDatabaseAsync: (...args: readonly unknown[]) => Promise<unknown> },
    _mode: string,
    emit: (marker: string) => void,
  ) => {
    await port.openDatabaseAsync('name', Object.freeze({}), 'directory');
    emit('account_sqlcipher_recovery_prepare_pass');
  });
  const addEventListener = jest.fn((_kind: string, callback: (event: { url: string }) => void) => {
    listener = callback;
    return { remove };
  });
  const log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
  jest.doMock('react', () => ({ useEffect: (effect: () => void) => effect() }));
  jest.doMock('expo', () => ({
    registerRootComponent: (component: () => unknown) => { registered = component; },
  }));
  jest.doMock('expo-crypto', () => ({ randomUUID: () => '00112233-4455-6677-8899-aabbccddeeff' }));
  jest.doMock('expo-linking', () => ({
    getInitialURL: jest.fn(async () => initialUrl),
    addEventListener,
  }));
  jest.doMock('react-native', () => ({ Platform: { OS: 'android' } }));
  jest.doMock('expo-sqlite', () => ({ defaultDatabaseDirectory: '/database', openDatabaseAsync }));
  jest.doMock('../runtime-probes/android-account-sqlcipher-recovery/probe', () => ({
    MARKERS: Object.freeze({
      preparePass: 'account_sqlcipher_recovery_prepare_pass',
      dirtyReady: 'account_sqlcipher_recovery_dirty_ready',
      rollbackPass: 'account_sqlcipher_recovery_rollback_pass',
      committedWalReady: 'account_sqlcipher_recovery_committed_wal_ready',
      recoveryPass: 'account_sqlcipher_recovery_recovery_pass',
      finalReopenPass: 'account_sqlcipher_recovery_final_reopen_pass',
    }),
    runAndroidAccountSqlcipherRecoveryProbe: runProbe,
  }));
  jest.isolateModules(() => { jest.requireActual(INDEX); });
  expect(registered).toBeDefined();
  const render = registered as () => unknown;
  render();
  await flushAsync();
  return {
    addEventListener,
    listener: () => listener,
    log,
    openDatabaseAsync,
    remove,
    render,
    restore: () => { log.mockRestore(); },
    runProbe,
  };
}

describe('Android Account V2 SQLCipher recovery entrypoint and host validators', () => {
  test('entrypoint implements bootstrap-then-launch with exact modes, binding, and fixed sanitized markers', () => {
    const source = fs.readFileSync(INDEX, 'utf8');
    for (const mode of [
      'prepare', 'dirty-hold', 'rollback-verify', 'committed-wal-hold', 'recovery-verify', 'final-reopen',
    ]) expect(source).toContain(`'${mode}'`);
    for (const field of [
      'packageName', 'processName', 'pid', 'starttime', 'launchNonce', 'runtimeIdentity', 'mode',
    ]) expect(source).toContain(field);
    expect(source).toContain("Linking.addEventListener('url'");
    expect(source).toContain('account_sqlcipher_recovery_bootstrap_acknowledged');
    expect(source).toContain('account_sqlcipher_recovery_launch_acknowledged');
    expect(source).toContain('account_sqlcipher_recovery_request_invalid');
    expect(source).toContain('Object.getOwnPropertyDescriptor');
    expect(source).not.toMatch(/console\.(?:error|warn)|failure\.message|String\(failure\)|JSON\.stringify\(failure\)/u);
  });

  test('bootstrap carries only command+mode; ack exposes only runtimeIdentity+mode while unopened', async () => {
    const harness = await loadIndexHarness(BOOTSTRAP_URL);
    try {
      expect(harness.addEventListener).toHaveBeenCalledTimes(1);
      expect(harness.openDatabaseAsync).not.toHaveBeenCalled();
      expect(harness.runProbe).not.toHaveBeenCalled();
      expect(loggedLines(harness.log)).toEqual([BOOTSTRAP_ACK]);
      expect(launchAckLogged(harness.log)).toBe(false);
    } finally {
      harness.restore();
    }
  });

  test('accepted launch binds pid/starttime/nonce/runtime/mode, then acknowledges, then opens exactly once', async () => {
    const harness = await loadIndexHarness(BOOTSTRAP_URL);
    try {
      const listener = harness.listener();
      expect(listener).toBeDefined();
      listener?.({ url: launchUrl() });
      await flushAsync();
      expect(harness.remove).toHaveBeenCalledTimes(1);
      expect(harness.runProbe).toHaveBeenCalledTimes(1);
      expect(harness.runProbe.mock.calls[0][1]).toBe('prepare');
      expect(harness.openDatabaseAsync).toHaveBeenCalledTimes(1);
      expect(loggedLines(harness.log)).toEqual([
        BOOTSTRAP_ACK,
        LAUNCH_ACK,
        [
          'account_sqlcipher_recovery_prepare_pass', 'app.phraseman', 'app.phraseman',
          String(BINDING.pid), BINDING.starttime, BINDING.launchNonce, RUNTIME_IDENTITY, 'prepare',
        ].join('|'),
      ]);
      const launchAckCall = harness.log.mock.calls.findIndex((call: readonly unknown[]) => call[0] === LAUNCH_ACK);
      expect(harness.log.mock.invocationCallOrder[launchAckCall])
        .toBeLessThan(harness.openDatabaseAsync.mock.invocationCallOrder[0]);

      listener?.({ url: launchUrl() });
      await flushAsync();
      expect(harness.runProbe).toHaveBeenCalledTimes(1);
      expect(harness.openDatabaseAsync).toHaveBeenCalledTimes(1);
    } finally {
      harness.restore();
    }
  });

  test('rejects launch before bootstrap (direct initial launch) without listener, ack, or open', async () => {
    const harness = await loadIndexHarness(launchUrl());
    try {
      expect(harness.addEventListener).not.toHaveBeenCalled();
      expect(harness.runProbe).not.toHaveBeenCalled();
      expect(harness.openDatabaseAsync).not.toHaveBeenCalled();
      expect(loggedLines(harness.log)).toEqual(['account_sqlcipher_recovery_request_invalid']);
    } finally {
      harness.restore();
    }
  });

  test.each([
    ['mode (differs from bootstrap mode)', 'mode', 'dirty-hold'],
    ['runtimeIdentity (foreign runtime)', 'runtimeIdentity', 'e'.repeat(32)],
    ['runtimeIdentity (uppercase)', 'runtimeIdentity', RUNTIME_IDENTITY.toUpperCase()],
    ['pid (not decimal)', 'pid', '0x10'],
    ['pid (zero)', 'pid', '0'],
    ['starttime (not decimal)', 'starttime', 'abc'],
    ['launchNonce (short)', 'launchNonce', 'f'.repeat(31)],
    ['packageName', 'packageName', 'app.other'],
    ['processName', 'processName', 'app.phraseman:remote'],
    ['command', 'command', 'bootstrap'],
  ])('rejects first launch command with invalid %s and never acknowledges or opens', async (_name, field, value) => {
    const harness = await loadIndexHarness(BOOTSTRAP_URL);
    try {
      harness.listener()?.({ url: launchUrl({ [field]: value }) });
      await flushAsync();
      expect(harness.remove).toHaveBeenCalledTimes(1);
      expect(harness.runProbe).not.toHaveBeenCalled();
      expect(harness.openDatabaseAsync).not.toHaveBeenCalled();
      expect(launchAckLogged(harness.log)).toBe(false);
      expect(harness.log).toHaveBeenCalledWith('account_sqlcipher_recovery_request_invalid');
    } finally {
      harness.restore();
    }
  });

  test('rejects a repeated bootstrap delivered as the second command', async () => {
    const harness = await loadIndexHarness(BOOTSTRAP_URL);
    try {
      harness.listener()?.({ url: BOOTSTRAP_URL });
      await flushAsync();
      expect(harness.runProbe).not.toHaveBeenCalled();
      expect(harness.openDatabaseAsync).not.toHaveBeenCalled();
      expect(launchAckLogged(harness.log)).toBe(false);
      expect(loggedLines(harness.log)).toEqual([BOOTSTRAP_ACK, 'account_sqlcipher_recovery_request_invalid']);
    } finally {
      harness.restore();
    }
  });

  test('rejects a launch that carries an extra parameter', async () => {
    const harness = await loadIndexHarness(BOOTSTRAP_URL);
    try {
      harness.listener()?.({ url: `${launchUrl()}&extra=1` });
      await flushAsync();
      expect(harness.openDatabaseAsync).not.toHaveBeenCalled();
      expect(launchAckLogged(harness.log)).toBe(false);
    } finally {
      harness.restore();
    }
  });

  test.each([
    ['legacy process-bound bootstrap', LEGACY_BOUND_BOOTSTRAP_URL],
    ['duplicate mode', `${BOOTSTRAP_URL}&mode=prepare`],
    ['invalid mode', `${PROBE_PREFIX}command=bootstrap&mode=PREPARE`],
    ['missing mode', `${PROBE_PREFIX}command=bootstrap`],
    ['reordered parameters', `${PROBE_PREFIX}mode=prepare&command=bootstrap`],
    ['extra runtimeIdentity', `${BOOTSTRAP_URL}&runtimeIdentity=${RUNTIME_IDENTITY}`],
  ])('rejects malformed bootstrap (%s) without listener, ack, or open', async (_name, url) => {
    const harness = await loadIndexHarness(url);
    try {
      expect(harness.addEventListener).not.toHaveBeenCalled();
      expect(harness.runProbe).not.toHaveBeenCalled();
      expect(harness.openDatabaseAsync).not.toHaveBeenCalled();
      expect(loggedLines(harness.log)).toEqual(['account_sqlcipher_recovery_request_invalid']);
    } finally {
      harness.restore();
    }
  });

  test('rejects recreation in the same JS runtime without replacing the first launch claim', async () => {
    const harness = await loadIndexHarness(BOOTSTRAP_URL);
    try {
      expect(harness.addEventListener).toHaveBeenCalledTimes(1);
      harness.render();
      await flushAsync();
      expect(harness.addEventListener).toHaveBeenCalledTimes(1);
      expect(harness.runProbe).not.toHaveBeenCalled();
      expect(harness.openDatabaseAsync).not.toHaveBeenCalled();
      expect(harness.log).toHaveBeenCalledWith('account_sqlcipher_recovery_request_invalid');
    } finally {
      harness.restore();
    }
  });

  test('runner source stays library-only: device work lives only in the separately authorized launcher', () => {
    const source = fs.readFileSync(RUNNER, 'utf8');
    expect(source).toContain("[ValidateSet('WalDelta'");
    expect(source).toContain('device_campaign_not_authorized');
    expect(source).not.toMatch(/\badb(?:\.exe)?\b|gradlew|emulator|Start-Process|npm\s+install/iu);
  });

  test('accepts one exact ordered six-phase binding transcript', () => {
    expectPass('PhaseTranscript', phaseTranscript());
  });

  test.each([
    // зачем: меняем ТОЛЬКО pid+starttime (runtime и nonce остаются уникальными), чтобы
    // тест ловил удаление именно проверки повторного процесса, а не соседних проверок.
    ['pid/starttime reuse', (payload: ReturnType<typeof phaseTranscript>) => {
      const reused = {
        ...payload.phases[1].binding,
        pid: payload.phases[0].binding.pid,
        starttime: payload.phases[0].binding.starttime,
      };
      payload.phases[1].binding = reused;
      payload.phases[1].events = payload.phases[1].events.map((event) => ({ ...event, binding: reused }));
    }],
    ['dirty sigkill without wal-delta-validated', (payload: ReturnType<typeof phaseTranscript>) => {
      payload.phases[1].events = payload.phases[1].events.filter((event) => event.kind !== 'wal-delta-validated');
    }],
    ['dirty wal-delta-validated after sigkill', (payload: ReturnType<typeof phaseTranscript>) => {
      swapKinds(payload, 1, 'wal-delta-validated', 'sigkill-sent');
    }],
    ['dirty proc-gone not last', (payload: ReturnType<typeof phaseTranscript>) => {
      swapKinds(payload, 1, 'sigkill-sent', 'proc-gone');
    }],
    // зачем: регрессия P1 — baseline обязан сниматься ДО команды launch (§5 Phase 2).
    ['dirty baseline-bound after launch-ack', (payload: ReturnType<typeof phaseTranscript>) => {
      swapKinds(payload, 1, 'baseline-bound', 'launch-ack');
    }],
    // зачем: открытый P2 — baseline обязан предшествовать ОТПРАВКЕ launch, не только ack.
    ['dirty baseline-bound after launch-sent', (payload: ReturnType<typeof phaseTranscript>) => {
      swapKinds(payload, 1, 'baseline-bound', 'launch-sent');
    }],
    ['dirty launch-sent missing', (payload: ReturnType<typeof phaseTranscript>) => {
      payload.phases[1].events = payload.phases[1].events.filter((event) => event.kind !== 'launch-sent');
    }],
    ['launch-sent after launch-ack', (payload: ReturnType<typeof phaseTranscript>) => {
      swapKinds(payload, 4, 'launch-sent', 'launch-ack');
    }],
    ['launch-sent cross-bound', (payload: ReturnType<typeof phaseTranscript>) => {
      payload.phases[2].events = payload.phases[2].events.map((event) =>
        event.kind === 'launch-sent' ? { ...event, binding: payload.phases[3].binding } : event);
    }],
    ['dirty baseline-bound before bootstrap-ack', (payload: ReturnType<typeof phaseTranscript>) => {
      swapKinds(payload, 1, 'bootstrap-ack', 'baseline-bound');
    }],
    ['dirty baseline-bound missing', (payload: ReturnType<typeof phaseTranscript>) => {
      payload.phases[1].events = payload.phases[1].events.filter((event) => event.kind !== 'baseline-bound');
    }],
    ['baseline-bound in a non-dirty phase', (payload: ReturnType<typeof phaseTranscript>) => {
      const events = [...payload.phases[3].events];
      events.splice(1, 0, { kind: 'baseline-bound', binding: payload.phases[3].binding });
      payload.phases[3].events = events;
    }],
    ['bootstrap-ack duplicated', (payload: ReturnType<typeof phaseTranscript>) => {
      payload.phases[1].events = [payload.phases[1].events[0], ...payload.phases[1].events];
    }],
    ['dirty proc-gone missing', (payload: ReturnType<typeof phaseTranscript>) => {
      payload.phases[1].events = payload.phases[1].events.filter((event) => event.kind !== 'proc-gone');
    }],
    ['committed sigkill without wal-present-validated', (payload: ReturnType<typeof phaseTranscript>) => {
      payload.phases[3].events = payload.phases[3].events.filter((event) => event.kind !== 'wal-present-validated');
    }],
    ['committed wal-present-validated after sigkill', (payload: ReturnType<typeof phaseTranscript>) => {
      swapKinds(payload, 3, 'wal-present-validated', 'sigkill-sent');
    }],
    ['committed proc-gone not last', (payload: ReturnType<typeof phaseTranscript>) => {
      swapKinds(payload, 3, 'sigkill-sent', 'proc-gone');
    }],
    ['committed proc-gone missing', (payload: ReturnType<typeof phaseTranscript>) => {
      payload.phases[3].events = payload.phases[3].events.filter((event) => event.kind !== 'proc-gone');
    }],
    ['wal-present-validated in dirty phase', (payload: ReturnType<typeof phaseTranscript>) => {
      payload.phases[1].events = payload.phases[1].events.map((event) =>
        event.kind === 'wal-delta-validated' ? { ...event, kind: 'wal-present-validated' } : event);
    }],
    ['proc-gone in a non-killed phase', (payload: ReturnType<typeof phaseTranscript>) => {
      payload.phases[2].events = [...payload.phases[2].events, { kind: 'proc-gone', binding: payload.phases[2].binding }];
    }],
    ['proc-gone cross-bound', (payload: ReturnType<typeof phaseTranscript>) => {
      payload.phases[3].events = payload.phases[3].events.map((event) =>
        event.kind === 'proc-gone' ? { ...event, binding: payload.phases[2].binding } : event);
    }],
    ['runtime reuse', (payload: ReturnType<typeof phaseTranscript>) => {
      payload.phases[1].binding = { ...payload.phases[1].binding, runtimeIdentity: payload.phases[0].binding.runtimeIdentity };
      payload.phases[1].events = payload.phases[1].events.map((event) => ({ ...event, binding: payload.phases[1].binding }));
    }],
    ['nonce reuse', (payload: ReturnType<typeof phaseTranscript>) => {
      payload.phases[1].binding = { ...payload.phases[1].binding, launchNonce: payload.phases[0].binding.launchNonce };
      payload.phases[1].events = payload.phases[1].events.map((event) => ({ ...event, binding: payload.phases[1].binding }));
    }],
    ['cross-bound marker', (payload: ReturnType<typeof phaseTranscript>) => {
      payload.phases[1].events[2] = { ...payload.phases[1].events[2], binding: payload.phases[0].binding };
    }],
    ['missing disappearance', (payload: ReturnType<typeof phaseTranscript>) => {
      payload.phases[1].procDisappeared = false;
    }],
    ['reordered terminal', (payload: ReturnType<typeof phaseTranscript>) => {
      payload.phases[4].events = [...payload.phases[4].events].reverse();
    }],
  ] as const)('rejects phase transcript mutation: %s', (_name, mutate) => {
    const payload = phaseTranscript();
    mutate(payload);
    expectReject('PhaseTranscript', payload, 'phase_transcript_invalid');
  });

  test('every phase transcript starts with bootstrap-ack and dirty-hold binds baseline before launch-sent', () => {
    for (const mode of MODES) {
      expect(phaseEvents(mode)[0]).toBe('bootstrap-ack');
      expect(phaseEvents(mode).indexOf('launch-sent') + 1).toBe(phaseEvents(mode).indexOf('launch-ack'));
    }
    const dirty = phaseEvents('dirty-hold');
    expect(dirty.indexOf('baseline-bound')).toBeLessThan(dirty.indexOf('launch-sent'));
  });

  test.each(MODES.map((mode, index) => [mode, index] as const))(
    'rejects transcript whose %s phase omits launch-sent',
    (_mode, index) => {
      const payload = phaseTranscript();
      payload.phases[index].events = payload.phases[index].events.filter((event) => event.kind !== 'launch-sent');
      expectReject('PhaseTranscript', payload, 'phase_transcript_invalid');
    },
  );

  test('TranscriptDigest equals SHA-256 of the canonical transcript JSON computed independently', () => {
    const result = expectPass('TranscriptDigest', phaseTranscript());
    expect(result.transcriptSha256).toBe(transcriptSha256());
  });

  test('TranscriptDigest refuses an invalid transcript instead of hashing it', () => {
    const payload = phaseTranscript();
    swapKinds(payload, 1, 'baseline-bound', 'launch-sent');
    expectReject('TranscriptDigest', payload, 'phase_transcript_invalid');
  });

  test.each(MODES.map((mode, index) => [mode, index] as const))(
    'rejects transcript whose %s phase omits bootstrap-ack',
    (_mode, index) => {
      const payload = phaseTranscript();
      payload.phases[index].events = payload.phases[index].events.filter((event) => event.kind !== 'bootstrap-ack');
      expectReject('PhaseTranscript', payload, 'phase_transcript_invalid');
    },
  );

  test.each(MODES.map((mode, index) => [mode, index] as const))(
    'rejects transcript whose %s phase has bootstrap-ack not first',
    (_mode, index) => {
      const payload = phaseTranscript();
      const events = [...payload.phases[index].events];
      [events[0], events[1]] = [events[1], events[0]];
      payload.phases[index].events = events;
      expectReject('PhaseTranscript', payload, 'phase_transcript_invalid');
    },
  );

  test.each(MODES.map((mode, index) => [mode, index] as const))(
    'rejects transcript whose %s phase has bootstrap-ack bound to a foreign binding',
    (_mode, index) => {
      const payload = phaseTranscript();
      const foreign = payload.phases[(index + 1) % MODES.length].binding;
      payload.phases[index].events = payload.phases[index].events.map((event) =>
        event.kind === 'bootstrap-ack' ? { ...event, binding: foreign } : event);
      expectReject('PhaseTranscript', payload, 'phase_transcript_invalid');
    },
  );

  test.each([
    ['phases null', { phases: null }],
    ['phases string', { phases: 'six' }],
    ['missing phases', {}],
    ['payload extra key', { ...phaseTranscript(), extra: true }],
    ['phase extra key', (() => { const value = phaseTranscript(); return { phases: value.phases.map((phase, index) => index === 0 ? { ...phase, extra: true } : phase) }; })()],
    ['disappearance string', (() => { const value = phaseTranscript(); value.phases[0].procDisappeared = 'true' as unknown as boolean; return value; })()],
  ])('PhaseTranscript rejects malformed schema/type: %s', (_name, payload) => {
    expectReject('PhaseTranscript', payload, 'phase_transcript_invalid');
  });

  test('binds kill to exact PID/starttime and rejects PID reuse', () => {
    expectPass('KillBinding', { expected: BINDING, observed: BINDING, signal: 9, owner: 'app.phraseman' });
    expectReject('KillBinding', {
      expected: BINDING,
      observed: { ...BINDING, starttime: '987654322' },
      signal: 9,
      owner: 'app.phraseman',
    }, 'kill_binding_invalid');
    expectReject('KillBinding', { expected: BINDING, observed: BINDING, signal: 15, owner: 'app.phraseman' }, 'kill_binding_invalid');
  });

  test.each([
    ['expected null', { expected: null, observed: BINDING, signal: 9, owner: 'app.phraseman' }],
    ['observed number', { expected: BINDING, observed: 7, signal: 9, owner: 'app.phraseman' }],
    ['signal string', { expected: BINDING, observed: BINDING, signal: '9', owner: 'app.phraseman' }],
    ['signal fraction', { expected: BINDING, observed: BINDING, signal: 9.5, owner: 'app.phraseman' }],
    ['signal null', { expected: BINDING, observed: BINDING, signal: null, owner: 'app.phraseman' }],
    ['owner number', { expected: BINDING, observed: BINDING, signal: 9, owner: 1 }],
    ['owner null', { expected: BINDING, observed: BINDING, signal: 9, owner: null }],
    ['missing owner', { expected: BINDING, observed: BINDING, signal: 9 }],
    ['extra key', { expected: BINDING, observed: BINDING, signal: 9, owner: 'app.phraseman', extra: true }],
    // зачем: .NET `$` пропускает завершающий \n — такие значения обязаны отсекаться.
    ['nonce with trailing newline', (() => {
      const binding = { ...BINDING, launchNonce: `${BINDING.launchNonce}\n` };
      return { expected: binding, observed: binding, signal: 9, owner: 'app.phraseman' };
    })()],
    ['starttime with trailing newline', (() => {
      const binding = { ...BINDING, starttime: `${BINDING.starttime}\n` };
      return { expected: binding, observed: binding, signal: 9, owner: 'app.phraseman' };
    })()],
  ])('KillBinding rejects coercive/malformed schema: %s', (_name, payload) => {
    expectReject('KillBinding', payload, 'kill_binding_invalid');
  });

  test('requires proc disappearance before a next launch', () => {
    expectPass('ProcDisappearance', { samples: [true, true, false], nextLaunchObserved: false });
    expectReject('ProcDisappearance', { samples: [true, true], nextLaunchObserved: true }, 'proc_disappearance_invalid');
  });

  test.each([
    ['samples null', { samples: null, nextLaunchObserved: false }],
    ['string sample', { samples: [true, 'false'], nextLaunchObserved: false }],
    ['numeric sample', { samples: [true, 0], nextLaunchObserved: false }],
    ['null sample', { samples: [true, null], nextLaunchObserved: false }],
    ['string next launch', { samples: [true, false], nextLaunchObserved: 'false' }],
    ['numeric next launch', { samples: [true, false], nextLaunchObserved: 0 }],
    ['null next launch', { samples: [true, false], nextLaunchObserved: null }],
    ['missing samples', { nextLaunchObserved: false }],
    ['missing next launch', { samples: [true, false] }],
    ['extra key', { samples: [true, false], nextLaunchObserved: false, extra: false }],
  ])('ProcDisappearance rejects coercive/malformed schema: %s', (_name, payload) => {
    expectReject('ProcDisappearance', payload, 'proc_disappearance_invalid');
  });

  test.each([
    '../escape.db',
    `${FAMILY_SELECTOR}-other`,
    FAMILY_SELECTOR.replace('accounts-v2/', 'accounts-v2/../'),
    `${FAMILY_SELECTOR}/child`,
  ])('rejects a non-exact family path: %s', (candidate) => {
    expectReject('FamilyPath', { selector: candidate, member: 'main' }, 'family_path_invalid');
  });

  test('accepts only the exact four family members and non-following regular facts', () => {
    for (const member of ['main', 'wal', 'shm', 'journal']) {
      expectPass('FamilyPath', { selector: FAMILY_SELECTOR, member });
    }
    expectPass('FileFact', { kind: 'regular', isReparsePoint: false, isSymlink: false, length: 32, sha256: 'a'.repeat(64) });
    expectReject('FileFact', { kind: 'regular', isReparsePoint: false, isSymlink: false, length: 0, sha256: 'a'.repeat(64) }, 'file_fact_invalid');
    expectReject('FileFact', { kind: 'regular', isReparsePoint: true, isSymlink: false, length: 32, sha256: 'a'.repeat(64) }, 'file_fact_invalid');
  });

  test.each([
    ['kind number', { kind: 1, isReparsePoint: false, isSymlink: false, length: 32, sha256: 'a'.repeat(64) }],
    ['kind null', { kind: null, isReparsePoint: false, isSymlink: false, length: 32, sha256: 'a'.repeat(64) }],
    ['missing kind', { isReparsePoint: false, isSymlink: false, length: 32, sha256: 'a'.repeat(64) }],
    ['boolean string', { kind: 'regular', isReparsePoint: 'false', isSymlink: false, length: 32, sha256: 'a'.repeat(64) }],
    ['boolean number', { kind: 'regular', isReparsePoint: false, isSymlink: 0, length: 32, sha256: 'a'.repeat(64) }],
    ['reparse null', { kind: 'regular', isReparsePoint: null, isSymlink: false, length: 32, sha256: 'a'.repeat(64) }],
    ['missing symlink', { kind: 'regular', isReparsePoint: false, length: 32, sha256: 'a'.repeat(64) }],
    ['length string', { kind: 'regular', isReparsePoint: false, isSymlink: false, length: '32', sha256: 'a'.repeat(64) }],
    ['length fraction', { kind: 'regular', isReparsePoint: false, isSymlink: false, length: 32.5, sha256: 'a'.repeat(64) }],
    ['hash null', { kind: 'regular', isReparsePoint: false, isSymlink: false, length: 32, sha256: null }],
    ['hash number', { kind: 'regular', isReparsePoint: false, isSymlink: false, length: 32, sha256: 7 }],
    ['missing hash', { kind: 'regular', isReparsePoint: false, isSymlink: false, length: 32 }],
    ['extra key', { kind: 'regular', isReparsePoint: false, isSymlink: false, length: 32, sha256: 'a'.repeat(64), extra: true }],
  ])('FileFact rejects coercive/malformed schema: %s', (_name, payload) => {
    expectReject('FileFact', payload, 'file_fact_invalid');
  });

  test('requires committed/dirty/integrity reads before checkpoint', () => {
    expectPass('RecoveryOrdering', {
      events: ['committed-read', 'dirty-absent-read', 'quick-check', 'cipher-integrity', 'checkpoint', 'committed-reread'],
    });
    expectReject('RecoveryOrdering', {
      events: ['checkpoint', 'committed-read', 'dirty-absent-read', 'quick-check', 'cipher-integrity', 'committed-reread'],
    }, 'checkpoint_order_invalid');
  });

  test('models exact four-member success deletion and complete failure preservation', () => {
    expectPass('CleanupOutcome', successfulCleanup());
    expectPass('CleanupOutcome', failureCleanup());
  });

  test.each([
    ['success boolean string', { ...successfulCleanup(), packageRestored: 'true' }],
    ['success member missing', { ...successfulCleanup(), familyMembers: successfulCleanup().familyMembers.slice(0, 3) }],
    ['success wrong member', { ...successfulCleanup(), familyMembers: successfulCleanup().familyMembers.map((fact, index) => index === 3 ? { member: 'other', absent: true } : fact) }],
    ['success member extra', { ...successfulCleanup(), familyMembers: successfulCleanup().familyMembers.map((fact, index) => index === 0 ? { ...fact, extra: true } : fact) }],
    ['success partial delete string', { ...successfulCleanup(), partialDelete: 'false' }],
    ['success package restored number', { ...successfulCleanup(), packageRestored: 1 }],
    ['success source recaptured null', { ...successfulCleanup(), sourceRecaptured: null }],
    ['success native recaptured false', { ...successfulCleanup(), nativeRecaptured: false }],
    ['success APK recaptured string', { ...successfulCleanup(), apkRecaptured: 'true' }],
    ['success temp cleanup number', { ...successfulCleanup(), currentTempCleanupComplete: 1 }],
    ['success missing recapture', (() => { const value = { ...successfulCleanup() }; delete (value as Partial<typeof value>).apkRecaptured; return value; })()],
    ['success extra key', { ...successfulCleanup(), extra: true }],
    ['failure boolean string', { ...failureCleanup(), partialDelete: 'false' }],
    ['failure member not preserved', { ...failureCleanup(), familyMembers: failureCleanup().familyMembers.map((fact, index) => index === 2 ? { ...fact, preserved: false } : fact) }],
    ['failure extra key', { ...failureCleanup(), packageRestored: true }],
  ])('CleanupOutcome rejects coercive/incomplete proof: %s', (_name, payload) => {
    expectReject('CleanupOutcome', payload, 'cleanup_preservation_invalid');
  });

  test('publishes PASS only from a strictly typed accepted aggregate and validated successful cleanup', () => {
    expectPass('EvidencePublication', publication());
  });

  test('publishes a failure with a matching partial phase transcript', () => {
    const aggregate = acceptedAggregate();
    aggregate.accepted = false;
    aggregate.phaseCount = 2;
    aggregate.phases = aggregate.phases.slice(0, 2);
    const transcript = phaseTranscript();
    transcript.phases = transcript.phases.slice(0, 2);
    aggregate.transcriptSha256 = transcriptSha256(transcript);
    expectPass('EvidencePublication', publication(aggregate, failureCleanup(), transcript, 'failure'));
  });

  test.each([
    ['aggregate phase count does not match phases', (() => {
      const aggregate = acceptedAggregate();
      aggregate.accepted = false;
      aggregate.phaseCount = 2;
      aggregate.phases = aggregate.phases.slice(0, 1);
      const transcript = phaseTranscript();
      transcript.phases = transcript.phases.slice(0, 2);
      return publication(aggregate, failureCleanup(), transcript, 'failure');
    })()],
    ['transcript phase count does not match aggregate', (() => {
      const aggregate = acceptedAggregate();
      aggregate.accepted = false;
      aggregate.phaseCount = 2;
      aggregate.phases = aggregate.phases.slice(0, 2);
      const transcript = phaseTranscript();
      transcript.phases = transcript.phases.slice(0, 1);
      return publication(aggregate, failureCleanup(), transcript, 'failure');
    })()],
    ['failure phase count exceeds campaign', (() => {
      const aggregate = acceptedAggregate();
      aggregate.accepted = false;
      aggregate.phaseCount = 7;
      return publication(aggregate, failureCleanup(), phaseTranscript(), 'failure');
    })()],
    ['partial transcript has a malformed phase', (() => {
      const aggregate = acceptedAggregate();
      aggregate.accepted = false;
      aggregate.phaseCount = 1;
      aggregate.phases = aggregate.phases.slice(0, 1);
      const transcript = phaseTranscript();
      transcript.phases = transcript.phases.slice(0, 1);
      transcript.phases[0].events = [];
      return publication(aggregate, failureCleanup(), transcript, 'failure');
    })()],
  ])('rejects inconsistent partial failure evidence: %s', (_name, payload) => {
    expectReject('EvidencePublication', payload, 'evidence_publication_invalid');
  });

  test.each([
    ['transcript missing', (() => { const value = publication(); delete value.transcript; return value; })()],
    ['transcript of another campaign', publication(acceptedAggregate(), successfulCleanup(), (() => {
      const value = phaseTranscript();
      value.phases[5].binding = { ...value.phases[5].binding, launchNonce: 'e'.repeat(32) };
      value.phases[5].events = value.phases[5].events.map((event) => ({ ...event, binding: value.phases[5].binding }));
      return value;
    })())],
    ['transcript hash of a different transcript', publication(aggregateWith('transcriptSha256', 'd'.repeat(64)))],
    ['transcript invalid but hash matches', (() => {
      const value = phaseTranscript();
      swapKinds(value, 1, 'baseline-bound', 'launch-sent');
      return publication(aggregateWith('transcriptSha256', transcriptSha256(value)), successfulCleanup(), value);
    })()],
    ['aggregate phase pid differs from transcript', (() => {
      const value = phaseTranscript();
      const rebound = { ...value.phases[2].binding, pid: 9999 };
      value.phases[2].binding = rebound;
      value.phases[2].events = value.phases[2].events.map((event) => ({ ...event, binding: rebound }));
      return publication(aggregateWith('transcriptSha256', transcriptSha256(value)), successfulCleanup(), value);
    })()],
    ['aggregate starttime differs from transcript', (() => {
      const value = phaseTranscript();
      const rebound = { ...value.phases[0].binding, starttime: '5' };
      value.phases[0].binding = rebound;
      value.phases[0].events = value.phases[0].events.map((event) => ({ ...event, binding: rebound }));
      return publication(aggregateWith('transcriptSha256', transcriptSha256(value)), successfulCleanup(), value);
    })()],
    ['aggregate nonce hash differs from transcript', (() => {
      const value = phaseTranscript();
      const rebound = { ...value.phases[3].binding, launchNonce: '8'.repeat(32) };
      value.phases[3].binding = rebound;
      value.phases[3].events = value.phases[3].events.map((event) => ({ ...event, binding: rebound }));
      return publication(aggregateWith('transcriptSha256', transcriptSha256(value)), successfulCleanup(), value);
    })()],
    ['aggregate runtime hash differs from transcript', (() => {
      const value = phaseTranscript();
      const rebound = { ...value.phases[4].binding, runtimeIdentity: '9'.repeat(32) };
      value.phases[4].binding = rebound;
      value.phases[4].events = value.phases[4].events.map((event) => ({ ...event, binding: rebound }));
      return publication(aggregateWith('transcriptSha256', transcriptSha256(value)), successfulCleanup(), value);
    })()],
  ])('EvidencePublication binds aggregate to the transcript: rejects %s', (_name, payload) => {
    expectReject('EvidencePublication', payload, 'evidence_publication_invalid');
  });

  test.each([
    ['accepted string', publication({ ...acceptedAggregate(), accepted: 'true' })],
    ['phase count string', publication({ ...acceptedAggregate(), phaseCount: '6' })],
    ['phase count fraction', publication({ ...acceptedAggregate(), phaseCount: 5.5 })],
    ['checkpoint number', publication({ ...acceptedAggregate(), checkpointAfterAuthoritativeRead: 1 })],
    ['canary null', publication({ ...acceptedAggregate(), plaintextCanaryAbsent: null })],
    ['missing aggregate field', publication({ accepted: true, phaseCount: 6, checkpointAfterAuthoritativeRead: true })],
    ['aggregate extra key', publication({ ...acceptedAggregate(), extra: true })],
    ['invalid cleanup', publication(acceptedAggregate(), { ...successfulCleanup(), apkRecaptured: false })],
    ['status null', publication(acceptedAggregate(), successfulCleanup(), phaseTranscript(), null)],
    ['payload extra key', { ...publication(), extra: true }],
  ])('EvidencePublication rejects coercive/unvalidated proof: %s', (_name, payload) => {
    expectReject('EvidencePublication', payload, 'evidence_publication_invalid');
  });

  test.each(section8Mutations())('EvidencePublication PASS requires packet §8 fact: %s', (_name, aggregate) => {
    expectReject('EvidencePublication', publication(aggregate), 'evidence_publication_invalid');
  });

  test('publishes PASS for an absent pre-dirty WAL baseline with zero pre frames', () => {
    expectPass('EvidencePublication', publication({
      ...acceptedAggregate(),
      dirtyWalPreFrameCount: 0,
      dirtyWalPostFrameCount: 3,
      dirtyWalBaselineFact: { kind: 'absent', length: 0, sha256: null },
    }));
  });

  test.each(remainingSection8Mutations())('EvidencePublication PASS requires remaining §8 fact: %s', (_name, aggregate) => {
    expectReject('EvidencePublication', publication(aggregate), 'evidence_publication_invalid');
  });

  test('accepts a structurally valid absent-baseline dirty WAL delta', () => {
    const result = expectPass('WalDelta', walPayload(undefined, buildWal([0, 0])));
    expect(result.deltaFrameCount).toBe(2);
    expect(result.allDeltaCommitMarkersZero).toBe(true);
    expect(result.structurallyComplete).toBe(true);
    expect(result.checksumsValid).toBe(true);
  });

  test.each([
    ['baseline kind number', { ...walPayload(undefined, buildWal([0])), baselineKind: 1 }],
    ['baseline bytes null', { ...walPayload(undefined, buildWal([0])), baselineBase64: null }],
    ['after kind missing', (() => { const value = { ...walPayload(undefined, buildWal([0])) }; delete (value as Partial<typeof value>).afterKind; return value; })()],
    ['after bytes number', { ...walPayload(undefined, buildWal([0])), afterBase64: 7 }],
    ['payload extra key', { ...walPayload(undefined, buildWal([0])), extra: true }],
  ])('WalDelta rejects malformed proof schema/type: %s', (_name, payload) => {
    expectReject('WalDelta', payload, 'wal_structure_invalid');
  });

  test('accepts page size 65536 as a literal WAL header value', () => {
    expectPass('WalDelta', walPayload(undefined, buildWal([0], 65536)));
  });

  test('accepts magic 0x377f0682 with little-endian checksum words', () => {
    expectPass('WalDelta', walPayload(undefined, buildWal([0, 0], 512, 17, 0x377f0682)));
  });

  test('rejects checksum corruption under magic 0x377f0682', () => {
    const corrupted = buildWal([0], 512, 17, 0x377f0682);
    corrupted[corrupted.length - 1] ^= 0xff;
    expectReject('WalDelta', walPayload(undefined, corrupted), 'wal_checksum_invalid');
  });

  test('rejects transaction-local rows with an unchanged WAL', () => {
    const baseline = buildWal([5]);
    expectReject('WalDelta', walPayload(baseline, baseline), 'wal_delta_missing');
  });

  test('accepts a structurally valid appended delta that retains the baseline prefix and salts', () => {
    const after = buildWal([5, 0]);
    const baseline = after.subarray(0, 32 + 24 + 512);
    const result = expectPass('WalDelta', walPayload(baseline, after));
    expect(result.deltaFrameCount).toBe(1);
    expect(result.prefixMatch).toBe(true);
    expect(result.saltsMatch).toBe(true);
  });

  test('rejects a new dirty delta containing a non-zero commit marker', () => {
    expectReject('WalDelta', walPayload(undefined, buildWal([0, 7])), 'wal_delta_commit_marker_invalid');
  });

  test('rejects a truncated final frame', () => {
    const truncated = buildWal([0]).subarray(0, buildWal([0]).length - 1);
    expectReject('WalDelta', walPayload(undefined, truncated), 'wal_structure_invalid');
  });

  test('rejects invalid magic and wrong format version', () => {
    const badMagic = Buffer.from(buildWal([0]));
    badMagic.writeUInt32BE(0x12345678, 0);
    expectReject('WalDelta', walPayload(undefined, badMagic), 'wal_header_invalid');
    const badVersion = Buffer.from(buildWal([0]));
    badVersion.writeUInt32BE(3007001, 4);
    expectReject('WalDelta', walPayload(undefined, badVersion), 'wal_header_invalid');
  });

  test.each([1, 256, 513, 131072])('rejects invalid WAL page size %i', (pageSize) => {
    const bytes = Buffer.from(buildWal([0]));
    bytes.writeUInt32BE(pageSize, 8);
    expectReject('WalDelta', walPayload(undefined, bytes), 'wal_header_invalid');
  });

  test('rejects invalid salt and checksum mutations', () => {
    const badSalt = Buffer.from(buildWal([0]));
    badSalt.writeUInt32BE(0xdeadbeef, 32 + 8);
    expectReject('WalDelta', walPayload(undefined, badSalt), 'wal_salt_invalid');
    const badChecksum = Buffer.from(buildWal([0]));
    badChecksum[badChecksum.length - 1] ^= 0xff;
    expectReject('WalDelta', walPayload(undefined, badChecksum), 'wal_checksum_invalid');
  });

  test('rejects after-bytes that do not retain the bound baseline prefix', () => {
    const baseline = buildWal([5], 512, 17);
    const after = buildWal([5, 0], 512, 18);
    expectReject('WalDelta', walPayload(baseline, after), 'wal_prefix_invalid');
  });

  test.each([
    ['family', { family: `${FAMILY_SELECTOR}-foreign` }],
    ['pid', { pid: BINDING.pid + 1 }],
    ['starttime', { starttime: '1' }],
    ['runtime', { runtimeIdentity: '0'.repeat(32) }],
    ['nonce', { launchNonce: 'f'.repeat(32) }],
  ] as const)('rejects structurally valid WAL delta bound to a different %s', (_name, mutation) => {
    const after = buildWal([5, 0]);
    const baseline = after.subarray(0, 32 + 24 + 512);
    const payload = walPayload(baseline, after);
    payload.afterBinding = { ...BINDING, ...mutation };
    expectReject('WalDelta', payload, 'wal_binding_invalid');
  });
});
