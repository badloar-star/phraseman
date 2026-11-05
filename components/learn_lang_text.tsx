// ═══════════════════════════════════════════════════════════════════════════
// learn_lang_text.tsx — слова изучаемого языка ОДНИМ цветом (вступления, теория, «Скажи так»).
//
// зачем (решение владельца 05.11, макет target_lang_one_color_approved_2026-11-05.html — «да так отлично»; «интро тоже должны быть окрашены, не только теория»): текст интерфейса
// и заголовки — обычным цветом, все слова и фразы изучаемого языка — один жирный цвет `lang` из оттенка темы, «Читается» — `say` (приглушённый, курсив).
// Где язык различим по буквам (интерфейс RU/UK — кириллица, изучаемый язык — латиница), красим латиницу внутри абзацев; где нет (латинские интерфейсы) — красим только
// заведомо изучаемое (примеры), абзацы остаются обычными: нельзя покрасить пояснение (план docs/work/release/mockups/target_lang_one_color_PLAN.md, «Риски»).
// Цвета считает constants/liquidGlassIntroTextRoles.ts (кэш по токенам темы), здесь — только разбор строки и вложенные Text.
// ═══════════════════════════════════════════════════════════════════════════
import React, { useMemo } from 'react';
import { Text, type TextStyle } from 'react-native';
import { introTextRolesForTokens, type IntroTextRoles } from '../constants/liquidGlassIntroTextRoles';
import { liquidGlassTokens } from '../constants/liquidGlassThemePalette';
import { useLang } from './LangContext';
import { useTheme } from './ThemeContext';

/** Интерфейсы, где латиница однозначно = изучаемый язык (кириллица вокруг). */
export const CYRILLIC_INTERFACE_LANGS: ReadonlySet<string> = new Set(['ru', 'uk']);
export const isLatinSplitInterface = (lang: string): boolean => CYRILLIC_INTERFACE_LANGS.has(lang);

/** Слово/фраза изучаемого языка: ASCII-блок (буквы, цифры, пробел, дефис, слэш, апостроф, знаки), как splitEnglish вступления. */
// зачем (координатор 05.11, «prête» красилось кусками): изучаемый язык может быть fr/es/de/it — буквы с акцентами (à é ê ñ ü ß ç œ…) такие же слова, как ASCII.
// Явный набор вместо \p{Script=Latin}: не зависим от поддержки свойств Юникода в движке JS на телефоне. À-Ö, Ø-ö, ø-ÿ = латиница-1 без × и ÷ (в диапазон входят ß ñ ü ç), Œ œ Ÿ — отдельно.
const LATIN_LETTER = "A-Za-zÀ-ÖØ-öø-ÿŒœŸ";
const LATIN_RUN = new RegExp(`([${LATIN_LETTER}][${LATIN_LETTER}0-9 '’\\-/.,→↔]*)`, 'g');

export type LangRun = Readonly<{ text: string; isLang: boolean }>;

/** Разбор строки на «изучаемый язык / остальное»; пустая строка → пусто. Чистая функция (тесты без React). */
export function splitLangRuns(text: string): LangRun[] {
  const out: LangRun[] = [];
  let last = 0;
  for (const m of text.matchAll(LATIN_RUN)) {
    const at = m.index ?? 0;
    if (at > last) out.push({ text: text.slice(last, at), isLang: false });
    // хвостовые пробелы и знаки препинания — обычным цветом (цвет только слову, не «.» и не пробелу после него)
    const word = m[0].replace(/[ .,→↔]+$/u, '');
    const tail = m[0].slice(word.length);
    if (word) out.push({ text: word, isLang: true });
    if (tail) out.push({ text: tail, isLang: false });
    last = at + m[0].length;
  }
  if (last < text.length) out.push({ text: text.slice(last), isLang: false });
  return out;
}

/** «Читается: …» / «Читається: …» — метка обычным цветом, остальное — тон `say`. */
const READING_LINE = /^(Читается|Читається):\s*([\s\S]*)$/u;
export function splitReadingLine(text: string): Readonly<{ label: string; rest: string }> | null {
  const m = READING_LINE.exec(text.trim());
  return m ? { label: m[1]!, rest: m[2]! } : null;
}

export type LearnLangPalette = Readonly<{ roles: IntroTextRoles; splitLatin: boolean }>;

/** Роли цвета активной темы + можно ли делить строку по буквам для текущего интерфейса. */
export function useLearnLangPalette(): LearnLangPalette {
  const { liquidGlassThemeId } = useTheme();
  const { lang } = useLang();
  const glass = liquidGlassTokens(liquidGlassThemeId);
  const roles = introTextRolesForTokens(liquidGlassThemeId, glass);
  return useMemo(() => ({ roles, splitLatin: isLatinSplitInterface(lang) }), [roles, lang]);
}

export const LANG_WEIGHT: TextStyle['fontWeight'] = '700';
export const SAY_STYLE: TextStyle = { fontStyle: 'italic', fontWeight: '400' };

/** Вложенные Text: слова изучаемого языка — `lang` 700, остальное — унаследованный цвет. Без разделения (латинский интерфейс) — строка как есть. */
export function LearnLangSpans({ text, roles, splitLatin }: Readonly<{ text: string; roles: IntroTextRoles; splitLatin: boolean }>): React.JSX.Element {
  if (!splitLatin) return <>{text}</>;
  const runs = splitLangRuns(text);
  return (
    <>
      {runs.map((r, i) => (r.isLang
        ? <Text key={i /* guard-ok: куски строки неизменны для одного текста */} style={{ color: roles.lang, fontWeight: LANG_WEIGHT }}>{r.text}</Text>
        : <React.Fragment key={i /* guard-ok: куски строки неизменны для одного текста */}>{r.text}</React.Fragment>))}
    </>
  );
}

/** Строка «Читается: …» вне абзаца: метка обычным цветом, остальное `say` курсивом. */
export function ReadingLineSpans({ text, roles, labelColor }: Readonly<{ text: string; roles: IntroTextRoles; labelColor: string }>): React.JSX.Element {
  const parts = splitReadingLine(text);
  if (!parts) return <Text style={[SAY_STYLE, { color: roles.say }]}>{text}</Text>;
  return (
    <>
      <Text style={{ color: labelColor }}>{`${parts.label}: `}</Text>
      <Text style={[SAY_STYLE, { color: roles.say }]}>{parts.rest}</Text>
    </>
  );
}
