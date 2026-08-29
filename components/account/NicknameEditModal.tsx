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
// Валидационные сообщения показываем системным Alert.alert: RN-<Modal> поверх
// открытого <Modal> на iOS ломает стек презентаций (см. историю в settings.tsx),
// а UIAlertController накладывается корректно.
// ════════════════════════════════════════════════════════════════════════════
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  Alert,
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
import {
  checkNameAvailabilityDetailed,
  normalizeNameIndexKey,
  reserveNameDetailed,
  warmNameAvailabilityAuth,
  type NameAvailabilityStatus,
} from '../../app/firestore_leaderboard';
import { syncMyLeagueMemberProfileNow } from '../../app/firestore_leagues';
import { patchAppSnapshot } from '../../app/app_snapshot_store';
import {
  containsBadWord,
  updateLocalNameReferences,
} from '../../app/nickname_change_helpers';
import { hapticTap as doHaptic } from '../../hooks/use-haptics';
import HybridAlertShell, { CascadeItem } from '../modal_fx/HybridAlertShell';
import { useReduceMotion } from '../../hooks/use_reduce_motion';
import { LUM } from '../../constants/motionHybrid';

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
  const { theme: t, f } = useTheme();
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
          if (result.status !== 'error') {
            const cache = availabilityCacheRef.current;
            if (cache.size >= NAME_AVAILABILITY_CACHE_LIMIT) cache.clear();
            cache.set(cacheKey, result.status);
          }
          setAvailabilityStatus(result.status);
        })
        .catch(() => {
          if (active && availabilityRequestRef.current === requestId) setAvailabilityStatus('error');
        });
    }, NAME_AVAILABILITY_DEBOUNCE_MS);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [currentName, newName, visible]);

  const alertOverModal = useCallback((message: string) => {
    Alert.alert(
      L('Сообщение', 'Повідомлення', 'Message', 'Mensaje', 'Mensagem', 'Thông báo', 'Pesan', 'Mesaj', 'Wiadomość'),
      message,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  const closeNow = useCallback(() => {
    Keyboard.dismiss();
    onRequestClose();
  }, [onRequestClose]);

  const close = useCallback(() => {
    if (savingRef.current) return;
    closeNow();
  }, [closeNow]);

  const saveName = async () => {
    if (savingRef.current) return;
    if (availabilityStatus === 'checking' || availabilityStatus === 'taken') return;
    const trimmed = newName.trim();
    if (!trimmed) { alertOverModal(L('Введи имя', "Введіть ім\'я", 'Enter a name or nickname', 'Escribe un nombre o apodo', 'Digite um nome ou apelido', 'Nhập tên hoặc biệt danh', 'Masukkan nama atau nama panggilan', 'Bir ad veya takma ad gir', 'Wpisz imię lub pseudonim')); return; }
    if (trimmed.length < 2) { alertOverModal(L('Минимум 2 символа', 'Мінімум 2 символи', 'Minimum 2 characters', 'Mínimo 2 caracteres', 'Mínimo de 2 caracteres', 'Tối thiểu 2 ký tự', 'Minimal 2 karakter', 'En az 2 karakter', 'Minimum 2 znaki')); return; }
    if (trimmed.length > 20) { alertOverModal(L('Максимум 20 символов', 'Максимум 20 символів', 'Maximum 20 characters', 'Máximo 20 caracteres', 'Máximo de 20 caracteres', 'Tối đa 20 ký tự', 'Maksimal 20 karakter', 'En fazla 20 karakter', 'Maksymalnie 20 znaków')); return; }
    if (containsBadWord(trimmed)) { alertOverModal(L('Недопустимое имя', "Недопустиме ім\'я", 'Invalid name', 'Nombre no válido', 'Nome inválido', 'Tên không hợp lệ', 'Nama tidak valid', 'Geçersiz ad', 'Niedozwolona nazwa')); return; }

    const oldName = currentName.trim();
    if (trimmed === oldName) {
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

    const rollbackToOldName = () => {
      if (isStaleAttempt()) return; // более свежая попытка уже решила исход UI
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

    try {
      let reservation: Awaited<ReturnType<typeof reserveNameDetailed>>;
      try {
        reservation = await reserveNameDetailed(trimmed, oldName, { source: 'settings' });
      } catch (error) {
        DebugLogger.error('NicknameEditModal:reserveName', error, 'warning');
        reservation = { status: 'error' };
      }

      if (isStaleAttempt()) return;

      if (reservation.status === 'taken') {
        rollbackToOldName();
        onNotice(L('Это имя уже занято. Выбери другое.', "Це ім\'я вже зайняте. Оберіть інше.", 'This name is already taken. Choose another.', 'Este nombre ya está en uso. Elige otro.', 'Esse nome já está em uso. Escolha outro.', 'Tên này đã được dùng. Hãy chọn tên khác.', 'Nama ini sudah dipakai. Pilih yang lain.', 'Bu ad zaten kullanılıyor. Başka bir ad seç.', 'Ta nazwa jest już zajęta. Wybierz inną.'));
        return;
      }
      if (reservation.status === 'cooldown') {
        rollbackToOldName();
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
        rollbackToOldName();
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
      void syncMyLeagueMemberProfileNow();
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

  const availabilityColor = availabilityStatus === 'available'
    ? t.correct
    : availabilityStatus === 'taken'
      ? t.wrong
      : t.textMuted;

  const panelContent = (
    <View
      style={{
        width: isHybrid ? '100%' : '80%',
        minWidth: 280,
        backgroundColor: t.bgCard,
        borderRadius: 16,
        padding: 24,
      }}
    >
      <CascadeItem delay={isHybrid ? LUM.ladder[2] : 0} reduceMotion={!isHybrid || reduceMotion}>
        <Text style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '600', marginBottom: 16 }}>
          {L('Изменить имя', 'Змінити ім\'я', 'Change name', 'Cambiar nombre', 'Alterar nome', 'Đổi tên', 'Ubah nama', 'Adı değiştir', 'Zmień nazwę')}
        </Text>
      </CascadeItem>
      <CascadeItem delay={isHybrid ? LUM.ladder[2] + 96 : 0} reduceMotion={!isHybrid || reduceMotion}>
        <TextInput
          testID="nickname-input"
          accessibilityLabel={L('Имя профиля', 'Ім\'я профілю', 'Profile name', 'Nombre de perfil', 'Nome do perfil', 'Tên hồ sơ', 'Nama profil', 'Profil adı', 'Nazwa profilu')}
          style={{
            // Поле отделено тоном (bgPrimary на bgCard), без обводки — правило владельца.
            backgroundColor: t.bgPrimary,
            color: t.textPrimary,
            fontSize: f.h2,
            padding: 14,
            borderRadius: 10,
            marginBottom: 8,
          }}
          value={newName}
          onChangeText={setNewName}
          placeholder={L('Введи имя...', 'Введіть ім\'я...', 'Enter your name...', 'Escribe tu nombre...', 'Digite seu nome...', 'Nhập tên...', 'Masukkan nama...', 'Adını gir...', 'Wpisz imię...')}
          placeholderTextColor={t.textGhost}
          editable={!saving}
          autoFocus={!isHybrid}
          maxLength={20}
          returnKeyType="done"
          onSubmitEditing={() => { if (!saveDisabled) void saveName(); }}
          blurOnSubmit
        />
        <View
          style={{ minHeight: 20, marginBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 6 }}
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
              style={{ color: availabilityColor, fontSize: f.caption, fontWeight: '600', flexShrink: 1 }}
            >
              {availabilityMessage}
            </Text>
          ) : null}
        </View>
      </CascadeItem>
      <CascadeItem delay={isHybrid ? LUM.ladder[2] + 192 : 0} reduceMotion={!isHybrid || reduceMotion}>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <TouchableOpacity
            activeOpacity={0.7}
            disabled={saving}
            style={{
              flex: 1,
              padding: 12,
              borderRadius: 10,
              alignItems: 'center',
              backgroundColor: t.bgSurface,
              opacity: saving ? 0.6 : 1,
            }}
            onPress={() => { if (saving) return; doHaptic(); close(); }}
          >
            {/* зачем: text-integrity — лейбл переносится, кнопка растёт по паддингам. */}
            <FlowText testID="nickname-cancel-label" provenance="authored" style={{ color: t.textMuted, fontSize: f.body }}>
              {L('Отмена', 'Скасувати', 'Cancel', 'Cancelar', 'Cancelar', 'Hủy', 'Batal', 'Vazgeç', 'Anuluj')}
            </FlowText>
          </TouchableOpacity>
          <TouchableOpacity
            testID="nickname-save"
            activeOpacity={0.8}
            disabled={saveDisabled}
            accessibilityState={{ disabled: saveDisabled }}
            style={{
              flex: 1,
              padding: 12,
              borderRadius: 10,
              backgroundColor: t.accent,
              alignItems: 'center',
              minHeight: 48,
              justifyContent: 'center',
              opacity: saveDisabled ? 0.72 : 1,
            }}
            onPress={() => { if (saveDisabled) return; doHaptic(); void saveName(); }}
          >
            <View style={{ minHeight: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, maxWidth: '100%' }}>
              {saving ? (
                <ActivityIndicator size="small" color={t.correctText} />
              ) : null}
              {/* Статично уменьшенный кегль вместо динамического сжатия шрифта
                  (запрещённый паттерн): длинные переводы («Kaydediliyor»,
                  «Zapisywanie») влезают рядом с индикатором, guard-ok.
                  text-integrity: без усечения — крайний случай переносится,
                  кнопка растёт по minHeight. */}
              <FlowText
                testID="nickname-save-label"
                provenance="authored"
                style={{ color: t.correctText, fontSize: Math.min(f.body, 13), fontWeight: '700', flexShrink: 1 }}
              >
                {saving
                  ? L('Сохраняем', 'Зберігаємо', 'Saving', 'Guardando', 'Salvando', 'Đang lưu', 'Menyimpan', 'Kaydediliyor', 'Zapisywanie')
                  : L('Сохранить', 'Зберегти', 'Save', 'Guardar', 'Salvar', 'Lưu', 'Simpan', 'Kaydet', 'Zapisz')}
              </FlowText>
            </View>
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
        shadowColor="#000000"
        backdropColor="rgba(0,0,0,0.7)"
        testID="nickname-edit-modal-hybrid"
      >
        {panelContent}
      </HybridAlertShell>
    );
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <Pressable
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' }}
        onPress={close}
      >
        <Pressable onPress={(e) => e.stopPropagation()}>
          {panelContent}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
