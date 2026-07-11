import React, { useMemo, useState } from 'react';
import { Pressable, type StyleProp, type TextProps, type TextStyle } from 'react-native';

import { triLang, type Lang } from '../../constants/i18n';
import { useLang } from '../LangContext';
import { InternalFlowText } from './FlowText';

type ExpandableProvenance = 'user' | 'external';
type UnsafeNativeTextProp = 'numberOfLines' | 'ellipsizeMode' | 'allowFontScaling' | 'adjustsFontSizeToFit' | 'minimumFontScale';

export type ExpandableTextProps = Omit<TextProps, UnsafeNativeTextProp | 'children'> & {
  text: string;
  testID: string;
  provenance: ExpandableProvenance;
  previewCharacterBudget?: number;
  style?: StyleProp<TextStyle>;
};

export function expandableTextLabels(lang: Lang, expanded: boolean): string {
  const copy = triLang(lang, {
    ru: { show: 'Показать полностью', hide: 'Свернуть' },
    uk: { show: 'Показати повністю', hide: 'Згорнути' },
    es: { show: 'Mostrar todo', hide: 'Contraer' },
    'pt-BR': { show: 'Mostrar tudo', hide: 'Recolher' },
    vi: { show: 'Hiện tất cả', hide: 'Thu gọn' },
    id: { show: 'Tampilkan semua', hide: 'Ciutkan' },
    tr: { show: 'Tümünü göster', hide: 'Daralt' },
    pl: { show: 'Pokaż całość', hide: 'Zwiń' },
  });
  return expanded ? copy.hide : copy.show;
}

function safeBudget(value: number): number {
  return Number.isSafeInteger(value) && value > 0 ? value : 160;
}

function isRegionalIndicator(codePoint: number): boolean {
  return codePoint >= 0x1f1e6 && codePoint <= 0x1f1ff;
}

function isGraphemeExtension(codePoint: number, value: string): boolean {
  return codePoint === 0xfe0e
    || codePoint === 0xfe0f
    || (codePoint >= 0x1f3fb && codePoint <= 0x1f3ff)
    || /\p{Mark}/u.test(value);
}

function fallbackGraphemes(text: string, limit: number): string[] {
  const result: string[] = [];
  let index = 0;
  while (index < text.length && result.length < limit) {
    const firstCodePoint = text.codePointAt(index) ?? 0;
    let cluster = String.fromCodePoint(firstCodePoint);
    index += cluster.length;
    if (isRegionalIndicator(firstCodePoint) && index < text.length) {
      const nextCodePoint = text.codePointAt(index) ?? 0;
      if (isRegionalIndicator(nextCodePoint)) {
        const next = String.fromCodePoint(nextCodePoint);
        cluster += next;
        index += next.length;
      }
    }
    while (index < text.length) {
      const codePoint = text.codePointAt(index) ?? 0;
      const next = String.fromCodePoint(codePoint);
      if (isGraphemeExtension(codePoint, next)) {
        cluster += next;
        index += next.length;
        continue;
      }
      if (codePoint === 0x200d) {
        cluster += next;
        index += next.length;
        if (index < text.length) {
          const joinedCodePoint = text.codePointAt(index) ?? 0;
          const joined = String.fromCodePoint(joinedCodePoint);
          cluster += joined;
          index += joined.length;
        }
        continue;
      }
      break;
    }
    result.push(cluster);
  }
  return result;
}

function takeGraphemes(text: string, limit: number): string[] {
  type Segment = { segment: string };
  type SegmenterConstructor = new (
    locales?: string | string[],
    options?: { granularity: 'grapheme' },
  ) => { segment(input: string): Iterable<Segment> };
  const Segmenter = (Intl as unknown as { Segmenter?: SegmenterConstructor }).Segmenter;
  if (!Segmenter) return fallbackGraphemes(text, limit);
  const result: string[] = [];
  for (const item of new Segmenter(undefined, { granularity: 'grapheme' }).segment(text)) {
    result.push(item.segment);
    if (result.length >= limit) break;
  }
  return result;
}

export function buildExpandablePreview(text: string, requestedBudget = 160): string {
  const budget = safeBudget(requestedBudget);
  const graphemes = takeGraphemes(text, budget + 1);
  if (graphemes.length <= budget) return text;
  const candidate = graphemes.slice(0, budget);
  if (/\s/u.test(graphemes[budget] ?? '')) return candidate.join('').trimEnd();
  let boundary = -1;
  for (let index = candidate.length - 1; index >= 0; index -= 1) {
    if (/\s/u.test(candidate[index])) { boundary = index; break; }
  }
  return boundary > 0 ? candidate.slice(0, boundary).join('').trimEnd() : candidate.join('');
}

export function ExpandableText({
  text,
  testID,
  provenance,
  previewCharacterBudget = 160,
  ...textProps
}: ExpandableTextProps) {
  if (provenance !== 'user' && provenance !== 'external') {
    throw new Error('ExpandableText requires user or external provenance');
  }
  const { lang } = useLang();
  const normalizedBudget = safeBudget(previewCharacterBudget);
  const preview = useMemo(
    () => buildExpandablePreview(text, normalizedBudget),
    [normalizedBudget, text],
  );
  const [expansion, setExpansion] = useState(() => ({
    text,
    testID,
    provenance,
    budget: normalizedBudget,
    expanded: false,
  }));
  const sameIdentity = expansion.text === text
    && expansion.testID === testID
    && expansion.provenance === provenance
    && expansion.budget === normalizedBudget;
  if (!sameIdentity) {
    setExpansion({ text, testID, provenance, budget: normalizedBudget, expanded: false });
  }
  const expanded = sameIdentity && expansion.expanded;
  const needsControl = preview !== text;
  const visible = expanded || !needsControl ? text : preview;
  const label = expandableTextLabels(lang, expanded);

  return (
    <>
      <InternalFlowText
        {...textProps}
        testID={`${testID}-text`}
        provenance={provenance}
        semanticMode="expand"
        integrityText={visible}
        accessibilityLabel={text}
        accessibilityValue={{ text }}
      >
        {visible}
      </InternalFlowText>
      {needsControl ? (
        <Pressable
          testID={`${testID}-toggle`}
          accessibilityRole="button"
          accessibilityLabel={label}
          accessibilityState={{ expanded }}
          aria-label={label}
          aria-expanded={expanded}
          style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}
          onPress={() => setExpansion({
            text,
            testID,
            provenance,
            budget: normalizedBudget,
            expanded: !expanded,
          })}
        >
          <InternalFlowText testID={`${testID}-toggle-label`} provenance="authored" semanticMode="flow">
            {label}
          </InternalFlowText>
        </Pressable>
      ) : null}
    </>
  );
}
