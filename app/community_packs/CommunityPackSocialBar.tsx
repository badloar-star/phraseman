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
 *   • `screen` — экран набора: ЯВНАЯ заметная кнопка лайка + «Добавить себе»;
 *   • `list`   — строка каталога «Наборы сообщества» (packs-simple.html, 04.10): счётчики 18px, без кнопок;
 *   • `videoAdd` — строка списка «Из видео» (cards-section кадры 024–029): только мятная кнопка «Добавить» 98×34, после добавления — пилюля с галочкой;
 *   • `setAdd` / `setHeart` — Карточки 2.0 (cards-v2 setOther()): «Добавить себе +» (после добавления — «✓ В моих наборах») и круглое сердце в ряду
 *     кнопок экрана набора; `previewMeta` — строка «♥ N · 💬 N» под названием (тап по сердцу — лайк, только у добавленного набора);
 *   • `previewMeta` / `previewCta` — экран набора ДО добавления (packs-simple.html кадр 4): счётчики справа
 *     от автора и нижняя кнопка «Добавить себе». Логика добавления — та же `onAddPress`.
 *
 * Анимации только на transform/opacity (нажатие лайка — короткий pop).
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import { packAddFailureToast } from './packQuickAdd';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { logCardsOptimisticFrame, logCardsOptimisticStep, markCardsOptimisticTap } from '../flashcards/cards_optimistic_trace';
import { Animated, Easing, Text, TouchableOpacity, View } from 'react-native';
import { useLineScale } from '../../hooks/useLineScale';
import type { Theme } from '../../constants/theme';
import { useTheme } from '../../components/ThemeContext';
import { liquidGlassTokens } from '../../constants/liquidGlassThemePalette';
import { PackCta, PackGhostCta, PackRoundButton } from '../../components/packs/PackScreenKit';
import { triLang, type Lang } from '../../constants/i18n';
import { actionToastTri, emitAppEvent, onAppEvent } from '../events';
import { useStudyTarget } from '../../components/StudyTargetContext';
import { useEffectiveStudyTarget } from '../section_language';
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
import { isCommunityPackLikedLocally, setCommunityPackLikedLocally } from './packSocialStorage';
import { nestedBoxShadow } from '../../components/v2/ShadowSurface';
import { noteSwallowedAs } from '../swallow_log'; // зачем: PM-229 — немой catch → причина в журнале, значение по умолчанию прежнее

export type CommunityPackSocialVariant = 'row' | 'tile' | 'screen' | 'list' | 'previewMeta' | 'previewCta' | 'videoAdd' | 'videoAddRound' | 'setAdd' | 'setHeart';

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
  /** Подпись нижней кнопки `previewCta` до добавления (у набора из видео — «Учить набор»). */
  ctaLabel?: string;
  /** `setAdd`: вид кнопки «Добавить себе» — главная (по умолчанию) или спокойная плашка (рядом с «Тренировать»). */
  addStyle?: 'primary' | 'ghost';
  /**
   * зачем (координатор 11.10, экран ролика): у набора из видео после добавления нижняя кнопка не «глохнет», а ведёт к тренировке.
   * Оба поля заданы — вариант `previewCta` в добавленном состоянии показывает `ownedCtaLabel` и зовёт `onOwnedCtaPress`.
   */
  ownedCtaLabel?: string;
  onOwnedCtaPress?: () => void;
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
  ctaLabel,
  addStyle = 'primary',
  ownedCtaLabel,
  onOwnedCtaPress,
  onAdded,
  onRequestPurchase,
  onOpenComments,
}: Props) {
  // зачем (координатор 05.10, FONTSCALE2): межстрочный счётчиков и кнопок растёт с системным шрифтом
  const lh = useLineScale();
  // зачем (Liquid Glass, cards.html #18–19, #50, video.html #12–13): варианты `screen` и
  // `row` — на токенах стекла активной темы, без зелёного «добавлен» и цветных рамок.
  // Вариант `tile` НЕ меняем: он стоит на утверждённом владельцем хабе Карточек
  // (плитки «Лучшее у сообщества»), хаб трогать нельзя.
  const { liquidGlassThemeId } = useTheme();
  const g = liquidGlassTokens(liquidGlassThemeId);
  const mode: CommunityPackSocialVariant = variant ?? (compact ? 'tile' : 'row');
  const isTile = mode === 'tile';
  const isList = mode === 'list';
  const isPreviewMeta = mode === 'previewMeta';
  const isPreviewCta = mode === 'previewCta';
  const isVideoAdd = mode === 'videoAdd';
  const isVideoAddRound = mode === 'videoAddRound';
  const isSetAdd = mode === 'setAdd';
  const isSetHeart = mode === 'setHeart';
  // зачем: строки каталога, как и плитки, — без чтения членства (2 чтения Firestore на КАЖДЫЙ набор).
  // Экран просмотра тоже: набор ещё не добавлен, лайк закрыт — членство читать незачем.
  const isCatalog = isTile || isList || isPreviewMeta || isSetAdd || isSetHeart;
  const isScreen = mode === 'screen';

  /** Изоляция целей обучения: «Добавить себе» пишет владение по ТЕКУЩЕЙ цели. */
  const { studyTarget: globalStudyTarget } = useStudyTarget();
  // зачем (владелец 15.10, Ревизор a9486a249): внутри раздела «Видео»/«Карточки» язык — локальный выбор раздела, иначе набор из ролика на es лёг бы в чужой язык
  const studyTarget = useEffectiveStudyTarget(globalStudyTarget);

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
  // зачем (аудит Optimistic UI, 12.10): второй тап по «Добавить» в том же кадре (до перерисовки на «В моих наборах»)
  // запускал вторую запись и второй onAdded (двойной тост/переход). Замок меняется синхронно и снимается по завершении записи.
  const addInFlightRef = useRef(false);
  /** Лайк в полёте — повторный тап до ответа игнорируется (координатор 18.10). */
  const likeInFlightRef = useRef(false);

  useEffect(() => {
    // зачем: на экране просмотра цифры читает соседний `previewMeta`; кнопке второе чтение того же документа не нужно.
    // зачем (аудит кнопок Карточек #14/#15, 15.10, 💸): набор ролика клиент знает как `video:<id>`, а документ сообщества — `video_<id>`; чтение шло по неверному id и давало 3 пустых чтения Firestore на КАЖДУЮ строку.
    // Кнопки «Добавить» у видео-наборов ни лайков, ни цифр не показывают — читать нечего.
    if (isPreviewCta || isSetAdd || isSetHeart || isVideoAdd || isVideoAddRound) return undefined;
    let cancelled = false;
    const seqAtStart = opSeqRef.current;
    void (async () => {
      /**
       * Членство (`pack_likes/{userId}`, `pack_adds/{userId}`) читаем только там, где
       * можно лайкнуть, — на экране набора. Плиткам каталога это лишние 2 чтения
       * Firestore КАЖДАЯ: их снимок обновляет событие `community_pack_like_changed`.
       */
      const userId = isCatalog ? null : await getCanonicalUserId().catch(noteSwallowedAs('CommunityPackSocialBar:useEffect.getCanonicalUserId', null));
      const [liked, state] = await Promise.all([
        isCommunityPackLikedLocally(pack.id).catch(noteSwallowedAs('CommunityPackSocialBar:useEffect.isCommunityPackLikedLocally', false)),
        fetchCommunityPackSocialState(pack.id, userId).catch(() => ({
          counts: { likesCount: 0, addedCount: 0 },
          membership: null,
        })),
      ]);
      if (cancelled || opSeqRef.current !== seqAtStart) return;
      // зачем (проверка координатора 15.10, дыра №5): флаг лайка читался только из локального хранилища, а membership шла лишь в пересчёт цифры. После выхода/смены аккаунта (ACC-SWITCH стирает локальный флаг)
      // сердце оставалось пустым, а цифра показывала на один меньше серверной. Сервер говорит «лайк есть» — берём его и восстанавливаем локальный флаг.
      const serverLiked = state.membership?.liked === true;
      const likedNow = liked || serverLiked;
      // обратный случай (локально «есть», на сервере «нет») НЕ сбрасываем: это может быть ещё не доставленный лайк (решение координатора 15.10)
      console.log(`[PACK-LIKE] reconcile pack=${pack.id} source=${serverLiked && !liked ? 'server' : 'local'} local=${String(liked)} server=${state.membership ? String(serverLiked) : 'n/a'} shown=${String(likedNow)}`); // guard-ok: ветка решения
      if (serverLiked && !liked) {
        void setCommunityPackLikedLocally(pack.id, true).catch((error: unknown) => {
          console.warn(`[PACK-LIKE] ${pack.id}: восстановление локального флага не удалось`, error instanceof Error ? error.message : String(error)); // guard-ok: catch называет причину
        });
      }
      setSnapshot((prev) =>
        state.membership
          ? mergeServerCounts({ ...prev, liked: likedNow, added: prev.added || owned }, state.counts, state.membership)
          : mergeServerCounts({ ...prev, liked: likedNow, added: prev.added || owned }, {
              likesCount: Math.max(state.counts.likesCount, pack.likesCount ?? 0),
              addedCount: Math.max(state.counts.addedCount, pack.addedCount ?? 0),
            }),
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [pack.id, pack.likesCount, pack.addedCount, owned, isCatalog, isPreviewCta, isSetAdd, isSetHeart, isVideoAdd, isVideoAddRound]);

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
        ru: 'Сначала добавь набор себе — потом можно поставить лайк.',
        uk: 'Спершу додай набір собі — потім можна поставити лайк.',
        es: 'Primero añade el pack; después podrás darle me gusta.', en: 'First add the pack to your own; then you can like it.',
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
    // зачем (аудит Optimistic UI, координатор 15.10, дыра №6): пока идёт запись «Добавить себе», isAdded оптимистичный: лайк в этот момент обгонял откат добавления (кнопка навсегда «В моих», набора нет)
    if (addInFlightRef.current) {
      console.log(`[OPT-UI] pack_like ignored reason=add_in_flight pack=${pack.id}`); // guard-ok: ранний выход пишет причину
      return;
    }
    // зачем (координатор 18.10, решение по аудиту (в)): пока лайк в полёте, повторный тап не ставится в очередь — иначе при отказе облака
    // второй тап переворачивал уже откаченное сердце. Один запрос за раз; тап в это время пишет причину и ничего не меняет.
    if (likeInFlightRef.current) {
      console.log(`[OPT-UI] pack_like ignored reason=like_in_flight pack=${pack.id}`); // guard-ok: ранний выход пишет причину
      return;
    }
    likeInFlightRef.current = true;
    runLikePop();
    /** Оптимистично: цифра меняется сразу, сервер догоняет. */
    const expectedLiked = !snapshot.liked;
    opSeqRef.current += 1;
    setSnapshot((prev) => toggleLikeOptimistic(prev));
    const likeFailedToast = () => {
        // зачем (аудит Optimistic UI 05.10, п.4): откат больше не молчит — как у избранного видео.
        emitAppEvent('action_toast', expectedLiked
          ? actionToastTri('error', {
            ru: 'Не удалось поставить лайк. Попробуй ещё раз', uk: 'Не вдалося поставити вподобання. Спробуй ще раз',
            en: "Couldn't like the pack. Try again", es: 'No se pudo dar me gusta. Inténtalo de nuevo',
            'pt-BR': 'Não foi possível curtir. Tente de novo', vi: 'Không thích được. Hãy thử lại',
            id: 'Gagal menyukai. Coba lagi', tr: 'Beğenilemedi. Tekrar dene', pl: 'Nie udało się polubić. Spróbuj ponownie',
          })
          : actionToastTri('error', {
            ru: 'Не удалось убрать лайк. Попробуй ещё раз', uk: 'Не вдалося прибрати вподобання. Спробуй ще раз',
            en: "Couldn't remove the like. Try again", es: 'No se pudo quitar el me gusta. Inténtalo de nuevo',
            'pt-BR': 'Não foi possível remover a curtida. Tente de novo', vi: 'Không bỏ thích được. Hãy thử lại',
            id: 'Gagal membatalkan suka. Coba lagi', tr: 'Beğeni kaldırılamadı. Tekrar dene', pl: 'Nie udało się cofnąć polubienia. Spróbuj ponownie',
          }));
    };
    void (async () => {
      let res: Awaited<ReturnType<typeof toggleCommunityPackLike>>;
      try {
        res = await toggleCommunityPackLike(pack.id);
      } catch (error) {
        // зачем (FINAL_PHASE п.7): исключение оставляло цифру перевёрнутой навсегда — откатываем.
        console.warn(`[PACK-LIKE] ${pack.id}: переключение не удалось — откат к liked=${!expectedLiked}`, error); // guard-ok: catch называет причину
        setSnapshot((prev) => (prev.liked === expectedLiked ? toggleLikeOptimistic(prev) : prev));
        likeFailedToast();
        return;
      } finally {
        likeInFlightRef.current = false;
      }
      /**
       * Сверяемся с фактическим состоянием на устройстве: если параллельное нажатие
       * увело его в другую сторону, приводим цифру к правде, а не оставляем расхождение.
       * Отказ облака (rejected) вернул флаг назад — та же сверка откатывает сердце и цифру, плюс тост.
       */
      if (res.rejected) {
        console.warn(`[PACK-LIKE] ${pack.id}: облако не приняло — откат к liked=${res.liked}`); // guard-ok: откат по отказу облака
        likeFailedToast();
      }
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
    // зачем (ревью 12.10 п.5): платный набор БЕЗ обработчика покупки (плитка видео-набора и т.п.) раньше молча шёл в бесплатное добавление. Сейчас цена у них 0,
    // но дыра закрыта: цена > 0 без обработчика — отказ, причина в журнале и тост.
    if (price > 0 && !isAdded) {
      console.warn(`[PACK-BUY] add:paid_refused pack=${pack.id} price=${price} reason=no_purchase_handler`); // guard-ok: отказ платного добавления называет причину
      emitAppEvent('action_toast', actionToastTri('info', {
        ru: 'Это платный набор. Открой его страницу, чтобы купить.',
        uk: 'Це платний набір. Відкрий його сторінку, щоб купити.',
        en: 'This is a paid pack. Open its page to buy it.',
        es: 'Este pack es de pago. Abre su página para comprarlo.',
        'pt-BR': 'Este pacote é pago. Abra a página dele para comprar.',
        vi: 'Đây là bộ thẻ trả phí. Hãy mở trang của bộ để mua.',
        id: 'Ini paket berbayar. Buka halamannya untuk membeli.',
        tr: 'Bu paket ücretli. Satın almak için sayfasını aç.',
        pl: 'To płatny zestaw. Otwórz jego stronę, aby go kupić.',
      }));
      return;
    }
    if (addInFlightRef.current) {
      console.warn(`[PACK-SOCIAL] добавление pack=${pack.id}: уже в пути — повторный тап пропущен`); // guard-ok: ранний выход называет причину
      return;
    }
    addInFlightRef.current = true;
    // зачем (координатор 18.10, Optimistic UI): замер «тап “Добавить” → кадр “В моих” → запись → откат».
    markCardsOptimisticTap('pack_add', pack.id, { source: 'social_bar' });
    opSeqRef.current += 1;
    /** Снимок ДО оптимистичного шага — только по нему можно честно откатиться. */
    const before = snapshot;
    const seq = opSeqRef.current;
    setSnapshot((prev) => addToLibraryOptimistic(prev));
    logCardsOptimisticFrame('pack_add', 'ui_frame');
    void (async () => {
      // зачем (координатор 12.10, аудит Optimistic UI R1): исключение записи («Не получилось сохранить набор на телефоне») раньше уходило в необработанный reject — кнопка навсегда оставалась «В моих», хотя набора нет. Теперь это тот же откат с понятным сообщением, что у отказа.
      let res: string;
      try {
        res = await addCommunityPackToLibrary(pack, studyTarget);
      } catch (error: unknown) {
        res = `throw:${error instanceof Error ? error.name : typeof error}`;
        console.warn(`[OPT-UI] pack_add threw pack=${pack.id} kind=${res}`); // guard-ok: catch пишет причину
      }
      logCardsOptimisticStep('pack_add', 'stored', { result: res });
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
      // зачем (аудит Optimistic UI, координатор 15.10, дыра №6): свежее действие (например, пришедшее событие лайка) раньше отменяло откат ЦЕЛИКОМ — кнопка оставалась «В моих» без набора и без сообщения; теперь откатываем только «добавлено», чужое не затираем
      const newer = opSeqRef.current !== seq;
      console.warn(`[PACK-SOCIAL] добавление отклонено pack=${pack.id} причина=${res} newerAction=${String(newer)}`); // guard-ok
      setSnapshot(newer ? (prev) => ({ ...prev, added: before.added, addedCount: before.addedCount }) : before);
      logCardsOptimisticFrame('pack_add', 'rollback_frame', { result: res, newer });
      // зачем (баг владельца 11.10): добавление — локальная запись без сети, единственный отказ — `unavailable`
      // («этот набор добавить нельзя»). Прежний текст «Проверь связь» отправлял человека чинить интернет зря.
      emitAppEvent('action_toast', packAddFailureToast(res));
    })().finally(() => { addInFlightRef.current = false; });
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
          color={isCatalog ? g.secondary : (onOpenComments ? g.text : g.secondary)}
        />
        {shouldShowCommentsCount(commentsCount) ? (
          <Text
            style={{
              // зачем (PM-092, cards.html `.ptile .mt`): на плитке счётчики — тихая служебная строка
              // 12px вторичным тоном; прежний t.textSecond в стеклянной теме давал почти белый жирный.
              color: isCatalog ? g.secondary : (onOpenComments ? g.text : g.secondary),
              fontSize,
              fontWeight: isCatalog ? '500' : '700',
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
        accessibilityLabel={triLang(lang, { ru: 'Отклики', uk: 'Відгуки', en: 'Comments', es: 'Comentarios', 'pt-BR': 'Comentários', vi: 'Bình luận', id: 'Komentar', tr: 'Yorumlar', pl: 'Komentarze' })}
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
                backgroundColor: g.buttonFill,
                boxShadow: nestedBoxShadow(g), // зачем (стиль «Тень», серия cards-v2): контрол отделён малой тенью, а не плоской заливкой
              }
            : { flexDirection: 'row', alignItems: 'center', gap }
        }
      >
        {content}
      </TouchableOpacity>
    );
  };

  /** Плитка сетки: только компактные счётчики (лайк ставится на экране набора). */
  if (isPreviewMeta) {
    // зачем (cards-v2 setHead(): `likes()` в строке «уровень · N карточек · ♥ N»): сердце 18 + число 16 вторичным тоном, у добавленного набора
    // сердце — кнопка лайка (заливается, когда лайк стоит); отклики — тот же вход в обсуждение, ноль скрыт. 👥 в макете нет — не рисуем.
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 18 }}>
        <TouchableOpacity
          testID={`pack-like-${pack.id}`}
          accessibilityRole="button"
          accessibilityLabel={likeA11y}
          accessibilityState={{ disabled: !isAdded, selected: snapshot.liked }}
          accessibilityHint={isAdded ? undefined : likeLockedHint}
          activeOpacity={0.85}
          onPress={onLikePress}
          hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}
        >
          <Animated.View style={{ transform: [{ scale: likePop }] }}>
            <Ionicons name={snapshot.liked ? 'heart' : 'heart-outline'} size={18} color={snapshot.liked ? g.text : g.secondary} />
          </Animated.View>
          <Text style={{ color: g.secondary, fontSize: 16, lineHeight: lh(22), fontVariant: ['tabular-nums'] }}>{snapshot.likesCount}</Text>{/* guard-ok: счётчик, не подпись */}
        </TouchableOpacity>
        {renderCommentsCount(18, 16, 5)}
      </View>
    );
  }

  if (isSetHeart) {
    // зачем (cards-v2 setOther(false): круглое сердце 48 рядом с «Добавить себе +»): правило владельца «лайк — после добавления» сохранено:
    // до добавления сердце приглушено и объясняет причину тостом (onLikePress), после — ставит лайк.
    return (
      <PackRoundButton
        g={g}
        size={48}
        testID={`pack-like-${pack.id}`}
        icon={snapshot.liked ? 'heart' : 'heart-outline'}
        label={likeLabel}
        onPress={onLikePress}
        style={{ opacity: isAdded ? 1 : 0.5 }}
      />
    );
  }

  if (isSetAdd) {
    // зачем (cards-v2 setOther()): «Добавить себе +» — главная кнопка ряда; после добавления — «✓ В моих наборах» спокойной плашкой.
    // Логика добавления/покупки — та же `onAddPress` (оптимистично, откат при отказе, платный набор — шит покупки экрана).
    if (isAdded) {
      return <PackGhostCta g={g} grow icon="checkmark" label={ownedLabel} disabled onPress={onAddPress} testID={`pack-add-${pack.id}`} />;
    }
    return addStyle === 'ghost'
      ? <PackGhostCta g={g} grow trailingIcon="add" label={addLabel} onPress={onAddPress} testID={`pack-add-${pack.id}`} />
      : <PackCta g={g} grow trailingIcon="add" label={addLabel} onPress={onAddPress} testID={`pack-add-${pack.id}`} />;
  }

  if (isVideoAddRound) {
    // зачем (макет video-redesign #c1, экран 4): справа круглая «+» 40 (`.rd`); набор уже добавлен — галочка цветом акцента.
    // Логика добавления — та же `onAddPress` (оптимистично, откат при отказе).
    return (
      <TouchableOpacity
        testID={`pack-add-${pack.id}`}
        accessibilityRole="button"
        accessibilityLabel={isAdded ? ownedLabel : addLabel}
        accessibilityState={{ disabled: isAdded }}
        disabled={isAdded}
        onPress={onAddPress}
        activeOpacity={0.85}
        hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
        style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: g.buttonFill, boxShadow: nestedBoxShadow(g) }}
      >
        <Ionicons name={isAdded ? 'checkmark' : 'add'} size={20} color={isAdded ? g.accentText : g.text} />
      </TouchableOpacity>
    );
  }

  if (isVideoAdd) {
    // зачем (cards-v2 videoAll(): «Добавить +» — `.cta.sm` высотой 38 справа под кадром ролика): главная кнопка цвета темы с плюсом;
    // у уже добавленного набора — спокойная плашка с галочкой. Логика добавления — та же `onAddPress` (оптимистично, откат при отказе).
    const shortAdd = triLang(lang, {
      ru: 'Добавить', uk: 'Додати', en: 'Add', es: 'Añadir', 'pt-BR': 'Adicionar', vi: 'Thêm', id: 'Tambah', tr: 'Ekle', pl: 'Dodaj',
    });
    return isAdded
      ? <PackGhostCta g={g} small icon="checkmark" label={ownedLabel} disabled onPress={onAddPress} testID={`pack-add-${pack.id}`} style={{ minHeight: 38, borderRadius: 19 }} />
      : <PackCta g={g} small trailingIcon="add" label={shortAdd} accessibilityLabel={addLabel} onPress={onAddPress} testID={`pack-add-${pack.id}`} style={{ minHeight: 38, borderRadius: 19 }} />;
  }

  if (isPreviewCta) {
    // зачем (packs-simple.html кадр 4, `.ac-cta`): нижняя кнопка 52 на акценте темы; после добавления — «В моих наборах»,
    // а если экран дал `ownedCtaLabel` + `onOwnedCtaPress` (экран ролика) — активная кнопка «Тренировать».
    const ownedAction = isAdded && !!ownedCtaLabel && !!onOwnedCtaPress;
    const shownLabel = isAdded ? (ownedAction ? ownedCtaLabel : ownedLabel) : (ctaLabel ?? addLabel);
    return (
      <TouchableOpacity
        testID={`pack-add-${pack.id}`}
        accessibilityRole="button"
        accessibilityLabel={shownLabel}
        accessibilityState={{ disabled: isAdded && !ownedAction }}
        disabled={isAdded && !ownedAction}
        onPress={ownedAction ? onOwnedCtaPress : onAddPress}
        activeOpacity={0.88}
        style={{
          minHeight: 52,
          borderRadius: 26,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          backgroundColor: isAdded && !ownedAction ? g.buttonFill : g.ctaFill,
        }}
      >
        {isAdded ? <Ionicons name={ownedAction ? 'layers-outline' : 'checkmark'} size={18} color={ownedAction ? t.textOnGold : g.text} /> : null}
        {/* зачем: макет 17/700; шкала D145 (решение владельца 04.10) — 16. */}
        <Text style={{ color: isAdded && !ownedAction ? g.text : t.textOnGold, fontSize: 16, lineHeight: lh(22), fontWeight: '700' }}>
          {shownLabel}
        </Text>
      </TouchableOpacity>
    );
  }

  if (isList) {
    // зачем (packs-simple.html `.meta`): иконки 18, промежуток 18 между парами и 5 внутри (packs-simple.html перебивает kit 6); кегль 13 по D145 (макет 14).
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 18, marginTop: 4 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <Ionicons name={snapshot.liked ? 'heart' : 'heart-outline'} size={18} color={snapshot.liked ? g.text : g.secondary} />
          <Text style={{ color: g.secondary, fontSize: 13, lineHeight: lh(18), fontWeight: '500' }}>{snapshot.likesCount}</Text>{/* guard-ok: счётчик, не подпись */}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <Ionicons name="people-outline" size={18} color={g.secondary} />
          <Text style={{ color: g.secondary, fontSize: 13, lineHeight: lh(18), fontWeight: '500' }}>{snapshot.addedCount}</Text>{/* guard-ok: счётчик, не подпись */}
        </View>
        {renderCommentsCount(18, 13, 5)}
      </View>
    );
  }

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
          <Text style={{ color: g.secondary, fontSize: 13, lineHeight: lh(17), fontWeight: '500' }}>{snapshot.likesCount}</Text>{/* guard-ok: счётчик, не подпись */}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
          <Ionicons name="people-outline" size={12} color={g.secondary} />
          <Text style={{ color: g.secondary, fontSize: 13, lineHeight: lh(17), fontWeight: '500' }}>{snapshot.addedCount}</Text>{/* guard-ok: счётчик, не подпись */}
        </View>
        {renderCommentsCount(12, 10, 3)}
      </View>
    );
  }

  /** Экран набора: лайк · добавления · отклики + «Добавить себе» (макет cards.html #18–19). */
  if (isScreen) {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
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
            backgroundColor: isAdded ? g.buttonFill : g.cta,
          }}
        >
          {isAdded ? <Ionicons name="checkmark" size={18} color={g.text} /> : null}
          <Text style={{ color: isAdded ? g.text : g.ctaInk, fontSize: 16, lineHeight: lh(22), fontWeight: '700' }}>
            {isAdded ? ownedLabel : addLabel}
          </Text>
          {isAdded ? null : <Ionicons name="add" size={18} color={g.ctaInk} />}
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ gap: 10 }}>
      {/* зачем (аудит длинных строк 9 языков 13.10): «лайк · N добавили · отклики · В топе» в es «lo añadieron» + «En tendencia» дают ≈340 из ≈379 dp — на крупном шрифте ОС ряд вылезал за край; перенос на вторую строку вместо сжатия. */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 12, rowGap: 6 }}>
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
              boxShadow: nestedBoxShadow(g),
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
        disabled={isAdded}
        onPress={onAddPress}
        style={{
          borderRadius: 22,
          minHeight: 44,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: isAdded ? g.buttonFill : g.cta,
        }}
      >
        <Text style={{ color: isAdded ? g.text : g.ctaInk, fontSize: 13, fontWeight: '700' }}>
          {isAdded ? ownedLabel : addLabel}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
