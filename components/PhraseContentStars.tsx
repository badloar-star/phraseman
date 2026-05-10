/**
 * Компактная оценка фразы/слова: 3 звездочки, одна отправка навсегда.
 * UX: локально сразу (AsyncStorage); сервер — в фоне.
 */
import { triLang } from '../constants/i18n';
import { useLang } from './LangContext';
import {
  normalizePhraseRatingItemId,
  phraseRatingAsyncStorageKey,
  readLocalPhraseRating,
  removeLocalPhraseRating,
  writeLocalPhraseRating,
} from '@/app/phrase_content_rating_local';
import {
  getStableUserIdForRating,
  isPhraseRatingCloudEnabled,
  phraseContentRatingFetchState,
  phraseContentRatingSubmit,
  type PhraseContentRatingScope,
} from '@/app/phrase_content_rating';
import { Feather } from '@expo/vector-icons';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  InteractionManager,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

export type PhraseContentStarsProps = {
  scope: PhraseContentRatingScope;
  /** Обычно `stableKey` строки упражнения / id словарного слова. */
  itemId: string | null | undefined;
  /** Для статистики/модерации (обрезается автоматически). */
  itemLabelSnippet?: string;
  /** Алиас к `itemLabelSnippet` (как на экранах уроков/квизов). */
  labelSnippet?: string;
  compact?: boolean;
  /** Если не задано: по `scope` — теория урока, словарь, глаголы и т.д.; иначе фраза. */
  ratingTarget?: 'phrase' | 'word' | 'verb' | 'theory';
  style?: StyleProp<ViewStyle>;
};

function StarsRow({
  myStars,
  disabled,
  onPick,
}: {
  myStars: 1 | 2 | 3 | null;
  disabled?: boolean;
  onPick?: (stars: 1 | 2 | 3) => void;
}) {
  return (
    <View style={starStyles.row} accessibilityRole="radiogroup" accessibilityLabel="Оценить">
      {([1, 2, 3] as const).map((n) => (
        <Pressable
          key={String(n)}
          disabled={disabled}
          onPress={() => onPick?.(n)}
          hitSlop={8}
          style={starStyles.hit}
          accessibilityRole="radio"
          accessibilityState={{ checked: !!myStars && myStars >= n, disabled }}
        >
          <Feather
            name="star"
            size={18}
            color={myStars != null && myStars >= n ? '#facc15' : '#9ca3af'}
            style={myStars != null && myStars >= n ? starStyles.filled : starStyles.outline}
          />
        </Pressable>
      ))}
    </View>
  );
}

const starStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  hit: { paddingVertical: 2, paddingHorizontal: 2 },
  filled: {},
  outline: { opacity: 0.75 },
});

export function PhraseContentStars({
  scope,
  itemId,
  itemLabelSnippet,
  labelSnippet: labelSnippetLegacy,
  compact,
  ratingTarget,
  style,
}: PhraseContentStarsProps) {
  const { lang } = useLang();
  const snippetLabel = itemLabelSnippet ?? labelSnippetLegacy;
  const [myStars, setMyStars] = useState<1 | 2 | 3 | null>(null);
  const [thankYou, setThankYou] = useState(false);
  const storageKeyRef = useRef<string | null>(null);
  const thankTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconcileRunRef = useRef(0);

  const norm = itemId ? normalizePhraseRatingItemId(String(itemId)) : '';
  /** Совпадает с тем, что отправляется на сервер (отпечаток фразы для одного itemId). */
  const resolvedSnippet = snippetLabel?.trim() ? snippetLabel.trim() : norm ? norm.slice(0, 80) : '';
  const label = (() => {
    const phrase = () =>
      triLang(lang, { ru: 'Оценка фразы', uk: 'Оцінка фрази', es: 'Valoración de la frase' });
    const word = () =>
      triLang(lang, { ru: 'Оценка слова', uk: 'Оцінка слова', es: 'Valoración de la palabra' });
    const verb = () =>
      triLang(lang, { ru: 'Оценка глагола', uk: 'Оцінка дієслова', es: 'Valoración del verbo' });
    const theory = () =>
      triLang(lang, { ru: 'Оценка теории', uk: 'Оцінка теорії', es: 'Valoración de la teoría' });
    if (ratingTarget === 'theory') return theory();
    if (ratingTarget === 'verb') return verb();
    if (ratingTarget === 'word') return word();
    if (ratingTarget === 'phrase') return phrase();
    if (scope === 'lesson_theory') return theory();
    if (scope === 'dictionary_word') return word();
    if (scope === 'irregular_verb_drill') return verb();
    return phrase();
  })();

  const clearThankTimer = useCallback(() => {
    if (thankTimerRef.current != null) {
      clearTimeout(thankTimerRef.current);
      thankTimerRef.current = null;
    }
  }, []);

  const showThankYou = useCallback(() => {
    clearThankTimer();
    setThankYou(true);
    thankTimerRef.current = setTimeout(() => {
      setThankYou(false);
      thankTimerRef.current = null;
    }, 3500);
  }, [clearThankTimer]);

  /** Фоновая синхронизация: сервер — правда при расхождении; повтор неотправленного. */
  const reconcileServer = useCallback(
    async (runId: number, sid: string, key: string) => {
      try {
        const remote = await phraseContentRatingFetchState({
          stableUserId: sid,
          scope,
          itemId: norm,
          labelSnippet: resolvedSnippet,
        });
        if (reconcileRunRef.current !== runId) return;

        const fresh = await readLocalPhraseRating(key);
        if (reconcileRunRef.current !== runId) return;

        const rStars = remote.myStars === 1 || remote.myStars === 2 || remote.myStars === 3 ? remote.myStars : null;

        if (rStars != null) {
          if (fresh == null || fresh.stars !== rStars) {
            setMyStars(rStars);
            await writeLocalPhraseRating(key, rStars, true);
          } else if (!fresh.synced) {
            await writeLocalPhraseRating(key, fresh.stars, true);
          }
          return;
        }

        if (fresh?.synced) {
          await removeLocalPhraseRating(key);
          setMyStars(null);
        }

        if (fresh?.stars && !fresh.synced) {
          try {
            const res = await phraseContentRatingSubmit({
              stableUserId: sid,
              scope,
              itemId: norm,
              labelSnippet: resolvedSnippet,
              stars: fresh.stars,
            });
            if (reconcileRunRef.current !== runId) return;
            if (res.ok || res.alreadyRated) {
              await writeLocalPhraseRating(key, fresh.stars, true);
            }
          } catch {
            /* оставляем synced: false для следующего захода */
          }
        }
      } catch {
        /* офлайн — молча */
      }
    },
    [norm, scope, resolvedSnippet],
  );

  useEffect(() => {
    setThankYou(false);
    clearThankTimer();
    setMyStars(null);
    storageKeyRef.current = null;

    if (!isPhraseRatingCloudEnabled() || !norm) {
      return () => {
        clearThankTimer();
      };
    }

    let cancelled = false;
    const runId = ++reconcileRunRef.current;

    void (async () => {
      const sid = await getStableUserIdForRating();
      if (!sid || cancelled) return;
      const key = await phraseRatingAsyncStorageKey(sid, scope, norm, resolvedSnippet);
      if (cancelled) return;
      storageKeyRef.current = key;

      const local = await readLocalPhraseRating(key);
      if (cancelled) return;
      if (local != null) {
        const s = local.stars;
        if (s === 1 || s === 2 || s === 3) setMyStars(s);
      }

      void InteractionManager.runAfterInteractions(() => {
        void reconcileServer(runId, sid, key);
      });
    })();

    return () => {
      cancelled = true;
      clearThankTimer();
    };
  }, [clearThankTimer, norm, reconcileServer, resolvedSnippet, scope]);

  const onPick = useCallback(
    async (stars: 1 | 2 | 3) => {
      if (myStars != null || !norm || !isPhraseRatingCloudEnabled()) return;

      setMyStars(stars);
      showThankYou();

      const sid = await getStableUserIdForRating();
      if (!sid) return;

      let key = storageKeyRef.current;
      if (!key) {
        key = await phraseRatingAsyncStorageKey(sid, scope, norm, resolvedSnippet);
        storageKeyRef.current = key;
      }

      await writeLocalPhraseRating(key, stars, false);

      void (async () => {
        try {
          const res = await phraseContentRatingSubmit({
            stableUserId: sid,
            scope,
            itemId: norm,
            labelSnippet: resolvedSnippet,
            stars,
          });
          if (res.ok || res.alreadyRated) {
            await writeLocalPhraseRating(key!, stars, true);
          }
        } catch {
          /* фон: при следующем открытии reconcile повторит */
        }
      })();
    },
    [myStars, norm, scope, showThankYou, resolvedSnippet],
  );

  if (!isPhraseRatingCloudEnabled()) return null;
  if (!norm) return null;

  return (
    <View style={[styles.wrap, compact && styles.wrapCompact, style]} pointerEvents="box-none">
      <View style={styles.row} pointerEvents="box-none">
        <Text style={styles.label} numberOfLines={1}>
          {label}
        </Text>
        <StarsRow myStars={myStars} disabled={myStars != null} onPick={onPick} />
      </View>
      {thankYou ? (
        <Text style={styles.thank} numberOfLines={2}>
          {triLang(lang, {
            ru: 'Спасибо, что помогаете улучшать курс!',
            uk: 'Дякуємо, що допомагаєте покращувати курс!',
            es: '¡Gracias por ayudarnos a mejorar el curso!',
          })}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 8, marginBottom: 4, alignItems: 'center' },
  wrapCompact: { marginTop: 4, marginBottom: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  label: { color: '#9ca3af', fontSize: 12, maxWidth: '46%' },
  thank: {
    marginTop: 4,
    color: '#6b7280',
    fontSize: 11,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
});

export default PhraseContentStars;
