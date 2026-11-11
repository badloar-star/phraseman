import Ionicons from '@expo/vector-icons/Ionicons';
import { DoneTick } from '../components/DoneTick';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Keyboard, Text, TextInput, View } from 'react-native';
import BouncyScrollView from '../components/BouncyScrollView';
import { useLang } from '../components/LangContext';
import PressableHybrid from '../components/PressableHybrid';
import { actionBoxShadow, nestedBoxShadow, PlateFill, plateBoxShadow } from '../components/v2/ShadowSurface';
import ScreenGradient from '../components/ScreenGradient';
import ScreenBackButton, { ScreenBackZone } from '../components/v2/ScreenBackButton';
import { FONT_SCALE, useTheme } from '../components/ThemeContext';
import { triLang } from '../constants/i18n';
import { liquidGlassTokens } from '../constants/liquidGlassThemePalette';
import { hapticTap } from '../hooks/use-haptics';
import { emitAppEvent } from './events';
import { safeRouterBack } from './navigation_back';
import { useStableSafeAreaInsets } from './stable_safe_area_metrics';
import type { SupportDiagnosticBundle } from './support_diagnostic_schema';
import { captureSupportDiagnosticBundle } from './support_diagnostics';
import { isSupportDiagnosticsEnabled } from './remote_flags';
import { sendSupportReportInBackground } from './support_report_outbox';
import { getSupportReportTemplate, isSupportReportCommentValid } from './support_report_validation';
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
  // зачем (владелец 11.11: «не надо им знать это», «мы берём её и так и так»): карточки «Техническая диагностика», переключателя и «Посмотреть» на форме нет —
  // журнал прикладывается к обращению всегда и молча; экран лишь заранее захватывает его, чтобы отправка не ждала.
  const submissionStartedRef = useRef(false);
  // зачем (координатор 12.10, Optimistic UI): «Отправлено» показываем сразу; если очередь и прямая отправка обе упали — откат на форму с сохранённым текстом, плашка и повтор
  const [sendFailed, setSendFailed] = useState(false);
  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);

  const L = useCallback((
    ru: string, uk: string, en: string, es: string, ptBR: string,
    vi: string, id: string, tr: string, pl: string,
  ) => triLang(lang, { ru, uk, en, es, 'pt-BR': ptBR, vi, id, tr, pl }), [lang]);

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
  const canSend = useMemo(
    () => isSupportReportCommentValid(description),
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
    if (!isSupportReportCommentValid(description) || submissionStartedRef.current) return;
    submissionStartedRef.current = true;
    Keyboard.dismiss();
    hapticTap();
    const comment = description;
    setSendFailed(false);
    setState('sent');
    void sendSupportReportInBackground({
      screen: 'settings_support',
      dataId: 'settings_support_request',
      dataText: 'In-app support request',
      comment,
      ...(diagnosticsPreview ? { diagnostics: diagnosticsPreview } : {}),
    }, lang).then((outcome) => {
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
  }, [description, diagnosticsPreview, lang, notifyFailedAfterLeave]);

  return (
    <ScreenGradient artBackdrop="settings">
      <View style={{ flex: 1, paddingTop: insets.top, paddingBottom: insets.bottom, paddingLeft: insets.left, paddingRight: insets.right }}>
        {/* зачем (ЗАМОК ВЛАДЕЛЬЦА 22.10 «кнопка в своём месте, не пересекается с другими элементами»): полоса кнопки до прокрутки — контент под круг не заезжает */}
        <ScreenBackZone />
        <BouncyScrollView
          automaticallyAdjustKeyboardInsets
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 20, paddingBottom: 32 }}
          showsVerticalScrollIndicator={false} decelerationRate="fast"
        >
          <Text style={{ color: t.textPrimary, fontSize: scaled(34), lineHeight: scaled(40), fontWeight: '700', letterSpacing: -0.5 /* зачем: паритет profile.html PRF-09 (13.10) */, marginTop: 10 }}>
            {L('Поддержка', 'Підтримка', 'Support', 'Soporte', 'Suporte', 'Hỗ trợ', 'Dukungan', 'Destek', 'Pomoc')}
          </Text>

          {state === 'sent' ? (
            <View style={{ flex: 1, minHeight: 360, justifyContent: 'center', paddingVertical: 28 }}>
              {/* зачем (стиль «Тень», владелец 12.10): плашка с тенью вместо кромки; overflow: hidden убран, он резал бы тень */}
              <View style={{ borderRadius: 18, boxShadow: plateBoxShadow(glass), paddingVertical: 26, paddingHorizontal: 20, alignItems: 'center' }}>
                <PlateFill g={glass} radius={18} />
                <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: glass.dividerTone, boxShadow: nestedBoxShadow(glass), alignItems: 'center', justifyContent: 'center' }}>
                  <DoneTick size={28} color={glass.lightTint} />
                </View>
                <Text accessibilityLiveRegion="polite" style={{ color: t.textPrimary, fontSize: scaled(22), lineHeight: scaled(28), fontWeight: '700', textAlign: 'center', marginTop: 18 }}>
                  {L('Обращение отправлено', 'Звернення надіслано', 'Request sent', 'Solicitud enviada', 'Solicitação enviada', 'Đã gửi yêu cầu', 'Laporan terkirim', 'Talep gönderildi', 'Zgłoszenie wysłane')}
                </Text>
                <Text style={{ color: glass.secondary, fontSize: scaled(14), lineHeight: scaled(20), fontWeight: '400', textAlign: 'center', marginTop: 8 }}>
                  {L('Спасибо! Команда всё проверит и ответит в приложении.', 'Дякуємо! Команда все перевірить і відповість у застосунку.', 'Thank you! The team will review it and reply in the app.', '¡Gracias! El equipo lo revisará y responderá en la app.', 'Obrigado! A equipe vai verificar e responder no app.', 'Cảm ơn! Đội ngũ sẽ kiểm tra và trả lời trong ứng dụng.', 'Terima kasih! Tim akan memeriksa dan membalas di aplikasi.', 'Teşekkürler! Ekip inceleyip uygulamada yanıtlayacak.', 'Dziękujemy! Zespół sprawdzi zgłoszenie i odpowie w aplikacji.')}
                </Text>
                {/* зачем (раунд 2 UX, 05.11): «Ответим в течение 1–2 дней» — честный срок ответа; ≥15 px, цвет из токенов */}
                <Text testID="support-sent-eta" style={{ color: glass.secondary, fontSize: scaled(15), lineHeight: scaled(21), fontWeight: '400', textAlign: 'center', marginTop: 6 }}>
                  {L('Ответим в течение 1–2 дней', 'Відповімо протягом 1–2 днів', "We'll reply within 1–2 days", 'Responderemos en 1–2 días', 'Responderemos em 1–2 dias', 'Chúng tôi sẽ phản hồi trong 1–2 ngày', 'Kami akan membalas dalam 1–2 hari', '1–2 gün içinde yanıt vereceğiz', 'Odpowiemy w ciągu 1–2 dni')}
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

              {/* зачем (раунд 2 UX, Настройки п.7, одобрено владельцем 05.11): «Подставить шаблон» — три коротких строки-подсказки в пустое поле, чтобы человек сразу писал по делу; уже написанный текст не трогаем */}
              {description.trim().length === 0 ? (
                <PressableHybrid
                  testID="support-report-template"
                  accessibilityRole="button"
                  onPress={() => setDescription(getSupportReportTemplate(lang))}
                  withHaptic={false}
                  withSound={false}
                  style={{ marginTop: 10, alignSelf: 'flex-start' }}
                  contentStyle={{ minHeight: 44, borderRadius: 22, backgroundColor: glass.buttonFill, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 }}
                >
                  <Text style={{ color: t.textPrimary, fontSize: scaled(15), lineHeight: scaled(20), fontWeight: '700' }}>
                    {L('Подставить шаблон', 'Підставити шаблон', 'Insert a template', 'Insertar plantilla', 'Inserir modelo', 'Chèn mẫu', 'Sisipkan templat', 'Şablon ekle', 'Wstaw szablon')}
                  </Text>
                </PressableHybrid>
              ) : null}

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
      <ScreenBackButton screen="support_report" testID="support-report-back" accessibilityLabel={L('Закрыть', 'Закрити', 'Close', 'Cerrar', 'Fechar', 'Đóng', 'Tutup', 'Kapat', 'Zamknij')} onPress={close} />
    </ScreenGradient>
  );
}

import BackGlyph from '../components/v2/BackGlyph';
