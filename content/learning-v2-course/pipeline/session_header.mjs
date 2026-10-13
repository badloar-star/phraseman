const HORIZONTAL_SPACE = "[^\\S\\r\\n]*";
const NEW_WORDS_LABEL = new RegExp(`\\*\\*(?:Новые слова|Новое слово|Нові слова|Нове слово):\\*\\*${HORIZONTAL_SPACE}([^\\r\\n]*)`, "u");
const EXPLICIT_NONE = /^(?:—|–|-)$/u;

const normalizeLine = (value) => String(value ?? "").replace(/\s+/gu, " ").trim();

export function parseSessionHeader(markdown) {
  const source = String(markdown ?? "");
  const title = /^#\s+(.+)$/mu.exec(source)?.[1]?.trim() ?? "";
  const sceneMatch = new RegExp(`\\*\\*(?:Сцена сессии|Сцена сесії|Сцена занятия|Сцена заняття|Ситуация|Ситуація)\\.\\*\\*${HORIZONTAL_SPACE}([^\\r\\n]*)`, "u").exec(source);
  const sceneLines = sceneMatch ? [sceneMatch[1]] : [];
  if (sceneMatch) {
    const continuation = source.slice(sceneMatch.index + sceneMatch[0].length).split(/\r?\n/u).slice(1);
    for (const line of continuation) {
      if (!line.trim() || /^\s*(?:\*\*[^*\r\n]+(?::|\.)\*\*|#{1,6}\s)/u.test(line)) break;
      sceneLines.push(line);
    }
  }
  const operation = new RegExp(`\\*\\*(?:Операц[иі]я|Новая операция|Нова операція|Как сказать|Як сказати|Что вы освоите|Що ви опануєте|Что вы повторите|Що ви повторите):\\*\\*${HORIZONTAL_SPACE}([^\\r\\n]*)|\\*\\*(?:Сегодня|Сьогодні)\\.\\*\\*${HORIZONTAL_SPACE}([^\\r\\n]*)`, "u").exec(source);
  const declaration = NEW_WORDS_LABEL.exec(source);
  const newWordsRaw = normalizeLine(declaration?.[1]);

  let newWordsDeclaration = "missing";
  let newWords = [];
  if (declaration) {
    if (EXPLICIT_NONE.test(newWordsRaw)) {
      newWordsDeclaration = "explicit_none";
    } else {
      const entries = newWordsRaw.split(",").map(normalizeLine);
      const invalid = !newWordsRaw || entries.some((entry) => !entry || EXPLICIT_NONE.test(entry));
      if (invalid) {
        newWordsDeclaration = "invalid";
      } else {
        newWordsDeclaration = "declared";
        newWords = entries;
      }
    }
  }

  return {
    title,
    scene: normalizeLine(sceneLines.join(" ")),
    operation: normalizeLine(operation?.[1] ?? operation?.[2]),
    newWords,
    newWordsDeclaration,
    newWordsRaw,
  };
}

const normalizedWords = (words) => (words ?? []).map((word) => String(word).trim().toLocaleLowerCase("en")).sort();

export function newWordDeclarationIssues(headersByLocale, { guardianNewWords = null } = {}) {
  const entries = Object.entries(headersByLocale ?? {});
  const issues = [];
  for (const [locale, header] of entries) {
    if (header?.newWordsDeclaration === "missing") issues.push(`new_words_declaration_missing:${locale}`);
    else if (header?.newWordsDeclaration === "invalid") issues.push(`new_words_declaration_invalid:${locale}`);
  }
  const [baseLocale, baseHeader] = entries[0] ?? [];
  if (baseHeader) {
    const expected = JSON.stringify(normalizedWords(baseHeader.newWords));
    for (const [locale, header] of entries.slice(1)) {
      if (JSON.stringify(normalizedWords(header?.newWords)) !== expected) {
        issues.push(`new_words_locale_mismatch:${baseLocale}:${locale}`);
      }
    }
    if (guardianNewWords !== null && JSON.stringify(normalizedWords(guardianNewWords)) !== expected) {
      issues.push(`new_words_guardian_mismatch:${baseLocale}`);
    }
  }
  return issues;
}
