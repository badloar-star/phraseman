import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import type { Theme } from '../../constants/theme';
import { triLang, type Lang } from '../../constants/i18n';
import type { FlashcardMarketPack } from '../flashcards/marketplace';
import { addCommunityPackToLibrary, toggleCommunityPackLike } from './communityPackActions';
import {
  addToLibraryOptimistic,
  mergeServerCounts,
  toggleLikeOptimistic,
  type PackSocialSnapshot,
} from './packSocial';
import { fetchCommunityPackSocialCounts } from './packSocialFirestore';
import { isCommunityPackLikedLocally } from './packSocialStorage';

type Props = {
  pack: FlashcardMarketPack;
  lang: Lang;
  t: Theme;
  /** Набор уже у пользователя — вместо «Добавить себе» показываем статус. */
  owned: boolean;
  /** Набор в топе по лайкам (см. `topLikedPackIds`) — аккуратный акцент, без «премиальных» коннотаций. */
  isTop?: boolean;
  /** Компактный режим для плитки каталога (без кнопки-строки). */
  compact?: boolean;
  onAdded?: (packId: string) => void;
};

/**
 * Cards 2.1 §2 — соц-строка набора: лайк активности, счётчик добавлений
 * и бесплатное «Добавить себе» (одно нажатие, оптимистично, без подтверждений).
 */
export default function CommunityPackSocialBar({
  pack,
  lang,
  t,
  owned,
  isTop = false,
  compact = false,
  onAdded,
}: Props) {
  const [snapshot, setSnapshot] = useState<PackSocialSnapshot>(() => ({
    likesCount: pack.likesCount ?? 0,
    addedCount: pack.addedCount ?? 0,
    liked: false,
    added: owned,
  }));

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [liked, counts] = await Promise.all([
        isCommunityPackLikedLocally(pack.id).catch(() => false),
        fetchCommunityPackSocialCounts(pack.id).catch(() => ({ likesCount: 0, addedCount: 0 })),
      ]);
      if (cancelled) return;
      setSnapshot((prev) =>
        mergeServerCounts({ ...prev, liked, added: prev.added || owned }, {
          likesCount: Math.max(counts.likesCount, pack.likesCount ?? 0),
          addedCount: Math.max(counts.addedCount, pack.addedCount ?? 0),
        }),
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [pack.id, pack.likesCount, pack.addedCount, owned]);

  const onLikePress = useCallback(() => {
    /** Оптимистично: цифра меняется сразу, сервер догоняет. */
    setSnapshot((prev) => toggleLikeOptimistic(prev));
    void toggleCommunityPackLike(pack.id);
  }, [pack.id]);

  const onAddPress = useCallback(() => {
    setSnapshot((prev) => addToLibraryOptimistic(prev));
    void (async () => {
      const res = await addCommunityPackToLibrary(pack);
      if (res === 'added') onAdded?.(pack.id);
    })();
  }, [pack, onAdded]);

  const addedLabel = triLang(lang, { ru: 'добавили', uk: 'додали', es: 'lo añadieron' });
  const addLabel = triLang(lang, { ru: 'Добавить себе', uk: 'Додати собі', es: 'Añadir' });
  const ownedLabel = triLang(lang, { ru: 'В моих наборах', uk: 'У моїх наборах', es: 'En mis packs' });
  const topLabel = triLang(lang, { ru: 'В топе', uk: 'У топі', es: 'En tendencia' });

  const isAdded = owned || snapshot.added;

  return (
    <View style={{ gap: compact ? 6 : 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <TouchableOpacity
          testID={`pack-like-${pack.id}`}
          accessibilityRole="button"
          accessibilityLabel="qa-pack-like"
          onPress={onLikePress}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}
        >
          <Ionicons
            name={snapshot.liked ? 'heart' : 'heart-outline'}
            size={compact ? 15 : 18}
            color={snapshot.liked ? t.accent : t.textMuted}
          />
          <Text
            style={{
              color: snapshot.liked ? t.accent : t.textSecond,
              fontSize: compact ? 11 : 13,
              fontWeight: '700',
            }}
          >
            {snapshot.likesCount}
          </Text>
        </TouchableOpacity>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <Ionicons name="people-outline" size={compact ? 15 : 18} color={t.textMuted} />
          <Text style={{ color: t.textSecond, fontSize: compact ? 11 : 13, fontWeight: '700' }}>
            {snapshot.addedCount}
          </Text>
          {compact ? null : (
            <Text style={{ color: t.textMuted, fontSize: 12 }}>{addedLabel}</Text>
          )}
        </View>

        {isTop ? (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
              paddingHorizontal: 8,
              paddingVertical: 3,
              borderRadius: 999,
              borderWidth: 1,
              /** Акцент раздела, не «золото» — бейдж не должен читаться как платный. */
              borderColor: `${t.accent}66`,
              backgroundColor: `${t.accent}1A`,
            }}
          >
            <Ionicons name="trending-up-outline" size={12} color={t.accent} />
            <Text style={{ color: t.accent, fontSize: 11, fontWeight: '800' }}>{topLabel}</Text>
          </View>
        ) : null}
      </View>

      {compact ? null : (
        <TouchableOpacity
          testID={`pack-add-${pack.id}`}
          accessibilityRole="button"
          accessibilityLabel="qa-pack-add"
          disabled={isAdded}
          onPress={onAddPress}
          style={{
            borderRadius: 12,
            paddingVertical: 11,
            alignItems: 'center',
            borderWidth: 1,
            borderColor: isAdded ? `${t.correct}55` : `${t.accent}66`,
            backgroundColor: isAdded ? `${t.correct}22` : `${t.accent}1F`,
          }}
        >
          <Text
            style={{
              color: isAdded ? t.correct : t.accent,
              fontSize: 14,
              fontWeight: '800',
            }}
          >
            {isAdded ? ownedLabel : addLabel}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
