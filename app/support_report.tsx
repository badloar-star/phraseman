import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Keyboard,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BouncyScrollView from '../components/BouncyScrollView';
import { useLang } from '../components/LangContext';
import ScreenGradient from '../components/ScreenGradient';
import SectionSheetHeader from '../components/SectionSheetHeader';
import { useTheme } from '../components/ThemeContext';
import { triLang } from '../constants/i18n';
import { hapticTap } from '../hooks/use-haptics';
import { normalizeSafeAreaBottomInset } from '../hooks/use-screen';
import { useStableSafeAreaInsets } from './stable_safe_area_metrics';
import { ERROR_REPORT_COMMENT_MIN_LEN } from './error_report';
import { safeRouterBack } from './navigation_back';
import { sendSupportReportInBackground } from './support_report_outbox';
import { captureSupportDiagnosticBundle } from './support_diagnostics';
import type { SupportDiagnosticBundle } from './support_diagnostic_schema';

type SubmitState = 'idle' | 'sent';

export default function SupportReportScreen() {
  const router = useRouter();
  const { theme: t, f } = useTheme();
  const { lang } = useLang();
  const insets = useStableSafeAreaInsets();
  const bottomInset = normalizeSafeAreaBottomInset(insets.bottom);
  const [description, setDescription] = useState('');
  const [state, setState] = useState<SubmitState>('idle');
  const [diagnosticsPreview, setDiagnosticsPreview] = useState<SupportDiagnosticBundle | null>(null);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const submissionStartedRef = useRef(false);

  const L = useCallback((
    ru: string, uk: string, en: string, es: string, ptBR: string,
    vi: string, id: string, tr: string, pl: string,
  ) => triLang(lang, { ru, uk, en, es, 'pt-BR': ptBR, vi, id, tr, pl }), [lang]);

  const canSend = useMemo(
    () => description.trim().length >= ERROR_REPORT_COMMENT_MIN_LEN,
    [description],
  );

  useEffect(() => {
    let mounted = true;
    void captureSupportDiagnosticBundle().then((bundle) => {
      if (mounted) setDiagnosticsPreview(bundle);
    }).catch(() => undefined);
    return () => { mounted = false; };
  }, []);

  const close = useCallback(() => safeRouterBack(router, '/(tabs)/settings' as never), [router]);

  const send = useCallback(() => {
    if (!canSend || submissionStartedRef.current) return;
    submissionStartedRef.current = true;
    Keyboard.dismiss();
    hapticTap();
    const comment = description.trim();
    setState('sent');
    void sendSupportReportInBackground({
      screen: 'settings_support',
      dataId: 'settings_support_request',
      dataText: 'In-app support request',
      comment,
      ...(diagnosticsPreview ? { diagnostics: diagnosticsPreview } : {}),
    }, lang, { awardSubmissionXp: false }).catch(() => {
      // The confirmation stays immediate. Queue/bootstrap retry owns delivery.
    });
  }, [canSend, description, diagnosticsPreview, lang]);

  if (state === 'sent') {
    return (
      <ScreenGradient artBackdrop="settings">
        <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
          <SectionSheetHeader
            title={L('Поддержка', 'Підтримка', 'Support', 'Soporte', 'Suporte', 'Hỗ trợ', 'Dukungan', 'Destek', 'Pomoc')}
            onClose={close}
          />
          <View style={{ flex: 1, padding: 24, alignItems: 'center', justifyContent: 'center' }}>
            <View style={{ width: 72, height: 72, borderRadius: 24, backgroundColor: t.correctBg, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="checkmark" size={38} color={t.correct} />
            </View>
            <Text accessibilityLiveRegion="polite" style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '800', textAlign: 'center', marginTop: 20 }}>
              {L('Обращение отправлено', 'Звернення надіслано', 'Request sent', 'Solicitud enviada', 'Solicitação enviada', 'Đã gửi yêu cầu', 'Laporan terkirim', 'Talep gönderildi', 'Zgłoszenie wysłane')}
            </Text>
            <Text style={{ color: t.textSecond, fontSize: f.body, lineHeight: f.body * 1.45, textAlign: 'center', marginTop: 10 }}>
              {L('Спасибо! Команда всё проверит и ответит в приложении.', 'Дякуємо! Команда все перевірить і відповість у застосунку.', 'Thank you! The team will review it and reply in the app.', '¡Gracias! El equipo lo revisará y responderá en la app.', 'Obrigado! A equipe vai verificar e responder no app.', 'Cảm ơn! Đội ngũ sẽ kiểm tra và trả lời trong ứng dụng.', 'Terima kasih! Tim akan memeriksa dan membalas di aplikasi.', 'Teşekkürler! Ekip inceleyip uygulamada yanıtlayacak.', 'Dziękujemy! Zespół sprawdzi zgłoszenie i odpowie w aplikacji.')}
            </Text>
            <TouchableOpacity accessibilityRole="button" onPress={close} activeOpacity={0.86} style={{ minHeight: 52, minWidth: 220, marginTop: 28, paddingHorizontal: 24, borderRadius: 16, backgroundColor: t.accent, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: t.correctText, fontSize: f.body, fontWeight: '800' }}>
                {L('Готово', 'Готово', 'Done', 'Listo', 'Pronto', 'Xong', 'Selesai', 'Bitti', 'Gotowe')}
              </Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </ScreenGradient>
    );
  }

  return (
    <ScreenGradient artBackdrop="settings">
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
        <SectionSheetHeader
          title={L('Поддержка', 'Підтримка', 'Support', 'Soporte', 'Suporte', 'Hỗ trợ', 'Dukungan', 'Destek', 'Pomoc')}
          onClose={close}
        />
        <BouncyScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: 20, paddingBottom: 32 + Math.max(bottomInset, 16) }}
          showsVerticalScrollIndicator={false}
        >
          <View style={{ alignItems: 'center', paddingTop: 6, paddingBottom: 24 }}>
            <View style={{ width: 56, height: 56, borderRadius: 19, backgroundColor: t.correctBg, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="chatbox-ellipses-outline" size={29} color={t.correct} />
            </View>
            <Text style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '800', textAlign: 'center', marginTop: 16 }}>
              {L('Расскажите, что случилось', 'Розкажіть, що сталося', 'Tell us what happened', 'Cuéntanos qué pasó', 'Conte o que aconteceu', 'Hãy cho chúng tôi biết chuyện gì xảy ra', 'Ceritakan apa yang terjadi', 'Ne olduğunu anlatın', 'Opisz, co się stało')}
            </Text>
            <Text style={{ color: t.textSecond, fontSize: f.body, lineHeight: f.body * 1.45, textAlign: 'center', marginTop: 10 }}>
              {L(
                'Здесь можно описать любую проблему, найденную в приложении. Чем подробнее описание, тем быстрее мы сможем всё проверить. Если проблема подтвердится и будет исправлена, вы сможете получить очень приятный бонус.',
                'Тут можна описати будь-яку проблему, знайдену в застосунку. Що докладніший опис, то швидше ми все перевіримо. Якщо проблема підтвердиться й буде виправлена, ви зможете отримати дуже приємний бонус.',
                'Describe any problem you found in the app. More detail helps us verify it faster. If it is confirmed and fixed, you may receive a very pleasant bonus.',
                'Describe cualquier problema que hayas encontrado en la app. Cuantos más detalles, antes podremos comprobarlo. Si se confirma y se corrige, podrás recibir un bono muy agradable.',
                'Descreva qualquer problema encontrado no app. Quanto mais detalhes, mais rápido poderemos verificar. Se for confirmado e corrigido, você poderá receber um bônus muito agradável.',
                'Hãy mô tả bất kỳ vấn đề nào bạn gặp trong ứng dụng. Càng chi tiết, chúng tôi càng kiểm tra nhanh. Nếu được xác nhận và khắc phục, bạn có thể nhận một phần thưởng rất thú vị.',
                'Jelaskan masalah apa pun yang kamu temukan di aplikasi. Semakin rinci, semakin cepat kami memeriksanya. Jika terbukti dan diperbaiki, kamu bisa mendapat bonus yang sangat menyenangkan.',
                'Uygulamada bulduğunuz herhangi bir sorunu anlatın. Ne kadar ayrıntılı olursa o kadar hızlı inceleriz. Sorun doğrulanıp düzeltilirse çok hoş bir bonus alabilirsiniz.',
                'Opisz dowolny problem znaleziony w aplikacji. Im więcej szczegółów, tym szybciej go sprawdzimy. Jeśli problem się potwierdzi i zostanie naprawiony, możesz otrzymać bardzo miły bonus.',
              )}
            </Text>
          </View>

          <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '700', marginBottom: 8 }}>
            {L('Описание проблемы', 'Опис проблеми', 'Problem description', 'Descripción del problema', 'Descrição do problema', 'Mô tả vấn đề', 'Deskripsi masalah', 'Sorun açıklaması', 'Opis problemu')}
          </Text>
          <TextInput
            testID="support-report-input"
            accessibilityLabel={L('Описание проблемы', 'Опис проблеми', 'Problem description', 'Descripción del problema', 'Descrição do problema', 'Mô tả vấn đề', 'Deskripsi masalah', 'Sorun açıklaması', 'Opis problemu')}
            value={description}
            onChangeText={setDescription}
            placeholder={L('Что произошло? На каком экране? Что вы ожидали увидеть?', 'Що сталося? На якому екрані? Що ви очікували побачити?', 'What happened? On which screen? What did you expect?', '¿Qué pasó? ¿En qué pantalla? ¿Qué esperabas ver?', 'O que aconteceu? Em qual tela? O que você esperava?', 'Điều gì đã xảy ra? Ở màn hình nào? Bạn mong đợi điều gì?', 'Apa yang terjadi? Di layar mana? Apa yang kamu harapkan?', 'Ne oldu? Hangi ekranda? Ne görmeyi bekliyordunuz?', 'Co się stało? Na którym ekranie? Czego oczekiwałeś?')}
            placeholderTextColor={t.textGhost}
            multiline
            maxLength={3000}
            textAlignVertical="top"
            style={{ minHeight: 190, borderRadius: 18, paddingHorizontal: 16, paddingVertical: 15, backgroundColor: t.bgCard, color: t.textPrimary, fontSize: f.body, lineHeight: f.body * 1.45 }}
          />

          <View
            testID="support-diagnostics-disclosure"
            style={{ marginTop: 16, borderRadius: 16, padding: 14, backgroundColor: t.bgCard }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
              <Ionicons name="shield-checkmark-outline" size={20} color={t.textSecond} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: t.textPrimary, fontSize: f.caption, fontWeight: '700' }}>
                  {L('Техническая диагностика', 'Технічна діагностика', 'Technical diagnostics', 'Diagnóstico técnico', 'Diagnóstico técnico', 'Chẩn đoán kỹ thuật', 'Diagnostik teknis', 'Teknik tanılama', 'Diagnostyka techniczna')}
                </Text>
                <Text style={{ color: t.textSecond, fontSize: f.caption, lineHeight: f.caption * 1.4, marginTop: 4 }}>
                  {L(
                    'К этому обращению прикрепятся только недавние технические действия. Без текста сообщений, паролей и платёжных данных.',
                    'До цього звернення додадуться лише недавні технічні дії. Без тексту повідомлень, паролів і платіжних даних.',
                    'Only recent technical actions are attached to this request. Message text, passwords, and payment data are excluded.',
                    'Solo se adjuntan acciones técnicas recientes. Se excluyen mensajes, contraseñas y datos de pago.',
                    'Apenas ações técnicas recentes são anexadas. Textos, senhas e dados de pagamento são excluídos.',
                    'Chỉ các thao tác kỹ thuật gần đây được đính kèm. Không có nội dung tin nhắn, mật khẩu hoặc dữ liệu thanh toán.',
                    'Hanya tindakan teknis terbaru yang dilampirkan. Teks pesan, kata sandi, dan data pembayaran tidak disertakan.',
                    'Yalnızca son teknik işlemler eklenir. Mesaj metni, parolalar ve ödeme verileri dahil edilmez.',
                    'Dołączane są tylko ostatnie działania techniczne. Bez treści wiadomości, haseł i danych płatniczych.',
                  )}
                </Text>
              </View>
            </View>
            {diagnosticsPreview?.events.length ? (
              <>
                <TouchableOpacity
                  testID="support-diagnostics-preview-toggle"
                  accessibilityRole="button"
                  accessibilityState={{ expanded: showDiagnostics }}
                  onPress={() => setShowDiagnostics((value) => !value)}
                  style={{ minHeight: 44, alignSelf: 'flex-start', justifyContent: 'center', marginTop: 6 }}
                >
                  <Text style={{ color: t.accent, fontSize: f.caption, fontWeight: '800' }}>
                    {showDiagnostics
                      ? L('Скрыть', 'Сховати', 'Hide', 'Ocultar', 'Ocultar', 'Ẩn', 'Sembunyikan', 'Gizle', 'Ukryj')
                      : L('Посмотреть', 'Переглянути', 'View', 'Ver', 'Ver', 'Xem', 'Lihat', 'Görüntüle', 'Zobacz')}
                  </Text>
                </TouchableOpacity>
                {showDiagnostics ? (
                  <View style={{ gap: 7, paddingTop: 4 }}>
                    {diagnosticsPreview.events.slice(-12).map((event, index) => (
                      <Text key={`${event.atMs}:${event.event}:${index}`} style={{ color: t.textSecond, fontSize: f.caption }}>
                        {new Date(event.atMs).toLocaleTimeString()} · {event.event}
                        {event.result ? ` · ${event.result}` : ''}
                      </Text>
                    ))}
                  </View>
                ) : null}
              </>
            ) : null}
          </View>

          <TouchableOpacity
            testID="support-report-submit"
            accessibilityRole="button"
            accessibilityState={{ disabled: !canSend }}
            onPress={send}
            disabled={!canSend}
            activeOpacity={0.86}
            style={{ minHeight: 52, marginTop: 24, borderRadius: 16, backgroundColor: canSend ? t.accent : t.bgCard, opacity: canSend ? 1 : 0.68, alignItems: 'center', justifyContent: 'center' }}
          >
            <Text style={{ color: canSend ? t.correctText : t.textSecond, fontSize: f.body, fontWeight: '800' }}>
              {L('Отправить', 'Надіслати', 'Send', 'Enviar', 'Enviar', 'Gửi', 'Kirim', 'Gönder', 'Wyślij')}
            </Text>
          </TouchableOpacity>
        </BouncyScrollView>
      </SafeAreaView>
    </ScreenGradient>
  );
}
