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
import { useTheme } from '../../components/ThemeContext';
import { liquidGlassTokens } from '../../constants/liquidGlassThemePalette';
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
import { noteSwallowedAs } from '../swallow_log'; // зачем: PM-229 — немой catch → причина в журнале, значение по умолчанию прежнее

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
  // зачем (Liquid Glass, cards.html #18–19, #50, video.html #12–13): варианты `screen` и
  // `row` — на токенах стекла активной темы, без зелёного «добавлен» и цветных рамок.
  // Вариант `tile` НЕ меняем: он стоит на утверждённом владельцем хабе Карточек
  // (плитки «Лучшее у сообщества»), хаб трогать нельзя.
  const { liquidGlassThemeId } = useTheme();
  const g = liquidGlassTokens(liquidGlassThemeId);
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
      const userId = isTile ? null : await getCanonicalUserId().catch(noteSwallowedAs('CommunityPackSocialBar:useEffect.getCanonicalUserId', null));
      const [liked, state] = await Promise.all([
        isCommunityPackLikedLocally(pack.id).catch(noteSwallowedAs('CommunityPackSocialBar:useEffect.isCommunityPackLikedLocally', false)),
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
      let res: Awaited<ReturnType<typeof toggleCommunityPackLike>>;
      try {
        res = await toggleCommunityPackLike(pack.id);
      } catch (error) {
        // зачем (FINAL_PHASE п.7): исключение оставляло цифру перевёрнутой навсегда — откатываем тихо.
        console.warn(`[PACK-LIKE] ${pack.id}: переключение не удалось — откат к liked=${!expectedLiked}`, error);
        setSnapshot((prev) => (prev.liked === expectedLiked ? toggleLikeOptimistic(prev) : prev));
        return;
      }
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
    /** Снимок ДО оптимистичного шага — только по нему можно честно откатиться. */
    const before = snapshot;
    const seq = opSeqRef.current;
    setSnapshot((prev) => addToLibraryOptimistic(prev));
    void (async () => {
      const res = await addCommunityPackToLibrary(pack, studyTarget);
      if (res === 'added' || res === 'already_added') {
        onAdded?.(pack.id);
        return;
      }
      /**
       * Отказ добавления: возвращаем прежнее состояние и говорим человеку.
       *
       * зачем (аудит 2026-09-23): раньше отказ проглатывался — кнопка навсегда
       * оставалась «В моих», хотя набора у человека нет. При следующем заходе
       * он пропадал без объяснения, и это выглядело как потеря покупки.
       *
       * `seq` защищает от гонки: если человек успел нажать ещё раз, поздний
       * отказ не имеет права затирать более свежее состояние.
       */
      if (opSeqRef.current !== seq) {
        console.warn(`[PACK-SOCIAL] откат добавления пропущен: есть более свежее действие pack=${pack.id}`); // guard-ok
        return;
      }
      console.warn(`[PACK-SOCIAL] добавление отклонено pack=${pack.id} причина=${res}`); // guard-ok
      setSnapshot(before);
      emitAppEvent('action_toast', actionToastTri('error', {
        ru: 'Не удалось добавить набор. Проверьте связь и попробуйте ещё раз.',
        uk: 'Не вдалося додати набір. Перевірте зв’язок і спробуйте ще раз.',
        es: 'No se pudo añadir el pack. Comprueba la conexión e inténtalo de nuevo.',
      }));
    })();
  }, [pack, onAdded, studyTarget, isAdded, onRequestPurchase, snapshot]);

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
          color={isTile ? g.secondary : (onOpenComments ? g.text : g.secondary)}
        />
        {shouldShowCommentsCount(commentsCount) ? (
          <Text
            style={{
              // зачем (PM-092, cards.html `.ptile .mt`): на плитке счётчики — тихая служебная строка
              // 12px вторичным тоном; прежний t.textSecond в стеклянной теме давал почти белый жирный.
              color: isTile ? g.secondary : (onOpenComments ? g.text : g.secondary),
              fontSize,
              fontWeight: isTile ? '500' : '700',
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
                minHeight: 44,
                paddingHorizontal: 12,
                borderRadius: 22,
                backgroundColor: g.opaqueControl,
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
      // зачем (PM-092, cards.html `.ptile .mt`): строка прижата влево вместе с названием и автором,
      // 13px (шкала D145) вторичным тоном и обычным весом — счётчики не спорят с названием набора.
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', gap: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
          <Ionicons
            name={snapshot.liked ? 'heart' : 'heart-outline'}
            size={12}
            color={snapshot.liked ? g.text : g.secondary}
          />
          <Text style={{ color: g.secondary, fontSize: 13, lineHeight: 17, fontWeight: '500' }}>{snapshot.likesCount}</Text>{/* guard-ok: счётчик, не подпись */}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
          <Ionicons name="people-outline" size={12} color={g.secondary} />
          <Text style={{ color: g.secondary, fontSize: 13, lineHeight: 17, fontWeight: '500' }}>{snapshot.addedCount}</Text>{/* guard-ok: счётчик, не подпись */}
        </View>
        {renderCommentsCount(12, 10, 3)}
      </View>
    );
  }

  /** Экран набора: лайк · добавления · отклики + «Добавить себе» (макет cards.html #18–19). */
  if (isScreen) {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <TouchableOpacity
          testID={`pack-like-${pack.id}`}
          accessibilityRole="button"
          accessibilityLabel={likeA11y}
          accessibilityState={{ disabled: !isAdded, selected: snapshot.liked }}
          accessibilityHint={isAdded ? undefined : likeLockedHint}
          accessible
          activeOpacity={0.85}
          onPress={onLikePress}
          hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            minHeight: 44,
            paddingHorizontal: 8,
            // До добавления лайк приглушён (макет: 50%), но остаётся нажимаемым — тост объяснит.
            opacity: isAdded ? 1 : 0.5,
          }}
        >
          <Animated.View style={{ transform: [{ scale: likePop }] }}>
            <Ionicons
              name={snapshot.liked ? 'heart' : 'heart-outline'}
              size={20}
              color={g.text}
            />
          </Animated.View>
          <Text style={{ color: g.text, fontSize: 16, fontWeight: '600' }}>
            {snapshot.likesCount}
          </Text>
        </TouchableOpacity>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44, paddingHorizontal: 8 }}>
          <Ionicons name="people-outline" size={20} color={g.text} />
          <Text style={{ color: g.text, fontSize: 16, fontWeight: '600' }}>{snapshot.addedCount}</Text>
        </View>

        {renderCommentsCount(20, 16, 6)}

        <View style={{ flex: 1 }} />

        {/* зачем подпись снова видна (макет 30.09 «Добавить себе» / «В моих наборах»):
            17.09 владелец просил компактную иконку, но утверждённый макет
            возвращает пилюлю с текстом — рисуем макет. Цель тапа ≥44dp. */}
        <TouchableOpacity
          testID={`pack-add-${pack.id}`}
          accessibilityRole="button"
          accessibilityLabel={isAdded ? ownedLabel : addLabel}
          accessibilityState={{ disabled: isAdded }}
          accessible
          disabled={isAdded}
          onPress={onAddPress}
          activeOpacity={0.85}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            minHeight: 44,
            paddingHorizontal: 16,
            borderRadius: 22,
            backgroundColor: isAdded ? g.opaqueControl : g.cta,
          }}
        >
          {isAdded ? <Ionicons name="checkmark" size={18} color={g.text} /> : null}
          <Text style={{ color: isAdded ? g.text : g.ctaInk, fontSize: 16, lineHeight: 22, fontWeight: '700' }}>
            {isAdded ? ownedLabel : addLabel}
          </Text>
          {isAdded ? null : <Ionicons name="add" size={18} color={g.ctaInk} />}
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
              color={snapshot.liked && isAdded ? g.text : g.secondary}
            />
          </Animated.View>
          <Text
            style={{
              color: snapshot.liked && isAdded ? g.text : g.secondary,
              fontSize: 13,
              fontWeight: '700',
            }}
          >
            {snapshot.likesCount}
          </Text>
        </TouchableOpacity>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <Ionicons name="people-outline" size={18} color={g.secondary} />
          <Text style={{ color: g.secondary, fontSize: 13, fontWeight: '700' }}>{snapshot.addedCount}</Text>
          <Text style={{ color: g.mutedText, fontSize: 13 }}>{addedLabel}</Text>
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
              backgroundColor: g.opaqueControl,
            }}
          >
            <Ionicons name="trending-up-outline" size={12} color={g.text} />
            <Text style={{ color: g.text, fontSize: 13, fontWeight: '700' }}>{topLabel}</Text>
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
          borderRadius: 22,
          minHeight: 44,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: isAdded ? g.opaqueControl : g.cta,
        }}
      >
        <Text style={{ color: isAdded ? g.text : g.ctaInk, fontSize: 13, fontWeight: '700' }}>
          {isAdded ? ownedLabel : addLabel}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
