import React, { useEffect, useState, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  DeviceEventEmitter,
} from 'react-native';
import { useTheme } from './ThemeContext';
import { useLang } from './LangContext';
import { triLang } from '../constants/i18n';
import { hapticTap as doHaptic } from '../hooks/use-haptics';
import { deleteAccountAndWipe } from '../app/auth_provider';
import { enqueueThemedBlockingInfoAlert } from '../app/themed_blocking_alert_queue';

type Props = {
  visible: boolean;
  onRequestClose: () => void;
};

/**
 * Единое окно подтверждения удаления аккаунта (Настройки, FAQ и т.д.).
 */
export default function DeleteAccountConfirmModal({ visible, onRequestClose }: Props) {
  const { theme: t, f } = useTheme();
  const { lang } = useLang();
  const L = useCallback((ru: string, uk: string, es: string) => triLang(lang, { ru, uk, es }), [lang]);
  const deleteConfirmWord = L('УДАЛИТЬ', 'ВИДАЛИТИ', 'ELIMINAR');
  const [deleteConfirmInput, setDeleteConfirmInput] = useState('');

  useEffect(() => {
    if (visible) setDeleteConfirmInput('');
  }, [visible]);

  const showInfoAlert = useCallback(
    (title: string, message: string) => {
      void enqueueThemedBlockingInfoAlert(title || L('Сообщение', 'Повідомлення', 'Message'), message, 'OK');
    },
    [L],
  );

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onRequestClose}>
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={{ width: '85%', backgroundColor: t.bgCard, borderRadius: 16, padding: 24 }}>
          <Text style={{ color: t.wrong, fontSize: f.h2, fontWeight: '700', marginBottom: 8 }}>
            {L('Удалить аккаунт?', 'Видалити акаунт?', '¿Eliminar cuenta?')}
          </Text>
          <Text style={{ color: t.textSecond, fontSize: f.caption, marginBottom: 12, lineHeight: 20 }}>
            {L('Будет безвозвратно удалено:', 'Буде безповоротно видалено:', 'Se eliminará de forma permanente:')}
          </Text>
          {[
            L('📊 Весь XP и уровень', '📊 Весь XP та рівень', '📊 Todo el XP y el nivel'),
            L('🔥 Цепочка и серия', '🔥 Серія днів поспіль', '🔥 Racha y días seguidos'),
            L('📚 Прогресс по всем урокам', '📚 Прогрес по всіх уроках', '📚 Progreso en todas las lecciones'),
            L('🃏 Сохранённые карточки', '🃏 Збережені картки', '🃏 Tarjetas guardadas'),
            L('🏆 Все достижения и медали', '🏆 Всі досягнення та медалі', '🏆 Logros y medallas'),
            L('🌍 Позиция в лиге и клубе', '🌍 Позиція у лізі та клубі', '🌍 Puesto en la liga y en el club'),
            L('⚙️ Все настройки', '⚙️ Всі налаштування', '⚙️ Todos los ajustes'),
          ].map((item, i) => (
            <Text key={i} style={{ color: t.textSecond, fontSize: f.caption, marginBottom: 4, lineHeight: 20 }}>
              {item}
            </Text>
          ))}
          <Text style={{ color: t.wrong, fontSize: f.caption, fontWeight: '600', marginTop: 10, marginBottom: 16, lineHeight: 20 }}>
            {L(
              '⚠️ Удаление аккаунта не отменяет подписку автоматически.',
              '⚠️ Видалення акаунта не скасовує підписку автоматично.',
              '⚠️ Eliminar la cuenta no cancela la suscripción automáticamente.',
            )}
          </Text>
          <Text style={{ color: t.textPrimary, fontSize: f.caption, marginBottom: 8 }}>
            {L(
              'Введите "УДАЛИТЬ" для подтверждения:',
              'Введіть "ВИДАЛИТИ" для підтвердження:',
              'Escribe «ELIMINAR» para confirmar:',
            )}
          </Text>
          <TextInput
            style={{
              backgroundColor: t.bgPrimary,
              color: t.textPrimary,
              fontSize: f.body,
              padding: 12,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: t.border,
              marginBottom: 20,
              outlineStyle: 'none' as any,
            }}
            value={deleteConfirmInput}
            onChangeText={setDeleteConfirmInput}
            placeholder={deleteConfirmWord}
            placeholderTextColor={t.textGhost}
            autoCapitalize="characters"
            autoCorrect={false}
            autoFocus={false}
            maxLength={12}
          />
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <TouchableOpacity
              activeOpacity={0.7}
              style={{ flex: 1, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: t.border, alignItems: 'center' }}
              onPress={() => {
                doHaptic();
                onRequestClose();
              }}
            >
              <Text style={{ color: t.textMuted, fontSize: f.body }}>{L('Отмена', 'Скасувати', 'Cancelar')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              disabled={deleteConfirmInput !== deleteConfirmWord}
              activeOpacity={0.7}
              style={{
                flex: 1,
                padding: 12,
                borderRadius: 10,
                alignItems: 'center',
                backgroundColor: deleteConfirmInput === deleteConfirmWord ? t.wrong : t.bgSurface,
                opacity: deleteConfirmInput === deleteConfirmWord ? 1 : 0.35,
              }}
              onPress={async () => {
                doHaptic();
                onRequestClose();
                const res = await deleteAccountAndWipe();
                if (!res.ok) {
                  showInfoAlert(L('Ошибка', 'Помилка', 'Error'), L('Не удалось удалить данные.', 'Не вдалося видалити дані.', 'No se pudieron eliminar los datos.'));
                  return;
                }
                await enqueueThemedBlockingInfoAlert(
                  L('Аккаунт удалён', 'Акаунт видалено', 'Cuenta eliminada'),
                  L('Все ваши данные были удалены.', 'Всі ваші дані було видалено.', 'Se han eliminado todos tus datos.'),
                  'OK',
                );
                DeviceEventEmitter.emit('account_deleted');
              }}
            >
              <Text style={{ color: '#fff', fontSize: f.body, fontWeight: '700' }}>
                {L('Удалить', 'Видалити', 'Eliminar')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
