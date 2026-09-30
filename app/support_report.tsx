import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Keyboard, Text, TextInput, View } from 'react-native';
import BouncyScrollView from '../components/BouncyScrollView';
import { useLang } from '../components/LangContext';
import PressableHybrid from '../components/PressableHybrid';
import SafeLinearGradient from '../components/SafeLinearGradient';
import ScreenGradient from '../components/ScreenGradient';
import { FONT_SCALE, useTheme } from '../components/ThemeContext';
import { triLang } from '../constants/i18n';
import { liquidGlassTokens } from '../constants/liquidGlassThemePalette';
import { hapticTap } from '../hooks/use-haptics';
import { ERROR_REPORT_COMMENT_MIN_LEN } from './error_report';
import { safeRouterBack } from './navigation_back';
import { useStableSafeAreaInsets } from './stable_safe_area_metrics';
import type { SupportDiagnosticBundle } from './support_diagnostic_schema';
import { captureSupportDiagnosticBundle } from './support_diagnostics';
import { sendSupportReportInBackground } from './support_report_outbox';

type SubmitState = 'idle' | 'sent';

export default function SupportReportScreen() {
  const router = useRouter();
  const { theme: t, fontSize, uiScale, liquidGlassThemeId } = useTheme();
  const { lang } = useLang();
  const insets = useStableSafeAreaInsets();
  const glass = liquidGlassTokens(liquidGlassThemeId);
  const designScale = FONT_SCALE[fontSize] / FONT_SCALE.medium * uiScale;
  const scaled = useCallback((value: number) => Math.round(value * designScale), [designScale]);
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
    }, lang).catch(() => {
      // The confirmation stays immediate. Queue/bootstrap retry owns delivery.
    });
  }, [canSend, description, diagnosticsPreview, lang]);

  return (
    <ScreenGradient artBackdrop="settings">
      <View style={{ flex: 1, paddingTop: insets.top, paddingBottom: insets.bottom, paddingLeft: insets.left, paddingRight: insets.right }}>
        <BouncyScrollView
          automaticallyAdjustKeyboardInsets
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 20, paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
        >
          <PressableHybrid
            testID="support-report-back"
            accessibilityLabel={L('Закрыть', 'Закрити', 'Close', 'Cerrar', 'Fechar', 'Đóng', 'Tutup', 'Kapat', 'Zamknij')}
            onPress={close}
            withHaptic={true}
            withSound={false}
            variant="icon"
            style={{ width: 48, height: 48, alignSelf: 'flex-start', marginTop: 4 }}
            contentStyle={{ width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: glass.opaqueControl, borderWidth: 1, borderColor: glass.glassEdge }}
          >
            <Ionicons name="close" size={20} color={glass.lightTint} />
          </PressableHybrid>
          <Text style={{ color: t.textPrimary, fontSize: scaled(34), lineHeight: scaled(40), fontWeight: '700', marginTop: 10 }}>
            {L('Поддержка', 'Підтримка', 'Support', 'Soporte', 'Suporte', 'Hỗ trợ', 'Dukungan', 'Destek', 'Pomoc')}
          </Text>

          {state === 'sent' ? (
            <View style={{ flex: 1, minHeight: 360, justifyContent: 'center', paddingVertical: 28 }}>
              <View style={{ borderRadius: 18, borderWidth: 1, borderColor: glass.glassEdge, backgroundColor: glass.opaqueCard, paddingVertical: 26, paddingHorizontal: 20, overflow: 'hidden', alignItems: 'center' }}>
                <SafeLinearGradient pointerEvents="none" colors={[glass.selected, 'transparent']} style={{ position: 'absolute', inset: 0 }} />
                <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: glass.opaqueControl, borderWidth: 1, borderColor: glass.glassEdge, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="checkmark" size={28} color={glass.lightTint} />
                </View>
                <Text accessibilityLiveRegion="polite" style={{ color: t.textPrimary, fontSize: scaled(22), lineHeight: scaled(28), fontWeight: '700', textAlign: 'center', marginTop: 18 }}>
                  {L('Обращение отправлено', 'Звернення надіслано', 'Request sent', 'Solicitud enviada', 'Solicitação enviada', 'Đã gửi yêu cầu', 'Laporan terkirim', 'Talep gönderildi', 'Zgłoszenie wysłane')}
                </Text>
                <Text style={{ color: glass.secondary, fontSize: scaled(14), lineHeight: scaled(20), fontWeight: '400', textAlign: 'center', marginTop: 8 }}>
                  {L('Спасибо! Команда всё проверит и ответит в приложении.', 'Дякуємо! Команда все перевірить і відповість у застосунку.', 'Thank you! The team will review it and reply in the app.', '¡Gracias! El equipo lo revisará y responderá en la app.', 'Obrigado! A equipe vai verificar e responder no app.', 'Cảm ơn! Đội ngũ sẽ kiểm tra và trả lời trong ứng dụng.', 'Terima kasih! Tim akan memeriksa dan membalas di aplikasi.', 'Teşekkürler! Ekip inceleyip uygulamada yanıtlayacak.', 'Dziękujemy! Zespół sprawdzi zgłoszenie i odpowie w aplikacji.')}
                </Text>
              </View>
              <PressableHybrid
                testID="support-report-done"
                onPress={close}
                withHaptic={false}
                withSound={false}
                variant="primary"
                style={{ marginTop: 18 }}
                contentStyle={{ minHeight: 48, borderRadius: 24, backgroundColor: glass.accent, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 }}
              >
                <Text style={{ color: glass.accentInk, fontSize: scaled(17), lineHeight: scaled(22), fontWeight: '700' }}>
                  {L('Готово', 'Готово', 'Done', 'Listo', 'Pronto', 'Xong', 'Selesai', 'Bitti', 'Gotowe')}
                </Text>
              </PressableHybrid>
            </View>
          ) : (
            <>
              <Text style={{ color: glass.secondary, fontSize: scaled(15), lineHeight: scaled(20), fontWeight: '400', marginTop: 7 }}>
                {L('Расскажите, что случилось', 'Розкажіть, що сталося', 'Tell us what happened', 'Cuéntanos qué pasó', 'Conte o que aconteceu', 'Hãy cho chúng tôi biết chuyện gì xảy ra', 'Ceritakan apa yang terjadi', 'Ne olduğunu anlatın', 'Opisz, co się stało')}
              </Text>
              <Text style={{ color: glass.secondary, fontSize: scaled(14), lineHeight: scaled(20), fontWeight: '400', marginTop: 10 }}>
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

              <Text style={{ color: glass.secondary, fontSize: scaled(11), lineHeight: scaled(16), fontWeight: '700', letterSpacing: 1.7, textTransform: 'uppercase', marginTop: 24, marginBottom: 8 }}>
                {L('Описание проблемы', 'Опис проблеми', 'Problem description', 'Descripción del problema', 'Descrição do problema', 'Mô tả vấn đề', 'Deskripsi masalah', 'Sorun açıklaması', 'Opis problemu')}
              </Text>
              <TextInput
                testID="support-report-input"
                accessibilityLabel={L('Описание проблемы', 'Опис проблеми', 'Problem description', 'Descripción del problema', 'Descrição do problema', 'Mô tả vấn đề', 'Deskripsi masalah', 'Sorun açıklaması', 'Opis problemu')}
                value={description}
                onChangeText={setDescription}
                placeholder={L('Например: в «Карточках» нажимаю «Послушать», но звука нет. Ожидал услышать фразу.', 'Наприклад: у «Картках» натискаю «Послухати», але звуку немає. Очікував почути фразу.', 'For example: in Cards I tap Listen, but there is no sound. I expected to hear the phrase.', 'Por ejemplo: en Tarjetas pulso Escuchar, pero no hay sonido. Esperaba oír la frase.', 'Por exemplo: em Cartões toco em Ouvir, mas não há som. Esperava ouvir a frase.', 'Ví dụ: trong Thẻ, tôi nhấn Nghe nhưng không có âm thanh. Tôi mong được nghe câu đó.', 'Contoh: di Kartu saya mengetuk Dengarkan, tetapi tidak ada suara. Saya berharap mendengar frasanya.', 'Örneğin: Kartlarda Dinleye dokunuyorum ama ses gelmiyor. Cümleyi duymayı bekliyordum.', 'Na przykład: w Kartach naciskam Posłuchaj, ale nie ma dźwięku. Chciałem usłyszeć frazę.')}
                placeholderTextColor={glass.mutedText}
                multiline
                maxLength={3000}
                textAlignVertical="top"
                style={{ minHeight: 118, borderRadius: 14, borderWidth: 1, borderColor: glass.glassEdge, paddingVertical: 12, paddingHorizontal: 14, backgroundColor: glass.opaqueCard, color: t.textPrimary, fontSize: scaled(15), lineHeight: scaled(21), fontWeight: '400' }}
              />

              <View testID="support-diagnostics-disclosure" style={{ marginTop: 12, borderRadius: 14, borderWidth: 1, borderColor: glass.glassEdge, paddingVertical: 14, paddingHorizontal: 16, backgroundColor: glass.opaqueCard, overflow: 'hidden' }}>
                <SafeLinearGradient pointerEvents="none" colors={[glass.selected, 'transparent']} style={{ position: 'absolute', inset: 0 }} />
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                  <Ionicons name="shield-checkmark-outline" size={20} color={glass.secondary} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={{ color: t.textPrimary, fontSize: scaled(15), lineHeight: scaled(20), fontWeight: '700' }}>
                      {L('Техническая диагностика', 'Технічна діагностика', 'Technical diagnostics', 'Diagnóstico técnico', 'Diagnóstico técnico', 'Chẩn đoán kỹ thuật', 'Diagnostik teknis', 'Teknik tanılama', 'Diagnostyka techniczna')}
                    </Text>
                    <Text style={{ color: glass.secondary, fontSize: scaled(14), lineHeight: scaled(20), fontWeight: '400', marginTop: 3 }}>
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
                    {diagnosticsPreview?.events.length ? (
                      <>
                        <PressableHybrid
                          testID="support-diagnostics-preview-toggle"
                          accessibilityState={{ expanded: showDiagnostics }}
                          onPress={() => setShowDiagnostics((value) => !value)}
                          withHaptic={false}
                          withSound={false}
                          variant="chip"
                          style={{ minHeight: 44, alignSelf: 'flex-start', marginTop: 4 }}
                          contentStyle={{ minHeight: 44, justifyContent: 'center' }}
                        >
                          <Text style={{ color: glass.lightTint, fontSize: scaled(14), lineHeight: scaled(20), fontWeight: '700' }}>
                            {showDiagnostics
                              ? L('Скрыть', 'Сховати', 'Hide', 'Ocultar', 'Ocultar', 'Ẩn', 'Sembunyikan', 'Gizle', 'Ukryj')
                              : L('Посмотреть', 'Переглянути', 'View', 'Ver', 'Ver', 'Xem', 'Lihat', 'Görüntüle', 'Zobacz')}
                          </Text>
                        </PressableHybrid>
                        {showDiagnostics ? (
                          <View style={{ gap: 7, paddingTop: 4 }}>
                            {diagnosticsPreview.events.slice(-12).map((event, index) => (
                              <Text key={`${event.atMs}:${event.event}:${index}`} style={{ color: glass.secondary, fontSize: scaled(12), lineHeight: scaled(17), fontWeight: '400' }}>
                                {new Date(event.atMs).toLocaleTimeString()} · {event.event}
                                {event.result ? ` · ${event.result}` : ''}
                              </Text>
                            ))}
                          </View>
                        ) : null}
                      </>
                    ) : null}
                  </View>
                </View>
              </View>

              <PressableHybrid
                testID="support-report-submit"
                accessibilityState={{ disabled: !canSend }}
                onPress={send}
                disabled={!canSend}
                withHaptic={false}
                withSound={false}
                variant="primary"
                style={{ marginTop: 18 }}
                contentStyle={{ minHeight: 48, borderRadius: 24, backgroundColor: canSend ? glass.cta : glass.opaqueControl, opacity: canSend ? 1 : 0.58, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 }}
              >
                <Text style={{ color: canSend ? glass.ctaInk : glass.secondary, fontSize: scaled(17), lineHeight: scaled(22), fontWeight: '700' }}>
                  {L('Отправить', 'Надіслати', 'Send', 'Enviar', 'Enviar', 'Gửi', 'Kirim', 'Gönder', 'Wyślij')}
                </Text>
              </PressableHybrid>
            </>
          )}
        </BouncyScrollView>
      </View>
    </ScreenGradient>
  );
}
