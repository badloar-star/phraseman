// ════════════════════════════════════════════════════════════════════════════
// NicknameEditModal.tsx — модалка смены ника для экрана «Аккаунт».
//
// Владелец 18.10 (кнопками через координатора): ник — не больше 5 смен в час, и медленный набор лимит не съедает:
//   • формат проверяется на телефоне сразу, строкой у поля (без второго слоя и без <Modal>);
//   • через 400 мс паузы — ТОЛЬКО проверка «свободно/занято» (nameCheckAvailability, без записи и без счёта смены;
//     у неё свой лимит на сервере; ответы кэшируются на время окна);
//   • ПРИМЕНЕНИЕ — одним вызовом nameReserve по «Готово» или при закрытии окна с изменённым именем: имя у родителя и в
//     локальных копиях меняется сразу (Optimistic UI), сервер атомарно записывает (источник истины — name_index);
//   • отказ: «занято» → откат + «Имя уже занято»; лимит → откат + «Сменить имя можно через N мин» (из nextChangeAt);
//     нет входа/сети → имя остаётся на телефоне, сервер догоняет nickname_rename_pending (возврат в приложение / вход);
//   • вызовы по одному: повторное «Готово» в полёте ставится в очередь, поздний ответ не затирает свежее имя.
// ════════════════════════════════════════════════════════════════════════════
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from '@expo/vector-icons/Ionicons';
import { FlowText } from '../text-integrity/FlowText';
import { useTheme } from '../ThemeContext';
import { useLang } from '../LangContext';
import { triLang } from '../../constants/i18n';
import { DebugLogger } from '../../app/debug-logger';
import { logFriendAdd } from '../../app/friend_add_trace';
import {
  checkNameAvailabilityDetailed,
  normalizeNameIndexKey,
  reserveNameDetailed,
  warmNameAvailabilityAuth,
} from '../../app/firestore_leaderboard';
import { patchAppSnapshot } from '../../app/app_snapshot_store';
import { getDevNameCheck } from '../../app/dev_account_state';
import {
  clearNicknameRenamePending,
  markNicknameRenamePending,
  takeNicknameRenameTakenNotice,
} from '../../app/nickname_rename_pending';
import {
  containsBadWord,
  updateLocalNameReferences,
} from '../../app/nickname_change_helpers';
import { hapticTap as doHaptic } from '../../hooks/use-haptics';
import HybridAlertShell, { CascadeItem } from '../modal_fx/HybridAlertShell';
import { useReduceMotion } from '../../hooks/use_reduce_motion';
import { LUM } from '../../constants/motionHybrid';
import { liquidGlassTokens } from '../../constants/liquidGlassThemePalette';
import { nestedBoxShadow, plateBoxShadow } from '../v2/ShadowSurface';
import { useStableSafeAreaInsets } from '../../app/stable_safe_area_metrics';

const EXEMPT_COLOR_1 = '#000000'; // theme-exempt: затемнение и тень окна — тёмный скрим/чёрная тень в любой теме
const EXEMPT_COLOR_2 = 'rgba(0,0,0,0.7)'; // theme-exempt: затемнение и тень окна — тёмный скрим/чёрная тень в любой теме
const EXEMPT_COLOR_3 = 'rgba(0,0,0,0.7)'; // theme-exempt: затемнение и тень окна — тёмный скрим/чёрная тень в любой теме

// зачем (владелец, 2026-09-13): «сперва логи». Экран настроек замирал после
// смены имени, а путь был нем: ни один ранний return не оставлял следа, и нельзя
// было понять, дошло ли дело до брони и какой ответ пришёл. Баг ловится ТОЛЬКО
// при плохой сети, поэтому трассировка обязана пережить релизную сборку — но без
// шума: в релизе в консоль не пишем, а реальный отказ уходит в DebugLogger.
// Имя НЕ печатаем (PII) — только длину и факт изменения.
function traceNick(line: string): void {
  if (typeof __DEV__ !== 'undefined' && __DEV__) console.log(`[NICK] ${line}`); // guard-ok: под __DEV__
}

/** Пауза после последней буквы до одной проверки имени (без запроса на каждую букву; смену не тратит). */
const NAME_CHECK_DEBOUNCE_MS = 400;
type LiveNameStatus = 'idle' | 'checking' | 'available' | 'taken' | 'rate_limited' | 'invalid';
/** Сервер не дал nextChangeAt — показываем час окна лимита, а не «через минуту». */
const RATE_LIMIT_FALLBACK_MS = 60 * 60 * 1000;

/**
 * «Сменить имя можно через 12 мин» — для ветки rate_limited, когда сервер знает оставшееся время (лимит 5 смен в час).
 * зачем (координатор 18.10, Переводчик): сокращение единицы не склоняется — верно при 1, 2, 5, 21 мин; число и «мин» не
 * разрываются переносом (неразрывный пробел); дробные минуты округляются вверх, минимум 1.
 */
export function nickRetryInMinutesText(lang: Parameters<typeof triLang>[0], minutes: number): string {
  const n = Math.max(1, Math.ceil(Number.isFinite(minutes) ? minutes : 1));
  return triLang(lang, {
    ru: `Сменить имя можно через ${n} мин`,
    uk: `Змінити ім'я можна через ${n} хв`,
    en: `You can change your name in ${n} min`,
    es: `Podrás cambiar el nombre en ${n} min`,
    'pt-BR': `Você pode mudar o nome em ${n} min`,
    vi: `Có thể đổi tên sau ${n} phút`,
    id: `Nama bisa diganti dalam ${n} mnt`,
    tr: `Adını ${n} dk sonra değiştirebilirsin`,
    pl: `Nazwę możesz zmienić za ${n} min`,
  });
}

interface NicknameEditModalProps {
  visible: boolean;
  /** Текущее имя — стартовое значение поля при каждом открытии. */
  currentName: string;
  onRequestClose: () => void;
  /** Мгновенный локальный апдейт у родителя (до ответа сервера). */
  onOptimisticApply: (name: string) => void;
  /** Откат у родителя при отказе сервера. */
  onRollback: (oldName: string) => void;
  /** Некритичная инлайн-плашка у родителя (null — скрыть). */
  onNotice: (text: string | null) => void;
  /** Production default — hybrid; explicit `classic` is the rollback/QA path. */
  motionVariant?: 'classic' | 'hybrid';
}

export default function NicknameEditModal({
  visible,
  currentName,
  onRequestClose,
  onOptimisticApply,
  onRollback,
  onNotice,
  motionVariant = 'hybrid',
}: NicknameEditModalProps) {
  const { theme: t, liquidGlassThemeId, f } = useTheme();
  // зачем: окно смены имени — Liquid Glass по макету PRF-19; материал берём из активной темы (13 тем).
  const glass = liquidGlassTokens(liquidGlassThemeId);
  const insets = useStableSafeAreaInsets();
  const { lang } = useLang();
  const reduceMotion = useReduceMotion();
  const isHybrid = motionVariant === 'hybrid';
  const L = (
    ru: string, uk: string, en: string, es: string, ptBr: string,
    vi: string, id: string, tr: string, pl: string,
  ) => triLang(lang, { ru, uk, en, es, 'pt-BR': ptBr, vi, id, tr, pl });

  // зачем (владелец 18.10: лимит 5 смен в час, «медленный набор не должен съедать лимит»): при наборе — только проверка
  // «свободно/занято», применение (nameReserve, счёт смены) — по «Готово» или закрытию окна. Журнал [NICK-SAVE]/[NICK-CHECK].
  const [newName, setNewName] = useState(currentName);
  const [liveStatus, setLiveStatus] = useState<LiveNameStatus>('idle');
  const [invalidMessage, setInvalidMessage] = useState<string | null>(null);
  const visibleRef = useRef(visible);
  visibleRef.current = visible;
  const newNameRef = useRef(currentName);
  newNameRef.current = newName;
  /** Имя, которое сейчас считается применённым (оптимистично до ответа сервера). */
  const appliedNameRef = useRef(currentName.trim());
  const inFlightRef = useRef(false);
  const queuedNameRef = useRef<string | null>(null);
  const applySeqRef = useRef(0);
  const checkSeqRef = useRef(0);
  /** Ответы проверки на время окна: повторный ввод того же имени не идёт в сеть (экономия лимита проверок и чтений). */
  const checkedCacheRef = useRef(new Map<string, 'available' | 'taken'>());
  /** До какого момента сервер не примет смену (лимит) — «Готово» не шлёт вызов впустую, а сразу показывает время. */
  const rateLimitedUntilRef = useRef(0);
  const requestApplyRef = useRef<(name: string) => void>(() => undefined);

  const rateLimitedText = () => nickRetryInMinutesText(lang, (rateLimitedUntilRef.current - Date.now()) / 60_000);

  const takenNotice = () => L('Это имя уже занято. Выбери другое.', "Це ім\'я вже зайняте. Обери інше.", 'This name is already taken. Choose another.', 'Este nombre ya está en uso. Elige otro.', 'Esse nome já está em uso. Escolha outro.', 'Tên này đã được dùng. Hãy chọn tên khác.', 'Nama ini sudah dipakai. Pilih yang lain.', 'Bu ad zaten kullanılıyor. Başka bir ad seç.', 'Ta nazwa jest już zajęta. Wybierz inną.');

  const validateNameFormat = (trimmed: string): string | null => {
    if (trimmed.length < 2) return L('Минимум 2 символа', 'Мінімум 2 символи', 'Minimum 2 characters', 'Mínimo 2 caracteres', 'Mínimo de 2 caracteres', 'Tối thiểu 2 ký tự', 'Minimal 2 karakter', 'En az 2 karakter', 'Minimum 2 znaki');
    if (trimmed.length > 20) return L('Максимум 20 символов', 'Максимум 20 символів', 'Maximum 20 characters', 'Máximo 20 caracteres', 'Máximo de 20 caracteres', 'Tối đa 20 ký tự', 'Maksimal 20 karakter', 'En fazla 20 karakter', 'Maksymalnie 20 znaków');
    if (containsBadWord(trimmed)) return L('Недопустимое имя', "Недопустиме ім\'я", 'Invalid name', 'Nombre no válido', 'Nome inválido', 'Tên không hợp lệ', 'Nama tidak valid', 'Geçersiz ad', 'Niedozwolona nazwa');
    return null;
  };

  /** Локальные копии имени: снимок приложения, хранилище, ссылки на имя в локальных данных. */
  const writeLocalName = useCallback((name: string, previous: string) => {
    patchAppSnapshot((current) => current.profile ? {
      profile: { ...current.profile, source: 'local', updatedAt: Date.now(), name },
    } : {});
    void AsyncStorage.setItem('user_name', name).catch((error) => {
      DebugLogger.error('NicknameEditModal:localName', error, 'warning');
    });
    void updateLocalNameReferences(previous, name).catch((error) => {
      DebugLogger.error('NicknameEditModal:localReferences', error, 'warning');
    });
  }, []);

  requestApplyRef.current = (name: string) => {
    if (name === appliedNameRef.current) {
      traceNick('apply:skip reason=already_applied');
      return;
    }
    if (inFlightRef.current) {
      queuedNameRef.current = name;
      console.log(`[NICK-SAVE] apply:queued len=${name.length} — предыдущий вызов ещё в полёте`); // guard-ok: очередь вызовов брони
      return;
    }
    inFlightRef.current = true;
    const previous = appliedNameRef.current;
    const seq = ++applySeqRef.current;
    const startedAt = Date.now();
    console.log(`[NICK-SAVE] apply:start seq=${seq} len=${name.length} prevLen=${previous.length} visible=${visibleRef.current}`); // guard-ok: вход в применение имени
    // Optimistic UI: имя меняется у родителя и в локальных копиях сразу, сервер догоняет.
    onNotice(null);
    onOptimisticApply(name);
    writeLocalName(name, previous);
    appliedNameRef.current = name;
    void reserveNameDetailed(name, previous, { source: 'settings' })
      .catch((error: unknown) => {
        DebugLogger.error('NicknameEditModal:reserveName', error, 'warning');
        return { status: 'error' as const };
      })
      .then((reservation) => {
        const ms = Date.now() - startedAt;
        const stillTyped = newNameRef.current.trim() === name;
        console.log(`[NICK-SAVE] apply:result seq=${seq} status=${reservation.status} ms=${ms} stillTyped=${stillTyped} visible=${visibleRef.current}`); // guard-ok: ответ сервера и что увидит человек
        // зачем (владелец 17.10 «друзья должны находиться мгновенно»): в сторе видно, когда новый ник попал в поисковый индекс.
        logFriendAdd('nick_publish', { source: 'settings', status: reservation.status, ms });
        // Ответ сервера пришёл — ожидающая досылка (если была от прошлой попытки без сети) больше не нужна.
        void clearNicknameRenamePending(`modal_${reservation.status}`);
        if (reservation.status === 'ok') {
          if (visibleRef.current && stillTyped) setLiveStatus('available');
          return;
        }
        // зачем (владелец 18.10): 'rate_limited' — лимит 5 смен в час (или потолок на IP); откат как у «занято», но имя не
        // помечаем занятым, а показываем точное время из nextChangeAt.
        if (reservation.status === 'taken' || reservation.status === 'cooldown' || reservation.status === 'rate_limited') {
          // зачем: откат только если за это время не применилось более свежее имя — поздний ответ не перетирает свежий ввод.
          if (appliedNameRef.current === name) {
            console.log(`[NAME-CHANGE] rollback reason=${reservation.status} seq=${seq}`); // guard-ok: причина отката
            appliedNameRef.current = previous;
            onRollback(previous);
            writeLocalName(previous, name);
          }
          if (reservation.status === 'taken') checkedCacheRef.current.set(normalizeNameIndexKey(name), 'taken');
          if (reservation.status === 'rate_limited') {
            const until = Number(reservation.nextChangeAt) || 0;
            rateLimitedUntilRef.current = until > Date.now() ? until : Date.now() + RATE_LIMIT_FALLBACK_MS;
          }
          const notice = reservation.status === 'taken' ? takenNotice() : reservation.status === 'rate_limited' ? rateLimitedText() : null;
          if (visibleRef.current && stillTyped) {
            setLiveStatus(reservation.status === 'cooldown' ? 'idle' : reservation.status);
          } else if (notice) {
            // окно уже закрыто «Готово» — причину отката показывает плашка у родителя
            console.log(`[NICK-SAVE] apply:notice_to_parent seq=${seq} reason=${reservation.status}`); // guard-ok: что увидел человек
            onNotice(notice);
          }
          return;
        }
        // 'error': нет входа / сети / таймаут — имя остаётся на телефоне, сервер догонит nickname_rename_pending при возврате в приложение или входе.
        console.warn(`[NICK-SAVE] apply:kept_local seq=${seq} reason=reserve_error — имя на телефоне, ждёт досылки`); // guard-ok: ранний исход называет причину
        if (appliedNameRef.current === name) void markNicknameRenamePending(name, previous);
        if (stillTyped) setLiveStatus('idle');
      })
      .finally(() => {
        inFlightRef.current = false;
        const queued = queuedNameRef.current;
        queuedNameRef.current = null;
        if (queued && queued !== appliedNameRef.current) requestApplyRef.current(queued);
      });
  };

  /** Одна проверка «свободно/занято» после паузы: без записи и без счёта смены; поздний ответ не перетирает свежий ввод. */
  const runAvailabilityCheck = (trimmed: string) => {
    const seq = ++checkSeqRef.current;
    const key = normalizeNameIndexKey(trimmed);
    const startedAt = Date.now();
    void checkNameAvailabilityDetailed(trimmed)
      .catch((error: unknown) => {
        DebugLogger.error('NicknameEditModal:checkName', error, 'warning');
        return { status: 'error' as const };
      })
      .then((result) => {
        const fresh = seq === checkSeqRef.current && newNameRef.current.trim() === trimmed;
        console.log(`[NICK-CHECK] modal:result seq=${seq} status=${result.status} ms=${Date.now() - startedAt} fresh=${fresh}`); // guard-ok: ответ проверки и что увидит человек
        if (result.status === 'available' || result.status === 'taken') checkedCacheRef.current.set(key, result.status);
        if (!fresh || !visibleRef.current) return;
        // 'limited' (лимит проверок) и 'error' — статус молча не показываем: «Готово» всё равно проверит имя атомарно.
        setLiveStatus(result.status === 'available' || result.status === 'taken' ? result.status : 'idle');
      });
  };

  useEffect(() => {
    if (!visible) return;
    // Новое открытие: стартуем от того имени, что сейчас у родителя (если прошлый вызов ещё летит — он сам доведёт своё).
    if (!inFlightRef.current) appliedNameRef.current = currentName.trim();
    checkedCacheRef.current.clear();
    checkSeqRef.current += 1;
    setNewName(currentName);
    setLiveStatus('idle');
    setInvalidMessage(null);
    warmNameAvailabilityAuth();
    // зачем (координатор 09:25): досылка без сети нашла имя занятым и вернула прежнее — показываем «Имя уже занято» сейчас.
    let cancelled = false;
    void takeNicknameRenameTakenNotice().then((takenName) => {
      if (cancelled || !takenName) return;
      console.log(`[NICK-PENDING] modal:show_taken len=${takenName.length}`); // guard-ok: что увидел человек после досылки
      checkedCacheRef.current.set(normalizeNameIndexKey(takenName), 'taken');
      setNewName(takenName);
      setLiveStatus('taken');
    });
    return () => { cancelled = true; };
  }, [visible, currentName]);

  // зачем (координатор 12.10, СПЕРВА ЛОГИ): шторка имени пряталась под клавиатурой. Пишем каждое событие клавиатуры, пока шторка
  // открыта: высоту, верх клавиатуры (screenY), режим. Подъём шторки — `[MODAL-KB]` в HybridAlertShell.
  useEffect(() => {
    if (!visible) return undefined;
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showEvent, (event) => {
      console.log(`[NICKNAME-KB] ${showEvent} height=${Math.round(event.endCoordinates?.height ?? 0)} screenY=${Math.round(event.endCoordinates?.screenY ?? 0)} placement=bottom avoidKeyboard=on platform=${Platform.OS}`); // guard-ok: одна строка на показ клавиатуры
    });
    const hide = Keyboard.addListener(hideEvent, () => {
      console.log(`[NICKNAME-KB] ${hideEvent}`); // guard-ok: одна строка на скрытие клавиатуры
    });
    return () => { show.remove(); hide.remove(); };
  }, [visible]);

  useEffect(() => {
    if (!visible) return undefined;
    // Новый ввод делает устаревшим ответ прошлой проверки.
    checkSeqRef.current += 1;
    const trimmed = newName.trim();
    if (!trimmed) {
      setLiveStatus('idle');
      return undefined;
    }
    const invalid = validateNameFormat(trimmed);
    if (invalid) {
      traceNick(`check:invalid len=${trimmed.length}`);
      setInvalidMessage(invalid);
      setLiveStatus('invalid');
      return undefined;
    }
    if (trimmed === appliedNameRef.current) {
      setLiveStatus('idle');
      return undefined;
    }
    // dev `namecheck=` подменяет ответ в памяти ДО кэша и сети; вне dev / в стор-сборке геттер всегда null.
    const devNameCheck = getDevNameCheck();
    if (devNameCheck !== null) {
      console.log(`[DEV-STATE] namecheck=${devNameCheck}: ответ проверки имени подменён, сервер не вызывается`); // guard-ok: dev-ветка
      setLiveStatus(devNameCheck === 'available' ? 'available' : devNameCheck === 'taken' ? 'taken' : devNameCheck === 'checking' ? 'checking' : 'idle');
      return undefined;
    }
    const cached = checkedCacheRef.current.get(normalizeNameIndexKey(trimmed));
    if (cached) {
      console.log(`[NICK-CHECK] check:${cached} source=session_cache len=${trimmed.length}`); // guard-ok: ответ из кэша, без сети
      setLiveStatus(cached);
      return undefined;
    }
    setLiveStatus('checking');
    const timer = setTimeout(() => runAvailabilityCheck(trimmed), NAME_CHECK_DEBOUNCE_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newName, visible]);

  const closeNow = useCallback(() => {
    Keyboard.dismiss();
    onRequestClose();
  }, [onRequestClose]);

  // «Готово» / ввод и крестик / «назад» / тап по фону: изменённое имя применяется одним nameReserve и окно закрывается.
  // Если имя заведомо не пройдёт (формат, «занято» из проверки, лимит ещё не истёк): «Готово» оставляет окно открытым с
  // причиной у поля, а закрытие просто закрывает — без вызова и без траты смены.
  const finishAndClose = (trigger: 'done' | 'dismiss') => {
    const trimmed = newName.trim();
    if (!trimmed || trimmed === appliedNameRef.current) {
      console.log(`[NICK-SAVE] close:${trigger} reason=${trimmed ? 'unchanged' : 'empty'}`); // guard-ok: ранний путь называет причину
      closeNow();
      return;
    }
    const invalid = validateNameFormat(trimmed);
    const knownTaken = checkedCacheRef.current.get(normalizeNameIndexKey(trimmed)) === 'taken';
    const limitedMs = rateLimitedUntilRef.current - Date.now();
    const blocked: LiveNameStatus | null = invalid ? 'invalid' : knownTaken ? 'taken' : limitedMs > 0 ? 'rate_limited' : null;
    if (blocked) {
      console.log(`[NICK-SAVE] close:${trigger} blocked=${blocked} waitMs=${Math.max(0, limitedMs)} — вызова нет`); // guard-ok: ранний путь называет причину
      if (trigger === 'done') {
        setLiveStatus(blocked);
        return;
      }
      closeNow();
      return;
    }
    console.log(`[NICK-SAVE] close:${trigger} apply len=${trimmed.length}`); // guard-ok: вход в применение имени
    requestApplyRef.current(trimmed);
    closeNow();
  };
  const close = () => finishAndClose('dismiss');

  const availabilityStatus = liveStatus;
  const availabilityMessage = (() => {
    if (liveStatus === 'checking') {
      return L('Проверяем имя…', 'Перевіряємо ім\'я…', 'Checking the name…', 'Comprobando nombre…', 'Verificando nome…', 'Đang kiểm tra tên…', 'Memeriksa nama…', 'Ad kontrol ediliyor…', 'Sprawdzamy nazwę…');
    }
    if (liveStatus === 'available') {
      return L('Имя свободно', 'Ім\'я вільне', 'The name is available', 'El nombre está disponible', 'Nome disponível', 'Tên khả dụng', 'Nama tersedia', 'Ad kullanılabilir', 'Nazwa jest dostępna');
    }
    if (liveStatus === 'taken') {
      return L('Имя уже занято', 'Ім\'я вже зайняте', 'The name is already taken', 'El nombre ya está en uso', 'Este nome já está em uso', 'Tên đã được sử dụng', 'Nama sudah dipakai', 'Bu ad zaten kullanılıyor', 'Nazwa jest już zajęta');
    }
    if (liveStatus === 'rate_limited') return rateLimitedText();
    if (liveStatus === 'invalid') return invalidMessage ?? '';
    return '';
  })();

  useEffect(() => {
    if (
      !visible
      || Platform.OS !== 'ios'
      || availabilityStatus === 'idle'
      || availabilityStatus === 'checking'
      || !availabilityMessage
    ) return;
    AccessibilityInfo.announceForAccessibility(availabilityMessage);
  }, [availabilityMessage, availabilityStatus, visible]);

  // зачем: «свободно» — нейтральный текст темы с галочкой (зелёные поверхности/акценты убраны
  // владельцем); красным остаётся только «занято» — это семантика ошибки, а не декор.
  const availabilityColor = availabilityStatus === 'taken' || availabilityStatus === 'rate_limited' || availabilityStatus === 'invalid'
    ? t.wrong
    : availabilityStatus === 'available'
      ? glass.text
      : glass.secondary;
  const closeLabel = L('Закрыть', 'Закрити', 'Close', 'Cerrar', 'Fechar', 'Đóng', 'Tutup', 'Kapat', 'Zamknij');
  const bottomRadius = isHybrid ? 0 : 28;

  const panelContent = (
    <View
      style={{
        width: isHybrid ? '100%' : '88%',
        minWidth: 280,
        maxWidth: 430,
        backgroundColor: glass.opaqueSheet,
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        borderBottomLeftRadius: bottomRadius,
        borderBottomRightRadius: bottomRadius,
        // зачем: паритет profile.html (13.10): шторка макета — поля 12/18/40; низ 40 считаем от края экрана (не плюс inset), иначе шторка выше макета
        paddingHorizontal: 18,
        paddingTop: 12,
        paddingBottom: isHybrid ? Math.max(40, insets.bottom + 12) : 20,
        // зачем (стиль «Тень»): шторку снизу отделяет затемнение (без тени), окно по центру — тень плашки; overflow: hidden убран, он резал бы тень
        boxShadow: isHybrid ? undefined : plateBoxShadow(glass),
      }}
    >
      {/* зачем: паритет profile.html (13.10): ручка шторки 44×5 r3, отступ 26; шапка по центру, зазор 10 */}
      <View style={{ width: 44, height: 5, borderRadius: 3, alignSelf: 'center', marginBottom: 26, backgroundColor: glass.glassEdge }} />
      <CascadeItem delay={isHybrid ? LUM.ladder[2] : 0} reduceMotion={!isHybrid || reduceMotion}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Text accessibilityRole="header" style={{ color: glass.text, fontSize: 22, lineHeight: 28 /* зачем (settings-gaps-states, 12.10): заголовок шторки 22/28 как в макете, не зависит от шага шрифта f.h2 */, fontWeight: '700' }}>
              {L('Изменить имя', 'Змінити ім\'я', 'Change name', 'Cambiar nombre', 'Alterar nome', 'Đổi tên', 'Ubah nama', 'Adı değiştir', 'Zmień nazwę')}
            </Text>
          </View>
          <TouchableOpacity
            testID="nickname-close"
            accessibilityRole="button"
            accessibilityLabel={closeLabel}
            activeOpacity={0.7}
            // зачем: паритет profile.html (13.10): крестик 35×35 как в макете; зона нажатия добрана hitSlop до 45
            hitSlop={{ top: 5, right: 5, bottom: 5, left: 5 }}
            style={{
              width: 35,
              height: 35,
              borderRadius: 18,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: glass.selected,
              boxShadow: nestedBoxShadow(glass), // зачем (стиль «Тень»): кнопка закрытия — малая тень
            }}
            onPress={() => { doHaptic(); close(); }}
          >
            <Ionicons name="close" size={18} color={glass.text} />
          </TouchableOpacity>
        </View>
      </CascadeItem>
      <CascadeItem delay={isHybrid ? LUM.ladder[2] + 96 : 0} reduceMotion={!isHybrid || reduceMotion}>
        {/* зачем: паритет profile.html (13.10): метка поля — eyebrow макета (заглавные, жирная, разрядка 1.7), размер как у SettingsGlassEyebrow (13/18, D145) */}
        <Text style={{ color: glass.secondary, fontSize: 13, lineHeight: 18, fontWeight: '700', letterSpacing: 1.7, marginTop: 20, marginBottom: 8 }}>{/* guard-ok: это метка поля (eyebrow макета), не подпись под названием */}
          {L('ИМЯ ПРОФИЛЯ', 'ІМ\'Я ПРОФІЛЮ', 'PROFILE NAME', 'NOMBRE DE PERFIL', 'NOME DO PERFIL', 'TÊN HỒ SƠ', 'NAMA PROFIL', 'PROFİL ADI', 'NAZWA PROFILU')}
        </Text>
        <TextInput
          testID="nickname-input"
          accessibilityLabel={L('Имя профиля', 'Ім\'я профілю', 'Profile name', 'Nombre de perfil', 'Nome do perfil', 'Tên hồ sơ', 'Nama profil', 'Profil adı', 'Nazwa profilu')}
          style={{
            // Поле — вложенная плашка контрола темы с малой тенью, без кромки (стиль «Тень»).
            backgroundColor: glass.opaqueControl,
            boxShadow: nestedBoxShadow(glass) as unknown as string /* зачем: типы RN для стиля TextInput знают boxShadow только строкой, на деле массив работает */,
            color: glass.text,
            fontSize: 20, // зачем (settings-gaps-states): ввод имени 20 как в макете (.gs-av), не f.h2=21
            // зачем: паритет profile.html (13.10): поле 48, r14, поля 12/14
            minHeight: 48,
            paddingHorizontal: 14,
            paddingVertical: 12,
            borderRadius: 14,
            marginBottom: 8,
          }}
          value={newName}
          onChangeText={setNewName}
          placeholder={L('Введи имя...', 'Введи ім\'я...', 'Enter your name...', 'Escribe tu nombre...', 'Digite seu nome...', 'Nhập tên...', 'Masukkan nama...', 'Adını gir...', 'Wpisz imię...')}
          placeholderTextColor={glass.mutedText}
          autoFocus={!isHybrid}
          maxLength={20}
          returnKeyType="done"
          onSubmitEditing={() => finishAndClose('done')}
          blurOnSubmit
        />
        <View
          style={{ minHeight: 22, marginBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 10 /* зачем: паритет profile.html (13.10): зазор значок↔текст 10 */ }}
        >
          {availabilityStatus === 'checking' ? (
            <ActivityIndicator size="small" color={availabilityColor} />
          ) : availabilityStatus === 'available' ? (
            <Ionicons name="checkmark-circle-outline" size={16} color={availabilityColor} />
          ) : availabilityStatus === 'taken' || availabilityStatus === 'rate_limited' || availabilityStatus === 'invalid' ? (
            <Ionicons name="close-circle-outline" size={16} color={availabilityColor} />
          ) : null}
          {availabilityMessage ? (
            <Text
              testID="nickname-availability"
              accessibilityLiveRegion="polite"
              style={{ color: availabilityColor, fontSize: 13, lineHeight: 18, fontWeight: '600', flexShrink: 1 /* зачем (settings-gaps-states): статус имени 13/18 как в макете */ }}
            >
              {availabilityMessage}
            </Text>
          ) : null}
        </View>
      </CascadeItem>
      <CascadeItem delay={isHybrid ? LUM.ladder[2] + 192 : 0} reduceMotion={!isHybrid || reduceMotion}>
        {/* зачем (владелец 18.10): одна кнопка «Готово» применяет имя и закрывает окно; крестик/фон тоже применяют
            изменённое имя — отдельной «Отмены» нет. */}
        <View style={{ flexDirection: 'row', marginTop: 8 }}>
          <TouchableOpacity
            testID="nickname-save"
            accessibilityRole="button"
            activeOpacity={0.8}
            style={{
              flex: 1,
              minHeight: 48,
              paddingHorizontal: 12,
              paddingVertical: 12,
              borderRadius: 24,
              backgroundColor: glass.accent, // light-accent-ok: кнопка «Готово» с подписью accentInk на accent
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onPress={() => { doHaptic(); finishAndClose('done'); }}
          >
            {/* text-integrity: без усечения и без сжатия шрифта — длинные переводы переносятся, кнопка растёт по minHeight. */}
            <FlowText
              testID="nickname-save-label"
              provenance="authored"
              style={{ color: glass.accentInk, fontSize: f.body, fontWeight: '700', flexShrink: 1, textAlign: 'center' }}
            >
              {L('Готово', 'Готово', 'Done', 'Listo', 'Pronto', 'Xong', 'Selesai', 'Tamam', 'Gotowe')}
            </FlowText>
          </TouchableOpacity>
        </View>
      </CascadeItem>
    </View>
  );

  if (isHybrid) {
    return (
      <HybridAlertShell
        visible={visible}
        onRequestClose={close}
        shadowColor={EXEMPT_COLOR_1}
        backdropColor={EXEMPT_COLOR_2}
        placement="bottom"
        // зачем (координатор 12.10, кадры settings-gap-025/026): без этого шторка оставалась под клавиатурой — поле, «Имя свободно/занято»
        // и «Сохранить» скрыты. Шелл поднимает нижнюю шторку на перекрытие клавиатуры только при этом флаге.
        avoidKeyboard
        testID="nickname-edit-modal-hybrid"
      >
        {panelContent}
      </HybridAlertShell>
    );
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <Pressable
        style={{ flex: 1, backgroundColor: EXEMPT_COLOR_3, justifyContent: 'center', alignItems: 'center' }}
        onPress={close}
      >
        <Pressable onPress={(e) => e.stopPropagation()}>
          {panelContent}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
