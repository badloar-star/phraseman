// ════════════════════════════════════════════════════════════════════════════
// exam_certificate.ts — Сертификат Профессора Лингмана
//
// Хранит локально результат прошедшего финального экзамена (≥ 80%) с именем
// пользователя, чтобы:
//   • показывать настоящую карточку-сертификат на экране результата;
//   • при следующем заходе на /exam отдавать его сразу (а не intro);
//   • реренджерить SVG для шеринга/сохранения куда угодно.
//
// Ключ AsyncStorage: 'lingman_certificate_v1' — синкается в облако через
// SYNC_KEYS в `cloud_sync.ts`, поэтому переживает переустановку.
// ════════════════════════════════════════════════════════════════════════════

import AsyncStorage from '@react-native-async-storage/async-storage';

export const LINGMAN_CERT_STORAGE_KEY = 'lingman_certificate_v1';
export const LINGMAN_CERT_MIN_PCT = 80;
export const LINGMAN_CERT_NAME_MAX_LEN = 32;

export type CertLang = 'ru' | 'uk' | 'es';

export type LingmanCertificate = {
  name: string;
  score: number;
  total: number;
  pct: number;
  completedAt: number;
  certId: string;
  lang: CertLang;
};

function isCertLang(v: unknown): v is CertLang {
  return v === 'ru' || v === 'uk' || v === 'es';
}

function isLingmanCertificate(v: unknown): v is LingmanCertificate {
  if (!v || typeof v !== 'object') return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.name === 'string' &&
    typeof o.score === 'number' &&
    typeof o.total === 'number' &&
    typeof o.pct === 'number' &&
    typeof o.completedAt === 'number' &&
    typeof o.certId === 'string' &&
    isCertLang(o.lang)
  );
}

/**
 * Строит детерминированный ID вида `PHM-2026-AB12CD`.
 * Без collision-check — у юзера один сертификат, перезаписывается с каждой
 * новой сдачей (см. ответ юзера: показываем последний результат).
 */
function generateCertId(timestamp: number, salt: string): string {
  const year = new Date(timestamp).getUTCFullYear();
  let h = 5381;
  const seed = `${salt}:${timestamp}`;
  for (let i = 0; i < seed.length; i++) {
    h = ((h << 5) + h + seed.charCodeAt(i)) >>> 0; // djb2
  }
  const tail = h.toString(36).toUpperCase().padStart(6, '0').slice(-6);
  return `PHM-${year}-${tail}`;
}

export function sanitizeCertName(raw: string | null | undefined): string {
  return String(raw ?? '').trim().slice(0, LINGMAN_CERT_NAME_MAX_LEN);
}

export function buildLingmanCertificate(opts: {
  name: string;
  score: number;
  total: number;
  pct: number;
  lang: CertLang;
}): LingmanCertificate {
  const completedAt = Date.now();
  return {
    name: sanitizeCertName(opts.name),
    score: opts.score,
    total: opts.total,
    pct: opts.pct,
    completedAt,
    certId: generateCertId(completedAt, sanitizeCertName(opts.name) || 'anon'),
    lang: opts.lang,
  };
}

export async function loadLingmanCertificate(): Promise<LingmanCertificate | null> {
  try {
    const raw = await AsyncStorage.getItem(LINGMAN_CERT_STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isLingmanCertificate(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export async function saveLingmanCertificate(cert: LingmanCertificate): Promise<void> {
  try {
    await AsyncStorage.setItem(LINGMAN_CERT_STORAGE_KEY, JSON.stringify(cert));
  } catch {}
}

/** Используется когда юзер ввёл имя в модалке уже после генерации серта. */
export async function updateLingmanCertificateName(name: string): Promise<LingmanCertificate | null> {
  const cleaned = sanitizeCertName(name);
  if (!cleaned) return null;
  const cert = await loadLingmanCertificate();
  if (!cert) return null;
  // certId перегенерируем, чтобы хеш отражал имя владельца (так его сложнее
  // подделать в скриншоте: сравнить ID с владельцем = проверка валидности).
  const next: LingmanCertificate = {
    ...cert,
    name: cleaned,
    certId: generateCertId(cert.completedAt, cleaned),
  };
  await saveLingmanCertificate(next);
  return next;
}

export function formatCertDate(ts: number, lang: CertLang | 'en' = 'en'): string {
  const d = new Date(ts);
  if (lang === 'ru' || lang === 'uk' || lang === 'es') {
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${day}.${month}.${d.getFullYear()}`;
  }
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

/* expo-router shim: keeps utility module from being treated as a route. */
export default function __RouteShim() { return null; }
