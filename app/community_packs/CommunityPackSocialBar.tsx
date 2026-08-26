/**
 * Соц-слой набора сообщества: лайк, счётчик добавлений и «Добавить себе».
 *
 * Правило владельца (после теста на iPhone): ЛАЙК ДОСТУПЕН ТОЛЬКО ПОСЛЕ ТОГО,
 * КАК НАБОР ДОБАВЛЕН СЕБЕ. До добавления кнопка неактивна и объясняет почему —
 * лайк не должен быть «просто цифрой», которую жмут не глядя.
 *
 * Варианты (`variant`):
 *   • `row`    — строка в списке/каталоге: счётчики + «Добавить себе»;
 *   • `tile`   — плитка сетки 3-в-ряд: только компактные счётчики, без кнопок;
 *   • `screen` — экран набора: ЯВНАЯ заметная кнопка лайка + «Добавить себе».
 *
 * Анимации только на transform/opacity (нажатие лайка — короткий pop).
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Text, TouchableOpacity, View } from 'react-native';
import type { Theme } from '../../constants/theme';
import { triLang, type Lang } from '../../constants/i18n';
import { actionToastTri, emitAppEvent, onAppEvent } from '../events';
import { useStudyTarget } from '../../components/StudyTargetContext';
import { getCanonicalUserId } from '../user_id_policy';
import type { FlashcardMarketPack } from '../flashcards/marketplace';
import { addCommunityPackToLibrary, toggleCommunityPackLike } from './communityPackActions';
import {
  addToLibraryOptimistic,
  mergeServerCounts,
  toggleLikeOptimistic,
  type PackSocialSnapshot,
} from './packSocial';
import { fetchCommunityPackSocialState } from './packSocialFirestore';
import { isCommunityPackLikedLocally } from './packSocialStorage';

export type CommunityPackSocialVariant = 'row' | 'tile' | 'screen';

type Props = {
  pack: FlashcardMarketPack;
  lang: Lang;
  t: Theme;
  /** Набор уже у пользователя — только тогда разрешён лайк. */
  owned: boolean;
  /** Набор в топе по лайкам — аккуратный акцент, без «премиальных» коннотаций. */
  isTop?: boolean;
  /** @deprecated используйте `variant="tile"`. */
  compact?: boolean;
  variant?: CommunityPackSocialVariant;
  onAdded?: (packId: string) => void;
};

export default function CommunityPackSocialBar({
  pack,
  lang,
  t,
  owned,
  isTop = false,
  compact = false,
  variant,
  onAdded,
}: Props) {
  const mode: CommunityPackSocialVariant = variant ?? (compact ? 'tile' : 'row');
  const isTile = mode === 'tile';
  const isScreen = mode === 'screen';

  /** Изоляция целей обучения: «Добавить себе» пишет владение по ТЕКУЩЕЙ цели. */
  const { studyTarget } = useStudyTarget();

  const [snapshot, setSnapshot] = useState<PackSocialSnapshot>(() => ({
    likesCount: pack.likesCount ?? 0,
    addedCount: pack.addedCount ?? 0,
    liked: false,
    added: owned,
  }));

  /**
   * Счётчик локальных действий пользователя (лайк / добавление).
   *
   * ПРИЧИНА БАГА «лайк не ставится», часть 3: фоновое чтение ниже перезаписывало
   * снимок значением, прочитанным ДО нажатия (AsyncStorage и Firestore отвечают
   * позже, чем пользователь жмёт), — сердце гасло, а цифра откатывалась. Теперь
   * результат чтения применяется только если за время запроса не было нажатий.
   */
  const opSeqRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    const seqAtStart = opSeqRef.current;
    void (async () => {
      /**
       * Членство (`pack_likes/{userId}`, `pack_adds/{userId}`) читаем только там, где
       * можно лайкнуть, — на экране набора. Плиткам каталога это лишние 2 чтения
       * Firestore КАЖДАЯ: их снимок обновляет событие `community_pack_like_changed`.
       */
      const userId = isTile ? null : await getCanonicalUserId().catch(() => null);
      const [liked, state] = await Promise.all([
        isCommunityPackLikedLocally(pack.id).catch(() => false),
        fetchCommunityPackSocialState(pack.id, userId).catch(() => ({
          counts: { likesCount: 0, addedCount: 0 },
          membership: null,
        })),
      ]);
      if (cancelled || opSeqRef.current !== seqAtStart) return;
      setSnapshot((prev) =>
        state.membership
          ? mergeServerCounts({ ...prev, liked, added: prev.added || owned }, state.counts, state.membership)
          : mergeServerCounts({ ...prev, liked, added: prev.added || owned }, {
              likesCount: Math.max(state.counts.likesCount, pack.likesCount ?? 0),
              addedCount: Math.max(state.counts.addedCount, pack.addedCount ?? 0),
            }),
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [pack.id, pack.likesCount, pack.addedCount, owned, isTile]);

  /**
   * Лайк ставится на экране набора, а плитка каталога живёт своим снимком —
   * без этого счётчик на плитке «отставал» до полного перезахода в раздел.
   * Идемпотентно: если состояние уже совпало, снимок не трогаем (никаких циклов).
   */
  useEffect(() => {
    const sub = onAppEvent('community_pack_like_changed', (e) => {
      if (e.packId !== pack.id) return;
      opSeqRef.current += 1;
      setSnapshot((prev) => (prev.liked === e.liked ? prev : toggleLikeOptimistic(prev)));
    });
    return () => sub.remove();
  }, [pack.id]);

  const isAdded = owned || snapshot.added;

  /** Короткий pop сердца — только scale/opacity. */
  const likePop = useRef(new Animated.Value(1)).current;
  const runLikePop = useCallback(() => {
    likePop.setValue(1);
    Animated.sequence([
      Animated.timing(likePop, { toValue: 1.18, duration: 110, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(likePop, { toValue: 1, duration: 140, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]).start();
  }, [likePop]);

  const likeLockedToast = useCallback(() => {
    emitAppEvent(
      'action_toast',
      actionToastTri('info', {
        ru: 'Сначала добавьте набор себе — потом можно поставить лайк.',
        uk: 'Спершу додайте набір собі — потім можна поставити лайк.',
        es: 'Primero añade el pack; después podrás darle me gusta.',
        'pt-BR': 'Primeiro adicione o pacote; depois você pode curtir.',
        vi: 'Hãy thêm bộ thẻ trước, sau đó bạn có thể thích.',
        id: 'Tambahkan paket dulu, setelah itu kamu bisa menyukainya.',
        tr: 'Önce paketi ekle, sonra beğenebilirsin.',
        pl: 'Najpierw dodaj zestaw do siebie — potem możesz polubić.',
      }),
    );
  }, []);

  const onLikePress = useCallback(() => {
    if (!isAdded) {
      likeLockedToast();
      return;
    }
    runLikePop();
    /** Оптимистично: цифра меняется сразу, сервер догоняет. */
    const expectedLiked = !snapshot.liked;
    opSeqRef.current += 1;
    setSnapshot((prev) => toggleLikeOptimistic(prev));
    void (async () => {
      const res = await toggleCommunityPackLike(pack.id);
      /**
       * Сверяемся с фактическим состоянием на устройстве: если параллельное нажатие
       * увело его в другую сторону, приводим цифру к правде, а не оставляем расхождение.
       */
      if (res.liked === expectedLiked) return;
      setSnapshot((prev) => (prev.liked === res.liked ? prev : toggleLikeOptimistic(prev)));
    })();
  }, [isAdded, likeLockedToast, runLikePop, pack.id, snapshot.liked]);

  const onAddPress = useCallback(() => {
    opSeqRef.current += 1;
    setSnapshot((prev) => addToLibraryOptimistic(prev));
    void (async () => {
      const res = await addCommunityPackToLibrary(pack, studyTarget);
      if (res === 'added' || res === 'already_added') onAdded?.(pack.id);
    })();
  }, [pack, onAdded, studyTarget]);

  const addedLabel = triLang(lang, {
    ru: 'добавили', uk: 'додали', en: 'added', es: 'lo añadieron',
    'pt-BR': 'adicionaram', vi: 'đã thêm', id: 'menambahkan', tr: 'ekledi', pl: 'dodało',
  });
  const addLabel = triLang(lang, {
    ru: 'Добавить себе', uk: 'Додати собі', en: 'Add to mine', es: 'Añadir',
    'pt-BR': 'Adicionar', vi: 'Thêm vào của tôi', id: 'Tambahkan', tr: 'Bana ekle', pl: 'Dodaj do siebie',
  });
  const ownedLabel = triLang(lang, {
    ru: 'В моих наборах', uk: 'У моїх наборах', en: 'In my packs', es: 'En mis packs',
    'pt-BR': 'Nos meus pacotes', vi: 'Trong bộ của tôi', id: 'Di paket saya', tr: 'Paketlerimde', pl: 'W moich zestawach',
  });
  const topLabel = triLang(lang, {
    ru: 'В топе', uk: 'У топі', en: 'Trending', es: 'En tendencia',
    'pt-BR': 'Em alta', vi: 'Nổi bật', id: 'Tren', tr: 'Popüler', pl: 'Na topie',
  });
  const likeLabel = triLang(lang, {
    ru: 'Нравится', uk: 'Подобається', en: 'Like', es: 'Me gusta',
    'pt-BR': 'Curtir', vi: 'Thích', id: 'Suka', tr: 'Beğen', pl: 'Lubię to',
  });
  const likeLockedHint = triLang(lang, {
    ru: 'Лайк — после добавления',
    uk: 'Лайк — після додавання',
    en: 'Like it after adding',
    es: 'Me gusta tras añadirlo',
    'pt-BR': 'Curtir após adicionar',
    vi: 'Thích sau khi thêm',
    id: 'Suka setelah ditambahkan',
    tr: 'Beğeni eklendikten sonra',
    pl: 'Polubienie po dodaniu',
  });

  const likeA11y = isAdded ? 'qa-pack-like' : 'qa-pack-like-locked';

  /** Плитка сетки: только компактные счётчики (лайк ставится на экране набора). */
  if (isTile) {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
          <Ionicons
            name={snapshot.liked ? 'heart' : 'heart-outline'}
            size={12}
            color={snapshot.liked ? t.accent : t.textMuted}
          />
          <Text style={{ color: t.textSecond, fontSize: 10, fontWeight: '700' }}>{snapshot.likesCount}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
          <Ionicons name="people-outline" size={12} color={t.textMuted} />
          <Text style={{ color: t.textSecond, fontSize: 10, fontWeight: '700' }}>{snapshot.addedCount}</Text>
        </View>
      </View>
    );
  }

  /** Экран набора: явная заметная кнопка лайка + «Добавить себе». */
  if (isScreen) {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <TouchableOpacity
          testID={`pack-like-${pack.id}`}
          accessibilityRole="button"
          accessibilityLabel={likeA11y}
          accessibilityState={{ disabled: !isAdded, selected: snapshot.liked }}
          accessibilityHint={isAdded ? undefined : likeLockedHint}
          accessible
          activeOpacity={0.85}
          onPress={onLikePress}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 7,
            paddingHorizontal: 14,
            paddingVertical: 10,
            borderRadius: 14,
            borderWidth: 1.5,
            borderColor: !isAdded ? t.border : snapshot.liked ? t.accent : `${t.accent}66`,
            backgroundColor: !isAdded ? 'transparent' : snapshot.liked ? `${t.accent}22` : `${t.accent}10`,
            opacity: isAdded ? 1 : 0.55,
          }}
        >
          <Animated.View style={{ transform: [{ scale: likePop }] }}>
            <Ionicons
              name={snapshot.liked ? 'heart' : 'heart-outline'}
              size={19}
              color={!isAdded ? t.textMuted : t.accent}
            />
          </Animated.View>
          <Text
            style={{
              color: !isAdded ? t.textMuted : t.accent,
              fontSize: 14,
              fontWeight: '800',
            }}
            numberOfLines={1}
          >
            {/* До добавления подпись не рисуем: иначе строка не влезает на узкий экран.
                Понятная подсказка приходит тостом по нажатию и в accessibilityHint. */}
            {isAdded ? `${likeLabel} · ${snapshot.likesCount}` : String(snapshot.likesCount)}
          </Text>
        </TouchableOpacity>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <Ionicons name="people-outline" size={16} color={t.textMuted} />
          <Text style={{ color: t.textSecond, fontSize: 13, fontWeight: '700' }}>{snapshot.addedCount}</Text>
        </View>

        <View style={{ flex: 1 }} />

        <TouchableOpacity
          testID={`pack-add-${pack.id}`}
          accessibilityRole="button"
          accessibilityLabel="qa-pack-add"
          accessible
          disabled={isAdded}
          onPress={onAddPress}
          activeOpacity={0.85}
          style={{
            borderRadius: 14,
            paddingVertical: 10,
            paddingHorizontal: 16,
            alignItems: 'center',
            borderWidth: 1,
            borderColor: isAdded ? `${t.correct}55` : 'transparent',
            backgroundColor: isAdded ? `${t.correct}22` : t.accent,
          }}
        >
          <Text
            style={{ color: isAdded ? t.correct : t.correctText, fontSize: 14, fontWeight: '800' }}
            numberOfLines={1}
          >
            {isAdded ? ownedLabel : addLabel}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <TouchableOpacity
          testID={`pack-like-${pack.id}`}
          accessibilityRole="button"
          accessibilityLabel={likeA11y}
          accessibilityState={{ disabled: !isAdded, selected: snapshot.liked }}
          onPress={onLikePress}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 5, opacity: isAdded ? 1 : 0.5 }}
        >
          <Animated.View style={{ transform: [{ scale: likePop }] }}>
            <Ionicons
              name={snapshot.liked ? 'heart' : 'heart-outline'}
              size={18}
              color={snapshot.liked && isAdded ? t.accent : t.textMuted}
            />
          </Animated.View>
          <Text
            style={{
              color: snapshot.liked && isAdded ? t.accent : t.textSecond,
              fontSize: 13,
              fontWeight: '700',
            }}
          >
            {snapshot.likesCount}
          </Text>
        </TouchableOpacity>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <Ionicons name="people-outline" size={18} color={t.textMuted} />
          <Text style={{ color: t.textSecond, fontSize: 13, fontWeight: '700' }}>{snapshot.addedCount}</Text>
          <Text style={{ color: t.textMuted, fontSize: 12 }}>{addedLabel}</Text>
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
              borderColor: `${t.accent}66`,
              backgroundColor: `${t.accent}1A`,
            }}
          >
            <Ionicons name="trending-up-outline" size={12} color={t.accent} />
            <Text style={{ color: t.accent, fontSize: 11, fontWeight: '800' }}>{topLabel}</Text>
          </View>
        ) : null}
      </View>

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
        <Text style={{ color: isAdded ? t.correct : t.accent, fontSize: 14, fontWeight: '800' }}>
          {isAdded ? ownedLabel : addLabel}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
