// ════════════════════════════════════════════════════════════════════════════
// ReportPackModal.tsx — Скарга на UGC (community) пак карток.
//
// Apple Guideline 1.2 (User-Generated Content): додатки з UGC мають надати
// користувачу простий механізм поскаржитися на контент. Виклик з paywall
// набору, коли набір помічений як community (isCommunityUgc).
//
// Логіка:
//   • Запит причини (одна з 6 категорій).
//   • Опціональний коментар (до 500 символів).
//   • Запис у `community_pack_reports` через submitPackReport().
//   • Throttle 30 c (спільний з user_reports).
// ════════════════════════════════════════════════════════════════════════════

import React, { memo, useState } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import {
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTheme } from './ThemeContext';
import { liquidGlassTokens } from '../constants/liquidGlassThemePalette';
import { hideCommunityPackOnDevice } from '../app/community_packs/communityPackHiddenStorage';
import type { RuntimeStudyTarget } from '../app/target_storage_keys';
import { submitPackReport, type PackReportReason } from '../app/user_report';
import { triLang, type Lang } from '../constants/i18n';
import { hapticError, hapticSuccess, hapticTap } from '../hooks/use-haptics';
import HybridAlertShell, { CascadeItem } from './modal_fx/HybridAlertShell';
import { useReduceMotion } from '../hooks/use_reduce_motion';
import { LUM } from '../constants/motionHybrid';

const EXEMPT_COLOR_1 = '#000000'; // theme-exempt: затемнение под окном/шторкой и тень — постоянные в любой теме

interface Props {
  visible: boolean;
  packId: string;
  packTitle: string;
  authorStableId?: string | null;
  lang: Lang;
  studyTarget?: RuntimeStudyTarget;
  onClose: () => void;
  /** Після приховування набору на цьому пристрої (оновити список у батьківському екрані). */
  onPackHiddenOnDevice?: (optimisticPackId?: string | null) => void | Promise<void>;
  /** dev-only: витрина движения запускает гибрид «Световод» рядом с боевым видом. Default 'classic'. */
  motionVariant?: 'classic' | 'hybrid';
}

// зачем: подписи причин на всех 9 языках (раньше en/pt/vi/id/tr/pl получали русский
// список); описания под названиями убраны — макет CARD-23 показывает только названия.
function reasonsFor(lang: Lang): { id: PackReportReason; label: string }[] {
  return [
    { id: 'offensive', label: triLang(lang, { ru: 'Образа / ненависть', uk: 'Образа / ненависть', en: 'Insults or hate', es: 'Insultos u odio', 'pt-BR': 'Insulto ou ódio', vi: 'Xúc phạm / thù ghét', id: 'Hinaan / kebencian', tr: 'Hakaret / nefret', pl: 'Obraza / nienawiść' }) },
    { id: 'sexual', label: triLang(lang, { ru: 'Откровенный контент', uk: 'Відвертий контент', en: 'Explicit content', es: 'Contenido sexual', 'pt-BR': 'Conteúdo explícito', vi: 'Nội dung nhạy cảm', id: 'Konten eksplisit', tr: 'Müstehcen içerik', pl: 'Treści dla dorosłych' }) },
    { id: 'spam', label: triLang(lang, { ru: 'Спам / бессмыслица', uk: 'Спам / нісенітниця', en: 'Spam or nonsense', es: 'Spam', 'pt-BR': 'Spam ou besteira', vi: 'Spam / vô nghĩa', id: 'Spam / tidak bermakna', tr: 'Spam / anlamsız', pl: 'Spam / bezsens' }) },
    { id: 'copyright', label: triLang(lang, { ru: 'Авторское право', uk: 'Авторське право', en: 'Copyright', es: 'Derechos de autor', 'pt-BR': 'Direitos autorais', vi: 'Bản quyền', id: 'Hak cipta', tr: 'Telif hakkı', pl: 'Prawa autorskie' }) },
    { id: 'wrong_translation', label: triLang(lang, { ru: 'Неправильный перевод', uk: 'Неправильний переклад', en: 'Wrong translation', es: 'Traducción incorrecta', 'pt-BR': 'Tradução errada', vi: 'Dịch sai', id: 'Terjemahan salah', tr: 'Yanlış çeviri', pl: 'Błędne tłumaczenie' }) },
    { id: 'other', label: triLang(lang, { ru: 'Другое', uk: 'Інше', en: 'Other', es: 'Otro', 'pt-BR': 'Outro', vi: 'Khác', id: 'Lainnya', tr: 'Diğer', pl: 'Inne' }) },
  ];
}

function ReportPackModal({
  visible,
  packId,
  packTitle,
  authorStableId,
  lang,
  studyTarget,
  onClose,
  onPackHiddenOnDevice,
  motionVariant = 'classic',
}: Props) {
  const { f, liquidGlassThemeId } = useTheme();
  const glass = liquidGlassTokens(liquidGlassThemeId);
  const reduceMotion = useReduceMotion();
  const isHybrid = motionVariant === 'hybrid';
  const reasons = reasonsFor(lang);

  const [selected, setSelected] = useState<PackReportReason | null>(null);
  const [comment, setComment]   = useState('');
  const [loading, setLoading]   = useState(false);
  const [done, setDone]         = useState(false);
  const [throttled, setThrottled] = useState(false);
  const [hiding, setHiding]     = useState(false);

  const reset = () => {
    setSelected(null);
    setComment('');
    setLoading(false);
    setDone(false);
    setThrottled(false);
    setHiding(false);
  };

  const handleClose = () => {
    Keyboard.dismiss();
    reset();
    onClose();
  };

  const handleSend = async () => {
    if (!selected) return;
    const payload = {
      packId,
      packTitle,
      authorStableId,
      studyTarget,
      reason: selected,
      comment: comment.trim(),
    };
    try {
      hapticTap();
      setThrottled(false);
      setLoading(false);
      setDone(true);
      hapticSuccess();
      const r = await submitPackReport(payload);
      if (r === 'throttled') {
        setDone(false);
        setThrottled(true);
        hapticError();
        return;
      }
      if (r === 'failed') throw new Error('pack_report_failed');
    } catch {
      setLoading(false);
      setDone(false);
      hapticError();
    }
  };

  const overlayBg = 'rgba(0,0,0,0.58)'; // theme-exempt: затемнение под окном/шторкой и тень — постоянные в любой теме

  // зачем: Liquid Glass 1 в 1 с макета cards.html (CARD-23 «Жалоба на набор»):
  // непрозрачная панель темы, тональные строки причин, светлая нейтральная CTA;
  // зелёный фирменный цвет и толстые рамки убраны. Логика отправки/скрытия не менялась.
  const primaryCta = (label: string, onPress: () => void, extra?: { flex?: number; disabled?: boolean; muted?: boolean; testID?: string }) => (
    <TouchableOpacity
      testID={extra?.testID}
      disabled={extra?.disabled}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!extra?.disabled }}
      style={{
        flex: extra?.flex,
        minHeight: 48,
        borderRadius: 24,
        paddingHorizontal: 16,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: extra?.muted ? glass.opaqueControl : glass.cta,
      }}
    >
      <Text style={{ color: extra?.muted ? glass.mutedText : glass.ctaInk, fontWeight: '700', fontSize: f.body, textAlign: 'center' }}>{label}</Text>
    </TouchableOpacity>
  );
  const ghostCta = (label: string, onPress: () => void, extra?: { flex?: number; disabled?: boolean; testID?: string }) => (
    <TouchableOpacity
      testID={extra?.testID}
      disabled={extra?.disabled}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!extra?.disabled }}
      style={{
        flex: extra?.flex,
        minHeight: 48,
        borderRadius: 24,
        paddingHorizontal: 16,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: glass.opaqueControl,
        opacity: extra?.disabled ? 0.6 : 1,
      }}
    >
      <Text style={{ color: glass.text, fontWeight: '700', fontSize: f.body, textAlign: 'center' }}>{label}</Text>
    </TouchableOpacity>
  );
  const closeText = triLang(lang, { uk: 'Закрити', ru: 'Закрыть', en: 'Close', es: 'Cerrar', 'pt-BR': 'Fechar', vi: 'Đóng', id: 'Tutup', tr: 'Kapat', pl: 'Zamknij' });

  const panelContent = (
          <View
            style={{
              backgroundColor: glass.opaqueSheet,
              borderColor: glass.glassEdge,
              borderWidth: 1,
              borderRadius: 26,
              padding: 22,
              maxHeight: '85%',
            }}
          >
            {done ? (
              <View style={{ alignItems: 'stretch', paddingVertical: 8 }}>
                {/* зачем: эмодзи в UI запрещены владельцем — иконка набора приложения */}
                <View style={{ width: 55, height: 55, borderRadius: 16, backgroundColor: glass.opaqueControl, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 14 }}>
                  <Ionicons name="checkmark" size={26} color={glass.text} />
                </View>
                <Text accessibilityRole="header" style={{ color: glass.text, fontSize: 23, fontWeight: '700', textAlign: 'center' }}>
                  {triLang(lang, { uk: 'Скаргу надіслано', ru: 'Жалоба отправлена', en: 'Report sent', es: 'Denuncia enviada', 'pt-BR': 'Denúncia enviada', vi: 'Đã gửi báo cáo', id: 'Laporan terkirim', tr: 'Şikayet gönderildi', pl: 'Zgłoszenie wysłane' })}
                </Text>
                <Text style={{ color: glass.secondary, fontSize: f.body, marginTop: 10, textAlign: 'center', lineHeight: f.body * 1.45 }}>
                  {triLang(lang, {
                    uk: 'Твоя скарга збережена. Ми розглянемо її найближчим часом. Дякуємо, що допомагаєш зробити каталог безпечнішим.',
                    ru: 'Твоя жалоба сохранена. Мы рассмотрим её в ближайшее время. Спасибо, что помогаешь сделать каталог безопаснее.',
                    en: 'Your report has been saved. We will review it soon. Thanks for helping keep the catalog safe.',
                    es: 'Tu reporte quedó registrado. Lo revisaremos pronto. Gracias por ayudar a mantener el catálogo seguro.',
                    'pt-BR': 'Sua denúncia foi registrada. Vamos analisá-la em breve. Obrigado por ajudar a manter o catálogo mais seguro.',
                    vi: 'Báo cáo của bạn đã được lưu. Chúng tôi sẽ xem xét sớm. Cảm ơn bạn đã giúp danh mục an toàn hơn.',
                    id: 'Laporanmu sudah tersimpan. Kami akan meninjaunya segera. Terima kasih sudah membantu menjaga katalog tetap aman.',
                    tr: 'Şikayetin kaydedildi. En kısa sürede inceleyeceğiz. Kataloğu daha güvenli tutmaya yardım ettiğin için teşekkürler.',
                    pl: 'Twoje zgłoszenie zostało zapisane. Wkrótce je sprawdzimy. Dziękujemy za pomoc w dbaniu o bezpieczeństwo katalogu.',
                  })}
                </Text>
                <View style={{ marginTop: 20, gap: 10 }}>
                  {primaryCta(closeText, handleClose)}
                  {ghostCta(
                    triLang(lang, {
                      uk: 'Не показувати мені цей набір',
                      ru: 'Не показывать мне этот набор',
                      en: "Don't show me this pack again",
                      es: 'No volver a mostrarme este pack',
                      'pt-BR': 'Não mostrar este pack novamente',
                      vi: 'Không hiển thị bộ này nữa',
                      id: 'Jangan tampilkan pack ini lagi',
                      tr: 'Bu paketi bir daha gösterme',
                      pl: 'Nie pokazuj mi już tego pakietu',
                    }),
                    async () => {
                      try {
                        hapticTap();
                        setHiding(true);
                        void onPackHiddenOnDevice?.(packId);
                        handleClose();
                        await hideCommunityPackOnDevice(packId, studyTarget);
                        await onPackHiddenOnDevice?.(null);
                        hapticSuccess();
                      } catch {
                        hapticError();
                        await onPackHiddenOnDevice?.(null);
                      }
                    },
                    { disabled: hiding },
                  )}
                </View>
                <Text style={{ color: glass.mutedText, fontSize: f.caption, marginTop: 10, textAlign: 'center' }}>
                  {triLang(lang, {
                    uk: 'Лише на цьому пристрої. Можна скинути, перевстановивши застосунок.',
                    ru: 'Только на этом устройстве. Сброс при удалении приложения.',
                    en: 'This device only. It resets if you delete the app.',
                    es: 'Solo en este dispositivo. Se restablece si borras la app.',
                    'pt-BR': 'Apenas neste dispositivo. É redefinido se você apagar o app.',
                    vi: 'Chỉ trên thiết bị này. Sẽ đặt lại nếu bạn xóa ứng dụng.',
                    id: 'Hanya di perangkat ini. Akan direset jika kamu menghapus aplikasi.',
                    tr: 'Yalnızca bu cihazda. Uygulamayı silersen sıfırlanır.',
                    pl: 'Tylko na tym urządzeniu. Resetuje się po usunięciu aplikacji.',
                  })}
                </Text>
              </View>
            ) : throttled ? (
              <View style={{ alignItems: 'center', paddingVertical: 16 }}>
                <View style={{ width: 68, height: 68, borderRadius: 23, backgroundColor: glass.opaqueControl, alignItems: 'center', justifyContent: 'center', marginBottom: 15 }}>
                  <Ionicons name="flag-outline" size={26} color={glass.text} />
                </View>
                <Text accessibilityRole="header" style={{ color: glass.text, fontSize: 23, fontWeight: '700', textAlign: 'center' }}>
                  {triLang(lang, { uk: 'Зачекай 30 секунд', ru: 'Подожди 30 секунд', en: 'Wait 30 seconds', es: 'Espera 30 segundos', 'pt-BR': 'Espere 30 segundos', vi: 'Chờ 30 giây', id: 'Tunggu 30 detik', tr: '30 saniye bekle', pl: 'Poczekaj 30 sekund' })}
                </Text>
                <Text style={{ color: glass.secondary, fontSize: f.body, marginTop: 8, textAlign: 'center' }}>
                  {triLang(lang, {
                    uk: 'Можна надсилати скарги не частіше за раз на 30 с.',
                    ru: 'Можно отправлять жалобы не чаще раза в 30 с.',
                    en: 'You can send a report no more than once every 30 s.',
                    es: 'Solo se puede enviar una denuncia cada 30 s.',
                    'pt-BR': 'Você só pode enviar uma denúncia a cada 30 s.',
                    vi: 'Bạn chỉ có thể gửi một báo cáo mỗi 30 giây.',
                    id: 'Kamu hanya bisa mengirim laporan setiap 30 detik.',
                    tr: 'Her 30 saniyede yalnızca bir şikayet gönderebilirsin.',
                    pl: 'Zgłoszenie można wysłać nie częściej niż raz na 30 s.',
                  })}
                </Text>
                {/* зачем (аудит по Библии, 2026-08-26): непереведённое «OK» —
                    и не глагол (Правило 1), и русский интерфейс показывал
                    латиницу. Жалоба отправлена, окно закрывается. */}
                <View style={{ alignSelf: 'stretch', marginTop: 18 }}>
                  {primaryCta(closeText, handleClose)}
                </View>
              </View>
            ) : (
              <>
                <Text accessibilityRole="header" style={{ color: glass.text, fontSize: 22, fontWeight: '700', marginBottom: 6 }}>
                  {triLang(lang, { uk: 'Поскаржитися на набір', ru: 'Пожаловаться на набор', en: 'Report the pack', es: 'Reportar el pack', 'pt-BR': 'Denunciar o pack', vi: 'Báo cáo bộ thẻ', id: 'Laporkan pack', tr: 'Paketi şikayet et', pl: 'Zgłoś pakiet' })}
                </Text>
                <Text style={{ color: glass.secondary, fontSize: f.body, marginBottom: 14 }}>
                  {packTitle}
                </Text>

                <ScrollView decelerationRate="fast"
                  style={{ maxHeight: 320 }}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                  keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
                >
                  {reasons.map((r) => {
                    const active = selected === r.id;
                    return (
                      <TouchableOpacity
                        key={r.id}
                        accessibilityRole="radio"
                        accessibilityState={{ selected: active }}
                        onPress={() => { hapticTap(); setSelected(r.id); }}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 12,
                          minHeight: 52,
                          paddingHorizontal: 16,
                          borderRadius: 16,
                          marginBottom: 8,
                          backgroundColor: active ? glass.selected : glass.opaqueControl,
                        }}
                      >
                        <Text style={{ color: glass.text, fontSize: f.body, fontWeight: active ? '700' : '400', flexShrink: 1 }}>
                          {r.label}
                        </Text>
                        <View style={{ width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: active ? glass.cta : glass.opaqueSheet }}>
                          {active ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: glass.ctaInk }} /> : null}
                        </View>
                      </TouchableOpacity>
                    );
                  })}

                  <TextInput
                    value={comment}
                    onChangeText={setComment}
                    multiline
                    maxLength={500}
                    accessibilityLabel={triLang(lang, {
                      uk: 'Коментар (необов\'язково)',
                      ru: 'Комментарий (необязательно)',
                      en: 'Comment (optional)',
                      es: 'Comentario (opcional)',
                      'pt-BR': 'Comentário (opcional)',
                      vi: 'Bình luận (không bắt buộc)',
                      id: 'Komentar (opsional)',
                      tr: 'Yorum (isteğe bağlı)',
                      pl: 'Komentarz (opcjonalnie)',
                    })}
                    placeholder={triLang(lang, {
                      uk: 'Опиши проблему...',
                      ru: 'Опиши проблему...',
                      en: 'Describe the issue...',
                      es: 'Describe el problema…',
                      'pt-BR': 'Descreva o problema...',
                      vi: 'Mô tả vấn đề...',
                      id: 'Jelaskan masalahnya...',
                      tr: 'Sorunu açıkla...',
                      pl: 'Opisz problem...',
                    })}
                    placeholderTextColor={glass.mutedText}
                    style={{
                      color: glass.text,
                      backgroundColor: glass.opaqueControl,
                      borderRadius: 16,
                      paddingHorizontal: 16,
                      paddingVertical: 14,
                      fontSize: f.body,
                      minHeight: 74,
                      marginTop: 4,
                      textAlignVertical: 'top',
                    }}
                  />
                  <Text style={{ color: glass.mutedText, fontSize: f.caption, marginTop: 6, textAlign: 'right' }}>
                    {comment.length}/500
                  </Text>
                </ScrollView>

                <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
                  {ghostCta(
                    triLang(lang, { uk: 'Скасувати', ru: 'Отмена', en: 'Cancel', es: 'Cancelar', 'pt-BR': 'Cancelar', vi: 'Hủy', id: 'Batal', tr: 'İptal', pl: 'Anuluj' }),
                    handleClose,
                    { flex: 1 },
                  )}
                  {primaryCta(
                    triLang(lang, { uk: 'Надіслати скаргу', ru: 'Отправить жалобу', en: 'Send report', es: 'Enviar denuncia', 'pt-BR': 'Enviar denúncia', vi: 'Gửi báo cáo', id: 'Kirim laporan', tr: 'Şikayeti gönder', pl: 'Wyślij zgłoszenie' }),
                    handleSend,
                    { flex: 1.4, disabled: !selected || loading, muted: !selected || loading },
                  )}
                </View>
              </>
            )}
          </View>
  );

  if (isHybrid) {
    return (
      <HybridAlertShell scrollContent={false}
        visible={visible}
        onRequestClose={handleClose}
        shadowColor={EXEMPT_COLOR_1}
        backdropColor={overlayBg}
        testID="report-pack-modal-hybrid"
      >
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ width: '100%', maxWidth: 460 }}>
          <CascadeItem delay={LUM.ladder[2]} reduceMotion={reduceMotion}>
            {panelContent}
          </CascadeItem>
        </KeyboardAvoidingView>
      </HybridAlertShell>
    );
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <TouchableOpacity
          style={{
            flex: 1,
            backgroundColor: overlayBg,
            justifyContent: 'center',
            alignItems: 'center',
            paddingHorizontal: 18,
          }}
          activeOpacity={1}
          onPress={handleClose}
        >
          <TouchableOpacity activeOpacity={1} onPress={() => {}} style={{ width: '100%', maxWidth: 460 }}>
            {panelContent}
          </TouchableOpacity>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default memo(ReportPackModal);
