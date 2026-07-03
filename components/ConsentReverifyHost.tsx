/**
 * ConsentReverifyHost — admin preview only.
 *
 * Runtime reverify for existing users is intentionally disabled. Age confirmation
 * belongs only to CleanOnboarding for new users. The forceVisible mode remains for
 * the tester/admin panel so the old modal can still be visually inspected without
 * persisting anything.
 */
import React, { useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useLang } from './LangContext';
import { useTheme } from './ThemeContext';
import { triLang, type Lang } from '../constants/i18n';

function makeL(lang: Lang) {
  return (ru: string, uk: string, es: string, ptBr: string, vi: string, id: string, tr: string, pl: string) =>
    triLang(lang, { ru, uk, es, 'pt-BR': ptBr, vi, id, tr, pl });
}

interface ConsentReverifyHostProps {
  /**
   * Админ-превью: принудительно показать модал. Ничего НЕ сохраняет в storage и
   * не пишет в облако — «Продолжить»/закрытие просто вызывают onForceClose.
   */
  forceVisible?: boolean;
  /** Вызывается при закрытии в режиме forceVisible. */
  onForceClose?: () => void;
}

export default function ConsentReverifyHost({ forceVisible, onForceClose }: ConsentReverifyHostProps = {}) {
  const { lang } = useLang();
  const { theme } = useTheme();
  const L = makeL(lang as Lang);

  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [ageDeniedNotice, setAgeDeniedNotice] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);
  const [analyticsChoice, setAnalyticsChoice] = useState<'granted' | 'denied' | null>(null);

  const canSubmit = ageConfirmed && acceptTerms && acceptPrivacy && analyticsChoice !== null;

  const openLegal = (which: 'terms' | 'privacy') => {
    try {
      router.push(which === 'terms' ? '/terms_screen' : '/privacy_screen');
    } catch {
      /* no-op */
    }
  };

  const submit = async () => {
    if (!canSubmit) return;
    onForceClose?.();
  };

  const copy = useMemo(
    () => ({
      title: L(
        'Пара формальностей', 'Пара формальностей', 'Un par de formalidades', 'Algumas formalidades',
        'Một vài thủ tục', 'Beberapa formalitas', 'Birkaç formalite', 'Kilka formalności',
      ),
      intro: L(
        'Чтобы продолжить пользоваться приложением, подтверди пару моментов — это нужно для соблюдения правил и защиты и тебя, и нас. Займёт несколько секунд.',
        'Щоб продовжити користуватися додатком, підтверди кілька моментів — це потрібно для дотримання правил і захисту і тебе, і нас. Займе кілька секунд.',
        'Para seguir usando la app, confirma un par de cosas: es para cumplir las normas y proteger a ambos. Toma unos segundos.',
        'Para continuar usando o app, confirme algumas coisas — é para cumprir as regras e proteger você e nós. Leva alguns segundos.',
        'Để tiếp tục dùng ứng dụng, hãy xác nhận vài điều — để tuân thủ quy định và bảo vệ cả bạn và chúng tôi. Chỉ mất vài giây.',
        'Untuk terus memakai aplikasi, konfirmasi beberapa hal — demi mematuhi aturan dan melindungi kita berdua. Hanya beberapa detik.',
        'Uygulamayı kullanmaya devam etmek için birkaç şeyi onayla — kurallara uymak ve ikimizi de korumak için. Birkaç saniye sürer.',
        'Aby dalej korzystać z aplikacji, potwierdź kilka rzeczy — to dla zgodności z przepisami i ochrony nas obojga. Zajmie kilka sekund.',
      ),
      ageQ: L(
        'Тебе уже есть 16?', 'Тобі вже є 16?', '¿Ya tienes 16 años?', 'Você já tem 16 anos?',
        'Bạn đã đủ 16 tuổi chưa?', 'Apakah kamu sudah 16 tahun?', '16 yaşında veya daha büyük müsün?', 'Czy masz już 16 lat?',
      ),
      yes: L('Да', 'Так', 'Sí', 'Sim', 'Có', 'Ya', 'Evet', 'Tak'),
      no: L('Нет', 'Ні', 'No', 'Não', 'Không', 'Tidak', 'Hayır', 'Nie'),
      ageDeniedText: L(
        'Приложением можно пользоваться с 16 лет. Твой прогресс не пропадёт — возвращайся, когда тебе исполнится 16.',
        'Додатком можна користуватися з 16 років. Твій прогрес не зникне — повертайся, коли тобі виповниться 16.',
        'La app está disponible a partir de los 16 años. Tu progreso no se perderá: vuelve cuando cumplas 16.',
        'O app está disponível a partir dos 16 anos. Seu progresso não será perdido — volte quando fizer 16.',
        'Ứng dụng dành cho người từ 16 tuổi trở lên. Tiến độ của bạn sẽ không mất — hãy quay lại khi bạn đủ 16 tuổi.',
        'Aplikasi ini untuk usia 16 tahun ke atas. Progresmu tidak akan hilang — kembalilah saat kamu berusia 16 tahun.',
        'Uygulama 16 yaş ve üzeri içindir. İlerlemen kaybolmaz — 16 yaşına girince geri dön.',
        'Z aplikacji można korzystać od 16 lat. Twoje postępy nie przepadną — wróć, gdy skończysz 16 lat.',
      ),
      acceptTerms: L(
        'Я принимаю Условия использования', 'Я приймаю Умови використання', 'Acepto los Términos de uso',
        'Aceito os Termos de uso', 'Tôi chấp nhận Điều khoản sử dụng', 'Saya menerima Ketentuan Penggunaan',
        'Kullanım Koşullarını kabul ediyorum', 'Akceptuję Warunki korzystania',
      ),
      acceptPrivacy: L(
        'Я принимаю Политику конфиденциальности', 'Я приймаю Політику конфіденційності', 'Acepto la Política de privacidad',
        'Aceito a Política de privacidade', 'Tôi chấp nhận Chính sách quyền riêng tư', 'Saya menerima Kebijakan Privasi',
        'Gizlilik Politikasını kabul ediyorum', 'Akceptuję Politykę prywatności',
      ),
      analyticsQ: L(
        'Разрешить собирать аналитику?',
        'Дозволити збирати аналітику?',
        '¿Permitir recopilar analítica?',
        'Permitir coleta de análise?',
        'Cho phép thu thập phân tích?',
        'Izinkan pengumpulan analitik?',
        'Analitik toplamaya izin verilsin mi?',
        'Zezwolić na zbieranie analityki?',
      ),
      analyticsFine: L(
        'Необязательно. Выбор можно изменить в настройках.',
        'Необов’язково. Вибір можна змінити в налаштуваннях.',
        'Opcional. Puedes cambiarlo en Ajustes.',
        'Opcional. Você pode mudar nas Configurações.',
        'Không bắt buộc. Bạn có thể đổi trong Cài đặt.',
        'Opsional. Bisa diubah di Pengaturan.',
        'İsteğe bağlı. Ayarlardan değiştirebilirsin.',
        'Opcjonalne. Możesz zmienić to w ustawieniach.',
      ),
      allow: L('Разрешить', 'Дозволити', 'Permitir', 'Permitir', 'Cho phép', 'Izinkan', 'İzin ver', 'Zezwól'),
      notNow: L('Не сейчас', 'Не зараз', 'Ahora no', 'Agora não', 'Không phải bây giờ', 'Tidak sekarang', 'Şimdi değil', 'Nie teraz'),
      continue: L('Продолжить', 'Продовжити', 'Continuar', 'Continuar', 'Tiếp tục', 'Lanjut', 'Devam et', 'Kontynuuj'),
    }),
    [lang], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const shown = forceVisible === true;
  if (!shown) return null;

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      onRequestClose={() => {
        onForceClose?.();
      }}
    >
      <View style={styles.overlay}>
        <View style={styles.box}>
          <ScrollView keyboardShouldPersistTaps="handled">
            <Text style={styles.title}>{copy.title}</Text>
            <Text style={styles.intro}>{copy.intro}</Text>

            <Text style={styles.ageQuestion}>{copy.ageQ}</Text>
            <View style={styles.choiceRow}>
              <Pressable
                testID="reverify-age-yes"
                style={[
                  styles.choiceBtn,
                  ageConfirmed && { borderColor: theme.accent, backgroundColor: `${theme.accent}18` },
                ]}
                onPress={() => {
                  setAgeConfirmed(true);
                  setAgeDeniedNotice(false);
                }}
              >
                <Text style={styles.choiceBtnText}>{copy.yes}</Text>
              </Pressable>
              <Pressable
                testID="reverify-age-no"
                style={[
                  styles.choiceBtn,
                  ageDeniedNotice && !ageConfirmed && { borderColor: '#fbbf24', backgroundColor: '#fbbf2418' },
                ]}
                onPress={() => {
                  setAgeConfirmed(false);
                  setAgeDeniedNotice(true);
                }}
              >
                <Text style={styles.choiceBtnText}>{copy.no}</Text>
              </Pressable>
            </View>
            {ageDeniedNotice && !ageConfirmed ? (
              <Text testID="reverify-age-notice" style={styles.ageDeniedText}>
                {copy.ageDeniedText}
              </Text>
            ) : null}

            <Pressable style={styles.row} onPress={() => setAcceptTerms((v) => !v)}>
              <View style={[styles.checkbox, acceptTerms && { backgroundColor: theme.accent, borderColor: theme.accent }]}>
                {acceptTerms && <Text style={[styles.checkmark, { color: theme.correctText }]}>✓</Text>}
              </View>
              <Text style={styles.rowText}>
                <Text onPress={() => openLegal('terms')} style={styles.link}>{copy.acceptTerms}</Text>
              </Text>
            </Pressable>

            <Pressable style={styles.row} onPress={() => setAcceptPrivacy((v) => !v)}>
              <View style={[styles.checkbox, acceptPrivacy && { backgroundColor: theme.accent, borderColor: theme.accent }]}>
                {acceptPrivacy && <Text style={[styles.checkmark, { color: theme.correctText }]}>✓</Text>}
              </View>
              <Text style={styles.rowText}>
                <Text onPress={() => openLegal('privacy')} style={styles.link}>{copy.acceptPrivacy}</Text>
              </Text>
            </Pressable>

            <Text style={styles.analyticsQuestion}>{copy.analyticsQ}</Text>
            <Text style={styles.analyticsFine}>{copy.analyticsFine}</Text>
            <View style={styles.choiceRow}>
              <Pressable
                style={[
                  styles.choiceBtn,
                  analyticsChoice === 'granted' && { borderColor: theme.accent, backgroundColor: `${theme.accent}18` },
                ]}
                onPress={() => setAnalyticsChoice('granted')}
              >
                <Text style={styles.choiceBtnText}>{copy.allow}</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.choiceBtn,
                  analyticsChoice === 'denied' && { borderColor: theme.accent, backgroundColor: `${theme.accent}18` },
                ]}
                onPress={() => setAnalyticsChoice('denied')}
              >
                <Text style={styles.choiceBtnText}>{copy.notNow}</Text>
              </Pressable>
            </View>

            <Pressable
              style={[
                styles.continueBtn,
                { backgroundColor: canSubmit ? theme.accent : theme.bgSurface2 },
                !canSubmit && styles.continueBtnDisabled,
              ]}
              onPress={() => { void submit(); }}
              disabled={!canSubmit}
            >
              <Text style={[styles.continueText, { color: canSubmit ? theme.correctText : theme.textMuted }]}>{copy.continue}</Text>
            </Pressable>

            <Pressable style={styles.previewClose} onPress={() => onForceClose?.()}>
              <Text style={styles.previewCloseText}>✕ Закрыть превью (админ)</Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.78)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  box: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '88%',
    backgroundColor: '#161a1f',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 22,
  },
  title: { color: '#fff', fontSize: 20, fontWeight: '800', marginBottom: 10 },
  intro: { color: '#c7ccd2', fontSize: 14, lineHeight: 20 },
  ageQuestion: { color: '#fff', fontSize: 15, lineHeight: 20, fontWeight: '800', marginTop: 18 },
  row: { flexDirection: 'row', alignItems: 'center', marginTop: 14, gap: 10 },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: { fontSize: 15, fontWeight: '900' },
  rowText: { flex: 1, color: '#c7ccd2', fontSize: 14 },
  link: { color: '#7fb4ff', textDecorationLine: 'underline' },
  analyticsQuestion: { color: '#fff', fontSize: 15, lineHeight: 20, fontWeight: '800', marginTop: 18 },
  analyticsFine: { color: '#9aa0a6', fontSize: 11.5, lineHeight: 16, marginTop: 4 },
  choiceRow: { flexDirection: 'row', gap: 12, marginTop: 12 },
  choiceBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#1f242b',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
  },
  choiceBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  ageDeniedText: { color: '#fbbf24', fontSize: 13, lineHeight: 18, marginTop: 10 },
  continueBtn: {
    marginTop: 22,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  continueBtnDisabled: { opacity: 0.6 },
  continueText: { fontSize: 16, fontWeight: '800' },
  previewClose: { marginTop: 12, paddingVertical: 10, alignItems: 'center' },
  previewCloseText: { color: '#9aa0a6', fontSize: 13, fontWeight: '600' },
});
