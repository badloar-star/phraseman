const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { pathToFileURL } = require('url');

const source = fs.readFileSync(
  path.join(__dirname, '..', 'scripts', 'upload_plan_audio_to_storage.mjs'),
  'utf8',
);

const uploadCoreUrl = pathToFileURL(
  path.join(__dirname, '..', 'scripts', 'plan_audio_storage_upload_core.mjs'),
).href;

function runUploadCore(sourceCode: string) {
  const result = spawnSync(
    process.execPath,
    ['--input-type=module', '-e', sourceCode],
    { cwd: path.join(__dirname, '..'), encoding: 'utf8' },
  );
  if (result.status !== 0) {
    throw new Error(`upload core subprocess failed:\n${result.stderr || result.stdout}`);
  }
  return JSON.parse(result.stdout);
}

test('forced upload reuses an existing Firebase download token', () => {
  const lookup = 'const existingToken = await objectExists(objectPath);';
  const skipBranch = 'if (!FORCE && existingToken) {';
  const tokenSelection =
    "const token = typeof existingToken === 'string' ? existingToken : crypto.randomUUID();";

  expect(source).toContain(lookup);
  expect(source).toContain(skipBranch);
  expect(source).toContain(tokenSelection);
  expect(source.indexOf(lookup)).toBeLessThan(source.indexOf(skipBranch));
  expect(source.indexOf(lookup)).toBeLessThan(source.indexOf(tokenSelection));
});

test('upload accepts an already minted short-lived Firebase access token', () => {
  expect(source).toContain(
    "let accessToken = String(process.env.FB_TOKEN ?? '').trim() || null;",
  );
  expect(source).toContain('let tokenMintedAt = accessToken ? Date.now() : 0;');
});

test('object metadata lookup treats only 404 as missing and fails closed on transient errors', () => {
  const result = runUploadCore(`
    import { readExistingDownloadToken } from ${JSON.stringify(uploadCoreUrl)};
    const response = (status, body) => ({
      status,
      ok: status >= 200 && status < 300,
      text: async () => body,
      json: async () => JSON.parse(body),
    });
    const missing = await readExistingDownloadToken({
      objectPath: 'plan-audio/test/day/clip.mp3',
      bucket: 'test-bucket',
      accessToken: 'token',
      fetchImpl: async () => response(404, 'not found'),
    });
    let transientError = null;
    try {
      await readExistingDownloadToken({
        objectPath: 'plan-audio/test/day/clip.mp3',
        bucket: 'test-bucket',
        accessToken: 'token',
        fetchImpl: async () => response(503, 'temporarily unavailable'),
      });
    } catch (error) {
      transientError = error.message;
    }
    console.log(JSON.stringify({ missing, transientError }));
  `);

  expect(result.missing).toBeNull();
  expect(result.transientError).toBe(
    'object metadata 503: temporarily unavailable',
  );
});

test('existing object without a Firebase download token fails closed instead of inventing a URL token', () => {
  const result = runUploadCore(`
    import { readExistingDownloadToken } from ${JSON.stringify(uploadCoreUrl)};
    let errorMessage = null;
    try {
      await readExistingDownloadToken({
        objectPath: 'plan-audio/test/day/tokenless.mp3',
        bucket: 'test-bucket',
        accessToken: 'token',
        fetchImpl: async () => ({
          status: 200,
          ok: true,
          text: async () => '',
          json: async () => ({ metadata: {} }),
        }),
      });
    } catch (error) {
      errorMessage = error.message;
    }
    console.log(JSON.stringify({ errorMessage }));
  `);

  expect(result.errorMessage).toBe(
    'object metadata missing firebaseStorageDownloadTokens: plan-audio/test/day/tokenless.mp3',
  );
});

test('object overwrite uses one atomic GCS JSON multipart request with media and metadata', () => {
  const result = runUploadCore(`
    import { uploadObjectMultipart } from ${JSON.stringify(uploadCoreUrl)};
    const calls = [];
    await uploadObjectMultipart({
      objectPath: 'plan-audio/test/day/clip.mp3',
      bucket: 'test-bucket',
      accessToken: 'access-token',
      downloadToken: 'stable-download-token',
      data: Buffer.from([0x00, 0x7f, 0x80, 0xff]),
      fetchImpl: async (url, init) => {
        calls.push({
          url,
          method: init.method,
          headers: init.headers,
          bodyBase64: Buffer.from(init.body).toString('base64'),
        });
        return { ok: true, status: 200, text: async () => '' };
      },
    });
    console.log(JSON.stringify(calls));
  `);

  expect(result).toHaveLength(1);
  expect(result[0].method).toBe('POST');
  expect(result[0].url).toBe(
    'https://storage.googleapis.com/upload/storage/v1/b/test-bucket/o?uploadType=multipart',
  );
  expect(result[0].headers.Authorization).toBe('Bearer access-token');
  expect(result[0].headers['Content-Type']).toMatch(
    /^multipart\/related; boundary=[A-Za-z0-9_-]+$/,
  );

  const boundary = result[0].headers['Content-Type'].split('boundary=')[1];
  const body = Buffer.from(result[0].bodyBase64, 'base64');
  const bodyText = body.toString('latin1');
  expect(bodyText).toContain(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n`);
  expect(bodyText).toContain('"name":"plan-audio/test/day/clip.mp3"');
  expect(bodyText).toContain('"contentType":"audio/mpeg"');
  expect(bodyText).toContain('"cacheControl":"public, max-age=31536000, immutable"');
  expect(bodyText).toContain('"firebaseStorageDownloadTokens":"stable-download-token"');
  expect(bodyText).toContain(`\r\n--${boundary}\r\nContent-Type: audio/mpeg\r\n\r\n`);
  const expectedSuffix = Buffer.concat([
    Buffer.from([0x00, 0x7f, 0x80, 0xff]),
    Buffer.from(`\r\n--${boundary}--\r\n`, 'utf8'),
  ]);
  expect(body.subarray(body.length - expectedSuffix.length)).toEqual(expectedSuffix);
});

test('successful upload URL keeps the Firebase token and versions the exact uploaded bytes', () => {
  const result = runUploadCore(`
    import { versionedDownloadUrl } from ${JSON.stringify(uploadCoreUrl)};
    const baseUrl = 'https://firebasestorage.googleapis.com/v0/b/test/o/clip.mp3?alt=media&token=stable-download-token';
    const first = versionedDownloadUrl(baseUrl, Buffer.from('first encoded mp3'));
    const firstAgain = versionedDownloadUrl(baseUrl, Buffer.from('first encoded mp3'));
    const second = versionedDownloadUrl(baseUrl, Buffer.from('second encoded mp3'));
    console.log(JSON.stringify({ first, firstAgain, second }));
  `);

  expect(result.first).toBe(result.firstAgain);
  expect(result.first).toContain('&token=stable-download-token');
  expect(result.first).toMatch(/&v=[a-f0-9]{12}$/);
  expect(result.second).toContain('&token=stable-download-token');
  expect(result.second).toMatch(/&v=[a-f0-9]{12}$/);
  expect(result.second).not.toBe(result.first);
});

test('skipped upload preserves only the matching existing versioned map URL', () => {
  const result = runUploadCore(`
    import { reuseExistingVersionedMapUrl } from ${JSON.stringify(uploadCoreUrl)};
    const baseUrl = 'https://firebasestorage.googleapis.com/v0/b/test/o/clip.mp3?alt=media&token=stable-download-token';
    const existing = baseUrl + '&v=0123456789ab';
    console.log(JSON.stringify({
      matching: reuseExistingVersionedMapUrl(existing, baseUrl),
      unversioned: reuseExistingVersionedMapUrl(baseUrl, baseUrl),
      wrongToken: reuseExistingVersionedMapUrl(
        'https://firebasestorage.googleapis.com/v0/b/test/o/clip.mp3?alt=media&token=other-token&v=0123456789ab',
        baseUrl,
      ),
    }));
  `);

  expect(result.matching).toBe(
    'https://firebasestorage.googleapis.com/v0/b/test/o/clip.mp3?alt=media&token=stable-download-token&v=0123456789ab',
  );
  expect(result.unversioned).toBeNull();
  expect(result.wrongToken).toBeNull();
});

test('partial upload failure marks the process unsuccessful after preserving the partial map', () => {
  const result = runUploadCore(`
    import { setUploadFailureExitCode } from ${JSON.stringify(uploadCoreUrl)};
    const failedProcess = { exitCode: 0 };
    const successfulProcess = { exitCode: 0 };
    setUploadFailureExitCode(2, failedProcess);
    setUploadFailureExitCode(0, successfulProcess);
    console.log(JSON.stringify({ failed: failedProcess.exitCode, successful: successfulProcess.exitCode }));
  `);

  expect(result).toEqual({ failed: 1, successful: 0 });
  expect(source.indexOf('fs.writeFileSync(OUT_MAP_TS, ts')).toBeLessThan(
    source.indexOf('setUploadFailureExitCode(failed, process)'),
  );
});

test('full run preserves only failed clip URLs while pruning obsolete map entries', () => {
  const result = runUploadCore(`
    import {
      mergePlanAudioUrlEntries,
      setUploadFailureExitCode,
    } from ${JSON.stringify(uploadCoreUrl)};
    const failedUrl = 'https://firebasestorage.googleapis.com/v0/b/test/o/failed.mp3?alt=media&token=stable&v=0123456789ab';
    const merged = mergePlanAudioUrlEntries({
      existingEntries: new Map([
        ['failed-clip', failedUrl],
        ['obsolete-clip', 'https://example.invalid/obsolete.mp3?v=aaaaaaaaaaaa'],
      ]),
      completedEntries: [
        ['successful-clip', 'https://example.invalid/current.mp3?v=bbbbbbbbbbbb'],
      ],
      failedLocalUris: new Set(['failed-clip']),
      partialUpload: false,
    });
    const processLike = { exitCode: 0 };
    setUploadFailureExitCode(1, processLike);
    console.log(JSON.stringify({ entries: [...merged.entries()], exitCode: processLike.exitCode }));
  `);

  expect(result).toEqual({
    entries: [
      [
        'failed-clip',
        'https://firebasestorage.googleapis.com/v0/b/test/o/failed.mp3?alt=media&token=stable&v=0123456789ab',
      ],
      ['successful-clip', 'https://example.invalid/current.mp3?v=bbbbbbbbbbbb'],
    ],
    exitCode: 1,
  });
});

test('retry skip reuses the literal versioned URL preserved for a failed full-run clip', () => {
  const result = runUploadCore(`
    import {
      mergePlanAudioUrlEntries,
      reuseExistingVersionedMapUrl,
    } from ${JSON.stringify(uploadCoreUrl)};
    const baseUrl = 'https://firebasestorage.googleapis.com/v0/b/test/o/failed.mp3?alt=media&token=stable';
    const literalVersionedUrl = baseUrl + '&v=0123456789ab';
    const firstRun = mergePlanAudioUrlEntries({
      existingEntries: new Map([['failed-clip', literalVersionedUrl]]),
      completedEntries: [],
      failedLocalUris: new Set(['failed-clip']),
      partialUpload: false,
    });
    const retrySkipUrl = reuseExistingVersionedMapUrl(firstRun.get('failed-clip'), baseUrl);
    console.log(JSON.stringify({ preserved: firstRun.get('failed-clip'), retrySkipUrl }));
  `);

  expect(result).toEqual({
    preserved:
      'https://firebasestorage.googleapis.com/v0/b/test/o/failed.mp3?alt=media&token=stable&v=0123456789ab',
    retrySkipUrl:
      'https://firebasestorage.googleapis.com/v0/b/test/o/failed.mp3?alt=media&token=stable&v=0123456789ab',
  });
});
