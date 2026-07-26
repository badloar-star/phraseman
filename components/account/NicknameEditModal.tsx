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
  ActivityIndicator,
  Alert,
  Keyboard,
  Modal,
  Pressable,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../ThemeContext';
import { useLang } from '../LangContext';
import { triLang } from '../../constants/i18n';
import { DebugLogger } from '../../app/debug-logger';
import { reserveNameDetailed, warmNameAvailabilityAuth } from '../../app/firestore_leaderboard';
import { syncMyLeagueMemberProfileNow } from '../../app/firestore_leagues';
import { patchAppSnapshot } from '../../app/app_snapshot_store';
import {
  containsBadWord,
  syncArenaDisplayName,
  updateLocalNameReferences,
} from '../../app/nickname_change_helpers';
import { hapticTap as doHaptic } from '../../hooks/use-haptics';

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
}

export default function NicknameEditModal({
  visible,
  currentName,
  onRequestClose,
  onOptimisticApply,
  onRollback,
  onNotice,
}: NicknameEditModalProps) {
  const { theme: t, f } = useTheme();
  const { lang } = useLang();
  const L = (
    ru: string, uk: string, es: string, ptBr: string,
    vi: string, id: string, tr: string, pl: string,
  ) => triLang(lang, { ru, uk, es, 'pt-BR': ptBr, vi, id, tr, pl });

  const [newName, setNewName] = useState(currentName);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  /** last-write-guard: см. шапку файла. */
  const attemptGuardRef = useRef(0);

  useEffect(() => {
    if (!visible) return;
    setNewName(currentName);
    warmNameAvailabilityAuth();
  }, [visible, currentName]);

  const alertOverModal = useCallback((message: string) => {
    Alert.alert(
      L('Сообщение', 'Повідомлення', 'Mensaje', 'Mensagem', 'Thông báo', 'Pesan', 'Mesaj', 'Wiadomość'),
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
    const trimmed = newName.trim();
    if (!trimmed) { alertOverModal(L('Введи имя', "Введіть ім\'я", 'Escribe un nombre o apodo', 'Digite um nome ou apelido', 'Nhập tên hoặc biệt danh', 'Masukkan nama atau nama panggilan', 'Bir ad veya takma ad gir', 'Wpisz imię lub pseudonim')); return; }
    if (trimmed.length < 2) { alertOverModal(L('Минимум 2 символа', 'Мінімум 2 символи', 'Mínimo 2 caracteres', 'Mínimo de 2 caracteres', 'Tối thiểu 2 ký tự', 'Minimal 2 karakter', 'En az 2 karakter', 'Minimum 2 znaki')); return; }
    if (trimmed.length > 20) { alertOverModal(L('Максимум 20 символов', 'Максимум 20 символів', 'Máximo 20 caracteres', 'Máximo de 20 caracteres', 'Tối đa 20 ký tự', 'Maksimal 20 karakter', 'En fazla 20 karakter', 'Maksymalnie 20 znaków')); return; }
    if (containsBadWord(trimmed)) { alertOverModal(L('Недопустимое имя', "Недопустиме ім\'я", 'Nombre no válido', 'Nome inválido', 'Tên không hợp lệ', 'Nama tidak valid', 'Geçersiz ad', 'Niedozwolona nazwa')); return; }

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
        onNotice(L('Это имя уже занято. Выбери другое.', "Це ім\'я вже зайняте. Оберіть інше.", 'Este nombre ya está en uso. Elige otro.', 'Esse nome já está em uso. Escolha outro.', 'Tên này đã được dùng. Hãy chọn tên khác.', 'Nama ini sudah dipakai. Pilih yang lain.', 'Bu ad zaten kullanılıyor. Başka bir ad seç.', 'Ta nazwa jest już zajęta. Wybierz inną.'));
        return;
      }
      if (reservation.status === 'cooldown') {
        rollbackToOldName();
        onNotice(L(
          'Ник можно менять не чаще одного раза в 14 дней.',
          'Нік можна змінювати не частіше одного разу на 14 днів.',
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
      void syncArenaDisplayName(trimmed);
      void syncMyLeagueMemberProfileNow();
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <Pressable
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' }}
        onPress={close}
      >
        <Pressable onPress={(e) => e.stopPropagation()}>
          <View
            style={{
              width: '80%',
              minWidth: 280,
              backgroundColor: t.bgCard,
              borderRadius: 16,
              padding: 24,
            }}
          >
            <Text style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '600', marginBottom: 16 }}>
              {L('Изменить имя', 'Змінити ім\'я', 'Cambiar nombre', 'Alterar nome', 'Đổi tên', 'Ubah nama', 'Adı değiştir', 'Zmień nazwę')}
            </Text>
            <TextInput
              accessibilityLabel={L('Имя профиля', 'Ім\'я профілю', 'Nombre de perfil', 'Nome do perfil', 'Tên hồ sơ', 'Nama profil', 'Profil adı', 'Nazwa profilu')}
              style={{
                // Поле отделено тоном (bgPrimary на bgCard), без обводки — правило владельца.
                backgroundColor: t.bgPrimary,
                color: t.textPrimary,
                fontSize: f.h2,
                padding: 14,
                borderRadius: 10,
                marginBottom: 20,
              }}
              value={newName}
              onChangeText={setNewName}
              placeholder={L('Введи имя...', 'Введіть ім\'я...', 'Escribe tu nombre...', 'Digite seu nome...', 'Nhập tên...', 'Masukkan nama...', 'Adını gir...', 'Wpisz imię...')}
              placeholderTextColor={t.textGhost}
              editable={!saving}
              autoFocus
              maxLength={20}
              returnKeyType="done"
              onSubmitEditing={() => { if (!saving) void saveName(); }}
              blurOnSubmit
            />
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
                <Text style={{ color: t.textMuted, fontSize: f.body }} numberOfLines={1}>
                  {L('Отмена', 'Скасувати', 'Cancelar', 'Cancelar', 'Hủy', 'Batal', 'Vazgeç', 'Anuluj')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.8}
                disabled={saving}
                style={{
                  flex: 1,
                  padding: 12,
                  borderRadius: 10,
                  backgroundColor: t.accent,
                  alignItems: 'center',
                  minHeight: 48,
                  justifyContent: 'center',
                  opacity: saving ? 0.82 : 1,
                }}
                onPress={() => { if (saving) return; doHaptic(); void saveName(); }}
              >
                <View style={{ minHeight: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, maxWidth: '100%' }}>
                  {saving ? (
                    <ActivityIndicator size="small" color={t.correctText} />
                  ) : null}
                  {/* Статично уменьшенный кегль вместо динамического сжатия шрифта
                      (запрещённый паттерн): длинные переводы («Kaydediliyor»,
                      «Zapisywanie») влезают рядом с индикатором, guard-ok */}
                  <Text
                    style={{ color: t.correctText, fontSize: Math.min(f.body, 13), fontWeight: '700', flexShrink: 1 }}
                    numberOfLines={1}
                  >
                    {saving
                      ? L('Сохраняем', 'Зберігаємо', 'Guardando', 'Salvando', 'Đang lưu', 'Menyimpan', 'Kaydediliyor', 'Zapisywanie')
                      : L('Сохранить', 'Зберегти', 'Guardar', 'Salvar', 'Lưu', 'Simpan', 'Kaydet', 'Zapisz')}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
