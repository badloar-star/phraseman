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
import { communityPackPriceRunes, type FlashcardMarketPack } from '../flashcards/marketplace';
import { addCommunityPackToLibrary, toggleCommunityPackLike } from './communityPackActions';
import {
  addToLibraryOptimistic,
  mergeServerCounts,
  toggleLikeOptimistic,
  type PackSocialSnapshot,
} from './packSocial';
import { fetchCommunityPackSocialState } from './packSocialFirestore';
import {
  formatCommentsCount,
  shouldShowCommentsCount,
} from './packComments';
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
  /**
   * Набор платный и ещё не добавлен — экран должен показать шит покупки.
   * Не передан (плитки сетки) — платный набор ведёт себя как прежде: соцбар
   * не умеет открывать модалки и не должен.
   */
  onRequestPurchase?: (pack: FlashcardMarketPack, priceRunes: number) => void;
  /**
   * Тап по счётчику откликов. Решение владельца 2026-09-04: из плитки и строки
   * открывает набор и прокручивает к ветке; на экране набора — просто прокрутка.
   * Не передан — счётчик показывается как обычная цифра, без нажатия.
   */
  onOpenComments?: (packId: string) => void;
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
  onRequestPurchase,
  onOpenComments,
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
   * Счётчик откликов.
   *
   * зачем отдельным состоянием, а не полем snapshot: он приходит из ТОГО ЖЕ
   * документа набора (`pack.commentsCount`), но не участвует в слиянии
   * membership — читать «мои отклики» ради цифры незачем. Стартовое значение
   * берётся из пропса, дальше его двигает событие: так плитка не отстаёт до
   * перезахода в раздел (жалоба, которая уже была на лайк).
   */
  const [commentsCount, setCommentsCount] = useState<number>(pack.commentsCount ?? 0);

  useEffect(() => {
    // Свежие данные каталога перебивают локальное значение только вверх по факту
    // прихода нового пропса: своя оптимистичная +1 живёт до следующего чтения.
    setCommentsCount(pack.commentsCount ?? 0);
  }, [pack.commentsCount]);

  useEffect(() => {
    const sub = onAppEvent('community_pack_comments_changed', (e) => {
      if (e.packId !== pack.id) return;
      // Складываем сдвиг, а не присваиваем: у каждого экрана своя цифра, и
      // навязывание абсолютного значения затирало бы чужой оптимистичный плюс.
      setCommentsCount((prev) => Math.max(0, prev + e.delta));
    });
    return () => sub.remove();
  }, [pack.id]);

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
    /**
     * Платный набор (владелец 2026-09-17, экран 8 макета рун) сначала просит
     * оплату, и решение принимает ЭКРАН — сюда шит покупки не ставим: соцбар
     * живёт ещё и в плитках сетки 3-в-ряд, где модалке не место.
     *
     * Бесплатный набор и любой СТАРЫЙ идут прежним путём: одно нажатие, без
     * подтверждений. Это прямое требование владельца — ввод платности не
     * должен ударить по тем, кто уже публиковал и уже пользуется.
     */
    const price = communityPackPriceRunes(pack);
    if (price > 0 && !isAdded && onRequestPurchase) {
      // Ранний выход обязан называть причину (правило «сперва логи»).
      console.log(`[PACK-BUY] add:paid pack=${pack.id} price=${price} -> sheet`); // guard-ok: ветка решения обязана логироваться и в релизе
      onRequestPurchase(pack, price);
      return;
    }
    opSeqRef.current += 1;
    setSnapshot((prev) => addToLibraryOptimistic(prev));
    void (async () => {
      const res = await addCommunityPackToLibrary(pack, studyTarget);
      if (res === 'added' || res === 'already_added') onAdded?.(pack.id);
    })();
  }, [pack, onAdded, studyTarget, isAdded, onRequestPurchase]);

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

  /**
   * Счётчик откликов «💬 N» — третьим после лайков и добавлений.
   *
   * Решения владельца 2026-09-04:
   *  • НОЛЬ СКРЫТ. «💬 0» на каждом наборе — поле мёртвых нулей и сигнал «тут
   *    никто не пишет». Лайк и добавление показывают ноль законно: их значок
   *    несёт ДЕЙСТВИЕ, а счётчик откликов — только число.
   *  • Порядок ♥ · 👥 · 💬 неизменен: первые два остаются там, где были, глаз
   *    не переучивается.
   *  • Тап ведёт к разговору; без обработчика — просто цифра.
   * Размеры повторяют соседние счётчики варианта, иначе ряд рассыпается.
   */
  const renderCommentsCount = (iconSize: number, fontSize: number, gap: number) => {
    // зачем экран набора — исключение из «ноль скрыт» (владелец 17.09.2026):
    // правило от 04.09 держит каталог и плитки без мёртвых нулей, но на самом
    // экране набора (variant="screen", единственное место с composer'ом) оно
    // создавало замкнутый круг — не было вообще НИКАКОЙ кнопки, чтобы открыть
    // шторку и написать ПЕРВЫЙ отклик, раз счётчик появлялся только после
    // первого же отклика. На экране набора значок виден всегда — это уже не
    // декоративный счётчик, а единственный вход в разговор.
    if (!isScreen && !shouldShowCommentsCount(commentsCount)) return null;
    const content = (
      <>
        <Ionicons
          name="chatbubble-outline"
          size={iconSize}
          color={onOpenComments ? t.accent : t.textMuted}
        />
        {shouldShowCommentsCount(commentsCount) ? (
          <Text
            style={{
              color: onOpenComments ? t.accent : t.textSecond,
              fontSize,
              fontWeight: '700',
            }}
          >
            {formatCommentsCount(commentsCount, lang)}
          </Text>
        ) : null}
      </>
    );
    if (!onOpenComments) {
      return (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap }}>{content}</View>
      );
    }
    // зачем крупная тач-зона с фоном на экране набора (владелец 17.09.2026:
    // «кнопка комментарии микро, хрен попадёшь»): раньше это была голая
    // иконка+текст без видимого пятна нажатия — тап работал только за счёт
    // hitSlop, но визуально не читался как кнопка (не как лайк/добавление
    // рядом, у которых есть padding и фон). На variant="screen" теперь то же
    // визуальное устройство, что у лайка: padding + скруглённый фон, без
    // обводки (запрет владельца на borderWidth вокруг контейнеров).
    return (
      <TouchableOpacity
        testID={`pack-comments-${pack.id}`}
        accessibilityRole="button"
        accessibilityLabel="qa-pack-comments"
        onPress={() => onOpenComments(pack.id)}
        activeOpacity={0.85}
        hitSlop={isScreen ? undefined : { top: 10, bottom: 10, left: 8, right: 8 }}
        style={
          isScreen
            ? {
                flexDirection: 'row',
                alignItems: 'center',
                gap,
                paddingHorizontal: 12,
                paddingVertical: 10,
                borderRadius: 14,
                backgroundColor: `${t.accent}10`,
              }
            : { flexDirection: 'row', alignItems: 'center', gap }
        }
      >
        {content}
      </TouchableOpacity>
    );
  };

  /** Плитка сетки: только компактные счётчики (лайк ставится на экране набора). */
  if (isTile) {
    // зачем gap 8, а не 10: замер макета показал, что три счётчика на плитке
    // шириной в треть экрана не помещаются при прежнем промежутке.
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
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
        {renderCommentsCount(12, 10, 3)}
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

        {renderCommentsCount(19, 14, 6)}

        <View style={{ flex: 1 }} />

        {/* зачем компактная иконка, а не текстовая плашка (владелец 17.09.2026,
            «убери большую плашку, вместо неё просто галочку»/«замени на просто
            плюсик»): «Добавить себе»/«В моих наборах» текстом дублировало то,
            что и так ясно из состояния (закрашенный кружок = уже моё) — та же
            логика, что уже применена к лайку выше (подпись прячется, когда
            смысл читается по цвету/иконке). 44×44 — минимальная цель тапа,
            hitSlop добивает до неё при 36×36 визуального круга. */}
        <TouchableOpacity
          testID={`pack-add-${pack.id}`}
          accessibilityRole="button"
          accessibilityLabel={isAdded ? ownedLabel : addLabel}
          accessibilityState={{ disabled: isAdded }}
          accessible
          disabled={isAdded}
          onPress={onAddPress}
          activeOpacity={0.85}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: isAdded ? `${t.correct}22` : t.accent,
          }}
        >
          <Ionicons
            name={isAdded ? 'checkmark' : 'add'}
            size={20}
            color={isAdded ? t.correct : t.correctText}
          />
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

        {renderCommentsCount(18, 13, 5)}

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
