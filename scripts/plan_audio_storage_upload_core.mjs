import crypto from 'crypto';

const CACHE_CONTROL = 'public, max-age=31536000, immutable';

function shortResponseText(text) {
  return String(text ?? '').slice(0, 200);
}

export function versionedDownloadUrl(downloadUrl, data) {
  const contentVersion = crypto
    .createHash('sha256')
    .update(data)
    .digest('hex')
    .slice(0, 12);
  const parsed = new URL(downloadUrl);
  parsed.searchParams.set('v', contentVersion);
  return parsed.toString();
}

export function reuseExistingVersionedMapUrl(existingMapUrl, expectedBaseUrl) {
  if (typeof existingMapUrl !== 'string' || typeof expectedBaseUrl !== 'string') return null;
  try {
    const existing = new URL(existingMapUrl);
    const version = existing.searchParams.get('v');
    if (!/^[a-f0-9]{12}$/.test(version ?? '')) return null;
    existing.searchParams.delete('v');
    if (existing.toString() !== new URL(expectedBaseUrl).toString()) return null;
    return existingMapUrl;
  } catch {
    return null;
  }
}

export function setUploadFailureExitCode(failed, processLike = process) {
  if (failed > 0) processLike.exitCode = 1;
}

export function mergePlanAudioUrlEntries({
  existingEntries,
  completedEntries,
  failedLocalUris,
  partialUpload,
}) {
  const merged = partialUpload ? new Map(existingEntries) : new Map();
  if (!partialUpload) {
    for (const localUri of failedLocalUris) {
      const existingUrl = existingEntries.get(localUri);
      if (existingUrl !== undefined) merged.set(localUri, existingUrl);
    }
  }
  for (const [localUri, url] of completedEntries) merged.set(localUri, url);
  return merged;
}

export async function readExistingDownloadToken({
  objectPath,
  bucket,
  accessToken,
  fetchImpl = fetch,
}) {
  const response = await fetchImpl(
    `https://storage.googleapis.com/storage/v1/b/${bucket}/o/${encodeURIComponent(objectPath)}?fields=metadata`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(
      `object metadata ${response.status}: ${shortResponseText(await response.text())}`,
    );
  }
  const object = await response.json();
  const rawTokens = object?.metadata?.firebaseStorageDownloadTokens;
  const downloadToken = typeof rawTokens === 'string'
    ? rawTokens.split(',').map((token) => token.trim()).find(Boolean)
    : null;
  if (!downloadToken) {
    throw new Error(
      `object metadata missing firebaseStorageDownloadTokens: ${objectPath}`,
    );
  }
  return downloadToken;
}

export async function uploadObjectMultipart({
  objectPath,
  bucket,
  accessToken,
  downloadToken,
  data,
  fetchImpl = fetch,
}) {
  const boundary = `plan_audio_${crypto.randomUUID().replace(/-/g, '')}`;
  const metadata = Buffer.from(
    JSON.stringify({
      name: objectPath,
      contentType: 'audio/mpeg',
      cacheControl: CACHE_CONTROL,
      metadata: { firebaseStorageDownloadTokens: downloadToken },
    }),
    'utf8',
  );
  const body = Buffer.concat([
    Buffer.from(
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n`,
      'utf8',
    ),
    metadata,
    Buffer.from(`\r\n--${boundary}\r\nContent-Type: audio/mpeg\r\n\r\n`, 'utf8'),
    data,
    Buffer.from(`\r\n--${boundary}--\r\n`, 'utf8'),
  ]);
  const response = await fetchImpl(
    `https://storage.googleapis.com/upload/storage/v1/b/${bucket}/o?uploadType=multipart`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body,
    },
  );
  if (!response.ok) {
    throw new Error(
      `upload ${response.status}: ${shortResponseText(await response.text())}`,
    );
  }
}
