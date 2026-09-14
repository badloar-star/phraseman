import Ionicons from '@expo/vector-icons/Ionicons';
import React, { memo, useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Modal, StyleSheet, Text, View } from 'react-native';

import {
  getAccountSwitchQuarantineSnapshot,
  resumeRuntimeAccountSwitchQuarantine,
  subscribeAccountSwitchQuarantine,
} from '../app/account_switch_quarantine';
import { triLang } from '../constants/i18n';
import PressableHybrid from './PressableHybrid';
import { useLang } from './LangContext';
import { useTheme } from './ThemeContext';
import ResponsiveModalScrollView from './ResponsiveModalScrollView';

function AccountSwitchRecoveryScreen() {
  const { theme: t, f } = useTheme();
  const { lang } = useLang();
  const [snapshot, setSnapshot] = useState(getAccountSwitchQuarantineSnapshot());
  const [retrying, setRetrying] = useState(false);

  useEffect(() => subscribeAccountSwitchQuarantine(() => {
    setSnapshot(getAccountSwitchQuarantineSnapshot());
  }), []);

  const retry = useCallback(() => {
    if (retrying) return;
    setRetrying(true);
    void resumeRuntimeAccountSwitchQuarantine().finally(() => setRetrying(false));
  }, [retrying]);

  const copy = (ru: string, uk: string, en: string, es: string, ptBr: string, vi: string, id: string, tr: string, pl: string): string => (
    triLang(lang, { ru, uk, en, es, 'pt-BR': ptBr, vi, id, tr, pl })
  );
  const isCorrupt = snapshot.reason === 'marker_invalid'
    || snapshot.reason === 'owner_auth_mismatch'
    || snapshot.reason === 'owner_stable_mismatch';
  const title = isCorrupt
    ? copy(
      'Нужна безопасная проверка', 'Потрібна безпечна перевірка', 'Safety check required',
      'Se requiere una comprobación', 'Verificação de segurança necessária',
      'Cần kiểm tra an toàn', 'Pemeriksaan keamanan diperlukan',
      'Güvenlik kontrolü gerekiyor', 'Wymagana kontrola bezpieczeństwa',
    )
    : copy(
      'Завершаем смену аккаунта', 'Завершуємо зміну акаунта', 'Finishing account switch',
      'Finalizando el cambio de cuenta', 'Concluindo a troca de conta',
      'Đang hoàn tất đổi tài khoản', 'Menyelesaikan pergantian akun',
      'Hesap değişikliği tamamlanıyor', 'Kończenie zmiany konta',
    );
  const body = isCorrupt
    ? copy(
      'Мы заблокировали доступ к данным, потому что не можем безопасно доказать, какому аккаунту они принадлежат. Ничего не удаляется автоматически. Повтори проверку или обратись в поддержку.',
      'Ми заблокували доступ до даних, бо не можемо безпечно довести, якому акаунту вони належать. Нічого не видаляється автоматично. Повтори перевірку або звернися до підтримки.',
      'Access is blocked because ownership cannot be proven safely. Nothing is deleted automatically. Retry the check or contact support.',
      'El acceso está bloqueado porque no se puede verificar la propiedad de forma segura. Nada se elimina automáticamente. Reintenta o contacta con soporte.',
      'O acesso foi bloqueado porque não foi possível comprovar a propriedade com segurança. Nada é excluído automaticamente. Tente novamente ou fale com o suporte.',
      'Quyền truy cập bị chặn vì chưa thể xác minh chủ sở hữu an toàn. Không có gì bị tự động xóa. Hãy thử lại hoặc liên hệ hỗ trợ.',
      'Akses diblokir karena kepemilikan belum dapat dibuktikan dengan aman. Tidak ada yang dihapus otomatis. Coba lagi atau hubungi dukungan.',
      'Sahiplik güvenle doğrulanamadığı için erişim engellendi. Hiçbir şey otomatik silinmez. Yeniden dene veya desteğe ulaş.',
      'Dostęp został zablokowany, ponieważ nie można bezpiecznie potwierdzić właściciela. Nic nie jest usuwane automatycznie. Spróbuj ponownie lub skontaktuj się ze wsparciem.',
    )
    : copy(
      'Не закрывай приложение. Старые данные скрыты, пока мы создаём чистую локальную сессию.',
      'Не закривай застосунок. Старі дані приховані, поки ми створюємо чисту локальну сесію.',
      'Keep the app open. Old data stays hidden while a clean local session is created.',
      'Mantén la aplicación abierta. Los datos anteriores permanecen ocultos mientras se crea una sesión local limpia.',
      'Mantenha o app aberto. Os dados antigos ficam ocultos enquanto uma sessão local limpa é criada.',
      'Hãy giữ ứng dụng mở. Dữ liệu cũ được ẩn trong khi tạo phiên cục bộ mới.',
      'Biarkan aplikasi terbuka. Data lama disembunyikan saat sesi lokal baru dibuat.',
      'Uygulamayı açık tut. Temiz yerel oturum oluşturulurken eski veriler gizli kalır.',
      'Nie zamykaj aplikacji. Stare dane pozostają ukryte podczas tworzenia czystej sesji lokalnej.',
    );
  const retryLabel = copy(
    'Повторить безопасно', 'Повторити безпечно', 'Retry safely', 'Reintentar de forma segura',
    'Tentar novamente com segurança', 'Thử lại an toàn', 'Coba lagi dengan aman',
    'Güvenle yeniden dene', 'Spróbuj ponownie bezpiecznie',
  );

  return (
    <Modal
      visible={snapshot.visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={() => { /* account isolation wall is not dismissible */ }}
    >
      <ResponsiveModalScrollView style={{ backgroundColor: 'rgba(0,0,0,0.82)' }} accessibilityViewIsModal>
        <View style={[styles.card, { backgroundColor: t.bgCard }]} accessibilityRole="alert">
          {snapshot.status === 'recovering' && !isCorrupt ? (
            <ActivityIndicator size="large" color={t.accent} />
          ) : (
            <Ionicons name="shield-checkmark" size={42} color={t.accent} />
          )}
          <Text style={[styles.title, { color: t.textPrimary, fontSize: f.h2 }]}>{title}</Text>
          <Text style={[styles.body, { color: t.textSecond, fontSize: f.body }]}>{body}</Text>
          {(snapshot.status === 'retryable' || snapshot.status === 'quarantined') && (
            <PressableHybrid
              variant="primary"
              busy={retrying}
              accessibilityRole="button"
              accessibilityLabel={retryLabel}
              onPress={retry}
              style={[styles.retry, { backgroundColor: t.accent }]}
              contentStyle={styles.retryContent}
            >
              <Text style={[styles.retryText, { color: t.correctText, fontSize: f.body }]}>
                {retryLabel}
              </Text>
            </PressableHybrid>
          )}
        </View>
      </ResponsiveModalScrollView>
    </Modal>
  );
}

export default memo(AccountSwitchRecoveryScreen);

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: 'rgba(0,0,0,0.82)',
  },
  card: {
    width: '100%',
    maxWidth: 440,
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingVertical: 28,
    alignItems: 'center',
  },
  title: { marginTop: 18, fontWeight: '700', textAlign: 'center' },
  body: { marginTop: 12, lineHeight: 24, textAlign: 'center' },
  retry: { width: '100%', borderRadius: 14, marginTop: 22 },
  retryContent: { minHeight: 48, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  retryText: { fontWeight: '700', textAlign: 'center' },
});
