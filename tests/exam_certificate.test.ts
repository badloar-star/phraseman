import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  LINGMAN_CERT_MIN_PCT,
  LINGMAN_CERT_NAME_MAX_LEN,
  LINGMAN_CERT_STORAGE_KEY,
  buildLingmanCertificate,
  loadLingmanCertificate,
  sanitizeCertName,
  saveLingmanCertificate,
  updateLingmanCertificateName,
} from '../app/exam_certificate';

describe('Lingman exam certificate', () => {
  const fixedNow = Date.UTC(2026, 4, 14, 10, 0, 0);

  beforeEach(() => {
    (AsyncStorage as any).__reset?.();
    jest.spyOn(Date, 'now').mockReturnValue(fixedNow);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('builds a persisted B2 certificate for a passed Lingman exam', async () => {
    expect(LINGMAN_CERT_MIN_PCT).toBe(80);

    const cert = buildLingmanCertificate({
      name: '  Anna Lingman  ',
      score: 29,
      total: 32,
      pct: 91,
      lang: 'ru',
    });

    expect(cert).toMatchObject({
      name: 'Anna Lingman',
      score: 29,
      total: 32,
      pct: 91,
      completedAt: fixedNow,
      lang: 'ru',
    });
    expect(cert.certId).toMatch(/^PHM-2026-[0-9A-Z]{6}$/);

    await saveLingmanCertificate(cert);
    await expect(loadLingmanCertificate()).resolves.toEqual(cert);

    const raw = await AsyncStorage.getItem(LINGMAN_CERT_STORAGE_KEY);
    expect(JSON.parse(raw || '{}')).toEqual(cert);
  });

  it('keeps the certificate hidden until a name is saved, then regenerates the owner-bound id', async () => {
    const anonymousCert = buildLingmanCertificate({
      name: '',
      score: 26,
      total: 32,
      pct: 81,
      lang: 'uk',
    });

    await saveLingmanCertificate(anonymousCert);
    await expect(updateLingmanCertificateName('   ')).resolves.toBeNull();

    const longName = '  Professor Lingman Student With A Very Long Public Name  ';
    const updated = await updateLingmanCertificateName(longName);

    const { certId: _oldCertId, name: _oldName, ...anonymousCertRest } = anonymousCert;
    expect(updated).toMatchObject({
      ...anonymousCertRest,
      name: sanitizeCertName(longName),
    });
    expect(updated!.name.length).toBeLessThanOrEqual(LINGMAN_CERT_NAME_MAX_LEN);
    expect(updated!.certId).toMatch(/^PHM-2026-[0-9A-Z]{6}$/);
    expect(updated!.certId).not.toBe(anonymousCert.certId);
    await expect(loadLingmanCertificate()).resolves.toEqual(updated);
  });

  it('ignores corrupted stored certificate payloads', async () => {
    await AsyncStorage.setItem(LINGMAN_CERT_STORAGE_KEY, JSON.stringify({ pct: 90 }));

    await expect(loadLingmanCertificate()).resolves.toBeNull();
  });
});
