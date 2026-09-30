function lexicalWords(value) {
  return String(value ?? '')
    .normalize('NFKC')
    .toLocaleLowerCase('und')
    .match(/[\p{L}\p{N}]+(?:-[\p{L}\p{N}]+)*/gu) ?? [];
}

export const DAILY_PHRASE_SENTENCE_BREAK = '\u0000';
const ALLOWED_TARGET_SURFACE_FIELDS = new Set(['targetExample', 'text_ru', 'text_uk']);

function lexicalSequence(value) {
  const pieces = String(value ?? '')
    .normalize('NFKC')
    .toLocaleLowerCase('und')
    .match(/[\p{L}\p{N}]+(?:-[\p{L}\p{N}]+)*|[.!?…]+/gu) ?? [];
  return pieces.map((piece) => (/^[.!?…]+$/u.test(piece) ? DAILY_PHRASE_SENTENCE_BREAK : piece));
}

function trimEdgeSentenceBreaks(tokens) {
  let start = 0;
  let end = tokens.length;
  while (start < end && tokens[start] === DAILY_PHRASE_SENTENCE_BREAK) start += 1;
  while (end > start && tokens[end - 1] === DAILY_PHRASE_SENTENCE_BREAK) end -= 1;
  return tokens.slice(start, end);
}

export function dailyPhraseTargetLexicalSequence(value) {
  return trimEdgeSentenceBreaks(lexicalSequence(value));
}

export function dailyPhraseTargetLexicalSignature(value) {
  return JSON.stringify(dailyPhraseTargetLexicalSequence(value));
}

function findTokenSequenceStart(valueTokens, targetTokens) {
  if (targetTokens.length === 0 || valueTokens.length < targetTokens.length) return -1;
  const lastStart = valueTokens.length - targetTokens.length;
  for (let start = 0; start <= lastStart; start += 1) {
    if (targetTokens.every((token, offset) => valueTokens[start + offset] === token)) return start;
  }
  return -1;
}

function findTokenSequenceInValue(value, targetTokens) {
  const valueTokens = lexicalSequence(value);
  const startTokenIndex = findTokenSequenceStart(valueTokens, targetTokens);
  if (startTokenIndex < 0) return null;
  let startSentenceIndex = 0;
  let sentenceHasLexicalToken = false;
  for (const token of valueTokens.slice(0, startTokenIndex)) {
    if (token === DAILY_PHRASE_SENTENCE_BREAK) {
      if (sentenceHasLexicalToken) {
        startSentenceIndex += 1;
        sentenceHasLexicalToken = false;
      }
    } else {
      sentenceHasLexicalToken = true;
    }
  }
  return {
    startTokenIndex,
    startSentenceIndex,
  };
}

function plausibleSurfaceForm(targetText, surfaceForm) {
  const targetTokens = lexicalWords(targetText);
  const surfaceTokens = lexicalWords(surfaceForm);
  if (targetTokens.length < 2 || surfaceTokens.length < 2 || surfaceTokens.length > targetTokens.length + 5) {
    return false;
  }
  const targetBoundaryCount = dailyPhraseTargetLexicalSequence(targetText)
    .filter((token) => token === DAILY_PHRASE_SENTENCE_BREAK)
    .length;
  const surfaceBoundaryCount = dailyPhraseTargetLexicalSequence(surfaceForm)
    .filter((token) => token === DAILY_PHRASE_SENTENCE_BREAK)
    .length;
  if (surfaceBoundaryCount !== targetBoundaryCount) return false;
  const targetSet = new Set(targetTokens);
  const shared = new Set(surfaceTokens.filter((token) => targetSet.has(token))).size;
  return shared >= 2 && shared / new Set(targetTokens).size >= 0.5;
}

function validateSurfaceForms(targetText, surfaceForms) {
  if (surfaceForms === undefined) return { status: 'PASS' };
  if (!surfaceForms || typeof surfaceForms !== 'object' || Array.isArray(surfaceForms)) {
    return { status: 'invalid_surface', declared: surfaceForms };
  }
  for (const [field, value] of Object.entries(surfaceForms)) {
    if (!ALLOWED_TARGET_SURFACE_FIELDS.has(field)
      || typeof value !== 'string'
      || !value.trim()
      || !plausibleSurfaceForm(targetText, value.trim())) {
      return { status: 'invalid_surface', declared: value, field };
    }
  }
  return { status: 'PASS' };
}

export function evaluateDailyPhraseTargetSurface(row, field) {
  if (typeof row?.targetText !== 'string') return { status: 'invalid_target' };
  if (typeof row?.[field] !== 'string') return { status: 'invalid_value' };
  const targetText = row.targetText.trim();
  const value = row[field].trim();
  const targetTokens = dailyPhraseTargetLexicalSequence(targetText);
  if (!targetTokens.some((token) => token !== DAILY_PHRASE_SENTENCE_BREAK)) return { status: 'missing_target' };

  const surfaceForms = row?.targetSurfaceForms;
  const surfaceFormsValidation = validateSurfaceForms(targetText, surfaceForms);
  if (surfaceFormsValidation.status !== 'PASS') return surfaceFormsValidation;
  const hasDeclaredSurface = Object.prototype.hasOwnProperty.call(surfaceForms ?? {}, field);
  let declared = '';
  let declaredMatch = null;
  if (hasDeclaredSurface) {
    const declaredValue = surfaceForms[field];
    declared = declaredValue.trim();
    const declaredTokens = dailyPhraseTargetLexicalSequence(declared);
    declaredMatch = findTokenSequenceInValue(value, declaredTokens);
    if (!declaredMatch) {
      return { status: 'declared_surface_missing', declared };
    }
  }

  const canonicalMatch = findTokenSequenceInValue(value, targetTokens);
  if (declaredMatch
    && (!canonicalMatch || declaredMatch.startTokenIndex < canonicalMatch.startTokenIndex)) {
    return {
      status: 'PASS',
      matched: declared,
      usedDeclaredSurface: true,
      startSentenceIndex: declaredMatch.startSentenceIndex,
    };
  }
  if (canonicalMatch) {
    return {
      status: 'PASS',
      matched: targetText,
      usedDeclaredSurface: false,
      startSentenceIndex: canonicalMatch.startSentenceIndex,
    };
  }
  if (!hasDeclaredSurface) {
    return { status: 'missing_surface' };
  }
  return {
    status: 'PASS',
    matched: declared,
    usedDeclaredSurface: true,
    startSentenceIndex: declaredMatch.startSentenceIndex,
  };
}
