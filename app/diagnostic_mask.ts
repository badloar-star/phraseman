// зачем: PM-226 (A2) — диагностика ошибок не должна утекать в логи: токены,
// email, uid целиком, сырое аудио и текст личных карточек. Чистый модуль без
// React Native/Firebase, чтобы маскирование тестировалось отдельно и им можно
// было пользоваться из debug-logger без циклов импорта.

export type DiagnosticContextValue = string | number | boolean | null;
export type DiagnosticContext = Readonly<Record<string, DiagnosticContextValue>>;

const MAX_TEXT = 160;
const MAX_CONTEXT_KEYS = 12;

// Ключи, чьё значение — пользовательский контент или сырые данные: в лог идёт
// только длина, само значение не пишется никогда.
const CONTENT_KEY = /(text|transcript|phrase|word|front|back|title|note|message|audio|base64|blob|pcm|voice|card|deck|answer|prompt|body)/i;
const SECRET_KEY = /(token|secret|password|passwd|authorization|api[_-]?key|cookie|bearer|credential)/i;
const EMAIL_KEY = /(mail)/i;
const UID_KEY = /(uid|userid|user_id|account_?id|deviceid)/i;

const JWT_RE = /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]*/g;
const BEARER_RE = /\b(Bearer|Basic)\s+[A-Za-z0-9._~+/=-]{8,}/gi;
const KEYED_SECRET_RE = /\b(sk|pk|rk|key|tok|ghp|xox[bap])[-_][A-Za-z0-9_-]{12,}/g;
const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
// query-параметры вида ?token=..., &access_token=...
const QUERY_SECRET_RE = /([?&](?:[\w-]*(?:token|key|secret|sig|signature|password)[\w-]*)=)[^&\s]+/gi;
const DATA_URI_RE = /data:[a-z]+\/[a-z0-9.+-]+;base64,[A-Za-z0-9+/=]+/gi;
// Длинная base64/hex-последовательность (сырое аудио, ключи).
const BLOB_RE = /[A-Za-z0-9+/=]{64,}/g;
// Firebase uid и подобные идентификаторы: 20-36 знаков букв и цифр без разделителей.
const LONG_ID_RE = /\b(?=[A-Za-z0-9]*\d)(?=[A-Za-z0-9]*[A-Za-z])[A-Za-z0-9]{20,36}\b/g;

export function maskUid(uid: string): string {
  const s = String(uid);
  if (s.length <= 8) return '[id]';
  return `${s.slice(0, 4)}…${s.slice(-2)}`;
}

export function maskEmail(email: string): string {
  const at = email.indexOf('@');
  if (at <= 0) return '[email]';
  return `${email.slice(0, 1)}***${email.slice(at)}`;
}

export function maskDiagnosticText(input: unknown, maxLength: number = MAX_TEXT): string {
  let s = typeof input === 'string' ? input : String(input ?? '');
  s = s
    .replace(DATA_URI_RE, '[data-uri]')
    .replace(JWT_RE, '[jwt]')
    .replace(BEARER_RE, '$1 [secret]')
    .replace(QUERY_SECRET_RE, '$1[secret]')
    .replace(KEYED_SECRET_RE, '[secret]')
    .replace(EMAIL_RE, (m) => maskEmail(m))
    .replace(BLOB_RE, '[blob]')
    .replace(LONG_ID_RE, (m) => maskUid(m));
  return s.length > maxLength ? `${s.slice(0, maxLength)}…` : s;
}

function maskValue(key: string, value: unknown): DiagnosticContextValue {
  if (value == null) return null;
  if (SECRET_KEY.test(key)) return '[secret]';
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    if (UID_KEY.test(key)) return maskUid(value);
    if (EMAIL_KEY.test(key)) return maskEmail(value);
    if (CONTENT_KEY.test(key)) return `[content len=${value.length}]`;
    return maskDiagnosticText(value);
  }
  if (Array.isArray(value)) return `[array len=${value.length}]`;
  if (typeof value === 'object') return '[object]';
  return maskDiagnosticText(String(value));
}

/** Безопасный плоский контекст: только примитивы, лишнее маскируется. */
export function sanitizeDiagnosticContext(context: Readonly<Record<string, unknown>> | undefined): DiagnosticContext {
  if (!context) return {};
  const out: Record<string, DiagnosticContextValue> = {};
  for (const key of Object.keys(context).slice(0, MAX_CONTEXT_KEYS)) {
    out[key] = maskValue(key, context[key]);
  }
  return out;
}

let traceCounter = 0;
/** Короткий идентификатор цепочки: время + счётчик. Без данных пользователя. */
export function newTraceId(now: number = Date.now()): string {
  traceCounter = (traceCounter + 1) % 46656;
  return `${now.toString(36)}-${traceCounter.toString(36).padStart(3, '0')}`;
}
