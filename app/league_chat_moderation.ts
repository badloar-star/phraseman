import {
  LEAGUE_CHAT_BLOCK_TERMS,
  LEAGUE_CHAT_REVIEW_TERMS,
  LEAGUE_CHAT_SEXUAL_TERMS,
} from './league_chat_blocklist.generated';

export type LeagueChatModerationStatus = 'clean' | 'review' | 'blocked';

export type LeagueChatModerationCategory =
  | 'link'
  | 'contact'
  | 'profanity'
  | 'insult'
  | 'threat'
  | 'hate'
  | 'sexual'
  | 'spam'
  | 'identity'
  | 'length';

export interface LeagueChatModerationResult {
  status: LeagueChatModerationStatus;
  categories: LeagueChatModerationCategory[];
  reasons: string[];
  normalizedText: string;
}

const MAX_MESSAGE_LENGTH = 420;
const MAX_REPEAT_CHARS = 8;

const LINK_RE = /\b(?:https?:\/\/|www\.|t\.me\/|telegram\.me\/|discord\.gg\/|discord\.com\/invite\/|wa\.me\/|chat\.whatsapp\.com\/|bit\.ly\/|tinyurl\.com\/|linktr\.ee\/|instagram\.com\/|tiktok\.com\/|youtube\.com\/|youtu\.be\/)\S*/i;
const EMAIL_RE = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
const PHONE_RE = /(?:\+?\d[\s().-]?){8,}/;
const HANDLE_RE = /(^|\s)@[a-z0-9_]{3,32}\b/i;

const LEET: Record<string, string> = {
  '0': 'o',
  '1': 'i',
  '3': 'e',
  '4': 'a',
  '5': 's',
  '7': 't',
  '@': 'a',
  '$': 's',
  '!': 'i',
};

const BLOCK_TERMS = LEAGUE_CHAT_BLOCK_TERMS;

const BLOCK_PATTERNS = [
  /\b(?:h+u+[iy]+|x+u+[iy]+|x+y+[iu]+)\b/i,
  /\b(?:blya(?:d|t)?|suka|pizd\w*|pid[ao]r\w*)\b/i,
  /\b(?:f+u+c+k+|s+h+i+t+|c+u+n+t+)\b/i,
  /(?:^|\s)(?:бля(?:д|т)\w*|пизд\w*|ху[йеяию]\w*|[её]б\w*|у[её]б\w*|сука\w*)(?:\s|$)/i,
];

const HATE_PATTERNS = [
  /\b(?:nazi|hitler|heil)\b/i,
  /\b(?:racist|terrorist)\b/i,
  /\b(?:all|все|усе|todos|todas)\s+\w{2,24}\s+(?:are|is|must|should|должны|надо|нужно)/i,
  /\b(?:ненавижу|уничтожить|убить|выгнать|запретить)\s+\w{2,24}/i,
];

const REVIEW_IDENTITY_TERMS = LEAGUE_CHAT_REVIEW_TERMS;
const SEXUAL_TERMS = LEAGUE_CHAT_SEXUAL_TERMS;

type CompiledTerm = {
  normalized: string;
  compacted: string;
  compactMatch: boolean;
};

const termCache = new WeakMap<readonly string[], CompiledTerm[]>();
const ALLOWED_NORMALIZED_TERMS = new Set(['pass']);

function normalizeForModeration(input: string): string {
  const lower = input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '');
  const leet = lower.replace(/[013457@$!]/g, (ch) => LEET[ch] ?? ch);
  return leet
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/(.)\1{2,}/g, '$1$1')
    .replace(/[^a-zа-яёіїєґ0-9]+/giu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function compact(input: string): string {
  return normalizeForModeration(input).replace(/\s+/g, '');
}

function compileTerms(terms: readonly string[]): CompiledTerm[] {
  const cached = termCache.get(terms);
  if (cached) return cached;
  const compiled = terms
    .map((term) => {
      const normalized = normalizeForModeration(term);
      const termCompacted = normalized.replace(/\s+/g, '');
      return {
        normalized,
        compacted: termCompacted,
        compactMatch: termCompacted.length >= 5,
      };
    })
    .filter((term) => term.normalized && !ALLOWED_NORMALIZED_TERMS.has(term.normalized));
  termCache.set(terms, compiled);
  return compiled;
}

function containsTerm(normalized: string, compacted: string, terms: readonly string[]): boolean {
  const padded = ` ${normalized} `;
  return compileTerms(terms).some((term) => {
    if (!term.normalized) return false;
    if (padded.includes(` ${term.normalized} `)) return true;
    return term.compactMatch && compacted.includes(term.compacted);
  });
}

function containsBlockedPattern(normalized: string, compacted: string): boolean {
  return BLOCK_PATTERNS.some((re) => re.test(normalized) || re.test(compacted));
}

function unique<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

export function moderateLeagueChatMessage(text: string): LeagueChatModerationResult {
  const raw = text.trim();
  const normalizedText = normalizeForModeration(raw);
  const compacted = compact(raw);
  const categories: LeagueChatModerationCategory[] = [];
  const reasons: string[] = [];

  if (raw.length > MAX_MESSAGE_LENGTH) {
    categories.push('length');
    reasons.push('message_too_long');
  }
  if (LINK_RE.test(raw)) {
    categories.push('link');
    reasons.push('external_link');
  }
  if (EMAIL_RE.test(raw) || PHONE_RE.test(raw) || HANDLE_RE.test(raw)) {
    categories.push('contact');
    reasons.push('external_contact');
  }
  if (/(.)\1{8,}/u.test(raw) || raw.split(/\s+/).length > 8 && new Set(raw.split(/\s+/)).size <= 3) {
    categories.push('spam');
    reasons.push('spam_pattern');
  }
  if (containsTerm(normalizedText, compacted, BLOCK_TERMS) || containsBlockedPattern(normalizedText, compacted)) {
    categories.push('profanity');
    reasons.push('blocked_term');
  }
  if (HATE_PATTERNS.some((re) => re.test(normalizedText))) {
    categories.push('hate');
    reasons.push('hate_or_harassment_pattern');
  }
  if (containsTerm(normalizedText, compacted, SEXUAL_TERMS)) {
    categories.push('sexual');
    reasons.push('sexual_content');
  }
  if (containsTerm(normalizedText, compacted, REVIEW_IDENTITY_TERMS)) {
    categories.push('identity');
    reasons.push('protected_identity_context');
  }
  if (/(?:\bты\b|\byou\b).{0,24}(?:туп|дебил|идиот|лох|stupid|idiot|dumb)/i.test(normalizedText)) {
    categories.push('insult');
    reasons.push('direct_insult');
  }
  if (/(?:убью|зарежу|сломаю|kill you|hurt you)/i.test(normalizedText)) {
    categories.push('threat');
    reasons.push('threat');
  }

  const uniqueCategories = unique(categories);
  const status: LeagueChatModerationStatus =
    uniqueCategories.some((c) => c !== 'identity') ? 'blocked'
      : uniqueCategories.includes('identity') ? 'review'
        : 'clean';

  return {
    status,
    categories: uniqueCategories,
    reasons: unique(reasons),
    normalizedText,
  };
}

export function sanitizeLeagueChatText(text: string): string {
  return text
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_MESSAGE_LENGTH);
}
