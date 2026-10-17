import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Keyboard, Text, TextInput, View } from 'react-native';
import BouncyScrollView from '../components/BouncyScrollView';
import CustomSwitch from '../components/CustomSwitch';
import { useLang } from '../components/LangContext';
import PressableHybrid from '../components/PressableHybrid';
import { actionBoxShadow, nestedBoxShadow, PlateFill, plateBoxShadow } from '../components/v2/ShadowSurface';
import ScreenGradient from '../components/ScreenGradient';
import { FONT_SCALE, useTheme } from '../components/ThemeContext';
import { triLang } from '../constants/i18n';
import { liquidGlassTokens } from '../constants/liquidGlassThemePalette';
import { hapticTap } from '../hooks/use-haptics';
import { ERROR_REPORT_COMMENT_MIN_LEN } from './error_report';
import { emitAppEvent } from './events';
import { safeRouterBack } from './navigation_back';
import { useStableSafeAreaInsets } from './stable_safe_area_metrics';
import type { SupportDiagnosticBundle } from './support_diagnostic_schema';
import { captureSupportDiagnosticBundle } from './support_diagnostics';
import { isSupportDiagnosticsEnabled } from './remote_flags';
import { sendSupportReportInBackground } from './support_report_outbox';
import { noteSwallowedHandler } from './swallow_log'; // зачем: PM-229 — немой catch → причина в журнале, значение по умолчанию прежнее

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
  // зачем (решение владельца 12.10 (б)): журнал прикладывается по умолчанию, но человек может отключить — тогда он не захватывается и не уходит.
  const [attachDiagnostics, setAttachDiagnostics] = useState(true);
  const toggleAttachDiagnostics = useCallback((next: boolean) => {
    hapticTap();
    console.log(`[SUPPORT-DIAG] переключатель: приложить журнал=${next ? 'да' : 'нет'}`); // guard-ok: жест человека логируется
    setAttachDiagnostics(next);
    if (!next) setShowDiagnostics(false);
  }, []);
  const submissionStartedRef = useRef(false);
  // зачем (координатор 12.10, Optimistic UI): «Отправлено» показываем сразу; если очередь и прямая отправка обе упали — откат на форму с сохранённым текстом, плашка и повтор
  const [sendFailed, setSendFailed] = useState(false);
  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);

  const L = useCallback((
    ru: string, uk: string, en: string, es: string, ptBR: string,
    vi: string, id: string, tr: string, pl: string,
  ) => triLang(lang, { ru, uk, en, es, 'pt-BR': ptBR, vi, id, tr, pl }), [lang]);

  // зачем (координатор 12.10, R1): интерфейс не обещает того, чего не делает — пока журнал выключен (remote_flags), «прикрепятся действия» не пишем
  const diagnosticsEnabled = isSupportDiagnosticsEnabled();
  // зачем (координатор 13.10, «эмулятор роняет Настройки»): прогон settings-gap-023 закончился на Главной без единой строки
  // экрана поддержки — неизвестно, открылся ли он и почему закрылся. Открытие и закрытие экрана пишем всегда (warn — виден и в релизе).
  useEffect(() => {
    const openedAt = Date.now();
    console.warn(`[SUPPORT-SCREEN] открыт lang=${lang} журнал=${diagnosticsEnabled ? 'вкл' : 'выкл'}`); // guard-ok: одна строка на открытие экрана
    return () => {
      console.warn(`[SUPPORT-SCREEN] закрыт через ${Date.now() - openedAt} мс`); // guard-ok: одна строка на закрытие экрана
    };
    // Только открытие и закрытие экрана.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    console.log(`[SUPPORT-DIAG] карточка: журнал ${diagnosticsEnabled ? 'включён → обещание и список' : 'выключен → нейтральный текст без обещания'}`); // guard-ok: ветвление логируется
  }, [diagnosticsEnabled]);

  const canSend = useMemo(
    () => description.trim().length >= ERROR_REPORT_COMMENT_MIN_LEN,
    [description],
  );

  useEffect(() => {
    let mounted = true;
    void captureSupportDiagnosticBundle().then((bundle) => {
      if (mounted) setDiagnosticsPreview(bundle);
    }).catch(noteSwallowedHandler('support_report:useEffect.captureSupportDiagnosticBundle'));
    return () => { mounted = false; };
  }, []);

  const close = useCallback(() => safeRouterBack(router, '/(tabs)/settings' as never), [router]);

  // зачем (аудит Optimistic UI 13.10): «Отправлено» показывается сразу, а провал отправки после ухода с экрана был немым —
  // человек думал, что обращение дошло. Экрана уже нет — сообщаем тостом, чтобы отправил ещё раз.
  const notifyFailedAfterLeave = useCallback(() => {
    console.warn('[SUPPORT-SEND] экран закрыт до провала отправки — тост «не отправилось»'); // guard-ok: единичный лог на провал
    emitAppEvent('action_toast', {
      type: 'error',
      messageRu: 'Обращение не отправилось. Открой «Поддержку» и отправь ещё раз.',
      messageUk: 'Звернення не надіслано. Відкрий «Підтримку» й надішли ще раз.',
      messageEn: "Your message wasn't sent. Open Support and send it again.",
      messageEs: 'Tu mensaje no se envió. Abre Soporte y envíalo de nuevo.',
      messagePtBr: 'Sua mensagem não foi enviada. Abra o Suporte e envie de novo.',
      messageVi: 'Tin nhắn chưa được gửi. Hãy mở Hỗ trợ và gửi lại.',
      messageId: 'Pesanmu belum terkirim. Buka Dukungan dan kirim lagi.',
      messageTr: 'Mesajın gönderilmedi. Destek’i açıp tekrar gönder.',
      messagePl: 'Wiadomość nie została wysłana. Otwórz Pomoc i wyślij ją ponownie.',
    });
  }, []);

  const send = useCallback(() => {
    if (!canSend || submissionStartedRef.current) return;
    submissionStartedRef.current = true;
    Keyboard.dismiss();
    hapticTap();
    const comment = description.trim();
    setSendFailed(false);
    setState('sent');
    void sendSupportReportInBackground({
      screen: 'settings_support',
      dataId: 'settings_support_request',
      dataText: 'In-app support request',
      comment,
      ...(attachDiagnostics && diagnosticsPreview ? { diagnostics: diagnosticsPreview } : {}),
    }, lang, {}, { attachDiagnostics }).then((outcome) => {
      console.log('[SUPPORT-SEND] экран получил итог', { outcome, mounted: mountedRef.current }); // guard-ok: единичный лог на жест человека
      if (outcome !== 'failed') return;
      submissionStartedRef.current = false; // повтор снова разрешён, текст в поле не очищали
      if (mountedRef.current) { setState('idle'); setSendFailed(true); } else notifyFailedAfterLeave();
    }).catch((error: unknown) => {
      console.warn('[SUPPORT-SEND] экран: отправка бросила ошибку, откат на форму', error);
      noteSwallowedHandler('support_report:useCallback.sendSupportReportInBackground')(error);
      submissionStartedRef.current = false;
      if (mountedRef.current) { setState('idle'); setSendFailed(true); } else notifyFailedAfterLeave();
    });
  }, [attachDiagnostics, canSend, description, diagnosticsPreview, lang, notifyFailedAfterLeave]);

  return (
    <ScreenGradient artBackdrop="settings">
      <View style={{ flex: 1, paddingTop: insets.top, paddingBottom: insets.bottom, paddingLeft: insets.left, paddingRight: insets.right }}>
        <BouncyScrollView
          automaticallyAdjustKeyboardInsets
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 20, paddingBottom: 32 }}
          showsVerticalScrollIndicator={false} decelerationRate="fast"
        >
          <PressableHybrid
            testID="support-report-back"
            accessibilityLabel={L('Закрыть', 'Закрити', 'Close', 'Cerrar', 'Fechar', 'Đóng', 'Tutup', 'Kapat', 'Zamknij')}
            onPress={close}
            withHaptic={true}
            withSound={false}
            variant="icon"
            style={{ width: 48, height: 44, alignSelf: 'flex-start', marginTop: 4 }}
            // зачем (profile.html `.rb.bare`): «назад» — голый шеврон слева, без круга и кромки; область нажатия 48×44.
            contentStyle={{ width: 48, height: 44, alignItems: 'flex-start', justifyContent: 'center' }}
          >
            {/* зачем: паритет с макетом profile.html PRF-09 — «назад» шевроном */}
            <BackGlyph size={21} color={glass.text} />
          </PressableHybrid>
          <Text style={{ color: t.textPrimary, fontSize: scaled(34), lineHeight: scaled(40), fontWeight: '700', letterSpacing: -0.5 /* зачем: паритет profile.html PRF-09 (13.10) */, marginTop: 10 }}>
            {L('Поддержка', 'Підтримка', 'Support', 'Soporte', 'Suporte', 'Hỗ trợ', 'Dukungan', 'Destek', 'Pomoc')}
          </Text>

          {state === 'sent' ? (
            <View style={{ flex: 1, minHeight: 360, justifyContent: 'center', paddingVertical: 28 }}>
              {/* зачем (стиль «Тень», владелец 12.10): плашка с тенью вместо кромки; overflow: hidden убран, он резал бы тень */}
              <View style={{ borderRadius: 18, boxShadow: plateBoxShadow(glass), paddingVertical: 26, paddingHorizontal: 20, alignItems: 'center' }}>
                <PlateFill g={glass} radius={18} />
                <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: glass.dividerTone, boxShadow: nestedBoxShadow(glass), alignItems: 'center', justifyContent: 'center' }}>
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
                contentStyle={{ minHeight: 48, borderRadius: 24, backgroundColor: glass.accent, boxShadow: actionBoxShadow(glass), alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 }}
              >
                <Text style={{ color: glass.accentInk, fontSize: scaled(17), lineHeight: scaled(22), fontWeight: '700' }}>
                  {L('Готово', 'Готово', 'Done', 'Listo', 'Pronto', 'Xong', 'Selesai', 'Bitti', 'Gotowe')}
                </Text>
              </PressableHybrid>
            </View>
          ) : (
            <>
              <Text style={{ color: glass.secondary, fontSize: scaled(15), lineHeight: scaled(20), fontWeight: '400', marginTop: 7 }}>
                {L('Расскажи, что случилось', 'Розкажи, що сталося', 'Tell us what happened', 'Cuéntanos qué pasó', 'Conte o que aconteceu', 'Hãy cho chúng tôi biết chuyện gì xảy ra', 'Ceritakan apa yang terjadi', 'Ne olduğunu anlat', 'Opisz, co się stało')}
              </Text>
              {/* зачем: паритет с макетом PRF-09 — длинной расшифровки под подзаголовком в макете нет (правило владельца: без длинных подписей) */}

              <Text style={{ color: glass.secondary, fontSize: scaled(13), lineHeight: scaled(18), fontWeight: '700', letterSpacing: 1.7, textTransform: 'uppercase', marginTop: 24, marginBottom: 10, marginHorizontal: 4 /* зачем (settings-gaps-states .gs-ey2): метка 13/18, снизу 10, сбоку 4 */ }}>
                {L('Описание проблемы', 'Опис проблеми', 'Problem description', 'Descripción del problema', 'Descrição do problema', 'Mô tả vấn đề', 'Deskripsi masalah', 'Sorun açıklaması', 'Opis problemu')}
              </Text>
              <TextInput
                testID="support-report-input"
                accessibilityLabel={L('Описание проблемы', 'Опис проблеми', 'Problem description', 'Descripción del problema', 'Descrição do problema', 'Mô tả vấn đề', 'Deskripsi masalah', 'Sorun açıklaması', 'Opis problemu')}
                value={description}
                onChangeText={setDescription}
                placeholder={L('Например: в «Карточках» нажимаю «Послушать», но звука нет.', 'Наприклад: у «Картках» натискаю «Послухати», але звуку немає. Очікував почути вислів.', 'For example: in Cards I tap Listen, but there is no sound. I expected to hear the phrase.', 'Por ejemplo: en Tarjetas pulso Escuchar, pero no hay sonido. Esperaba oír la frase.', 'Por exemplo: em Cartões toco em Ouvir, mas não há som. Esperava ouvir a frase.', 'Ví dụ: trong Thẻ, tôi nhấn Nghe nhưng không có âm thanh. Tôi mong được nghe câu đó.', 'Contoh: di Kartu saya mengetuk Dengarkan, tetapi tidak ada suara. Saya berharap mendengar frasanya.', 'Örneğin: Kartlarda Dinleye dokunuyorum ama ses gelmiyor. Cümleyi duymayı bekliyordum.', 'Na przykład: w Kartach naciskam Posłuchaj, ale nie ma dźwięku. Chciałem usłyszeć frazę.')}
                placeholderTextColor={glass.mutedText}
                multiline
                maxLength={3000}
                textAlignVertical="top"
                style={{ minHeight: 118, borderRadius: 14, boxShadow: plateBoxShadow(glass) as unknown as string /* зачем: типы RN для стиля TextInput знают boxShadow только строкой, на деле массив работает */, paddingVertical: 12, paddingHorizontal: 14, backgroundColor: glass.plateFillFrom, color: t.textPrimary, fontSize: scaled(15), lineHeight: scaled(21), fontWeight: '400' }}
              />

              <View testID="support-diagnostics-disclosure" style={{ marginTop: 12, borderRadius: 14, boxShadow: plateBoxShadow(glass), paddingVertical: 14, paddingHorizontal: 16 }}>
                <PlateFill g={glass} radius={14} />
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                  <Ionicons name={diagnosticsEnabled && attachDiagnostics ? 'checkmark' : 'information-circle-outline'} size={20} color={glass.secondary} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <Text style={{ flex: 1, minWidth: 0, color: t.textPrimary, fontSize: scaled(15), lineHeight: scaled(20), fontWeight: '700' }}>
                        {L('Техническая диагностика', 'Технічна діагностика', 'Technical diagnostics', 'Diagnóstico técnico', 'Diagnóstico técnico', 'Chẩn đoán kỹ thuật', 'Diagnostik teknis', 'Teknik tanılama', 'Diagnostyka techniczna')}
                      </Text>
                      {diagnosticsEnabled ? (
                        <CustomSwitch
                          testID="support-diagnostics-attach-switch"
                          value={attachDiagnostics}
                          onValueChange={toggleAttachDiagnostics}
                          accessibilityLabel={L('Приложить журнал диагностики', 'Додати журнал діагностики', 'Attach diagnostics log', 'Adjuntar registro de diagnóstico', 'Anexar registro de diagnóstico', 'Đính kèm nhật ký chẩn đoán', 'Lampirkan log diagnostik', 'Tanılama günlüğünü ekle', 'Dołącz dziennik diagnostyki')}
                        />
                      ) : null}
                    </View>
                    <Text style={{ color: glass.secondary, fontSize: scaled(14), lineHeight: scaled(20), fontWeight: '400', marginTop: 2 /* зачем: паритет profile.html PRF-09 (13.10) */ }}>
                      {diagnosticsEnabled && !attachDiagnostics ? L(
                        'Журнал не будет приложен к обращению.',
                        'Журнал не буде додано до звернення.',
                        'The log won’t be attached to your request.',
                        'El registro no se adjuntará a tu solicitud.',
                        'O registro não será anexado à solicitação.',
                        'Nhật ký sẽ không được đính kèm vào yêu cầu.',
                        'Log tidak akan dilampirkan ke permintaan.',
                        'Günlük talebine eklenmeyecek.',
                        'Dziennik nie zostanie dołączony do zgłoszenia.',
                      ) : diagnosticsEnabled ? L(
                        'Прикрепятся только недавние технические действия — без сообщений, паролей и платёжных данных.',
                        'До цього звернення додадуться лише недавні технічні дії. Без тексту повідомлень, паролів і платіжних даних.',
                        'Only recent technical actions are attached to this request. Message text, passwords, and payment data are excluded.',
                        'Solo se adjuntan acciones técnicas recientes. Se excluyen mensajes, contraseñas y datos de pago.',
                        'Apenas ações técnicas recentes são anexadas. Textos, senhas e dados de pagamento são excluídos.',
                        'Chỉ các thao tác kỹ thuật gần đây được đính kèm. Không có nội dung tin nhắn, mật khẩu hoặc dữ liệu thanh toán.',
                        'Hanya tindakan teknis terbaru yang dilampirkan. Teks pesan, kata sandi, dan data pembayaran tidak disertakan.',
                        'Yalnızca son teknik işlemler eklenir. Mesaj metni, parolalar ve ödeme verileri dahil edilmez.',
                        'Dołączane są tylko ostatnie działania techniczne. Bez treści wiadomości, haseł i danych płatniczych.',
                      ) : L(
                        'Журнал технических действий сейчас выключен — вместе с обращением он не отправляется.',
                        'Журнал технічних дій зараз вимкнено — разом зі зверненням він не надсилається.',
                        'The technical activity log is currently off — it is not sent with your request.',
                        'El registro de acciones técnicas está desactivado: no se envía con tu solicitud.',
                        'O registro de ações técnicas está desativado — ele não é enviado com a solicitação.',
                        'Nhật ký thao tác kỹ thuật hiện đang tắt — sẽ không được gửi cùng yêu cầu.',
                        'Log tindakan teknis saat ini nonaktif — tidak dikirim bersama permintaan.',
                        'Teknik işlem günlüğü şu anda kapalı — talebinle birlikte gönderilmez.',
                        'Dziennik działań technicznych jest teraz wyłączony — nie jest wysyłany z Twoim zgłoszeniem.',
                      )}
                    </Text>
                    {attachDiagnostics && diagnosticsPreview?.events.length ? (
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

              {sendFailed ? (
                <View
                  testID="support-report-failed"
                  accessibilityRole="alert"
                  accessibilityLiveRegion="polite"
                  style={{ marginTop: 18, minHeight: 64, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 14, gap: 10, flexDirection: 'row', alignItems: 'center', backgroundColor: t.wrongBg ?? glass.plateFillFrom, boxShadow: plateBoxShadow(glass) }}
                >
                  <Ionicons name="alert-circle-outline" size={18} color={t.wrong ?? t.textPrimary} />
                  <Text style={{ flex: 1, color: t.wrong ?? t.textPrimary, fontSize: scaled(13), lineHeight: scaled(18), fontWeight: '400' }}>
                    {L('Не отправилось. Попробуй ещё раз', 'Не надіслалося. Спробуй ще раз', 'Could not send. Try again', 'No se pudo enviar. Inténtalo de nuevo', 'Não foi enviado. Tente de novo', 'Chưa gửi được. Hãy thử lại', 'Gagal terkirim. Coba lagi', 'Gönderilemedi. Tekrar dene', 'Nie udało się wysłać. Spróbuj ponownie')}
                  </Text>
                </View>
              ) : null}

              <PressableHybrid
                testID="support-report-submit"
                accessibilityState={{ disabled: !canSend }}
                onPress={send}
                disabled={!canSend}
                withHaptic={false}
                withSound={false}
                variant="primary"
                style={{ marginTop: sendFailed ? 10 : 18 }}
                contentStyle={{ minHeight: 48, borderRadius: 24, backgroundColor: canSend ? glass.cta : glass.opaqueControl, boxShadow: nestedBoxShadow(glass), opacity: canSend ? 1 : 0.58, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 }}
              >
                <Text style={{ color: canSend ? glass.ctaInk : glass.secondary, fontSize: scaled(17), lineHeight: scaled(22), fontWeight: '700' }}>
                  {sendFailed
                    ? L('Повторить', 'Повторити', 'Try again', 'Reintentar', 'Tentar de novo', 'Thử lại', 'Coba lagi', 'Tekrar dene', 'Spróbuj ponownie')
                    : L('Отправить', 'Надіслати', 'Send', 'Enviar', 'Enviar', 'Gửi', 'Kirim', 'Gönder', 'Wyślij')}
                </Text>
              </PressableHybrid>
            </>
          )}
        </BouncyScrollView>
      </View>
    </ScreenGradient>
  );
}

import BackGlyph from '../components/v2/BackGlyph';