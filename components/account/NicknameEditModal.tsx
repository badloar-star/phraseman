// ════════════════════════════════════════════════════════════════════════════
// NicknameEditModal.tsx — модалка смены ника для экрана «Аккаунт».
//
// Повторяет проверенный флоу настроек (Optimistic UI):
//   • новое имя видно РОДИТЕЛЮ сразу по тапу «Сохранить», модалка закрывается
//     мгновенно — бронь имени на сервере (уникальность + кулдаун 14 дней,
//     источник истины НЕ ослаблен) идёт фоном;
//   • отказ сервера → откат к старому имени + некритичная инлайн-плашка
//     (onNotice), а не блокирующий Alert;
//   • last-write-guard: поздний ответ устаревшей попытки не затирает более
//     свежее локальное имя (double-tap / повторный сабмит).
// Валидационные сообщения показываем стеклянным слоем ВНУТРИ этой же модалки
// (GlassInlineAlert, не <Modal>): RN-<Modal> поверх открытого <Modal> на iOS ломает
// стек презентаций (см. историю в settings.tsx), а обычный слой — нет.
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
import GlassInlineAlert from './GlassInlineAlert';
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
  type NameAvailabilityStatus,
} from '../../app/firestore_leaderboard';
import { patchAppSnapshot } from '../../app/app_snapshot_store';
import { getDevNameCheck } from '../../app/dev_account_state';
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

const NAME_AVAILABILITY_DEBOUNCE_MS = 600;
const NAME_AVAILABILITY_CACHE_LIMIT = 12;
type AvailabilityUiStatus = 'idle' | 'checking' | NameAvailabilityStatus;

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

  const [newName, setNewName] = useState(currentName);
  const [saving, setSaving] = useState(false);
  const [availabilityStatus, setAvailabilityStatus] = useState<AvailabilityUiStatus>('idle');
  const savingRef = useRef(false);
  /** last-write-guard: см. шапку файла. */
  const attemptGuardRef = useRef(0);
  const availabilityRequestRef = useRef(0);
  const availabilityCacheRef = useRef(new Map<string, NameAvailabilityStatus>());

  useEffect(() => {
    if (!visible) return;
    // Results are only reused while this opening is active. A name may be
    // claimed or released while the account screen remains mounted.
    availabilityCacheRef.current.clear();
    setNewName(currentName);
    warmNameAvailabilityAuth();
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
    const requestId = ++availabilityRequestRef.current;
    if (!visible) {
      setAvailabilityStatus('idle');
      return;
    }

    const trimmed = newName.trim();
    if (
      trimmed === currentName.trim()
      || trimmed.length < 2
      || trimmed.length > 20
      || containsBadWord(trimmed)
    ) {
      setAvailabilityStatus('idle');
      return;
    }

    // зачем (координатор 12.10, кадры settings-gap-024/025/026/031): ответ проверки решает сервер, «Проверяем…» живёт доли секунды.
    // dev `namecheck=` подменяет ответ в памяти ДО кэша и сети; вне dev / в стор-сборке геттер всегда null.
    const devNameCheck = getDevNameCheck();
    if (devNameCheck !== null) {
      console.log(`[DEV-STATE] namecheck=${devNameCheck}: ответ проверки имени подменён, сервер не вызывается`); // guard-ok: dev-ветка
      setAvailabilityStatus(devNameCheck);
      return;
    }

    const cacheKey = normalizeNameIndexKey(trimmed);
    const cached = availabilityCacheRef.current.get(cacheKey);
    if (cached) {
      setAvailabilityStatus(cached);
      return;
    }

    setAvailabilityStatus('checking');
    let active = true;
    const timer = setTimeout(() => {
      void checkNameAvailabilityDetailed(trimmed)
        .then((result) => {
          if (!active || availabilityRequestRef.current !== requestId) return;
          // зачем (логи, settings-gaps-states): статус 'error' от проверки раньше уходил без следа — видно, что человек увидит «Проверим при сохранении»
          if (result.status === 'error') DebugLogger.error('NicknameEditModal:checkAvailabilityStatus', new Error('availability_status_error'), 'warning');
          if (result.status !== 'error') {
            const cache = availabilityCacheRef.current;
            if (cache.size >= NAME_AVAILABILITY_CACHE_LIMIT) cache.clear();
            cache.set(cacheKey, result.status);
          }
          setAvailabilityStatus(result.status);
        })
        .catch((error: unknown) => {
          DebugLogger.error('NicknameEditModal:checkAvailability', error, 'warning');
          if (active && availabilityRequestRef.current === requestId) setAvailabilityStatus('error');
        });
    }, NAME_AVAILABILITY_DEBOUNCE_MS);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [currentName, newName, visible]);

  // зачем: было Alert.alert('Сообщение', message) — теперь стеклянный слой в модалке, текст тот же.
  const [inlineAlertMessage, setInlineAlertMessage] = useState<string | null>(null);
  const alertOverModal = useCallback((message: string) => {
    traceNick(`validation:alert message=${message}`);
    setInlineAlertMessage(message);
  }, []);

  const closeNow = useCallback(() => {
    setInlineAlertMessage(null);
    Keyboard.dismiss();
    onRequestClose();
  }, [onRequestClose]);

  const close = useCallback(() => {
    if (savingRef.current) return;
    closeNow();
  }, [closeNow]);

  const saveName = async () => {
    if (savingRef.current) {
      traceNick('save:skip reason=already_saving');
      return;
    }
    if (availabilityStatus === 'checking' || availabilityStatus === 'taken') {
      traceNick(`save:skip reason=availability status=${availabilityStatus}`);
      return;
    }
    const trimmed = newName.trim();
    traceNick(`save:in len=${trimmed.length} changed=${trimmed !== currentName.trim()} availability=${availabilityStatus}`);
    if (!trimmed) { alertOverModal(L('Введи имя', "Введи ім\'я", 'Enter a name or nickname', 'Escribe un nombre o apodo', 'Digite um nome ou apelido', 'Nhập tên hoặc biệt danh', 'Masukkan nama atau nama panggilan', 'Bir ad veya takma ad gir', 'Wpisz imię lub pseudonim')); return; }
    if (trimmed.length < 2) { alertOverModal(L('Минимум 2 символа', 'Мінімум 2 символи', 'Minimum 2 characters', 'Mínimo 2 caracteres', 'Mínimo de 2 caracteres', 'Tối thiểu 2 ký tự', 'Minimal 2 karakter', 'En az 2 karakter', 'Minimum 2 znaki')); return; }
    if (trimmed.length > 20) { alertOverModal(L('Максимум 20 символов', 'Максимум 20 символів', 'Maximum 20 characters', 'Máximo 20 caracteres', 'Máximo de 20 caracteres', 'Tối đa 20 ký tự', 'Maksimal 20 karakter', 'En fazla 20 karakter', 'Maksymalnie 20 znaków')); return; }
    if (containsBadWord(trimmed)) { alertOverModal(L('Недопустимое имя', "Недопустиме ім\'я", 'Invalid name', 'Nombre no válido', 'Nome inválido', 'Tên không hợp lệ', 'Nama tidak valid', 'Geçersiz ad', 'Niedozwolona nazwa')); return; }

    const oldName = currentName.trim();
    if (trimmed === oldName) {
      traceNick('save:out unchanged — закрываем без сети');
      closeNow();
      return;
    }

    const myGuard = ++attemptGuardRef.current;
    const isStaleAttempt = () => attemptGuardRef.current !== myGuard;

    savingRef.current = true;
    setSaving(true);
    onNotice(null);

    // Optimistic UI: имя видно сразу, модалка закрывается; бронь — фоном.
    onOptimisticApply(trimmed);
    patchAppSnapshot((current) => current.profile ? {
      profile: {
        ...current.profile,
        source: 'local',
        updatedAt: Date.now(),
        name: trimmed,
      },
    } : {});
    closeNow();
    void AsyncStorage.setItem('user_name', trimmed).catch((error) => {
      DebugLogger.error('NicknameEditModal:localApplyOptimistic', error, 'warning');
    });
    void updateLocalNameReferences(oldName, trimmed).catch((error) => {
      DebugLogger.error('NicknameEditModal:localReferencesOptimistic', error, 'warning');
    });

    // зачем (владелец: откат имени был молчаливым): причина отката пишется в лог ВСЕГДА, не только в __DEV__ —
    // по строке [NAME-CHANGE] видно, почему имя вернулось (занято / кулдаун / сеть). Само имя в лог не пишем.
    const rollbackToOldName = (reason: string) => {
      console.log(`[NAME-CHANGE] rollback reason=${reason} stale=${isStaleAttempt()}`);
      if (isStaleAttempt()) {
        traceNick('rollback:skip stale_attempt');
        return; // более свежая попытка уже решила исход UI
      }
      // ВАЖНО для диагностики зависания: откат вызывает onNotice у родителя,
      // а тот делает animateNextLayoutTransition + setState в кадре, где
      // HybridAlertShell ещё докрывается. Отсюда и подозрение на гонку с
      // нативным dismiss, если владелец в этот момент жмёт «Назад».
      traceNick('rollback:apply — возвращаем старое имя, показываем плашку');
      onRollback(oldName);
      patchAppSnapshot((current) => current.profile ? {
        profile: {
          ...current.profile,
          source: 'local',
          updatedAt: Date.now(),
          name: oldName,
        },
      } : {});
      void AsyncStorage.setItem('user_name', oldName).catch((error) => {
        DebugLogger.error('NicknameEditModal:rollbackStorage', error, 'warning');
      });
      void updateLocalNameReferences(trimmed, oldName).catch((error) => {
        DebugLogger.error('NicknameEditModal:rollbackReferences', error, 'warning');
      });
    };

    traceNick('save:closed_modal — оптимистично применено, идём в бронь');

    try {
      let reservation: Awaited<ReturnType<typeof reserveNameDetailed>>;
      const reserveStartedAt = Date.now();
      try {
        reservation = await reserveNameDetailed(trimmed, oldName, { source: 'settings' });
      } catch (error) {
        DebugLogger.error('NicknameEditModal:reserveName', error, 'warning');
        reservation = { status: 'error' };
      }
      traceNick(`save:reserve status=${reservation.status} tookMs=${Date.now() - reserveStartedAt}`);
      // зачем (владелец 17.10 «друзья должны находиться мгновенно»): в сторе видно, когда новый ник попал в поисковый индекс.
      logFriendAdd('nick_publish', { source: 'settings', status: reservation.status, ms: Date.now() - reserveStartedAt });

      if (isStaleAttempt()) {
        traceNick('save:out stale_attempt — исход решает более свежая попытка');
        return;
      }

      if (reservation.status === 'taken') {
        traceNick('save:out taken — откат + плашка');
        rollbackToOldName('taken');
        onNotice(L('Это имя уже занято. Выбери другое.', "Це ім\'я вже зайняте. Обери інше.", 'This name is already taken. Choose another.', 'Este nombre ya está en uso. Elige otro.', 'Esse nome já está em uso. Escolha outro.', 'Tên này đã được dùng. Hãy chọn tên khác.', 'Nama ini sudah dipakai. Pilih yang lain.', 'Bu ad zaten kullanılıyor. Başka bir ad seç.', 'Ta nazwa jest już zajęta. Wybierz inną.'));
        return;
      }
      if (reservation.status === 'cooldown') {
        traceNick('save:out cooldown_14d — откат + плашка');
        rollbackToOldName('cooldown_14d');
        onNotice(L(
          'Ник можно менять не чаще одного раза в 14 дней.',
          'Нік можна змінювати не частіше одного разу на 14 днів.',
          'You can change your name only once every 14 days.',
          'Puedes cambiar el nombre solo una vez cada 14 días.',
          'Você só pode mudar o nome uma vez a cada 14 dias.',
          'Bạn chỉ có thể đổi tên 14 ngày một lần.',
          'Nama hanya bisa diganti sekali setiap 14 hari.',
          'Adı en fazla 14 günde bir değiştirebilirsin.',
          'Nazwę można zmieniać najwyżej raz na 14 dni.',
        ));
        return;
      }
      if (reservation.status !== 'ok') {
        // Самая частая ветка при плохой сети — и именно в ней ловится зависание
        // экрана, если владелец в этот момент жмёт «Назад».
        traceNick(`save:out reserve_not_ok status=${reservation.status} — откат + плашка`);
        rollbackToOldName(`reserve_${reservation.status}`);
        onNotice(L(
          'Имя не проверилось. Проверь интернет и попробуй ещё раз.',
          'Не вдалося перевірити імʼя. Перевір мережу й спробуй ще раз.',
          'Could not verify the name. Check your internet and try again.',
          'No se pudo comprobar el nombre. Revisa la conexión e inténtalo de nuevo.',
          'Não foi possível verificar o nome. Verifique a conexão e tente novamente.',
          'Không thể kiểm tra tên. Kiểm tra kết nối và thử lại.',
          'Tidak bisa memeriksa nama. Periksa koneksi dan coba lagi.',
          'Ad doğrulanamadı. Bağlantını kontrol et ve tekrar dene.',
          'Nie udało się sprawdzić nazwy. Sprawdź połączenie i spróbuj ponownie.',
        ));
        return;
      }

      // Бронь подтверждена — оптимистично показанное имя остаётся.
      traceNick('save:out ok — имя закреплено за аккаунтом');
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const saveDisabled = saving || availabilityStatus === 'checking' || availabilityStatus === 'taken';

  const availabilityMessage = (() => {
    if (availabilityStatus === 'checking') {
      return L('Проверяем имя…', 'Перевіряємо ім\'я…', 'Checking the name…', 'Comprobando nombre…', 'Verificando nome…', 'Đang kiểm tra tên…', 'Memeriksa nama…', 'Ad kontrol ediliyor…', 'Sprawdzamy nazwę…');
    }
    if (availabilityStatus === 'available') {
      return L('Имя свободно', 'Ім\'я вільне', 'The name is available', 'El nombre está disponible', 'Nome disponível', 'Tên khả dụng', 'Nama tersedia', 'Ad kullanılabilir', 'Nazwa jest dostępna');
    }
    if (availabilityStatus === 'taken') {
      return L('Имя уже занято', 'Ім\'я вже зайняте', 'The name is already taken', 'El nombre ya está en uso', 'Este nome já está em uso', 'Tên đã được sử dụng', 'Nama sudah dipakai', 'Bu ad zaten kullanılıyor', 'Nazwa jest już zajęta');
    }
    if (availabilityStatus === 'error') {
      return L('Проверим при сохранении', 'Перевіримо під час збереження', 'We\'ll check when you save', 'Lo comprobaremos al guardar', 'Verificaremos ao salvar', 'Sẽ kiểm tra khi lưu', 'Akan diperiksa saat menyimpan', 'Kaydederken kontrol edeceğiz', 'Sprawdzimy przy zapisie');
    }
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
  const availabilityColor = availabilityStatus === 'taken'
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
            <Text style={{ color: glass.secondary, fontSize: 13, lineHeight: 18 /* зачем (settings-gaps-states): подпись шторки 13/18 (.gs-shs), а не f.caption=15 при «Средний» */, marginTop: 7 /* зачем: паритет profile.html (13.10): отступ подзаголовка 7 */ }}>
              {L('Ник можно менять раз в 14 дней', 'Нік можна змінювати раз на 14 днів', 'You can change it once every 14 days', 'Puedes cambiarlo una vez cada 14 días', 'Você pode mudar uma vez a cada 14 dias', 'Có thể đổi 14 ngày một lần', 'Bisa diganti sekali tiap 14 hari', '14 günde bir değiştirebilirsin', 'Zmiana raz na 14 dni')}
            </Text>
          </View>
          <TouchableOpacity
            testID="nickname-close"
            accessibilityRole="button"
            accessibilityLabel={closeLabel}
            activeOpacity={0.7}
            disabled={saving}
            accessibilityState={{ disabled: saving }}
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
              opacity: saving ? 0.5 : 1,
            }}
            onPress={() => { if (saving) return; doHaptic(); close(); }}
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
          editable={!saving}
          autoFocus={!isHybrid}
          maxLength={20}
          returnKeyType="done"
          onSubmitEditing={() => { if (!saveDisabled) void saveName(); }}
          blurOnSubmit
        />
        <View
          style={{ minHeight: 22, marginBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 10 /* зачем: паритет profile.html (13.10): зазор значок↔текст 10 */ }}
        >
          {availabilityStatus === 'checking' ? (
            <ActivityIndicator size="small" color={availabilityColor} />
          ) : availabilityStatus === 'available' ? (
            <Ionicons name="checkmark-circle-outline" size={16} color={availabilityColor} />
          ) : availabilityStatus === 'taken' ? (
            <Ionicons name="close-circle-outline" size={16} color={availabilityColor} />
          ) : availabilityStatus === 'error' ? (
            <Ionicons name="cloud-offline-outline" size={16} color={availabilityColor} />
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
        <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
          <TouchableOpacity
            accessibilityRole="button"
            activeOpacity={0.7}
            disabled={saving}
            accessibilityState={{ disabled: saving }}
            style={{
              flex: 1,
              minHeight: 48,
              paddingHorizontal: 12,
              paddingVertical: 12,
              borderRadius: 24,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: glass.selected,
              opacity: saving ? 0.6 : 1,
            }}
            onPress={() => { if (saving) return; doHaptic(); close(); }}
          >
            {/* зачем: text-integrity — лейбл переносится, кнопка растёт по паддингам. */}
            <FlowText testID="nickname-cancel-label" provenance="authored" style={{ color: glass.text, fontSize: f.body, fontWeight: '700', textAlign: 'center' }}>
              {L('Отмена', 'Скасувати', 'Cancel', 'Cancelar', 'Cancelar', 'Hủy', 'Batal', 'Vazgeç', 'Anuluj')}
            </FlowText>
          </TouchableOpacity>
          <TouchableOpacity
            testID="nickname-save"
            accessibilityRole="button"
            activeOpacity={0.8}
            disabled={saveDisabled}
            accessibilityState={{ disabled: saveDisabled }}
            style={{
              flex: 1,
              minHeight: 48,
              paddingHorizontal: 12,
              paddingVertical: 12,
              borderRadius: 24,
              backgroundColor: glass.accent, // light-accent-ok: кнопка «Сохранить» с подписью accentInk на accent
              alignItems: 'center',
              justifyContent: 'center',
              opacity: saveDisabled ? 0.5 : 1,
            }}
            onPress={() => { if (saveDisabled) return; doHaptic(); void saveName(); }}
          >
            <View style={{ minHeight: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, maxWidth: '100%' }}>
              {saving ? (
                <ActivityIndicator size="small" color={glass.ctaInk} />
              ) : null}
              {/* text-integrity: без усечения и без сжатия шрифта — длинные переводы
                  («Kaydediliyor», «Zapisywanie») переносятся, кнопка растёт по minHeight. */}
              <FlowText
                testID="nickname-save-label"
                provenance="authored"
                style={{ color: glass.accentInk, fontSize: f.body, fontWeight: '700', flexShrink: 1, textAlign: 'center' }}
              >
                {saving
                  ? L('Сохраняем', 'Зберігаємо', 'Saving', 'Guardando', 'Salvando', 'Đang lưu', 'Menyimpan', 'Kaydediliyor', 'Zapisywanie')
                  : L('Сохранить', 'Зберегти', 'Save', 'Guardar', 'Salvar', 'Lưu', 'Simpan', 'Kaydet', 'Zapisz')}
              </FlowText>
            </View>
          </TouchableOpacity>
        </View>
      </CascadeItem>
      <GlassInlineAlert
        visible={inlineAlertMessage != null}
        title={L('Сообщение', 'Повідомлення', 'Message', 'Mensaje', 'Mensagem', 'Thông báo', 'Pesan', 'Mesaj', 'Wiadomość')}
        message={inlineAlertMessage ?? undefined}
        onClose={() => setInlineAlertMessage(null)}
      />
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
