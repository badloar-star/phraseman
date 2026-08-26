import fs from 'fs';
import path from 'path';

const read = (name: string): string => fs.readFileSync(path.join(__dirname, name), 'utf8');

describe('critical admin write boundaries', () => {
  // зачем (владелец, 2026-08-03): App Check для админки ДОЛЖЕН оставаться выключенным,
  // пока владелец сам явно не разрешит его включить. Ключ reCAPTCHA Enterprise в Google
  // не заведён (шаг 1 APP_CHECK_ENABLEMENT_PLAN не выполнен), поэтому любой энфорс рубит
  // ВСЕ ~30 админских функций кодом unauthenticated — инцидент «Plus не выдан».
  // Этот тест — сторож: он краснеет, если кто-то снова захардкодит enforce.
  it('keeps admin App Check OFF by default and never hardcodes enforcement', () => {
    // Смотрим на КОД, а не на текст (в комментарии выше по файлу фраза
    // `enforceAppCheck: true` упоминается как описание починенного инцидента).
    const source = read('callable_options.ts')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/[^\n]*/g, '');
    expect(source).not.toMatch(/enforceAppCheck:\s*true/);
    expect(source).toContain('ENFORCE_APP_CHECK_ADMIN');

    const options = require('./callable_options') as {
      ADMIN_SENSITIVE_WRITE_OPTIONS?: Readonly<{ region: string; enforceAppCheck: boolean }>;
      requireAdminAppCheck?: (request: { app?: unknown }) => void;
    };

    expect(options.ADMIN_SENSITIVE_WRITE_OPTIONS).toEqual({
      region: 'us-central1',
      enforceAppCheck: false,
    });
    const requireAdminAppCheck = options.requireAdminAppCheck;
    expect(typeof requireAdminAppCheck).toBe('function');
    if (!requireAdminAppCheck) return;
    // Пока флаг выключен — гард обязан пропускать запрос без App Check-токена,
    // иначе выключение энфорса не работает (ровно этим и падала выдача Plus).
    expect(() => requireAdminAppCheck({})).not.toThrow();
    expect(() => requireAdminAppCheck({ app: {} })).not.toThrow();
  });

  it('keeps every Content Studio callable on the owner-controlled admin App Check flag', () => {
    for (const file of ['admin_content_stages.ts', 'admin_content_studio_callables.ts', 'admin_content_studio_authoring.ts']) {
      const source = read(file);
      expect(source).toContain('ENFORCE_APP_CHECK_ADMIN');
      expect(source).not.toContain('ENFORCE_APP_CHECK_CONTENT_STUDIO');
    }
  });

  it('keeps every Gmail support admin callable isolated from the global App Check flag', () => {
    const source = read('support_inbox.ts');
    expect(source).toContain("import { ADMIN_SENSITIVE_WRITE_OPTIONS, requireAdminAppCheck } from './callable_options';");
    expect(source).not.toContain('enforceAppCheck: ENFORCE_APP_CHECK');
    expect(source).toMatch(/function requireSupportPermission[\s\S]*?requireAdminAppCheck\(request\);/);
    const callableNames = [...source.matchAll(/export const (adminSupport\w+) = onCall\(/g)].map((match) => match[1]);
    expect(callableNames.length).toBeGreaterThanOrEqual(10);
    for (const name of callableNames) {
      const start = source.indexOf(`export const ${name} = onCall(`);
      const next = source.indexOf('\nexport const ', start + 1);
      expect(source.slice(start, next > start ? next : undefined)).toContain('ADMIN_SENSITIVE_WRITE_OPTIONS');
    }
  });

  it('isolates feedback admin reads and AI summaries from the global App Check flag', () => {
    for (const file of ['feedback_entries.ts', 'feedback_summary.ts']) {
      const source = read(file);
      expect(source).toContain('ENFORCE_APP_CHECK_ADMIN');
    }
    const entries = read('feedback_entries.ts');
    const submitStart = entries.indexOf('export const submitFeedbackEntry = onCall(');
    const listStart = entries.indexOf('export const adminListFeedbackEntries = onCall(');
    expect(entries.slice(submitStart, listStart)).toContain('enforceAppCheck: ENFORCE_APP_CHECK');
    expect(entries.slice(listStart)).toContain('enforceAppCheck: ENFORCE_APP_CHECK_ADMIN');
    expect(read('feedback_summary.ts')).toContain('enforceAppCheck: ENFORCE_APP_CHECK_ADMIN');
  });

  // зачем: раньше здесь были два теста про поэтапный раскат — «админка не
  // наследует глобальный флаг» и «включается отдельной переменной». Механики
  // раската больше НЕТ: владелец 2026-08-17 запломбировал App Check целиком
  // («убрать отовсюду и больше никогда не вспоминать»), флаги захардкожены в
  // false и окружение не читают. Тесты заменены на проверку самой пломбы,
  // потому что сторожили отменённое правило.
  // Полный запрет и его история: CLAUDE.md «APP CHECK ЗАПЛОМБИРОВАН НАВСЕГДА».
  it('никакая переменная окружения не может вернуть энфорс админке', () => {
    jest.resetModules();
    const previousGlobal = process.env.ENFORCE_APP_CHECK;
    const previousAdmin = process.env.ENFORCE_APP_CHECK_ADMIN;
    process.env.ENFORCE_APP_CHECK = 'true';
    process.env.ENFORCE_APP_CHECK_ADMIN = 'true';
    try {
      const mod = require('./callable_options') as {
        ADMIN_SENSITIVE_WRITE_OPTIONS?: Readonly<{ enforceAppCheck: boolean }>;
        ENFORCE_APP_CHECK?: boolean;
        ENFORCE_APP_CHECK_ADMIN?: boolean;
        requireAdminAppCheck?: (request: { app?: unknown }) => void;
      };
      // Обе переменные выставлены в 'true' — и обе игнорируются.
      expect(mod.ENFORCE_APP_CHECK).toBe(false);
      expect(mod.ENFORCE_APP_CHECK_ADMIN).toBe(false);
      expect(mod.ADMIN_SENSITIVE_WRITE_OPTIONS?.enforceAppCheck).toBe(false);
      // Гард тоже молчит: иначе выключенный энфорс ничего не давал бы —
      // функция всё равно падала бы здесь (ровно так и было в инциденте).
      expect(() => mod.requireAdminAppCheck?.({})).not.toThrow();
    } finally {
      if (previousGlobal === undefined) delete process.env.ENFORCE_APP_CHECK;
      else process.env.ENFORCE_APP_CHECK = previousGlobal;
      if (previousAdmin === undefined) delete process.env.ENFORCE_APP_CHECK_ADMIN;
      else process.env.ENFORCE_APP_CHECK_ADMIN = previousAdmin;
      jest.resetModules();
    }
  });

  it('админские записи по-прежнему защищены claim admin, а не App Check', () => {
    jest.resetModules();
    const previous = process.env.ENFORCE_APP_CHECK_ADMIN;
    process.env.ENFORCE_APP_CHECK_ADMIN = 'true';
    try {
      const enabled = require('./callable_options') as {
        ADMIN_SENSITIVE_WRITE_OPTIONS?: Readonly<{ region: string; enforceAppCheck: boolean }>;
        requireAdminAppCheck?: (request: { app?: unknown }) => void;
      };
      expect(enabled.ADMIN_SENSITIVE_WRITE_OPTIONS?.enforceAppCheck).toBe(false);
      expect(enabled.ADMIN_SENSITIVE_WRITE_OPTIONS?.region).toBe('us-central1');
      // Гард не бросает ни без app, ни с ним — пломба, а не «мягкий режим».
      expect(() => enabled.requireAdminAppCheck?.({})).not.toThrow();
      expect(() => enabled.requireAdminAppCheck?.({ app: {} })).not.toThrow();
    } finally {
      if (previous === undefined) delete process.env.ENFORCE_APP_CHECK_ADMIN;
      else process.env.ENFORCE_APP_CHECK_ADMIN = previous;
      jest.resetModules();
    }
  });

  it.each([
    ['admin_access_controls.ts', ['adminGrantAccess', 'adminSetUserBan']],
    ['admin_grant.ts', ['adminGrantReward', 'adminSetShardBalance']],
    ['admin_remote_config.ts', ['adminPublishRemoteConfig']],
    ['admin_referrals.ts', [
      'adminRevokeReferralAttribution',
      'adminSetSpinWeights',
      'adminSetReferralRouletteEnabled',
      'adminSetReferralRouletteEmergencyStop',
    ]],
    ['admin_referral_purchase_repair.ts', [
      'adminRepairPendingReferralPurchase',
      'adminResumePendingReferralPurchaseRepair',
    ]],
  ] as const)('%s uses the hard option and handler guard for every sensitive writer', (file, names) => {
    const source = read(file);
    for (const name of names) {
      const start = source.indexOf(`export const ${name} = onCall(`);
      expect(start).toBeGreaterThan(-1);
      const next = source.indexOf('\nexport const ', start + 1);
      const body = source.slice(start, next > start ? next : undefined);
      expect(body).toContain('ADMIN_SENSITIVE_WRITE_OPTIONS');
      const guard = body.indexOf('requireAdminAppCheck(request);');
      expect(guard).toBeGreaterThan(-1);
      const firestore = body.search(/admin\.firestore\(\)|\.collection\(/);
      if (firestore >= 0) expect(guard).toBeLessThan(firestore);
    }
  });

  it('requires revision and command metadata for every specialized referral config write', () => {
    const referrals = require('./admin_referrals') as {
      normalizeReferralConfigCommand?: (data: unknown) => {
        expectedRevision: number;
        reason: string;
        requestId: string;
        idempotencyKey: string;
      };
    };
    expect(typeof referrals.normalizeReferralConfigCommand).toBe('function');
    if (!referrals.normalizeReferralConfigCommand) return;
    const valid = {
      expectedRevision: 7,
      reason: 'Reviewed referral configuration change',
      requestId: 'request-7',
      idempotencyKey: 'operation-7',
    };
    expect(referrals.normalizeReferralConfigCommand(valid)).toEqual(valid);
    for (const invalid of [
      { ...valid, expectedRevision: -1 },
      { ...valid, expectedRevision: 1.5 },
      { ...valid, expectedRevision: undefined },
      { ...valid, reason: '' },
      { ...valid, requestId: '' },
      { ...valid, idempotencyKey: '' },
    ]) {
      // Earlier tests reload firebase-functions with jest.resetModules(), so
      // constructor identity is not stable across the two module instances.
      // The callable error code is the authoritative boundary contract.
      try {
        referrals.normalizeReferralConfigCommand!(invalid);
        throw new Error('expected normalizeReferralConfigCommand to reject invalid metadata');
      } catch (error) {
        expect(error).toMatchObject({ code: 'invalid-argument' });
      }
    }
  });

  it('makes all three specialized referral config writers transactional CAS commands', () => {
    const source = read('admin_referrals.ts');
    for (const name of [
      'adminSetSpinWeights',
      'adminSetReferralRouletteEnabled',
      'adminSetReferralRouletteEmergencyStop',
    ]) {
      const start = source.indexOf(`export const ${name} = onCall(`);
      const next = source.indexOf('\nexport const ', start + 1);
      const body = source.slice(start, next > start ? next : undefined);
      expect(body).toContain("hasPermission(role, 'application.config.write')");
      expect(body).toContain('normalizeReferralConfigCommand(request.data)');
      expect(body).toContain('db.runTransaction(async (tx) =>');
      expect(body).toContain('currentRevision !== command.expectedRevision');
      expect(body).toContain("new HttpsError('aborted', 'remote_config_revision_conflict')");
      expect(body).toMatch(/(?:const revision =|revision:) currentRevision \+ 1/);
      expect(body).toContain("db.collection('admin_log').doc()");
      expect(body).toContain("db.collection('admin_command_operations')");
      expect(body).toContain('createAuditRecord({');
      expect(body).toContain('requestFingerprint');
      expect(body).toContain('replayed: true');
    }
  });
});
