/**
 * Шторка откликов под набором сообщества (владелец 2026-09-17: «сделай макет —
 * я хочу чтобы кнопка комментарии была в каждом наборе»). Модель и Firestore-слой
 * уже существовали (packComments.ts, packCommentsFirestore.ts) — этого экрана
 * не хватало, чтобы их показать. Формат и порядок действий — по макету
 * docs/design/pack-comments-and-edit/2026-09-17-pack-edit-comments-bell.html:
 * шторка снизу поверх экрана набора, один уровень без ответов на ответы,
 * закреплённый отклик автора сверху, «···» → закрепить/скрыть (автору набора)
 * или пожаловаться (любому), композер снизу видим только добавившим набор.
 *
 * зачем открывается deep-link'ом с подсветкой (highlightCommentId): колокольчик
 * на Главной должен вести прямо к новому отклику без промежуточных экранов
 * (owner-решение — см. тот же макет, раздел 3).
 */
import { logNoErrorScreen } from '../no_error_screen_log';
import { useLoadGate } from '../use_load_gate';
import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  Modal,
  Pressable,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import AvatarView from '../../components/AvatarView';
import HybridSheetShell from '../../components/modal_fx/HybridSheetShell';
import { useGlassSheetContentMaxHeight } from '../../components/modal_fx/useGlassSheetContentMaxHeight';
import { useTheme } from '../../components/ThemeContext';
import { liquidGlassTokens } from '../../constants/liquidGlassThemePalette';
import { normalizeSafeAreaBottomInset } from '../../hooks/use-screen';
import { useStableSafeAreaInsets } from '../stable_safe_area_metrics';
import { USER_AVATAR_AURA_KEY } from '../../constants/customization_storage_keys';
import { triLang, type Lang } from '../../constants/i18n';
import { hapticError, hapticSuccess, hapticTap } from '../../hooks/use-haptics';
import { useMyCoinRankBinding } from '../../hooks/use_my_coin_rank';
import { Image as CoinImage } from 'expo-image';
import { COIN_RANK_TABLE, isValidCoinRank } from '../coin_rank_table_v1';
import { actionToastTri, emitAppEvent } from '../events';
import { getCanonicalUserId } from '../user_id_policy';
import ReportCommentModal from './ReportCommentModal';
import { resolveCommunityAuthorProfile, type CommunityAuthorProfile } from './packAuthorNames';
import {
  PACK_COMMENT_MAX_LENGTH,
  commentCounterState,
  mergeServerComments,
  normalizePackCommentText,
  sortPackComments,
  validatePackComment,
  type PackComment,
} from './packComments';
import {
  canWritePackComment,
  deletePackComment,
  fetchPackComments,
  hidePackCommentByAuthor,
  publishPackComment,
  setPackCommentPinned,
  togglePackCommentReaction,
} from './packCommentsFirestore';
import { registerCommunityPackAddRemote } from './packSocialFirestore';
import { noteSwallowed } from '../swallow_log'; // зачем: PM-229 — немой catch → причина в журнале, значение по умолчанию прежнее
import { peekStableId } from '../stable_id';

const EXEMPT_COLOR_1 = 'rgba(0,0,0,0.58)'; // theme-exempt: затемнение под шторкой — тёмный скрим в любой теме

type Props = {
  visible: boolean;
  packId: string;
  packTitle: string;
  /** Мой canonical uid == автор набора? Решает, что показывает меню «···». */
  isPackAuthor: boolean;
  /**
   * stable_id автора НАБОРА (не «я»). Нужен отдельно от isPackAuthor, чтобы
   * бейдж «автор» на комментарии видел КАЖДЫЙ читатель ветки, а не только сам
   * автор набора, глядя на свой же комментарий (аудит 2026-09-17, находка про
   * тавтологичное условие бейджа).
   */
  packAuthorStableId?: string | null;
  /**
   * Набор уже мой (добавлен себе ИЛИ я автор) — известно НАДЁЖНО и МГНОВЕННО
   * от родителя (flashcards_collection.tsx: packOwnedByMe), в отличие от
   * серверной проверки canWritePackComment здесь же.
   *
   * зачем это устраняет реальный баг (владелец 17.09.2026, «добавил, поле не
   * появилось»): добавление набора пишет владение ЛОКАЛЬНО мгновенно
   * (communityPackActions.ts:addCommunityPackToLibrary), а серверную запись
   * pack_adds/{uid}, от которой раньше зависел ЕДИНСТВЕННЫЙ источник canWrite
   * здесь, шлёт ФОНОМ через void bumpAddedCountOnce → registerCommunityPackAddRemote
   * (никто её не ждёт). Тап «Добавить себе» → тут же тап на счётчик комментариев
   * → шторка спрашивает СЕРВЕР, у которого документ ещё не успел долететь по
   * сети → canWrite=false, хотя человек только что нажал «добавить». Теперь
   * локальный факт (тот же самый источник, что красит иконку ✓ на кнопке) —
   * это исходное значение canWrite; серверный canWritePackComment остаётся
   * фоновой подстраховкой (тоже добавляет `true`, никогда не отбирает то, что
   * уже разрешил надёжный локальный факт).
   */
  ownedLocally: boolean;
  lang: Lang;
  onClose: () => void;
  /** Отклик, к которому нужно проскроллить и подсветить (deep-link из колокольчика). */
  highlightCommentId?: string | null;
};

/**
 * Мой аватар/рамка/аура — читаются напрямую из AsyncStorage (владелец
 * 17.09.2026, второе мнение советника): для СВОЕГО оптимистичного комментария
 * не ждём сеть и не идём через public_profiles (та — серверная проекция,
 * обновляется по расписанию клиентом при смене косметики, могла ещё не
 * подхватить только что купленную вещь). Тот же локальный источник уже
 * питает Главную/профиль.
 */
async function loadMyAvatarLocally(): Promise<CommunityAuthorProfile> {
  try {
    const [avatar, frame, aura] = await Promise.all([
      AsyncStorage.getItem('user_avatar'),
      AsyncStorage.getItem('user_frame'),
      AsyncStorage.getItem(USER_AVATAR_AURA_KEY),
    ]);
    return { name: '', avatar: avatar ?? '', frame: frame ?? '', aura: aura ?? '' };
  } catch (e) {
    console.warn(`[PACK-COMMENTS] свой аватар не прочитан → пустой: ${e instanceof Error ? e.message : String(e)}`); // guard-ok: catch называет причину
    return { name: '', avatar: '', frame: '', aura: '' };
  }
}

function timeAgoLabel(ms: number, lang: Lang): string {
  const diff = Date.now() - ms;
  const min = Math.floor(diff / 60_000);
  if (min < 1) return triLang(lang, { ru: 'сейчас', uk: 'щойно', en: 'now', es: 'ahora', 'pt-BR': 'agora', vi: 'vừa xong', id: 'baru saja', tr: 'şimdi', pl: 'teraz' });
  if (min < 60) return triLang(lang, { ru: `${min} мин`, uk: `${min} хв`, en: `${min}m`, es: `${min} min`, 'pt-BR': `${min} min`, vi: `${min} phút`, id: `${min} mnt`, tr: `${min} dk`, pl: `${min} min` });
  const hr = Math.floor(min / 60);
  if (hr < 24) return triLang(lang, { ru: `${hr} ч`, uk: `${hr} год`, en: `${hr}h`, es: `${hr} h`, 'pt-BR': `${hr} h`, vi: `${hr} giờ`, id: `${hr} jam`, tr: `${hr} sa`, pl: `${hr} godz` });
  const day = Math.floor(hr / 24);
  return triLang(lang, { ru: `${day} дн`, uk: `${day} дн`, en: `${day}d`, es: `${day} d`, 'pt-BR': `${day} d`, vi: `${day} ngày`, id: `${day} hr`, tr: `${day} gün`, pl: `${day} dni` });
}

/** Последняя серверная лента комментариев по набору: память процесса, ключ — аккаунт и набор; не больше 20 наборов. */
const packCommentsMemory = new Map<string, PackComment[]>();
const PACK_COMMENTS_MEMORY_MAX = 20;
/** Сколько ждём ленту, прежде чем сказать «не удалось загрузить» (PM-214 A2). */
const PACK_COMMENTS_LOAD_DEADLINE_MS = 8_000;
function packCommentsMemoryKey(packId: string): string | null {
  const owner = peekStableId();
  return owner ? `${owner}:${packId}` : null;
}
function peekPackCommentsMemory(packId: string): PackComment[] | null {
  const key = packCommentsMemoryKey(packId);
  return key ? (packCommentsMemory.get(key) ?? null) : null;
}
function rememberPackCommentsMemory(packId: string, list: PackComment[]): void {
  const key = packCommentsMemoryKey(packId);
  if (!key) return;
  packCommentsMemory.delete(key);
  packCommentsMemory.set(key, list);
  while (packCommentsMemory.size > PACK_COMMENTS_MEMORY_MAX) {
    const oldest = packCommentsMemory.keys().next().value;
    if (oldest === undefined) break;
    packCommentsMemory.delete(oldest);
  }
}

/**
 * зачем (аудит Карточек #12): действие без идентичности раньше выходило молча. Теперь — причина в журнал и короткий тост.
 */
function notifyPackCommentsIdentityPending(action: 'send' | 'retry' | 'reaction', packId: string): void {
  console.warn(`[PACK-COMMENTS-COMPOSER] ${action}: идентичность ещё не получена — действие не выполнено, тост «секунду» packId=${packId}`); // guard-ok: ранний выход называет причину
  emitAppEvent('action_toast', actionToastTri('info', {
    ru: 'Секунду — загружаем комментарии. Попробуй ещё раз.', uk: 'Секунду — завантажуємо коментарі. Спробуй ще раз.', en: 'One moment — loading comments. Try again.', es: 'Un momento: cargando comentarios. Inténtalo de nuevo.',
    'pt-BR': 'Um momento: carregando comentários. Tente de novo.', vi: 'Chờ chút — đang tải bình luận. Hãy thử lại.', id: 'Sebentar — memuat komentar. Coba lagi.', tr: 'Bir saniye — yorumlar yükleniyor. Tekrar dene.', pl: 'Chwileczkę — ładujemy komentarze. Spróbuj ponownie.',
  }));
}

export default function PackCommentsSheet({ visible, packId, packTitle, isPackAuthor, packAuthorStableId, ownedLocally, lang, onClose, highlightCommentId }: Props) {
  const { theme: t, f, liquidGlassThemeId } = useTheme();
  // зачем: Liquid Glass 1 в 1 с макета cards.html #comments — все нейтральные
  // поверхности/CTA берутся из токенов активной из 13 тем; семантика ошибки (t.wrong) не трогается.
  const glass = liquidGlassTokens(liquidGlassThemeId);
  const sheetContentMaxHeight = useGlassSheetContentMaxHeight(visible);
  const menuInsets = useStableSafeAreaInsets();
  const [myUserId, setMyUserId] = useState<string | null>(null);
  // зачем стартовое значение — сразу ownedLocally || isPackAuthor, не false
  // (владелец 17.09.2026, реальный баг «добавил, поле не появилось»): раньше
  // композер был гарантированно скрыт до конца серверного похода, даже когда
  // локально уже точно известно, что набор мой. Первый кадр теперь честный.
  const [canWrite, setCanWrite] = useState(ownedLocally || isPackAuthor);
  /**
   * зачем отдельно от canWrite (владелец 17.09.2026, «добавил → написал →
   * permission-denied»): canWrite=true может быть поднят ТОЛЬКО локальным
   * фактом (ownedLocally), пока сервер ещё не подтвердил `pack_adds/{uid}` —
   * именно так рвётся ПЕРВАЯ отправка комментария сразу после «Добавить
   * себе» (см. докстринг ownedLocally выше). true, когда сервер САМ ответил
   * addedByMe=true либо я автор набора (publishLocalAuthorPack не требует
   * pack_adds для автора — см. isPackAuthor(packId) в firestore.rules).
   */
  const serverConfirmedWriteRef = useRef(isPackAuthor);
  const [comments, setComments] = useState<PackComment[]>([]);
  const [loading, setLoading] = useState(true);
  // зачем (PM-214 A2): без офлайн-дедлайна спиннер мог крутиться без конца. После PACK_COMMENTS_LOAD_DEADLINE_MS сообщаем «не удалось загрузить»
  // с повтором; запоздавший ответ всё равно сливается в список тем же путём.
  const [loadFailed, setLoadFailed] = useState(false);
  // зачем (координатор 12.10, cards-052 «Набор не добавлен — писать нельзя»): подсказка «писать могут те, кто добавил набор» показывается только когда проверка права записи ЗАВЕРШИЛАСЬ и ответ отрицательный —
  // иначе она мигала бы у тех, кому писать можно (canWrite поднимается асинхронно).
  const [writeCheckDone, setWriteCheckDone] = useState(false);
  const [reloadTick, setReloadTick] = useState(0);
  // зачем (правило владельца 01.10 и 18.10, координатор 08:00): сбой чтения комментариев без кэша — не экран ошибки, а тихий повтор (паузы 1/3/8 с, затем при возврате в приложение) и обычное пустое состояние; причина — [NO-ERROR-SCREEN] pack_comments.
  const commentsLoadFailedEmpty = loadFailed && comments.length === 0;
  // зачем (Ревизор 18.10 08:30, 🔴 автоповтор раз в ~1 с): на время повтора loadFailed сбрасывался и status становился 'ready' → счётчик обнулялся. Теперь идущая загрузка — 'loading' (счётчик не трогаем),
  // 'ready' только когда нет ни загрузки, ни сбоя; не больше 3 попыток 1/3/8 с, затем повтор при возврате в приложение.
  const commentsGateStatus = loading ? 'loading' : commentsLoadFailedEmpty ? 'error' : 'ready';
  useLoadGate({
    id: 'pack-comments',
    status: commentsGateStatus,
    retry: () => { logNoErrorScreen('pack_comments', 'silent_retry', 'skeleton_retrying'); setReloadTick((tick) => tick + 1); },
    enabled: visible && commentsLoadFailedEmpty,
  });
  useEffect(() => {
    if (visible && commentsLoadFailedEmpty) logNoErrorScreen('pack_comments', 'load_failed_empty', 'quiet_empty');
  }, [visible, commentsLoadFailedEmpty]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const sendLockRef = useRef(false);
  const [menuFor, setMenuFor] = useState<PackComment | null>(null);
  const [reportFor, setReportFor] = useState<PackComment | null>(null);
  const listRef = useRef<FlatList<PackComment>>(null);
  /** Поле ввода: тап «Ответить» ставит в него фокус, чтобы не тапать второй раз. */
  const composerRef = useRef<TextInput>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  /** authorId → профиль (avatar/frame/aura), для рендера настоящих аватарок вместо emoji. */
  const [profiles, setProfiles] = useState<Record<string, CommunityAuthorProfile>>({});
  const [myAvatarProfile, setMyAvatarProfile] = useState<CommunityAuthorProfile | null>(null);
  // зачем (cards-052, образец cards-states `.cmt .av`): аватар отклика = монета ранга автора, как везде в 2.0; свой ранг — из локального состояния (мгновенно, без сети)
  const myCoinRank = useMyCoinRankBinding()?.rank ?? null;
  /**
   * зачем (аудит 2026-09-17, «закрытие во время отправки теряет черновик»):
   * шторка размонтируется целиком при закрытии (`{commentsSheetOpen && <PackCommentsSheet/>}`
   * в flashcards_collection.tsx), а async-хвосты publishPackComment/deletePackComment/
   * togglePackCommentReaction продолжают выполняться и после этого. Без этого флага
   * их `setComments` после закрытия — не баг React (setState на размонтированном
   * компоненте молча не делает ничего), но означает, что человек видит, как
   * написанный текст пропадает с экрана ДО ответа сервера, хотя на сервер он уже
   * ушёл — «я написал, оно исчезло». Все async-обработчики проверяют этот флаг
   * перед setState; сама отправка на сервер не отменяется — комментарий долетит,
   * просто следующий заход в шторку прочитает его заново с сервера.
   */
  const unmountedRef = useRef(false);
  useEffect(() => () => { unmountedRef.current = true; }, []);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    void loadMyAvatarLocally().then((p) => { if (!cancelled) setMyAvatarProfile(p); });
    return () => { cancelled = true; };
  }, [visible]);

  /**
   * Батч-подгрузка профилей (avatar/frame/aura) уникальных авторов текущей
   * страницы (второе мнение советника, 17.09.2026): не по одному чтению на
   * комментарий — `resolveCommunityAuthorProfile` сам кэширует по sid (24ч,
   * AsyncStorage), поэтому повторные открытия одной ветки почти всегда бьют
   * в кэш без единого сетевого чтения. Догружаем только тех авторов, чьего
   * профиля ещё нет в `profiles` — новый комментарий не перезапрашивает уже
   * известных.
   */
  useEffect(() => {
    const uniqueIds = Array.from(new Set(comments.map((c) => c.authorId))).filter((id) => id && !(id in profiles));
    if (!uniqueIds.length) return;
    let cancelled = false;
    if (__DEV__) console.log('[PACK-COMMENT-AVATAR] догружаю профили', { packId, uniqueIds });
    void Promise.all(uniqueIds.map(async (id) => [id, await resolveCommunityAuthorProfile(id)] as const)).then((entries) => {
      if (cancelled) return;
      setProfiles((prev) => {
        const next = { ...prev };
        for (const [id, profile] of entries) next[id] = profile;
        return next;
      });
    });
    return () => { cancelled = true; };
  }, [comments, profiles, packId]);

  // зачем ownedLocally правит canWrite СРАЗУ, отдельным эффектом (владелец
  // 17.09.2026, реальный баг): родитель обновляет packOwnedByMe сразу после
  // «Добавить себе» (локальный AsyncStorage-факт, без похода в сеть) — эта
  // правка обязана долететь до уже открытой шторки немедленно, а не только
  // при следующем открытии. Только ПОДНИМАЕМ canWrite, никогда не опускаем:
  // если сервер уже разрешил писать (или человек сам печатает черновик),
  // временный false в ownedLocally (например при смене набора) не должен
  // выключить то, что уже было разрешено этой же сессией шторки.
  useEffect(() => {
    if (ownedLocally || isPackAuthor) {
      if (__DEV__) console.log('[PACK-COMMENTS-COMPOSER] ownedLocally/isPackAuthor подняли canWrite мгновенно', { packId, ownedLocally, isPackAuthorProp: isPackAuthor });
      setCanWrite(true);
    }
  }, [ownedLocally, isPackAuthor, packId]);

  useEffect(() => {
    // [PACK-COMMENTS-COMPOSER] правило проекта «сперва логи»: жалоба владельца
    // «нет поля ввода» — трасса показывает КАЖДОЕ значение, решившее canWrite,
    // а не голое true/false. __DEV__-only (PERF-GUARD), временная до диагноза.
    if (!visible || !packId) return;
    if (__DEV__) console.log('[PACK-COMMENTS-COMPOSER] эффект стартовал', { packId, isPackAuthorProp: isPackAuthor, ownedLocally });
    let cancelled = false;
    // зачем (аудит «мгновенное открытие», 04.10): спиннер крутился на КАЖДОМ открытии, даже если ленту этого набора только что видели. Теперь, если
    // в памяти есть последняя серверная лента для этого аккаунта и набора, показываем её сразу, а загрузка идёт фоном и сливается через mergeServerComments.
    const remembered = peekPackCommentsMemory(packId);
    setLoadFailed(false);
    setWriteCheckDone(false);
    if (remembered) {
      setComments((prev) => mergeServerComments(prev, remembered));
      setLoading(false);
    } else {
      setLoading(true);
    }
    void (async () => {
      const uid = await getCanonicalUserId().catch((e) => {
        if (__DEV__) console.log('[PACK-COMMENTS-COMPOSER] getCanonicalUserId упал', { packId, reason: e instanceof Error ? e.message : String(e) });
        return null;
      });
      if (__DEV__) console.log('[PACK-COMMENTS-COMPOSER] uid получен', { packId, uid, hasUid: !!uid });
      // зачем (аудит Карточек #12, координатор 15.10): uid — локальная идентичность, сеть ему не нужна. Раньше его ставили только
      // после ленты и права писать (потолок 8 с) — на медленной сети «Отправить», повтор и реакции молча ничего не делали.
      if (!cancelled && uid) setMyUserId(uid);
      const pending = Promise.all([
        uid ? canWritePackComment(packId, uid) : Promise.resolve(false),
        fetchPackComments(packId, uid),
      ]);
      const raced = await Promise.race([
        pending,
        new Promise<null>((resolve) => { setTimeout(() => resolve(null), PACK_COMMENTS_LOAD_DEADLINE_MS); }),
      ]);
      let result = raced;
      if (result === null) {
        console.warn(`[PACK-COMMENTS] load:deadline packId=${packId} afterMs=${PACK_COMMENTS_LOAD_DEADLINE_MS} — показываем «не удалось загрузить», ответ ещё ждём`);
        if (!cancelled) {
          setLoadFailed(true);
          setLoading(false);
        }
        result = await pending.catch((error: unknown) => {
          console.warn('[PACK-COMMENTS] load:late_failed', error instanceof Error ? error.message : String(error));
          return null;
        });
        if (!result) return;
      }
      const [addedByMe, serverComments] = result;
      if (__DEV__) console.log('[PACK-COMMENTS-COMPOSER] canWritePackComment вернул', { packId, uid, addedByMe, isPackAuthorProp: isPackAuthor, ownedLocally });
      if (addedByMe || isPackAuthor) serverConfirmedWriteRef.current = true;
      if (cancelled) {
        if (__DEV__) console.log('[PACK-COMMENTS-COMPOSER] эффект отменён (компонент размонтирован/visible сменился) — canWrite НЕ применён', { packId });
        return;
      }
      setMyUserId(uid);
      // зачем isPackAuthor/ownedLocally тоже разрешают писать (владелец
      // 17.09.2026): publishLocalAuthorPack не добавляет набор автору в
      // pack_adds — без isPackAuthor автор, ни разу не нажавший «Добавить
      // себе» на СВОЁМ наборе, не увидел бы композер. ownedLocally нужен
      // отдельно от addedByMe (серверного ответа), потому что серверная
      // запись pack_adds/{uid} пишется ФОНОМ после локального добавления
      // (communityPackActions.ts: bumpAddedCountOnce вызывает
      // registerCommunityPackAddRemote через void, никто её не ждёт) — сразу
      // после «Добавить себе» сервер ещё может не знать, хотя человек уже
      // добавил. Синхронизировано с allow create в firestore.rules
      // (packAddedByMe() || isPackAuthor(packId)): сервер рано или поздно
      // подтвердит то же самое, просто позже локального факта.
      const finalCanWrite = addedByMe || isPackAuthor || ownedLocally;
      if (__DEV__) console.log('[PACK-COMMENTS-COMPOSER] итоговый canWrite (композер покажется, если true)', { packId, finalCanWrite, addedByMe, isPackAuthorProp: isPackAuthor, ownedLocally });
      // guard-ok: только поднимаем canWrite (|| с текущим значением), никогда
      // не опускаем — та же защита от гонки, что в отдельном эффекте выше.
      setCanWrite((prev) => prev || finalCanWrite);
      setWriteCheckDone(true);
      if (__DEV__) console.log('[PACK-COMMENTS-COMPOSER] проверка права записи завершена', { packId, finalCanWrite });
      rememberPackCommentsMemory(packId, serverComments);
      setComments((prev) => mergeServerComments(prev, serverComments));
      setLoadFailed(false);
      setLoading(false);
    })();
    return () => { cancelled = true; };
    // зачем БЕЗ ownedLocally в deps (владелец: «оставил коммент, он пропал»):
    // ownedLocally меняется, когда родитель перечитывает packOwnedByMe (в том
    // числе из onAdded колбэка на кнопке «+»). Если это происходило СРАЗУ
    // после отправки комментария, этот эффект перезапускался и звал
    // fetchPackComments ЗАНОВО — новый серверный снимок мог из-за задержки
    // репликации Firestore ещё не содержать только что опубликованный
    // комментарий (он уже status:'published' локально, поэтому не подходит
    // под pending-фильтр в mergeServerComments, а на сервере его тоже пока
    // нет) — комментарий выпадал из списка. ownedLocally нужен только чтобы
    // РАЗРЕШИТЬ писать (читается через отдельный эффект выше и напрямую в
    // finalCanWrite при первом входе), а не чтобы дёргать чтение ленты заново.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, packId, isPackAuthor, reloadTick]);

  /**
   * Прокрутка + подсветка к комментарию из deep-link (колокольчик).
   *
   * зачем ждём появления в `comments`, а не таймер от открытия (аудит 2026-09-17):
   * комментарий из уведомления мог прийти секунды назад — Firestore-триггер и
   * чтение ветки не гарантированно успевают раньше, чем человек тапнул
   * уведомление. Жёсткий таймер снял бы подсветку ДО того, как строка вообще
   * отрисовалась. Ждём индекс в актуальном списке и скроллим именно тогда.
   */
  useEffect(() => {
    if (!visible || !highlightCommentId) return;
    const index = comments.findIndex((c) => c.id === highlightCommentId);
    if (index < 0) return;
    setHighlightId(highlightCommentId);
    // getItemLayout не задан (переменная высота карточек) — scrollToIndex может
    // не попасть с первого кадра на длинных ветках; viewPosition центрирует то,
    // что FlatList уже способен измерить, и молча проглатывает промах через catch,
    // а не роняет экран (тот же принцип, что и в остальном UI шторки).
    requestAnimationFrame(() => {
      try {
        listRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.3 });
      } catch (swallowedError) {
        noteSwallowed('PackCommentsSheet:useEffect.catch', swallowedError);
        // короткая лента — прокручивать некуда, подсветка всё равно видна
      }
    });
    const timer = setTimeout(() => setHighlightId(null), 2400);
    return () => clearTimeout(timer);
  }, [visible, highlightCommentId, comments]);

  const counter = useMemo(() => commentCounterState(draft), [draft]);
  const canSend = !sending && validatePackComment(draft, canWrite).ok;

  const handleSend = useCallback(() => {
    // зачем (координатор 12.10, аудит Optimistic UI R1): замок отправки — ref: состояние `sending` ставится после рендера, второй тап в том же кадре успевал отправить отклик дважды.
    if (!myUserId) { notifyPackCommentsIdentityPending('send', packId); return; }
    if (sending || sendLockRef.current) return;
    const validation = validatePackComment(draft, canWrite);
    if (!validation.ok) {
      if (validation.reason === 'not_added') {
        emitAppEvent('action_toast', {
          kind: 'info',
          text: triLang(lang, {
            ru: 'Сначала добавь набор себе — потом можно написать.',
            uk: 'Спершу додай набір собі — потім можна написати.',
            en: 'Add the pack first, then you can write.',
            es: 'Primero añade el pack; después podrás escribir.',
            'pt-BR': 'Primeiro adicione o pacote; depois você pode escrever.',
            vi: 'Hãy thêm bộ thẻ trước, sau đó bạn có thể viết.',
            id: 'Tambahkan paket dulu, setelah itu kamu bisa menulis.',
            tr: 'Önce paketi ekle, sonra yazabilirsin.',
            pl: 'Najpierw dodaj zestaw do siebie — potem możesz napisać.',
          }),
        } as any);
      }
      return;
    }
    hapticTap();
    sendLockRef.current = true;
    const text = validation.text;
    const tempId = `pending_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const optimistic: PackComment = {
      id: tempId,
      packId,
      authorId: myUserId,
      authorName: triLang(lang, { ru: 'Ты', uk: 'Ти', en: 'You', es: 'Tú', 'pt-BR': 'Você', vi: 'Bạn', id: 'Kamu', tr: 'Sen', pl: 'Ty' }),
      text,
      createdAtMs: Date.now(),
      pinned: false,
      reactions: {},
      myReactions: [],
      status: 'sending',
    };
    setComments((prev) => sortPackComments([...prev, optimistic]));
    // зачем (координатор 18.10, аудит (д)): счётчик отзывов на карточке растёт СРАЗУ, а не после ответа сервера; при сбое — −1 откатом.
    emitAppEvent('community_pack_comments_changed', { packId, delta: 1 });
    setDraft('');
    setSending(true);
    Keyboard.dismiss();
    void (async () => {
      // зачем ждать здесь, а не перед оптимистичным рендером (владелец
      // 17.09.2026, «добавил → написал → permission-denied»): строка
      // комментария обязана появиться в ленте МГНОВЕННО (Optimistic UI),
      // ожидание допустимо только перед реальной сетевой публикацией, которая
      // и так асинхронна. Если canWrite поднят ТОЛЬКО локальным фактом
      // (ownedLocally), сервер может ещё не знать о pack_adds/{uid} — без
      // этого шага правила Firestore честно отклоняют запись (документ
      // отсутствует), и первый комментарий сразу после «Добавить себе» падал.
      // зачем зовём регистрацию НАПРЯМУЮ, минуя bumpAddedCountOnce (владелец
      // 17.09.2026): на устройствах, где локальный флаг «уже посчитано» был
      // сожжён прежним багом (ставился до серверной записи и не откатывался),
      // обычный путь добавления больше никогда не пойдёт в сеть. Этот вызов
      // идемпотентен и чинит такие устройства прямо перед отправкой отклика.
      // зачем (аудит Optimistic UI, 12.10): исключение в одном из двух ожиданий оставляло `sending` и замок отправки взведёнными
      // навсегда, а строку — вечно «отправляется». Теперь это тот же откат, что у отказа сервера: строка `failed` с «Повторить».
      let res: Awaited<ReturnType<typeof publishPackComment>>;
      try {
        if (!serverConfirmedWriteRef.current) {
          if (__DEV__) console.log('[PACK-COMMENTS-COMPOSER] жду подтверждение pack_adds перед отправкой', { packId, uid: myUserId });
          const addRes = await registerCommunityPackAddRemote(packId, myUserId);
          // ok:false — сервер отказал; не запоминаем ложный успех, чтобы
          // «Повторить» сделало новую попытку регистрации, а не только отклика.
          if (addRes.ok !== false) serverConfirmedWriteRef.current = true;
          if (__DEV__) console.log('[PACK-COMMENTS-COMPOSER] registerCommunityPackAddRemote вернул', { packId, ok: addRes.ok, changed: addRes.changed });
        }
        res = await publishPackComment(packId, myUserId, optimistic.authorName, text);
      } catch (error: unknown) {
        console.warn(`[PACK-COMMENTS-COMPOSER] отправка бросила исключение packId=${packId} — строка помечена failed: ${error instanceof Error ? error.message : String(error)}`); // guard-ok: catch пишет причину
        res = { ok: false, reason: 'network' };
      }
      // зачем: шторка могла закрыться (размонтироваться) пока запрос летел —
      // сервер уже принял комментарий, локальный state больше никому не нужен.
      if (unmountedRef.current) {
        sendLockRef.current = false;
        if (!res.ok) emitAppEvent('community_pack_comments_changed', { packId, delta: -1 });
        return;
      }
      setSending(false);
      sendLockRef.current = false;
      if (res.ok) {
        hapticSuccess();
        setComments((prev) => prev.map((c) => (c.id === tempId ? { ...c, id: res.commentId, status: 'published' } : c)));
      } else {
        hapticError();
        console.warn(`[PACK-COMMENTS-COMPOSER] отправка не принята packId=${packId} reason=${res.reason} → строка failed, счётчик −1`); // guard-ok: сбой отправки
        emitAppEvent('community_pack_comments_changed', { packId, delta: -1 });
        setComments((prev) => prev.map((c) => (c.id === tempId ? { ...c, status: 'failed' } : c)));
      }
    })();
  }, [myUserId, sending, draft, canWrite, packId, lang]);

  // зачем (аудит Optimistic UI, 12.10): «Повторить» — второй тап в том же кадре отправлял отклик дважды (статус `sending`
  // появляется после перерисовки); замок по id строки синхронный, как у основной отправки.
  const retryLocksRef = useRef<Set<string>>(new Set());
  const handleRetry = useCallback((comment: PackComment) => {
    if (!myUserId) { notifyPackCommentsIdentityPending('retry', packId); return; }
    if (retryLocksRef.current.has(comment.id)) {
      console.warn(`[PACK-COMMENTS-COMPOSER] повтор ${comment.id}: уже в пути — повторный тап пропущен`); // guard-ok: ранний выход называет причину
      return;
    }
    retryLocksRef.current.add(comment.id);
    hapticTap();
    setComments((prev) => prev.map((c) => (c.id === comment.id ? { ...c, status: 'sending' } : c)));
    // зачем (координатор 18.10, аудит (д)): повтор снова считает отклик сразу; сбой снимает −1.
    emitAppEvent('community_pack_comments_changed', { packId, delta: 1 });
    void (async () => {
      let res: Awaited<ReturnType<typeof publishPackComment>>;
      try {
        if (!serverConfirmedWriteRef.current) {
          const addRes = await registerCommunityPackAddRemote(packId, myUserId);
          if (addRes.ok !== false) serverConfirmedWriteRef.current = true;
        }
        res = await publishPackComment(packId, myUserId, comment.authorName, comment.text);
      } catch (error: unknown) {
        console.warn(`[PACK-COMMENTS-COMPOSER] повтор бросил исключение packId=${packId} commentId=${comment.id}: ${error instanceof Error ? error.message : String(error)}`); // guard-ok: catch пишет причину
        res = { ok: false, reason: 'network' };
      } finally {
        retryLocksRef.current.delete(comment.id);
      }
      if (unmountedRef.current) {
        if (!res.ok) emitAppEvent('community_pack_comments_changed', { packId, delta: -1 });
        return;
      }
      if (res.ok) {
        hapticSuccess();
        setComments((prev) => prev.map((c) => (c.id === comment.id ? { ...c, id: res.commentId, status: 'published' } : c)));
      } else {
        hapticError();
        console.warn(`[PACK-COMMENTS-COMPOSER] повтор не принят packId=${packId} commentId=${comment.id} reason=${res.reason} → failed, счётчик −1`); // guard-ok: сбой повтора
        emitAppEvent('community_pack_comments_changed', { packId, delta: -1 });
        setComments((prev) => prev.map((c) => (c.id === comment.id ? { ...c, status: 'failed' } : c)));
      }
    })();
  }, [myUserId, packId]);

  /**
   * «Ответить» — плоский вариант (владелец 17.09.2026, выбор из двух):
   * подставляем `@ник ` в начало черновика и ставим фокус. Ветка остаётся
   * одноуровневой, поле replyTo и переработка списка не нужны.
   *
   * зачем проверка на уже стоящий префикс: повторный тап по «Ответить» (в том
   * числе по другому отклику) не должен плодить «@Аня @Петя @Аня» — меняем
   * упоминание, а не дописываем. Остальной набранный текст сохраняется.
   */
  const handleReply = useCallback((comment: PackComment) => {
    hapticTap();
    const nick = (comment.authorName || '').trim();
    if (!nick) return;
    const mention = `@${nick} `;
    setDraft((prev) => {
      const withoutOldMention = prev.replace(/^@[^\s]+\s*/, '');
      const next = `${mention}${withoutOldMention}`;
      return next.slice(0, PACK_COMMENT_MAX_LENGTH);
    });
    composerRef.current?.focus();
  }, []);

  const handleDiscardFailed = useCallback((commentId: string) => {
    hapticTap();
    setComments((prev) => prev.filter((c) => c.id !== commentId));
  }, []);

  const handleReaction = useCallback((comment: PackComment, reaction: 'like' | 'fire') => {
    if (!myUserId) { notifyPackCommentsIdentityPending('reaction', packId); return; }
    if (comment.status !== 'published') return;
    hapticTap();
    const had = comment.myReactions.includes(reaction);
    setComments((prev) => prev.map((c) => {
      if (c.id !== comment.id) return c;
      const current = c.reactions[reaction] ?? 0;
      return {
        ...c,
        reactions: { ...c.reactions, [reaction]: Math.max(0, current + (had ? -1 : 1)) },
        myReactions: had ? c.myReactions.filter((r) => r !== reaction) : [...c.myReactions, reaction],
      };
    }));
    // зачем (координатор 12.10, аудит Optimistic UI R1): отказ записи реакции раньше молча оставлял «лайкнутый» отклик; теперь откат + сообщение.
    void togglePackCommentReaction(packId, comment.id, myUserId, reaction, !had).then((ok) => {
      if (ok) return;
      console.warn(`[OPT-UI] comment_reaction rollback packId=${packId} commentId=${comment.id} reaction=${reaction}`); // guard-ok: откат называет причину
      setComments((prev) => prev.map((c) => {
        if (c.id !== comment.id) return c;
        const current = c.reactions[reaction] ?? 0;
        return {
          ...c,
          reactions: { ...c.reactions, [reaction]: Math.max(0, current + (had ? 1 : -1)) },
          myReactions: had ? [...c.myReactions.filter((r) => r !== reaction), reaction] : c.myReactions.filter((r) => r !== reaction),
        };
      }));
      hapticError();
      emitAppEvent('action_toast', actionToastTri('error', {
        ru: 'Не удалось сохранить реакцию. Попробуй ещё раз.', uk: 'Не вдалося зберегти реакцію. Спробуй ще раз.', en: "Couldn't save the reaction. Try again.", es: 'No se pudo guardar la reacción. Inténtalo de nuevo.',
        'pt-BR': 'Não foi possível salvar a reação. Tente de novo.', vi: 'Không lưu được phản ứng. Hãy thử lại.', id: 'Reaksi tidak tersimpan. Coba lagi.', tr: 'Tepki kaydedilemedi. Tekrar dene.', pl: 'Nie udało się zapisać reakcji. Spróbuj ponownie.',
      }));
    });
  }, [myUserId, packId]);

  /**
   * Скрыть у автора набора: не жёсткое удаление чужого текста (правила Firestore
   * это и не разрешают — `pack_comments` update ограничен `hiddenByAuthor`),
   * а мягкое скрытие. Комментарий пропадает из ленты у всех, кроме автора набора
   * и написавшего — то же поведение, что owner описал как «просто исчезает,
   * без уведомления автору комментария».
   */
  // зачем (координатор 18.10, аудит (в)): «закрепить / скрыть / удалить» не имели замка — двойной тап по пункту меню давал два вызова
  // и двойной откат. Замок по id отклика общий для трёх действий: пока одно в полёте, другое по тому же отклику не стартует.
  const moderationLocksRef = useRef<Set<string>>(new Set());
  const claimModeration = useCallback((op: 'hide' | 'delete' | 'pin', commentId: string): boolean => {
    if (moderationLocksRef.current.has(commentId)) {
      console.log(`[OPT-UI] comment_${op} skipped reason=in_flight commentId=${commentId}`); // guard-ok: ранний выход называет причину
      return false;
    }
    moderationLocksRef.current.add(commentId);
    return true;
  }, []);
  const releaseModeration = useCallback((commentId: string) => { moderationLocksRef.current.delete(commentId); }, []);

  const handleHideByAuthor = useCallback((comment: PackComment) => {
    setMenuFor(null);
    if (!claimModeration('hide', comment.id)) return;
    hapticTap();
    setComments((prev) => prev.filter((c) => c.id !== comment.id));
    void (async () => {
      try {
      // зачем передаём comment.pinned (владелец 17.09.2026): скрытие
      // закреплённого комментария автоматически снимает закрепление — см.
      // докстринг hidePackCommentByAuthor.
      const ok = await hidePackCommentByAuthor(packId, comment.id, true, comment.pinned);
      if (!ok) {
        // Сеть отказала — вернуть строку, не терять факт молча.
        console.warn(`[OPT-UI] comment_hide rollback packId=${packId} commentId=${comment.id}`); // guard-ok: откат называет причину
        setComments((prev) => sortPackComments([...prev, comment]));
        hapticError();
        emitAppEvent('action_toast', actionToastTri('error', {
          ru: 'Не удалось скрыть отклик. Попробуй ещё раз.', uk: 'Не вдалося приховати відгук. Спробуй ще раз.', en: "Couldn't hide the comment. Try again.", es: 'No se pudo ocultar el comentario. Inténtalo de nuevo.',
          'pt-BR': 'Não foi possível ocultar o comentário. Tente de novo.', vi: 'Không ẩn được bình luận. Hãy thử lại.', id: 'Komentar tidak bisa disembunyikan. Coba lagi.', tr: 'Yorum gizlenemedi. Tekrar dene.', pl: 'Nie udało się ukryć komentarza. Spróbuj ponownie.',
        }));
      }
      // зачем НЕ шлём community_pack_comments_changed (аудит 2026-09-17): скрытие
      // не трогает серверный commentsCount (hidePackCommentByAuthor намеренно
      // этого не делает — это «скрыть у себя», не «удалить», см. её докстринг).
      // Раньше здесь эмитился delta:-1, и счётчик локально проседал, а на
      // следующем чтении каталога прыгал обратно — «прыжок числа», запрещённый
      // правилом Optimistic UI.
      } finally {
        releaseModeration(comment.id);
      }
    })();
  }, [claimModeration, packId, releaseModeration]);

  const handleDeleteMine = useCallback((comment: PackComment) => {
    setMenuFor(null);
    if (!claimModeration('delete', comment.id)) return;
    hapticTap();
    setComments((prev) => prev.filter((c) => c.id !== comment.id));
    void (async () => {
      try {
      const ok = await deletePackComment(packId, comment.id);
      if (ok) {
        emitAppEvent('community_pack_comments_changed', { packId, delta: -1 });
      } else {
        console.warn(`[OPT-UI] comment_delete rollback packId=${packId} commentId=${comment.id}`); // guard-ok: откат называет причину
        setComments((prev) => sortPackComments([...prev, comment]));
        hapticError();
        emitAppEvent('action_toast', actionToastTri('error', {
          ru: 'Не удалось удалить отклик. Попробуй ещё раз.', uk: 'Не вдалося видалити відгук. Спробуй ще раз.', en: "Couldn't delete the comment. Try again.", es: 'No se pudo eliminar el comentario. Inténtalo de nuevo.',
          'pt-BR': 'Não foi possível excluir o comentário. Tente de novo.', vi: 'Không xóa được bình luận. Hãy thử lại.', id: 'Komentar tidak bisa dihapus. Coba lagi.', tr: 'Yorum silinemedi. Tekrar dene.', pl: 'Nie udało się usunąć komentarza. Spróbuj ponownie.',
        }));
      }
      } finally {
        releaseModeration(comment.id);
      }
    })();
  }, [claimModeration, packId, releaseModeration]);

  const handleTogglePin = useCallback((comment: PackComment) => {
    setMenuFor(null);
    if (!claimModeration('pin', comment.id)) return;
    hapticTap();
    const nextPinned = !comment.pinned;
    // зачем (координатор 12.10, аудит Optimistic UI R1): отказ записи закрепления — откат к прежнему набору закреплённых + сообщение.
    let previousComments: PackComment[] | null = null;
    setComments((prev) => {
      previousComments = prev;
      return sortPackComments(prev.map((c) => ({ ...c, pinned: c.id === comment.id ? nextPinned : false })));
    });
    void setPackCommentPinned(packId, comment.id, nextPinned).then((ok) => {
      if (ok) return;
      console.warn(`[OPT-UI] comment_pin rollback packId=${packId} commentId=${comment.id}`); // guard-ok: откат называет причину
      const before = previousComments as PackComment[] | null;
      if (before) setComments((prev) => sortPackComments(prev.map((c) => ({ ...c, pinned: before.find((b) => b.id === c.id)?.pinned ?? c.pinned }))));
      hapticError();
      emitAppEvent('action_toast', actionToastTri('error', {
        ru: 'Не удалось изменить закрепление. Попробуй ещё раз.', uk: 'Не вдалося змінити закріплення. Спробуй ще раз.', en: "Couldn't change the pin. Try again.", es: 'No se pudo cambiar el anclaje. Inténtalo de nuevo.',
        'pt-BR': 'Não foi possível alterar a fixação. Tente de novo.', vi: 'Không đổi được trạng thái ghim. Hãy thử lại.', id: 'Sematan tidak bisa diubah. Coba lagi.', tr: 'Sabitleme değiştirilemedi. Tekrar dene.', pl: 'Nie udało się zmienić przypięcia. Spróbuj ponownie.',
      }));
    }).finally(() => releaseModeration(comment.id));
  }, [claimModeration, packId, releaseModeration]);

  const emptyTitle = triLang(lang, { ru: 'Пока тихо', uk: 'Поки тихо', en: 'Quiet so far', es: 'Todavía en silencio', 'pt-BR': 'Ainda em silêncio', vi: 'Vẫn còn yên tĩnh', id: 'Masih sepi', tr: 'Şimdilik sessiz', pl: 'Na razie cicho' });
  const emptyBody = triLang(lang, {
    ru: 'Скажи автору, что было полезно — он увидит первым',
    uk: 'Скажи автору, що було корисно — він побачить першим',
    en: 'Tell the author what helped — they will see it first',
    es: 'Dile al autor qué te sirvió; lo verá primero',
    'pt-BR': 'Diga ao autor o que ajudou; ele verá primeiro',
    vi: 'Nói cho tác giả biết điều gì hữu ích — họ sẽ thấy đầu tiên',
    id: 'Beri tahu penulis apa yang membantu — dia akan melihatnya lebih dulu',
    tr: 'Yazara neyin işe yaradığını söyle — önce o görecek',
    pl: 'Powiedz autorowi, co się przydało — zobaczy to pierwszy',
  });
  const composerPlaceholder = triLang(lang, { ru: 'Написать автору…', uk: 'Написати автору…', en: 'Write to the author…', es: 'Escribe al autor…', 'pt-BR': 'Escreva para o autor…', vi: 'Viết cho tác giả…', id: 'Tulis untuk penulis…', tr: 'Yazara yaz…', pl: 'Napisz do autora…' });
  const replyLabel = triLang(lang, { ru: 'Ответить', uk: 'Відповісти', en: 'Reply', es: 'Responder', 'pt-BR': 'Responder', vi: 'Trả lời', id: 'Balas', tr: 'Yanıtla', pl: 'Odpowiedz' });
  const authorBadge = triLang(lang, { ru: 'автор', uk: 'автор', en: 'author', es: 'autor', 'pt-BR': 'autor', vi: 'tác giả', id: 'penulis', tr: 'yazar', pl: 'autor' });
  const pinnedBadge = triLang(lang, { ru: 'закреплено', uk: 'закріплено', en: 'pinned', es: 'fijado', 'pt-BR': 'fixado', vi: 'đã ghim', id: 'disematkan', tr: 'sabitlendi', pl: 'przypięte' });
  const headerTitle = triLang(lang, { ru: 'Отклик', uk: 'Відгук', en: 'Comments', es: 'Comentarios', 'pt-BR': 'Comentários', vi: 'Phản hồi', id: 'Tanggapan', tr: 'Yorumlar', pl: 'Komentarze' });

  const loadingLabel = triLang(lang, { ru: 'Загрузка комментариев…', uk: 'Завантаження коментарів…', en: 'Loading comments…', es: 'Cargando comentarios…', 'pt-BR': 'Carregando comentários…', vi: 'Đang tải bình luận…', id: 'Memuat komentar…', tr: 'Yorumlar yükleniyor…', pl: 'Ładowanie komentarzy…' });
  const closeLabel = triLang(lang, { ru: 'Закрыть', uk: 'Закрити', en: 'Close', es: 'Cerrar', 'pt-BR': 'Fechar', vi: 'Đóng', id: 'Tutup', tr: 'Kapat', pl: 'Zamknij' });
  const sendLabel = triLang(lang, { ru: 'Отправить', uk: 'Надіслати', en: 'Send', es: 'Enviar', 'pt-BR': 'Enviar', vi: 'Gửi', id: 'Kirim', tr: 'Gönder', pl: 'Wyślij' });
  const menuBottomPad = 12 + normalizeSafeAreaBottomInset(menuInsets.bottom);
  const menuRowStyle = { minHeight: 48, flexDirection: 'row' as const, alignItems: 'center' as const, gap: 12, paddingHorizontal: 14, borderRadius: 16 };

  const renderItem = useCallback(({ item }: { item: PackComment }) => {
    const mine = item.authorId === myUserId;
    const authorCoinRank = mine ? myCoinRank : profiles[item.authorId]?.coinRank;
    const rankCoin = isValidCoinRank(authorCoinRank) ? COIN_RANK_TABLE.find((row) => row.rank === authorCoinRank) : undefined; // нет ранга — прежний AvatarView, ранг не выдумываем
    const isHighlighted = highlightId === item.id;
    const reactionChip = (active: boolean) => ({
      flexDirection: 'row' as const, alignItems: 'center' as const, gap: 5, height: 30, paddingHorizontal: 11, borderRadius: 15,
      backgroundColor: active ? glass.selected : glass.opaqueControl,
    });
    const badge = (label: string) => (
      <View style={{ backgroundColor: glass.opaqueControl, borderRadius: 8, paddingHorizontal: 8, height: 20, justifyContent: 'center' }}>
        <Text style={{ color: glass.secondary, fontSize: 13, fontWeight: '700' }}>{label}</Text>
      </View>
    );
    return (
      <View
        style={{
          flexDirection: 'row',
          gap: 12,
          padding: 10,
          borderRadius: 18,
          backgroundColor: isHighlighted ? glass.selected : 'transparent',
          marginBottom: 10,
          opacity: item.status === 'sending' ? 0.6 : 1,
        }}
      >
        {/* зачем свой профиль отдельно от profiles[authorId] (владелец 17.09.2026,
            «аватарка не показывается правильная»): для СВОЕГО комментария (mine)
            используем myAvatarProfile — локальный, мгновенный, не ждёт сеть.
            Для чужих — profiles[authorId], догруженный батчем выше (может быть
            ещё не готов на первом кадре; AvatarView без avatar отрисует
            нейтральную заглушку по умолчанию, не пустоту). Устаревшие поля
            сознательно НЕ передаём — public_profiles может не содержать
            актуальный уровень (protected projectionAuthority), а выдумывать
            цифру нельзя (см. AvatarView.tsx, жалоба «Издевательство»). */}
        <View style={{ width: 36, height: 36 }}>
          {rankCoin ? (
            <CoinImage source={rankCoin.source} contentFit="contain" style={{ width: 36, height: 36 }} accessible={false} />
          ) : (
            <AvatarView
              avatar={(mine ? myAvatarProfile?.avatar : profiles[item.authorId]?.avatar) || undefined}
              auraId={(mine ? myAvatarProfile?.aura : profiles[item.authorId]?.aura) || undefined}
              size={36}
              animateAura={false}
            />
          )}
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
            {/* зачем (крайние случаи 10.10): имя автора без пробелов и очень длинное не должно выталкивать бейджи и время за край строки */}
            <Text numberOfLines={1} style={{ color: glass.text, fontSize: f.body, fontWeight: '700', maxWidth: '100%', flexShrink: 1 }}>
              {item.authorName || '—'}
            </Text>
            {packAuthorStableId && item.authorId === packAuthorStableId ? badge(authorBadge) : null}
            {item.pinned ? badge(pinnedBadge) : null}
            {/* зачем (cards-056, образец cards-states №50, Авторизация 13.10): на месте времени — «отправляется…» у отправляемого отклика и «не отправлено» у неотправленного; раньше подписи не было совсем */}
            <Text style={{ color: glass.mutedText, fontSize: f.caption }}>
              {item.status === 'published' ? timeAgoLabel(item.createdAtMs, lang) : item.status === 'sending'
                ? triLang(lang, { ru: 'отправляется…', uk: 'надсилається…', en: 'sending…', es: 'enviando…', 'pt-BR': 'enviando…', vi: 'đang gửi…', id: 'mengirim…', tr: 'gönderiliyor…', pl: 'wysyłanie…' })
                : triLang(lang, { ru: 'не отправлено', uk: 'не надіслано', en: 'not sent', es: 'no enviado', 'pt-BR': 'não enviado', vi: 'chưa gửi được', id: 'belum terkirim', tr: 'gönderilemedi', pl: 'nie wysłano' })}
            </Text>
          </View>
          <Text style={{ color: glass.text, fontSize: f.body, lineHeight: Math.round(f.body * 1.4), marginTop: 4 }}>{item.text}</Text>

          {item.status === 'failed' ? (
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
              <TouchableOpacity
                onPress={() => handleRetry(item)}
                accessibilityRole="button"
                style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: 16, borderRadius: 22, backgroundColor: glass.buttonFill }}
              >
                <Text style={{ color: glass.text, fontSize: f.caption, fontWeight: '700' }}>
                  {triLang(lang, { ru: 'Повторить', uk: 'Повторити', en: 'Retry', es: 'Reintentar', 'pt-BR': 'Repetir', vi: 'Thử lại', id: 'Coba lagi', tr: 'Tekrar dene', pl: 'Ponów' })}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleDiscardFailed(item.id)}
                accessibilityRole="button"
                style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: 16, borderRadius: 22, backgroundColor: glass.buttonFill }}
              >
                <Text style={{ color: glass.secondary, fontSize: f.caption, fontWeight: '700' }}>
                  {triLang(lang, { ru: 'Удалить', uk: 'Видалити', en: 'Delete', es: 'Eliminar', 'pt-BR': 'Excluir', vi: 'Xóa', id: 'Hapus', tr: 'Sil', pl: 'Usuń' })}
                </Text>
              </TouchableOpacity>
            </View>
          ) : item.status === 'published' ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8 }}>
              <TouchableOpacity
                onPress={() => handleReaction(item, 'like')}
                hitSlop={{ top: 7, bottom: 7, left: 4, right: 4 }}
                accessibilityRole="button"
                accessibilityLabel={triLang(lang, { ru: 'Нравится', uk: 'Подобається', en: 'Like', es: 'Me gusta', 'pt-BR': 'Curtir', vi: 'Thích', id: 'Suka', tr: 'Beğen', pl: 'Lubię to' })}
                accessibilityState={{ selected: item.myReactions.includes('like') }}
                style={reactionChip(item.myReactions.includes('like'))}
              >
                <Ionicons name={item.myReactions.includes('like') ? 'thumbs-up' : 'thumbs-up-outline'} size={16} color={item.myReactions.includes('like') ? glass.text : glass.secondary} />
                {item.reactions.like ? <Text style={{ color: item.myReactions.includes('like') ? glass.text : glass.secondary, fontSize: f.caption, fontWeight: '700' }}>{item.reactions.like}</Text> : null}
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleReaction(item, 'fire')}
                hitSlop={{ top: 7, bottom: 7, left: 4, right: 4 }}
                accessibilityRole="button"
                accessibilityLabel={triLang(lang, { ru: 'Огонь', uk: 'Вогонь', en: 'Fire', es: 'Fuego', 'pt-BR': 'Fogo', vi: 'Lửa', id: 'Api', tr: 'Ateş', pl: 'Ogień' })}
                accessibilityState={{ selected: item.myReactions.includes('fire') }}
                style={reactionChip(item.myReactions.includes('fire'))}
              >
                <Ionicons name={item.myReactions.includes('fire') ? 'flame' : 'flame-outline'} size={16} color={item.myReactions.includes('fire') ? glass.text : glass.secondary} />
                {item.reactions.fire ? <Text style={{ color: item.myReactions.includes('fire') ? glass.text : glass.secondary, fontSize: f.caption, fontWeight: '700' }}>{item.reactions.fire}</Text> : null}
              </TouchableOpacity>
              {/* зачем «Ответить» только чужим и только пишущим (владелец
                  17.09.2026): отвечать самому себе бессмысленно, а тому, кто
                  не добавил набор, кнопка обещала бы недоступное действие —
                  композер у него скрыт. */}
              {canWrite && !mine ? (
                <TouchableOpacity
                  testID={`pack-comment-reply-${item.id}`}
                  onPress={() => handleReply(item)}
                  hitSlop={{ top: 7, bottom: 7, left: 4, right: 4 }}
                  accessibilityRole="button"
                  accessibilityLabel={replyLabel}
                  style={{ height: 30, paddingHorizontal: 11, borderRadius: 15, justifyContent: 'center', backgroundColor: glass.buttonFill }}
                >
                  <Text style={{ color: glass.secondary, fontSize: f.caption, fontWeight: '700' }}>{replyLabel}</Text>
                </TouchableOpacity>
              ) : null}
              <View style={{ flex: 1 }} />
              <TouchableOpacity
                testID={`pack-comment-more-${item.id}`}
                onPress={() => setMenuFor(item)}
                accessibilityRole="button"
                accessibilityLabel={triLang(lang, { ru: 'Ещё действия', uk: 'Ще дії', en: 'More actions', es: 'Más acciones', 'pt-BR': 'Mais ações', vi: 'Thêm hành động', id: 'Tindakan lain', tr: 'Diğer işlemler', pl: 'Więcej działań' })}
                style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginVertical: -7, marginRight: -8 }}
              >
                <Ionicons name="ellipsis-horizontal" size={18} color={glass.mutedText} />
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      </View>
    );
  }, [myUserId, packAuthorStableId, glass, f, lang, highlightId, handleReaction, handleRetry, handleDiscardFailed, handleReply, canWrite, replyLabel, authorBadge, pinnedBadge, profiles, myAvatarProfile, myCoinRank]);

  return (
    <HybridSheetShell
      visible={visible}
      onClose={onClose}
      closeLabel={closeLabel}
      testID="pack-comments-sheet"
      material="liquid-glass-opaque"
      glowColor={glass.cta}
      backdropAccessible={false}
    >
      {({ requestDismiss }) => (
        <View style={{ maxHeight: sheetContentMaxHeight, minHeight: 0, flexShrink: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4, marginBottom: 8 }}>
            <Text accessibilityRole="header" style={{ color: glass.text, fontSize: 22, fontWeight: '700', flex: 1 }}>
              {headerTitle}{comments.length ? ` · ${comments.length}` : ''}
            </Text>
            <TouchableOpacity
              onPress={requestDismiss}
              accessibilityRole="button"
              accessibilityLabel={closeLabel}
              style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
            >
              <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: glass.opaqueControl, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="close" size={18} color={glass.text} />
              </View>
            </TouchableOpacity>
          </View>

          {loading ? (
            <View accessibilityRole="progressbar" accessibilityLabel={loadingLabel} style={{ minHeight: 154, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
              <ActivityIndicator color={glass.secondary} />
              <Text style={{ color: glass.secondary, fontSize: f.caption }}>{loadingLabel}</Text>
            </View>
          /* зачем (правило владельца 01.10 и 18.10, координатор 08:00: «экранов-ошибок нигде»): «Не удалось загрузить комментарии / Повторить» убрано — при сбое без кэша показываем то же пустое состояние, что и при нуле комментариев, а чтение тихо повторяется само (useLoadGate выше). */
          ) : comments.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 28, paddingHorizontal: 20 }}>
              <View style={{ width: 55, height: 55, borderRadius: 16, backgroundColor: glass.opaqueControl, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="chatbubble-outline" size={24} color={glass.text} />
              </View>
              <Text style={{ color: glass.text, fontSize: 16, fontWeight: '700', marginTop: 16, textAlign: 'center' }}>{emptyTitle}</Text>
              <Text style={{ color: glass.secondary, fontSize: f.body, marginTop: 6, textAlign: 'center' }}>{emptyBody}</Text>
            </View>
          ) : (
            <FlatList removeClippedSubviews={false}
              ref={listRef}
              data={comments}
              keyExtractor={(item) => item.id}
              renderItem={renderItem}
              style={{ flexGrow: 0, flexShrink: 1 }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              onScrollToIndexFailed={(info) => {
                // Переменная высота карточек — FlatList не всегда может измерить
                // офскрин-элемент с первой попытки. Ретраим один раз коротким кадром.
                setTimeout(() => {
                  listRef.current?.scrollToIndex({ index: info.index, animated: true, viewPosition: 0.3 });
                }, 50);
              }} decelerationRate="fast"
            />
          )}

          {canWrite ? (
            <View style={{ paddingTop: 12 }}>
              <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-end' }}>
                <View style={{ flex: 1, backgroundColor: glass.opaqueControl, borderRadius: 23, paddingHorizontal: 16, paddingVertical: 11, minHeight: 46, justifyContent: 'center' }}>
                  <TextInput
                    ref={composerRef}
                    // зачем (съёмка R1 cards-054/056): робот печатает отклик по testID — поле без него было недоступно шагам.
                    testID="pack-comment-input"
                    value={draft}
                    // зачем БЕЗ normalizePackCommentText на каждое нажатие
                    // (владелец: «ставлю пробел, он убирается»): функция
                    // делает `.trim()` — она предназначена для ФИНАЛЬНОЙ
                    // обработки перед отправкой (см. её докстринг), а не для
                    // live-набора. На каждый onChangeText она стирала
                    // конечный пробел мгновенно после ввода — пользователь
                    // не мог напечатать «слово слово», второй пробел исчезал
                    // тут же. maxLength на TextInput уже ограничивает длину;
                    // схлопывание переносов/пробелов происходит один раз в
                    // handleSend/handleRetry через validatePackComment.
                    onChangeText={setDraft}
                    placeholder={composerPlaceholder}
                    placeholderTextColor={glass.mutedText}
                    maxLength={PACK_COMMENT_MAX_LENGTH}
                    multiline
                    accessibilityLabel={composerPlaceholder}
                    style={{ color: glass.text, fontSize: f.body, maxHeight: 90 }}
                  />
                </View>
                <TouchableOpacity
                  testID="pack-comment-send"
                  disabled={!canSend}
                  onPress={handleSend}
                  accessibilityRole="button"
                  accessibilityLabel={sendLabel}
                  accessibilityState={{ disabled: !canSend }}
                  style={{
                    width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center',
                    backgroundColor: canSend ? glass.cta : glass.buttonFill,
                  }}
                >
                  <Ionicons name="arrow-up" size={20} color={canSend ? glass.ctaInk : glass.mutedText} />
                </TouchableOpacity>
              </View>
              {counter.visible ? (
                <Text style={{ color: counter.left <= 10 ? glass.text : glass.mutedText, fontSize: 13, fontWeight: counter.left <= 10 ? '700' : '400', marginTop: 8, marginLeft: 16 }}>
                  {triLang(lang, { ru: `${counter.left} осталось`, uk: `${counter.left} залишилось`, en: `${counter.left} left`, es: `${counter.left} restantes`, 'pt-BR': `${counter.left} restantes`, vi: `còn ${counter.left}`, id: `${counter.left} tersisa`, tr: `${counter.left} kaldı`, pl: `${counter.left} pozostało` })}
                </Text>
              ) : null}
            </View>
          ) : writeCheckDone ? (
            <Text testID="pack-comments-write-locked" style={{ color: glass.mutedText, fontSize: f.sub, textAlign: 'center', paddingTop: 14, paddingHorizontal: 16 }}>
              {triLang(lang, {
                ru: 'Писать могут те, кто добавил набор себе.',
                uk: 'Писати можуть ті, хто додав набір собі.',
                en: 'Only people who added the pack can write.',
                es: 'Solo pueden escribir quienes añadieron el pack.',
                'pt-BR': 'Só quem adicionou o pacote pode escrever.',
                vi: 'Chỉ người đã thêm bộ thẻ mới viết được.',
                id: 'Hanya yang menambahkan paket ini yang bisa menulis.',
                tr: 'Yalnızca paketi ekleyenler yazabilir.',
                pl: 'Pisać mogą tylko osoby, które dodały zestaw.',
              })}
            </Text>
          ) : null}

          {/* Меню «···»: закрепить/скрыть — автору набора; удалить — своему; пожаловаться — всем. */}
          <Modal visible={!!menuFor} transparent animationType="fade" statusBarTranslucent onRequestClose={() => setMenuFor(null)}>
            <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: EXEMPT_COLOR_1 }}>
              <Pressable accessibilityRole="button" accessibilityLabel={closeLabel} onPress={() => setMenuFor(null)} style={{ flex: 1 }} />
              <View
                testID="pack-comment-menu"
                accessibilityRole="menu"
                style={{ backgroundColor: glass.opaqueSheet, borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 10, paddingBottom: menuBottomPad }} // зачем (Тень 12.10): шторка без кромки — её отделяет затемнение
              >
                {isPackAuthor && menuFor ? (
                  <TouchableOpacity accessibilityRole="menuitem" onPress={() => handleTogglePin(menuFor)} style={menuRowStyle}>
                    <Ionicons name="pin-outline" size={20} color={glass.secondary} style={{ width: 24, textAlign: 'center' }} />
                    <Text style={{ color: glass.text, fontSize: f.body, fontWeight: '600' }}>
                      {menuFor.pinned
                        ? triLang(lang, { ru: 'Открепить', uk: 'Відкріпити', en: 'Unpin', es: 'Desanclar', 'pt-BR': 'Desafixar', vi: 'Bỏ ghim', id: 'Lepas sematan', tr: 'Sabitlemeyi kaldır', pl: 'Odepnij' })
                        : triLang(lang, { ru: 'Закрепить', uk: 'Закріпити', en: 'Pin', es: 'Fijar', 'pt-BR': 'Fixar', vi: 'Ghim', id: 'Sematkan', tr: 'Sabitle', pl: 'Przypnij' })}
                    </Text>
                  </TouchableOpacity>
                ) : null}
                {isPackAuthor && menuFor && menuFor.authorId !== myUserId ? (
                  <TouchableOpacity accessibilityRole="menuitem" onPress={() => handleHideByAuthor(menuFor)} style={menuRowStyle}>
                    <Ionicons name="eye-off-outline" size={20} color={glass.secondary} style={{ width: 24, textAlign: 'center' }} />
                    <Text style={{ color: glass.text, fontSize: f.body, fontWeight: '600' }}>
                      {/* зачем "у всех", не "у себя" (аудит 2026-09-17): скрытие убирает
                          строку из ленты для ВСЕХ читателей, кроме автора набора и
                          самого написавшего — прежний текст обещал эффект только на
                          своём устройстве, что не соответствовало реальному поведению. */}
                      {triLang(lang, { ru: 'Скрыть у всех', uk: 'Приховати у всіх', en: 'Hide from everyone', es: 'Ocultar para todos', 'pt-BR': 'Ocultar de todos', vi: 'Ẩn với mọi người', id: 'Sembunyikan dari semua', tr: 'Herkesten gizle', pl: 'Ukryj przed wszystkimi' })}
                    </Text>
                  </TouchableOpacity>
                ) : null}
                {menuFor && menuFor.authorId === myUserId ? (
                  <TouchableOpacity accessibilityRole="menuitem" onPress={() => handleDeleteMine(menuFor)} style={menuRowStyle}>
                    <Ionicons name="trash-outline" size={20} color={glass.secondary} style={{ width: 24, textAlign: 'center' }} />
                    <Text style={{ color: glass.text, fontSize: f.body, fontWeight: '600' }}>
                      {triLang(lang, { ru: 'Удалить', uk: 'Видалити', en: 'Delete', es: 'Eliminar', 'pt-BR': 'Excluir', vi: 'Xóa', id: 'Hapus', tr: 'Sil', pl: 'Usuń' })}
                    </Text>
                  </TouchableOpacity>
                ) : null}
                {menuFor && menuFor.authorId !== myUserId ? (
                  <TouchableOpacity
                    accessibilityRole="menuitem"
                    onPress={() => { const c = menuFor; setMenuFor(null); setReportFor(c); }}
                    style={menuRowStyle}
                  >
                    <Ionicons name="flag-outline" size={20} color={t.wrong} style={{ width: 24, textAlign: 'center' }} />
                    <Text style={{ color: t.wrong, fontSize: f.body, fontWeight: '600' }}>
                      {triLang(lang, { ru: 'Пожаловаться', uk: 'Поскаржитися', en: 'Report', es: 'Denunciar', 'pt-BR': 'Denunciar', vi: 'Báo cáo', id: 'Laporkan', tr: 'Şikayet et', pl: 'Zgłoś' })}
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
          </Modal>

          <ReportCommentModal
            visible={!!reportFor}
            packId={packId}
            packTitle={packTitle}
            comment={reportFor}
            lang={lang}
            onClose={() => setReportFor(null)}
          />
        </View>
      )}
    </HybridSheetShell>
  );
}
