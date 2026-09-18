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
import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import AvatarView from '../../components/AvatarView';
import { useTheme } from '../../components/ThemeContext';
import { USER_AVATAR_AURA_KEY } from '../../constants/customization_storage_keys';
import { triLang, type Lang } from '../../constants/i18n';
import type { Theme } from '../../constants/theme';
import { hapticError, hapticSuccess, hapticTap } from '../../hooks/use-haptics';
import { emitAppEvent } from '../events';
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
  } catch {
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

export default function PackCommentsSheet({ visible, packId, packTitle, isPackAuthor, packAuthorStableId, ownedLocally, lang, onClose, highlightCommentId }: Props) {
  const { theme: t, f } = useTheme();
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
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [menuFor, setMenuFor] = useState<PackComment | null>(null);
  const [reportFor, setReportFor] = useState<PackComment | null>(null);
  const listRef = useRef<FlatList<PackComment>>(null);
  /** Поле ввода: тап «Ответить» ставит в него фокус, чтобы не тапать второй раз. */
  const composerRef = useRef<TextInput>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  /** authorId → профиль (avatar/frame/aura), для рендера настоящих аватарок вместо emoji. */
  const [profiles, setProfiles] = useState<Record<string, CommunityAuthorProfile>>({});
  const [myAvatarProfile, setMyAvatarProfile] = useState<CommunityAuthorProfile | null>(null);
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
    setLoading(true);
    void (async () => {
      const uid = await getCanonicalUserId().catch((e) => {
        if (__DEV__) console.log('[PACK-COMMENTS-COMPOSER] getCanonicalUserId упал', { packId, reason: e instanceof Error ? e.message : String(e) });
        return null;
      });
      if (__DEV__) console.log('[PACK-COMMENTS-COMPOSER] uid получен', { packId, uid, hasUid: !!uid });
      const [addedByMe, serverComments] = await Promise.all([
        uid ? canWritePackComment(packId, uid) : Promise.resolve(false),
        fetchPackComments(packId, uid),
      ]);
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
      setComments((prev) => mergeServerComments(prev, serverComments));
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
  }, [visible, packId, isPackAuthor]);

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
      } catch {
        // короткая лента — прокручивать некуда, подсветка всё равно видна
      }
    });
    const timer = setTimeout(() => setHighlightId(null), 2400);
    return () => clearTimeout(timer);
  }, [visible, highlightCommentId, comments]);

  const counter = useMemo(() => commentCounterState(draft), [draft]);
  const canSend = !sending && validatePackComment(draft, canWrite).ok;

  const handleSend = useCallback(() => {
    if (!myUserId || sending) return;
    const validation = validatePackComment(draft, canWrite);
    if (!validation.ok) {
      if (validation.reason === 'not_added') {
        emitAppEvent('action_toast', {
          kind: 'info',
          text: triLang(lang, {
            ru: 'Сначала добавьте набор себе — потом можно написать.',
            uk: 'Спершу додайте набір собі — потім можна написати.',
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
    const text = validation.text;
    const tempId = `pending_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const optimistic: PackComment = {
      id: tempId,
      packId,
      authorId: myUserId,
      authorName: triLang(lang, { ru: 'Вы', uk: 'Ви', en: 'You', es: 'Tú', 'pt-BR': 'Você', vi: 'Bạn', id: 'Anda', tr: 'Sen', pl: 'Ty' }),
      text,
      createdAtMs: Date.now(),
      pinned: false,
      reactions: {},
      myReactions: [],
      status: 'sending',
    };
    setComments((prev) => sortPackComments([...prev, optimistic]));
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
      if (!serverConfirmedWriteRef.current) {
        if (__DEV__) console.log('[PACK-COMMENTS-COMPOSER] жду подтверждение pack_adds перед отправкой', { packId, uid: myUserId });
        const addRes = await registerCommunityPackAddRemote(packId, myUserId);
        // ok:false — сервер отказал; не запоминаем ложный успех, чтобы
        // «Повторить» сделало новую попытку регистрации, а не только отклика.
        if (addRes.ok !== false) serverConfirmedWriteRef.current = true;
        if (__DEV__) console.log('[PACK-COMMENTS-COMPOSER] registerCommunityPackAddRemote вернул', { packId, ok: addRes.ok, changed: addRes.changed });
      }
      const res = await publishPackComment(packId, myUserId, optimistic.authorName, text);
      // зачем: шторка могла закрыться (размонтироваться) пока запрос летел —
      // сервер уже принял комментарий, локальный state больше никому не нужен.
      if (unmountedRef.current) {
        if (res.ok) emitAppEvent('community_pack_comments_changed', { packId, delta: 1 });
        return;
      }
      setSending(false);
      if (res.ok) {
        hapticSuccess();
        emitAppEvent('community_pack_comments_changed', { packId, delta: 1 });
        setComments((prev) => prev.map((c) => (c.id === tempId ? { ...c, id: res.commentId, status: 'published' } : c)));
      } else {
        hapticError();
        setComments((prev) => prev.map((c) => (c.id === tempId ? { ...c, status: 'failed' } : c)));
      }
    })();
  }, [myUserId, sending, draft, canWrite, packId, lang]);

  const handleRetry = useCallback((comment: PackComment) => {
    if (!myUserId) return;
    hapticTap();
    setComments((prev) => prev.map((c) => (c.id === comment.id ? { ...c, status: 'sending' } : c)));
    void (async () => {
      if (!serverConfirmedWriteRef.current) {
        const addRes = await registerCommunityPackAddRemote(packId, myUserId);
        if (addRes.ok !== false) serverConfirmedWriteRef.current = true;
      }
      const res = await publishPackComment(packId, myUserId, comment.authorName, comment.text);
      if (unmountedRef.current) {
        if (res.ok) emitAppEvent('community_pack_comments_changed', { packId, delta: 1 });
        return;
      }
      if (res.ok) {
        hapticSuccess();
        emitAppEvent('community_pack_comments_changed', { packId, delta: 1 });
        setComments((prev) => prev.map((c) => (c.id === comment.id ? { ...c, id: res.commentId, status: 'published' } : c)));
      } else {
        hapticError();
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
    if (!myUserId || comment.status !== 'published') return;
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
    void togglePackCommentReaction(packId, comment.id, myUserId, reaction, !had);
  }, [myUserId, packId]);

  /**
   * Скрыть у автора набора: не жёсткое удаление чужого текста (правила Firestore
   * это и не разрешают — `pack_comments` update ограничен `hiddenByAuthor`),
   * а мягкое скрытие. Комментарий пропадает из ленты у всех, кроме автора набора
   * и написавшего — то же поведение, что owner описал как «просто исчезает,
   * без уведомления автору комментария».
   */
  const handleHideByAuthor = useCallback((comment: PackComment) => {
    setMenuFor(null);
    hapticTap();
    setComments((prev) => prev.filter((c) => c.id !== comment.id));
    void (async () => {
      // зачем передаём comment.pinned (владелец 17.09.2026): скрытие
      // закреплённого комментария автоматически снимает закрепление — см.
      // докстринг hidePackCommentByAuthor.
      const ok = await hidePackCommentByAuthor(packId, comment.id, true, comment.pinned);
      if (!ok) {
        // Сеть отказала — вернуть строку, не терять факт молча.
        setComments((prev) => sortPackComments([...prev, comment]));
        hapticError();
      }
      // зачем НЕ шлём community_pack_comments_changed (аудит 2026-09-17): скрытие
      // не трогает серверный commentsCount (hidePackCommentByAuthor намеренно
      // этого не делает — это «скрыть у себя», не «удалить», см. её докстринг).
      // Раньше здесь эмитился delta:-1, и счётчик локально проседал, а на
      // следующем чтении каталога прыгал обратно — «прыжок числа», запрещённый
      // правилом Optimistic UI.
    })();
  }, [packId]);

  const handleDeleteMine = useCallback((comment: PackComment) => {
    setMenuFor(null);
    hapticTap();
    setComments((prev) => prev.filter((c) => c.id !== comment.id));
    void (async () => {
      const ok = await deletePackComment(packId, comment.id);
      if (ok) {
        emitAppEvent('community_pack_comments_changed', { packId, delta: -1 });
      } else {
        setComments((prev) => sortPackComments([...prev, comment]));
        hapticError();
      }
    })();
  }, [packId]);

  const handleTogglePin = useCallback((comment: PackComment) => {
    setMenuFor(null);
    hapticTap();
    const nextPinned = !comment.pinned;
    setComments((prev) => sortPackComments(prev.map((c) => ({ ...c, pinned: c.id === comment.id ? nextPinned : false }))));
    void setPackCommentPinned(packId, comment.id, nextPinned);
  }, [packId]);

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

  const renderItem = useCallback(({ item }: { item: PackComment }) => {
    const mine = item.authorId === myUserId;
    const isHighlighted = highlightId === item.id;
    const canModerate = isPackAuthor || mine;
    return (
      <View
        style={{
          flexDirection: 'row',
          gap: 11,
          padding: 12,
          borderRadius: 18,
          backgroundColor: isHighlighted ? `${t.accent}22` : item.pinned ? t.bgSurface : t.bgCard,
          marginBottom: 9,
          opacity: item.status === 'sending' ? 0.55 : 1,
          shadowColor: isHighlighted ? t.accent : undefined,
          shadowOpacity: isHighlighted ? 0.4 : 0,
          shadowRadius: isHighlighted ? 10 : 0,
          shadowOffset: { width: 0, height: 0 },
          elevation: isHighlighted ? 3 : 0,
        }}
      >
        {/* зачем свой профиль отдельно от profiles[authorId] (владелец 17.09.2026,
            «аватарка не показывается правильная»): для СВОЕГО комментария (mine)
            используем myAvatarProfile — локальный, мгновенный, не ждёт сеть.
            Для чужих — profiles[authorId], догруженный батчем выше (может быть
            ещё не готов на первом кадре; AvatarView без avatar отрисует
            нейтральную заглушку по умолчанию, не пустоту). level/totalXP
            сознательно НЕ передаём — public_profiles может не содержать
            актуальный уровень (protected projectionAuthority), а выдумывать
            цифру нельзя (см. AvatarView.tsx, жалоба «Издевательство»). */}
        <View style={{ width: 34, height: 34 }}>
          <AvatarView
            avatar={(mine ? myAvatarProfile?.avatar : profiles[item.authorId]?.avatar) || undefined}
            auraId={(mine ? myAvatarProfile?.aura : profiles[item.authorId]?.aura) || undefined}
            size={34}
            animateAura={false}
          />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
            <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '700' }} numberOfLines={1}>
              {item.authorName || '—'}
            </Text>
            {packAuthorStableId && item.authorId === packAuthorStableId ? (
              <View style={{ backgroundColor: `${t.gold ?? t.accent}22`, borderRadius: 7, paddingHorizontal: 7, height: 19, justifyContent: 'center' }}>
                <Text style={{ color: t.gold ?? t.accent, fontSize: 11, fontWeight: '700' }}>{authorBadge}</Text>
              </View>
            ) : null}
            {item.pinned ? (
              <View style={{ backgroundColor: `${t.accent}22`, borderRadius: 7, paddingHorizontal: 7, height: 19, justifyContent: 'center' }}>
                <Text style={{ color: t.accent, fontSize: 11, fontWeight: '700' }}>{pinnedBadge}</Text>
              </View>
            ) : null}
            {item.status === 'published' ? (
              <Text style={{ color: t.textGhost, fontSize: 13 }}>{timeAgoLabel(item.createdAtMs, lang)}</Text>
            ) : null}
          </View>
          <Text style={{ color: t.textPrimary, fontSize: f.body, marginTop: 4 }}>{item.text}</Text>

          {item.status === 'failed' ? (
            <View style={{ flexDirection: 'row', gap: 14, marginTop: 8 }}>
              <TouchableOpacity onPress={() => handleRetry(item)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={{ color: t.accent, fontSize: f.caption, fontWeight: '700' }}>
                  {triLang(lang, { ru: 'Повторить', uk: 'Повторити', en: 'Retry', es: 'Reintentar', 'pt-BR': 'Repetir', vi: 'Thử lại', id: 'Coba lagi', tr: 'Tekrar dene', pl: 'Ponów' })}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleDiscardFailed(item.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={{ color: t.textMuted, fontSize: f.caption, fontWeight: '700' }}>
                  {triLang(lang, { ru: 'Удалить', uk: 'Видалити', en: 'Delete', es: 'Eliminar', 'pt-BR': 'Excluir', vi: 'Xóa', id: 'Hapus', tr: 'Sil', pl: 'Usuń' })}
                </Text>
              </TouchableOpacity>
            </View>
          ) : item.status === 'published' ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 9 }}>
              <TouchableOpacity
                onPress={() => handleReaction(item, 'like')}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel={triLang(lang, { ru: 'Нравится', uk: 'Подобається', en: 'Like', es: 'Me gusta', 'pt-BR': 'Curtir', vi: 'Thích', id: 'Suka', tr: 'Beğen', pl: 'Lubię to' })}
                accessibilityState={{ selected: item.myReactions.includes('like') }}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 5, height: 28, paddingHorizontal: 10, borderRadius: 14,
                  backgroundColor: item.myReactions.includes('like') ? `${t.accent}22` : t.bgSurface,
                }}
              >
                <Text style={{ fontSize: 14 }}>👍</Text>
                {item.reactions.like ? <Text style={{ color: item.myReactions.includes('like') ? t.accent : t.textSecond, fontSize: f.caption, fontWeight: '700' }}>{item.reactions.like}</Text> : null}
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleReaction(item, 'fire')}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel={triLang(lang, { ru: 'Огонь', uk: 'Вогонь', en: 'Fire', es: 'Fuego', 'pt-BR': 'Fogo', vi: 'Lửa', id: 'Api', tr: 'Ateş', pl: 'Ogień' })}
                accessibilityState={{ selected: item.myReactions.includes('fire') }}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 5, height: 28, paddingHorizontal: 10, borderRadius: 14,
                  backgroundColor: item.myReactions.includes('fire') ? `${t.accent}22` : t.bgSurface,
                }}
              >
                <Text style={{ fontSize: 14 }}>🔥</Text>
                {item.reactions.fire ? <Text style={{ color: item.myReactions.includes('fire') ? t.accent : t.textSecond, fontSize: f.caption, fontWeight: '700' }}>{item.reactions.fire}</Text> : null}
              </TouchableOpacity>
              {/* зачем «Ответить» только чужим и только пишущим (владелец
                  17.09.2026): отвечать самому себе бессмысленно, а тому, кто
                  не добавил набор, кнопка обещала бы недоступное действие —
                  композер у него скрыт. */}
              {canWrite && !mine ? (
                <TouchableOpacity
                  testID={`pack-comment-reply-${item.id}`}
                  onPress={() => handleReply(item)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityRole="button"
                  accessibilityLabel={replyLabel}
                  style={{ height: 28, paddingHorizontal: 10, borderRadius: 14, justifyContent: 'center', backgroundColor: t.bgSurface }}
                >
                  <Text style={{ color: t.textSecond, fontSize: f.caption, fontWeight: '700' }}>{replyLabel}</Text>
                </TouchableOpacity>
              ) : null}
              <View style={{ flex: 1 }} />
              <TouchableOpacity
                testID={`pack-comment-more-${item.id}`}
                onPress={() => setMenuFor(item)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                accessibilityRole="button"
                accessibilityLabel={triLang(lang, { ru: 'Ещё действия', uk: 'Ще дії', en: 'More actions', es: 'Más acciones', 'pt-BR': 'Mais ações', vi: 'Thêm hành động', id: 'Tindakan lain', tr: 'Diğer işlemler', pl: 'Więcej działań' })}
              >
                <Ionicons name="ellipsis-horizontal" size={18} color={t.textGhost} />
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      </View>
    );
  }, [myUserId, isPackAuthor, packAuthorStableId, t, f, lang, highlightId, handleReaction, handleRetry, handleDiscardFailed, handleReply, canWrite, replyLabel, authorBadge, pinnedBadge, profiles, myAvatarProfile]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }} activeOpacity={1} onPress={onClose}>
        <View style={{ flex: 1 }} />
      </TouchableOpacity>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ position: 'absolute', left: 0, right: 0, bottom: 0, maxHeight: '82%' }}
      >
        <View
          style={{
            backgroundColor: t.bgPrimary,
            borderTopLeftRadius: 26,
            borderTopRightRadius: 26,
            paddingTop: 10,
            paddingHorizontal: 14,
            paddingBottom: Platform.OS === 'ios' ? 24 : 14,
            minHeight: 360,
          }}
        >
          <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: t.bgSurface2 ?? t.bgSurface, alignSelf: 'center', marginBottom: 10 }} />
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4, marginBottom: 10 }}>
            <Text style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '800', flex: 1 }} numberOfLines={1}>
              {headerTitle}{comments.length ? ` · ${comments.length}` : ''}
            </Text>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityRole="button"
              accessibilityLabel={triLang(lang, { ru: 'Закрыть', uk: 'Закрити', en: 'Close', es: 'Cerrar', 'pt-BR': 'Fechar', vi: 'Đóng', id: 'Tutup', tr: 'Kapat', pl: 'Zamknij' })}
            >
              <Ionicons name="close" size={22} color={t.textMuted} />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={{ paddingVertical: 40, alignItems: 'center' }}>
              <ActivityIndicator color={t.accent} />
            </View>
          ) : comments.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 28, gap: 8 }}>
              <Text style={{ fontSize: 36 }}>💬</Text>
              <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '700' }}>{emptyTitle}</Text>
              <Text style={{ color: t.textMuted, fontSize: f.caption, textAlign: 'center', maxWidth: 260 }}>{emptyBody}</Text>
            </View>
          ) : (
            <FlatList
              ref={listRef}
              data={comments}
              keyExtractor={(item) => item.id}
              renderItem={renderItem}
              style={{ flexGrow: 0 }}
              showsVerticalScrollIndicator={false}
              onScrollToIndexFailed={(info) => {
                // Переменная высота карточек — FlatList не всегда может измерить
                // офскрин-элемент с первой попытки. Ретраим один раз коротким кадром.
                setTimeout(() => {
                  listRef.current?.scrollToIndex({ index: info.index, animated: true, viewPosition: 0.3 });
                }, 50);
              }}
            />
          )}

          {canWrite ? (
            <View style={{ paddingTop: 12 }}>
              <View style={{ flexDirection: 'row', gap: 9, alignItems: 'flex-end' }}>
                <View style={{ flex: 1, backgroundColor: t.bgSurface, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 11, minHeight: 42, justifyContent: 'center' }}>
                  <TextInput
                    ref={composerRef}
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
                    placeholderTextColor={t.textGhost}
                    maxLength={PACK_COMMENT_MAX_LENGTH}
                    multiline
                    accessibilityLabel={composerPlaceholder}
                    style={{ color: t.textPrimary, fontSize: f.body, maxHeight: 90 }}
                  />
                </View>
                <TouchableOpacity
                  testID="pack-comment-send"
                  disabled={!canSend}
                  onPress={handleSend}
                  accessibilityRole="button"
                  accessibilityLabel={triLang(lang, { ru: 'Отправить', uk: 'Надіслати', en: 'Send', es: 'Enviar', 'pt-BR': 'Enviar', vi: 'Gửi', id: 'Kirim', tr: 'Gönder', pl: 'Wyślij' })}
                  accessibilityState={{ disabled: !canSend }}
                  style={{
                    width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center',
                    backgroundColor: canSend ? t.accent : (t.bgSurface2 ?? t.bgSurface),
                  }}
                >
                  <Ionicons name="arrow-up" size={19} color={canSend ? t.correctText : t.textGhost} />
                </TouchableOpacity>
              </View>
              {counter.visible ? (
                <Text style={{ color: counter.left <= 10 ? (t.gold ?? t.accent) : t.textGhost, fontSize: 12, textAlign: 'right', marginTop: 5, marginRight: 6 }}>
                  {triLang(lang, { ru: `${counter.left} осталось`, uk: `${counter.left} залишилось`, en: `${counter.left} left`, es: `${counter.left} restantes`, 'pt-BR': `${counter.left} restantes`, vi: `còn ${counter.left}`, id: `${counter.left} tersisa`, tr: `${counter.left} kaldı`, pl: `${counter.left} pozostało` })}
                </Text>
              ) : null}
            </View>
          ) : null}
        </View>
      </KeyboardAvoidingView>

      {/* Меню «···»: закрепить/скрыть — автору набора; удалить — своему; пожаловаться — всем. */}
      <Modal visible={!!menuFor} transparent animationType="fade" onRequestClose={() => setMenuFor(null)}>
        <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }} activeOpacity={1} onPress={() => setMenuFor(null)}>
          <TouchableOpacity activeOpacity={1} onPress={() => {}}>
            <View style={{ backgroundColor: t.bgCard, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 8, paddingBottom: Platform.OS === 'ios' ? 24 : 8 }}>
              {isPackAuthor && menuFor ? (
                <TouchableOpacity
                  onPress={() => handleTogglePin(menuFor)}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 18 }}
                >
                  <Ionicons name="pin-outline" size={18} color={t.textMuted} style={{ width: 22, textAlign: 'center' }} />
                  <Text style={{ color: t.textPrimary, fontSize: f.body }}>
                    {menuFor.pinned
                      ? triLang(lang, { ru: 'Открепить', uk: 'Відкріпити', en: 'Unpin', es: 'Desanclar', 'pt-BR': 'Desafixar', vi: 'Bỏ ghim', id: 'Lepas sematan', tr: 'Sabitlemeyi kaldır', pl: 'Odepnij' })
                      : triLang(lang, { ru: 'Закрепить', uk: 'Закріпити', en: 'Pin', es: 'Fijar', 'pt-BR': 'Fixar', vi: 'Ghim', id: 'Sematkan', tr: 'Sabitle', pl: 'Przypnij' })}
                  </Text>
                </TouchableOpacity>
              ) : null}
              {isPackAuthor && menuFor && menuFor.authorId !== myUserId ? (
                <TouchableOpacity
                  onPress={() => handleHideByAuthor(menuFor)}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 18 }}
                >
                  <Ionicons name="eye-off-outline" size={18} color={t.textMuted} style={{ width: 22, textAlign: 'center' }} />
                  <Text style={{ color: t.textPrimary, fontSize: f.body }}>
                    {/* зачем "у всех", не "у себя" (аудит 2026-09-17): скрытие убирает
                        строку из ленты для ВСЕХ читателей, кроме автора набора и
                        самого написавшего — прежний текст обещал эффект только на
                        своём устройстве, что не соответствовало реальному поведению. */}
                    {triLang(lang, { ru: 'Скрыть у всех', uk: 'Приховати у всіх', en: 'Hide from everyone', es: 'Ocultar para todos', 'pt-BR': 'Ocultar de todos', vi: 'Ẩn với mọi người', id: 'Sembunyikan dari semua', tr: 'Herkesten gizle', pl: 'Ukryj przed wszystkimi' })}
                  </Text>
                </TouchableOpacity>
              ) : null}
              {menuFor && menuFor.authorId === myUserId ? (
                <TouchableOpacity
                  onPress={() => handleDeleteMine(menuFor)}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 18 }}
                >
                  <Ionicons name="trash-outline" size={18} color={t.textMuted} style={{ width: 22, textAlign: 'center' }} />
                  <Text style={{ color: t.textPrimary, fontSize: f.body }}>
                    {triLang(lang, { ru: 'Удалить', uk: 'Видалити', en: 'Delete', es: 'Eliminar', 'pt-BR': 'Excluir', vi: 'Xóa', id: 'Hapus', tr: 'Sil', pl: 'Usuń' })}
                  </Text>
                </TouchableOpacity>
              ) : null}
              {menuFor && menuFor.authorId !== myUserId ? (
                <TouchableOpacity
                  onPress={() => { const c = menuFor; setMenuFor(null); setReportFor(c); }}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 18 }}
                >
                  <Ionicons name="flag-outline" size={18} color={t.wrong} style={{ width: 22, textAlign: 'center' }} />
                  <Text style={{ color: t.wrong, fontSize: f.body }}>
                    {triLang(lang, { ru: 'Пожаловаться', uk: 'Поскаржитися', en: 'Report', es: 'Denunciar', 'pt-BR': 'Denunciar', vi: 'Báo cáo', id: 'Laporkan', tr: 'Şikayet et', pl: 'Zgłoś' })}
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      <ReportCommentModal
        visible={!!reportFor}
        packId={packId}
        packTitle={packTitle}
        comment={reportFor}
        lang={lang}
        onClose={() => setReportFor(null)}
      />
    </Modal>
  );
}
